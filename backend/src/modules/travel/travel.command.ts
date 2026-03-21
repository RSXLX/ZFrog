import { ChainType, FrogStatus, Prisma, TravelStage, TravelStatus } from '@prisma/client';
import { isAddress } from 'ethers';
import { CHAIN_ID_TO_KEY, CHAIN_KEYS, ChainKey, SUPPORTED_CHAINS } from '../../config/chains';
import { prisma } from '../../database';
import { AppError } from '../../middlewares/errorHandler';
import { normalizeWalletAddress } from '../identity/nonce.service';
import { notifyTravelStarted } from '../../websocket';
import {
  createCompletedTravelState,
  createInitialTravelState,
  toTravelMachineState,
} from './travel-state-machine';
import { travelEventService } from './travel-events';
import { travelFeedService } from '../../services/travel/travel-feed.service';
import { rescueService } from '../../services/travel/rescue.service';
import { groupTravelService } from '../../services/group-travel.service';

type Tx = Prisma.TransactionClient;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEFAULT_DURATION_SECONDS = 3600;
const MIN_DURATION_SECONDS = 60;
const MAX_DURATION_SECONDS = 24 * 60 * 60;

type NormalizedTravelType = 'random' | 'specific' | 'cross_chain';

interface StartTravelInput {
  frogId: number;
  walletAddress: string;
  travelType?: string;
  targetChain?: string | number;
  targetAddress?: string;
  duration?: number;
  companionFrogId?: number | null;
  source?: string;
  requestId?: string;
}

interface CompleteTravelInput {
  travelId: number;
  walletAddress: string;
  source?: string;
  requestId?: string;
}

interface StartTravelResult {
  travelId: number;
  status: string;
  currentStage: string;
  progress: number;
  targetChain: string;
  chainId: number;
  endTime: string;
}

interface CompleteTravelResult {
  travelId: number;
  status: string;
  currentStage: string;
  progress: number;
  souvenirId: number | null;
  completedAt: string | null;
}

interface StartGroupTravelInput {
  leaderTokenId: number;
  companionTokenId: number;
  targetChain?: string | number;
  duration?: number;
  source?: string;
  requestId?: string;
}

interface FeedTravelInput {
  travelId: number;
  feederId: number;
  feedType?: string;
}

interface RescueInput {
  requestId: number;
  rescuerId: number;
}

interface ConfirmGroupTravelInput {
  txHash: string;
  leaderTokenId: number;
  companionTokenId: number;
  targetChainId: number;
  duration: number;
  crossChainMessageId: string;
  provisionsUsed?: string;
}

interface CompleteGroupTravelInput {
  crossChainMessageId: string;
  xpReward?: number;
}

const normalizeTravelType = (raw?: string): NormalizedTravelType => {
  const normalized = (raw || 'random').trim().toLowerCase().replace(/-/g, '_');
  if (normalized === 'specific') {
    return 'specific';
  }
  if (['cross_chain', 'crosschain'].includes(normalized)) {
    return 'cross_chain';
  }
  return 'random';
};

const resolveDuration = (raw?: number): number => {
  if (typeof raw !== 'number' || Number.isNaN(raw)) {
    return DEFAULT_DURATION_SECONDS;
  }
  const rounded = Math.floor(raw);
  if (rounded < MIN_DURATION_SECONDS || rounded > MAX_DURATION_SECONDS) {
    throw new AppError(
      400,
      `duration must be between ${MIN_DURATION_SECONDS} and ${MAX_DURATION_SECONDS} seconds`,
      'INVALID_INPUT'
    );
  }
  return rounded;
};

const resolveChain = (
  targetChain?: string | number
): { key: ChainKey; chainType: ChainType; chainId: number } => {
  if (targetChain === undefined || targetChain === null || targetChain === '') {
    const key = CHAIN_KEYS[Math.floor(Math.random() * CHAIN_KEYS.length)];
    return {
      key,
      chainType: key as ChainType,
      chainId: SUPPORTED_CHAINS[key].chainId,
    };
  }

  if (typeof targetChain === 'number') {
    const key = CHAIN_ID_TO_KEY[targetChain];
    if (!key) {
      throw new AppError(400, 'targetChain is not supported', 'INVALID_INPUT');
    }
    return {
      key,
      chainType: key as ChainType,
      chainId: SUPPORTED_CHAINS[key].chainId,
    };
  }

  const raw = targetChain.trim();
  if (!raw) {
    throw new AppError(400, 'targetChain is invalid', 'INVALID_INPUT');
  }

  const maybeNumber = Number(raw);
  if (Number.isInteger(maybeNumber) && maybeNumber > 0) {
    return resolveChain(maybeNumber);
  }

  const key = raw.toUpperCase() as ChainKey;
  if (!(key in SUPPORTED_CHAINS)) {
    throw new AppError(400, 'targetChain is not supported', 'INVALID_INPUT');
  }

  return {
    key,
    chainType: key as ChainType,
    chainId: SUPPORTED_CHAINS[key].chainId,
  };
};

