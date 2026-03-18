import { useState, useEffect, useCallback, useRef } from 'react';
import { chainMonitor, type ChainEvent, type ChainEventCallback } from '../../services/chainMonitor';
import { ChainEventType, EVENT_RESPONSES } from '../../config/chain';

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

export function useChainMonitorIntegration(): UseChainMonitorIntegrationReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [providerConnected, setProviderConnected] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastGasPrice, setLastGasPrice] = useState('0');
  const [eventCount, setEventCount] = useState(0);
  const [recentEvents, setRecentEvents] = useState<ChainEvent[]>([]);

  const statusIntervalRef = useRef<number | null>(null);
  const unsubscribersRef = useRef<(() => void)[]>([]);

  const syncStatus = useCallback(() => {
    const status = chainMonitor.getStatus();
    setProviderConnected(status.providerConnected);
    setWsConnected(status.wsConnected);
    setLastGasPrice(status.lastGasPrice);
    setIsMonitoring(status.isRunning);
    setEventCount(status.eventCount);
  }, []);

  const initialize = useCallback(async () => {
    await chainMonitor.initialize();
    setIsInitialized(true);
    setIsMonitoring(true);
    syncStatus();

    const unsubscribeAll = chainMonitor.addEventListener('*' as ChainEventType, (event) => {
      setRecentEvents(prev => [event, ...prev].slice(0, 50));
      setEventCount(prev => prev + 1);
    });

    unsubscribersRef.current.push(unsubscribeAll);

    if (statusIntervalRef.current) {
      window.clearInterval(statusIntervalRef.current);
    }

    statusIntervalRef.current = window.setInterval(() => {
      syncStatus();
    }, 5000);
  }, [syncStatus]);

  const startMonitoring = useCallback(() => {
    if (!isInitialized) {
      void initialize();
    }
  }, [isInitialized, initialize]);

  const stopMonitoring = useCallback(async () => {
    if (statusIntervalRef.current) {
      window.clearInterval(statusIntervalRef.current);
      statusIntervalRef.current = null;
    }

    unsubscribersRef.current.forEach(unsubscribe => unsubscribe());
    unsubscribersRef.current = [];

    await chainMonitor.stop();
    syncStatus();
  }, [syncStatus]);

  const addEventListener = useCallback((eventType: ChainEventType, callback: ChainEventCallback) => {
    const unsubscribe = chainMonitor.addEventListener(eventType, callback);
    unsubscribersRef.current.push(unsubscribe);
    return unsubscribe;
  }, []);

  const shouldFrogReact = useCallback((eventType: ChainEventType) => {
    const response = EVENT_RESPONSES[eventType];
    return Boolean(response?.notification || response?.sound);
  }, []);

  const getFrogReaction = useCallback((eventType: ChainEventType) => {
    const response = EVENT_RESPONSES[eventType];
    return {
      animation: response?.animation?.toLowerCase() ?? 'idle',
      sound: Boolean(response?.sound),
      message: response?.dialog || '链上有新动态啦',
    };
  }, []);

  useEffect(() => {
    return () => {
      if (statusIntervalRef.current) {
        window.clearInterval(statusIntervalRef.current);
      }

      unsubscribersRef.current.forEach(unsubscribe => unsubscribe());
      unsubscribersRef.current = [];
    };
  }, []);

  return {
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
  };
}
