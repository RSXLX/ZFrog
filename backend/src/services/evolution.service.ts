/**
 * 🐸 宠物蛋系统 - 进化系统服务
 * 模块C: 成长进化系统
 * 功能: 进化条件检测、进化执行、等级计算
 */

import { prisma } from '../database';
import { lifeCommandService } from '../modules/life/life.command';
import { lifeQueryService } from '../modules/life/life.query';

// 进化类型定义
export type EvolutionType = 'explorer' | 'scholar' | 'social';

// 进化条件配置
export const EVOLUTION_CONFIG = {
  requiredLevel: 10,
  
  // 进化类型奖励
  bonuses: {
    explorer: {
      name: '探险家',
      travelRewardBonus: 0.15, // 旅行奖励+15%
      trait: '好奇心旺盛',
      description: '热爱探索未知的冒险者，每次旅行都能发现更多宝物',
    },
    scholar: {
      name: '学者',
      aiDepthBonus: true, // AI对话更深度
      trait: '博学多才',
      description: '追求知识的智者，与AI的对话更加有深度和启发性',
    },
    social: {
      name: '社交家',
      friendLimitBonus: 10, // 好友上限+10
      trait: '人缘极佳',
      description: '广交朋友的交际达人，能结交更多的青蛙好友',
    },
  },
};

// 计算青蛙等级 (基于旅行次数和状态活跃度)
export function calculateFrogLevel(totalTravels: number, happiness: number, health: number): number {
  // 基础等级 = 旅行次数 / 3
  const baseLevel = Math.floor(totalTravels / 3);
  
  // 状态加成 (幸福度和健康度都高于60时，额外+1级)
  const statusBonus = (happiness >= 60 && health >= 60) ? 1 : 0;
  
  // 最终等级 (最低1级，最高100级)
  return Math.min(100, Math.max(1, baseLevel + 1 + statusBonus));
}

// 检查是否可以进化
export async function checkEvolutionEligibility(frogId: number): Promise<{
  canEvolve: boolean;
  currentLevel: number;
  requiredLevel: number;
  alreadyEvolved: boolean;
  currentEvolutionType: string | null;
  message: string;
}> {
  const frog = await prisma.frog.findUnique({
    where: { id: frogId },
  });

  if (!frog) {
    return {
      canEvolve: false,
      currentLevel: 0,
      requiredLevel: EVOLUTION_CONFIG.requiredLevel,
      alreadyEvolved: false,
      currentEvolutionType: null,
      message: '青蛙不存在',
    };
  }

  const life = await lifeQueryService.getLifeByFrogId(frogId);
  const currentLevel = calculateFrogLevel(frog.totalTravels, life.happiness, life.health);

  // 已经进化过
  if (frog.evolutionType) {
    return {
      canEvolve: false,
      currentLevel,
      requiredLevel: EVOLUTION_CONFIG.requiredLevel,
      alreadyEvolved: true,
      currentEvolutionType: frog.evolutionType,
      message: `已进化为${EVOLUTION_CONFIG.bonuses[frog.evolutionType as EvolutionType]?.name || frog.evolutionType}`,
    };
  }

  // 等级不足
  if (currentLevel < EVOLUTION_CONFIG.requiredLevel) {
    return {
      canEvolve: false,
      currentLevel,
      requiredLevel: EVOLUTION_CONFIG.requiredLevel,
      alreadyEvolved: false,
      currentEvolutionType: null,
      message: `需要达到 ${EVOLUTION_CONFIG.requiredLevel} 级才能进化，当前 ${currentLevel} 级`,
    };
  }

  return {
    canEvolve: true,
    currentLevel,
    requiredLevel: EVOLUTION_CONFIG.requiredLevel,
    alreadyEvolved: false,
    currentEvolutionType: null,
    message: '可以进化！',
  };
}

// 执行进化
export async function evolve(frogId: number, evolutionType: EvolutionType): Promise<{
  success: boolean;
  evolutionType: EvolutionType | null;
  bonus: typeof EVOLUTION_CONFIG.bonuses[EvolutionType] | null;
  message: string;
}> {
  // 检查进化资格
  const eligibility = await checkEvolutionEligibility(frogId);
  if (!eligibility.canEvolve) {
    return {
      success: false,
      evolutionType: null,
      bonus: null,
      message: eligibility.message,
    };
  }

  // 验证进化类型
  if (!['explorer', 'scholar', 'social'].includes(evolutionType)) {
    return {
      success: false,
      evolutionType: null,
      bonus: null,
      message: '无效的进化类型',
    };
  }

  // 执行进化
  try {
    await prisma.frog.update({
      where: { id: frogId },
      data: {
        evolutionType: evolutionType,
      },
    });
    await lifeCommandService.applyDelta({
      frogId,
      happinessDelta: 20,
      touchCare: true,
      source: 'evolution.service.evolve',
    });

    const bonus = EVOLUTION_CONFIG.bonuses[evolutionType];

    return {
      success: true,
      evolutionType,
      bonus,
      message: `恭喜！进化成功，你的青蛙成为了${bonus.name}！`,
    };
  } catch (error) {
    console.error('进化失败:', error);
    return {
      success: false,
      evolutionType: null,
      bonus: null,
      message: '进化失败，请稍后再试',
    };
  }
}

// 获取进化类型的旅行奖励倍率
export function getTravelRewardMultiplier(evolutionType: string | null): number {
  if (evolutionType === 'explorer') {
    return 1 + EVOLUTION_CONFIG.bonuses.explorer.travelRewardBonus;
  }
  return 1;
}

// 获取好友上限加成
export function getFriendLimitBonus(evolutionType: string | null): number {
  if (evolutionType === 'social') {
    return EVOLUTION_CONFIG.bonuses.social.friendLimitBonus;
  }
  return 0;
}

export default {
  calculateFrogLevel,
  checkEvolutionEligibility,
  evolve,
  getTravelRewardMultiplier,
  getFriendLimitBonus,
  EVOLUTION_CONFIG,
};