const resolveTargetWallet = (travelType: NormalizedTravelType, targetAddress?: string): string => {
  if (travelType === 'specific') {
    if (!targetAddress?.trim()) {
      throw new AppError(400, 'targetAddress is required for specific travel', 'INVALID_INPUT');
    }
    return normalizeWalletAddress(targetAddress);
  }

  if (targetAddress?.trim()) {
    const maybe = targetAddress.trim().toLowerCase();
    if (isAddress(maybe)) {
      return maybe;
    }
  }

  return ZERO_ADDRESS;
};

const getOwnedFrog = async (tx: Tx, frogId: number, walletAddress: string) => {
  const frog = await tx.frog.findUnique({
    where: { id: frogId },
    select: {
      id: true,
      tokenId: true,
      name: true,
      ownerAddress: true,
      status: true,
    },
  });

  if (!frog) {
    throw new AppError(404, 'Frog not found', 'NOT_FOUND');
  }

  const normalizedWallet = normalizeWalletAddress(walletAddress);
  if (frog.ownerAddress.toLowerCase() !== normalizedWallet) {
    throw new AppError(403, 'You are not the owner of this frog', 'FORBIDDEN');
  }

  return frog;
};

export class TravelCommandServiceV1 {
  async startGroupTravel(input: StartGroupTravelInput): Promise<{
    travelId: number;
    groupTravelId: number;
    leader: { id: number; name: string };
    companion: { id: number; name: string };
    targetChain: string;
    chainId: number;
  }> {
    if (input.leaderTokenId === input.companionTokenId) {
      throw new AppError(400, 'Leader and companion must be different frogs', 'INVALID_INPUT');
    }

    const chain = resolveChain(input.targetChain);
    const duration = resolveDuration(input.duration);
    const now = new Date();
    const endTime = new Date(now.getTime() + duration * 1000);

    const result = await prisma.$transaction(async (tx) => {
      const [leaderFrog, companionFrog] = await Promise.all([
        tx.frog.findUnique({
          where: { tokenId: input.leaderTokenId },
        }),
        tx.frog.findUnique({
          where: { tokenId: input.companionTokenId },
        }),
      ]);

      if (!leaderFrog || !companionFrog) {
        throw new AppError(404, 'One or both frogs not found', 'NOT_FOUND');
      }

      if (leaderFrog.status !== FrogStatus.Idle) {
        throw new AppError(409, `${leaderFrog.name} 正在旅行中，无法再次出发`, 'CONFLICT');
      }
      if (companionFrog.status !== FrogStatus.Idle) {
        throw new AppError(409, `${companionFrog.name} 正在旅行中，无法一起出发`, 'CONFLICT');
      }

      const friendship = await tx.friendship.findFirst({
        where: {
          OR: [
            { requesterId: leaderFrog.id, addresseeId: companionFrog.id },
            { requesterId: companionFrog.id, addresseeId: leaderFrog.id },
          ],
          status: 'Accepted',
        },
      });

      if (!friendship) {
        throw new AppError(403, '只有好友才能一起结伴旅行', 'FORBIDDEN');
      }

      const travel = await tx.travel.create({
        data: {
          frogId: leaderFrog.id,
          targetWallet: ZERO_ADDRESS,
          targetChain: chain.chainType,
          chainId: chain.chainId,
          isRandom: true,
          isCrossChain: false,
          startTime: now,
          endTime,
          duration,
          status: TravelStatus.Active,
          currentStage: TravelStage.DEPARTING,
          progress: 0,
        },
      });

      const groupTravel = await tx.groupTravel.create({
        data: {
          leaderId: leaderFrog.id,
          companionId: companionFrog.id,
          travelId: travel.id,
          status: 'ACTIVE',
        },
      });

      await tx.frog.updateMany({
        where: { id: { in: [leaderFrog.id, companionFrog.id] } },
        data: { status: FrogStatus.Traveling },
      });

      await tx.friendInteraction.create({
        data: {
          friendshipId: friendship.id,
          actorId: leaderFrog.id,
          type: 'Travel',
          message: `${leaderFrog.name} 和 ${companionFrog.name} 一起踏上了冒险之旅！`,
          metadata: {
            groupTravelId: groupTravel.id,
            travelId: travel.id,
            chainId: chain.chainId,
          },
        },
      });

      await travelEventService.append(tx, {
        frogId: leaderFrog.id,
        travelId: travel.id,
        eventType: 'TravelStarted',
        payload: {
          travelType: 'group',
          targetChain: chain.key,
          chainId: chain.chainId,
          companionFrogId: companionFrog.id,
          duration,
        },
        requestId: input.requestId,
        source: input.source || 'legacy_group_travel_start',
      });

      return {
        travelId: travel.id,
        groupTravelId: groupTravel.id,
        leader: {
          id: leaderFrog.tokenId,
          name: leaderFrog.name,
        },
        companion: {
          id: companionFrog.tokenId,
          name: companionFrog.name,
        },
        targetChain: chain.key,
        chainId: chain.chainId,
      };
    });

    return result;
  }

