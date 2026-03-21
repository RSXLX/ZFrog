/**
 * 🐸 宠物蛋系统 - 状态定时任务
 * 功能:
 * 1. 检测生病条件（健康度 < 15 持续 2 小时）
 * 2. 触发随机排泄事件
 * 3. 更新进化条件检测
 * 4. P4: 发送状态警告通知
 */

import cron from 'node-cron';
import { prisma } from '../database';
import { calculateFrogLevel } from './evolution.service';
import * as notificationService from './notification.service';
import { lifeCommandService } from '../modules/life/life.command';
import { lifeQueryService } from '../modules/life/life.query';
import { dormancyService } from '../modules/life/dormancy.service';

// 配置
const CONFIG = {
  // 生病检测
  sickThreshold: 15,        // 健康度低于此值可能生病
  sickDurationHours: 2,     // 持续多久会生病
  
  // 排泄事件
  poopChancePerHour: 0.1,   // 每小时排泄概率 (10%)
  
  // 进化条件
  evolutionLevel: 10,       // 需要的等级
};

/**
 * 检测生病条件
 * 规则: 健康度 < 15 且持续 2 小时以上
 */
async function checkSickness() {
  const twoHoursAgo = new Date(Date.now() - CONFIG.sickDurationHours * 60 * 60 * 1000);
  
  try {
    // 找到可能需要标记生病的青蛙
    const atRiskFrogs = await prisma.frog.findMany({
      where: {
        isSick: false,
        lastStatusUpdate: { lt: twoHoursAgo },
      },
      select: {
        id: true,
        name: true,
      },
    });

    for (const frog of atRiskFrogs) {
      const life = await lifeQueryService.getLifeByFrogId(frog.id);
      if (life.health >= CONFIG.sickThreshold) {
        continue;
      }

      console.log(`🤒 青蛙 ${frog.name} (ID: ${frog.id}) 健康度过低，标记为生病`);

      await lifeCommandService.applyDelta({
        frogId: frog.id,
        setIsSick: true,
        sickSince: new Date(),
        source: 'status-cron.sickness',
      });
    }

    if (atRiskFrogs.length > 0) {
      console.log(`[StatusCron] 检测到 ${atRiskFrogs.length} 只青蛙生病`);
    }
  } catch (error) {
    console.error('[StatusCron] 生病检测失败:', error);
  }
}

/**
 * 触发随机排泄事件
 * 规则: 每次定时任务有一定概率触发
 */
async function triggerPoopEvents() {
  try {
    // 找到所有在家且不需要清洁的青蛙
    const idleFrogs = await prisma.frog.findMany({
      where: {
        status: 'Idle',
        needsClean: false,
      },
      select: {
        id: true,
        name: true,
        lastStatusUpdate: true,
      },
    });

    for (const frog of idleFrogs) {
      // 计算自上次更新以来的小时数
      const hoursSinceUpdate = (Date.now() - new Date(frog.lastStatusUpdate).getTime()) / (1000 * 60 * 60);
      
      // 累计概率 = 基础概率 * 小时数
      const poopChance = Math.min(0.8, CONFIG.poopChancePerHour * hoursSinceUpdate);
      
      if (Math.random() < poopChance) {
        console.log(`💩 青蛙 ${frog.name} (ID: ${frog.id}) 触发排泄事件`);

        await lifeCommandService.applyDelta({
          frogId: frog.id,
          cleanlinessDelta: -30,
          setNeedsClean: true,
          source: 'status-cron.poop',
        });
      }
    }
  } catch (error) {
    console.error('[StatusCron] 排泄事件触发失败:', error);
  }
}

/**
 * 更新进化条件检测
 * 规则: 等级 >= 10 且未进化的青蛙标记为可进化
 */
async function updateEvolutionEligibility() {
  try {
    // 找到所有未进化的青蛙
    const unevolveFrogs = await prisma.frog.findMany({
      where: {
        evolutionType: null,
        canEvolve: false,
      },
      select: {
        id: true,
        name: true,
        totalTravels: true,
      },
    });

    for (const frog of unevolveFrogs) {
      const life = await lifeQueryService.getLifeByFrogId(frog.id);
      const level = calculateFrogLevel(frog.totalTravels, life.happiness, life.health);

      if (level >= CONFIG.evolutionLevel) {
        console.log(`✨ 青蛙 ${frog.name} (ID: ${frog.id}) 达到进化条件，等级: ${level}`);
        
        await prisma.frog.update({
          where: { id: frog.id },
          data: { canEvolve: true },
        });
      }
    }
  } catch (error) {
    console.error('[StatusCron] 进化条件更新失败:', error);
  }
}

/**
 * 每日重置 $LILY 游戏奖励限额
 */
