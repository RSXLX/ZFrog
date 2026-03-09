/**
 * Badge Service 微服务 (P2 微服务拆分)
 * 职责：徽章系统、解锁条件检查、进度追踪、奖励发放
 */

import express from 'express';
import { createClient } from '@redis/client';
import { PrismaClient } from '@prisma/client';
import { logger } from './utils/logger';
import { BadgeEngine } from './services/BadgeEngine';
import { RewardDistributor } from './services/RewardDistributor';
import { ProgressTracker } from './services/ProgressTracker';

const app = express();
const PORT = process.env.PORT || 3005;

// 数据库连接
const prisma = new PrismaClient();

// Redis 连接
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.on('error', (err) => logger.error('Redis error:', err));
redis.on('connect', () => logger.info('Redis connected'));

// 服务实例
const badgeEngine = new BadgeEngine(prisma, redis);
const rewardDistributor = new RewardDistributor(prisma, redis);
const progressTracker = new ProgressTracker(prisma, redis);

// 中间件
app.use(express.json());

// 健康检查
app.get('/health', async (req, res) => {
  const health = await badgeEngine.healthCheck();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    redis: redis.isReady,
    database: await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    services: {
      badgeEngine: health,
      rewardDistributor: true,
      progressTracker: true
    }
  });
});

// 获取所有徽章定义
app.get('/badges', async (req, res) => {
  try {
    const { category, rarity, hidden } = req.query;
    
    const badges = await badgeEngine.getBadgeDefinitions({
      category: category as string,
      rarity: rarity ? parseInt(rarity as string) : undefined,
      hidden: hidden === 'true'
    });
    
    res.json({
      success: true,
      data: badges
    });
  } catch (error) {
    logger.error('Get badges error:', error);
    res.status(500).json({ error: 'Failed to get badges' });
  }
});

// 获取用户徽章
app.get('/users/:frogId/badges', async (req, res) => {
  try {
    const { frogId } = req.params;
    const { includeLocked } = req.query;
    
    const badges = await badgeEngine.getUserBadges({
      frogId: parseInt(frogId),
      includeLocked: includeLocked === 'true'
    });
    
    res.json({
      success: true,
      data: badges
    });
  } catch (error) {
    logger.error('Get user badges error:', error);
    res.status(500).json({ error: 'Failed to get user badges' });
  }
});

// 检查徽章解锁条件
app.post('/check', async (req, res) => {
  try {
    const { frogId, event, context } = req.body;
    
    if (!frogId || !event) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await badgeEngine.checkUnlockConditions({
      frogId,
      event,
      context
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Check unlock conditions error:', error);
    res.status(500).json({ error: 'Failed to check conditions' });
  }
});

// 解锁徽章
app.post('/unlock', async (req, res) => {
  try {
    const { frogId, badgeId, triggeredBy } = req.body;
    
    if (!frogId || !badgeId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await badgeEngine.unlockBadge({
      frogId,
      badgeId,
      triggeredBy
    });
    
    // 如果有奖励，触发奖励发放
    if (result.reward) {
      await rewardDistributor.distribute({
        frogId,
        badgeId,
        reward: result.reward
      });
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Unlock badge error:', error);
    res.status(500).json({ error: 'Failed to unlock badge' });
  }
});

// 获取徽章进度
app.get('/progress/:frogId', async (req, res) => {
  try {
    const { frogId } = req.params;
    
    const progress = await progressTracker.getProgress(parseInt(frogId));
    
    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    logger.error('Get progress error:', error);
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

// 更新徽章进度
app.post('/progress/:frogId', async (req, res) => {
  try {
    const { frogId } = req.params;
    const { badgeId, increment, metadata } = req.body;
    
    const result = await progressTracker.updateProgress({
      frogId: parseInt(frogId),
      badgeId,
      increment,
      metadata
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Update progress error:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// 启动服务器
async function start() {
  try {
    await redis.connect();
    
    app.listen(PORT, () => {
      logger.info(`[Badge Service] Running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start:', error);
    process.exit(1);
  }
}

start();
