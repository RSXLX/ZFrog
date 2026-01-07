/**
 * AchievementService - 成就系统服务
 * 
 * 功能:
 * - 获取成就定义
 * - 检查并解锁成就
 * - SBT 铸造记录
 */

import { PrismaClient, AchievementCategory } from '@prisma/client';

const prisma = new PrismaClient();

// ============ 类型定义 ============

export interface AchievementCondition {
  type: 'travel_count' | 'photo_count' | 'gift_count' | 'decoration_count' | 'visitor_count';
  threshold: number;
  chainType?: string;
}

export interface MintSbtInput {
  achievementId: string;
  frogId: number;
  sbtTokenId: string;
  sbtTxHash: string;
}

// ============ 成就管理 ============

/**
 * 获取所有成就定义
 */
export async function getAllAchievements(includeHidden: boolean = false) {
  return prisma.achievement.findMany({
    where: includeHidden ? {} : { isHidden: false },
    orderBy: [{ category: 'asc' }, { rarity: 'asc' }],
  });
}

/**
 * 获取指定类别的成就
 */
export async function getAchievementsByCategory(category: AchievementCategory) {
  return prisma.achievement.findMany({
    where: { category, isHidden: false },
    orderBy: { rarity: 'asc' },
  });
}

/**
 * 获取青蛙已解锁的成就
 */
export async function getEarnedAchievements(frogId: number) {
  return prisma.earnedAchievement.findMany({
    where: { frogId },
    include: { achievement: true },
    orderBy: { earnedAt: 'desc' },
  });
}

/**
 * 获取青蛙的成就进度
 */
export async function getAchievementProgress(frogId: number) {
  const [all, earned] = await Promise.all([
    prisma.achievement.count({ where: { isHidden: false } }),
    prisma.earnedAchievement.count({ where: { frogId } }),
  ]);

  return {
    total: all,
    earned,
    percentage: all > 0 ? Math.round((earned / all) * 100) : 0,
  };
}

/**
 * 检查并解锁成就
 */
export async function checkAndUnlockAchievements(frogId: number): Promise<string[]> {
  const newlyUnlocked: string[] = [];

  // 获取青蛙数据
  const frog = await prisma.frog.findUnique({
    where: { id: frogId },
    include: {
      travels: true,
      photos: true,
      receivedGifts: true,
      decorations: true,
      earnedAchievements: true,
    },
  });

  if (!frog) return [];

  // 获取所有未解锁的成就
  const earnedIds = frog.earnedAchievements.map(ea => ea.achievementId);
  const unlockedAchievements = await prisma.achievement.findMany({
    where: {
      id: { notIn: earnedIds },
    },
  });

  // 检查每个成就
  for (const achievement of unlockedAchievements) {
    const condition = achievement.condition as unknown as AchievementCondition;
    let shouldUnlock = false;

    switch (condition.type) {
      case 'travel_count':
        shouldUnlock = frog.travels.length >= condition.threshold;
        break;
      case 'photo_count':
        shouldUnlock = frog.photos.length >= condition.threshold;
        break;
      case 'gift_count':
        shouldUnlock = frog.receivedGifts.length >= condition.threshold;
        break;
      case 'decoration_count':
        shouldUnlock = frog.decorations.length >= condition.threshold;
        break;
      // 更多条件类型可以在这里添加
    }

    if (shouldUnlock) {
      await prisma.earnedAchievement.create({
        data: {
          frogId,
          achievementId: achievement.id,
        },
      });
      newlyUnlocked.push(achievement.code);
    }
  }

  return newlyUnlocked;
}

/**
 * 手动解锁成就 (用于特殊情况)
 */
export async function unlockAchievement(frogId: number, achievementCode: string) {
  const achievement = await prisma.achievement.findUnique({
    where: { code: achievementCode },
  });

  if (!achievement) {
    throw new Error('Achievement not found');
  }

  // 检查是否已解锁
  const existing = await prisma.earnedAchievement.findUnique({
    where: {
      frogId_achievementId: {
        frogId,
        achievementId: achievement.id,
      },
    },
  });

  if (existing) {
    throw new Error('Achievement already unlocked');
  }

  return prisma.earnedAchievement.create({
    data: {
      frogId,
      achievementId: achievement.id,
    },
    include: { achievement: true },
  });
}

/**
 * 记录 SBT 铸造
 */
export async function recordSbtMint(input: MintSbtInput) {
  const earned = await prisma.earnedAchievement.findFirst({
    where: {
      frogId: input.frogId,
      achievementId: input.achievementId,
    },
  });

  if (!earned) {
    throw new Error('Achievement not earned');
  }

  return prisma.earnedAchievement.update({
    where: { id: earned.id },
    data: {
      sbtTokenId: input.sbtTokenId,
      sbtTxHash: input.sbtTxHash,
    },
    include: { achievement: true },
  });
}

// ============ 导出 ============

export const achievementService = {
  getAllAchievements,
  getAchievementsByCategory,
  getEarnedAchievements,
  getAchievementProgress,
  checkAndUnlockAchievements,
  unlockAchievement,
  recordSbtMint,
};

export default achievementService;
