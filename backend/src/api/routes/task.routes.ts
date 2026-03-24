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
import { ApiRes } from '../../utils/apiResponse';

const router: Router = Router();

/**
 * GET /api/tasks/config
 * 获取任务配置（静态数据）
 */
router.get('/config', async (_req: Request, res: Response) => {
  return ApiRes.success(res, {
    daily: Object.values(DAILY_TASKS),
    weekly: Object.values(WEEKLY_TASKS),
  });
});

/**
 * GET /api/tasks/:ownerAddress
 * 获取每日任务列表和进度
 */
router.get('/:ownerAddress', async (req: Request, res: Response) => {
  try {
    const { ownerAddress } = req.params;
    
    if (!ownerAddress) {
      return ApiRes.validationError(res, 'Owner address is required');
    }

    const progress = await getDailyTaskProgress(ownerAddress);

    // 合并任务配置和进度
    const dailyTasks = progress.daily.map((p: DailyTaskProgress) => ({
      ...DAILY_TASKS[p.taskId as keyof typeof DAILY_TASKS],
      ...p,
    }));

    const weeklyTasks = progress.weekly.map((p: DailyTaskProgress) => ({
      ...WEEKLY_TASKS[p.taskId as keyof typeof WEEKLY_TASKS],
      ...p,
    }));

    return ApiRes.success(res, {
      daily: dailyTasks,
      weekly: weeklyTasks,
      todayLoginTime: progress.todayLoginTime,
      allDailyComplete: progress.allDailyComplete,
    });
  } catch (error) {
    console.error('[Tasks] Get tasks error:', error);
    return ApiRes.serverError(res, error instanceof Error ? error : undefined);
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
      return ApiRes.validationError(res, 'Owner address and taskId are required');
    }

    const result = await claimTaskReward(ownerAddress, taskId);

    if (!result.success) {
      return ApiRes.validationError(res, result.error || 'Failed to claim reward');
    }

    return ApiRes.success(
      res,
      { reward: result.reward },
      'Reward claimed'
    );
  } catch (error) {
    console.error('[Tasks] Claim reward error:', error);
    return ApiRes.serverError(res, error instanceof Error ? error : undefined);
  }
});

export default router;
