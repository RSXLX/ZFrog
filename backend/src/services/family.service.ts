/**
 * Family DAO Service
 * 
 * Manages family/clan system:
 * - Create/join families
 * - Totem watering and leveling
 * - Weekly mission tracking
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Constants
const FAMILY_CONFIG = {
  CREATE_COST: 500,           // $LILY cost to create family
  MAX_MEMBERS: 10,            // Max family members
  WATER_ENERGY_COST: 10,      // Energy cost to water totem
  WATER_PROGRESS_GAIN: 5,     // Progress gained per watering
  LEVEL_UP_THRESHOLD: 100,    // Progress needed to level up
  WEEKLY_MISSION_MILEAGE: 1000, // Required weekly mileage
};

/**
 * Create a new family
 */
export async function createFamily(
  leaderFrogId: number,
  familyName: string
): Promise<{ success: boolean; message: string; familyId?: number }> {
  // Check if frog exists and doesn't belong to a family
  const frog = await prisma.frog.findUnique({
    where: { id: leaderFrogId },
    select: { id: true, name: true, familyId: true, level: true }
  });
  
  if (!frog) {
    return { success: false, message: 'Frog not found' };
  }
  
  if (frog.familyId) {
    return { success: false, message: 'Frog already belongs to a family' };
  }
  
  if (frog.level < 10) {
    return { success: false, message: 'Frog must be level 10+ to create family' };
  }
  
  // Check if family name is taken
  const existingFamily = await prisma.family.findUnique({
    where: { name: familyName }
  });
  
  if (existingFamily) {
    return { success: false, message: 'Family name already taken' };
  }
  
  // TODO: Deduct $LILY from user
  // await lilyService.deduct(frog.ownerAddress, FAMILY_CONFIG.CREATE_COST);
  
  // Create family and set leader as member
  const family = await prisma.family.create({
    data: {
      name: familyName,
      leaderId: leaderFrogId,
    }
  });
  
  // Add leader as member
  await prisma.frog.update({
    where: { id: leaderFrogId },
    data: { familyId: family.id }
  });
  
  logger.info(`[Family] Created family "${familyName}" with leader ${frog.name}`);
  
  return { 
    success: true, 
    message: `家族「${familyName}」创建成功！`,
    familyId: family.id
  };
}

/**
 * Join an existing family
 */
export async function joinFamily(
  frogId: number,
  familyId: number
): Promise<{ success: boolean; message: string }> {
  const frog = await prisma.frog.findUnique({
    where: { id: frogId },
    select: { id: true, name: true, familyId: true }
  });
  
  if (!frog) {
    return { success: false, message: 'Frog not found' };
  }
  
  if (frog.familyId) {
    return { success: false, message: 'Frog already belongs to a family' };
  }
  
  const family = await prisma.family.findUnique({
    where: { id: familyId },
    include: { members: true }
  });
  
  if (!family) {
    return { success: false, message: 'Family not found' };
  }
  
  if (family.members.length >= FAMILY_CONFIG.MAX_MEMBERS) {
    return { success: false, message: 'Family is full' };
  }
  
  await prisma.frog.update({
    where: { id: frogId },
    data: { familyId: familyId }
  });
  
  logger.info(`[Family] ${frog.name} joined family "${family.name}"`);
  
  return { 
    success: true, 
    message: `成功加入家族「${family.name}」！`
  };
}

/**
 * Leave a family
 */
export async function leaveFamily(frogId: number): Promise<{ success: boolean; message: string }> {
  const frog = await prisma.frog.findUnique({
    where: { id: frogId },
    select: { id: true, name: true, familyId: true }
  });
  
  if (!frog || !frog.familyId) {
    return { success: false, message: 'Frog is not in a family' };
  }
  
  // Check if frog is the leader
  const family = await prisma.family.findUnique({
    where: { id: frog.familyId }
  });
  
  if (family && family.leaderId === frogId) {
    return { success: false, message: 'Leader cannot leave. Transfer leadership first.' };
  }
  
  await prisma.frog.update({
    where: { id: frogId },
    data: { familyId: null }
  });
  
  logger.info(`[Family] ${frog.name} left their family`);
  
  return { success: true, message: '已离开家族' };
}

