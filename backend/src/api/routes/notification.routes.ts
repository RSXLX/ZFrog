/**
 * 🐸 宠物蛋系统 - 通知 API 路由
 * P3.2: 通知系统
 */

import { Router } from 'express';
import { prisma } from '../../database';
import * as notificationService from '../../services/notification.service';
import { ApiRes } from '../../utils/apiResponse';

const router: Router = Router();

/**
 * GET /api/notifications/:frogId
 * 获取通知列表
 */
router.get('/:frogId', async (req, res) => {
  try {
    const frogId = parseInt(req.params.frogId);
    const { limit = '20', offset = '0', unreadOnly = 'false', type } = req.query;
    if (isNaN(frogId)) {
      return ApiRes.validationError(res, 'Invalid frogId');
    }

    // 验证青蛙是否存在
    const frog = await prisma.frog.findUnique({
      where: { tokenId: frogId },
    });

    if (!frog) {
      return ApiRes.notFound(res, 'Frog not found');
    }

    const result = await notificationService.getNotifications(frog.id, {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      unreadOnly: unreadOnly === 'true',
      type: type as string,
    });

    return ApiRes.success(res, result);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return ApiRes.serverError(res, error as Error);
  }
});

/**
 * GET /api/notifications/:frogId/unread-count
 * 获取未读通知数量
 */
router.get('/:frogId/unread-count', async (req, res) => {
  try {
    const frogId = parseInt(req.params.frogId);
    if (isNaN(frogId)) {
      return ApiRes.validationError(res, 'Invalid frogId');
    }

    const frog = await prisma.frog.findUnique({
      where: { tokenId: frogId },
    });

    if (!frog) {
      return ApiRes.notFound(res, 'Frog not found');
    }

    const count = await notificationService.getUnreadCount(frog.id);
    return ApiRes.success(res, { count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return ApiRes.serverError(res, error as Error);
  }
});

/**
 * PUT /api/notifications/:notificationId/read
 * 标记单个通知为已读
 */
router.put('/:notificationId/read', async (req, res) => {
  try {
    const notificationId = parseInt(req.params.notificationId);
    if (isNaN(notificationId)) {
      return ApiRes.validationError(res, 'Invalid notificationId');
    }

    await notificationService.markAsRead(notificationId);
    return ApiRes.success(res, null, 'Notification marked as read');
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return ApiRes.serverError(res, error as Error);
  }
});

/**
 * PUT /api/notifications/:frogId/read-all
 * 标记所有通知为已读
 */
router.put('/:frogId/read-all', async (req, res) => {
  try {
    const frogId = parseInt(req.params.frogId);
    if (isNaN(frogId)) {
      return ApiRes.validationError(res, 'Invalid frogId');
    }

    const frog = await prisma.frog.findUnique({
      where: { tokenId: frogId },
    });

    if (!frog) {
      return ApiRes.notFound(res, 'Frog not found');
    }

    await notificationService.markAllAsRead(frog.id);
    return ApiRes.success(res, null, 'All notifications marked as read');
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return ApiRes.serverError(res, error as Error);
  }
});

/**
 * DELETE /api/notifications/:notificationId
 * 删除通知
 */
router.delete('/:notificationId', async (req, res) => {
  try {
    const notificationId = parseInt(req.params.notificationId);
    if (isNaN(notificationId)) {
      return ApiRes.validationError(res, 'Invalid notificationId');
    }

    await notificationService.deleteNotification(notificationId);
    return ApiRes.deleted(res, 'Notification deleted');
  } catch (error) {
    console.error('Error deleting notification:', error);
    return ApiRes.serverError(res, error as Error);
  }
});

export default router;
