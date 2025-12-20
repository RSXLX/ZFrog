// backend/src/api/routes/badge.routes.ts

import { Router } from 'express';
import { badgeService } from '../../services/badge/badge.service';

const router = Router();

/**
 * GET /api/badges/:frogId
 * 获取所有徽章（含解锁状态）
 */
router.get('/:frogId', async (req, res) => {
  try {
    const frogId = parseInt(req.params.frogId);
    const badges = await badgeService.getAllBadgesWithStatus(frogId);
    res.json({ success: true, data: badges });
  } catch (error) {
    console.error('Error fetching badges:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/badges/:frogId/unlocked
 * 获取已解锁徽章
 */
router.get('/:frogId/unlocked', async (req, res) => {
  try {
    const frogId = parseInt(req.params.frogId);
    const badges = await badgeService.getUserBadges(frogId);
    res.json({ success: true, data: badges });
  } catch (error) {
    console.error('Error fetching unlocked badges:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
