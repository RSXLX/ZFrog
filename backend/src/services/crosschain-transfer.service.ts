/**
 * CrossChainTransferService - 独立跨链转账服务
 * 
 * 功能:
 * - 跨链代币转账 (ZetaChain Gateway)
 * - 好友间转账追踪
 * - 成就解锁触发
 */

import { ethers } from 'ethers';
import { prisma } from '../database';

// ============ 类型定义 ============

export type TransferStatus = 'PENDING' | 'CONFIRMING' | 'COMPLETED' | 'FAILED';

export interface CreateTransferInput {
  fromFrogId: number;
  fromAddress: string;
  toAddress: string;
  toFrogId?: number; // 如果是好友转账，有目标 frogId
  amount: string;
  tokenSymbol: string; // ZETA, ETH, BNB 等
  sourceChain: string;
  targetChain: string;
  message?: string;
}

export interface UpdateCctxInput {
  transferId: string;
  cctxHash: string;
  status: TransferStatus;
  targetTxHash?: string;
}

// ============ 跨链转账服务 ============

/**
 * 创建跨链转账记录
 */
export async function createTransfer(input: CreateTransferInput) {
  const transfer = await prisma.crossChainTransfer.create({
    data: {
      fromFrogId: input.fromFrogId,
      fromAddress: input.fromAddress.toLowerCase(),
      toAddress: input.toAddress.toLowerCase(),
      toFrogId: input.toFrogId,
      amount: input.amount,
      tokenSymbol: input.tokenSymbol,
      sourceChain: input.sourceChain,
      targetChain: input.targetChain,
      message: input.message,
      status: 'PENDING',
    },
    include: {
      fromFrog: true,
      toFrog: true,
    },
  });

  return transfer;
}

/**
 * 更新转账状态 (CCTX 确认后)
 */
export async function updateTransferStatus(input: UpdateCctxInput) {
  const transfer = await prisma.crossChainTransfer.update({
    where: { id: input.transferId },
    data: {
      cctxHash: input.cctxHash,
      status: input.status,
      targetTxHash: input.targetTxHash,
      confirmedAt: input.status === 'COMPLETED' ? new Date() : undefined,
    },
    include: {
      fromFrog: true,
      toFrog: true,
    },
  });

  // 如果是好友转账且完成，检查成就
  if (input.status === 'COMPLETED' && transfer.toFrogId) {
    await checkAndUnlockTransferAchievements(transfer.fromFrogId, transfer.toFrogId);
  }

  return transfer;
}

/**
 * 检查并解锁跨链转账相关成就
 */
async function checkAndUnlockTransferAchievements(fromFrogId: number, toFrogId: number) {
  // 检查好友关系 - 使用 frogId 查询，Friendship 通过 requesterId/addresseeId 关联 Frog
  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: fromFrogId, addresseeId: toFrogId, status: 'Accepted' },
        { requesterId: toFrogId, addresseeId: fromFrogId, status: 'Accepted' },
      ],
    },
  });

  // 获取发送者的转账次数
  const transferCount = await prisma.crossChainTransfer.count({
    where: { fromFrogId, status: 'COMPLETED' },
  });

  // 解锁 "跨链先锋" 徽章 (首次跨链转账)
  if (transferCount === 1) {
    await tryUnlockAchievement(fromFrogId, 'CROSS_CHAIN_PIONEER');
  }

  // 解锁 "链间友谊" 徽章 (向好友转账)
  if (friendship) {
    await tryUnlockAchievement(fromFrogId, 'CROSS_CHAIN_FRIENDSHIP');
  }

  // 解锁 "跨链使者" 徽章 (完成 10 次跨链转账)
  if (transferCount >= 10) {
    await tryUnlockAchievement(fromFrogId, 'CROSS_CHAIN_AMBASSADOR');
  }
}

/**
 * 尝试解锁成就
 */
async function tryUnlockAchievement(frogId: number, achievementCode: string) {
  try {
    // 检查成就是否存在
    const achievement = await prisma.achievement.findUnique({
      where: { code: achievementCode },
    });

    if (!achievement) return;

    // 检查是否已获得
    const existing = await prisma.earnedAchievement.findUnique({
      where: {
        frogId_achievementId: {
          frogId,
          achievementId: achievement.id,
        },
      },
    });

    if (existing) return;

    // 解锁成就
    await prisma.earnedAchievement.create({
      data: {
        frogId,
        achievementId: achievement.id,
      },
    });

    console.log(`🎉 Frog ${frogId} unlocked achievement: ${achievementCode}`);
  } catch (error) {
    console.error('Failed to unlock achievement:', error);
  }
}

/**
 * 获取青蛙的转账历史
 */
export async function getTransferHistory(frogId: number, options: {
  type?: 'sent' | 'received' | 'all';
  limit?: number;
  offset?: number;
} = {}) {
  const { type = 'all', limit = 20, offset = 0 } = options;

  const frog = await prisma.frog.findUnique({ where: { id: frogId } });
  if (!frog) throw new Error('Frog not found');

  let where: any = {};

  if (type === 'sent') {
    where.fromFrogId = frogId;
  } else if (type === 'received') {
    where.toAddress = frog.ownerAddress.toLowerCase();
  } else {
    where.OR = [
      { fromFrogId: frogId },
      { toAddress: frog.ownerAddress.toLowerCase() },
    ];
  }

  const [transfers, total] = await Promise.all([
    prisma.crossChainTransfer.findMany({
      where,
      include: { fromFrog: true, toFrog: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.crossChainTransfer.count({ where }),
  ]);

  return { transfers, total, limit, offset };
}

/**
 * 获取转账统计
 */
export async function getTransferStats(frogId: number) {
  const [sent, received, transfers] = await Promise.all([
    prisma.crossChainTransfer.count({
      where: { fromFrogId: frogId, status: 'COMPLETED' },
    }),
    prisma.crossChainTransfer.count({
      where: {
        toFrog: { id: frogId },
        status: 'COMPLETED',
      },
    }),
    // Get all completed transfers to calculate total volume manually
    prisma.crossChainTransfer.findMany({
      where: { fromFrogId: frogId, status: 'COMPLETED' },
      select: { amount: true },
    }),
  ]);

  // Calculate total volume manually (amount is a string)
  const totalVolume = transfers.reduce((sum: number, t: { amount: string }) => {
    const val = parseFloat(t.amount) || 0;
    return sum + val;
  }, 0);

  return {
    sentCount: sent,
    receivedCount: received,
    totalVolume: totalVolume.toString(),
  };
}

/**
 * 获取好友列表 (可转账)
 */
export async function getTransferableFriends(frogId: number) {
  const frog = await prisma.frog.findUnique({ where: { id: frogId } });
  if (!frog) throw new Error('Frog not found');

  // 获取所有好友 - 使用 requesterId/addresseeId 查询
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { requesterId: frogId, status: 'Accepted' },
        { addresseeId: frogId, status: 'Accepted' },
      ],
    },
    include: {
      requester: true,
      addressee: true,
    },
  });

  // 提取好友青蛙
  const friends = friendships.map((f) => {
    if (f.requesterId === frogId) {
      return f.addressee;
    }
    return f.requester;
  }).filter(Boolean);

  return friends;
}

// ============ 导出 ============

export const crossChainTransferService = {
  createTransfer,
  updateTransferStatus,
  getTransferHistory,
  getTransferStats,
  getTransferableFriends,
};

export default crossChainTransferService;
