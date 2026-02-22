/**
 * 🐸 宠物蛋系统 - 旅行状态结算服务
 * 功能:
 * 1. 旅行出发前检查状态条件
 * 2. 旅行过程中暂停状态衰减
 * 3. 旅行归来后结算状态和奖励
 */

import { prisma } from '../database';
import { getTravelRewardMultiplier } from './evolution.service';
import lilyService from './lily.service';

// 旅行状态要求
export const TRAVEL_REQUIREMENTS = {
  hunger: 30,        // 最低饥饿度
  happiness: 20,     // 最低快乐度
  health: 40,        // 最低健康度
  energy: 20,        // 最低活力值
  cleanliness: 30,   // 最低清洁度
};

// 旅行归来奖励配置
export const TRAVEL_REWARDS = {
  baseReward: 50,         // 基础 $LILY 奖励
  perHourBonus: 10,       // 每小时额外 $LILY
  happinessGain: 15,      // 快乐度增加
  energyCost: 20,         // 活力值消耗
  hungerCost: 15,         // 饥饿度消耗
};

/**
 * 检查旅行前置条件
 */
export async function checkTravelRequirements(frogId: number): Promise<{
  canTravel: boolean;
  failedRequirements: string[];
  warnings: string[];
  currentStatus: {
    hunger: number;
    happiness: number;
    health: number;
    energy: number;
    cleanliness: number;
  } | null;
}> {
  const frog = await prisma.frog.findUnique({
    where: { id: frogId },
  });

  if (!frog) {
    return {
      canTravel: false,
      failedRequirements: ['青蛙不存在'],
      warnings: [],
      currentStatus: null,
    };
  }

  // 生病的青蛙不能旅行
  if (frog.isSick) {
    return {
      canTravel: false,
      failedRequirements: ['青蛙生病了，需要先治疗'],
      warnings: [],
      currentStatus: {
        hunger: frog.hunger,
        happiness: frog.happiness,
        health: frog.health ?? 100,
        energy: frog.energy ?? 100,
        cleanliness: frog.cleanliness ?? 100,
      },
    };
  }

  // 需要清洁的青蛙不能旅行
  if (frog.needsClean) {
    return {
      canTravel: false,
      failedRequirements: ['青蛙需要先清洁'],
      warnings: [],
      currentStatus: {
        hunger: frog.hunger,
        happiness: frog.happiness,
        health: frog.health ?? 100,
        energy: frog.energy ?? 100,
        cleanliness: frog.cleanliness ?? 100,
      },
    };
  }

  const failedRequirements: string[] = [];
  const warnings: string[] = [];

  // 检查各项状态
  if (frog.hunger < TRAVEL_REQUIREMENTS.hunger) {
    failedRequirements.push(`饥饿度不足 (${frog.hunger}/${TRAVEL_REQUIREMENTS.hunger})`);
  } else if (frog.hunger < TRAVEL_REQUIREMENTS.hunger + 15) {
    warnings.push('饥饿度较低，建议先喂食');
  }

  if (frog.happiness < TRAVEL_REQUIREMENTS.happiness) {
    failedRequirements.push(`快乐度不足 (${frog.happiness}/${TRAVEL_REQUIREMENTS.happiness})`);
  }

  const health = frog.health ?? 100;
  if (health < TRAVEL_REQUIREMENTS.health) {
    failedRequirements.push(`健康度不足 (${health}/${TRAVEL_REQUIREMENTS.health})`);
  } else if (health < TRAVEL_REQUIREMENTS.health + 20) {
    warnings.push('健康度较低，旅途可能有风险');
  }

  const energy = frog.energy ?? 100;
  if (energy < TRAVEL_REQUIREMENTS.energy) {
    failedRequirements.push(`活力值不足 (${energy}/${TRAVEL_REQUIREMENTS.energy})`);
  }

  const cleanliness = frog.cleanliness ?? 100;
  if (cleanliness < TRAVEL_REQUIREMENTS.cleanliness) {
    failedRequirements.push(`清洁度不足 (${cleanliness}/${TRAVEL_REQUIREMENTS.cleanliness})`);
  }

  return {
    canTravel: failedRequirements.length === 0,
    failedRequirements,
    warnings,
    currentStatus: {
      hunger: frog.hunger,
      happiness: frog.happiness,
      health,
      energy,
      cleanliness,
    },
  };
}

/**
 * 旅行出发时暂停状态衰减
 * 记录出发时的状态快照
 */
export async function onTravelStart(frogId: number): Promise<void> {
  await prisma.frog.update({
    where: { id: frogId },
    data: {
      // 记录出发时间作为状态基准
      lastStatusUpdate: new Date(),
    },
  });
  
  console.log(`[TravelStatus] 青蛙 ${frogId} 出发，状态计时暂停`);
}

/**
 * 旅行归来结算
 * 计算奖励并更新状态
 */
export async function onTravelComplete(
  frogId: number,
  travelDurationHours: number,
  ownerAddress: string
): Promise<{
  lilyReward: number;
  statusChanges: {
    happiness: { before: number; after: number };
    energy: { before: number; after: number };
    hunger: { before: number; after: number };
  };
}> {
  const frog = await prisma.frog.findUnique({
    where: { id: frogId },
  });

  if (!frog) {
    throw new Error('青蛙不存在');
  }

  // 计算奖励
  const evolutionMultiplier = getTravelRewardMultiplier(frog.evolutionType);
  const baseReward = TRAVEL_REWARDS.baseReward + Math.floor(travelDurationHours * TRAVEL_REWARDS.perHourBonus);
  const lilyReward = Math.round(baseReward * evolutionMultiplier);

  // 计算状态变化
  const happinessBefore = frog.happiness;
  const happinessAfter = Math.min(100, happinessBefore + TRAVEL_REWARDS.happinessGain);

  const energyBefore = frog.energy ?? 100;
  const energyAfter = Math.max(0, energyBefore - TRAVEL_REWARDS.energyCost);

  const hungerBefore = frog.hunger;
  const hungerAfter = Math.max(0, hungerBefore - TRAVEL_REWARDS.hungerCost);

  // 更新青蛙状态
  await prisma.frog.update({
    where: { id: frogId },
    data: {
      happiness: happinessAfter,
      energy: energyAfter,
      hunger: hungerAfter,
      lastStatusUpdate: new Date(),
    },
  });

  // 发放 $LILY 奖励
  try {
    await lilyService.earn(ownerAddress, lilyReward, 'TRAVEL_REWARD', `旅行归来奖励 (${travelDurationHours}小时)`);
  } catch (error) {
    console.error('[TravelStatus] $LILY 奖励发放失败:', error);
  }

  console.log(`[TravelStatus] 青蛙 ${frogId} 旅行归来，获得 ${lilyReward} $LILY`);

  return {
    lilyReward,
    statusChanges: {
      happiness: { before: happinessBefore, after: happinessAfter },
      energy: { before: energyBefore, after: energyAfter },
      hunger: { before: hungerBefore, after: hungerAfter },
    },
  };
}

export default {
  TRAVEL_REQUIREMENTS,
  TRAVEL_REWARDS,
  checkTravelRequirements,
  onTravelStart,
  onTravelComplete,
};
