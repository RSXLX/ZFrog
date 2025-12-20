// backend/src/services/badge/badge.service.ts

import { prisma } from '../../database';
import { ChainKey } from '../../config/chains';
import { Discovery } from '../travel/exploration.service';
import { logger } from '../../utils/logger';

export interface BadgeCheckContext {
  chain: ChainKey;
  travelId: number;
  discoveries: Discovery[];
}

class BadgeService {
  async checkAndUnlock(frogId: number, context: BadgeCheckContext): Promise<string[]> {
    const unlockedBadges: string[] = [];

    const stats = await prisma.frogTravelStats.findUnique({
      where: { frogId },
    });

    const existingBadges = await prisma.userBadge.findMany({
      where: { frogId },
      select: { badgeId: true },
    });
    const existingIds = new Set(existingBadges.map(b => b.badgeId));

    const allBadges = await prisma.travelBadge.findMany();

    for (const badge of allBadges) {
      if (existingIds.has(badge.id)) continue;

      const shouldUnlock = await this.checkCondition(
        badge.unlockType,
        badge.unlockCondition as any,
        stats,
        context
      );

      if (shouldUnlock) {
        await prisma.userBadge.create({
          data: {
            frogId,
            badgeId: badge.id,
            unlockedByTravelId: context.travelId,
          },
        });
        unlockedBadges.push(badge.code);
        logger.info(`Badge ${badge.code} unlocked for frog ${frogId}`);
      }
    }

    return unlockedBadges;
  }

  private async checkCondition(
    type: string,
    condition: any,
    stats: any,
    context: BadgeCheckContext
  ): Promise<boolean> {
    switch (type) {
      case 'TRIP_COUNT':
        return (stats?.totalTrips || 0) >= condition.threshold;

      case 'CHAIN_VISIT':
        const chainField: 'bscTrips' | 'ethTrips' | 'zetaTrips' = {
          BSC_TESTNET: 'bscTrips' as const,
          ETH_SEPOLIA: 'ethTrips' as const,
          ZETACHAIN_ATHENS: 'zetaTrips' as const,
        }[condition.chain as 'BSC_TESTNET' | 'ETH_SEPOLIA' | 'ZETACHAIN_ATHENS'];
        return (stats?.[chainField] || 0) >= condition.threshold;

      case 'MULTI_CHAIN':
        const visitedChains = [
          stats?.bscTrips > 0,
          stats?.ethTrips > 0,
          stats?.zetaTrips > 0,
        ].filter(Boolean).length;
        return visitedChains >= condition.threshold;

      case 'RARE_FIND':
        const maxRarity = Math.max(...context.discoveries.map(d => d.rarity));
        return maxRarity >= condition.minRarity;

      default:
        return false;
    }
  }

  async getUserBadges(frogId: number) {
    return prisma.userBadge.findMany({
      where: { frogId },
      include: { badge: true },
      orderBy: { unlockedAt: 'desc' },
    });
  }

  async getAllBadgesWithStatus(frogId: number) {
    const [allBadges, userBadges] = await Promise.all([
      prisma.travelBadge.findMany({ where: { isHidden: false } }),
      prisma.userBadge.findMany({ where: { frogId } }),
    ]);

    const unlockedIds = new Set(userBadges.map(ub => ub.badgeId));

    return allBadges.map(badge => ({
      ...badge,
      unlocked: unlockedIds.has(badge.id),
      unlockedAt: userBadges.find(ub => ub.badgeId === badge.id)?.unlockedAt,
    }));
  }
}

export const badgeService = new BadgeService();
