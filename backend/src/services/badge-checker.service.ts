// backend/src/services/badge-checker.service.ts
// 徽章检查服务 - 检查并奖励跨链探索成就徽章

import { prisma } from '../database';
import { logger } from '../utils/logger';

// 徽章类型定义
export const TRAVEL_BADGE_TYPES = {
  CROSS_CHAIN_PIONEER: {
    code: 'CROSS_CHAIN_PIONEER',
    name: '跨链先锋',
    icon: '🌍',
    description: '完成首次跨链旅行',
    rarity: 1, // Common
    check: async (frogId: number) => {
      const count = await prisma.travel.count({
        where: { frogId, isCrossChain: true, status: 'Completed' }
      });
      return count >= 1;
    }
  },
  EXPLORER: {
    code: 'EXPLORER',
    name: '探索者',
    icon: '🔍',
    description: '探索 10 个地址',
    rarity: 2, // Uncommon
    check: async (frogId: number) => {
      const frog = await prisma.frog.findFirst({ where: { id: frogId }, select: { tokenId: true } });
      if (!frog) return false;
      const count = await prisma.travelInteraction.count({
        where: { travel: { frog: { tokenId: frog.tokenId } } }
      });
      return count >= 10;
    }
  },
  CONTRACT_HUNTER: {
    code: 'CONTRACT_HUNTER',
    name: '合约猎人',
    icon: '📜',
    description: '探索 5 个智能合约',
    rarity: 3, // Rare
    check: async (frogId: number) => {
      const frog = await prisma.frog.findFirst({ where: { id: frogId }, select: { tokenId: true } });
      if (!frog) return false;
      const count = await prisma.travelInteraction.count({
        where: { travel: { frog: { tokenId: frog.tokenId } }, isContract: true }
      });
      return count >= 5;
    }
  },
  FREQUENT_TRAVELER: {
    code: 'FREQUENT_TRAVELER',
    name: '旅行达人',
    icon: '✈️',
    description: '完成 5 次跨链旅行',
    rarity: 3, // Rare
    check: async (frogId: number) => {
      const count = await prisma.travel.count({
        where: { frogId, isCrossChain: true, status: 'Completed' }
      });
      return count >= 5;
    }
  },
  RAINBOW_TRAVELER: {
    code: 'RAINBOW_TRAVELER',
    name: '彩虹旅行家',
    icon: '🌈',
    description: '访问 3 条不同的链',
    rarity: 4, // Epic
    check: async (frogId: number) => {
      const chains = await prisma.travelInteraction.findMany({
        where: { travel: { frogId } },
        select: { chainId: true },
        distinct: ['chainId']
      });
      return chains.length >= 3;
    }
  }
} as const;

export type TravelBadgeType = keyof typeof TRAVEL_BADGE_TYPES;

/**
 * 检查并奖励青蛙的旅行徽章
 */
export async function checkAndAwardTravelBadges(frogId: number): Promise<string[]> {
  const awardedBadges: string[] = [];
  
  try {
    for (const [badgeCode, badge] of Object.entries(TRAVEL_BADGE_TYPES)) {
      // 检查是否已拥有该徽章
      const existing = await prisma.earnedTravelBadge.findUnique({
        where: { frogId_badgeType: { frogId, badgeType: badgeCode } }
      });
      
      if (existing) continue; // 已拥有，跳过
      
      // 检查是否满足条件
      const qualified = await badge.check(frogId);
      
      if (qualified) {
        // 授予徽章
        await prisma.earnedTravelBadge.create({
          data: {
            frogId,
            badgeType: badgeCode,
            metadata: {
              name: badge.name,
              icon: badge.icon,
              description: badge.description,
              rarity: badge.rarity
            }
          }
        });
        
        awardedBadges.push(badgeCode);
        logger.info(`[BadgeChecker] Awarded ${badgeCode} to frog ${frogId}`);
      }
    }
    
    return awardedBadges;
  } catch (error) {
    logger.error(`[BadgeChecker] Error checking badges for frog ${frogId}:`, error);
    return awardedBadges;
  }
}

/**
 * 获取青蛙的所有旅行徽章
 */
export async function getFrogTravelBadges(frogId: number) {
  const badges = await prisma.earnedTravelBadge.findMany({
    where: { frogId },
    orderBy: { earnedAt: 'desc' }
  });
  
  return badges.map(badge => ({
    ...badge,
    ...(TRAVEL_BADGE_TYPES[badge.badgeType as TravelBadgeType] || {})
  }));
}

/**
 * 获取徽章统计
 */
export async function getBadgeStats(frogId: number) {
  const badges = await prisma.earnedTravelBadge.findMany({
    where: { frogId }
  });
  
  const total = Object.keys(TRAVEL_BADGE_TYPES).length;
  const earned = badges.length;
  const progress = Math.round((earned / total) * 100);
  
  return {
    total,
    earned,
    progress,
    badges: badges.map(b => b.badgeType)
  };
}

export const badgeChecker = {
  checkAndAwardTravelBadges,
  getFrogTravelBadges,
  getBadgeStats,
  TRAVEL_BADGE_TYPES
};
