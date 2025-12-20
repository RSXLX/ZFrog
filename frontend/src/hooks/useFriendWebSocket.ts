import { useEffect, useRef, useCallback } from 'react';
import { useFrogData } from './useFrogData';
import { useWebSocket } from './useWebSocket';

interface FriendWebSocketEvents {
  onFriendRequestReceived?: (data: any) => void;
  onFriendRequestStatusChanged?: (data: any) => void;
  onFriendInteraction?: (data: any) => void;
  onFriendRemoved?: (data: any) => void;
  onFriendOnlineStatusChanged?: (data: { frogId: number; isOnline: boolean; timestamp: number }) => void;
}

export const useFriendWebSocket = (
  frogId: number,
  events: FriendWebSocketEvents = {}
) => {
  const socket = useWebSocket();
  const { frog } = useFrogData(frogId);
  const subscribedFrogId = useRef<number | null>(null);

  const subscribeToFrog = useCallback(() => {
    if (socket && frogId && subscribedFrogId.current !== frogId) {
      // 取消之前的订阅
      if (subscribedFrogId.current) {
        socket.emit('unsubscribe:frog', subscribedFrogId.current);
      }

      // 订阅新青蛙
      socket.emit('subscribe:frog', frogId);
      subscribedFrogId.current = frogId;
      
      console.log(`Subscribed to friend events for frog ${frogId}`);
    }
  }, [socket, frogId]);

  const unsubscribeFromFrog = useCallback(() => {
    if (socket && subscribedFrogId.current) {
      const id = subscribedFrogId.current;
      socket.emit('unsubscribe:frog', id);
      subscribedFrogId.current = null;
      console.log(`Unsubscribed from friend events for frog ${id}`);
    }
  }, [socket]);

  useEffect(() => {
    if (socket && frogId) {
      subscribeToFrog();

      // 监听好友请求接收
      const onFriendRequestReceived = (data: any) => {
        console.log('Friend request received:', data);
        events.onFriendRequestReceived?.(data);
        
        // 可以在这里添加通知或提示
        if (data.addresseeId === frogId) {
          // 显示通知给当前用户
          const notification = new Notification('新的好友请求', {
            body: `${data.requester?.name || '某只青蛙'} 想要添加你为好友`,
            icon: '/frog-icon.png'
          });
          
          // 3秒后自动关闭通知
          setTimeout(() => notification.close(), 3000);
        }
      };

      // 监听好友请求状态变化
      const onFriendRequestStatusChanged = (data: any) => {
        console.log('Friend request status changed:', data);
        events.onFriendRequestStatusChanged?.(data);
        
        if (data.requesterId === frogId || data.addresseeId === frogId) {
          const statusText = data.status === 'Accepted' ? '接受了' : '拒绝了';
          const otherFrogId = data.requesterId === frogId ? data.addresseeId : data.requesterId;
          
          const notification = new Notification('好友请求更新', {
            body: `好友请求已被${statusText}`,
            icon: '/frog-icon.png'
          });
          
          setTimeout(() => notification.close(), 3000);
        }
      };

      // 监听好友互动
      const onFriendInteraction = (data: any) => {
        console.log('Friend interaction:', data);
        events.onFriendInteraction?.(data);
        
        if (data.targetId === frogId) {
          const interactionTypeText: Record<string, string> = {
            'Visit': '拜访了你',
            'Feed': '喂食了你',
            'Play': '和你玩耍',
            'Gift': '送了你礼物',
            'Message': '给你留了言',
            'Travel': '邀请你一起旅行'
          };
          const text = interactionTypeText[data.type as string] || '与你互动';
          
          const notification = new Notification('新的好友互动', {
            body: `${data.actor?.name || '好友'} ${interactionTypeText}`,
            icon: '/frog-icon.png'
          });
          
          setTimeout(() => notification.close(), 3000);
        }
      };

      // 监听好友移除
      const onFriendRemoved = (data: any) => {
        console.log('Friend removed:', data);
        events.onFriendRemoved?.(data);
        
        if (data.frogId === frogId || data.removedFriendId === frogId) {
          const notification = new Notification('好友关系变化', {
            body: '好友关系已解除',
            icon: '/frog-icon.png'
          });
          
          setTimeout(() => notification.close(), 3000);
        }
      };

      // 监听好友在线状态变化
      const onFriendOnlineStatusChanged = (data: { frogId: number; isOnline: boolean; timestamp: number }) => {
        console.log('Friend online status changed:', data);
        events.onFriendOnlineStatusChanged?.(data);
      };

      // 注册事件监听器
      socket.on('friend:requestReceived', onFriendRequestReceived);
      socket.on('friend:requestStatusChanged', onFriendRequestStatusChanged);
      socket.on('friend:interaction', onFriendInteraction);
      socket.on('friend:removed', onFriendRemoved);
      socket.on('friend:onlineStatusChanged', onFriendOnlineStatusChanged);

      // 清理函数
      return () => {
        socket.off('friend:requestReceived', onFriendRequestReceived);
        socket.off('friend:requestStatusChanged', onFriendRequestStatusChanged);
        socket.off('friend:interaction', onFriendInteraction);
        socket.off('friend:removed', onFriendRemoved);
        socket.off('friend:onlineStatusChanged', onFriendOnlineStatusChanged as any);
        unsubscribeFromFrog();
      };
    }
  }, [socket, frogId, events, subscribeToFrog, unsubscribeFromFrog]);

  // 请求通知权限
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return {
    subscribeToFrog,
    unsubscribeFromFrog,
    isConnected: !!socket
  };
};