/**
 * Water the family totem (daily activity)
 */
export async function waterTotem(frogId: number): Promise<{
  success: boolean;
  message: string;
  leveledUp?: boolean;
  newLevel?: number;
}> {
  const frog = await prisma.frog.findUnique({
    where: { id: frogId },
    select: { id: true, name: true, familyId: true, energy: true }
  });
  
  if (!frog || !frog.familyId) {
    return { success: false, message: 'Frog is not in a family' };
  }
  
  if (frog.energy < FAMILY_CONFIG.WATER_ENERGY_COST) {
    return { success: false, message: `Insufficient energy (need ${FAMILY_CONFIG.WATER_ENERGY_COST})` };
  }
  
  const family = await prisma.family.findUnique({
    where: { id: frog.familyId }
  });
  
  if (!family) {
    return { success: false, message: 'Family not found' };
  }
  
  // Deduct energy
  await prisma.frog.update({
    where: { id: frogId },
    data: { energy: { decrement: FAMILY_CONFIG.WATER_ENERGY_COST } }
  });
  
  // Add progress
  let newProgress = family.totemProgress + FAMILY_CONFIG.WATER_PROGRESS_GAIN;
  let newLevel = family.totemLevel;
  let leveledUp = false;
  
  // Check for level up
  if (newProgress >= FAMILY_CONFIG.LEVEL_UP_THRESHOLD && family.totemLevel < 10) {
    newProgress = newProgress - FAMILY_CONFIG.LEVEL_UP_THRESHOLD;
    newLevel = family.totemLevel + 1;
    leveledUp = true;
  }
  
  await prisma.family.update({
    where: { id: family.id },
    data: {
      totemProgress: newProgress,
      totemLevel: newLevel
    }
  });
  
  logger.info(`[Family] ${frog.name} watered totem. Progress: ${newProgress}, Level: ${newLevel}`);
  
  return {
    success: true,
    message: leveledUp 
      ? `浇水成功！图腾升级到 ${newLevel} 级！`
      : `浇水成功！进度 +${FAMILY_CONFIG.WATER_PROGRESS_GAIN}`,
    leveledUp,
    newLevel
  };
}

/**
 * Add mileage from travel to family weekly mission
 */
export async function addTravelMileage(frogId: number, mileage: number): Promise<void> {
  const frog = await prisma.frog.findUnique({
    where: { id: frogId },
    select: { familyId: true }
  });
  
  if (!frog?.familyId) return;
  
  await prisma.family.update({
    where: { id: frog.familyId },
    data: { weeklyMileage: { increment: mileage } }
  });
}

/**
 * Check and reset weekly missions (call weekly via cron)
 */
export async function processWeeklyMissions(): Promise<number> {
  const families = await prisma.family.findMany({
    select: {
      id: true,
      name: true,
      weeklyMileage: true,
      totemLevel: true
    }
  });
  
  let rewardedCount = 0;
  
  for (const family of families) {
    const missionComplete = family.weeklyMileage >= FAMILY_CONFIG.WEEKLY_MISSION_MILEAGE;
    
    if (missionComplete) {
      // TODO: Distribute rewards based on totem level
      // const reward = 100 * family.totemLevel;
      // await distributeRewards(family.id, reward);
      rewardedCount++;
      logger.info(`[Family] "${family.name}" completed weekly mission (${family.weeklyMileage} miles)`);
    }
    
    // Reset weekly mileage
    await prisma.family.update({
      where: { id: family.id },
      data: { weeklyMileage: 0 }
    });
  }
  
  logger.info(`[Family] Weekly reset: ${rewardedCount}/${families.length} families completed mission`);
  
  return rewardedCount;
}

/**
 * Get family info
 */
export async function getFamily(familyId: number) {
  return prisma.family.findUnique({
    where: { id: familyId },
    include: {
      leader: { select: { id: true, name: true, level: true } },
      members: { select: { id: true, name: true, level: true } }
    }
  });
}

export const familyService = {
  createFamily,
  joinFamily,
  leaveFamily,
  waterTotem,
  addTravelMileage,
  processWeeklyMissions,
  getFamily,
  FAMILY_CONFIG
};
