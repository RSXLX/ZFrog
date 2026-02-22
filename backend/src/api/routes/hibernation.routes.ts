/**
 * 🌙 冬眠系统路由
 * 
 * 路由:
 * - GET  /api/frog/:frogId/hibernation - 获取冬眠状态
 * - GET  /api/frog/:frogId/hibernation/revival-cost - 获取唤醒费用
 * - POST /api/frog/:frogId/hibernation/revive - 唤醒青蛙
 * - POST /api/frog/:frogId/hibernation/bless - 祈福
 */

import { Router, Request, Response } from 'express';
import { hibernationService } from '../../services/hibernation.service';
import { prisma } from '../../database';

const router = Router();

/**
 * GET /api/frog/:frogId/hibernation
 * 获取青蛙冬眠状态
 */
router.get('/:frogId/hibernation', async (req: Request, res: Response) => {
  try {
    const frogId = parseInt(req.params.frogId);
    
    if (isNaN(frogId)) {
      return res.status(400).json({ error: '无效的青蛙 ID' });
    }
    
    const frog = await prisma.frog.findUnique({
      where: { id: frogId },
      select: {
        hibernationStatus: true,
        hibernatedAt: true,
        blessingsReceived: true,
        level: true,
      },
    });
    
    if (!frog) {
      return res.status(404).json({ error: '青蛙不存在' });
    }
    
    // 如果正在沉睡，计算唤醒费用
    let revivalCost = null;
    if (frog.hibernationStatus === 'SLEEPING' && frog.hibernatedAt) {
      const costInfo = await hibernationService.getRevivalCostWithDiscount(frogId);
      revivalCost = costInfo;
    }
    
    return res.json({
      status: frog.hibernationStatus,
      hibernatedAt: frog.hibernatedAt?.toISOString() || null,
      blessingsReceived: frog.blessingsReceived || 0,
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
    const frogId = parseInt(req.params.frogId);
    
    if (isNaN(frogId)) {
      return res.status(400).json({ error: '无效的青蛙 ID' });
    }
    
    const costInfo = await hibernationService.getRevivalCostWithDiscount(frogId);
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
    const frogId = parseInt(req.params.frogId);
    
    if (isNaN(frogId)) {
      return res.status(400).json({ success: false, message: '无效的青蛙 ID' });
    }
    
    const result = await hibernationService.reviveFrog(frogId);
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
    const targetFrogId = parseInt(req.params.frogId);
    const { blesserFrogId } = req.body;
    
    if (isNaN(targetFrogId) || isNaN(parseInt(blesserFrogId))) {
      return res.status(400).json({ success: false, message: '无效的参数' });
    }
    
    const result = await hibernationService.blessFrog(parseInt(blesserFrogId), targetFrogId);
    return res.json(result);
  } catch (error) {
    console.error('祈福失败:', error);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
