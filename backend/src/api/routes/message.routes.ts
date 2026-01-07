/**
 * 串门留言 API 路由
 */

import { Router } from 'express';
import { prisma } from '../../database';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * POST /api/messages/leave
 * 留下串门留言
 */
router.post('/leave', async (req, res) => {
  try {
    const { fromFrogId, toAddress, message, travelId, emoji } = req.body;
    
    if (!fromFrogId || !toAddress || !message) {
      return res.status(400).json({
        success: false,
        error: 'fromFrogId, toAddress and message are required'
      });
    }
    
    // 验证青蛙存在
    const frog = await prisma.frog.findUnique({
      where: { id: parseInt(fromFrogId) }
    });
    
    if (!frog) {
      return res.status(404).json({
        success: false,
        error: 'Frog not found'
      });
    }
    
    // 创建留言
    const visitorMessage = await prisma.visitorMessage.create({
      data: {
        fromFrogId: parseInt(fromFrogId),
        toAddress: toAddress.toLowerCase(),
        message: message.slice(0, 500), // 限制长度
        travelId: travelId ? parseInt(travelId) : null,
        emoji: emoji || '🐸',
      },
      include: {
        fromFrog: {
          select: { name: true, tokenId: true }
        }
      }
    });
    
    logger.info(`[Message] ${frog.name} left a message at ${toAddress}`);
    
    res.json({
      success: true,
      data: visitorMessage,
      message: `${frog.name} 留下了一条消息！`
    });
    
  } catch (error: any) {
    logger.error('[Message] Error leaving message:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

/**
 * GET /api/messages/inbox/:address
 * 获取收到的留言
 */
router.get('/inbox/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const unreadOnly = req.query.unreadOnly === 'true';
    
    const whereClause: any = {
      toAddress: address.toLowerCase()
    };
    
    if (unreadOnly) {
      whereClause.isRead = false;
    }
    
    const [messages, total, unreadCount] = await Promise.all([
      prisma.visitorMessage.findMany({
        where: whereClause,
        include: {
          fromFrog: {
            select: { name: true, tokenId: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.visitorMessage.count({ where: { toAddress: address.toLowerCase() } }),
      prisma.visitorMessage.count({ where: { toAddress: address.toLowerCase(), isRead: false } }),
    ]);
    
    res.json({
      success: true,
      data: {
        messages,
        total,
        unreadCount,
        hasMore: offset + messages.length < total
      }
    });
    
  } catch (error: any) {
    logger.error('[Message] Error fetching inbox:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

/**
 * POST /api/messages/read/:messageId
 * 标记消息为已读
 */
router.post('/read/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await prisma.visitorMessage.update({
      where: { id: parseInt(messageId) },
      data: { isRead: true }
    });
    
    res.json({
      success: true,
      data: message
    });
    
  } catch (error: any) {
    logger.error('[Message] Error marking as read:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

/**
 * POST /api/messages/read-all/:address
 * 标记所有消息为已读
 */
router.post('/read-all/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    const result = await prisma.visitorMessage.updateMany({
      where: {
        toAddress: address.toLowerCase(),
        isRead: false
      },
      data: { isRead: true }
    });
    
    res.json({
      success: true,
      data: { markedCount: result.count },
      message: `已将 ${result.count} 条消息标记为已读`
    });
    
  } catch (error: any) {
    logger.error('[Message] Error marking all as read:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

/**
 * GET /api/messages/sent/:frogId
 * 获取青蛙发送的留言
 */
router.get('/sent/:frogId', async (req, res) => {
  try {
    const { frogId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const messages = await prisma.visitorMessage.findMany({
      where: { fromFrogId: parseInt(frogId) },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });
    
    const total = await prisma.visitorMessage.count({
      where: { fromFrogId: parseInt(frogId) }
    });
    
    res.json({
      success: true,
      data: {
        messages,
        total,
        hasMore: offset + messages.length < total
      }
    });
    
  } catch (error: any) {
    logger.error('[Message] Error fetching sent messages:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

export default router;
