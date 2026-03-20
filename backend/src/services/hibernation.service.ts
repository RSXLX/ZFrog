/**
 * Hibernation Service (compatibility wrapper)
 *
 * 旧调用方仍通过本文件访问冬眠能力，
 * 实际逻辑统一委托到 V1 life 模块。
 */

import { HibernationStatus } from '@prisma/client';
import { dormancyService } from '../modules/life/dormancy.service';
import { lifeCommandService } from '../modules/life/life.command';

export async function checkHibernationStatus(frogId: number): Promise<HibernationStatus | null> {
  return dormancyService.checkDormancyStatus(frogId);
}

export function calculateRevivalCost(level: number, hibernatedAt: Date): number {
  return dormancyService.calculateRevivalCost(level, hibernatedAt);
}

export async function getRevivalCostWithDiscount(frogId: number): Promise<{
  baseCost: number;
  discount: number;
  finalCost: number;
  blessings: number;
}> {
  return dormancyService.getRevivalCostWithDiscount(frogId);
}

export async function reviveFrog(frogId: number): Promise<{
  success: boolean;
  message: string;
  cost?: number;
}> {
  try {
    const result = await dormancyService.reviveDormant(frogId);
    return {
      success: true,
      message: result.message,
      cost: result.cost,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Revive failed',
    };
  }
}

export async function blessFrog(
  blesserFrogId: number,
  targetFrogId: number
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const result = await lifeCommandService.blessDormant({
      blesserFrogId,
      targetFrogId,
    });
    return {
      success: result.success,
      message: result.message,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Bless failed',
    };
  }
}

export async function batchCheckHibernation(): Promise<number> {
  return dormancyService.batchCheckDormancy();
}

export const hibernationService = {
  checkHibernationStatus,
  calculateRevivalCost,
  getRevivalCostWithDiscount,
  reviveFrog,
  blessFrog,
  batchCheckHibernation,
};
