/**
 * 🐸 宠物蛋系统 - 养成操作路由
 * 处理喂食、清洁、玩耍、治疗、进化等接口
 */

import { Router } from 'express';
import { prisma } from '../../database';
import frogStatusService from '../../services/frog-status.service';
import lilyService from '../../services/lily.service';
import { logger } from '../../utils/logger';

const router = Router();

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

    const status = await frogStatusService.calculateFrogStatus(frogId);
    
    res.json({
      success: true,
      data: status,
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
    const effects = await frogStatusService.feedFrog(frogId, foodType);

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
    const effects = await frogStatusService.cleanFrog(frogId);

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
    const happinessResult = await frogStatusService.playWithFrog(frogId, happinessGain);

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
    const happinessResult = await frogStatusService.playWithFrog(frogId, happinessGain);

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
    const effects = await frogStatusService.healFrog(frogId);

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

    const result = await frogStatusService.checkTravelPrerequisites(frogId);
    
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
    const happinessResult = await frogStatusService.playWithFrog(frogId, happinessGain);

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
    const happinessResult = await frogStatusService.playWithFrog(frogId, happinessGain);

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
      select: { isResting: true, restingSince: true, energy: true },
    });
    
    if (!frog) {
      return res.status(404).json({ error: 'Frog not found' });
    }

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
        energy: frog.energy,
        isNightTime,
        estimatedRecovery,
        canRest: (frog.energy ?? 100) < 100,
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

    const frog = await prisma.frog.findUnique({
      where: { id: frogId },
      select: { isResting: true, energy: true },
    });
    
    if (!frog) {
      return res.status(404).json({ error: 'Frog not found' });
    }

    if (frog.isResting) {
      return res.status(400).json({ error: '青蛙已经在休息中' });
    }

    if ((frog.energy ?? 100) >= 100) {
      return res.status(400).json({ error: '活力值已满，无需休息' });
    }

    await prisma.frog.update({
      where: { id: frogId },
      data: {
        isResting: true,
        restingSince: new Date(),
      },
    });

    res.json({
      success: true,
      message: '青蛙开始休息了 💤',
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

    const frog = await prisma.frog.findUnique({
      where: { id: frogId },
      select: { isResting: true, restingSince: true, energy: true },
    });
    
    if (!frog) {
      return res.status(404).json({ error: 'Frog not found' });
    }

    if (!frog.isResting) {
      return res.status(400).json({ error: '青蛙没有在休息' });
    }

    // 计算恢复量
    let energyGain = 30;
    if (frog.restingSince) {
      const restDuration = Date.now() - new Date(frog.restingSince).getTime();
      const hours = restDuration / (1000 * 60 * 60);
      // 每小时恢复10点，最多恢复50点
      energyGain = Math.min(50, Math.floor(hours * 10) + 20);
    }

    const newEnergy = Math.min(100, (frog.energy ?? 0) + energyGain);

    await prisma.frog.update({
      where: { id: frogId },
      data: {
        isResting: false,
        restingSince: null,
        energy: newEnergy,
      },
    });

    res.json({
      success: true,
      energyGain,
      newEnergy,
      message: `青蛙醒来了！活力恢复 +${energyGain} ☀️`,
    });
  } catch (error: any) {
    logger.error('[Nurture] Error ending rest:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
