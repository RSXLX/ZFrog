/**
 * 🐸 宠物蛋系统 - 青蛙状态服务
 * 负责状态计算、衰减、恢复逻辑
 */

import { prisma } from '../database';
import { Frog } from '@prisma/client';

// 状态衰减配置
const STATUS_CONFIG = {
  hunger: {
    decayRate: 5,       // 每小时衰减 5 点
    warningLine: 30,
    dangerLine: 10,
    initialValue: 80,
  },
  happiness: {
    decayRate: 3,       // 每小时衰减 3 点
    warningLine: 30,
    dangerLine: 10,
    initialValue: 70,
  },
  cleanliness: {
    decayRate: 0,       // 不自动衰减，由排泄事件触发
    warningLine: 40,
    dangerLine: 20,
    initialValue: 100,
  },
  health: {
    decayRate: 8,       // 条件触发时每小时衰减 8 点
    warningLine: 40,
    dangerLine: 15,
    initialValue: 100,
  },
  energy: {
    decayRate: 2,       // 每小时衰减 2 点
    warningLine: 20,
    dangerLine: 5,
    initialValue: 100,
  },
};

// 旅行期间衰减倍率（减少惩罚）
const TRAVEL_DECAY_MULTIPLIER = 0.5;

// 生病判定：健康度低于此值持续 2 小时
const SICK_THRESHOLD = 15;
const SICK_DURATION_MS = 2 * 60 * 60 * 1000; // 2 小时

export interface FrogStatusResult {
  hunger: number;
  happiness: number;
  cleanliness: number;
  health: number;
  energy: number;
  isSick: boolean;
  needsClean: boolean;
  warnings: string[];
  dangers: string[];
  lastStatusUpdate: Date;
}

/**
 * 计算青蛙实时状态（用于前端展示）
 */
export async function calculateFrogStatus(frogId: number): Promise<FrogStatusResult> {
  const frog = await prisma.frog.findUnique({
    where: { id: frogId },
  });

  if (!frog) {
    throw new Error('Frog not found');
  }

  const now = new Date();
  const lastUpdate = frog.lastStatusUpdate;
  const hoursPassed = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

  // 判断是否在旅行中
  const isTraveling = frog.status === 'Traveling' || frog.status === 'CrossChainLocked';
  const decayMultiplier = isTraveling ? TRAVEL_DECAY_MULTIPLIER : 1;

  // 计算各项实时状态
  const hunger = clampStatus(frog.hunger - STATUS_CONFIG.hunger.decayRate * hoursPassed * decayMultiplier);
  const happiness = clampStatus(frog.happiness - STATUS_CONFIG.happiness.decayRate * hoursPassed * decayMultiplier);
  const energy = clampStatus(frog.energy - STATUS_CONFIG.energy.decayRate * hoursPassed * decayMultiplier);
  
  // 清洁度不自动衰减
  const cleanliness = frog.cleanliness;

  // 健康度条件衰减：饱食度<20 或 清洁度<30 时衰减
  let health = frog.health;
  if (hunger < 20 || cleanliness < 30) {
    health = clampStatus(frog.health - STATUS_CONFIG.health.decayRate * hoursPassed * decayMultiplier);
  }

  // 收集警告和危险
  const warnings: string[] = [];
  const dangers: string[] = [];

  checkStatusLevel('hunger', hunger, warnings, dangers);
  checkStatusLevel('happiness', happiness, warnings, dangers);
  checkStatusLevel('cleanliness', cleanliness, warnings, dangers);
  checkStatusLevel('health', health, warnings, dangers);
  checkStatusLevel('energy', energy, warnings, dangers);

  return {
    hunger: Math.round(hunger),
    happiness: Math.round(happiness),
    cleanliness: Math.round(cleanliness),
    health: Math.round(health),
    energy: Math.round(energy),
    isSick: frog.isSick,
    needsClean: frog.needsClean,
    warnings,
    dangers,
    lastStatusUpdate: lastUpdate,
  };
}

/**
 * 同步青蛙状态到数据库（用于操作后更新）
 */
export async function syncFrogStatus(frogId: number): Promise<Frog> {
  const status = await calculateFrogStatus(frogId);
  
  return prisma.frog.update({
    where: { id: frogId },
    data: {
      hunger: status.hunger,
      happiness: status.happiness,
      cleanliness: status.cleanliness,
      health: status.health,
      energy: status.energy,
      lastStatusUpdate: new Date(),
    },
  });
}

/**
 * 喂食操作
 */
export async function feedFrog(
  frogId: number,
  foodType: 'BREAD' | 'BUG_BENTO' | 'CAKE'
): Promise<{ hunger: number; energy: number; happiness: number }> {
  // 先同步当前状态
  await syncFrogStatus(frogId);

  const effects = getFoodEffects(foodType);
  
  const frog = await prisma.frog.update({
    where: { id: frogId },
    data: {
      hunger: { increment: effects.hunger },
      energy: { increment: effects.energy },
      happiness: { increment: effects.happiness },
      lastFedAt: new Date(),
      lastStatusUpdate: new Date(),
    },
  });

  // 确保不超过 100
  const finalFrog = await prisma.frog.update({
    where: { id: frogId },
    data: {
      hunger: Math.min(frog.hunger, 100),
      energy: Math.min(frog.energy, 100),
      happiness: Math.min(frog.happiness, 100),
    },
  });

  return {
    hunger: finalFrog.hunger,
    energy: finalFrog.energy,
    happiness: finalFrog.happiness,
  };
}

/**
 * 清洁操作
 */
