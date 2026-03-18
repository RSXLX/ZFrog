/**
 * 🐸 宠物蛋系统 - 每日任务服务
 * 模块F.4: 每日/每周任务系统
 */

import { prisma } from '../database';

// 任务奖励类型
interface TaskReward {
  lily?: number;
  xp?: number;
  zeta?: number;
  item?: string;
}

interface TaskConfig {
  id: string;
  name: string;
  description: string;
  condition: string;
  target?: number;
  reward: TaskReward;
  icon: string;
}

// 任务配置
export const DAILY_TASKS: Record<string, TaskConfig> = {
  MORNING_GREETING: {
    id: 'MORNING_GREETING',
    name: '早安问候',
    description: '08:00 前登录游戏',
    condition: 'login_before_8am',
    reward: { lily: 30 },
    icon: '🌅',
  },
  DILIGENT_OWNER: {
    id: 'DILIGENT_OWNER',
    name: '勤劳主人',
    description: '喂食 3 次',
    condition: 'feed_count',
    target: 3,
    reward: { lily: 50 },
    icon: '🍔',
  },
  CLEAN_MASTER: {
    id: 'CLEAN_MASTER',
    name: '清洁达人',
    description: '清洁 2 次',
    condition: 'clean_count',
    target: 2,
    reward: { lily: 40 },
    icon: '✨',
  },
  HAPPY_PLAY: {
    id: 'HAPPY_PLAY',
    name: '快乐玩耍',
    description: '完成 1 次小游戏',
    condition: 'game_count',
    target: 1,
    reward: { lily: 30 },
    icon: '🎮',
  },
  SOCIAL_BUTTERFLY: {
    id: 'SOCIAL_BUTTERFLY',
    name: '社交达人',
    description: '拜访 1 位好友',
    condition: 'visit_count',
    target: 1,
    reward: { lily: 20 },
    icon: '👋',
  },
  HEALTH_GUARDIAN: {
    id: 'HEALTH_GUARDIAN',
    name: '健康卫士',
    description: '保持健康度 > 80 全天',
    condition: 'health_above_80',
    reward: { lily: 50 },
    icon: '❤️',
  },
  PERFECT_CARE: {
    id: 'PERFECT_CARE',
    name: '完美照顾',
    description: '完成以上所有任务',
    condition: 'all_daily_complete',
    reward: { lily: 100, xp: 10 },
    icon: '🏆',
  },
};

export const WEEKLY_TASKS: Record<string, TaskConfig> = {
  TRAVELER: {
    id: 'TRAVELER',
    name: '旅行家',
    description: '完成 3 次跨链旅行',
    condition: 'travel_count',
    target: 3,
    reward: { lily: 300, item: 'rare_fragment' },
    icon: '✈️',
  },
  SOCIAL_STAR: {
    id: 'SOCIAL_STAR',
    name: '社交蝴蝶',
    description: '好友互动 20 次',
    condition: 'interaction_count',
    target: 20,
    reward: { lily: 200 },
    icon: '🦋',
  },
  COLLECTOR: {
    id: 'COLLECTOR',
    name: '收藏家',
    description: '获得 2 个纪念品',
    condition: 'souvenir_count',
    target: 2,
    reward: { item: 'rare_fragment_2' },
    icon: '🎁',
  },
  GROWTH_PATH: {
    id: 'GROWTH_PATH',
    name: '成长之路',
    description: '青蛙升级 1 次',
    condition: 'level_up',
    target: 1,
    reward: { lily: 500, zeta: 0.1 },
    icon: '⬆️',
  },
};

export interface DailyTaskProgress {
  taskId: string;
  progress: number;
  target: number;
  completed: boolean;
  claimed: boolean;
}

export interface TaskListResult {
  daily: DailyTaskProgress[];
  weekly: DailyTaskProgress[];
  todayLoginTime: Date | null;
  allDailyComplete: boolean;
}

