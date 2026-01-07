/**
 * Cross-Chain Transfer API Routes - 跨链转账 API
 * 
 * Endpoints:
 * - POST /create - 创建转账记录
 * - POST /confirm - 确认转账 (CCTX 完成)
 * - GET /:frogId/history - 获取转账历史
 * - GET /:frogId/stats - 获取转账统计
 * - GET /:frogId/friends - 获取可转账好友
 */

import { Router, Request, Response } from 'express';
import { crossChainTransferService } from '../../services/crosschain-transfer.service';

const router = Router();

/**
 * 创建跨链转账记录
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const {
      fromFrogId,
      fromAddress,
      toAddress,
      toFrogId,
      amount,
      tokenSymbol,
      sourceChain,
      targetChain,
      message,
    } = req.body;

    if (!fromFrogId || !fromAddress || !toAddress || !amount || !tokenSymbol || !sourceChain || !targetChain) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    const transfer = await crossChainTransferService.createTransfer({
      fromFrogId,
      fromAddress,
      toAddress,
      toFrogId,
      amount,
      tokenSymbol,
      sourceChain,
      targetChain,
      message,
    });

    res.status(201).json({ success: true, data: transfer });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 确认跨链转账 (CCTX 完成后调用)
 */
router.post('/confirm', async (req: Request, res: Response) => {
  try {
    const { transferId, cctxHash, status, targetTxHash } = req.body;

    if (!transferId || !cctxHash || !status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    const transfer = await crossChainTransferService.updateTransferStatus({
      transferId,
      cctxHash,
      status,
      targetTxHash,
    });

    res.json({ success: true, data: transfer });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 获取转账历史
 */
router.get('/:frogId/history', async (req: Request, res: Response) => {
  try {
    const { frogId } = req.params;
    const { type, limit, offset } = req.query;

    const result = await crossChainTransferService.getTransferHistory(
      parseInt(frogId),
      {
        type: type as 'sent' | 'received' | 'all',
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      }
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 获取转账统计
 */
router.get('/:frogId/stats', async (req: Request, res: Response) => {
  try {
    const { frogId } = req.params;
    const stats = await crossChainTransferService.getTransferStats(parseInt(frogId));
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 获取可转账好友列表
 */
router.get('/:frogId/friends', async (req: Request, res: Response) => {
  try {
    const { frogId } = req.params;
    const friends = await crossChainTransferService.getTransferableFriends(parseInt(frogId));
    res.json({ success: true, data: friends });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
