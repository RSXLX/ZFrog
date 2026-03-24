import { HibernationStatus } from '@prisma/client';
import { prisma } from '../../database';
import * as notificationService from '../../services/notification.service';
import { logger } from '../../utils/logger';
import { lifeCommandService } from './life.command';
import { resolveHibernationStatus } from './state-calculator';
import { ritualService } from '../social/ritual.service';

const DROWSY_THRESHOLD_HOURS = 72;
const BASE_REVIVAL_COST = 100;
const BLESSING_DISCOUNT = 0.15;

export interface RevivalCostInfo {
  baseCost: number;
  discount: number;
  finalCost: number;
  blessings: number;
}

export class DormancyService {
  calculateRevivalCost(level: number, hibernatedAt: Date): number {
    const days = (Date.now() - hibernatedAt.getTime()) / (1000 * 60 * 60 * 24);
    const cost = BASE_REVIVAL_COST * level * Math.log(days + 1);
    return Math.max(0, Math.floor(cost));
  }

  async checkDormancyStatus(frogId: number): Promise<HibernationStatus | null> {
    const frog = await prisma.frog.findUnique({
      where: { id: frogId },
      select: {
        id: true,
        name: true,
        lastInteractedAt: true,
        hibernationStatus: true,
      },
    });

    if (!frog) {
      return null;
    }

    const targetStatus = resolveHibernationStatus(frog.lastInteractedAt, frog.hibernationStatus);
    if (targetStatus !== frog.hibernationStatus) {
      await lifeCommandService.syncDormancyStatus({ frogId: frog.id });
      logger.info('[DormancyService] Frog status changed', {
        frogId: frog.id,
        from: frog.hibernationStatus,
        to: targetStatus,
      });

      if (targetStatus === 'DROWSY') {
        await notificationService.sendStatusWarning(frog.id, frog.name, 'drowsy');
      } else if (targetStatus === 'SLEEPING') {
        await notificationService.sendStatusWarning(frog.id, frog.name, 'sleeping');
      }
    }

    return targetStatus;
  }

  async getRevivalCostWithDiscount(frogId: number): Promise<RevivalCostInfo> {
    const frog = await prisma.frog.findUnique({
      where: { id: frogId },
      select: {
        level: true,
        hibernatedAt: true,
        blessingsReceived: true,
      },
    });

    if (!frog || !frog.hibernatedAt) {
      return {
        baseCost: 0,
        discount: 0,
        finalCost: 0,
        blessings: 0,
      };
    }

    const baseCost = this.calculateRevivalCost(frog.level, frog.hibernatedAt);
    const discountRate = Math.min(frog.blessingsReceived * BLESSING_DISCOUNT, 0.75);
    const discount = Math.floor(baseCost * discountRate);
    const finalCost = Math.max(0, baseCost - discount);

    return {
      baseCost,
      discount,
      finalCost,
      blessings: frog.blessingsReceived,
    };
  }

  async reviveDormant(
    frogId: number,
    walletAddress?: string,
    requestId?: string
  ): Promise<{
    success: boolean;
    message: string;
    cost: number;
  }> {
    const costInfo = await this.getRevivalCostWithDiscount(frogId);
    await lifeCommandService.reviveDormant({
      frogId,
      walletAddress,
      source: 'dormancy.service',
      requestId,
    });

    return {
      success: true,
      message: '青蛙已成功唤醒',
      cost: costInfo.finalCost,
    };
  }

  async blessDormant(input: {
    targetFrogId: number;
    blesserFrogId: number;
    walletAddress: string;
    verificationId: string;
    requestId?: string;
  }): Promise<{
    success: boolean;
    message: string;
    blessingsReceived: number;
    blesserEnergy: number;
  }> {
    return ritualService.blessDormant({
      targetFrogId: input.targetFrogId,
      blesserFrogId: input.blesserFrogId,
      walletAddress: input.walletAddress,
      verificationId: input.verificationId,
      requestId: input.requestId,
      source: 'dormancy.service.bless',
    });
  }

  async batchCheckDormancy(): Promise<number> {
    const threshold = new Date(Date.now() - DROWSY_THRESHOLD_HOURS * 60 * 60 * 1000);
    const candidates = await prisma.frog.findMany({
      where: {
        lastInteractedAt: {
          lt: threshold,
        },
      },
      select: {
        id: true,
        hibernationStatus: true,
      },
    });

    let changed = 0;
    for (const frog of candidates) {
      const status = await this.checkDormancyStatus(frog.id);
      if (status && status !== frog.hibernationStatus) {
        changed += 1;
      }
    }

    return changed;
  }
}

export const dormancyService = new DormancyService();
