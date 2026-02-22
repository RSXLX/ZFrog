// backend/src/services/friend/affinity.service.ts
// V2.0 友情值系统服务

import { prisma } from '../../database';
import { logger } from '../../utils/logger';
import { notifyFriendInteraction } from '../../websocket';

// 友情等级经验阈值
const AFFINITY_LEVEL_THRESHOLDS = [0, 3, 8, 15, 25, 40, 60, 85, 120, 160];

// 友情值加成配置
const AFFINITY_BONUSES: Record<number, { xpBonus: number; rarityBonus: number }> = {
  1: { xpBonus: 0, rarityBonus: 0 },
  2: { xpBonus: 0.02, rarityBonus: 0.01 },
  3: { xpBonus: 0.05, rarityBonus: 0.02 },
  4: { xpBonus: 0.08, rarityBonus: 0.03 },
  5: { xpBonus: 0.12, rarityBonus: 0.05 },
  6: { xpBonus: 0.15, rarityBonus: 0.07 },
  7: { xpBonus: 0.20, rarityBonus: 0.10 },
  8: { xpBonus: 0.25, rarityBonus: 0.12 },
  9: { xpBonus: 0.30, rarityBonus: 0.15 },
  10: { xpBonus: 0.40, rarityBonus: 0.20 },
};

class AffinityService {
  /**
   * 增加友情值（通过结伴旅行）
   */
  async incrementAffinityByTravel(frog1Id: number, frog2Id: number): Promise<{
    friendship: any;
    leveledUp: boolean;
    newLevel: number;
  }> {
    try {
      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { requesterId: frog1Id, addresseeId: frog2Id },
            { requesterId: frog2Id, addresseeId: frog1Id },
          ],
          status: 'Accepted',
        },
      });

      if (!friendship) {
        logger.warn(`[AffinityService] No friendship found between ${frog1Id} and ${frog2Id}`);
        throw new Error('Friendship not found');
      }

      const oldLevel = friendship.affinityLevel;
      const newTravelCount = friendship.groupTravelCount + 1;
      const newLevel = this.calculateLevel(newTravelCount);
      const leveledUp = newLevel > oldLevel;

      const updated = await prisma.friendship.update({
        where: { id: friendship.id },
        data: {
          groupTravelCount: newTravelCount,
          affinityLevel: newLevel,
          lastTravelTogether: new Date(),
        },
      });

      logger.info(`[AffinityService] Friendship ${friendship.id}: travelCount=${newTravelCount}, level=${newLevel}`);

      // 如果升级，发送通知
      if (leveledUp) {
        await this.notifyLevelUp(friendship.id, frog1Id, frog2Id, newLevel);
      }

      return { friendship: updated, leveledUp, newLevel };
    } catch (error) {
      logger.error('[AffinityService] Error incrementing affinity:', error);
      throw error;
    }
  }

  /**
   * 通过投喂增加友情值
   */
  async incrementAffinityByFeed(feederId: number, receiverId: number, amount: number = 1): Promise<void> {
    try {
      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { requesterId: feederId, addresseeId: receiverId },
            { requesterId: receiverId, addresseeId: feederId },
          ],
          status: 'Accepted',
        },
      });

      if (!friendship) {
        logger.warn(`[AffinityService] No friendship for feed: ${feederId} -> ${receiverId}`);
        return;
      }

      // 投喂每 5 次增加一次结伴等效次数
      const feedBonus = Math.floor(amount / 5);
      if (feedBonus > 0) {
        const newCount = friendship.groupTravelCount + feedBonus;
        const newLevel = this.calculateLevel(newCount);

        await prisma.friendship.update({
          where: { id: friendship.id },
          data: {
            groupTravelCount: newCount,
            affinityLevel: newLevel,
          },
        });
      }
    } catch (error) {
      logger.error('[AffinityService] Error incrementing affinity by feed:', error);
    }
  }

  /**
   * 获取两只青蛙之间的友情等级
   */
  async getAffinityLevel(frog1Id: number, frog2Id: number): Promise<number> {
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: frog1Id, addresseeId: frog2Id },
          { requesterId: frog2Id, addresseeId: frog1Id },
        ],
        status: 'Accepted',
      },
    });

    return friendship?.affinityLevel || 0;
  }

  /**
   * 获取友情加成系数
   */
  getAffinityBonus(level: number): { xpBonus: number; rarityBonus: number } {
    return AFFINITY_BONUSES[Math.min(level, 10)] || AFFINITY_BONUSES[1];
  }

  /**
   * 根据结伴次数计算等级
   */
  private calculateLevel(travelCount: number): number {
    for (let level = AFFINITY_LEVEL_THRESHOLDS.length - 1; level >= 0; level--) {
      if (travelCount >= AFFINITY_LEVEL_THRESHOLDS[level]) {
        return level + 1;
      }
    }
    return 1;
  }

  /**
   * 发送友情等级提升通知
   */
  private async notifyLevelUp(friendshipId: number, frog1Id: number, frog2Id: number, newLevel: number): Promise<void> {
    try {
      // 创建互动记录
      const interaction = await prisma.friendInteraction.create({
        data: {
          friendshipId,
          actorId: frog1Id,
          type: 'Message',
          message: `友情等级提升至 Lv.${newLevel}！`,
          metadata: {
            type: 'affinity_levelup',
            newLevel,
            timestamp: new Date().toISOString(),
          },
        },
      });

      // 发送 WebSocket 通知
      notifyFriendInteraction(friendshipId, frog1Id, frog2Id, interaction);
      
      logger.info(`[AffinityService] Notified level up to ${newLevel} for friendship ${friendshipId}`);
    } catch (error) {
      logger.error('[AffinityService] Error notifying level up:', error);
    }
  }

  /**
   * 检查是否可以解锁双人纪念品
   */
  canUnlockDoubleSouvenir(level: number): boolean {
    return level >= 5; // 5级以上可以解锁双人纪念品
  }
}

export const affinityService = new AffinityService();
