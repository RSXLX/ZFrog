/**
 * Airdrop Service - 空投发放服务
 * 用于处理徽章解锁奖励的发放
 */

import { ethers } from 'ethers';
import { prisma } from '../../database';
import { logger } from '../../utils/logger';

class AirdropService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;

  constructor() {
    const rpcUrl = process.env.ZETACHAIN_RPC_URL || 'https://zetachain-athens-evm.blockpi.network/v1/rpc/public';
    const privateKey = process.env.AIRDROP_PRIVATE_KEY;

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    
    if (privateKey) {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      logger.info(`Airdrop service initialized. Address: ${this.wallet.address}`);
    } else {
      logger.warn('AIRDROP_PRIVATE_KEY not configured. Airdrop service disabled.');
      this.wallet = null as any;
    }
  }

  /**
   * 检查服务是否可用
   */
  isEnabled(): boolean {
    return !!this.wallet;
  }

  /**
   * 获取发放地址余额
   */
  async getBalance(): Promise<string> {
    if (!this.wallet) return '0';
    const balance = await this.provider.getBalance(this.wallet.address);
    return balance.toString();
  }

  /**
   * 获取发放地址
   */
  getAddress(): string | null {
    return this.wallet?.address || null;
  }

  /**
   * 创建奖励记录（徽章解锁时调用）
   */
  async createRewardRecord(
    userBadgeId: string,
    ownerAddress: string,
    amount: string
  ): Promise<void> {
    try {
      await prisma.badgeReward.create({
        data: {
          userBadgeId,
          ownerAddress: ownerAddress.toLowerCase(),
          amount,
          status: 'PENDING',
        },
      });
      logger.info(`Created reward record for userBadge ${userBadgeId}, amount: ${amount} wei`);
    } catch (error) {
      logger.error('Failed to create reward record:', error);
      throw error;
    }
  }

  /**
   * 获取用户待领取奖励
   */
  async getPendingRewards(ownerAddress: string) {
    return prisma.badgeReward.findMany({
      where: {
        ownerAddress: ownerAddress.toLowerCase(),
        status: 'PENDING',
      },
      include: {
        userBadge: {
          include: {
            badge: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 获取用户所有奖励记录
   */
  async getAllRewards(ownerAddress: string) {
    return prisma.badgeReward.findMany({
      where: {
        ownerAddress: ownerAddress.toLowerCase(),
      },
      include: {
        userBadge: {
          include: {
            badge: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 领取单个奖励
   */
  async claimReward(rewardId: string): Promise<{ txHash: string }> {
    if (!this.wallet) {
      throw new Error('Airdrop service not configured');
    }

    // 获取奖励记录
    const reward = await prisma.badgeReward.findUnique({
      where: { id: rewardId },
    });

    if (!reward) {
      throw new Error('Reward not found');
    }

    if (reward.status !== 'PENDING') {
      throw new Error(`Reward already ${reward.status.toLowerCase()}`);
    }

    // 更新状态为处理中
    await prisma.badgeReward.update({
      where: { id: rewardId },
      data: { status: 'PROCESSING' },
    });

    try {
      // 发送交易
      const tx = await this.wallet.sendTransaction({
        to: reward.ownerAddress,
        value: BigInt(reward.amount),
      });

      logger.info(`Sent airdrop tx: ${tx.hash} to ${reward.ownerAddress}`);

      // 等待交易确认
      await tx.wait(1);

      // 更新状态为完成
      await prisma.badgeReward.update({
        where: { id: rewardId },
        data: {
          status: 'COMPLETED',
          txHash: tx.hash,
          claimedAt: new Date(),
        },
      });

      logger.info(`Airdrop completed: ${tx.hash}`);
      return { txHash: tx.hash };
    } catch (error: any) {
      // 更新状态为失败
      await prisma.badgeReward.update({
        where: { id: rewardId },
        data: {
          status: 'FAILED',
          failReason: error.message || 'Unknown error',
        },
      });

      logger.error(`Airdrop failed for reward ${rewardId}:`, error);
      throw error;
    }
  }

  /**
   * 批量领取所有待领取奖励
   */
  async claimAllRewards(ownerAddress: string): Promise<{
    successCount: number;
    failCount: number;
    txHashes: string[];
  }> {
    const pendingRewards = await this.getPendingRewards(ownerAddress);

    let successCount = 0;
    let failCount = 0;
    const txHashes: string[] = [];

    for (const reward of pendingRewards) {
      try {
        const result = await this.claimReward(reward.id);
        txHashes.push(result.txHash);
        successCount++;
      } catch (error) {
        failCount++;
        logger.error(`Failed to claim reward ${reward.id}:`, error);
      }
    }

    return { successCount, failCount, txHashes };
  }

  /**
   * 重试失败的发放
   */
  async retryFailedReward(rewardId: string): Promise<{ txHash: string }> {
    // 将状态重置为待领取
    await prisma.badgeReward.update({
      where: { id: rewardId },
      data: {
        status: 'PENDING',
        failReason: null,
      },
    });

    return this.claimReward(rewardId);
  }

  /**
   * 获取发放统计
   */
  async getStats() {
    const [pending, processing, completed, failed, totalAmount] = await Promise.all([
      prisma.badgeReward.count({ where: { status: 'PENDING' } }),
      prisma.badgeReward.count({ where: { status: 'PROCESSING' } }),
      prisma.badgeReward.count({ where: { status: 'COMPLETED' } }),
      prisma.badgeReward.count({ where: { status: 'FAILED' } }),
      prisma.badgeReward.findMany({
        where: { status: 'COMPLETED' },
        select: { amount: true },
      }),
    ]);

    const totalAmountWei = totalAmount.reduce(
      (sum, r) => sum + BigInt(r.amount),
      BigInt(0)
    );

    return {
      pending,
      processing,
      completed,
      failed,
      totalAmount: totalAmountWei.toString(),
      balance: await this.getBalance(),
      address: this.getAddress(),
    };
  }

  /**
   * 获取失败的发放记录
   */
  async getFailedRewards() {
    return prisma.badgeReward.findMany({
      where: { status: 'FAILED' },
      include: {
        userBadge: {
          include: {
            badge: true,
            frog: { select: { name: true, tokenId: true, ownerAddress: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}

export const airdropService = new AirdropService();
