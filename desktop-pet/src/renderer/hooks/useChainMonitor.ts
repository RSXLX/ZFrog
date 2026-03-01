import { useEffect, useRef, useState, useCallback } from 'react';

// Chain event types
type ChainEvent = 'large_buy' | 'large_sell' | 'price_up' | 'price_down' | 'gas_high';

interface MonitorConfig {
  watchAddresses: string[];
  largeTradeThreshold: number; // in USDT
  priceCheckInterval: number; // ms
  gasAlertThreshold: number; // Gwei
}

interface UseChainMonitorReturn {
  isMonitoring: boolean;
  lastEvent: ChainEvent | null;
  lastEventTime: Date | null;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  simulateEvent: (event: ChainEvent) => void;
}

// Mock data for demo (in production, use real APIs)
const mockEvents: ChainEvent[] = ['large_buy', 'large_sell', 'price_up', 'price_down'];

export function useChainMonitor(frogState: any): UseChainMonitorReturn {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastEvent, setLastEvent] = useState<ChainEvent | null>(null);
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);
  
  const monitorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const configRef = useRef<MonitorConfig>({
    watchAddresses: [],
    largeTradeThreshold: 10000,
    priceCheckInterval: 60000, // 1 minute
    gasAlertThreshold: 100,
  });

  const handleChainEvent = useCallback((event: ChainEvent) => {
    console.log('[ChainMonitor] Event:', event);
    setLastEvent(event);
    setLastEventTime(new Date());
    
    // Trigger frog reaction
    if (frogState?.setChainEvent) {
      frogState.setChainEvent(event);
    }
  }, [frogState]);

  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;
    
    console.log('[ChainMonitor] Starting monitoring...');
    setIsMonitoring(true);
    
    // Simulate random chain events for demo
    // In production, this would connect to:
    // - Web3.js for wallet monitoring
    // - CoinGecko API for price checks
    // - Gas API for gas monitoring
    monitorIntervalRef.current = setInterval(() => {
      // Random event simulation (for demo)
      if (Math.random() > 0.7) {
        const randomEvent = mockEvents[Math.floor(Math.random() * mockEvents.length)];
        handleChainEvent(randomEvent);
      }
    }, 30000); // Check every 30 seconds
    
  }, [isMonitoring, handleChainEvent]);

  const stopMonitoring = useCallback(() => {
    console.log('[ChainMonitor] Stopping monitoring...');
    setIsMonitoring(false);
    
    if (monitorIntervalRef.current) {
      clearInterval(monitorIntervalRef.current);
      monitorIntervalRef.current = null;
    }
  }, []);

  const simulateEvent = useCallback((event: ChainEvent) => {
    handleChainEvent(event);
  }, [handleChainEvent]);

  // Auto-start monitoring
  useEffect(() => {
    // startMonitoring();
    
    return () => {
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
      }
    };
  }, []);

  return {
    isMonitoring,
    lastEvent,
    lastEventTime,
    startMonitoring,
    stopMonitoring,
    simulateEvent,
  };
}
