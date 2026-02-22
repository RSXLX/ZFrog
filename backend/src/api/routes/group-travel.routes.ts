import { Router } from 'express';
import { groupTravelService } from '../../services/group-travel.service';
import { parseNonNegativeInt, parsePositiveInt } from '../../utils/validation';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * POST /api/group-travel/prepare
 * 准备结伴旅行 - 验证并返回费用估算
 */
router.post('/prepare', async (req, res) => {
  try {
    const { leaderTokenId, companionTokenId, targetChainId, duration } = req.body;

    logger.info(`[GroupTravel] POST /prepare: leader=${leaderTokenId}, companion=${companionTokenId}, chain=${targetChainId}, duration=${duration}`);

    // 验证参数
    const parsedLeaderId = parseNonNegativeInt(leaderTokenId);
    const parsedCompanionId = parseNonNegativeInt(companionTokenId);
    const parsedChainId = parsePositiveInt(targetChainId);
    const parsedDuration = parsePositiveInt(duration);

    if (parsedLeaderId === null || parsedCompanionId === null) {
      return res.status(400).json({
        success: false,
        error: 'leaderTokenId and companionTokenId must be valid non-negative integers'
      });
    }

    if (!parsedChainId) {
      return res.status(400).json({
        success: false,
        error: 'targetChainId must be a valid positive integer'
      });
    }

    if (!parsedDuration || parsedDuration < 60 || parsedDuration > 86400) {
      return res.status(400).json({
        success: false,
        error: 'duration must be between 60 and 86400 seconds'
      });
    }

    const result = await groupTravelService.prepareGroupTravel(
      parsedLeaderId,
      parsedCompanionId,
      parsedChainId,
      parsedDuration
    );

    res.json(result);

  } catch (error: any) {
    logger.error('[GroupTravel] prepare error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to prepare group travel'
    });
  }
});

/**
 * POST /api/group-travel/confirm
 * 确认结伴旅行 - 链上交易成功后创建数据库记录
 */
router.post('/confirm', async (req, res) => {
  try {
    const { 
      txHash, 
      leaderTokenId, 
      companionTokenId, 
      targetChainId, 
      duration,
      crossChainMessageId,
      provisionsUsed
    } = req.body;

    logger.info(`[GroupTravel] POST /confirm: txHash=${txHash}, messageId=${crossChainMessageId}`);

    // 验证参数
    if (!txHash || typeof txHash !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'txHash is required'
      });
    }

    if (!crossChainMessageId || typeof crossChainMessageId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'crossChainMessageId is required'
      });
    }

    const parsedLeaderId = parseNonNegativeInt(leaderTokenId);
    const parsedCompanionId = parseNonNegativeInt(companionTokenId);
    const parsedChainId = parsePositiveInt(targetChainId);
    const parsedDuration = parsePositiveInt(duration);

    if (parsedLeaderId === null || parsedCompanionId === null) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tokenIds'
      });
    }

    if (!parsedChainId || !parsedDuration) {
      return res.status(400).json({
        success: false,
        error: 'Invalid chainId or duration'
      });
    }

    const result = await groupTravelService.confirmGroupTravel({
      txHash,
      leaderTokenId: parsedLeaderId,
      companionTokenId: parsedCompanionId,
      targetChainId: parsedChainId,
      duration: parsedDuration,
      crossChainMessageId,
      provisionsUsed: provisionsUsed || '0'
    });

    res.json(result);

  } catch (error: any) {
    logger.error('[GroupTravel] confirm error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to confirm group travel'
    });
  }
});

/**
 * POST /api/group-travel/complete
 * 完成结伴旅行 (后端调用)
 */
router.post('/complete', async (req, res) => {
  try {
    const { crossChainMessageId, xpReward } = req.body;

    logger.info(`[GroupTravel] POST /complete: messageId=${crossChainMessageId}, xp=${xpReward}`);

    if (!crossChainMessageId || typeof crossChainMessageId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'crossChainMessageId is required'
      });
    }

    const xp = parsePositiveInt(xpReward) || 50;

    const result = await groupTravelService.completeGroupTravel(crossChainMessageId, xp);

    res.json(result);

  } catch (error: any) {
    logger.error('[GroupTravel] complete error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to complete group travel'
    });
  }
});

export default router;