  async feedTravel(input: FeedTravelInput): Promise<{
    success: boolean;
    timeReduced: number;
    newEndTime: Date;
    message: string;
    xpEarned?: number;
    reputationEarned?: number;
  }> {
    return travelFeedService.feedTravel(input.travelId, input.feederId, input.feedType || 'energy');
  }

  async performRescue(input: RescueInput): Promise<{
    success: boolean;
    message: string;
    xpEarned?: number;
    reputationEarned?: number;
  }> {
    return rescueService.performRescue(input.requestId, input.rescuerId);
  }

  async confirmGroupTravel(input: ConfirmGroupTravelInput): Promise<{
    success: boolean;
    data?: {
      travelId: number;
      groupTravelId: number;
    };
    error?: string;
  }> {
    return groupTravelService.confirmGroupTravel({
      txHash: input.txHash,
      leaderTokenId: input.leaderTokenId,
      companionTokenId: input.companionTokenId,
      targetChainId: input.targetChainId,
      duration: input.duration,
      crossChainMessageId: input.crossChainMessageId,
      provisionsUsed: input.provisionsUsed || '0',
    });
  }

  async completeGroupTravel(input: CompleteGroupTravelInput): Promise<{
    success: boolean;
    unifiedTravel: CompleteTravelResult | null;
  }> {
    const result = await groupTravelService.completeGroupTravel(input.crossChainMessageId, input.xpReward || 50);

    const groupTravel = await prisma.groupTravel.findUnique({
      where: { crossChainMessageId: input.crossChainMessageId },
      include: {
        leader: {
          select: { ownerAddress: true },
        },
      },
    });

    if (!groupTravel?.travelId || !groupTravel.leader?.ownerAddress) {
      return {
        success: result.success,
        unifiedTravel: null,
      };
    }

    const unifiedTravel = await this.completeTravel({
      travelId: groupTravel.travelId,
      walletAddress: groupTravel.leader.ownerAddress,
      source: 'legacy_group_travel_complete',
    });

    return {
      success: result.success,
      unifiedTravel,
    };
  }

