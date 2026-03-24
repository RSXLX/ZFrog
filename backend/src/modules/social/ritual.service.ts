import { Prisma } from '@prisma/client';
import { prisma } from '../../database';
import { AppError } from '../../middlewares/errorHandler';
import {
  createBlessingCompletedNotification,
  createRescueCompletedNotification,
} from '../../services/notification.service';
import { rescueService } from '../../services/travel/rescue.service';
import { logger } from '../../utils/logger';
import { normalizeWalletAddress } from '../identity/nonce.service';
import { worldVerifyService } from '../identity/world-verify.service';
import { lifeCommandService } from '../life/life.command';
import { relationshipEventService } from './relationship-event.service';


type Tx = Prisma.TransactionClient;

type RitualType = 'blessing' | 'rescue';

export interface CreateRitualInput {
  type: string;
  targetFrogId?: number;
  initiatorFrogId?: number;
  travelId?: number;
  verificationId?: string;
  walletAddress: string;
  requestId?: string;
  source?: string;
}

export interface BlessDormantInput {
  targetFrogId: number;
  blesserFrogId: number;
  walletAddress: string;
  verificationId?: string;
  requestId?: string;
  source?: string;
}

export interface RescueTravelInput {
  travelId: number;
  rescuerFrogId: number;
  walletAddress: string;
  verificationId?: string;
  requestId?: string;
  source?: string;
}

const normalizeRitualType = (type: string): RitualType => {
  const normalized = type.trim().toLowerCase();
  if (normalized === 'blessing') {
    return 'blessing';
  }
  if (normalized === 'rescue') {
    return 'rescue';
  }

  throw new AppError(400, `Unsupported ritual type: ${type}`, 'INVALID_INPUT');
};