async function resetDailyLimits() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  try {
    const result = await prisma.lilyBalance.updateMany({
      where: {
        dailyResetAt: { lt: todayStart },
      },
      data: {
        dailyGameEarned: 0,
        dailyResetAt: todayStart,
      },
    });

    if (result.count > 0) {
      console.log(`[StatusCron] 重置了 ${result.count} 个账户的每日游戏奖励限额`);
    }
  } catch (error) {
    console.error('[StatusCron] 每日限额重置失败:', error);
  }
}

/**
 * 夜间能量恢复
 * 规则: 凌晨 0-6 点期间，在家的青蛙恢复 +30 能量（每次执行最多恢复一次）
 * 简化版本：不使用额外字段，直接恢复低能量青蛙
 */
async function nightlyEnergyRecovery() {
  const now = new Date();
  const hour = now.getHours();
  
  // 只在凌晨 0-6 点执行
  if (hour < 0 || hour >= 6) {
    return;
  }
  
  try {
    // 找到在家且能量低于 50 的青蛙
    const frogsToRecover = await prisma.frog.findMany({
      where: {
        status: 'Idle',
        energy: { lt: 50 },
      },
      select: {
        id: true,
        name: true,
      },
    });

    for (const frog of frogsToRecover) {
      const life = await lifeQueryService.getLifeByFrogId(frog.id);
      const gain = Math.min(30, Math.max(0, 100 - life.energy));
      if (gain <= 0) {
        continue;
      }

      const newEnergy = life.energy + gain;
      console.log(`😴 青蛙 ${frog.name} (ID: ${frog.id}) 夜间休息，能量 ${life.energy} → ${newEnergy}`);

      await lifeCommandService.applyDelta({
        frogId: frog.id,
        energyDelta: gain,
        source: 'status-cron.nightly_energy',
      });
    }

    if (frogsToRecover.length > 0) {
      console.log(`[StatusCron] ${frogsToRecover.length} 只青蛙完成夜间休息恢复`);
    }
  } catch (error) {
    console.error('[StatusCron] 夜间能量恢复失败:', error);
  }
}

/**
 * P4: 检测状态警告并发送通知
 */
async function checkStatusWarnings() {
  try {
    // 找到需要警告的青蛙
    const frogsToWarn = await prisma.frog.findMany({
      where: {
        OR: [
          { hunger: { lt: 30 } },
          { cleanliness: { lt: 30 } },
          { health: { lt: 30 } },
        ],
      },
      select: {
        id: true,
        name: true,
        hunger: true,
        cleanliness: true,
        health: true,
        isSick: true,
      },
    });

    for (const frog of frogsToWarn) {
      // 饥饿警告
      if (frog.hunger < 30) {
        await notificationService.sendStatusWarning(frog.id, frog.name, 'hunger');
      }
      // 清洁警告
      if (frog.cleanliness < 30) {
        await notificationService.sendStatusWarning(frog.id, frog.name, 'clean');
      }
      // 生病警告
      if (frog.isSick) {
        await notificationService.sendStatusWarning(frog.id, frog.name, 'sick');
      }
      // 紧急警告（多项状态都很低）
      if (frog.hunger < 15 && frog.health < 15) {
        await notificationService.sendStatusWarning(frog.id, frog.name, 'death');
      }
    }

    if (frogsToWarn.length > 0) {
      console.log(`[StatusCron] 检测到 ${frogsToWarn.length} 只青蛙需要状态警告`);
    }
  } catch (error) {
    console.error('[StatusCron] 状态警告检测失败:', error);
  }
}

/**
 * 主定时任务 - 每 5 分钟执行一次
 */
async function runStatusCron() {
  console.log(`[StatusCron] 开始执行定时任务 - ${new Date().toISOString()}`);
  
  await Promise.all([
    checkSickness(),
    triggerPoopEvents(),
    updateEvolutionEligibility(),
    resetDailyLimits(),
    nightlyEnergyRecovery(),
    checkStatusWarnings(), // P4: 状态警告检测
    dormancyService.batchCheckDormancy(), // V4.0: 冬眠状态检测
  ]);
  
  console.log(`[StatusCron] 定时任务执行完成`);
}

/**
 * 启动定时任务
 */
export function startStatusCron() {
  // 每 5 分钟执行一次
  cron.schedule('*/5 * * * *', () => {
    runStatusCron().catch(console.error);
  });
  
  console.log('🕐 [StatusCron] 定时任务已启动，每 5 分钟执行一次');
  
  // 启动时立即执行一次
  runStatusCron().catch(console.error);
}

/**
 * 手动触发（用于测试）
 */
export async function triggerStatusCron() {
  return runStatusCron();
}

export default {
  startStatusCron,
  triggerStatusCron,
  checkSickness,
  triggerPoopEvents,
  updateEvolutionEligibility,
  resetDailyLimits,
  nightlyEnergyRecovery,
};
