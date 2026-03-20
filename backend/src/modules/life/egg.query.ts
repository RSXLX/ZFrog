import { prisma } from '../../database';
import { AppError } from '../../middlewares/errorHandler';
import { normalizeWalletAddress } from '../identity/nonce.service';

type EggStatus = 'incubating' | 'soul_imprinted' | 'hatched';

const toApiEggStatus = (claimStatus?: string | null): EggStatus => {
  if (!claimStatus) return 'incubating';
  if (claimStatus === 'SOUL_IMPRINTED') return 'soul_imprinted';
  if (claimStatus === 'HATCHED') return 'hatched';
  return 'incubating';
};

const eggProgressFromStatus = (status: EggStatus): number => {
  if (status === 'hatched') return 100;
  if (status === 'soul_imprinted') return 80;
  return 0;
};

export interface EggLifecycleView {
  frogId: number;
  tokenId: number;
  walletAddress: string;
  petName: string;
  eggProfile: {
    hatchStatus: EggStatus;
    hatchProgress: number;
    claimedAt: string | null;
    hatchReadyAt: string | null;
    hatchedAt: string | null;
  } | null;
  soulProfile: {
    personality: string | null;
    imprintText: string | null;
    temperament: unknown;
    bondedAt: string | null;
  } | null;
}

export class EggQueryService {
  async getEggLifecycle(frogId: number, walletAddress?: string): Promise<EggLifecycleView> {
    const frog = await prisma.frog.findUnique({
      where: { id: frogId },
      include: {
        eggProfile: true,
        soulProfile: true,
      },
    });

    if (!frog) {
      throw new AppError(404, 'Frog not found', 'NOT_FOUND');
    }

    if (walletAddress) {
      const normalized = normalizeWalletAddress(walletAddress);
      if (frog.ownerAddress.toLowerCase() !== normalized) {
        throw new AppError(403, 'You are not the owner of this frog', 'FORBIDDEN');
      }
    }

    const eggStatus = toApiEggStatus(frog.eggProfile?.claimStatus);

    return {
      frogId: frog.id,
      tokenId: frog.tokenId,
      walletAddress: frog.ownerAddress.toLowerCase(),
      petName: frog.name,
      eggProfile: frog.eggProfile
        ? {
            hatchStatus: eggStatus,
            hatchProgress: eggProgressFromStatus(eggStatus),
            claimedAt: frog.eggProfile.claimedAt?.toISOString() || null,
            hatchReadyAt: frog.eggProfile.hatchReadyAt?.toISOString() || null,
            hatchedAt: frog.eggProfile.hatchedAt?.toISOString() || null,
          }
        : null,
      soulProfile: frog.soulProfile
        ? {
            personality: frog.soulProfile.personality,
            imprintText: frog.soulProfile.imprintText,
            temperament: frog.soulProfile.temperament,
            bondedAt: frog.soulProfile.bondedAt?.toISOString() || null,
          }
        : null,
    };
  }
}

export const eggQueryService = new EggQueryService();
