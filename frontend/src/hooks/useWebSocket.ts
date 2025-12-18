import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useFrogStore } from '../stores/frogStore';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useWebSocket(frogId?: number) {
  const socketRef = useRef<Socket | null>(null);
  const { updateFrogStatus, addTravelResult } = useFrogStore();
  
  useEffect(() => {
    // 创建连接
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket'],
    });
    
    // 监听事件
    socketRef.current.on('travel:completed', (data) => {
      console.log('Travel completed:', data);
      addTravelResult(data.frogId, data);
      updateFrogStatus(data.frogId, 'Idle');
      
      window.dispatchEvent(new CustomEvent('travel:completed', { detail: data }));
    });
    
    socketRef.current.on('travel:started', (data) => {
      console.log('Travel started:', data);
      updateFrogStatus(data.frogId, 'Traveling');
    });
    
    // 订阅特定青蛙
    if (frogId !== undefined) {
      socketRef.current.emit('subscribe:frog', frogId);
    }
    
    return () => {
      socketRef.current?.disconnect();
    };
  }, [frogId, updateFrogStatus, addTravelResult]);
  
  const subscribe = useCallback((frogId: number) => {
    socketRef.current?.emit('subscribe:frog', frogId);
  }, []);
  
  return { subscribe };
}
