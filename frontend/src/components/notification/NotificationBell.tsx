/**
 * 🐸 通知铃铛组件
 * 顶栏通知入口，显示未读数量
 * P4: 集成 Socket.IO 实时通知
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../../services/api';
import { useMyFrog } from '../../hooks/useMyFrog';
import { useWebSocket } from '../../hooks/useWebSocket';
import { NotificationCenter } from './NotificationCenter';

interface NewNotificationEvent {
  frogId: number;
  id: number;
  type: string;
  title: string;
  message: string;
  priority: string;
  timestamp: number;
}

interface UnreadCountEvent {
  frogId: number;
  unreadCount: number;
}

export const NotificationBell: React.FC = () => {
  const { frog } = useMyFrog();
  const { subscribeFrog, unsubscribeFrog, on, isConnected } = useWebSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);

  // 获取未读数量
  const fetchUnreadCount = useCallback(async () => {
    if (!frog?.tokenId) return;
    
    try {
      const response = await apiService.get(`/notifications/${frog.tokenId}/unread-count`);
      if (response.success) {
        setUnreadCount(response.data.count || 0);
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  }, [frog?.tokenId]);

  // 初始化和定时刷新
  useEffect(() => {
    if (frog?.tokenId) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [frog?.tokenId, fetchUnreadCount]);

  // P4: Socket.IO 实时通知监听
  useEffect(() => {
    if (!frog?.tokenId || !isConnected) return;

    // 订阅青蛙通知
    subscribeFrog(frog.tokenId);

    // 监听新通知
    const unsubscribeNew = on<NewNotificationEvent>('notification:new', (data) => {
      if (data.frogId === frog.tokenId) {
        setUnreadCount(prev => prev + 1);
        setHasNewNotification(true);
        // 2秒后取消高亮
        setTimeout(() => setHasNewNotification(false), 2000);
      }
    });

    // 监听未读数量更新
    const unsubscribeCount = on<UnreadCountEvent>('notification:unreadCount', (data) => {
      if (data.frogId === frog.tokenId) {
        setUnreadCount(data.unreadCount);
      }
    });

    return () => {
      unsubscribeFrog(frog.tokenId);
      unsubscribeNew();
      unsubscribeCount();
    };
  }, [frog?.tokenId, isConnected, subscribeFrog, unsubscribeFrog, on]);

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={`relative p-2 rounded-full transition ${
          hasNewNotification ? 'bg-red-100 animate-pulse' : 'hover:bg-gray-100'
        }`}
        title="通知"
      >
        <span className="text-xl">🔔</span>
        
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 bg-red-500 text-white text-xs 
                         min-w-[18px] h-[18px] rounded-full flex items-center 
                         justify-center font-bold"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <NotificationCenter
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          fetchUnreadCount();
        }}
      />
    </>
  );
};

export default NotificationBell;

