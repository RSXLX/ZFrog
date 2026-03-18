import { useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { GardenVisit, VisitRequest } from '../types/garden';

interface GardenWebSocketEvents {
  onVisitRequest?: (request: VisitRequest) => void;
  onVisitorEntered?: (visit: GardenVisit) => void;
  onVisitorLeft?: (data: { visitId: number; guestFrogId: number }) => void;
  onInteraction?: (data: { type: string; fromFrogId: number; friendshipPoints: number }) => void;
  onMessage?: (data: any) => void;
  onGift?: (data: any) => void;
}

interface GardenWebSocketOptions {
  enabled?: boolean;
}

export const useGardenWebSocket = (
  frogId: number,
  events: GardenWebSocketEvents = {},
  options: GardenWebSocketOptions = {}
) => {
  const { enabled = true } = options;
  const socket = useWebSocket({ enabled });
  const subscribedGardenId = useRef<number | null>(null);

  // 订阅家园事件
  const subscribeToGarden = useCallback(() => {
    if (socket && frogId && subscribedGardenId.current !== frogId) {
      // 取消之前的订阅
      if (subscribedGardenId.current) {
        socket.emit('garden:unsubscribe', subscribedGardenId.current);
      }

      // 订阅新家园
      socket.emit('garden:subscribe', frogId);
      subscribedGardenId.current = frogId;
      
      console.log(`Subscribed to garden events for frog ${frogId}`);
    }
  }, [socket, frogId]);

  // 取消订阅
  const unsubscribeFromGarden = useCallback(() => {
    if (socket && subscribedGardenId.current) {
      const id = subscribedGardenId.current;
      socket.emit('garden:unsubscribe', id);
      subscribedGardenId.current = null;
      console.log(`Unsubscribed from garden events for frog ${id}`);
    }
  }, [socket]);

  // 发送访问请求
  const sendVisitRequest = useCallback((targetFrogId: number, giftType?: string) => {
    if (socket) {
      socket.emit('garden:visitRequest', {
        fromFrogId: frogId,
        toFrogId: targetFrogId,
        giftType
      });
    }
  }, [socket, frogId]);

  // 接受访问请求
  const acceptVisit = useCallback((visitId: number) => {
    if (socket) {
      socket.emit('garden:acceptVisit', { visitId, hostFrogId: frogId });
    }
  }, [socket, frogId]);

  // 拒绝访问请求
  const rejectVisit = useCallback((visitId: number) => {
    if (socket) {
      socket.emit('garden:rejectVisit', { visitId, hostFrogId: frogId });
    }
  }, [socket, frogId]);

  // 发送互动
  const sendInteraction = useCallback((targetFrogId: number, type: string, data?: any) => {
    if (socket) {
      socket.emit('garden:interaction', {
        fromFrogId: frogId,
        toFrogId: targetFrogId,
        type,
        data
      });
    }
  }, [socket, frogId]);

  // 设置事件监听
  useEffect(() => {
    if (socket && frogId) {
      subscribeToGarden();

      // 访问请求
      const handleVisitRequest = (data: VisitRequest) => {
        console.log('Garden visit request received:', data);
        events.onVisitRequest?.(data);
      };

      // 访客进入
      const handleVisitorEntered = (data: GardenVisit) => {
        console.log('Visitor entered garden:', data);
        events.onVisitorEntered?.(data);
        
        // 显示通知
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('🐸 新访客到来！', {
            body: `${data.guestFrog?.name || '一只青蛙'} 来到了你的家园`,
            icon: '/frog-icon.png'
          });
        }
      };

      // 访客离开
      const handleVisitorLeft = (data: { visitId: number; guestFrogId: number }) => {
        console.log('Visitor left garden:', data);
        events.onVisitorLeft?.(data);
      };

      // 收到互动
      const handleInteraction = (data: { type: string; fromFrogId: number; friendshipPoints: number }) => {
        console.log('Garden interaction:', data);
        events.onInteraction?.(data);
      };

      // 收到留言
      const handleMessage = (data: any) => {
        console.log('Garden message:', data);
        events.onMessage?.(data);
      };

      // 收到礼物
      const handleGift = (data: any) => {
        console.log('Garden gift:', data);
        events.onGift?.(data);
      };

      // 注册监听器
      socket.on('garden:visitRequest', handleVisitRequest);
      socket.on('garden:visitorEntered', handleVisitorEntered);
      socket.on('garden:visitorLeft', handleVisitorLeft);
      socket.on('garden:interaction', handleInteraction);
      socket.on('garden:message', handleMessage);
      socket.on('garden:gift', handleGift);

      return () => {
        socket.off('garden:visitRequest', handleVisitRequest);
        socket.off('garden:visitorEntered', handleVisitorEntered);
        socket.off('garden:visitorLeft', handleVisitorLeft);
        socket.off('garden:interaction', handleInteraction);
        socket.off('garden:message', handleMessage);
        socket.off('garden:gift', handleGift);
        unsubscribeFromGarden();
      };
    }
  }, [socket, frogId, events, subscribeToGarden, unsubscribeFromGarden]);

  // 请求通知权限
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return {
    isConnected: enabled && socket.isConnected,
    subscribeToGarden,
    unsubscribeFromGarden,
    sendVisitRequest,
    acceptVisit,
    rejectVisit,
    sendInteraction
  };
};