export async function cleanFrog(frogId: number): Promise<{ cleanliness: number }> {
  const frog = await prisma.frog.update({
    where: { id: frogId },
    data: {
      cleanliness: 100,
      needsClean: false,
      lastStatusUpdate: new Date(),
    },
  });

  return { cleanliness: frog.cleanliness };
}

/**
 * 治疗操作
 */
export async function healFrog(frogId: number): Promise<{ health: number; isSick: boolean }> {
  const frog = await prisma.frog.update({
    where: { id: frogId },
    data: {
      health: { increment: 50 },
      isSick: false,
      sickSince: null,
      lastStatusUpdate: new Date(),
    },
  });

  const finalFrog = await prisma.frog.update({
    where: { id: frogId },
    data: {
      health: Math.min(frog.health, 100),
    },
  });

  return { health: finalFrog.health, isSick: false };
}

/**
 * 玩耍操作（增加幸福度）
 */
export async function playWithFrog(frogId: number, happinessGain: number): Promise<{ happiness: number }> {
  await syncFrogStatus(frogId);

  const frog = await prisma.frog.update({
    where: { id: frogId },
    data: {
      happiness: { increment: happinessGain },
      lastInteractedAt: new Date(),
      lastStatusUpdate: new Date(),
    },
  });

  const finalFrog = await prisma.frog.update({
    where: { id: frogId },
    data: {
      happiness: Math.min(frog.happiness, 100),
    },
  });

  return { happiness: finalFrog.happiness };
}

/**
 * 触发排泄事件（后端定时任务调用）
 */
export async function triggerExcretionEvent(frogId: number): Promise<void> {
  const decay = Math.floor(Math.random() * 11) + 15; // 15-25
  
  const frog = await prisma.frog.findUnique({ where: { id: frogId } });
  if (!frog) return;

  await prisma.frog.update({
    where: { id: frogId },
    data: {
      cleanliness: Math.max(0, frog.cleanliness - decay),
      needsClean: true,
    },
  });
}

/**
 * 检测并更新生病状态（后端定时任务调用）
 */
export async function checkAndUpdateSickStatus(frogId: number): Promise<boolean> {
  const status = await calculateFrogStatus(frogId);
  const frog = await prisma.frog.findUnique({ where: { id: frogId } });
  
  if (!frog) return false;

  // 如果健康度低于阈值
  if (status.health < SICK_THRESHOLD) {
    if (!frog.sickSince) {
      // 开始记录低健康时间
      await prisma.frog.update({
        where: { id: frogId },
        data: { sickSince: new Date() },
      });
    } else {
      // 检查是否已持续足够时间
      const sickDuration = Date.now() - frog.sickSince.getTime();
      if (sickDuration >= SICK_DURATION_MS && !frog.isSick) {
        await prisma.frog.update({
          where: { id: frogId },
          data: { isSick: true },
        });
        return true; // 新生病
      }
    }
  } else {
    // 健康度恢复，重置记录
    if (frog.sickSince) {
      await prisma.frog.update({
        where: { id: frogId },
        data: { sickSince: null },
      });
    }
  }

  return false;
}

/**
 * 检查旅行前置条件
 */
export async function checkTravelPrerequisites(frogId: number): Promise<{
  canTravel: boolean;
  reasons: string[];
}> {
  const status = await calculateFrogStatus(frogId);
  const reasons: string[] = [];

  if (status.hunger < 50) {
    reasons.push('青蛙太饿了，先喂点东西吧！');
  }
  if (status.health < 30) {
    reasons.push('青蛙身体不适，不宜远行');
  }
  if (status.energy < 40) {
    reasons.push('青蛙太累了，让它休息一下');
  }
  if (status.isSick) {
    reasons.push('青蛙生病了，需要先治疗');
  }

  return {
    canTravel: reasons.length === 0,
    reasons,
  };
}

/**
 * 旅行归来后的状态结算
 */
export async function settleTravelReturn(frogId: number): Promise<void> {
  await syncFrogStatus(frogId);

  const frog = await prisma.frog.findUnique({ where: { id: frogId } });
  if (!frog) return;

  await prisma.frog.update({
    where: { id: frogId },
    data: {
      hunger: Math.max(0, frog.hunger - 30),
      energy: Math.max(0, frog.energy - 40),
      happiness: Math.min(100, frog.happiness + 20),
      lastStatusUpdate: new Date(),
    },
  });
}

// ============ 辅助函数 ============

function clampStatus(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function checkStatusLevel(
  name: string,
  value: number,
  warnings: string[],
  dangers: string[]
): void {
  const config = STATUS_CONFIG[name as keyof typeof STATUS_CONFIG];
  if (value <= config.dangerLine) {
    dangers.push(name);
  } else if (value <= config.warningLine) {
    warnings.push(name);
  }
}

function getFoodEffects(foodType: string): { hunger: number; energy: number; happiness: number } {
  switch (foodType) {
    case 'BREAD':
      return { hunger: 15, energy: 0, happiness: 0 };
    case 'BUG_BENTO':
      return { hunger: 25, energy: 5, happiness: 0 };
    case 'CAKE':
      return { hunger: 0, energy: 0, happiness: 20 };
    default:
      return { hunger: 10, energy: 0, happiness: 0 };
  }
}

export default {
  calculateFrogStatus,
  syncFrogStatus,
  feedFrog,
  cleanFrog,
  healFrog,
  playWithFrog,
  triggerExcretionEvent,
  checkAndUpdateSickStatus,
  checkTravelPrerequisites,
  settleTravelReturn,
};
