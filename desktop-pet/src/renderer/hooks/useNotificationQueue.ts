import { useState, useEffect, useCallback, useRef } from 'react';

export interface NotificationItem {
  id: string;
  type: 'achievement' | 'levelup' | 'reward' | 'system' | 'social';
  title: string;
  message: string;
  icon?: string;
  duration?: number;
}

export function useNotificationQueue() {
  const [queue, setQueue] = useState<NotificationItem[]>([]);
  const [current, setCurrent] = useState<NotificationItem | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addNotification = useCallback((notification: Omit<NotificationItem, 'id'>) => {
    const newNotification: NotificationItem = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    
    setQueue(prev => [...prev, newNotification]);
  }, []);

  // Process queue
  useEffect(() => {
    if (current || queue.length === 0) return;
    
    const next = queue[0];
    setCurrent(next);
    setQueue(prev => prev.slice(1));
    
    const duration = next.duration || 4000;
    timeoutRef.current = setTimeout(() => {
      setCurrent(null);
    }, duration);
    
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [current, queue]);

  const dismiss = useCallback(() => {
    setCurrent(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  return { queue, current, addNotification, dismiss };
}
