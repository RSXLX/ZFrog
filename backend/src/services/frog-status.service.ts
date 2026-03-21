/**
 * 🐸 Frog Status Service (compatibility wrapper)
 *
 * 旧能力保留导出，但状态读写统一委托到 life 模块。
 */

import { Frog } from '@prisma/client';
import { prisma } from '../database';
import { lifeCommandService } from '../modules/life/life.command';
import { lifeQueryService } from '../modules/life/life.query';

const SICK_THRESHOLD = 15;
const SICK_DURATION_MS = 2 * 60 * 60 * 1000;

const WARNING_LINES = {
  hunger: 30,
  happiness: 30,
  cleanliness: 40,
  health: 40,
  energy: 20,
};

const DANGER_LINES = {
  hunger: 10,
  happiness: 10,
  cleanliness: 20,
  health: 15,
  energy: 5,
};

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

const buildWarnings = (state: {
  hunger: number;
  happiness: number;
  cleanliness: number;
  health: number;
  energy: number;
}): { warnings: string[]; dangers: string[] } => {
  const warnings: string[] = [];
  const dangers: string[] = [];

  const check = (name: keyof typeof WARNING_LINES, value: number) => {
    if (value <= DANGER_LINES[name]) {
      dangers.push(name);
    } else if (value <= WARNING_LINES[name]) {
      warnings.push(name);
    }
  };

  check('hunger', state.hunger);
  check('happiness', state.happiness);
  check('cleanliness', state.cleanliness);
  check('health', state.health);
  check('energy', state.energy);

  return { warnings, dangers };
};

export async function calculateFrogStatus(frogId: number): Promise<FrogStatusResult> {
  const life = await lifeQueryService.getLifeByFrogId(frogId);
  const { warnings, dangers } = buildWarnings(life);

  return {
    hunger: life.hunger,
    happiness: life.happiness,
    cleanliness: life.cleanliness,
    health: life.health,
    energy: life.energy,
    isSick: life.isSick,
    needsClean: life.needsClean,
    warnings,
    dangers,
    lastStatusUpdate: new Date(life.lastStateSyncAt),
  };
}

export async function syncFrogStatus(frogId: number): Promise<Frog> {
  await lifeCommandService.syncLifeState({ frogId });
  const frog = await prisma.frog.findUnique({ where: { id: frogId } });
  if (!frog) {
    throw new Error('Frog not found');
  }
  return frog;
}

export async function feedFrog(
  frogId: number,
  foodType: 'BREAD' | 'BUG_BENTO' | 'CAKE'
): Promise<{ hunger: number; energy: number; happiness: number }> {
  const result = await lifeCommandService.feed({
    frogId,
    foodType,
    quantity: 1,
    source: 'frog-status.service.feed',
  });
  return {
    hunger: result.hunger,
    energy: result.energy,
    happiness: result.happiness,
  };
}

export async function cleanFrog(frogId: number): Promise<{ cleanliness: number }> {
  const result = await lifeCommandService.clean({
    frogId,
    source: 'frog-status.service.clean',
  });
  return {
    cleanliness: result.cleanliness,
  };
}

export async function healFrog(frogId: number): Promise<{ health: number; isSick: boolean }> {
  const result = await lifeCommandService.heal({
    frogId,
    source: 'frog-status.service.heal',
  });
  return {
    health: result.health,
    isSick: result.isSick,
  };
}

export async function playWithFrog(frogId: number, happinessGain: number): Promise<{ happiness: number }> {
  const result = await lifeCommandService.play({
    frogId,
    gameType: 'play',
    happinessGainOverride: happinessGain,
    source: 'frog-status.service.play',
  });
  return {
    happiness: result.happiness,
  };
}

export async function triggerExcretionEvent(frogId: number): Promise<void> {
  const decay = Math.floor(Math.random() * 11) + 15;
  await lifeCommandService.applyDelta({
    frogId,
    cleanlinessDelta: -decay,
    setNeedsClean: true,
    source: 'frog-status.service.excretion',
  });
}

export async function checkAndUpdateSickStatus(frogId: number): Promise<boolean> {
  const status = await calculateFrogStatus(frogId);
  const frog = await prisma.frog.findUnique({
    where: { id: frogId },
    select: { sickSince: true, isSick: true },
  });
  if (!frog) {
    return false;
  }

  if (status.health < SICK_THRESHOLD) {
    if (!frog.sickSince) {
      await lifeCommandService.applyDelta({
        frogId,
        sickSince: new Date(),
        source: 'frog-status.service.sick_since_start',
      });
      return false;
    }

    const sickDuration = Date.now() - frog.sickSince.getTime();
    if (sickDuration >= SICK_DURATION_MS && !frog.isSick) {
      await lifeCommandService.applyDelta({
        frogId,
        setIsSick: true,
        sickSince: frog.sickSince,
        source: 'frog-status.service.sick_mark',
      });
      return true;
    }
    return false;
  }

  if (frog.sickSince || frog.isSick) {
    await lifeCommandService.applyDelta({
      frogId,
      setIsSick: false,
      sickSince: null,
      source: 'frog-status.service.sick_reset',
    });
  }

  return false;
}

export async function checkTravelPrerequisites(frogId: number): Promise<{
  canTravel: boolean;
  reasons: string[];
}> {
  const status = await calculateFrogStatus(frogId);
  const reasons: string[] = [];

  if (status.hunger < 50) reasons.push('青蛙太饿了，先喂点东西吧！');
  if (status.health < 30) reasons.push('青蛙身体不适，不宜远行');
  if (status.energy < 40) reasons.push('青蛙太累了，让它休息一下');
  if (status.isSick) reasons.push('青蛙生病了，需要先治疗');

  return {
    canTravel: reasons.length === 0,
    reasons,
  };
}

export async function settleTravelReturn(frogId: number): Promise<void> {
  await lifeCommandService.syncLifeState({ frogId });
  await lifeCommandService.applyDelta({
    frogId,
    hungerDelta: -30,
    energyDelta: -40,
    happinessDelta: 20,
    touchCare: true,
    source: 'frog-status.service.travel_return',
  });
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
