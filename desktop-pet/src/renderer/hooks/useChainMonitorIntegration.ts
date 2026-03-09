/**
 * Chain Monitor Integration Hook
 * Integrates real ZetaChain monitoring with existing app state
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  chainMonitor,
  ChainEvent,
  ChainEventType,
  ChainEventCallback,
} from '../../../services/chainMonitor';

interface UseChainMonitorIntegrationReturn {
  // Connection state
  isInitialized: boolean;
  isMonitoring: boolean;
  providerConnected: boolean;
  wsConnected: boolean;
  lastGasPrice: string;
  eventCount: number;
  
  // Event history
  recentEvents: ChainEvent[];
  
  // Actions
  initialize: () => Promise<void>;
  startMonitoring: () => void;
  stopMonitoring: () => Promise<void>;
  addEventListener: (eventType: ChainEventType, callback: ChainEventCallback) => () => void;
  
  // Frog reaction helpers
  shouldFrogReact: (eventType: ChainEventType) => boolean;
  getFrogReaction: (eventType: ChainEventType) => { animation: string; sound: boolean; message: string };
}

export function useChainMonitorIntegration(): UseChainMonitorIntegrationReturn {
  // Connection state
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [providerConnected, setProviderConnected] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastGasPrice, setLastGasPrice] = useState('0');
  const [eventCount, setEventCount] = useState(0);
  
  // Event history
  const [recentEvents, setRecentEvents] = useState<ChainEvent[]>([]);
  
  // Refs for event listeners
  const unsubscribersRef = useRef<(() => void)[]>([]);

  // Initialize chain monitor
  const initialize = useCallback(async () => {
    try {
      await chainMonitor.initialize();
      setIsInitialized(true);
      setIsMonitoring(true);
      
      // Add listener for all events
      const unsubscribeAll = chainMonitor.addEventListener('*' as ChainEventType, (event) => {
        setRecentEvents(prev => [event, ...prev].slice(0, 50)); // Keep last 50
        setEventCount(count => count + 1);
      });
      
      unsubscribersRef.current.push(unsubscribeAll);
      
      // Update status periodically
      const statusInterval = setInterval(() => {
        const status = chainMonitor.getStatus();
        setProviderConnected(status.providerConnected);
        setWsConnected(status.wsConnected);
        setLastGasPrice(status.lastGasPrice);
        setIsMonitoring(status.isRunning);
      }, 5000);
      
      return () => {
        clearInterval(statusInterval);
      };
    } catch (error) {
      console.error('Failed to initialize chain monitor:', error);
      throw error;
    }
  }, []);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  // Stop monitoring
  const stopMonitoring = useCallback(async () => {
    await chainMonitor.stop();
    setIsMonitoring(false);
    
    // Unsubscribe all listeners
    unsubscribersRef.current.forEach(unsubscribe => unsubscribe());
    unsubscribersRef.current = [];
  }, []);

  // Add event listener helper
  const addEventListener = useCallback((eventType: ChainEventType, callback: ChainEventCallback) => {
    const unsubscribe = chainMonitor.addEventListener(eventType, callback);
    unsubscribersRef.current.push(unsubscribe);
    return unsubscribe;
  }, []);

  // Frog reaction helpers
  const shouldFrogReact = useCallback((eventType: ChainEventType): boolean => {
    // Frog should react to these events
    const reactiveEvents = [
      ChainEventType.LARGE_TRANSFER,
      ChainEventType.WHALE_TRANSFER,
      ChainEventType.GAS_SPIKE,
      ChainEventType.GAS_DROP,
      ChainEventType.PRICE_ALERT,
    ];
    return reactiveEvents.includes(eventType);
  }, []);

  const getFrogReaction = useCallback((eventType: ChainEventType) => {
    switch (eventType) {
      case ChainEventType.LARGE_TRANSFER:
        return { animation: '