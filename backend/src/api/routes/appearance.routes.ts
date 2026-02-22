/**
 * 个性化青蛙外观 API 路由
 * 
 * 提供生成、获取、元数据接口
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../../database';
import {
  appearanceService,
  verifySignature,
  checkCooldown,
  mapToOpenSeaMetadata,
  resetGenerateState,
} from '../../services/appearance.service';
import { 
  FrogAppearanceParams,
  GenerateAppearanceRequest,
  GenerateAppearanceResponse,
  GetAppearanceResponse,
} from '../../types/appearance';
import { logger } from '../../utils/logger';

const router = Router();

// ============ B6: 生成外观参数 ============

/**
 * POST /api/frogs/appearance/generate
 * 
 * 生成个性化外观参数（混合模式）
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { walletAddress, signature, message } = req.body as GenerateAppearanceRequest;
    
    // 验证必填参数
    if (!walletAddress) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing walletAddress' 
      });
    }
    
    // 验证钱包地址格式
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid wallet address format' 
      });
    }
    
    // 签名校验 (可选，生产环境建议开启)
    if (signature && message) {
      const isValid = verifySignature(walletAddress, message, signature);
      if (!isValid) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid signature' 
        });
      }
    }
    
    // 检查是否已有青蛙
    const existingFrog = await prisma.frog.findUnique({
      where: { ownerAddress: walletAddress.toLowerCase() },
    });
    
    if (existingFrog && existingFrog.appearanceParams) {
      return res.status(400).json({
        success: false,
        error: 'Frog already minted, appearance cannot be regenerated',
        params: existingFrog.appearanceParams as unknown as FrogAppearanceParams,
      });
    }
    
    // 生成外观参数
    const result = await appearanceService.generateAppearance(
      walletAddress,
      signature,
      message
    );
    
    const response: GenerateAppearanceResponse = {
      success: true,
      params: result.params,
      regenerateRemaining: result.regenerateRemaining,
      regenerateToken: result.regenerateToken,
      isHidden: result.params.isHidden,
      cooldownUntil: result.cooldownUntil,
      descriptionPending: result.descriptionPending,
    };
    
    return res.json(response);
    
  } catch (error: any) {
    logger.error('Generate appearance error:', error);
    
    // 处理冷却时间错误
    if (error.message?.startsWith('COOLDOWN:')) {
      const cooldownUntil = parseInt(error.message.split(':')[1], 10);
      return res.status(429).json({
        success: false,
        error: 'Please wait before regenerating',
        cooldownUntil,
      });
    }
    
    // 处理次数限制错误
    if (error.message === 'REGENERATE_LIMIT_EXCEEDED') {
      return res.status(429).json({
        success: false,
        error: 'Maximum regeneration limit reached (3 times)',
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to generate appearance' 
    });
  }
});

// ============ B7: 获取外观参数 ============

/**
 * GET /api/frogs/:tokenId/appearance
 * 
 * 获取已保存的外观参数
 */
router.get('/:tokenId/appearance', async (req: Request, res: Response) => {
  try {
    const tokenId = parseInt(req.params.tokenId, 10);
    
    if (isNaN(tokenId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid tokenId' 
      });
    }
    
    const frog = await prisma.frog.findUnique({
      where: { tokenId },
      select: {
        appearanceParams: true,
        appearanceDesc: true,
        rarityTier: true,
        rarityScore: true,
        isHiddenEdition: true,
      },
    });
    
    if (!frog) {
      return res.status(404).json({ 
        success: false, 
        error: 'Frog not found' 
      });
    }
    
    const response: GetAppearanceResponse = {
      success: true,
      params: frog.appearanceParams as unknown as FrogAppearanceParams | null,
    };
    
    return res.json(response);
    
  } catch (error) {
    logger.error('Get appearance error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to get appearance' 
    });
  }
});

/**
 * GET /api/frogs/appearance/pending/:address
 * 
 * 获取待确认的外观参数（铸造前）
 */
router.get('/pending/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid address format' 
      });
    }
    
    const params = appearanceService.getPendingParams(address);
    
    return res.json({
      success: true,
      params,
      ready: params?.description ? true : false,
    });
    
  } catch (error) {
    logger.error('Get pending appearance error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to get pending appearance' 
    });
  }
});

// ============ B11: OpenSea 元数据 ============

/**
 * GET /api/frogs/:tokenId/metadata
 * 
 * 获取 OpenSea 标准格式元数据
 */
router.get('/:tokenId/metadata', async (req: Request, res: Response) => {
  try {
    const tokenId = parseInt(req.params.tokenId, 10);
    
    if (isNaN(tokenId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid tokenId' 
      });
    }
    
    const frog = await prisma.frog.findUnique({
      where: { tokenId },
      select: {
        name: true,
        appearanceParams: true,
        appearanceDesc: true,
      },
    });
    
    if (!frog) {
      return res.status(404).json({ 
        success: false, 
        error: 'Frog not found' 
      });
    }
    
    if (!frog.appearanceParams) {
      // 返回基础元数据（无外观参数）
      return res.json({
        name: `ZetaFrog #${tokenId}`,
        description: `${frog.name} - A unique ZetaFrog NFT`,
        image: `https://api.zetafrog.xyz/frogs/${tokenId}/image.svg`,
        external_url: `https://zetafrog.xyz/frog/${tokenId}`,
        attributes: [],
      });
    }
    
    const metadata = mapToOpenSeaMetadata(
      tokenId,
      frog.appearanceParams as unknown as FrogAppearanceParams,
      frog.name
    );
    
    return res.json(metadata);
    
  } catch (error) {
    logger.error('Get metadata error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to get metadata' 
    });
  }
});

// ============ 内部接口: 保存外观 ============

/**
 * POST /api/frogs/appearance/confirm
 * 
 * 铸造成功后确认并保存外观参数
 * （由 frog.routes.ts 的铸造逻辑调用）
 */
router.post('/confirm', async (req: Request, res: Response) => {
  try {
    const { walletAddress, tokenId } = req.body;
    
    if (!walletAddress || !tokenId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing walletAddress or tokenId' 
      });
    }
    
    // 获取缓存的参数
    const params = appearanceService.getPendingParams(walletAddress);
    
    if (!params) {
      return res.status(400).json({ 
        success: false, 
        error: 'No pending appearance to confirm' 
      });
    }
    
    // 保存到数据库
    await prisma.frog.update({
      where: { tokenId: parseInt(tokenId, 10) },
      data: {
        appearanceParams: params as any,
        appearanceDesc: params.description,
        rarityTier: params.rarity.tier,
        rarityScore: params.rarity.score,
        isHiddenEdition: params.isHidden,
      },
    });
    
    // 清除缓存
    resetGenerateState(walletAddress);
    
    logger.info(`Appearance confirmed for frog #${tokenId}, rarity: ${params.rarity.tier}`);
    
    return res.json({ 
      success: true, 
      message: 'Appearance saved successfully' 
    });
    
  } catch (error) {
    logger.error('Confirm appearance error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to confirm appearance' 
    });
  }
});

export default router;
