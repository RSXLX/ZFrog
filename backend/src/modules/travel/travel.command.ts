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
