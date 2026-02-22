/**
 * 🐸 宠物蛋系统 - 亲密度服务
 * P3.1: 好友亲密度系统
 */

import { prisma } from '../database';
import { InteractionType } from '@prisma/client';

// 亲密度配置
const INTIMACY_CONFIG = {
  // 互动类型对应的亲密度奖励
  rewards: {
    Visit: 3,      // 串门拜访 +3
    Feed: 5,       // 互相喂食 +5
    Play: 8,       // 一起玩耍 +8
    Gift: 2,       // 赠送礼物 +2 (基础，可根据礼物价值增加)
    Message: 1,    // 留言互动 +1
    Travel: 15,    // 结伴旅行 +15
  },
  // 每日限制
  dailyLimits: {
    Visit: 5,
    Feed: 3,
    Play: 1,
    Gift: 999,      // 实际无限制
    Message: 10,
    Travel: 1,
  },
  // 亲密度等级阈值
  levels: [
    { level: 1, name: '陌生人', minIntimacy: 0, unlocks: ['基础查看'] },
    { level: 2, name: '点头之交', minIntimacy: 21, unlocks: ['串门', '留言'] },
    { level: 3, name: '好朋友', minIntimacy: 51, unlocks: ['赠送礼物', '一起玩耍'] },
    { level: 4, name: '亲密伙伴', minIntimacy: 81, unlocks: ['结伴旅行'] },
    { level: 5, name: '灵魂伴侣', minIntimacy: 100, unlocks: ['配对繁殖'] },
  ],
};

export interface IntimacyResult {
  success: boolean;
  intimacyGained: number;
  newIntimacy: number;
  newLevel: number;
  levelUp: boolean;
  dailyRemaining: number;
  error?: string;
}

/**
 * 获取亲密度等级信息
 */
export function getIntimacyLevel(intimacy: number) {
  for (let i = INTIMACY_CONFIG.levels.length - 1; i >= 0; i--) {
    if (intimacy >= INTIMACY_CONFIG.levels[i].minIntimacy) {
      return INTIMACY_CONFIG.levels[i];
    }
  }
  return INTIMACY_CONFIG.levels[0];
}

/**
 * 检查每日互动限制
 */
export async function checkDailyLimit(
  friendshipId: number,
  type: InteractionType
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 获取或创建今日记录
  let dailyRecord = await prisma.dailyFriendInteraction.findUnique({
    where: {
      friendshipId_date: {
        friendshipId,
        date: today,
      },
    },
  });

  if (!dailyRecord) {
    dailyRecord = await prisma.dailyFriendInteraction.create({
      data: {
        friendshipId,
        date: today,
      },
    });
  }

  const limit = INTIMACY_CONFIG.dailyLimits[type] || 999;
  const countField = `${type.toLowerCase()}Count` as keyof typeof dailyRecord;
  const currentCount = (dailyRecord[countField] as number) || 0;
  const remaining = Math.max(0, limit - currentCount);

  return {
    allowed: currentCount < limit,
    remaining,
    limit,
  };
}

/**
 * 记录互动并增加亲密度
 */
