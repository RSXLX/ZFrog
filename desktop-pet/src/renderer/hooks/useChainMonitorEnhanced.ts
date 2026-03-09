/**
 * Enhanced Chain Monitor Hook
 * Integrates new chainMonitor service with real ZetaChain data
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { chainMonitorService, ChainEventType, ChainEvent } from '../../services/chainMonitorWithFixes';

interface UseChainMonitorEnhancedReturn {
  isConnected: boolean;
  isMonitoring: boolean;
  lastEvent: ChainEvent | null;
  eventHistory: ChainEvent[];
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  simulateEvent: (type: ChainEventType) => void;
}

export function useChainMonitorEnhanced(): UseChainMonitorEnhancedReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastEvent, setLastEvent] = useState<ChainEvent | null>(null);
  const [eventHistory, setEventHistory] = useState<ChainEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Connect to ZetaChain
  const connect = useCallback(async () => {
    try {
      setError(null);
      const success = await chainMonitorService.initialize();
      
      if (success) {
        setIsConnected(true);
        setIsMonitoring(true);
        
        // Subscribe to all events
        unsubscribeRef.current = chainMonitorService.addEventListener(
          ChainEventType.LARGE_TRANSFER,
          (event) => {
            setLastEvent(event);
            setEventHistory(prev => [event, ...prev].slice(0, 100));
          }
        );
        
        console.log('[useChainMonitorEnhanced] Connected to ZetaChain');
      } else {
        setError('Failed to connect to ZetaChain');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('[useChainMonitorEnhanced] Connection error:', err);
    }
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    chainMonitorService.stop();
    setIsConnected(false);
    setIsMonitoring(false);
    console.log('[useChainMonitorEnhanced] Disconnected');
  }, []);

  // Simulate event for testing
  const simulateEvent = useCallback((type: ChainEventType) => {
    const mockEvent: ChainEvent = {
      id: `mock-${Date.now()}`,
      type,
      timestamp: Date.now(),
      blockNumber: Math.floor(Math.random() * 1000000),
      transactionHash: `0x${Math.random().toString(16).slice(2, 42)}`,
      from: `0x${Math.random().toString(16).slice(2, 42)}`,
      to: `0x${Math.random().toString(16).slice(2, 42)}`,
      value: Math.random() * 1000,
    };
    
    setLastEvent(mockEvent);
    setEventHistory(prev => [mockEvent, ...prev].slice(0, 100));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isMonitoring,
    lastEvent,
    eventHistory,
    error,
    connect,
    disconnect,
    simulateEvent,
  };
}

export default useChainMonitorEnhanced;
