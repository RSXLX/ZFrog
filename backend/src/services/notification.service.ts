/**
 * 🐸 宠物蛋系统 - 通知服务
 * P3.2: 通知系统
 * P4: 集成 Socket.IO 实时推送
 */

import { prisma } from '../database';
import { notifyNotification, notifyStatusWarning, notifyUnreadCountChanged } from '../websocket';

// 通知类型枚举
export const NotificationType = {
  HUNGER_WARNING: 'hunger_warning',
  CLEAN_WARNING: 'clean_warning',
  SICK_WARNING: 'sick_warning',
  TRAVEL_COMPLETE: 'travel_complete',
  BLESSING_COMPLETED: 'blessing_completed',
  RESCUE_COMPLETED: 'rescue_completed',
  FRIEND_GIFT: 'friend_gift',
  FRIEND_VISIT: 'friend_visit',
  FRIEND_REQUEST: 'friend_request',
  EVOLUTION_READY: 'evolution_ready',
  LEVEL_UP: 'level_up',
  INTIMACY_LEVEL_UP: 'intimacy_level_up',
  TASK_COMPLETE: 'task_complete',
  DEATH_WARNING: 'death_warning',
  DROWSY_WARNING: 'drowsy_warning',
  SLEEPING_WARNING: 'sleeping_warning',
} as const;

// 优先级枚举
export const NotificationPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

// 通知模板
const NOTIFICATION_TEMPLATES: Record<string, { 
  title: string; 
  message: string; 
  priority: string;
  icon: string;
}> = {
  [NotificationType.HUNGER_WARNING]: {
    title: '饥饿警告',
    message: '🐸 {frogName}饿了！快来喂食吧~',
    priority: NotificationPriority.HIGH,
    icon: '🍔',
  },
  [NotificationType.CLEAN_WARNING]: {
    title: '清洁提醒',
    message: '💩 {frogName}的环境需要打扫了！',
    priority: NotificationPriority.MEDIUM,
    icon: '🧹',
  },
  [NotificationType.SICK_WARNING]: {
    title: '生病警告',
    message: '🏥 {frogName}生病了！请尽快治疗',
    priority: NotificationPriority.URGENT,
    icon: '💊',
  },
  [NotificationType.TRAVEL_COMPLETE]: {
    title: '旅行归来',
    message: '✈️ {frogName}旅行归来！快来看看带回了什么',
    priority: NotificationPriority.HIGH,
    icon: '🎁',
  },
  [NotificationType.BLESSING_COMPLETED]: {
    title: '祈福成功',
    message: '🙏 {blesserName} 为 {frogName} 完成了一次祈福',
    priority: NotificationPriority.MEDIUM,
    icon: '🙏',
  },
  [NotificationType.RESCUE_COMPLETED]: {
    title: '救援完成',
    message: '🆘 {rescuerName} 成功救援了 {frogName}',
    priority: NotificationPriority.HIGH,
    icon: '🆘',
  },
  [NotificationType.FRIEND_GIFT]: {
    title: '收到礼物',
    message: '🎁 好友{senderName}给你送了礼物！',
    priority: NotificationPriority.LOW,
    icon: '🎁',
  },
  [NotificationType.FRIEND_VISIT]: {
    title: '好友来访',
    message: '🏠 好友{senderName}来拜访{frogName}了！',
    priority: NotificationPriority.LOW,
    icon: '🏠',
  },
  [NotificationType.FRIEND_REQUEST]: {
    title: '好友请求',
    message: '💕 {senderName}想和{frogName}成为好友',
    priority: NotificationPriority.MEDIUM,
    icon: '💕',
  },
  [NotificationType.EVOLUTION_READY]: {
    title: '可以进化',
    message: '✨ {frogName}可以进化了！',
    priority: NotificationPriority.MEDIUM,
    icon: '✨',
  },
  [NotificationType.LEVEL_UP]: {
    title: '升级啦',
    message: '⬆️ {frogName}升到了{level}级！',
    priority: NotificationPriority.MEDIUM,
    icon: '⬆️',
  },
  [NotificationType.INTIMACY_LEVEL_UP]: {
    title: '亲密度提升',
    message: '💗 你和{friendName}的亲密度升级为「{levelName}」！',
    priority: NotificationPriority.MEDIUM,
    icon: '💗',
  },
  [NotificationType.TASK_COMPLETE]: {
    title: '任务完成',
    message: '✅ 任务「{taskName}」已完成！快来领取奖励',
    priority: NotificationPriority.MEDIUM,
    icon: '✅',
  },
  [NotificationType.DEATH_WARNING]: {
    title: '紧急警告',
    message: '⚠️ {frogName}状态很差，请立即照顾！',
    priority: NotificationPriority.URGENT,
    icon: '⚠️',
  },
};

/**
 * 格式化通知消息
 */
function formatMessage(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] || ''));
}

/**
 * 创建通知
 */
