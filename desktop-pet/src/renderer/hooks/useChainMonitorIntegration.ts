import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type ChainEventType = 'large_buy' | 'large_sell' | 'price_up' | 'price_down' | 'gas_high';

export interface ChainEvent {
  id: string;
  type: ChainEventType;
  timestamp: number;
  message: string;
}

type ChainEventCallback = (event: ChainEvent) => void;

interface UseChainMonitorIntegrationReturn {
  isInitialized: boolean;
  isMonitoring: boolean;
  providerConnected: boolean;
  wsConnected: boolean;
  lastGasPrice: string;
  eventCount: number;
  recentEvents: ChainEvent[];
  initialize: () => Promise<void>;
  startMonitoring: () => void;
  stopMonitoring: () => Promise<void>;
  addEventListener: (eventType: ChainEventType, callback: ChainEventCallback) => () => void;
  shouldFrogReact: (eventType: ChainEventType) => boolean;
  getFrogReaction: (eventType: ChainEventType) => { animation: string; sound: boolean; message: string };
}

const EVENT_REACTION: Record<ChainEventType, { animation: string; sound: boolean; message: string }> = {
  large_buy: { animation: 'excited', sound: true, message: '监测到大单买入，气氛不错！' },
  large_sell: { animation: 'thinking', sound: true, message: '出现大单卖出，先观察一下。' },
  price_up: { animation: 'happy', sound: true, message: '价格上行，今天心情很好。' },
  price_down: { animation: 'sad', sound: false, message: '价格回落了，保持耐心。' },
  gas_high: { animation: 'thinking', sound: false, message: 'Gas 有点高，等等再操作。' },
};

export function useChainMonitorIntegration(): UseChainMonitorIntegrationReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [providerConnected, setProviderConnected] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastGasPrice, setLastGasPrice] = useState('0');
  const [recentEvents, setRecentEvents] = useState<ChainEvent[]>([]);
  const [eventCount, setEventCount] = useState(0);
  const listenersRef = useRef<Record<ChainEventType, Set<ChainEventCallback>>>({
    large_buy: new Set(),
    large_sell: new Set(),
    price_up: new Set(),
    price_down: new Set(),
    gas_high: new Set(),
  });
  const timerRef = useRef<number | null>(null);

  const emit = useCallback((type: ChainEventType) => {
    const event: ChainEvent = {
      id: `chain_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      timestamp: Date.now(),
      message: EVENT_REACTION[type].message,
    };
    setRecentEvents(prev => [event, ...prev].slice(0, 50));
    setEventCount(prev => prev + 1);
    listenersRef.current[type].forEach(callback => callback(event));
  }, []);

  const initialize = useCallback(async () => {
    setIsInitialized(true);
    setProviderConnected(true);
    setWsConnected(true);
    setIsMonitoring(true);
    setLastGasPrice((10 + Math.floor(Math.random() * 40)).toString());
  }, []);

  const startMonitoring = useCallback(() => {
    if (!isInitialized) {
      void initialize();
    }
    setIsMonitoring(true);
  }, [isInitialized, initialize]);

  const stopMonitoring = useCallback(async () => {
    setIsMonitoring(false);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const addEventListener = useCallback((eventType: ChainEventType, callback: ChainEventCallback) => {
    listenersRef.current[eventType].add(callback);
    return () => {
      listenersRef.current[eventType].delete(callback);
    };
  }, []);

  useEffect(() => {
    if (!isMonitoring) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }

    timerRef.current = window.setInterval(() => {
      if (Math.random() > 0.75) {
        const types: ChainEventType[] = ['large_buy', 'large_sell', 'price_up', 'price_down', 'gas_high'];
        emit(types[Math.floor(Math.random() * types.length)]);
        setLastGasPrice((10 + Math.floor(Math.random() * 120)).toString());
      }
    }, 20000);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isMonitoring, emit]);

  const shouldFrogReact = useCallback((eventType: ChainEventType) => Boolean(EVENT_REACTION[eventType]), []);

  const getFrogReaction = useCallback(
    (eventType: ChainEventType) => EVENT_REACTION[eventType],
    []
  );

  return useMemo(
    () => ({
      isInitialized,
      isMonitoring,
      providerConnected,
      wsConnected,
      lastGasPrice,
      eventCount,
      recentEvents,
      initialize,
      startMonitoring,
      stopMonitoring,
      addEventListener,
      shouldFrogReact,
      getFrogReaction,
    }),
    [
      isInitialized,
      isMonitoring,
      providerConnected,
      wsConnected,
      lastGasPrice,
      eventCount,
      recentEvents,
      initialize,
      startMonitoring,
      stopMonitoring,
      addEventListener,
      shouldFrogReact,
      getFrogReaction,
    ]
  );
}
