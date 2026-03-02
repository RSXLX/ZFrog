import { useState, useEffect, useCallback } from 'react';

export type ChainEventType = 'large_buy' | 'large_sell' | 'price_up' | 'price_down' | 'whale_activity' | 'new_token';

export interface ChainEvent {
  id: string;
  type: ChainEventType;
  chain: string;
  amount?: number;
  price?: number;
  timestamp: number;
  message: string;
}

export function useChainEvents() {
  const [events, setEvents] = useState<ChainEvent[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Load from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zfrog_chain_events');
      if (saved) {
        setEvents(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load chain events:', e);
    }
  }, []);

  // Save to storage
  useEffect(() => {
    try {
      localStorage.setItem('zfrog_chain_events', JSON.stringify(events));
    } catch (e) {
      console.warn('Failed to save chain events:', e);
    }
  }, [events]);

  const addEvent = useCallback((event: Omit<ChainEvent, 'id' | 'timestamp'>) => {
    const newEvent: ChainEvent = {
      ...event,
      id: `event_${Date.now()}`,
      timestamp: Date.now(),
    };
    
    setEvents(prev => [newEvent, ...prev].slice(0, 100)); // Keep last 100 events
    
    return newEvent;
  }, []);

  const simulateEvent = useCallback((type: ChainEventType, chain: string = 'ZetaChain') => {
    const eventMessages: Record<ChainEventType, string> = {
      'large_buy': '🐋 大额买入 detected!',
      'large_sell': '📉 大额卖出 detected!',
      'price_up': '🚀 价格暴涨!',
      'price_down': '💸 价格暴跌!',
      'whale_activity': '🐋 鲸鱼活动!',
      'new_token': '🆕 新代币上线!',
    };
    
    return addEvent({
      type,
      chain,
      amount: Math.random() * 1000000,
      price: Math.random() * 1000,
      message: eventMessages[type],
    });
  }, [addEvent]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const getEventsByType = useCallback((type: ChainEventType) => {
    return events.filter(e => e.type === type);
  }, [events]);

  const getEventsByChain = useCallback((chain: string) => {
    return events.filter(e => e.chain === chain);
  }, [events]);

  return {
    events,
    isMonitoring,
    setIsMonitoring,
    addEvent,
    simulateEvent,
    clearEvents,
    getEventsByType,
    getEventsByChain,
  };
}
