// backend/src/services/travel/travel-feed.service.ts
// V2.0 投喂服务

import { prisma } from '../../database';
import { logger } from '../../utils/logger';
import { affinityService } from '../friend/affinity.service';
import { snackPreferenceService } from './snack-preference.service';
import { CHAIN_ID_TO_KEY } from '../../config/chains';

// 投喂配置
const FEED_CONFIG = {
  energy: { pointsCost: 10, timeReductionPercent: 10, preferredBonus: 5 },
  worm: { pointsCost: 15, timeReductionPercent: 12, preferredBonus: 8 },
  candy: { pointsCost: 15, timeReductionPercent: 12, preferredBonus: 8 },
  seed: { pointsCost: 15, timeReductionPercent: 12, preferredBonus: 8 },
  berry: { pointsCost: 15, timeReductionPercent: 12, preferredBonus: 8 },
  boost: { pointsCost: 25, timeReductionPercent: 20, preferredBonus: 10 },
};

// 每次旅行每用户最多投喂次数
const MAX_FEEDS_PER_TRAVEL = 3;
// 最小保留时间（秒）
const MIN_REMAINING_TIME = 60;

export interface FeedResult {
  success: boolean;
  timeReduced: number;
  newEndTime: Date;
  message: string;
  feedRecord?: any;
  triggeredLuckyBuff?: boolean;
}

class TravelFeedService {
  /**
   * 执行投喂
   */
  async feedTravel(
    travelId: number,
    feederId: number,
    feedType: string = 'energy'
  ): Promise<FeedResult> {
    try {
      // 1. 验证投喂条件
      const validation = await this.validateFeed(travelId, feederId, feedType);
      if (!validation.valid) {
        return { success: false, timeReduced: 0, newEndTime: new Date(), message: validation.reason! };
      }

      const { travel, feederFrog, isPreferred } = validation;
      const config = FEED_CONFIG[feedType as keyof typeof FEED_CONFIG] || FEED_CONFIG.energy;

      // 2. 计算减少时间
      const remainingMs = travel.endTime.getTime() - Date.now();
      const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
      
      let reductionPercent = config.timeReductionPercent;
      if (isPreferred) {
        reductionPercent += config.preferredBonus;
      }

      let timeReduced = Math.floor(remainingSeconds * (reductionPercent / 100));
      
      // 确保不会减少到低于最小保留时间
      const newRemainingSeconds = remainingSeconds - timeReduced;
      if (newRemainingSeconds < MIN_REMAINING_TIME) {
        timeReduced = Math.max(0, remainingSeconds - MIN_REMAINING_TIME);
      }

      const newEndTime = new Date(travel.endTime.getTime() - timeReduced * 1000);

      // 3. 更新旅行结束时间
      await prisma.travel.update({
        where: { id: travelId },
        data: { endTime: newEndTime },
      });

      // 4. 创建投喂记录
      const feedRecord = await prisma.travelFeed.create({
        data: {
          travelId,
          feederId,
          feedType,
          isPreferred,
          pointsCost: config.pointsCost,
          timeReduced,
        },
      });

      // 5. 增加友情值
      await affinityService.incrementAffinityByFeed(feederId, travel.frogId, 1);

      // 6. 🆕 P1: 如果投喂偏好零食，激活幸运 Buff
      let triggeredLuckyBuff = false;
      if (isPreferred) {
        await snackPreferenceService.activateLuckyBuff(travel.frogId);
        triggeredLuckyBuff = true;
        logger.info(`[TravelFeed] Lucky Buff triggered for frog ${travel.frogId}!`);
      }

      logger.info(`[TravelFeed] Frog ${feederId} fed travel ${travelId}: reduced ${timeReduced}s, preferred=${isPreferred}`);

      return {
        success: true,
        timeReduced,
        newEndTime,
        message: isPreferred ? '🍀 投喂了偏好零食！获得幸运爆发 Buff！' : '投喂成功！',
        feedRecord,
        triggeredLuckyBuff,
      };
    } catch (error) {
      logger.error('[TravelFeedService] Error feeding travel:', error);
      return { success: false, timeReduced: 0, newEndTime: new Date(), message: '投喂失败' };
    }
  }

  /**
   * 验证投喂条件
   */
  async validateFeed(travelId: number, feederId: number, feedType?: string): Promise<{
    valid: boolean;
    reason?: string;
    travel?: any;
    feederFrog?: any;
    isPreferred?: boolean;
  }> {
    // 1. 获取旅行信息
    const travel = await prisma.travel.findUnique({
      where: { id: travelId },
      include: { frog: true },
    });

    if (!travel) {
      return { valid: false, reason: '旅行不存在' };
    }

    if (travel.status !== 'Active') {
      return { valid: false, reason: '旅行已结束或已取消' };
    }

    if (travel.endTime <= new Date()) {
      return { valid: false, reason: '旅行已到达终点' };
    }

    // 2. 获取投喂者信息
    const feederFrog = await prisma.frog.findUnique({
      where: { id: feederId },
    });

    if (!feederFrog) {
      return { valid: false, reason: '投喂者青蛙不存在' };
    }

    // 3. 检查是否为好友
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: feederId, addresseeId: travel.frog.id },
          { requesterId: travel.frog.id, addresseeId: feederId },
        ],
        status: 'Accepted',
      },
    });

    if (!friendship) {
      return { valid: false, reason: '只有好友才能投喂' };
    }

    // 4. 检查投喂次数限制
    const feedCount = await prisma.travelFeed.count({
      where: { travelId, feederId },
    });

    if (feedCount >= MAX_FEEDS_PER_TRAVEL) {
      return { valid: false, reason: `每次旅行最多投喂 ${MAX_FEEDS_PER_TRAVEL} 次` };
    }

    // 5. 🆕 P1: 检查是否为偏好零食
    let isPreferred = false;
    if (feedType) {
      const chainKey = CHAIN_ID_TO_KEY[travel.chainId || 7001] || 'ZETACHAIN_ATHENS';
      isPreferred = await snackPreferenceService.checkIsPreferred(travel.frog.id, feedType, chainKey);
    }

    return { valid: true, travel, feederFrog, isPreferred };
  }

  /**
   * 获取旅行的投喂记录
   */
  async getFeedHistory(travelId: number) {
    return prisma.travelFeed.findMany({
      where: { travelId },
      include: {
        feeder: {
          select: { id: true, name: true, tokenId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const travelFeedService = new TravelFeedService();