  async startTravel(input: StartTravelInput): Promise<StartTravelResult> {
    const normalizedType = normalizeTravelType(input.travelType);
    const normalizedWallet = normalizeWalletAddress(input.walletAddress);
    const duration = resolveDuration(input.duration);
    const chain = resolveChain(input.targetChain);
    const targetWallet = resolveTargetWallet(normalizedType, input.targetAddress);
    const now = new Date();
    const endTime = new Date(now.getTime() + duration * 1000);
    const initialState = createInitialTravelState();

    const created = await prisma.$transaction(async (tx) => {
      const frog = await getOwnedFrog(tx, input.frogId, normalizedWallet);

      if (frog.status === FrogStatus.Traveling || frog.status === FrogStatus.CrossChainLocked) {
        throw new AppError(409, 'Frog is already traveling', 'CONFLICT');
      }

      const activeTravel = await tx.travel.findFirst({
        where: {
          frogId: frog.id,
          status: { in: [TravelStatus.Active, TravelStatus.Processing] },
        },
        select: { id: true },
      });

      if (activeTravel) {
        throw new AppError(409, 'An active travel already exists for this frog', 'CONFLICT');
      }

      const travel = await tx.travel.create({
        data: {
          frogId: frog.id,
          targetWallet,
          targetChain: chain.chainType,
          chainId: chain.chainId,
          isRandom: normalizedType !== 'specific',
          isCrossChain: normalizedType === 'cross_chain',
          startTime: now,
          endTime,
          duration,
          status: initialState.status,
          currentStage: initialState.currentStage,
          progress: initialState.progress,
        },
        select: {
          id: true,
          chainId: true,
          targetChain: true,
          endTime: true,
          status: true,
          currentStage: true,
          progress: true,
        },
      });

      await tx.frog.update({
        where: { id: frog.id },
        data: { status: FrogStatus.Traveling },
      });

      await travelEventService.append(tx, {
        frogId: frog.id,
        travelId: travel.id,
        eventType: 'TravelStarted',
        payload: {
          travelType: normalizedType,
          targetWallet,
          targetChain: travel.targetChain,
          chainId: travel.chainId,
          duration,
          companionFrogId: input.companionFrogId ?? null,
        },
        requestId: input.requestId,
        source: input.source || 'v1_travel_start',
      });

      return {
        frog,
        travel,
      };
    });

    notifyTravelStarted(created.frog.tokenId, {
      travelId: created.travel.id,
      targetWallet,
      startTime: now,
      endTime: created.travel.endTime,
      chainId: created.travel.chainId,
      status: 'PENDING',
    });

    const machine = toTravelMachineState({
      status: created.travel.status,
      currentStage: created.travel.currentStage,
      progress: created.travel.progress,
    });

    return {
      travelId: created.travel.id,
      status: machine.status,
      currentStage: machine.currentStage,
      progress: machine.progress,
      targetChain: created.travel.targetChain,
      chainId: created.travel.chainId,
      endTime: created.travel.endTime.toISOString(),
    };
  }

  async completeTravel(input: CompleteTravelInput): Promise<CompleteTravelResult> {
    const normalizedWallet = normalizeWalletAddress(input.walletAddress);
    const completed = createCompletedTravelState();

    const travel = await prisma.$transaction(async (tx) => {
      const existing = await tx.travel.findUnique({
        where: { id: input.travelId },
        include: {
          frog: {
            select: {
              id: true,
              tokenId: true,
              ownerAddress: true,
            },
          },
        },
      });

      if (!existing) {
        throw new AppError(404, 'Travel not found', 'NOT_FOUND');
      }

      if (existing.frog.ownerAddress.toLowerCase() !== normalizedWallet) {
        throw new AppError(403, 'You are not the owner of this travel', 'FORBIDDEN');
      }

      if (existing.status === TravelStatus.Cancelled || existing.status === TravelStatus.Failed) {
        throw new AppError(409, `Travel cannot be completed from status ${existing.status}`, 'CONFLICT');
      }

      if (existing.status === TravelStatus.Completed) {
        return existing;
      }

      const now = new Date();
      const updated = await tx.travel.update({
        where: { id: existing.id },
        data: {
          status: completed.status,
          currentStage: completed.currentStage,
          progress: completed.progress,
          completedAt: now,
          endTime: now,
        },
      });

      await tx.frog.update({
        where: { id: existing.frog.id },
        data: {
          status: FrogStatus.Idle,
        },
      });

      await travelEventService.append(tx, {
        frogId: existing.frog.id,
        travelId: existing.id,
        eventType: 'TravelCompleted',
        payload: {
          status: updated.status,
          currentStage: updated.currentStage,
          progress: updated.progress,
          completedAt: updated.completedAt?.toISOString() || null,
          souvenirId: updated.souvenirId ?? null,
        },
        requestId: input.requestId,
        source: input.source || 'v1_travel_complete',
      });

      return {
        ...updated,
        frog: existing.frog,
      };
    });

    const machine = toTravelMachineState({
      status: travel.status,
      currentStage: travel.currentStage,
      progress: travel.progress,
    });

    return {
      travelId: travel.id,
      status: machine.status,
      currentStage: machine.currentStage,
      progress: machine.progress,
      souvenirId: travel.souvenirId ?? null,
      completedAt: travel.completedAt?.toISOString() || null,
    };
  }
}

export const travelCommandServiceV1 = new TravelCommandServiceV1();
