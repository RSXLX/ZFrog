import { Prisma } from '@prisma/client';
import { prisma } from '../../database';
import { AppError } from '../../middlewares/errorHandler';
import { normalizeWalletAddress } from '../identity/nonce.service';
import { worldVerifyService } from '../identity/world-verify.service';

const HATCH_STATUS_INCUBATING = 'INCUBATING';

const sanitizePetName = (name: string): string => {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 24) {
    throw new AppError(400, 'petName must be 1-24 chars', 'INVALID_INPUT');
  }
  return trimmed;
};

const getNextTokenId = async (tx: Prisma.TransactionClient): Promise<number> => {
  const max = await tx.frog.aggregate({
    _max: { tokenId: true },
  });
  return (max._max.tokenId || 0) + 1;
};

const mapEggStatus = (claimStatus?: string | null): 'incubating' | 'soul_imprinted' | 'hatched' => {
  if (claimStatus === 'SOUL_IMPRINTED') return 'soul_imprinted';
  if (claimStatus === 'HATCHED') return 'hatched';
  return 'incubating';
};

const mapEggProgress = (claimStatus?: string | null): number => {
  if (claimStatus === 'SOUL_IMPRINTED') return 80;
  if (claimStatus === 'HATCHED') return 100;
  return 0;
};

interface ClaimEggInput {
  walletAddress: string;
  verificationId: string;
  petName: string;
  requestId?: string;
}

interface ClaimEggResult {
  frogId: number;
  tokenId: number;
  eggProfile: {
    hatchStatus: 'incubating' | 'soul_imprinted' | 'hatched';
    hatchProgress: number;
  };
}

export class EggService {
  async claimEgg(input: ClaimEggInput): Promise<ClaimEggResult> {
    const walletAddress = normalizeWalletAddress(input.walletAddress);
    const verificationId = input.verificationId?.trim();
    const petName = sanitizePetName(input.petName || '');

    if (!verificationId) {
      throw new AppError(400, 'verificationId is required', 'INVALID_INPUT');
    }

    await worldVerifyService.requireVerification(verificationId, walletAddress, 'egg_claim');

    const existingFrog = await prisma.frog.findUnique({
      where: { ownerAddress: walletAddress },
      include: { eggProfile: true },
    });

    if (existingFrog?.eggProfile) {
      return {
        frogId: existingFrog.id,
        tokenId: existingFrog.tokenId,
        eggProfile: {
          hatchStatus: mapEggStatus(existingFrog.eggProfile.claimStatus),
          hatchProgress: mapEggProgress(existingFrog.eggProfile.claimStatus),
        },
      };
    }

    const now = new Date();
    return prisma.$transaction(async (tx) => {
      let frog = existingFrog;
      if (!frog) {
        const tokenId = await getNextTokenId(tx);
        frog = await tx.frog.create({
          data: {
            tokenId,
            name: petName,
            ownerAddress: walletAddress,
            birthday: now,
            status: 'Idle',
          },
          include: { eggProfile: true },
        });
      }

      const eggProfile = await tx.eggProfile.upsert({
        where: { frogId: frog.id },
        update: {
          claimStatus: HATCH_STATUS_INCUBATING,
          claimedAt: now,
          hatchReadyAt: null,
          hatchedAt: null,
          metadata: {
            source: 'claim_egg',
            verificationId,
          },
        },
        create: {
          frogId: frog.id,
          claimStatus: HATCH_STATUS_INCUBATING,
          claimedAt: now,
          metadata: {
            source: 'claim_egg',
            verificationId,
          },
        },
      });

      await tx.soulProfile.upsert({
        where: { frogId: frog.id },
        update: {},
        create: {
          frogId: frog.id,
          personality: frog.personality,
          bondedAt: null,
          metadata: {
            source: 'claim_egg',
          },
        },
      });

      await tx.petState.upsert({
        where: { frogId: frog.id },
        update: {},
        create: {
          frogId: frog.id,
          lifeStage: 'INCUBATING',
          hunger: 100,
          happiness: 100,
          health: 100,
          energy: 100,
          cleanliness: 100,
          isSick: false,
          isDormant: false,
          metadata: {
            source: 'claim_egg',
          },
        },
      });

      await tx.onchainMilestone.create({
        data: {
          frogId: frog.id,
          milestoneType: 'EGG_CLAIMED',
          chainId: null,
          txHash: null,
          payload: {
            walletAddress,
            verificationId,
          },
        },
      });

      await tx.domainEvent.create({
        data: {
          frogId: frog.id,
          aggregateType: 'Life',
          aggregateId: String(frog.id),
          eventType: 'EggClaimed',
          payload: {
            frogId: frog.id,
            tokenId: frog.tokenId,
            walletAddress,
            verificationId,
            petName: frog.name,
          },
          requestId: input.requestId,
          source: 'egg.service',
        },
      });

      return {
        frogId: frog.id,
        tokenId: frog.tokenId,
        eggProfile: {
          hatchStatus: mapEggStatus(eggProfile.claimStatus),
          hatchProgress: mapEggProgress(eggProfile.claimStatus),
        },
      };
    });
  }
}

export const eggService = new EggService();
