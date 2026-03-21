/**
 * Cross-Chain Travel API Routes
 * 
 * Endpoints for managing cross-chain frog travel
 */

import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { AppError } from '../../middlewares/errorHandler';
import { travelCommandServiceV1 } from '../../modules/travel/travel.command';
import { travelQueryServiceV1 } from '../../modules/travel/travel.query';

const router = Router();

/**
 * GET /api/v1/cross-chain/supported-chains
 * Get list of supported chains for cross-chain travel
 */
router.get('/supported-chains', async (req: Request, res: Response) => {
  try {
    const chains = travelQueryServiceV1.getSupportedCrossChains();
    res.json({
      success: true,
      data: chains,
    });
  } catch (error) {
    logger.error('Error getting supported chains:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get supported chains',
    });
  }
});

/**
 * GET /api/v1/cross-chain/can-travel/:tokenId
 * Check if a frog can start cross-chain travel
 */
router.get('/can-travel/:tokenId', async (req: Request, res: Response) => {
  try {
    const tokenId = parseInt(req.params.tokenId);
    const targetChainId = parseInt(req.query.targetChainId as string) || 97; // Default BSC Testnet

    const result = await travelQueryServiceV1.canStartCrossChainTravel(tokenId, targetChainId);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error checking cross-chain eligibility:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check eligibility',
    });
  }
});

/**
 * POST /api/v1/cross-chain/travel
 * Create a cross-chain travel record (blockchain tx should be done by frontend)
 */
router.post('/travel', async (req: Request, res: Response) => {
  try {
    const result = await travelCommandServiceV1.startLegacyCrossChainTravel({
      frogId: req.body?.frogId,
      tokenId: req.body?.tokenId,
      targetChainId: req.body?.targetChainId,
      duration: req.body?.duration,
      ownerAddress: req.body?.ownerAddress,
    });

    res.json({
      success: true,
      data: {
        travelId: result.travelId,
        status: result.status,
        currentStage: result.currentStage,
        targetChain: result.targetChain,
        chainId: result.chainId,
        endTime: result.endTime,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    logger.error('Error creating cross-chain travel:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create cross-chain travel',
    });
  }
});

/**
 * POST /api/v1/cross-chain/travel/:travelId/started
 * Update travel record when blockchain tx is confirmed
 */
router.post('/travel/:travelId/started', async (req: Request, res: Response) => {
  try {
    const travelId = parseInt(req.params.travelId);
    const { messageId, txHash } = req.body;

    if (!messageId || !txHash) {
      return res.status(400).json({
        success: false,
        error: 'Missing messageId or txHash',
      });
    }

    await travelCommandServiceV1.markCrossChainStarted({
      travelId,
      messageId,
      txHash,
    });

    res.json({
      success: true,
      message: 'Travel started confirmed',
    });
  } catch (error) {
    logger.error('Error updating travel started:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update travel',
    });
  }
});

/**
 * POST /api/v1/cross-chain/travel/:tokenId/arrived
 * Update travel when frog arrives at target chain
 */
router.post('/travel/:tokenId/arrived', async (req: Request, res: Response) => {
  try {
    const tokenId = parseInt(req.params.tokenId);
    const { messageId, arrivalTime } = req.body;

    await travelCommandServiceV1.markCrossChainArrived({
      tokenId,
      messageId,
      arrivalTime: arrivalTime ? new Date(arrivalTime) : new Date(),
    });

    res.json({
      success: true,
      message: 'Arrival confirmed',
    });
  } catch (error) {
    logger.error('Error updating arrival:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update arrival',
    });
  }
});

/**
 * POST /api/v1/cross-chain/travel/:tokenId/completed
 * Handle cross-chain travel completion
 */
router.post('/travel/:tokenId/completed', async (req: Request, res: Response) => {
  try {
    const tokenId = parseInt(req.params.tokenId);
    const { returnMessageId, xpEarned, txHash } = req.body;

    await travelCommandServiceV1.markCrossChainCompleted({
      tokenId,
      returnMessageId,
      xpEarned: xpEarned || 0,
      txHash,
    });

    res.json({
      success: true,
      message: 'Travel completed',
    });
  } catch (error) {
    logger.error('Error completing travel:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete travel',
    });
  }
});

/**
 * GET /api/v1/cross-chain/travel/:tokenId/status
 * Get cross-chain travel status from on-chain
 */
router.get('/travel/:tokenId/status', async (req: Request, res: Response) => {
  try {
    const tokenId = parseInt(req.params.tokenId);

    const data = await travelQueryServiceV1.getCrossChainStatus(tokenId);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error getting travel status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get status',
    });
  }
});

/**
 * GET /api/v1/cross-chain/travel/:tokenId/visiting
 * Check if frog is visiting target chain
 */
router.get('/travel/:tokenId/visiting', async (req: Request, res: Response) => {
  try {
    const tokenId = parseInt(req.params.tokenId);
    const targetChainId = parseInt(req.query.targetChainId as string) || 97;

    const result = await travelQueryServiceV1.getCrossChainVisitingStatus(tokenId, targetChainId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error checking visiting status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check visiting status',
    });
  }
});

/**
 * GET /api/v1/cross-chain/active
 * Get all active cross-chain travels
 */
router.get('/active', async (req: Request, res: Response) => {
  try {
    const travels = await travelQueryServiceV1.getActiveCrossChainTravels();

    res.json({
      success: true,
      data: travels,
    });
  } catch (error) {
    logger.error('Error getting active travels:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active travels',
    });
  }
});

/**
 * POST /api/v1/cross-chain/sync/:tokenId
 * Sync database with on-chain state
 */
router.post('/sync/:tokenId', async (req: Request, res: Response) => {
  try {
    const tokenId = parseInt(req.params.tokenId);

    await travelCommandServiceV1.syncCrossChainState(tokenId);

    res.json({
      success: true,
      message: 'State synced',
    });
  } catch (error) {
    logger.error('Error syncing state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync state',
    });
  }
});

/**
 * GET /api/cross-chain/travel/:travelId/discoveries
 * Get discoveries and on-chain stats for a travel
 */
router.get('/travel/:travelId/discoveries', async (req: Request, res: Response) => {
  try {
    const travelId = parseInt(req.params.travelId);
    const data = await travelQueryServiceV1.getCrossChainDiscoveries(travelId);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error getting discoveries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get discoveries',
    });
  }
});

export default router;
