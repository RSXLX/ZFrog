/**
 * Hibernation Service
 * 
 * Manages frog hibernation/revival mechanics:
 * - Detects inactivity and transitions to DROWSY/SLEEPING states
 * - Calculates revival costs based on sleep duration and level
 * - Handles social revival via blessings from friends
 */

import { PrismaClient, HibernationStatus } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Constants
const DROWSY_THRESHOLD_HOURS = 72;  // 72h -> DROWSY
const SLEEPING_THRESHOLD_HOURS = 96; // 96h -> SLEEPING
const BASE_REVIVAL_COST = 100;       // Base cost in $LILY
const BLESSING_DISCOUNT = 0.15;     // 15% discount per blessing

/**
 * Check and update hibernation status for a single frog
 */
export async function checkHibernationStatus(frogId: number): Promise<HibernationStatus | null> {
  const frog = await prisma.frog.findUnique({ 
    where: { id: frogId },
    select: { 
      id: true,
      lastInteractedAt: true, 
      hibernationStatus: true,
      name: true
    }
  });
  
  if (!frog || !frog.lastInteractedAt) {
    return null;
  }
  
  const hoursElapsed = (Date.now() - frog.lastInteractedAt.getTime()) / (1000 * 60 * 60);
  
  let newStatus: HibernationStatus = 'ACTIVE';
  if (hoursElapsed >= SLEEPING_THRESHOLD_HOURS) {
    newStatus = 'SLEEPING';
  } else if (hoursElapsed >= DROWSY_THRESHOLD_HOURS) {
    newStatus = 'DROWSY';
  }
  
  // Only update if status changed
  if (frog.hibernationStatus !== newStatus) {
    await prisma.frog.update({
      where: { id: frogId },
      data: { 
        hibernationStatus: newStatus,
        hibernatedAt: newStatus === 'SLEEPING' ? new Date() : null
      }
    });
    
    logger.info(`[Hibernation] Frog ${frog.name} (${frogId}) status changed: ${frog.hibernationStatus} -> ${newStatus}`);
    
    // TODO: Send notification when entering DROWSY or SLEEPING
    if (newStatus === 'DROWSY') {
      // notificationService.send(frog.id, 'DROWSY_WARNING', '你的青蛙开始困倦了，快来互动吧！');
    } else if (newStatus === 'SLEEPING') {
      // notificationService.send(frog.id, 'SLEEPING', '你的青蛙已进入冬眠...');
    }
  }
  
  return newStatus;
}

/**
 * Calculate revival cost based on level and sleep duration
 * Formula: BASE_COST * level * ln(days + 1)
 */
export function calculateRevivalCost(level: number, hibernatedAt: Date): number {
  const days = (Date.now() - hibernatedAt.getTime()) / (1000 * 60 * 60 * 24);
  const cost = BASE_REVIVAL_COST * level * Math.log(days + 1);
  return Math.floor(cost);
}

/**
 * Get final revival cost with blessing discount
 */
export async function getRevivalCostWithDiscount(frogId: number): Promise<{
  baseCost: number;
  discount: number;
  finalCost: number;
  blessings: number;
}> {
  const frog = await prisma.frog.findUnique({
    where: { id: frogId },
    select: {
      level: true,
      hibernatedAt: true,
      blessingsReceived: true
    }
  });
  
  if (!frog || !frog.hibernatedAt) {
    return { baseCost: 0, discount: 0, finalCost: 0, blessings: 0 };
  }
  
  const baseCost = calculateRevivalCost(frog.level, frog.hibernatedAt);
  const discountRate = Math.min(frog.blessingsReceived * BLESSING_DISCOUNT, 0.75); // Max 75% discount
  const discount = Math.floor(baseCost * discountRate);
  const finalCost = baseCost - discount;
  
  return {
    baseCost,
    discount,
    finalCost,
    blessings: frog.blessingsReceived
  };
}

/**
 * Revive a sleeping frog
 */
