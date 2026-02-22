/**
 * 🐸 宠物蛋系统 - 任务 API 路由
 */

import { Router, Request, Response } from 'express';
import {
  getDailyTaskProgress,
  claimTaskReward,
  DAILY_TASKS,
  WEEKLY_TASKS,
  DailyTaskProgress,
} from '../../services/daily-task.service';

const router = Router();

/**
 * GET /api/tasks/:ownerAddress
 * 获取每日任务列表和进度
 */
router.get('/:ownerAddress', async (req: Request, res: Response) => {
  try {
    const { ownerAddress } = req.params;
    
    if (!ownerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Owner address is required',
      });
    }

    const progress = await getDailyTaskProgress(ownerAddress);

    // 合并任务配置和进度
    const dailyTasks = progress.daily.map((p: DailyTaskProgress) => ({
      ...DAILY_TASKS[p.taskId as keyof typeof DAILY_TASKS],
      ...p,
    }));

    return res.json({
      success: true,
      data: {
        daily: dailyTasks,
        weekly: progress.weekly,
        todayLoginTime: progress.todayLoginTime,
        allDailyComplete: progress.allDailyComplete,
      },
    });
  } catch (error) {
    console.error('[Tasks] Get tasks error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get tasks',
    });
  }
});

/**
 * POST /api/tasks/:ownerAddress/claim
 * 领取任务奖励
 */
router.post('/:ownerAddress/claim', async (req: Request, res: Response) => {
  try {
    const { ownerAddress } = req.params;
    const { taskId } = req.body;

    if (!ownerAddress || !taskId) {
      return res.status(400).json({
        success: false,
        error: 'Owner address and taskId are required',
      });
    }

    const result = await claimTaskReward(ownerAddress, taskId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    return res.json({
      success: true,
      reward: result.reward,
    });
  } catch (error) {
    console.error('[Tasks] Claim reward error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to claim reward',
    });
  }
});

/**
 * GET /api/tasks/config
 * 获取任务配置（静态数据）
 */
router.get('/config', async (_req: Request, res: Response) => {
  return res.json({
    success: true,
    data: {
      daily: Object.values(DAILY_TASKS),
      weekly: Object.values(WEEKLY_TASKS),
    },
  });
});

export default router;
