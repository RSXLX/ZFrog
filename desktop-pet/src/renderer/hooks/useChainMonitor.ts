import { useCallback, useMemo } from 'react';
import { useChainMonitorIntegration, type ChainEventType } from './useChainMonitorIntegration';

type ChainEvent = ChainEventType;

interface UseChainMonitorReturn {
  isMonitoring: boolean;
  lastEvent: ChainEvent | null;
  lastEventTime: Date | null;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  simulateEvent: (event: ChainEvent) => void;
}

export function useChainMonitor(frogState: any): UseChainMonitorReturn {
  const integration = useChainMonitorIntegration();
  const latest = integration.recentEvents[0];

  const applyFrogReaction = useCallback(
    (event: ChainEvent) => {
      if (frogState?.setChainEvent) {
        // useFrogState supports these 4 core types; gas_high falls back to price_down behavior.
        const mapped = event === 'gas_high' ? 'price_down' : event;
        frogState.setChainEvent(mapped);
      }
    },
    [frogState]
  );

  const simulateEvent = useCallback(
    (event: ChainEvent) => {
      applyFrogReaction(event);
      window.dispatchEvent(
        new CustomEvent('desktop:chain-event', {
          detail: {
            type: event,
            timestamp: Date.now(),
          },
        })
      );
    },
    [applyFrogReaction]
  );

  return useMemo(
    () => ({
      isMonitoring: integration.isMonitoring,
      lastEvent: latest?.type || null,
      lastEventTime: latest ? new Date(latest.timestamp) : null,
      startMonitoring: integration.startMonitoring,
      stopMonitoring: () => {
        void integration.stopMonitoring();
      },
      simulateEvent,
    }),
    [integration, latest, simulateEvent]
  );
}
