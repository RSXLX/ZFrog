/**
 * 🪷 宠物蛋系统 - $LILY 软货币服务
 * 负责货币余额管理、交易记录
 */

import { prisma } from '../database';

// LilyTxType 枚举值（对应 schema.prisma 中的定义）
type LilyTxType = 'GAME_REWARD' | 'FEED_COST' | 'CLEAN_REWARD' | 'DAILY_SIGNIN' | 'TRAVEL_REWARD' | 'MEDICINE_COST';

// 食物价格配置
const FOOD_PRICES: Record<string, number> = {
  BREAD: 10,
  BUG_BENTO: 25,
  CAKE: 15,
  MEDICINE: 50,
};

// 每日游戏奖励上限
const DAILY_GAME_REWARD_LIMIT = 500;

// 清洁奖励
const CLEAN_REWARD = 10;

export interface LilyBalanceInfo {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  dailyGameEarned: number;
  dailyRemainingGameReward: number;
}

/**
 * 获取用户 $LILY 余额
 */
export async function getBalance(ownerAddress: string): Promise<LilyBalanceInfo> {
  let balance = await prisma.lilyBalance.findUnique({
    where: { ownerAddress },
  });

  // 如果不存在，创建初始余额
  if (!balance) {
    balance = await prisma.lilyBalance.create({
      data: {
        ownerAddress,
        balance: 100, // 初始赠送 100 $LILY
      },
    });
  }

  // 检查是否需要重置每日限额
  const now = new Date();
  const resetAt = new Date(balance.dailyResetAt);
  if (now.getDate() !== resetAt.getDate() || now.getMonth() !== resetAt.getMonth()) {
    balance = await prisma.lilyBalance.update({
      where: { ownerAddress },
      data: {
        dailyGameEarned: 0,
        dailyResetAt: now,
      },
    });
  }

  return {
    balance: balance.balance,
    totalEarned: balance.totalEarned,
    totalSpent: balance.totalSpent,
    dailyGameEarned: balance.dailyGameEarned,
    dailyRemainingGameReward: Math.max(0, DAILY_GAME_REWARD_LIMIT - balance.dailyGameEarned),
  };
}

/**
 * 扣除 $LILY（购买食物/治疗）
 */
export async function spend(
  ownerAddress: string,
  amount: number,
  type: LilyTxType,
  description?: string
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const balanceInfo = await getBalance(ownerAddress);

  if (balanceInfo.balance < amount) {
    return {
      success: false,
      newBalance: balanceInfo.balance,
      error: '余额不足',
    };
  }

  const [updatedBalance] = await prisma.$transaction([
    prisma.lilyBalance.update({
      where: { ownerAddress },
      data: {
        balance: { decrement: amount },
        totalSpent: { increment: amount },
      },
    }),
    prisma.lilyTransaction.create({
      data: {
        ownerAddress,
        amount: -amount,
        type,
        description,
      },
    }),
  ]);

  return {
    success: true,
    newBalance: updatedBalance.balance,
  };
}

/**
 * 增加 $LILY（游戏奖励/清洁奖励等）
 */
export async function earn(
  ownerAddress: string,
  amount: number,
  type: LilyTxType,
  description?: string,
  isGameReward: boolean = false
): Promise<{ success: boolean; actualAmount: number; newBalance: number; error?: string }> {
  const balanceInfo = await getBalance(ownerAddress);

  let actualAmount = amount;

  // 如果是游戏奖励，检查每日限额
  if (isGameReward) {
    const remainingLimit = balanceInfo.dailyRemainingGameReward;
    if (remainingLimit <= 0) {
      return {
        success: false,
        actualAmount: 0,
        newBalance: balanceInfo.balance,
        error: '今日游戏奖励已达上限',
      };
    }
    actualAmount = Math.min(amount, remainingLimit);
  }

  const updateData: any = {
    balance: { increment: actualAmount },
    totalEarned: { increment: actualAmount },
  };

  if (isGameReward) {
    updateData.dailyGameEarned = { increment: actualAmount };
  }

  const [updatedBalance] = await prisma.$transaction([
    prisma.lilyBalance.update({
      where: { ownerAddress },
      data: updateData,
    }),
    prisma.lilyTransaction.create({
      data: {
        ownerAddress,
        amount: actualAmount,
        type,
        description,
      },
    }),
  ]);

  return {
    success: true,
    actualAmount,
    newBalance: updatedBalance.balance,
  };
}

/**
 * 购买食物
 */
export async function buyFood(
  ownerAddress: string,
  foodType: string
): Promise<{ success: boolean; cost: number; newBalance: number; error?: string }> {
  const cost = FOOD_PRICES[foodType];
  if (!cost) {
    return {
      success: false,
      cost: 0,
      newBalance: 0,
      error: '未知食物类型',
    };
  }

  const result = await spend(ownerAddress, cost, 'FEED_COST', `购买 ${foodType}`);
  return {
    ...result,
    cost,
  };
}

/**
 * 购买药水
 */
export async function buyMedicine(
  ownerAddress: string
): Promise<{ success: boolean; cost: number; newBalance: number; error?: string }> {
  const cost = FOOD_PRICES.MEDICINE;
  const result = await spend(ownerAddress, cost, 'MEDICINE_COST', '购买药水治疗');
  return {
    ...result,
    cost,
  };
}

/**
 * 清洁奖励
 */
export async function rewardClean(
  ownerAddress: string
): Promise<{ reward: number; newBalance: number }> {
  const result = await earn(ownerAddress, CLEAN_REWARD, 'CLEAN_REWARD', '清洁奖励');
  return {
    reward: result.actualAmount,
    newBalance: result.newBalance,
  };
}

/**
 * 游戏奖励
 */
export async function rewardGame(
  ownerAddress: string,
  amount: number,
  gameName: string
): Promise<{ success: boolean; reward: number; newBalance: number; error?: string }> {
  const result = await earn(ownerAddress, amount, 'GAME_REWARD', `${gameName}游戏奖励`, true);
  return {
    success: result.success,
    reward: result.actualAmount,
    newBalance: result.newBalance,
    error: result.error,
  };
}

/**
 * 获取交易历史
 */
export async function getTransactionHistory(
  ownerAddress: string,
  limit: number = 20
): Promise<any[]> {
  return prisma.lilyTransaction.findMany({
    where: { ownerAddress },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export default {
  getBalance,
  spend,
  earn,
  buyFood,
  buyMedicine,
  rewardClean,
  rewardGame,
  getTransactionHistory,
  FOOD_PRICES,
};