export async function reviveFrog(frogId: number): Promise<{
  success: boolean;
  message: string;
  cost?: number;
}> {
  const frog = await prisma.frog.findUnique({
    where: { id: frogId },
    select: {
      id: true,
      name: true,
      hibernationStatus: true,
      hibernatedAt: true,
      blessingsReceived: true,
      level: true
    }
  });
  
  if (!frog) {
    return { success: false, message: 'Frog not found' };
  }
  
  if (frog.hibernationStatus !== 'SLEEPING') {
    return { success: false, message: 'Frog is not sleeping' };
  }
  
  const { finalCost } = await getRevivalCostWithDiscount(frogId);
  
  // TODO: Deduct $LILY tokens from user wallet
  // const success = await lilyService.deduct(frog.ownerAddress, finalCost);
  // if (!success) {
  //   return { success: false, message: 'Insufficient $LILY balance' };
  // }
  
  // Reset frog to active state
  await prisma.frog.update({
    where: { id: frogId },
    data: {
      hibernationStatus: 'ACTIVE',
      hibernatedAt: null,
      blessingsReceived: 0, // Reset blessings after revival
      lastInteractedAt: new Date(), // Reset interaction timer
      hunger: 50,  // Revive with partial stats
      happiness: 50,
      energy: 50
    }
  });
  
  logger.info(`[Hibernation] Frog ${frog.name} (${frogId}) revived! Cost: ${finalCost} $LILY`);
  
  return { 
    success: true, 
    message: `${frog.name} 已成功唤醒！`,
    cost: finalCost
  };
}

/**
 * Friend blesses a sleeping frog (reduces revival cost)
 */
export async function blessFrog(
  blesserFrogId: number, 
  targetFrogId: number
): Promise<{
  success: boolean;
  message: string;
}> {
  // Validate blesser frog
  const blesser = await prisma.frog.findUnique({
    where: { id: blesserFrogId },
    select: { 
      id: true, 
      name: true, 
      energy: true,
      hibernationStatus: true
    }
  });
  
  if (!blesser) {
    return { success: false, message: 'Blesser frog not found' };
  }
  
  if (blesser.hibernationStatus !== 'ACTIVE') {
    return { success: false, message: 'Only active frogs can bless' };
  }
  
  if (blesser.energy < 10) {
    return { success: false, message: 'Insufficient energy (need 10)' };
  }
  
  // Validate target frog
  const target = await prisma.frog.findUnique({
    where: { id: targetFrogId },
    select: { 
      id: true, 
      name: true, 
      hibernationStatus: true,
      blessingsReceived: true
    }
  });
  
  if (!target) {
    return { success: false, message: 'Target frog not found' };
  }
  
  if (target.hibernationStatus !== 'SLEEPING') {
    return { success: false, message: 'Target frog is not sleeping' };
  }
  
  // Check friendship
  const friendship = await prisma.friendship.findFirst({
    where: {
      status: 'Accepted',
      OR: [
        { requesterId: blesserFrogId, addresseeId: targetFrogId },
        { requesterId: targetFrogId, addresseeId: blesserFrogId }
      ]
    }
  });
  
  if (!friendship) {
    return { success: false, message: 'Must be friends to bless' };
  }
  
  // Perform blessing
  await prisma.$transaction([
    // Deduct energy from blesser
    prisma.frog.update({
      where: { id: blesserFrogId },
      data: { energy: { decrement: 10 } }
    }),
    // Add blessing to target
    prisma.frog.update({
      where: { id: targetFrogId },
      data: { blessingsReceived: { increment: 1 } }
    })
  ]);
  
  logger.info(`[Hibernation] ${blesser.name} blessed ${target.name}. Total blessings: ${target.blessingsReceived + 1}`);
  
  return { 
    success: true, 
    message: `成功为 ${target.name} 祈福！唤醒费用已降低 ${BLESSING_DISCOUNT * 100}%`
  };
}

/**
 * Batch check hibernation status for inactive frogs
 */
export async function batchCheckHibernation(): Promise<number> {
  const thirtyTwoHoursAgo = new Date(Date.now() - DROWSY_THRESHOLD_HOURS * 60 * 60 * 1000);
  
  // Find frogs that might need status update
  const inactiveFrogs = await prisma.frog.findMany({
    where: {
      hibernationStatus: { not: 'SLEEPING' },
      lastInteractedAt: { lt: thirtyTwoHoursAgo }
    },
    select: { id: true }
  });
  
  let updatedCount = 0;
  for (const frog of inactiveFrogs) {
    const newStatus = await checkHibernationStatus(frog.id);
    if (newStatus && newStatus !== 'ACTIVE') {
      updatedCount++;
    }
  }
  
  if (updatedCount > 0) {
    logger.info(`[Hibernation] Batch check: ${updatedCount}/${inactiveFrogs.length} frogs updated`);
  }
  
  return updatedCount;
}

export const hibernationService = {
  checkHibernationStatus,
  calculateRevivalCost,
  getRevivalCostWithDiscount,
  reviveFrog,
  blessFrog,
  batchCheckHibernation
};
