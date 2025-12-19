import { Router } from 'express';
import { NFTImageOrchestratorService } from '../../services/nft-image-orchestrator.service';
import { PrismaClient } from '@prisma/client';

const router = Router();
const orchestrator = new NFTImageOrchestratorService();
const prisma = new PrismaClient();

/**
 * POST /api/nft-image/generate
 * 生成纪念品图片
 */
router.post('/generate', async (req, res) => {
  try {
    const { odosId, travelId, souvenirId, souvenirType, rarity, chainId } = req.body;

    // 验证必需参数
    if (!odosId || !travelId || !souvenirId || !souvenirType || !rarity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: odosId, travelId, souvenirId, souvenirType, rarity',
      });
    }

    const result = await orchestrator.generateSouvenirImage({
      odosId,
      travelId,
      souvenirId,
      souvenirType,
      rarity,
      chainId,
    });

    res.json(result);
  } catch (error: any) {
    console.error('[NFT-Image] Generate error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/nft-image/generate-batch
 * 批量生成纪念品图片
 */
router.post('/generate-batch', async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'items must be a non-empty array',
      });
    }

    // 验证每个项目
    for (const item of items) {
      if (!item.odosId || !item.travelId || !item.souvenirId || !item.souvenirType || !item.rarity) {
        return res.status(400).json({
          success: false,
          error: 'Each item must contain: odosId, travelId, souvenirId, souvenirType, rarity',
        });
      }
    }

    const results = await orchestrator.generateBatch(items);

    res.json({
      success: true,
      results,
      total: items.length,
    });
  } catch (error: any) {
    console.error('[NFT-Image] Batch generate error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/nft-image/status/:souvenirId
 * 查询某个纪念品的生成状态
 */
router.get('/status/:souvenirId', async (req, res) => {
  try {
    const { souvenirId } = req.params;

    const record = await prisma.souvenirImage.findFirst({
      where: { souvenirId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        odosId: true,
        souvenirId: true,
        souvenirType: true,
        rarity: true,
        status: true,
        imageUrl: true,
        ipfsHash: true,
        gatewayUrl: true,
        errorMessage: true,
        createdAt: true,
        generatedAt: true,
        uploadedAt: true,
      },
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Generation record for this souvenir not found',
      });
    }

    res.json({
      success: true,
      record,
    });
  } catch (error: any) {
    console.error('[NFT-Image] Status query error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/nft-image/list/:odosId
 * 获取某个青蛙的所有图片
 */
router.get('/list/:odosId', async (req, res) => {
  try {
    const { odosId } = req.params;
    const { page = 1, limit = 20, status } = req.query;

    const where: any = { odosId };
    if (status) {
      where.status = status;
    }

    const [records, total] = await Promise.all([
      prisma.souvenirImage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        select: {
          id: true,
          souvenirType: true,
          rarity: true,
          status: true,
          imageUrl: true,
          ipfsHash: true,
          gatewayUrl: true,
          createdAt: true,
        },
      }),
      prisma.souvenirImage.count({ where }),
    ]);

    res.json({
      success: true,
      data: records,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('[NFT-Image] List query error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/nft-image/types
 * 获取所有纪念品类型
 */
router.get('/types', async (req, res) => {
  try {
    const { SOUVENIR_PROMPTS } = await import('../../config/prompt-templates');
    
    const types = Object.entries(SOUVENIR_PROMPTS).map(([key, value]) => ({
      type: key,
      name: value.name,
      nameZh: value.nameZh,
      rarities: Object.keys(value.rarityEnhance),
    }));

    res.json({
      success: true,
      types,
    });
  } catch (error: any) {
    console.error('[NFT-Image] Types query error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/nft-image/retry/:recordId
 * 重试失败的生成任务
 */
router.post('/retry/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;

    const record = await prisma.souvenirImage.findUnique({
      where: { id: recordId },
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Record not found',
      });
    }

    if (record.status !== 'FAILED') {
      return res.status(400).json({
        success: false,
        error: 'Only failed records can be retried',
      });
    }

    // 检查重试次数
    if (record.retryCount >= 3) {
      return res.status(400).json({
        success: false,
        error: 'Maximum retry attempts reached',
      });
    }

    // 重新生成
    const result = await orchestrator.generateSouvenirImage({
      odosId: record.odosId,
      travelId: record.travelId,
      souvenirId: record.souvenirId,
      souvenirType: record.souvenirType,
      rarity: record.rarity,
      chainId: record.chainId || undefined,
    });

    res.json(result);
  } catch (error: any) {
    console.error('[NFT-Image] Retry error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;