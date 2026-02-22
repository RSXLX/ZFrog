// backend/src/services/travel/rescue.service.ts
// V2.0 P2 跨链救援服务

import { prisma } from '../../database';
import { TravelStage } from '@prisma/client';
import { logger } from '../../utils/logger';
import { notifyTravelProgress } from '../../websocket';

// 救援配置
const RESCUE_CONFIG = {
  strandedChance: 0.05,         // 5% 迷路概率
  friendWaitHours: 4,           // 好友响应等待时间
  friendSharePercent: 30,       // 好友救援分成
  strangerSharePercent: 20,     // 陌生人救援分成
  reputationPoints: 10,         // 每次救援获得信誉分
  highRepBonus: 1.2,            // 高信誉加成
};

export interface StrandedResult {
  isStranded: boolean;
  rescueRequest?: any;
}

export interface RescueResult {
  success: boolean;
  message: string;
  xpEarned?: number;
  reputationEarned?: number;
}

class RescueService {
  /**
   * 检查并触发迷路事件
   */
  async checkAndTriggerStranded(travelId: number): Promise<StrandedResult> {
    try {
      const travel = await prisma.travel.findUnique({
        where: { id: travelId },
        include: { frog: true, rescueRequest: true },
      });

      if (!travel || travel.rescueRequest) {
        return { isStranded: false };
      }

      // 仅跨链旅行有迷路风险
      if (!travel.isCrossChain) {
        return { isStranded: false };
      }

      // 随机触发迷路
      if (Math.random() > RESCUE_CONFIG.strandedChance) {
        return { isStranded: false };
      }

      // 触发迷路
      const rescueRequest = await prisma.rescueRequest.create({
        data: {
          travelId,
          strandedFrogId: travel.frog.id,
          chainId: travel.chainId,
          status: 'PENDING',
        },
      });

      // 更新旅行状态
      await prisma.travel.update({
        where: { id: travelId },
        data: { currentStage: TravelStage.STRANDED },
      });

      logger.info(`[Rescue] Frog ${travel.frog.tokenId} stranded on chain ${travel.chainId}!`);

      // 通知青蛙主人 (TODO: 扩展 notifyTravelProgress 支持 stranded 阶段)
      logger.info(`[Rescue] Notification: 😱 青蛙在目标链上迷路了！需要好友救援！`);

      return { isStranded: true, rescueRequest };
    } catch (error) {
      logger.error('[RescueService] Error checking stranded:', error);
      return { isStranded: false };
    }
  }

  /**
   * 执行救援
   */
  async performRescue(rescueRequestId: number, rescuerId: number): Promise<RescueResult> {
    try {
      const request = await prisma.rescueRequest.findUnique({
        where: { id: rescueRequestId },
        include: {
          travel: { include: { frog: true } },
          strandedFrog: true,
        },
      });

      if (!request) {
        return { success: false, message: '救援请求不存在' };
      }

      if (request.status === 'RESCUED') {
        return { success: false, message: '已被救援' };
      }

      // 检查救援者身份
      const isFriend = await this.checkIsFriend(rescuerId, request.strandedFrogId);
      const rescuerType = isFriend ? 'friend' : 'stranger';

      // 如果是陌生人且不是公开状态，拒绝
      if (!isFriend && request.status !== 'PUBLIC') {
        return { success: false, message: '只有好友可以在当前阶段救援' };
      }

      // 计算收益分成
      const sharePercent = isFriend 
        ? RESCUE_CONFIG.friendSharePercent 
        : RESCUE_CONFIG.strangerSharePercent;

      const originalXp = 50; // 基础迷路损失 XP
      const rescuerXp = Math.floor(originalXp * (sharePercent / 100));
      const reputationEarned = RESCUE_CONFIG.reputationPoints;

      // 更新救援请求
      await prisma.rescueRequest.update({
        where: { id: rescueRequestId },
        data: {
          status: 'RESCUED',
          rescuerId,
          rescuerType,
          rescuedAt: new Date(),
          originalEarnings: originalXp,
          rescuerShare: rescuerXp,
          rescuerReputation: reputationEarned,
        },
      });

      // 更新旅行状态为 RETURNING
      await prisma.travel.update({
        where: { id: request.travelId },
        data: { currentStage: TravelStage.RETURNING },
      });

      // 给救援者增加 XP
      await prisma.frog.update({
        where: { id: rescuerId },
        data: { xp: { increment: rescuerXp } },
      });

      logger.info(`[Rescue] Frog ${rescuerId} rescued ${request.strandedFrogId} (type: ${rescuerType}, xp: ${rescuerXp})`);

      // 通知被救者 (TODO: 扩展 notifyTravelProgress 支持 rescued 阶段)
      logger.info(`[Rescue] Notification: 🎉 Frog ${request.strandedFrog.tokenId} 被${isFriend ? '好友' : '热心蛙'}救援成功！`);

      return {
        success: true,
        message: isFriend ? '好友救援成功！' : '公共救援成功！',
        xpEarned: rescuerXp,
        reputationEarned,
      };
    } catch (error) {
      logger.error('[RescueService] Error performing rescue:', error);
      return { success: false, message: '救援失败' };
    }
  }

  /**
   * 将请求转为公共救援
   */
  async makePublic(rescueRequestId: number): Promise<boolean> {
    try {
      await prisma.rescueRequest.update({
        where: { id: rescueRequestId },
        data: {
          status: 'PUBLIC',
          publicAt: new Date(),
        },
      });
      return true;
    } catch (error) {
      logger.error('[RescueService] Error making public:', error);
      return false;
    }
  }

  /**
   * 获取公共救援请求列表
   */
  async getPublicRequests(limit: number = 20) {
    return prisma.rescueRequest.findMany({
      where: { status: 'PUBLIC' },
      include: {
        strandedFrog: { select: { id: true, name: true, tokenId: true } },
        travel: { select: { id: true, chainId: true } },
      },
      orderBy: { publicAt: 'asc' },
      take: limit,
    });
  }

  /**
   * 获取待救援的好友请求
   */
  async getFriendRequests(frogId: number) {
    // 获取好友列表
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ requesterId: frogId }, { addresseeId: frogId }],
        status: 'Accepted',
      },
    });

    const friendIds = friendships.map((f) =>
      f.requesterId === frogId ? f.addresseeId : f.requesterId
    );

    return prisma.rescueRequest.findMany({
      where: {
        strandedFrogId: { in: friendIds },
        status: 'PENDING',
      },
      include: {
        strandedFrog: { select: { id: true, name: true, tokenId: true } },
        travel: { select: { id: true, chainId: true } },
      },
      orderBy: { requestedAt: 'asc' },
    });
  }

  /**
   * 检查是否为好友
   */
  private async checkIsFriend(frog1Id: number, frog2Id: number): Promise<boolean> {
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: frog1Id, addresseeId: frog2Id },
          { requesterId: frog2Id, addresseeId: frog1Id },
        ],
        status: 'Accepted',
      },
    });
    return !!friendship;
  }

  /**
   * 定时检查过期的救援请求
   */
  async checkExpiredRequests(): Promise<void> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - RESCUE_CONFIG.friendWaitHours);

    // 将超时的 PENDING 请求转为 PUBLIC
    const expired = await prisma.rescueRequest.findMany({
      where: {
        status: 'PENDING',
        requestedAt: { lt: cutoffTime },
      },
    });

    for (const request of expired) {
      await this.makePublic(request.id);
      logger.info(`[Rescue] Request ${request.id} moved to PUBLIC after ${RESCUE_CONFIG.friendWaitHours} hours`);
    }
  }
}

export const rescueService = new RescueService();
