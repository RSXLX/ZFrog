// backend/src/api/routes/address.routes.ts
// V2.0 地址分析 API

import { Router } from 'express';
import { addressAnalysisService } from '../../services/travel/address-analysis.service';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * GET /api/address/analyze
 * 分析地址类型（普通/合约/DeFi/巨鲸）
 */
router.get('/analyze', async (req, res) => {
  try {
    const { address, chainId } = req.query;

    if (!address || typeof address !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Address is required',
      });
    }

    const parsedChainId = parseInt(chainId as string) || 7001;

    logger.info(`[AddressAPI] Analyzing address ${address} on chain ${parsedChainId}`);

    const result = await addressAnalysisService.analyzeAddress(address, parsedChainId);

    res.json({
      success: true,
      data: {
        address,
        chainId: parsedChainId,
        type: result.type,
        bonus: result.bonus,
        name: result.name,
        protocolType: result.protocolType,
      },
    });
  } catch (error: any) {
    logger.error('[AddressAPI] Error analyzing address:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze address',
      details: error.message,
    });
  }
});

/**
 * GET /api/address/:address/protocol
 * 获取 DeFi 协议信息
 */
router.get('/:address/protocol', async (req, res) => {
  try {
    const { address } = req.params;
    const protocol = addressAnalysisService.getProtocolInfo(address);

    if (protocol) {
      res.json({
        success: true,
        data: {
          address,
          isDefiProtocol: true,
          name: protocol.name,
          type: protocol.type,
        },
      });
    } else {
      res.json({
        success: true,
        data: {
          address,
          isDefiProtocol: false,
        },
      });
    }
  } catch (error: any) {
    logger.error('[AddressAPI] Error getting protocol info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get protocol info',
    });
  }
});

export default router;
