/**
 * Cross-Chain Travel API Routes
 * 
 * Endpoints for managing cross-chain frog travel
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { omniTravelService } from '../../services/omni-travel.service';
import { logger } from '../../utils/logger';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/v1/cross-chain/supported-chains
 * Get list of supported chains for cross-chain travel
 */
router.get('/supported-chains', async (req: Request, res: Response) => {
  try {
    const chains = omniTravelService.getSupportedChains();
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

    const result = await omniTravelService.canStartCrossChainTravel(tokenId, targetChainId);
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
    const { frogId, tokenId, targetChainId, duration, ownerAddress } = req.body;

    if (!frogId || !tokenId || !targetChainId || !duration || !ownerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // Verify eligibility
    const eligibility = await omniTravelService.canStartCrossChainTravel(tokenId, targetChainId);
    if (!eligibility.canStart) {
      return res.status(400).json({
        success: false,
        error: eligibility.reason,
      });
    }

    // Create travel record
    const result = await omniTravelService.createCrossChainTravelRecord(
      frogId,
      tokenId,
      targetChainId,
      duration,
      ownerAddress
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
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

    await omniTravelService.onCrossChainTravelStarted(travelId, messageId, txHash);

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

    await omniTravelService.onFrogArrivedAtTarget(
      tokenId,
      messageId,
      arrivalTime ? new Date(arrivalTime) : new Date()
    );

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

    await omniTravelService.onCrossChainTravelCompleted(
      tokenId,
      returnMessageId,
      xpEarned || 0,
      txHash
    );

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

    const onChainStatus = await omniTravelService.getCrossChainTravelStatus(tokenId);
    
    // Also get database record
    const dbTravel = await prisma.travel.findFirst({
      where: {
        frog: { tokenId },
        isCrossChain: true,
        status: { in: ['Active', 'Processing'] },
      },
    });

    res.json({
      success: true,
      data: {
        onChain: onChainStatus,
        database: dbTravel ? {
          id: dbTravel.id,
          status: dbTravel.status,
          crossChainStatus: dbTravel.crossChainStatus,
          progress: dbTravel.progress,
          targetChain: dbTravel.targetChain,
        } : null,
      },
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

    const result = await omniTravelService.checkVisitingFrogOnChain(tokenId, targetChainId);

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
    const travels = await omniTravelService.getActiveCrossChainTravels();

    res.json({
      success: true,
      data: travels.map(t => ({
        id: t.id,
        frogTokenId: t.frog.tokenId,
        frogName: t.frog.name,
        targetChain: t.targetChain,
        crossChainStatus: t.crossChainStatus,
        progress: t.progress,
        startTime: t.startTime,
        endTime: t.endTime,
      })),
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

    await omniTravelService.syncCrossChainTravelState(tokenId);

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

    // Get travel record with discoveries
    const travel = await prisma.travel.findUnique({
      where: { id: travelId },
      include: {
        discoveries: {
          orderBy: { createdAt: 'desc' },
        },
        frog: true,
      },
    });

    if (!travel) {
      return res.status(404).json({
        success: false,
        error: 'Travel not found',
      });
    }

    // Format discoveries
    const discoveries = travel.discoveries.map(d => ({
      id: d.id,
      type: d.type,
      title: d.title,
      description: d.description,
      rarity: d.rarity,
      blockNumber: d.blockNumber,
      createdAt: d.createdAt,
    }));

    // Get on-chain stats - try to get real data from CrossChainMessage or transaction
    let gasUsed: string | null = null;
    let exploredBlock = travel.exploredBlock ? Number(travel.exploredBlock) : null;
    
    // Try to get gasUsed from CrossChainMessage table
    if (travel.crossChainMessageId) {
      const crossChainMessage = await prisma.crossChainMessage.findUnique({
        where: { messageId: travel.crossChainMessageId },
      });
      if (crossChainMessage?.gasUsed) {
        gasUsed = crossChainMessage.gasUsed;
      }
    }
    
    // Try to get block number from TravelInteraction if not available
    if (!exploredBlock) {
      const latestInteraction = await prisma.travelInteraction.findFirst({
        where: { travelId: travel.id },
        orderBy: { createdAt: 'desc' },
      });
      if (latestInteraction?.blockNumber) {
        exploredBlock = Number(latestInteraction.blockNumber);
      }
    }

    const onChainStats = {
      exploredBlock,
      gasUsed: gasUsed || null, // Return null if no real data, frontend will handle
      targetChain: travel.targetChain,
      exploredAddress: (travel.exploredSnapshot as any)?.address || travel.targetWallet,
    };

    res.json({
      success: true,
      data: {
        discoveries,
        onChainStats,
        summary: {
          total: discoveries.length,
          byType: discoveries.reduce((acc, d) => {
            acc[d.type] = (acc[d.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          byRarity: discoveries.reduce((acc, d) => {
            acc[d.rarity] = (acc[d.rarity] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        },
      },
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
