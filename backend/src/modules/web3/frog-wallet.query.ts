import { prisma } from '../../database';
import { AppError } from '../../middlewares/errorHandler';
import { normalizeWalletAddress } from '../identity/nonce.service';
import { frogWalletService } from './frog-wallet.service';
import { onchainMilestoneService, OnchainMilestoneReadModel } from './onchain-milestone.service';

interface FrogOwnershipRow {
  id: number;
  tokenId: number;
  name: string;
  ownerAddress: string;
}

export interface FrogWalletReadModel {
  frogId: number;
  tokenId: number;
  frogName: string;
  ownerAddress: string;
  tbaAddress: string;
  tbaSource: 'erc6551_registry' | 'deterministic_fallback';
  chainId: number;
  assets: {
    souvenirs: Array<{
      id: number;
      tokenId: number;
      name: string;
      rarity: string;
      chainType: string;
      mintedAt: string;
    }>;
    badges: Array<{
      id: string;
      code: string;
      name: string;
      icon: string;
      rarity: number;
      unlockedAt: string;
      unlockedByTravelId: number | null;
    }>;
    decorations: Array<{
      id: string;
      name: string;
      type: string;
      assetUrl: string;
      rarity: number;
      amount: number;
      souvenirId: number | null;
    }>;
  };
  milestones: {
    total: number;
    latestAt: string | null;
  };
}

const ensureOwner = (frog: FrogOwnershipRow, walletAddress?: string): void => {
  if (!walletAddress) {
    return;
  }

  const normalized = normalizeWalletAddress(walletAddress);
  if (frog.ownerAddress.toLowerCase() !== normalized) {
    throw new AppError(403, 'You are not the owner of this frog', 'FORBIDDEN');
  }
};

const getFrogOrThrow = async (frogId: number): Promise<FrogOwnershipRow> => {
  const frog = await prisma.frog.findUnique({
    where: { id: frogId },
    select: {
      id: true,
      tokenId: true,
      name: true,
      ownerAddress: true,
    },
  });

  if (!frog) {
    throw new AppError(404, 'Frog not found', 'NOT_FOUND');
  }

  return frog;
};

export class FrogWalletQueryService {
  async getWalletByFrogId(frogId: number, walletAddress?: string): Promise<FrogWalletReadModel> {
    const frog = await getFrogOrThrow(frogId);
    ensureOwner(frog, walletAddress);

    const [binding, souvenirs, badges, decorations, milestoneSummary] = await Promise.all([
      frogWalletService.deriveWallet(frog.tokenId),
      prisma.souvenir.findMany({
        where: { frogId: frog.id },
        orderBy: { mintedAt: 'desc' },
        take: 100,
        select: {
          id: true,
          tokenId: true,
          name: true,
          rarity: true,
          chainType: true,
          mintedAt: true,
        },
      }),
      prisma.userBadge.findMany({
        where: { frogId: frog.id },
        orderBy: { unlockedAt: 'desc' },
        include: {
          badge: {
            select: {
              code: true,
              name: true,
              icon: true,
              rarity: true,
            },
          },
        },
      }),
      prisma.userDecoration.findMany({
        where: { frogId: frog.id },
        orderBy: { createdAt: 'desc' },
        include: {
          decoration: {
            select: {
              name: true,
              type: true,
              assetUrl: true,
              rarity: true,
            },
          },
        },
      }),
      onchainMilestoneService.getSummaryByFrogId(frog.id),
    ]);

    return {
      frogId: frog.id,
      tokenId: frog.tokenId,
      frogName: frog.name,
      ownerAddress: frog.ownerAddress.toLowerCase(),
      tbaAddress: binding.tbaAddress,
      tbaSource: binding.source,
      chainId: binding.chainId,
      assets: {
        souvenirs: souvenirs.map((item) => ({
          id: item.id,
          tokenId: item.tokenId,
          name: item.name,
          rarity: item.rarity,
          chainType: item.chainType,
          mintedAt: item.mintedAt.toISOString(),
        })),
        badges: badges.map((item) => ({
          id: item.id,
          code: item.badge.code,
          name: item.badge.name,
          icon: item.badge.icon,
          rarity: item.badge.rarity,
          unlockedAt: item.unlockedAt.toISOString(),
          unlockedByTravelId: item.unlockedByTravelId ?? null,
        })),
        decorations: decorations.map((item) => ({
          id: item.id,
          name: item.decoration.name,
          type: item.decoration.type,
          assetUrl: item.decoration.assetUrl,
          rarity: item.decoration.rarity,
          amount: item.amount,
          souvenirId: item.souvenirId ?? null,
        })),
      },
      milestones: milestoneSummary,
    };
  }

  async getMilestonesByFrogId(
    frogId: number,
    walletAddress?: string,
    limit = 100
  ): Promise<OnchainMilestoneReadModel[]> {
    const frog = await getFrogOrThrow(frogId);
    ensureOwner(frog, walletAddress);

    return onchainMilestoneService.listByFrogId(frog.id, limit);
  }
}

export const frogWalletQueryService = new FrogWalletQueryService();