function getStartOfDay(date: Date = new Date()): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getStartOfWeek(date: Date = new Date()): Date {
  const start = getStartOfDay(date);
  const dayOfWeek = start.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

function getEmptyTaskRecordData(ownerAddress: string, date: Date) {
  return {
    ownerAddress,
    date,
    loginTime: null,
    feedCount: 0,
    cleanCount: 0,
    gameCount: 0,
    visitCount: 0,
    healthKept: true,
    claimedTasks: [],
  };
}

/**
 * 获取用户每日任务进度
 */
export async function getDailyTaskProgress(ownerAddress: string): Promise<TaskListResult> {
  const normalizedOwnerAddress = ownerAddress.toLowerCase();
  const today = getStartOfDay();
  
  // 获取用户的青蛙
  const frog = await prisma.frog.findFirst({
    where: { ownerAddress: normalizedOwnerAddress },
    select: { id: true, health: true },
  });
  
  if (!frog) {
    throw new Error('Frog not found');
  }

  // 获取或创建今日任务记录
  let taskRecord = await prisma.dailyTask.findUnique({
    where: {
      ownerAddress_date: {
        ownerAddress: normalizedOwnerAddress,
        date: today,
      },
    },
  });

  if (!taskRecord) {
    // 创建今日任务记录
    taskRecord = await prisma.dailyTask.create({
      data: {
        ownerAddress: normalizedOwnerAddress,
        date: today,
        loginTime: new Date(),
        feedCount: 0,
        cleanCount: 0,
        gameCount: 0,
        visitCount: 0,
        healthKept: frog.health >= 80,
        claimedTasks: [],
      },
    });
  }

  // 计算每日任务进度
  const dailyProgress: DailyTaskProgress[] = [];
  const claimedTasks = taskRecord.claimedTasks as string[] || [];

  // 早安问候
  const loginHour = taskRecord.loginTime?.getHours() ?? 24;
  dailyProgress.push({
    taskId: DAILY_TASKS.MORNING_GREETING.id,
    progress: loginHour < 8 ? 1 : 0,
    target: 1,
    completed: loginHour < 8,
    claimed: claimedTasks.includes(DAILY_TASKS.MORNING_GREETING.id),
  });

  // 勤劳主人
  dailyProgress.push({
    taskId: DAILY_TASKS.DILIGENT_OWNER.id,
    progress: taskRecord.feedCount,
    target: 3,
    completed: taskRecord.feedCount >= 3,
    claimed: claimedTasks.includes(DAILY_TASKS.DILIGENT_OWNER.id),
  });

  // 清洁达人
  dailyProgress.push({
    taskId: DAILY_TASKS.CLEAN_MASTER.id,
    progress: taskRecord.cleanCount,
    target: 2,
    completed: taskRecord.cleanCount >= 2,
    claimed: claimedTasks.includes(DAILY_TASKS.CLEAN_MASTER.id),
  });

  // 快乐玩耍
  dailyProgress.push({
    taskId: DAILY_TASKS.HAPPY_PLAY.id,
    progress: taskRecord.gameCount,
    target: 1,
    completed: taskRecord.gameCount >= 1,
    claimed: claimedTasks.includes(DAILY_TASKS.HAPPY_PLAY.id),
  });

  // 社交达人
  dailyProgress.push({
    taskId: DAILY_TASKS.SOCIAL_BUTTERFLY.id,
    progress: taskRecord.visitCount,
    target: 1,
    completed: taskRecord.visitCount >= 1,
    claimed: claimedTasks.includes(DAILY_TASKS.SOCIAL_BUTTERFLY.id),
  });

  // 健康卫士
  dailyProgress.push({
    taskId: DAILY_TASKS.HEALTH_GUARDIAN.id,
    progress: taskRecord.healthKept ? 1 : 0,
    target: 1,
    completed: taskRecord.healthKept,
    claimed: claimedTasks.includes(DAILY_TASKS.HEALTH_GUARDIAN.id),
  });

  // 完美照顾（检查除自身外所有任务是否完成）
  const allOthersComplete = dailyProgress.every(t => 
    t.taskId === DAILY_TASKS.PERFECT_CARE.id || t.completed
  );
  dailyProgress.push({
    taskId: DAILY_TASKS.PERFECT_CARE.id,
    progress: dailyProgress.filter(t => t.completed && t.taskId !== DAILY_TASKS.PERFECT_CARE.id).length,
    target: 6,
    completed: allOthersComplete,
    claimed: claimedTasks.includes(DAILY_TASKS.PERFECT_CARE.id),
  });

  // 计算每周任务进度
  const weekStart = getStartOfWeek();
  const weeklyClaimRecord = await prisma.dailyTask.findUnique({
    where: {
      ownerAddress_date: {
        ownerAddress: normalizedOwnerAddress,
        date: weekStart,
      },
    },
  });
  const weeklyClaimedTasks = (weeklyClaimRecord?.claimedTasks as string[] | null) || [];
  
  // 获取本周旅行次数
  const travelCount = await prisma.travel.count({
    where: {
      frogId: frog.id,
      startTime: { gte: weekStart },
      status: 'Completed',
    },
  });
  
  // 获取本周互动次数（简化：使用visitCount总和）
  const weeklyVisits = await prisma.dailyTask.aggregate({
    where: {
      ownerAddress: normalizedOwnerAddress,
      date: { gte: weekStart },
    },
    _sum: { visitCount: true },
  });
  
  // 获取本周纪念品数量
  const souvenirCount = await prisma.souvenir.count({
    where: {
      frogId: frog.id,
      createdAt: { gte: weekStart },
    },
  });
  
  // 获取本周青蛙记录（检查是否升级 - 简化处理，认为本周有xp获取就算）
  const frogData = await prisma.frog.findFirst({
    where: { ownerAddress: normalizedOwnerAddress },
    select: { level: true, xp: true },
  });
  
  // 简化：检查等级是否大于1（表示有过升级）
  const leveledUp = (frogData?.level ?? 1) > 1;
  
  const weeklyProgress: DailyTaskProgress[] = [];
  
  // 旅行家
  weeklyProgress.push({
    taskId: WEEKLY_TASKS.TRAVELER.id,
    progress: travelCount,
    target: WEEKLY_TASKS.TRAVELER.target || 3,
    completed: travelCount >= (WEEKLY_TASKS.TRAVELER.target || 3),
    claimed: weeklyClaimedTasks.includes(WEEKLY_TASKS.TRAVELER.id),
  });
  
  // 社交蝴蝶
  const totalVisits = weeklyVisits._sum.visitCount || 0;
  weeklyProgress.push({
    taskId: WEEKLY_TASKS.SOCIAL_STAR.id,
    progress: totalVisits,
    target: WEEKLY_TASKS.SOCIAL_STAR.target || 20,
    completed: totalVisits >= (WEEKLY_TASKS.SOCIAL_STAR.target || 20),
    claimed: weeklyClaimedTasks.includes(WEEKLY_TASKS.SOCIAL_STAR.id),
  });
  
  // 收藏家
  weeklyProgress.push({
    taskId: WEEKLY_TASKS.COLLECTOR.id,
    progress: souvenirCount,
    target: WEEKLY_TASKS.COLLECTOR.target || 2,
    completed: souvenirCount >= (WEEKLY_TASKS.COLLECTOR.target || 2),
    claimed: weeklyClaimedTasks.includes(WEEKLY_TASKS.COLLECTOR.id),
  });
  
  // 成长之路
  weeklyProgress.push({
    taskId: WEEKLY_TASKS.GROWTH_PATH.id,
    progress: leveledUp ? 1 : 0,
    target: 1,
    completed: !!leveledUp,
    claimed: weeklyClaimedTasks.includes(WEEKLY_TASKS.GROWTH_PATH.id),
  });

  return {
    daily: dailyProgress,
    weekly: weeklyProgress,
    todayLoginTime: taskRecord.loginTime,
    allDailyComplete: allOthersComplete,
  };
}

/**
 * 记录任务进度（喂食/清洁/游戏/拜访）
 */
export async function recordTaskProgress(
  ownerAddress: string,
  action: 'feed' | 'clean' | 'game' | 'visit'
): Promise<void> {
  const normalizedOwnerAddress = ownerAddress.toLowerCase();
  const today = getStartOfDay();

  const updateData: Record<string, any> = {};
  switch (action) {
    case 'feed':
      updateData.feedCount = { increment: 1 };
      break;
    case 'clean':
      updateData.cleanCount = { increment: 1 };
      break;
    case 'game':
      updateData.gameCount = { increment: 1 };
      break;
    case 'visit':
      updateData.visitCount = { increment: 1 };
      break;
  }

  await prisma.dailyTask.upsert({
    where: {
      ownerAddress_date: {
        ownerAddress: normalizedOwnerAddress,
        date: today,
      },
    },
    update: updateData,
    create: {
      ownerAddress: normalizedOwnerAddress,
      date: today,
      loginTime: new Date(),
      feedCount: action === 'feed' ? 1 : 0,
      cleanCount: action === 'clean' ? 1 : 0,
      gameCount: action === 'game' ? 1 : 0,
      visitCount: action === 'visit' ? 1 : 0,
      healthKept: true,
      claimedTasks: [],
    },
  });
}

/**
 * 领取任务奖励
 */
export async function claimTaskReward(
  ownerAddress: string,
  taskId: string
): Promise<{ success: boolean; reward?: any; error?: string }> {
  const normalizedOwnerAddress = ownerAddress.toLowerCase();
  const today = getStartOfDay();
  const weekStart = getStartOfWeek();

  // 获取任务配置
  const taskConfig =
    DAILY_TASKS[taskId as keyof typeof DAILY_TASKS] ||
    WEEKLY_TASKS[taskId as keyof typeof WEEKLY_TASKS];
  if (!taskConfig) {
    return { success: false, error: 'Task not found' };
  }

  const isWeeklyTask = taskId in WEEKLY_TASKS;
  const claimDate = isWeeklyTask ? weekStart : today;

  // 获取任务记录
  const taskRecord = await prisma.dailyTask.upsert({
    where: {
      ownerAddress_date: {
        ownerAddress: normalizedOwnerAddress,
        date: claimDate,
      },
    },
    update: {},
    create: getEmptyTaskRecordData(normalizedOwnerAddress, claimDate),
  });

  // 检查是否已领取
  const claimedTasks = taskRecord.claimedTasks as string[] || [];
  if (claimedTasks.includes(taskId)) {
    return { success: false, error: 'Reward already claimed' };
  }

  // 检查任务是否完成
  const progress = await getDailyTaskProgress(ownerAddress);
  const task = (isWeeklyTask ? progress.weekly : progress.daily).find(
    (progressItem) => progressItem.taskId === taskId
  );
  if (!task || !task.completed) {
    return { success: false, error: 'Task not completed' };
  }

  // 发放奖励
  if (taskConfig.reward.lily) {
    await prisma.lilyBalance.upsert({
      where: { ownerAddress: normalizedOwnerAddress },
      update: {
        balance: { increment: taskConfig.reward.lily },
        totalEarned: { increment: taskConfig.reward.lily },
      },
      create: {
        ownerAddress: normalizedOwnerAddress,
        balance: taskConfig.reward.lily,
        totalEarned: taskConfig.reward.lily,
        totalSpent: 0,
        dailyGameEarned: 0,
        dailyResetAt: today,
      },
    });

    // 记录交易
    await prisma.lilyTransaction.create({
      data: {
        ownerAddress: normalizedOwnerAddress,
        amount: taskConfig.reward.lily,
        type: 'TASK_REWARD',
        description: `${isWeeklyTask ? '完成周任务' : '完成任务'}: ${taskConfig.name}`,
      },
    });
  }

  // 如果有 XP 奖励
  if (taskConfig.reward.xp) {
    const frog = await prisma.frog.findFirst({
      where: { ownerAddress: normalizedOwnerAddress },
    });
    if (frog) {
      await prisma.frog.update({
        where: { id: frog.id },
        data: { xp: { increment: taskConfig.reward.xp } },
      });
    }
  }

  // 标记已领取
  await prisma.dailyTask.update({
    where: { id: taskRecord.id },
    data: {
      claimedTasks: [...claimedTasks, taskId],
    },
  });

  return { success: true, reward: taskConfig.reward };
}

export default {
  DAILY_TASKS,
  WEEKLY_TASKS,
  getDailyTaskProgress,
  recordTaskProgress,
  claimTaskReward,
};