export async function recordInteraction(
  friendshipId: number,
  type: InteractionType,
  giftValue?: number // 礼物价值（用于计算额外亲密度）
): Promise<IntimacyResult> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 检查每日限制
  const limitCheck = await checkDailyLimit(friendshipId, type);
  if (!limitCheck.allowed) {
    return {
      success: false,
      intimacyGained: 0,
      newIntimacy: 0,
      newLevel: 0,
      levelUp: false,
      dailyRemaining: 0,
      error: `今日${type}次数已达上限（${limitCheck.limit}次/天）`,
    };
  }

  // 计算亲密度奖励
  let intimacyGain = INTIMACY_CONFIG.rewards[type] || 0;
  
  // 礼物根据价值额外加成
  if (type === 'Gift' && giftValue) {
    // 每 50 价值 +1 亲密度，最多 +8
    intimacyGain += Math.min(8, Math.floor(giftValue / 50));
  }

  // 获取当前好友关系
  const friendship = await prisma.friendship.findUnique({
    where: { id: friendshipId },
  });

  if (!friendship) {
    return {
      success: false,
      intimacyGained: 0,
      newIntimacy: 0,
      newLevel: 0,
      levelUp: false,
      dailyRemaining: 0,
      error: '好友关系不存在',
    };
  }

  // 计算新亲密度（上限100）
  const newIntimacy = Math.min(100, friendship.intimacy + intimacyGain);
  const oldLevel = getIntimacyLevel(friendship.intimacy);
  const newLevelInfo = getIntimacyLevel(newIntimacy);
  const levelUp = newLevelInfo.level > oldLevel.level;

  // 更新好友关系
  await prisma.friendship.update({
    where: { id: friendshipId },
    data: {
      intimacy: newIntimacy,
      intimacyLevel: newLevelInfo.level,
      lastInteraction: new Date(),
    },
  });

  // 更新每日计数
  const countField = `${type.toLowerCase()}Count`;
  await prisma.dailyFriendInteraction.upsert({
    where: {
      friendshipId_date: {
        friendshipId,
        date: today,
      },
    },
    update: {
      [countField]: { increment: 1 },
    },
    create: {
      friendshipId,
      date: today,
      [countField]: 1,
    },
  });

  return {
    success: true,
    intimacyGained: intimacyGain,
    newIntimacy,
    newLevel: newLevelInfo.level,
    levelUp,
    dailyRemaining: limitCheck.remaining - 1,
  };
}

/**
 * 获取好友亲密度详情
 */
export async function getFriendshipIntimacy(friendshipId: number) {
  const friendship = await prisma.friendship.findUnique({
    where: { id: friendshipId },
    include: {
      requester: { select: { id: true, name: true, tokenId: true } },
      addressee: { select: { id: true, name: true, tokenId: true } },
    },
  });

  if (!friendship) {
    return null;
  }

  const levelInfo = getIntimacyLevel(friendship.intimacy);
  const nextLevel = INTIMACY_CONFIG.levels.find(l => l.level === levelInfo.level + 1);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 获取今日互动情况
  const dailyRecord = await prisma.dailyFriendInteraction.findUnique({
    where: {
      friendshipId_date: {
        friendshipId,
        date: today,
      },
    },
  });

  return {
    friendshipId: friendship.id,
    intimacy: friendship.intimacy,
    level: levelInfo.level,
    levelName: levelInfo.name,
    unlocks: levelInfo.unlocks,
    nextLevel: nextLevel ? {
      level: nextLevel.level,
      name: nextLevel.name,
      required: nextLevel.minIntimacy,
      progress: Math.round((friendship.intimacy / nextLevel.minIntimacy) * 100),
    } : null,
    todayInteractions: dailyRecord ? {
      visit: { count: dailyRecord.visitCount, limit: INTIMACY_CONFIG.dailyLimits.Visit },
      feed: { count: dailyRecord.feedCount, limit: INTIMACY_CONFIG.dailyLimits.Feed },
      play: { count: dailyRecord.playCount, limit: INTIMACY_CONFIG.dailyLimits.Play },
      gift: { count: dailyRecord.giftCount, limit: INTIMACY_CONFIG.dailyLimits.Gift },
      message: { count: dailyRecord.messageCount, limit: INTIMACY_CONFIG.dailyLimits.Message },
      travel: { count: dailyRecord.travelCount, limit: INTIMACY_CONFIG.dailyLimits.Travel },
    } : null,
    requester: friendship.requester,
    addressee: friendship.addressee,
  };
}

export default {
  INTIMACY_CONFIG,
  getIntimacyLevel,
  checkDailyLimit,
  recordInteraction,
  getFriendshipIntimacy,
};
