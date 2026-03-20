import { prisma } from '../../database';
import { AppError } from '../../middlewares/errorHandler';
import { normalizeWalletAddress } from '../identity/nonce.service';

interface HatchInput {
  frogId: number;
  walletAddress: string;
  source?: string;
  requestId?: string;
}

interface HatchOutput {
  hatched: boolean;
  frogStatus: 'Idle';
  eggStatus: 'hatched';
}

export class HatchService {
  async hatch(input: HatchInput): Promise<HatchOutput> {
    const walletAddress = normalizeWalletAddress(input.walletAddress);
    return prisma.$transaction(async (tx) => {
      const frog = await tx.frog.findUnique({
        where: { id: input.frogId },
        include: {
          eggProfile: true,
          soulProfile: true,
        },
      });

      if (!frog) {
        throw new AppError(404, 'Frog not found', 'NOT_FOUND');
      }
      if (frog.ownerAddress.toLowerCase() !== walletAddress) {
        throw new AppError(403, 'You are not the owner of this frog', 'FORBIDDEN');
      }
      if (!frog.eggProfile) {
        throw new AppError(409, 'Egg has not been claimed yet', 'EGG_NOT_CLAIMED');
      }

      if (frog.eggProfile.claimStatus === 'HATCHED') {
        return {
          hatched: true,
          frogStatus: 'Idle',
          eggStatus: 'hatched',
        };
      }

      const hasSoulImprint = Boolean(frog.soulProfile?.imprintText?.trim());
      const canHatch = frog.eggProfile.claimStatus === 'SOUL_IMPRINTED' || hasSoulImprint;
      if (!canHatch) {
        throw new AppError(
          409,
          'Hatch is locked: complete soul imprint first',
          'HATCH_LOCKED'
        );
      }

      const now = new Date();
      await tx.eggProfile.update({
        where: { frogId: frog.id },
        data: {
          claimStatus: 'HATCHED',
          hatchedAt: now,
        },
      });

      await tx.frog.update({
        where: { id: frog.id },
        data: {
          status: 'Idle',
        },
      });

      await tx.petState.upsert({
        where: { frogId: frog.id },
        update: {
          lifeStage: 'ACTIVE',
          isDormant: false,
          lastStateSyncAt: now,
        },
        create: {
          frogId: frog.id,
          lifeStage: 'ACTIVE',
          isDormant: false,
          hunger: 100,
          happiness: 100,
          health: 100,
          energy: 100,
          cleanliness: 100,
          isSick: false,
          lastStateSyncAt: now,
          metadata: {
            source: 'hatch',
          },
        },
      });

      await tx.onchainMilestone.create({
        data: {
          frogId: frog.id,
          milestoneType: 'HATCHED',
          payload: {
            source: input.source || 'unknown',
          },
        },
      });

      await tx.domainEvent.create({
        data: {
          frogId: frog.id,
          aggregateType: 'Life',
          aggregateId: String(frog.id),
          eventType: 'Hatched',
          payload: {
            frogId: frog.id,
            tokenId: frog.tokenId,
            source: input.source || 'unknown',
          },
          requestId: input.requestId,
          source: 'hatch.service',
        },
      });

      return {
        hatched: true,
        frogStatus: 'Idle',
        eggStatus: 'hatched',
      };
    });
  }
}

export const hatchService = new HatchService();