export async function createNotification(
  frogId: number,
  type: string,
  params: Record<string, string | number> = {},
  customTitle?: string,
  customMessage?: string
) {
  const template = NOTIFICATION_TEMPLATES[type];
  if (!template && !customTitle) {
    throw new Error(`Unknown notification type: ${type}`);
  }

  const title = customTitle || template.title;
  const message = customMessage || formatMessage(template.message, params);
  const priority = template?.priority || NotificationPriority.MEDIUM;

  const notification = await prisma.notification.create({
    data: {
      frogId,
      type,
      title,
      message,
      priority,
      metadata: params as any,
    },
  });

  // P4: 发送 Socket.IO 实时通知
  try {
    // 获取 frog 的 tokenId
    const frog = await prisma.frog.findUnique({ where: { id: frogId }, select: { tokenId: true } });
    if (frog) {
      notifyNotification(frog.tokenId, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        metadata: params,
      });
    }
  } catch (err) {
    console.error('Error sending notification via WebSocket:', err);
  }

  return notification;
}

/**
 * 获取未读通知数量
 */
export async function getUnreadCount(frogId: number): Promise<number> {
  return prisma.notification.count({
    where: {
      frogId,
      isRead: false,
    },
  });
}

/**
 * 获取通知列表
 */
export async function getNotifications(
  frogId: number,
  options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    type?: string;
  } = {}
) {
  const { limit = 20, offset = 0, unreadOnly = false, type } = options;

  const where: any = { frogId };
  if (unreadOnly) where.isRead = false;
  if (type) where.type = type;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where }),
  ]);

  return { notifications, total, unreadCount: await getUnreadCount(frogId) };
}

/**
 * 标记通知为已读
 */
export async function markAsRead(notificationIds: number | number[]) {
  const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds];
  
  return prisma.notification.updateMany({
    where: { id: { in: ids } },
    data: { isRead: true, readAt: new Date() },
  });
}

/**
 * 标记所有通知为已读
 */
export async function markAllAsRead(frogId: number) {
  return prisma.notification.updateMany({
    where: { frogId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

/**
 * 删除通知
 */
export async function deleteNotification(notificationId: number) {
  return prisma.notification.delete({
    where: { id: notificationId },
  });
}

/**
 * 清理旧通知
 */
export async function cleanOldNotifications(daysOld: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return prisma.notification.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      isRead: true,
    },
  });
}

/**
 * 发送状态警告通知（由定时任务调用）
 */
export async function sendStatusWarning(
  frogId: number,
  frogName: string,
  warningType: 'hunger' | 'clean' | 'sick' | 'death' | 'drowsy' | 'sleeping'
) {
  const typeMap = {
    hunger: NotificationType.HUNGER_WARNING,
    clean: NotificationType.CLEAN_WARNING,
    sick: NotificationType.SICK_WARNING,
    death: NotificationType.DEATH_WARNING,
    drowsy: NotificationType.DROWSY_WARNING,
    sleeping: NotificationType.SLEEPING_WARNING,
  };

  // 检查是否最近1小时内已发送过相同警告
  const recentNotification = await prisma.notification.findFirst({
    where: {
      frogId,
      type: typeMap[warningType],
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });

  if (recentNotification) {
    return null; // 避免重复发送
  }

  const notification = await createNotification(frogId, typeMap[warningType], { frogName });

  // P4: 发送状态警告 WebSocket 推送
  if (notification) {
    try {
      const frog = await prisma.frog.findUnique({ 
        where: { id: frogId }, 
        select: { tokenId: true, hunger: true, cleanliness: true, health: true } 
      });
      if (frog) {
        const valueMap: Record<string, number> = {
          hunger: frog.hunger,
          clean: frog.cleanliness,
          sick: frog.health,
          death: Math.min(frog.hunger, frog.health),
          drowsy: 0,  // Not tracked, using 0 as placeholder
          sleeping: 0,
        };
        notifyStatusWarning(frog.tokenId, {
          type: `${warningType}_warning` as any,
          currentValue: valueMap[warningType],
          threshold: warningType === 'hunger' ? 30 : 20,
          message: notification.message,
        });
      }
    } catch (err) {
      console.error('Error sending status warning via WebSocket:', err);
    }
  }

  return notification;
}

export async function createBlessingCompletedNotification(
  frogId: number,
  params: {
    frogName?: string | null;
    blesserName?: string | null;
  } = {}
) {
  const frogName = params.frogName || '你的青蛙';
  const blesserName = params.blesserName || '好友';
  return createNotification(frogId, NotificationType.BLESSING_COMPLETED, {
    frogName,
    blesserName,
  });
}

export async function createRescueCompletedNotification(
  frogId: number,
  params: {
    frogName?: string | null;
    rescuerName?: string | null;
  } = {}
) {
  const frogName = params.frogName || '你的青蛙';
  const rescuerName = params.rescuerName || '热心蛙';
  return createNotification(frogId, NotificationType.RESCUE_COMPLETED, {
    frogName,
    rescuerName,
  });
}

export default {
  NotificationType,
  NotificationPriority,
  createNotification,
  getUnreadCount,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  cleanOldNotifications,
  sendStatusWarning,
  createBlessingCompletedNotification,
  createRescueCompletedNotification,
};
