// backend/src/services/travel/snack-preference.service.ts
// V2.0 P1 投喂偏好系统服务

import { prisma } from '../../database';
import { logger } from '../../utils/logger';

// 零食类型定义
const SNACK_TYPES = ['worm', 'candy', 'seed', 'berry'] as const;
type SnackType = typeof SNACK_TYPES[number];

// 链专属零食偏好（随链变化）
const CHAIN_SNACK_PREFERENCE: Record<string, SnackType> = {
  'ETH_SEPOLIA': 'candy',      // 以太链爱吃糖果
  'BSC_TESTNET': 'seed',       // BSC 爱吃种子
  'ZETACHAIN_ATHENS': 'worm',  // ZetaChain 爱吃虫子
  'POLYGON_MUMBAI': 'berry',   // Polygon 爱吃浆果
  'ARBITRUM_GOERLI': 'candy',  // Arbitrum 爱吃糖果
};

// 零食显示名称
const SNACK_NAMES: Record<SnackType, string> = {
  worm: '🐛 虫子零食',
  candy: '🍬 以太糖果',
  seed: '🌱 链上种子',
  berry: '🫐 紫晶浆果',
};

// 偏好投喂加成
const PREFERRED_BONUS = {
  timeReductionExtra: 5,    // 额外减少 5%
  pointsCostExtra: 5,       // 额外消耗 5 积分
  luckyBuffDuration: 24,    // 幸运 Buff 持续 24 小时
};

class SnackPreferenceService {
  /**
   * 获取青蛙当前的零食偏好（基于当前链或固定偏好）
   */
  async getPreference(frogId: number, currentChainKey?: string): Promise<{
    preferredSnack: SnackType;
    displayName: string;
    reason: string;
  }> {
    const frog = await prisma.frog.findUnique({
      where: { id: frogId },
      select: { snackPreference: true },
    });

    // 优先使用链专属偏好
    if (currentChainKey && CHAIN_SNACK_PREFERENCE[currentChainKey]) {
      const snack = CHAIN_SNACK_PREFERENCE[currentChainKey];
      return {
        preferredSnack: snack,
        displayName: SNACK_NAMES[snack],
        reason: `在 ${currentChainKey} 链上特别喜欢`,
      };
    }

    // 使用青蛙固定偏好
    if (frog?.snackPreference && SNACK_TYPES.includes(frog.snackPreference as SnackType)) {
      const snack = frog.snackPreference as SnackType;
      return {
        preferredSnack: snack,
        displayName: SNACK_NAMES[snack],
        reason: '天生最爱',
      };
    }

    // 默认偏好（随机分配并保存）
    const randomSnack = SNACK_TYPES[Math.floor(Math.random() * SNACK_TYPES.length)];
    await prisma.frog.update({
      where: { id: frogId },
      data: { snackPreference: randomSnack },
    });

    return {
      preferredSnack: randomSnack,
      displayName: SNACK_NAMES[randomSnack],
      reason: '刚刚发现的新口味',
    };
  }

  /**
   * 检查投喂是否匹配偏好
   */
  async checkIsPreferred(frogId: number, feedType: string, chainKey?: string): Promise<boolean> {
    const preference = await this.getPreference(frogId, chainKey);
    return feedType === preference.preferredSnack;
  }

  /**
   * 激活幸运爆发 Buff
   */
  async activateLuckyBuff(frogId: number): Promise<void> {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + PREFERRED_BONUS.luckyBuffDuration);

    await prisma.frog.update({
      where: { id: frogId },
      data: {
        luckyBuff: true,
        luckyBuffExpiry: expiry,
      },
    });

    logger.info(`[SnackPreference] Lucky Buff activated for frog ${frogId} until ${expiry}`);
  }

  /**
   * 检查幸运 Buff 是否有效
   */
  async hasActiveLuckyBuff(frogId: number): Promise<boolean> {
    const frog = await prisma.frog.findUnique({
      where: { id: frogId },
      select: { luckyBuff: true, luckyBuffExpiry: true },
    });

    if (!frog?.luckyBuff || !frog.luckyBuffExpiry) {
      return false;
    }

    if (frog.luckyBuffExpiry < new Date()) {
      // Buff 已过期，清除
      await prisma.frog.update({
        where: { id: frogId },
        data: { luckyBuff: false, luckyBuffExpiry: null },
      });
      return false;
    }

    return true;
  }

  /**
   * 获取所有可用零食类型
   */
  getAllSnackTypes(): Array<{ type: SnackType; name: string }> {
    return SNACK_TYPES.map((type) => ({
      type,
      name: SNACK_NAMES[type],
    }));
  }

  /**
   * 获取偏好加成配置
   */
  getPreferredBonus() {
    return PREFERRED_BONUS;
  }
}

export const snackPreferenceService = new SnackPreferenceService();
