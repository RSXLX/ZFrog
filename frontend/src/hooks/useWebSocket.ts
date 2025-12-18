// frontend/src/hooks/useWebSocket.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAccount } from 'wagmi';

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

interface TravelStartedEvent {
  frogId: number;
  travelId: number;
  targetWallet: string;
  startTime: number;
  endTime: number;
  timestamp: number;
}

interface TravelProgressEvent {
  frogId: number;
  phase: 'observing' | 'generating_story' | 'uploading' | 'minting';
  message: string;
  percentage?: number;
  timestamp: number;
}

interface TravelCompletedEvent {
  frogId: number;
  journalHash: string;
  souvenirId: number;
  story: {
    title: string;
    content: string;
    mood: string;
    highlights: string[];
  };
  timestamp: number;
}

type TravelEvent = 
  | { type: 'started'; data: TravelStartedEvent }
  | { type: 'progress'; data: TravelProgressEvent }
  | { type: 'completed'; data: TravelCompletedEvent };

interface UseWebSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  subscribeFrog: (frogId: number) => void;
  unsubscribeFrog: (frogId: number) => void;
  on: <T = unknown>(event: string, callback: (data: T) => void) => () => void;
  off: (event: string, callback: (data: unknown) => void) => void;
  emit: (event: string, data: unknown) => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { address } = useAccount();
  const listenersRef = useRef<Map<string, Array<(data: unknown) => void>>>(new Map());

  // 初始化连接
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      // 自动订阅当前钱包
      if (address) {
        socket.emit('subscribe:wallet', address);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // 当钱包地址变化时重新订阅
  useEffect(() => {
    if (socketRef.current && isConnected && address) {
      socketRef.current.emit('subscribe:wallet', address);
    }
  }, [address, isConnected]);

  // 订阅青蛙事件
  const subscribeFrog = useCallback((frogId: number) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('subscribe:frog', frogId);
    }
  }, [isConnected]);

  // 取消订阅青蛙事件
  const unsubscribeFrog = useCallback((frogId: number) => {
    if (socketRef.current) {
      socketRef.current.emit('unsubscribe:frog', frogId);
    }
  }, []);

  // 添加事件监听器
  const on = useCallback(<T = unknown>(event: string, callback: (data: T) => void): (() => void) => {
    if (!socketRef.current) return () => {};

    const typedCallback = callback as (data: unknown) => void;
    socketRef.current.on(event, typedCallback);
    
    // 存储监听器以便清理
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, []);
    }
    listenersRef.current.get(event)!.push(typedCallback);

    // 返回取消监听的函数
    return () => {
      socketRef.current?.off(event, typedCallback);
      const listeners = listenersRef.current.get(event);
      if (listeners) {
        const index = listeners.indexOf(typedCallback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }, []);

  // 移除事件监听器
  const off = useCallback((event: string, callback: (data: unknown) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  }, []);

  // 发送消息
  const emit = useCallback((event: string, data: unknown) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    }
  }, [isConnected]);

  return {
    socket: socketRef.current,
    isConnected,
    subscribeFrog,
    unsubscribeFrog,
    on,
    off,
    emit,
  };
}

// 专门用于旅行事件的 Hook
export function useTravelEvents(frogId: number | undefined): TravelEvent | null {
  const { subscribeFrog, unsubscribeFrog, on } = useWebSocket();
  const [travelEvent, setTravelEvent] = useState<TravelEvent | null>(null);

  useEffect(() => {
    if (!frogId) return;

    subscribeFrog(frogId);

    const unsubscribeStarted = on<TravelStartedEvent>('travel:started', (data) => {
      if (data.frogId === frogId) {
        setTravelEvent({ type: 'started', data });
      }
    });

    const unsubscribeProgress = on<TravelProgressEvent>('travel:progress', (data) => {
      if (data.frogId === frogId) {
        setTravelEvent({ type: 'progress', data });
      }
    });

    const unsubscribeCompleted = on<TravelCompletedEvent>('travel:completed', (data) => {
      if (data.frogId === frogId) {
        setTravelEvent({ type: 'completed', data });
      }
    });

    return () => {
      unsubscribeFrog(frogId);
      unsubscribeStarted();
      unsubscribeProgress();
      unsubscribeCompleted();
    };
  }, [frogId, subscribeFrog, unsubscribeFrog, on]);

  return travelEvent;
}

export default useWebSocket;