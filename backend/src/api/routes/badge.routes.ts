// backend/src/api/routes/badge.routes.ts

import { Router } from 'express';
import { badgeService } from '../../services/badge/badge.service';
import { prisma } from '../../database';

const router = Router();

/**
 * GET /api/badges
 * 获取徽章列表（支持按青蛙ID或地址筛选）
 * 查询参数：
 * - frogId: 青蛙ID（可选）
 * - ownerAddress: 所有者地址（可选，用于获取该地址所有青蛙的徽章）
 */
router.get('/', async (req, res) => {
  try {
    const { frogId, ownerAddress } = req.query;
    
    if (frogId) {
      // 获取特定青蛙的徽章
      const badges = await badgeService.getAllBadgesWithStatus(parseInt(frogId as string));
      res.json({ success: true, data: badges });
    } else if (ownerAddress) {
      // 获取地址下所有青蛙的徽章
      const frogs = await prisma.frog.findMany({
        where: { ownerAddress: (ownerAddress as string).toLowerCase() },
        select: { id: true, name: true, tokenId: true }
      });
      
      const allBadges = [];
      for (const frog of frogs) {
        const badges = await badgeService.getAllBadgesWithStatus(frog.id);
        allBadges.push({
          frogId: frog.id,
          frogTokenId: frog.tokenId,
          frogName: frog.name,
          badges
        });
      }
      res.json({ success: true, data: allBadges });
    } else {
      res.status(400).json({ success: false, error: 'Missing frogId or ownerAddress parameter' });
    }
  } catch (error) {
    console.error('Error fetching badges:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/badges/:frogId
 * 获取所有徽章（含解锁状态）
 * 注意: frogId 参数为 NFT tokenId，非数据库 id
 */
router.get('/:frogId', async (req, res) => {
  try {
    const tokenId = parseInt(req.params.frogId);
    
    // 先根据 tokenId 查找青蛙
    const frog = await prisma.frog.findUnique({
      where: { tokenId }
    });
    
    if (!frog) {
      return res.status(404).json({ success: false, error: 'Frog not found' });
    }
    
    // 使用数据库 id 查询徽章
    const badges = await badgeService.getAllBadgesWithStatus(frog.id);
    res.json({ success: true, data: badges });
  } catch (error) {
    console.error('Error fetching badges:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/badges/:frogId/unlocked
 * 获取已解锁徽章
 * 注意: frogId 参数为 NFT tokenId，非数据库 id
 */
router.get('/:frogId/unlocked', async (req, res) => {
  try {
    const tokenId = parseInt(req.params.frogId);
    
    // 先根据 tokenId 查找青蛙
    const frog = await prisma.frog.findUnique({
      where: { tokenId }
    });
    
    if (!frog) {
      return res.status(404).json({ success: false, error: 'Frog not found' });
    }
    
    // 使用数据库 id 查询徽章
    const badges = await badgeService.getUserBadges(frog.id);
    res.json({ success: true, data: badges });
  } catch (error) {
    console.error('Error fetching unlocked badges:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/badges/frog/:frogId/travel
 * 获取青蛙的旅行徽章列表
 */
router.get('/frog/:frogId/travel', async (req, res) => {
  try {
    const tokenId = parseInt(req.params.frogId);
    
    if (isNaN(tokenId)) {
      return res.status(400).json({ success: false, error: 'Invalid frogId' });
    }
    
    // 查找青蛙
    const frog = await prisma.frog.findUnique({
      where: { tokenId }
    });
    
    if (!frog) {
      return res.status(404).json({ success: false, error: 'Frog not found' });
    }
    
    // 获取旅行徽章
    const badges = await prisma.earnedTravelBadge.findMany({
      where: { frogId: frog.id },
      orderBy: { earnedAt: 'desc' }
    });
    
    res.json({ success: true, data: badges });
  } catch (error) {
    console.error('Error fetching travel badges:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/badges/frog/:frogId/stats
 * 获取青蛙的徽章统计
 */
router.get('/frog/:frogId/stats', async (req, res) => {
  try {
    const tokenId = parseInt(req.params.frogId);
    
    if (isNaN(tokenId)) {
      return res.status(400).json({ success: false, error: 'Invalid frogId' });
    }
    
    // 查找青蛙
    const frog = await prisma.frog.findUnique({
      where: { tokenId }
    });
    
    if (!frog) {
      return res.status(404).json({ success: false, error: 'Frog not found' });
    }
    
    // 获取统计
    const badges = await prisma.earnedTravelBadge.findMany({
      where: { frogId: frog.id }
    });
    
    // 总共 5 种旅行徽章
    const total = 5;
    const earned = badges.length;
    const progress = Math.round((earned / total) * 100);
    
    res.json({
      success: true,
      data: {
        total,
        earned,
        progress,
        badges: badges.map(b => b.badgeType)
      }
    });
  } catch (error) {
    console.error('Error fetching badge stats:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
