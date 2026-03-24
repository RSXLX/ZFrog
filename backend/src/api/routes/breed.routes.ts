/**
 * 🐸 P5 繁殖系统 API 路由
 */

import { Router, Request, Response } from 'express';
import * as breedService from '../../services/breed.service';

const router: Router = Router();

/**
 * POST /api/breed/check
 * 检查繁殖条件
 */
router.post('/check', async (req: Request, res: Response) => {
  try {
    const { frogId1, frogId2 } = req.body;

    if (!frogId1 || !frogId2) {
      return res.status(400).json({ success: false, error: '缺少青蛙 ID' });
    }

    const result = await breedService.checkBreedEligibility(frogId1, frogId2);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error checking breed eligibility:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/breed/request
 * 发起繁殖请求
 */
router.post('/request', async (req: Request, res: Response) => {
  try {
    const { requesterId, partnerId } = req.body;

    if (!requesterId || !partnerId) {
      return res.status(400).json({ success: false, error: '缺少青蛙 ID' });
    }

    const request = await breedService.createBreedRequest(requesterId, partnerId);
    res.json({ success: true, data: request });
  } catch (error: any) {
    console.error('Error creating breed request:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/breed/:id/accept
 * 接受繁殖请求
 */
router.put('/:id/accept', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const request = await breedService.acceptBreedRequest(parseInt(id));
    res.json({ success: true, data: request });
  } catch (error: any) {
    console.error('Error accepting breed request:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/breed/:id/reject
 * 拒绝繁殖请求
 */
router.put('/:id/reject', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const request = await breedService.rejectBreedRequest(parseInt(id));
    res.json({ success: true, data: request });
  } catch (error: any) {
    console.error('Error rejecting breed request:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/breed/:id/pay
 * 记录支付
 */
router.post('/:id/pay', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { frogId } = req.body;

    if (!frogId) {
      return res.status(400).json({ success: false, error: '缺少付款方 ID' });
    }

    const request = await breedService.recordPayment(parseInt(id), frogId);
    res.json({ success: true, data: request });
  } catch (error: any) {
    console.error('Error recording payment:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/breed/:id/execute
 * 执行繁殖 (生成子代)
 */
router.post('/:id/execute', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await breedService.executeBreeding(parseInt(id));
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error executing breeding:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/breed/requests/:frogId
 * 获取繁殖请求列表
 */
router.get('/requests/:frogId', async (req: Request, res: Response) => {
  try {
    const { frogId } = req.params;
    const requests = await breedService.getBreedRequests(parseInt(frogId));
    res.json({ success: true, data: requests });
  } catch (error: any) {
    console.error('Error getting breed requests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/breed/config
 * 获取繁殖配置
 */
router.get('/config', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: breedService.BREED_CONFIG,
  });
});

export default router;