export class RitualService {
  private async ensureOwnedFrogByWallet(
    frogId: number,
    walletAddress: string,
    tx?: Tx
  ): Promise<{ id: number; name: string; ownerAddress: string }> {
    const db = tx || prisma;
    const frog = await db.frog.findUnique({
      where: { id: frogId },
      select: {
        id: true,
        name: true,
        ownerAddress: true,
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
  }

  private async writeRescueStartedEvent(
    tx: Tx,
    input: RescueTravelInput,
    targetFrogId: number,
    rescueRequestId: number
  ): Promise<void> {
    await tx.domainEvent.create({
      data: {
        frogId: targetFrogId,
        travelId: input.travelId,
        aggregateType: 'Social',
        aggregateId: String(targetFrogId),
        eventType: 'RescueStarted',
        payload: {
          travelId: input.travelId,
          rescuerFrogId: input.rescuerFrogId,
          rescueRequestId,
          verificationId: input.verificationId || null,
        },
        requestId: input.requestId,
        source: input.source || 'ritual.service.rescue',
      },
    });
  }

  private async writeRescueCompletedEvent(
    tx: Tx,
    input: RescueTravelInput,
    targetFrogId: number,
    rescueRequestId: number,
    xpEarned: number,
    reputationEarned: number
  ): Promise<void> {
    await tx.domainEvent.create({
      data: {
        frogId: targetFrogId,
        travelId: input.travelId,
        aggregateType: 'Social',
        aggregateId: String(targetFrogId),
        eventType: 'RescueCompleted',
        payload: {
          travelId: input.travelId,
          rescuerFrogId: input.rescuerFrogId,
          rescueRequestId,
          xpEarned,
          reputationEarned,
        },
        requestId: input.requestId,
        source: input.source || 'ritual.service.rescue',
      },
    });
  }

  async createRitual(input: CreateRitualInput): Promise<Record<string, unknown>> {
    const ritualType = normalizeRitualType(input.type);

    if (ritualType === 'blessing') {
      if (!input.targetFrogId || !input.initiatorFrogId) {
        throw new AppError(400, 'targetFrogId and initiatorFrogId are required', 'INVALID_INPUT');
      }

      const result = await this.blessDormant({
        targetFrogId: input.targetFrogId,
        blesserFrogId: input.initiatorFrogId,
        walletAddress: input.walletAddress,
        verificationId: input.verificationId,
        requestId: input.requestId,
        source: input.source || 'v1_social_ritual',
      });

      return {
        type: 'blessing',
        ...result,
      };
    }

    if (!input.travelId || !input.initiatorFrogId) {
      throw new AppError(400, 'travelId and initiatorFrogId are required for rescue ritual', 'INVALID_INPUT');
    }

    const result = await this.rescueTravel({
      travelId: input.travelId,
      rescuerFrogId: input.initiatorFrogId,
      walletAddress: input.walletAddress,
      verificationId: input.verificationId,
      requestId: input.requestId,
      source: input.source || 'v1_social_ritual',
    });

    return {
      type: 'rescue',
      ...result,
    };
  }

  async blessDormant(input: BlessDormantInput): Promise<{
    success: boolean;
    message: string;
    blessingsReceived: number;
    blesserEnergy: number;
  }> {
    if (input.verificationId?.trim()) {
      await worldVerifyService.requireVerification(input.verificationId.trim(), input.walletAddress);
    }

    const result = await lifeCommandService.blessDormant({
      blesserFrogId: input.blesserFrogId,
      targetFrogId: input.targetFrogId,
      walletAddress: input.walletAddress,
      verificationId: input.verificationId,
      requestId: input.requestId,
    });

    const [targetFrog, blesserFrog] = await Promise.all([
      prisma.frog.findUnique({
        where: { id: input.targetFrogId },
        select: { name: true },
      }),
      prisma.frog.findUnique({
        where: { id: input.blesserFrogId },
        select: { name: true },
      }),
    ]);

    try {
      await createBlessingCompletedNotification(input.targetFrogId, {
        frogName: targetFrog?.name,
        blesserName: blesserFrog?.name,
      });
    } catch (error) {
      logger.warn('[RitualService] Failed to send blessing notification', {
        targetFrogId: input.targetFrogId,
        error,
      });
    }

    return result;
  }

  async rescueTravel(input: RescueTravelInput): Promise<{
    success: boolean;
    message: string;
    xpEarned?: number;
    reputationEarned?: number;
  }> {
    if (input.verificationId?.trim()) {
      await worldVerifyService.requireVerification(input.verificationId.trim(), input.walletAddress);
    }

    const rescuerFrog = await this.ensureOwnedFrogByWallet(input.rescuerFrogId, input.walletAddress);

    const rescueRequest = await prisma.rescueRequest.findUnique({
      where: { travelId: input.travelId },
      include: {
        strandedFrog: {
          select: {
            id: true,
            name: true,
            tokenId: true,
          },
        },
      },
    });

    if (!rescueRequest) {
      throw new AppError(404, 'Rescue request not found for travelId', 'NOT_FOUND');
    }

    if (rescueRequest.status === 'RESCUED') {
      throw new AppError(409, 'Travel has already been rescued', 'INVALID_STATE');
    }

    const ritual = await prisma.$transaction(async (tx) => {
      const created = await tx.ritual.create({
        data: {
          frogId: rescuerFrog.id,
          targetFrogId: rescueRequest.strandedFrogId,
          ritualType: 'TRAVEL_RESCUE',
          status: 'PENDING',
          payload: {
            travelId: input.travelId,
            rescueRequestId: rescueRequest.id,
            verificationId: input.verificationId || null,
          },
          startedAt: new Date(),
        },
      });

      await this.writeRescueStartedEvent(tx, input, rescueRequest.strandedFrogId, rescueRequest.id);
      return created;
    });

    const rescueResult = await rescueService.performRescue(rescueRequest.id, rescuerFrog.id);

    if (!rescueResult.success) {
      await prisma.ritual.update({
        where: { id: ritual.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          payload: {
            travelId: input.travelId,
            rescueRequestId: rescueRequest.id,
            error: rescueResult.message || 'rescue_failed',
          },
        },
      });

      throw new AppError(409, rescueResult.message || 'Rescue failed', 'INVALID_STATE');
    }

    const xpEarned = rescueResult.xpEarned || 0;
    const reputationEarned = rescueResult.reputationEarned || 0;

    await prisma.$transaction(async (tx) => {
      await tx.ritual.update({
        where: { id: ritual.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          payload: {
            travelId: input.travelId,
            rescueRequestId: rescueRequest.id,
            rescuerFrogId: rescuerFrog.id,
            xpEarned,
            reputationEarned,
          },
        },
      });

      await relationshipEventService.record(tx, {
        frogId: rescueRequest.strandedFrogId,
        actorFrogId: rescuerFrog.id,
        counterpartyFrogId: rescueRequest.strandedFrogId,
        eventType: 'RESCUE',
        payload: {
          travelId: input.travelId,
          rescueRequestId: rescueRequest.id,
          xpEarned,
          reputationEarned,
        },
        requestId: input.requestId,
        source: input.source || 'ritual.service.rescue',
      });

      await this.writeRescueCompletedEvent(
        tx,
        input,
        rescueRequest.strandedFrogId,
        rescueRequest.id,
        xpEarned,
        reputationEarned
      );
    });

    try {
      await createRescueCompletedNotification(rescueRequest.strandedFrogId, {
        frogName: rescueRequest.strandedFrog.name,
        rescuerName: rescuerFrog.name,
      });
    } catch (error) {
      logger.warn('[RitualService] Failed to send rescue notification', {
        travelId: input.travelId,
        error,
      });
    }

    return {
      success: true,
      message: rescueResult.message,
      xpEarned,
      reputationEarned,
    };
  }
}

export const ritualService = new RitualService();
