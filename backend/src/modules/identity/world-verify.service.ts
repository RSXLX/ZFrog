import { prisma } from '../../database';
import { AppError } from '../../middlewares/errorHandler';
import { normalizeWalletAddress } from './nonce.service';
import { WorldVerifyInput, WorldVerifyPayload } from './types';
import { randomUUID } from 'crypto';
import { config } from '../../config';
import { Prisma } from '@prisma/client';
import { logger } from '../../utils/logger';

const isWorldVerifyEnabled = (): boolean => Boolean(config.WORLD_VERIFY_ENABLED);

export class WorldVerifyService {
  async verify(input: WorldVerifyInput): Promise<WorldVerifyPayload> {
    if (!input.action?.trim()) {
      throw new AppError(400, 'action is required', 'INVALID_INPUT');
    }
    if (!input.proof || !input.proof.proof) {
      throw new AppError(400, 'proof.proof is required', 'INVALID_INPUT');
    }

    const walletAddress = normalizeWalletAddress(input.walletAddress);
    const verificationId = randomUUID();

    if (input.proof.nullifierHash) {
      const existing = await prisma.humanVerification.findUnique({
        where: { nullifierHash: input.proof.nullifierHash },
        select: { walletAddress: true, action: true },
      });
      if (existing) {
        throw new AppError(409, 'nullifierHash already used', 'CONFLICT', existing);
      }
    }

    const verified = true;
    const provider = isWorldVerifyEnabled() ? 'worldcoin' : 'world-mock';

    await prisma.humanVerification.create({
      data: {
        id: verificationId,
        walletAddress,
        action: input.action.trim(),
        signal: input.signal,
        nullifierHash: input.proof.nullifierHash,
        proof: input.proof as Prisma.InputJsonValue,
        verified,
        provider,
      },
    });

    try {
      const frog = await prisma.frog.findUnique({
        where: { ownerAddress: walletAddress },
        select: { id: true },
      });
      await prisma.domainEvent.create({
        data: {
          frogId: frog?.id,
          aggregateType: 'Identity',
          aggregateId: walletAddress,
          eventType: 'HumanVerified',
          payload: {
            action: input.action.trim(),
            verificationId,
            provider,
            signal: input.signal,
          },
          source: 'world-verify.service',
        },
      });
    } catch (eventError) {
      logger.warn('[WorldVerifyService] Failed to write HumanVerified domain event', {
        walletAddress,
        eventError,
      });
    }

    return {
      verified,
      verificationId,
      action: input.action.trim(),
    };
  }

  async getVerifiedActions(walletAddress: string): Promise<string[]> {
    const normalizedAddress = normalizeWalletAddress(walletAddress);
    const rows = await prisma.humanVerification.findMany({
      where: {
        walletAddress: normalizedAddress,
        verified: true,
      },
      select: { action: true },
      distinct: ['action'],
      orderBy: { action: 'asc' },
    });

    return rows.map((row) => row.action);
  }
}

export const worldVerifyService = new WorldVerifyService();
