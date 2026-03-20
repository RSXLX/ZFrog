/**
 * 🐸 宠物蛋系统 - 养成操作路由
 * 处理喂食、清洁、玩耍、治疗、进化等接口
 */

import { Router } from 'express';
import { prisma } from '../../database';
import { recordTaskProgress } from '../../services/daily-task.service';
import lilyService from '../../services/lily.service';
import { lifeCommandService } from '../../modules/life/life.command';
import { lifeQueryService } from '../../modules/life/life.query';
import { logger } from '../../utils/logger';

const router = Router();

async function recordProgress(ownerAddress: string, action: 'feed' | 'clean' | 'game') {
  try {
    await recordTaskProgress(ownerAddress, action);
  } catch (error) {
    logger.warn(`[Nurture] Failed to record ${action} task progress for ${ownerAddress}:`, error);
  }
}

/**
 * GET /api/nurture/:frogId/status
 * 获取青蛙实时状态
 */
router.get('/:frogId/status', async (req, res) => {
  try {
    const frogId = parseInt(req.params.frogId);
    
    if (isNaN(frogId)) {
      return res.status(400).json({ error: 'Invalid frog ID' });
    }

    const life = await lifeQueryService.getLifeByFrogId(frogId);
    const warnings: string[] = [];
    const dangers: string[] = [];
    if (life.hunger <= 10) dangers.push('hunger');
    else if (life.hunger <= 30) warnings.push('hunger');
    if (life.cleanliness <= 20) dangers.push('cleanliness');
    else if (life.cleanliness <= 40) warnings.push('cleanliness');
    if (life.health <= 15) dangers.push('health');
    else if (life.health <= 40) warnings.push('health');
    if (life.energy <= 5) dangers.push('energy');
    else if (life.energy <= 20) warnings.push('energy');
    if (life.happiness <= 10) dangers.push('happiness');
    else if (life.happiness <= 30) warnings.push('happiness');
    
    res.json({
      success: true,
      data: {
        hunger: life.hunger,
        happiness: life.happiness,
        cleanliness: life.cleanliness,
        health: life.health,
        energy: life.energy,
        isSick: life.isSick,
        needsClean: life.needsClean,
        warnings,
        dangers,
        lastStatusUpdate: life.lastStateSyncAt,
      },
    });
  } catch (error: any) {
    logger.error('[Nurture] Error getting frog status:', error);
    if (error.message === 'Frog not found') {
      return res.status(404).json({ error: 'Frog not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/nurture/:frogId/feed
 * 喂食操作
 */
router.post('/:frogId/feed', async (req, res) => {
  try {
    const frogId = parseInt(req.params.frogId);
    const { foodType } = req.body;
    
    if (isNaN(frogId)) {
      return res.status(400).json({ error: 'Invalid frog ID' });
    }
    
    if (!foodType || !['BREAD', 'BUG_BENTO', 'CAKE'].includes(foodType)) {
      return res.status(400).json({ error: 'Invalid food type' });
    }

    // 获取青蛙所有者
    const frog = await prisma.frog.findUnique({
      where: { id: frogId },
      select: { ownerAddress: true },
    });
    
    if (!frog) {
      return res.status(404).json({ error: 'Frog not found' });
    }

    // 扣除 $LILY
    const buyResult = await lilyService.buyFood(frog.ownerAddress, foodType);
    if (!buyResult.success) {
      return res.status(400).json({ 
        error: buyResult.error,
        balance: buyResult.newBalance,
      });
    }

    // 执行喂食
    const effects = await lifeCommandService.feed({
      frogId,
      walletAddress: frog.ownerAddress,
      foodType,
      quantity: 1,
      source: 'legacy_nurture_feed',
    });
    await recordProgress(frog.ownerAddress, 'feed');

    res.json({
      success: true,
      cost: buyResult.cost,
      newBalance: buyResult.newBalance,
      effects: {
        hunger: effects.hunger,
        energy: effects.energy,
        happiness: effects.happiness,
      },
    });
  } catch (error: any) {
    logger.error('[Nurture] Error feeding frog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/nurture/:frogId/clean
 * 清洁操作
 */
router.post('/:frogId/clean', async (req, res) => {
  try {
    const frogId = parseInt(req.params.frogId);
    
    if (isNaN(frogId)) {
      return res.status(400).json({ error: 'Invalid frog ID' });
    }

    // 获取青蛙信息
    const frog = await prisma.frog.findUnique({
      where: { id: frogId },
      select: { ownerAddress: true, needsClean: true, cleanliness: true },
    });
    
    if (!frog) {
      return res.status(404).json({ error: 'Frog not found' });
    }

    // 执行清洁
    const beforeCleanliness = frog.cleanliness;
    const effects = await lifeCommandService.clean({
      frogId,
      walletAddress: frog.ownerAddress,
      source: 'legacy_nurture_clean',
    });

    // 如果之前需要清洁，给予奖励
    let reward = 0;
    let newBalance = 0;
    if (frog.needsClean) {
      const rewardResult = await lilyService.rewardClean(frog.ownerAddress);
      reward = rewardResult.reward;
      newBalance = rewardResult.newBalance;
    } else {
      const balanceInfo = await lilyService.getBalance(frog.ownerAddress);
      newBalance = balanceInfo.balance;
    }

    await recordProgress(frog.ownerAddress, 'clean');

    res.json({
      success: true,
      reward,
      newBalance,
      effects: {
        cleanliness: {
          before: beforeCleanliness,
          after: effects.cleanliness,
        },
      },
    });
  } catch (error: any) {
    logger.error('[Nurture] Error cleaning frog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/nurture/:frogId/play/guess
 * 猜方向小游戏
 */
router.post('/:frogId/play/guess', async (req, res) => {
  try {
    const frogId = parseInt(req.params.frogId);
    const { guess } = req.body;
    
    if (isNaN(frogId)) {
      return res.status(400).json({ error: 'Invalid frog ID' });
    }
    
    if (!guess || !['left', 'right'].includes(guess)) {
      return res.status(400).json({ error: 'Invalid guess, must be "left" or "right"' });
    }

    // 获取青蛙信息
    const frog = await prisma.frog.findUnique({
      where: { id: frogId },
      select: { ownerAddress: true, happiness: true },
    });
    
    if (!frog) {
      return res.status(404).json({ error: 'Frog not found' });
    }

    // 检查每日游戏次数（通过今日游戏奖励判断）
    const balanceInfo = await lilyService.getBalance(frog.ownerAddress);
    
    // 每天限制 5 次，每次最多 30 $LILY，所以上限 150
    // 这里简化处理，用已获得奖励判断剩余次数
    const maxRewardPerGame = 30;
    const maxGamesPerDay = 5;
    const estimatedGamesPlayed = Math.floor(balanceInfo.dailyGameEarned / maxRewardPerGame);
    const gamesRemaining = Math.max(0, maxGamesPerDay - estimatedGamesPlayed);
    
    if (gamesRemaining <= 0 && balanceInfo.dailyRemainingGameReward < 10) {
      return res.status(400).json({ 
        error: '今日游戏次数已用完',
        dailyPlaysRemaining: 0,
      });
    }

    // 游戏逻辑
    const actualDirection = Math.random() < 0.5 ? 'left' : 'right';
    const isCorrect = guess === actualDirection;
    
    // 计算奖励
    let rewardAmount = 0;
    if (isCorrect) {
      rewardAmount = Math.floor(Math.random() * 21) + 10; // 10-30
    }

    // 幸福度增加
    const happinessGain = isCorrect ? 10 : 5;
    const beforeHappiness = frog.happiness;
    const happinessResult = await lifeCommandService.play({
      frogId,
      walletAddress: frog.ownerAddress,
      gameType: 'guess',
      happinessGainOverride: happinessGain,
      source: 'legacy_nurture_guess',
    });

    // 发放奖励
    let newBalance = balanceInfo.balance;
    if (rewardAmount > 0) {
      const rewardResult = await lilyService.rewardGame(
        frog.ownerAddress,
        rewardAmount,
        '猜方向'
      );
      if (rewardResult.success) {
        rewardAmount = rewardResult.reward;
        newBalance = rewardResult.newBalance;
      } else {
        rewardAmount = 0;
      }
    }

    await recordProgress(frog.ownerAddress, 'game');

    res.json({
      success: true,
      correct: isCorrect,
      actualDirection,
      reward: rewardAmount,
      newBalance,
      effects: {
        happiness: {
          before: beforeHappiness,
          after: happinessResult.happiness,
        },
      },
      dailyPlaysRemaining: Math.max(0, gamesRemaining - 1),
    });
  } catch (error: any) {
    logger.error('[Nurture] Error playing game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/nurture/:frogId/game-remaining
 * 查询游戏剩余次数
 */
router.get('/:frogId/game-remaining', async (req, res) => {
  try {
    const frogId = parseInt(req.params.frogId);
    const game = req.query.game as string || 'guess';
    
    if (isNaN(frogId)) {
      return res.status(400).json({ error: 'Invalid frog ID' });
    }

    const frog = await prisma.frog.findUnique({
      where: { id: frogId },
      select: { ownerAddress: true },
    });
    
    if (!frog) {
      return res.status(404).json({ error: 'Frog not found' });
    }

    const balanceInfo = await lilyService.getBalance(frog.ownerAddress);
    
    // 每个游戏每天限5次
    const maxGamesPerDay = 5;
    const maxRewardPerGame = game === 'catch_bug' ? 50 : 30;
    const estimatedGamesPlayed = Math.floor(balanceInfo.dailyGameEarned / maxRewardPerGame);
    const remaining = Math.max(0, maxGamesPerDay - estimatedGamesPlayed);
    
    res.json({
      success: true,
      game,
      remaining,
      maxPerDay: maxGamesPerDay,
    });
  } catch (error: any) {
    logger.error('[Nurture] Error getting game remaining:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/nurture/:frogId/play/catch-bug
 * 接虫子小游戏
 */
router.post('/:frogId/play/catch-bug', async (req, res) => {
  try {
    const frogId = parseInt(req.params.frogId);
    const { score } = req.body;
    
    if (isNaN(frogId)) {
      return res.status(400).json({ error: 'Invalid frog ID' });
    }
    
    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({ error: 'Invalid score' });
    }

    // 获取青蛙信息
    const frog = await prisma.frog.findUnique({
      where: { id: frogId },
      select: { ownerAddress: true, happiness: true, level: true },
    });
    
    if (!frog) {
      return res.status(404).json({ error: 'Frog not found' });
    }

    // 检查等级要求（Lv.3 解锁）
    if ((frog.level ?? 1) < 3) {
      return res.status(400).json({ error: '需要达到 Lv.3 才能解锁接虫子游戏' });
    }

    // 检查每日游戏次数
    const balanceInfo = await lilyService.getBalance(frog.ownerAddress);
    const maxGamesPerDay = 5;
    const maxRewardPerGame = 50;
    const estimatedGamesPlayed = Math.floor(balanceInfo.dailyGameEarned / maxRewardPerGame);
    
    if (estimatedGamesPlayed >= maxGamesPerDay && balanceInfo.dailyRemainingGameReward < 20) {
      return res.status(400).json({ 
        error: '今日游戏次数已用完',
        dailyPlaysRemaining: 0,
      });
    }

    // 计算奖励（根据分数，20-50 $LILY）
    // 分数 0-50: 20 LILY, 50-100: 30 LILY, 100-200: 40 LILY, 200+: 50 LILY
    let rewardAmount = 20;
    if (score >= 200) rewardAmount = 50;
    else if (score >= 100) rewardAmount = 40;
    else if (score >= 50) rewardAmount = 30;

    // 幸福度增加
    const happinessGain = 15;
    const beforeHappiness = frog.happiness;
    const happinessResult = await lifeCommandService.play({
      frogId,
      walletAddress: frog.ownerAddress,
      gameType: 'catch_bug',
      score,
      happinessGainOverride: happinessGain,
      source: 'legacy_nurture_catch_bug',
    });

    // 发放奖励
    let newBalance = balanceInfo.balance;
    const rewardResult = await lilyService.rewardGame(
      frog.ownerAddress,
      rewardAmount,
      '接虫子'
    );
    if (rewardResult.success) {
      rewardAmount = rewardResult.reward;
      newBalance = rewardResult.newBalance;
    } else {
      rewardAmount = 0;
    }

    await recordProgress(frog.ownerAddress, 'game');

    res.json({
      success: true,
      score,
      lilyEarned: rewardAmount,
      newBalance,
      happiness: happinessResult.happiness,
      effects: {
        happiness: {
          before: beforeHappiness,
          after: happinessResult.happiness,
          gain: happinessGain,
        },
      },
    });
  } catch (error: any) {
    logger.error('[Nurture] Error playing catch bug game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/nurture/:frogId/heal
 * 治疗操作
 */
router.post('/:frogId/heal', async (req, res) => {
  try {
    const frogId = parseInt(req.params.frogId);
    
    if (isNaN(frogId)) {
      return res.status(400).json({ error: 'Invalid frog ID' });
    }

    // 获取青蛙信息
    const frog = await prisma.frog.findUnique({
      where: { id: frogId },
      select: { ownerAddress: true, isSick: true, health: true },
    });
    
    if (!frog) {
      return res.status(404).json({ error: 'Frog not found' });
    }

    // 扣除 $LILY
    const buyResult = await lilyService.buyMedicine(frog.ownerAddress);
    if (!buyResult.success) {
      return res.status(400).json({ 
        error: buyResult.error,
        balance: buyResult.newBalance,
      });
    }

    // 执行治疗
    const beforeHealth = frog.health;
    const beforeSick = frog.isSick;
    const effects = await lifeCommandService.heal({
      frogId,
      walletAddress: frog.ownerAddress,
      source: 'legacy_nurture_heal',
    });

    res.json({
      success: true,
      cost: buyResult.cost,
      newBalance: buyResult.newBalance,
      effects: {
        health: {
          before: beforeHealth,
          after: effects.health,
        },
        isSick: {
          before: beforeSick,
          after: effects.isSick,
        },
      },
    });
  } catch (error: any) {
    logger.error('[Nurture] Error healing frog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/nurture/:frogId/travel-check
 * 检查旅行前置条件
 */
router.get('/:frogId/travel-check', async (req, res) => {
  try {
    const frogId = parseInt(req.params.frogId);
    
    if (isNaN(frogId)) {
      return res.status(400).json({ error: 'Invalid frog ID' });
    }

    const life = await lifeQueryService.getLifeByFrogId(frogId);
    const failedRequirements: string[] = [];
    const warnings: string[] = [];

    if (life.isSick) {
      failedRequirements.push('青蛙生病了，需要先治疗');
    }
    if (life.needsClean || life.cleanliness < 30) {
      failedRequirements.push('青蛙需要先清洁');
    }
    if (life.hunger < 30) {
      failedRequirements.push(`饥饿度不足 (${life.hunger}/30)`);
    } else if (life.hunger < 45) {
      warnings.push('饥饿度较低，建议先喂食');
    }
    if (life.happiness < 20) {
      failedRequirements.push(`快乐度不足 (${life.happiness}/20)`);
    }
    if (life.health < 40) {
      failedRequirements.push(`健康度不足 (${life.health}/40)`);
    } else if (life.health < 60) {
      warnings.push('健康度较低，旅途可能有风险');
    }
    if (life.energy < 20) {
      failedRequirements.push(`活力值不足 (${life.energy}/20)`);
    }

    const result = {
      canTravel: failedRequirements.length === 0,
      failedRequirements,
      warnings,
      currentStatus: {
        hunger: life.hunger,
        happiness: life.happiness,
        health: life.health,
        energy: life.energy,
        cleanliness: life.cleanliness,
      },
    };
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('[Nurture] Error checking travel prerequisites:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/nurture/balance/:address
 * 获取用户 $LILY 余额
 */
router.get('/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!address) {
      return res.status(400).json({ error: 'Address required' });
    }

    const balanceInfo = await lilyService.getBalance(address.toLowerCase());
    
    res.json({
      success: true,
      data: balanceInfo,
    });
  } catch (error: any) {
    logger.error('[Nurture] Error getting balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/nurture/transactions/:address
 * 获取 $LILY 交易历史
 */
router.get('/transactions/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    
    if (!address) {
      return res.status(400).json({ error: 'Address required' });
    }

    const transactions = await lilyService.getTransactionHistory(
      address.toLowerCase(),
      Math.min(limit, 100)
    );
    
    res.json({
      success: true,
      data: transactions,
    });
  } catch (error: any) {
    logger.error('[Nurture] Error getting transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/nurture/:frogId/evolve
 * 进化操作
 */
router.post('/:frogId/evolve', async (req, res) => {
  try {
    const frogId = parseInt(req.params.frogId);
    const { evolutionType } = req.body;
    
    if (isNaN(frogId)) {
      return res.status(400).json({ error: 'Invalid frog ID' });
    }
    
    if (!evolutionType || !['explorer', 'scholar', 'social'].includes(evolutionType)) {
      return res.status(400).json({ error: 'Invalid evolution type' });
    }

    // 获取青蛙信息
    const frog = await prisma.frog.findUnique({
      where: { id: frogId },
      select: { 
        canEvolve: true, 
        evolutionType: true, 
        ownerAddress: true,
      },
    });
    
    if (!frog) {
      return res.status(404).json({ error: 'Frog not found' });
    }

    // 检查是否可以进化
    if (!frog.canEvolve) {
      return res.status(400).json({ error: '青蛙尚未满足进化条件' });
    }

    // 检查是否已经进化过
    if (frog.evolutionType) {
      return res.status(400).json({ error: '青蛙已经进化过，无法再次进化' });
    }

    // 执行进化
    await prisma.frog.update({
      where: { id: frogId },
      data: {
        evolutionType,
        canEvolve: false,
        evolvedAt: new Date(),
      },
    });

    // 定义进化效果
    const bonuses: Record<string, string> = {
      explorer: '旅行奖励+15%',
      scholar: 'AI对话更深度',
      social: '好友上限+10',
    };

    res.json({
      success: true,
      evolutionType,
      bonuses: {
        description: bonuses[evolutionType],
      },
    });
  } catch (error: any) {
    logger.error('[Nurture] Error evolving frog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/nurture/:frogId/play/lily-pad
 * 跳荷叶小游戏（Lv.5 解锁）
 */
router.post('/:frogId/play/lily-pad', async (req, res) => {
  try {
    const frogId = parseInt(req.params.frogId);
    const { score } = req.body;
    
    if (isNaN(frogId)) {
      return res.status(400).json({ error: 'Invalid frog ID' });
    }
    
    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({ error: 'Invalid score' });
    }

    const frog = await prisma.frog.findUnique({
      where: { id: frogId },
      select: { ownerAddress: true, happiness: true, level: true },
    });
    
    if (!frog) {
      return res.status(404).json({ error: 'Frog not found' });
    }

    // Lv.5 解锁
    if ((frog.level ?? 1) < 5) {
      return res.status(400).json({ error: '需要达到 Lv.5 才能解锁跳荷叶游戏' });
    }

    // 计算奖励（30-80 $LILY）
    let rewardAmount = 30;
    if (score >= 500) rewardAmount = 80;
    else if (score >= 300) rewardAmount = 60;
    else if (score >= 150) rewardAmount = 45;

    // 幸福度增加
    const happinessGain = 20;
    const beforeHappiness = frog.happiness;
    const happinessResult = await lifeCommandService.play({
      frogId,
      walletAddress: frog.ownerAddress,
      gameType: 'lily_pad',
      score,
      happinessGainOverride: happinessGain,
      source: 'legacy_nurture_lily_pad',
    });

    // 发放奖励
    const balanceInfo = await lilyService.getBalance(frog.ownerAddress);
    let newBalance = balanceInfo.balance;
    const rewardResult = await lilyService.rewardGame(
      frog.ownerAddress,
      rewardAmount,
      '跳荷叶'
    );
    if (rewardResult.success) {
      rewardAmount = rewardResult.reward;
      newBalance = rewardResult.newBalance;
    } else {
      rewardAmount = 0;
    }

    await recordProgress(frog.ownerAddress, 'game');

    res.json({
      success: true,
      score,
      lilyEarned: rewardAmount,
      newBalance,
      happiness: happinessResult.happiness,
      effects: {
        happiness: {
          before: beforeHappiness,
          after: happinessResult.happiness,
          gain: happinessGain,
        },
      },
    });
  } catch (error: any) {
    logger.error('[Nurture] Error playing lily pad game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/nurture/:frogId/play/memory
 * 记忆翻牌小游戏（Lv.8 解锁）
 */
router.post('/:frogId/play/memory', async (req, res) => {
  try {
    const frogId = parseInt(req.params.frogId);
    const { score, moves, time } = req.body;
    
    if (isNaN(frogId)) {
      return res.status(400).json({ error: 'Invalid frog ID' });
    }

    const frog = await prisma.frog.findUnique({
      where: { id: frogId },
      select: { ownerAddress: true, happiness: true, level: true },
    });
    
    if (!frog) {
      return res.status(404).json({ error: 'Frog not found' });
    }

    // Lv.8 解锁
    if ((frog.level ?? 1) < 8) {
      return res.status(400).json({ error: '需要达到 Lv.8 才能解锁记忆翻牌游戏' });
    }

    // 计算奖励（40-100 $LILY，步数越少、时间越短奖励越高）
    let rewardAmount = 40;
    if (score >= 800) rewardAmount = 100;
    else if (score >= 600) rewardAmount = 80;
    else if (score >= 400) rewardAmount = 60;

    // 幸福度增加
    const happinessGain = 15;
    const beforeHappiness = frog.happiness;
    const happinessResult = await lifeCommandService.play({
      frogId,
      walletAddress: frog.ownerAddress,
      gameType: 'memory',
      score: typeof score === 'number' ? score : undefined,
      happinessGainOverride: happinessGain,
      source: 'legacy_nurture_memory',
    });

    // 发放奖励
    const balanceInfo = await lilyService.getBalance(frog.ownerAddress);
    let newBalance = balanceInfo.balance;
    const rewardResult = await lilyService.rewardGame(
      frog.ownerAddress,
      rewardAmount,
      '记忆翻牌'
    );
    if (rewardResult.success) {
      rewardAmount = rewardResult.reward;
      newBalance = rewardResult.newBalance;
    } else {
      rewardAmount = 0;
    }

    await recordProgress(frog.ownerAddress, 'game');

    res.json({
      success: true,
      score,
      moves,
      time,
      lilyEarned: rewardAmount,
      newBalance,
      happiness: happinessResult.happiness,
    });
  } catch (error: any) {
    logger.error('[Nurture] Error playing memory game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/nurture/:frogId/rest-status
 * 获取休息状态
 */
router.get('/:frogId/rest-status', async (req, res) => {
  try {
    const frogId = parseInt(req.params.frogId);
    
    if (isNaN(frogId)) {
      return res.status(400).json({ error: 'Invalid frog ID' });
    }

    const frog = await prisma.frog.findUnique({
      where: { id: frogId },
      select: { isResting: true, restingSince: true },
    });
    
    if (!frog) {
      return res.status(404).json({ error: 'Frog not found' });
    }
    const life = await lifeQueryService.getLifeByFrogId(frogId);

    // 检查是否为夜间时段
    const hour = new Date().getHours();
    const isNightTime = hour >= 22 || hour < 6;
    
    // 计算预计恢复量
    let estimatedRecovery = 30;
    if (isNightTime) estimatedRecovery = 40;

    res.json({
      success: true,
      data: {
        isResting: frog.isResting ?? false,
        restingSince: frog.restingSince,
        energy: life.energy,
        isNightTime,
        estimatedRecovery,
        canRest: life.energy < 100,
      },
    });
  } catch (error: any) {
    logger.error('[Nurture] Error getting rest status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/nurture/:frogId/rest/start
 * 开始休息
 */
router.post('/:frogId/rest/start', async (req, res) => {
  try {
    const frogId = parseInt(req.params.frogId);
    
    if (isNaN(frogId)) {
      return res.status(400).json({ error: 'Invalid frog ID' });
    }

    const result = await lifeCommandService.startRest({
      frogId,
      source: 'legacy_nurture_rest_start',
    });

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    logger.error('[Nurture] Error starting rest:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/nurture/:frogId/rest/end
 * 结束休息
 */
router.post('/:frogId/rest/end', async (req, res) => {
  try {
    const frogId = parseInt(req.params.frogId);
    
    if (isNaN(frogId)) {
      return res.status(400).json({ error: 'Invalid frog ID' });
    }

    const result = await lifeCommandService.endRest({
      frogId,
      source: 'legacy_nurture_rest_end',
    });

    res.json({
      success: true,
      energyGain: result.energyGain,
      newEnergy: result.state.energy,
      message: result.message,
    });
  } catch (error: any) {
    logger.error('[Nurture] Error ending rest:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
