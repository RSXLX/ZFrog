/**
 * 🐸 宠物蛋系统 - 通知 API 路由
 * P3.2: 通知系统
 */

import { Router } from 'express';
import { prisma } from '../../database';
import * as notificationService from '../../services/notification.service';

const router = Router();

/**
 * GET /api/notifications/:frogId
 * 获取通知列表
 */
router.get('/:frogId', async (req, res) => {
  try {
    const frogId = parseInt(req.params.frogId);
    const { limit = '20', offset = '0', unreadOnly = 'false', type } = req.query;

    // 验证青蛙是否存在
    const frog = await prisma.frog.findUnique({
      where: { tokenId: frogId },
    });

    if (!frog) {
      return res.status(404).json({ error: 'Frog not found' });
    }

    const result = await notificationService.getNotifications(frog.id, {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      unreadOnly: unreadOnly === 'true',
      type: type as string,
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/notifications/:frogId/unread-count
 * 获取未读通知数量
 */
router.get('/:frogId/unread-count', async (req, res) => {
  try {
    const frogId = parseInt(req.params.frogId);

    const frog = await prisma.frog.findUnique({
      where: { tokenId: frogId },
    });

    if (!frog) {
      return res.status(404).json({ error: 'Frog not found' });
    }

    const count = await notificationService.getUnreadCount(frog.id);
    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/notifications/:notificationId/read
 * 标记单个通知为已读
 */
router.put('/:notificationId/read', async (req, res) => {
  try {
    const notificationId = parseInt(req.params.notificationId);

    await notificationService.markAsRead(notificationId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/notifications/:frogId/read-all
 * 标记所有通知为已读
 */
router.put('/:frogId/read-all', async (req, res) => {
  try {
    const frogId = parseInt(req.params.frogId);

    const frog = await prisma.frog.findUnique({
      where: { tokenId: frogId },
    });

    if (!frog) {
      return res.status(404).json({ error: 'Frog not found' });
    }

    await notificationService.markAllAsRead(frog.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/notifications/:notificationId
 * 删除通知
 */
router.delete('/:notificationId', async (req, res) => {
  try {
    const notificationId = parseInt(req.params.notificationId);

    await notificationService.deleteNotification(notificationId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
