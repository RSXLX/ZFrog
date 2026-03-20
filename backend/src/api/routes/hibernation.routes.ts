/**
 * 🌙 冬眠系统路由（兼容旧路径）
 *
 * 路由:
 * - GET  /api/frog/:frogId/hibernation
 * - GET  /api/frog/:frogId/hibernation/revival-cost
 * - POST /api/frog/:frogId/hibernation/revive
 * - POST /api/frog/:frogId/hibernation/bless
 */

import { Router, Request, Response } from 'express';
import { dormancyService } from '../../modules/life/dormancy.service';
import { lifeCommandService } from '../../modules/life/life.command';
import { lifeQueryService } from '../../modules/life/life.query';

const router = Router();

const parseFrogId = (raw: string): number => {
  const frogId = Number(raw);
  return Number.isInteger(frogId) ? frogId : NaN;
};

/**
 * GET /api/frog/:frogId/hibernation
 * 获取青蛙冬眠状态
 */
router.get('/:frogId/hibernation', async (req: Request, res: Response) => {
  try {
    const frogId = parseFrogId(req.params.frogId);
    if (isNaN(frogId)) {
      return res.status(400).json({ error: '无效的青蛙 ID' });
    }

    await lifeCommandService.syncDormancyStatus({ frogId });
    const life = await lifeQueryService.getLifeByFrogId(frogId);
    const revivalCost =
      life.hibernationStatus === 'SLEEPING'
        ? await dormancyService.getRevivalCostWithDiscount(frogId)
        : null;

    return res.json({
      status: life.hibernationStatus,
      isDormant: life.isDormant,
      mood: life.mood,
      blessingsReceived: revivalCost?.blessings || 0,
      revivalCost,
    });
  } catch (error) {
    console.error('获取冬眠状态失败:', error);
    return res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * GET /api/frog/:frogId/hibernation/revival-cost
 * 获取唤醒费用（含祈福折扣）
 */
router.get('/:frogId/hibernation/revival-cost', async (req: Request, res: Response) => {
  try {
    const frogId = parseFrogId(req.params.frogId);
    if (isNaN(frogId)) {
      return res.status(400).json({ error: '无效的青蛙 ID' });
    }

    const costInfo = await dormancyService.getRevivalCostWithDiscount(frogId);
    return res.json(costInfo);
  } catch (error) {
    console.error('获取唤醒费用失败:', error);
    return res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * POST /api/frog/:frogId/hibernation/revive
 * 唤醒青蛙
 */
router.post('/:frogId/hibernation/revive', async (req: Request, res: Response) => {
  try {
    const frogId = parseFrogId(req.params.frogId);
    if (isNaN(frogId)) {
      return res.status(400).json({ success: false, message: '无效的青蛙 ID' });
    }

    const result = await dormancyService.reviveDormant(frogId);
    return res.json(result);
  } catch (error) {
    console.error('唤醒失败:', error);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * POST /api/frog/:frogId/hibernation/bless
 * 祈福
 */
router.post('/:frogId/hibernation/bless', async (req: Request, res: Response) => {
  try {
    const targetFrogId = parseFrogId(req.params.frogId);
    const { blesserFrogId, verificationId } = req.body;
    const parsedBlesserFrogId = Number(blesserFrogId);

    if (isNaN(targetFrogId) || !Number.isInteger(parsedBlesserFrogId) || parsedBlesserFrogId <= 0) {
      return res.status(400).json({ success: false, message: '无效的参数' });
    }

    const result = await lifeCommandService.blessDormant({
      blesserFrogId: parsedBlesserFrogId,
      targetFrogId,
      verificationId: typeof verificationId === 'string' ? verificationId : undefined,
    });
    return res.json(result);
  } catch (error) {
    console.error('祈福失败:', error);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
