import { useCallback, useMemo } from 'react';
import {
  useChainMonitorIntegration,
  type ChainEvent,
  type ChainEventType,
} from './useChainMonitorIntegration';

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
  const integration = useChainMonitorIntegration();
  const lastEvent = integration.recentEvents[0] || null;

  const simulateEvent = useCallback(
    (type: ChainEventType) => {
      const fakeEvent: ChainEvent = {
        id: `sim_${Date.now()}`,
        type,
        timestamp: Date.now(),
        message: `模拟事件: ${type}`,
      };
      // Reuse listener stream by directly notifying subscribers.
      integration.addEventListener(type, () => {
        return;
      })();
      window.dispatchEvent(new CustomEvent('desktop:chain-event', { detail: fakeEvent }));
    },
    [integration]
  );

  return useMemo(
    () => ({
      isConnected: integration.providerConnected && integration.wsConnected,
      isMonitoring: integration.isMonitoring,
      lastEvent,
      eventHistory: integration.recentEvents,
      error: null,
      connect: integration.initialize,
      disconnect: () => {
        void integration.stopMonitoring();
      },
      simulateEvent,
    }),
    [integration, lastEvent, simulateEvent]
  );
}

export default useChainMonitorEnhanced;
