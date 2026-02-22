/**
 * Homestead API Routes - 家园系统路由
 * 
 * Endpoints:
 * - /garden/:frogId/layout/:sceneType - 布局管理
 * - /garden/:frogId/decorations - 装饰品库存
 * - /garden/:frogId/gifts - 礼物管理
 * - /garden/:frogId/photos - 相册管理
 * - /achievements - 成就系统
 */

import { Router, Request, Response } from 'express';
import { decorationService } from '../../services/decoration.service';
import { giftService } from '../../services/gift.service';
import { photoService } from '../../services/photo.service';
import { achievementService } from '../../services/achievement.service';

const router = Router();

// ============ 装饰布局 API ============

/**
 * 获取房间布局
 */
router.get('/:frogId/layout/:sceneType', async (req: Request, res: Response) => {
  try {
    const { frogId, sceneType } = req.params;
    const layout = await decorationService.getLayout(parseInt(frogId), sceneType);
    res.json({ success: true, data: layout });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 保存完整布局 (POST) - V2.0 支持网格坐标
 */
router.post('/:frogId/layout/:sceneType', async (req: Request, res: Response) => {
  try {
    const { frogId, sceneType } = req.params;
    const { items, createSnapshot = true, sessionId, validateGrid = true } = req.body;
    
    const layout = await decorationService.saveLayout(
      parseInt(frogId),
      sceneType,
      items,
      { createSnapshot, sessionId, validateGrid }
    );
    
    // V2.0: 返回舒适度和 Buff 信息
    let activeBuffs: any[] = [];
    if (layout) {
      activeBuffs = await decorationService.getActiveBuffs(layout.id);
    }
    
    res.json({ 
      success: true, 
      data: { 
        ...layout,
        activeBuffs,
      } 
    });
  } catch (error: any) {
    if (error.message.startsWith('GRID_VALIDATION_FAILED')) {
      res.status(400).json({ success: false, error: error.message });
    } else if (error.message.startsWith('EDIT_LOCK_INVALID')) {
      res.status(409).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

/**
 * 增量更新布局 (PATCH)
 */
router.patch('/:frogId/layout/:sceneType', async (req: Request, res: Response) => {
  try {
    const { frogId, sceneType } = req.params;
    const { patches, expectedVersion } = req.body;
    
    const layout = await decorationService.patchLayout(
      parseInt(frogId),
      sceneType,
      patches,
      expectedVersion
    );
    
    res.json({ success: true, data: layout });
  } catch (error: any) {
    if (error.message.startsWith('VERSION_CONFLICT')) {
      res.status(409).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

/**
 * 获取布局历史
 */
router.get('/:frogId/layout/:sceneType/history', async (req: Request, res: Response) => {
  try {
    const { frogId, sceneType } = req.params;
    const limit = parseInt(req.query.limit as string) || 5;
    
    const snapshots = await decorationService.getLayoutSnapshots(
      parseInt(frogId),
      sceneType,
      limit
    );
    
    res.json({ success: true, data: snapshots });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ V2.0 编辑锁 API ============

/**
 * V2.0: 获取编辑锁
 */
router.post('/:frogId/layout/:sceneType/lock', async (req: Request, res: Response) => {
  try {
    const { frogId, sceneType } = req.params;
    const { sessionId, ttlMs } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required' });
    }

    // 获取布局
    const layout = await decorationService.getLayout(parseInt(frogId), sceneType);
    if (!layout) {
      return res.status(404).json({ success: false, error: 'Layout not found' });
    }

    const result = await decorationService.acquireEditLock(layout.id, sessionId, ttlMs);
    
    if (result.success) {
      res.json({ success: true, data: { locked: true, expiresAt: result.expiresAt } });
    } else {
      res.status(409).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * V2.0: 释放编辑锁
 */
router.delete('/:frogId/layout/:sceneType/lock', async (req: Request, res: Response) => {
  try {
    const { frogId, sceneType } = req.params;
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required' });
    }

    const layout = await decorationService.getLayout(parseInt(frogId), sceneType);
    if (!layout) {
      return res.status(404).json({ success: false, error: 'Layout not found' });
    }

    const released = await decorationService.releaseEditLock(layout.id, sessionId);
    
    res.json({ success: true, data: { released } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * V2.0: 释放编辑锁 (POST 替代 DELETE，用于前端兼容)
 */
router.post('/:frogId/layout/:sceneType/lock/release', async (req: Request, res: Response) => {
  try {
    const { frogId, sceneType } = req.params;
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required' });
    }

    const layout = await decorationService.getLayout(parseInt(frogId), sceneType);
    if (!layout) {
      return res.status(404).json({ success: false, error: 'Layout not found' });
    }

    const released = await decorationService.releaseEditLock(layout.id, sessionId);
    
    res.json({ success: true, data: { released } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ V2.0 舒适度 API ============

/**
 * V2.0: 获取舒适度和 Buff
 */
router.get('/:frogId/comfort', async (req: Request, res: Response) => {
  try {
    const { frogId } = req.params;
    const sceneType = (req.query.sceneType as string) || 'yard';

    const layout = await decorationService.getLayout(parseInt(frogId), sceneType);
    
    if (!layout) {
      return res.json({ 
        success: true, 
        data: { 
          comfortScore: 0, 
          maxScore: 100, 
          level: '空荡荡',
          activeBuffs: [] 
        } 
      });
    }

    const activeBuffs = await decorationService.getActiveBuffs(layout.id);
    
    // 根据舒适度分数确定等级
    let level = '空荡荡';
    if (layout.comfortScore >= 80) level = '超级舒适';
    else if (layout.comfortScore >= 60) level = '舒适';
    else if (layout.comfortScore >= 40) level = '温馨';
    else if (layout.comfortScore >= 20) level = '简陋';
    else if (layout.comfortScore > 0) level = '有点装饰';

    res.json({ 
      success: true, 
      data: { 
        comfortScore: layout.comfortScore,
        maxScore: 100,
        level,
        activeBuffs,
      } 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 恢复到快照
 */
router.post('/:frogId/layout/:sceneType/restore/:snapshotId', async (req: Request, res: Response) => {
  try {
    const { frogId, sceneType, snapshotId } = req.params;
    
    const layout = await decorationService.restoreSnapshot(
      parseInt(frogId),
      sceneType,
      snapshotId
    );
    
    res.json({ success: true, data: layout });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 装饰品库存 API ============

/**
 * 获取用户装饰品库存
 */
router.get('/:frogId/decorations', async (req: Request, res: Response) => {
  try {
    const { frogId } = req.params;
    const decorations = await decorationService.getUserDecorations(parseInt(frogId));
    res.json({ success: true, data: decorations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 获取未摆放的装饰品
 */
router.get('/:frogId/decorations/unplaced/:sceneType', async (req: Request, res: Response) => {
  try {
    const { frogId, sceneType } = req.params;
    const decorations = await decorationService.getUnplacedDecorations(parseInt(frogId), sceneType);
    res.json({ success: true, data: decorations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 礼物 API ============

// ============ 礼物 API ============

/**
 * 获取收到的礼物
 */
router.get('/:frogId/gifts', async (req: Request, res: Response) => {
  try {
    const { frogId } = req.params;
    const { unopenedOnly, page, pageSize } = req.query;
    
    // 验证青蛙存在
    const frog = await prisma.frog.findUnique({ where: { id: parseInt(frogId) } });
    if (!frog) return res.status(404).json({ success: false, error: 'Frog not found' });

    const result = await giftService.getReceivedGifts(parseInt(frogId), {
      unopenedOnly: unopenedOnly === 'true',
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
    });
    
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 发送礼物
 */
router.post('/:frogId/gifts', async (req: Request, res: Response) => {
  try {
    const { frogId } = req.params;
    const { fromAddress, giftType, itemName, quantity } = req.body;

    // 验证必填字段
    if (!fromAddress) return res.status(400).json({ success: false, error: 'fromAddress is required' });
    if (!giftType) return res.status(400).json({ success: false, error: 'giftType is required' });
    if (!itemName) return res.status(400).json({ success: false, error: 'itemName is required' });

    // 验证目标青蛙
    const targetFrog = await prisma.frog.findUnique({ where: { id: parseInt(frogId) } });
    if (!targetFrog) return res.status(404).json({ success: false, error: 'Target frog not found' });

    const giftData = { ...req.body, toFrogId: parseInt(frogId) };
    
    const gift = await giftService.sendGift(giftData);
    res.status(201).json({ success: true, data: gift });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 打开礼物
 */
router.post('/:frogId/gifts/:giftId/open', async (req: Request, res: Response) => {
  try {
    const { frogId, giftId } = req.params;
    const gift = await giftService.openGift(giftId, parseInt(frogId));
    res.json({ success: true, data: gift });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============ 相册 API ============

/**
 * 获取相册
 */
router.get('/:frogId/photos', async (req: Request, res: Response) => {
  try {
    const { frogId } = req.params;
    const { page, pageSize, nftOnly } = req.query;
    
    const result = await photoService.getPhotos(parseInt(frogId), {
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
      nftOnly: nftOnly === 'true',
    });
    
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 上传照片
 */
router.post('/:frogId/photos', async (req: Request, res: Response) => {
  try {
    const { frogId } = req.params;
    const { imageUrl } = req.body;

    // 验证必填字段
    if (!imageUrl) return res.status(400).json({ success: false, error: 'imageUrl is required' });

    const photoData = { ...req.body, frogId: parseInt(frogId) };
    
    const photo = await photoService.createPhoto(photoData);
    res.status(201).json({ success: true, data: photo });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 铸造照片为 NFT
 */
router.post('/:frogId/photos/:photoId/mint', async (req: Request, res: Response) => {
  try {
    const { photoId } = req.params;
    const { nftContract, nftTokenId, mintTxHash } = req.body;
    
    const photo = await photoService.markPhotoAsNft({
      photoId,
      nftContract,
      nftTokenId,
      mintTxHash,
    });
    
    res.json({ success: true, data: photo });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 点赞照片
 */
router.post('/:frogId/photos/:photoId/like', async (req: Request, res: Response) => {
  try {
    const { photoId } = req.params;
    const photo = await photoService.likePhoto(photoId);
    res.json({ success: true, data: photo });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 成就 API ============

/**
 * 获取所有成就定义
 */
router.get('/achievements', async (_req: Request, res: Response) => {
  try {
    const achievements = await achievementService.getAllAchievements();
    res.json({ success: true, data: achievements });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 获取青蛙的成就
 */
router.get('/:frogId/achievements', async (req: Request, res: Response) => {
  try {
    const { frogId } = req.params;
    
    const [earned, progress] = await Promise.all([
      achievementService.getEarnedAchievements(parseInt(frogId)),
      achievementService.getAchievementProgress(parseInt(frogId)),
    ]);
    
    res.json({ success: true, data: { earned, progress } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 检查并解锁成就
 */
router.post('/:frogId/achievements/check', async (req: Request, res: Response) => {
  try {
    const { frogId } = req.params;
    const newlyUnlocked = await achievementService.checkAndUnlockAchievements(parseInt(frogId));
    res.json({ success: true, data: { newlyUnlocked } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 记录 SBT 铸造
 */
router.post('/:frogId/achievements/:achievementId/mint-sbt', async (req: Request, res: Response) => {
  try {
    const { frogId, achievementId } = req.params;
    const { sbtTokenId, sbtTxHash } = req.body;
    
    const earned = await achievementService.recordSbtMint({
      frogId: parseInt(frogId),
      achievementId,
      sbtTokenId,
      sbtTxHash,
    });
    
    res.json({ success: true, data: earned });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ Web3 打赏 API ============

import { signatureService } from '../../services/signature.service';
import { prisma } from '../../database';

/**
 * 验证打赏交易并记录
 */
router.post('/messages/:messageId/tip', async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { txHash, tipAmount, fromAddress } = req.body;

    // 获取消息
    const message = await prisma.visitorMessage.findUnique({
      where: { id: parseInt(messageId) },
    });

    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    // 更新打赏信息
    const updated = await prisma.visitorMessage.update({
      where: { id: parseInt(messageId) },
      data: {
        tipAmount,
        tipTxHash: txHash,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 发送带签名的留言
 */
    // 发送带签名的留言
    router.post('/:frogId/messages', async (req: Request, res: Response) => {
      try {
        const { frogId } = req.params;
        const { message, emoji, signature, timestamp, fromAddress } = req.body;
        let { fromFrogId } = req.body;

        // 1. 验证 fromFrogId
        if (!fromFrogId) {
           return res.status(400).json({ success: false, error: 'fromFrogId is required' });
        }
        fromFrogId = parseInt(fromFrogId.toString());

        // 2. 获取目标青蛙信息以确定 toAddress
        const targetFrog = await prisma.frog.findUnique({
          where: { id: parseInt(frogId) },
        });

        if (!targetFrog) {
          return res.status(404).json({ success: false, error: 'Target frog not found' });
        }
        
        const toAddress = targetFrog.ownerAddress;

        // 3. 如果有签名，验证签名
        if (signature && timestamp && fromAddress) {
          const verification = await signatureService.verifyMessageSignature(
            signature,
            fromFrogId,
            toAddress, // Use derived toAddress
            message,
            timestamp,
            fromAddress
          );

          if (!verification.valid) {
            return res.status(400).json({ success: false, error: verification.error });
          }
        }

        // 4. 创建留言
        const newMessage = await prisma.visitorMessage.create({
          data: {
            fromFrogId,
            toAddress,
            message,
            emoji,
            signature,
          },
          include: {
            fromFrog: true,
          },
        });

        res.status(201).json({ success: true, data: newMessage });
      } catch (error: any) {
        console.error('Create message error:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

/**
 * 获取留言列表
 */
router.get('/:frogId/messages', async (req: Request, res: Response) => {
  try {
    const { frogId } = req.params;
    
    const frog = await prisma.frog.findUnique({
      where: { id: parseInt(frogId) },
    });

    if (!frog) {
      return res.status(404).json({ success: false, error: 'Frog not found' });
    }

    const messages = await prisma.visitorMessage.findMany({
      where: { toAddress: frog.ownerAddress },
      include: { fromFrog: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ success: true, data: messages });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 点赞留言
 */
router.post('/:frogId/messages/:messageId/like', async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { likerAddress } = req.body;

    const message = await prisma.visitorMessage.findUnique({
      where: { id: parseInt(messageId) },
    });

    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    // 检查是否已点赞
    if (likerAddress && message.likedBy.includes(likerAddress.toLowerCase())) {
      return res.status(400).json({ success: false, error: 'Already liked' });
    }

    const updated = await prisma.visitorMessage.update({
      where: { id: parseInt(messageId) },
      data: {
        likesCount: { increment: 1 },
        ...(likerAddress && {
          likedBy: { push: likerAddress.toLowerCase() },
        }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

