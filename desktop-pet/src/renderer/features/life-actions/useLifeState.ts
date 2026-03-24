import { useCallback, useEffect, useMemo, useState } from 'react';
import api, { type LifeReadModel } from '../../services/api';
import { emitDomainEvent } from '../../services/domainEvents';
import type { FrogStats } from '../../hooks/useFrogState';

interface UseLifeStateOptions {
  frogId: number | null;
  syncIntervalMs?: number;
}

interface UseLifeStateReturn {
  life: LifeReadModel | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  feed: (foodType?: string, quantity?: number) => Promise<boolean>;
  play: (gameType?: string) => Promise<boolean>;
  clean: () => Promise<boolean>;
  heal: () => Promise<boolean>;
  startRest: () => Promise<boolean>;
  endRest: () => Promise<boolean>;
  toFrogStats: () => FrogStats | null;
}

const emitStatusEvent = (detail: Record<string, unknown>) => {
  window.dispatchEvent(new CustomEvent('desktop:frog-status-changed', { detail }));
  emitDomainEvent({
    eventName: 'PetStateUpdated',
    source: 'desktop.life-actions',
    payload: detail,
  });
};

export function useLifeState({
  frogId,
  syncIntervalMs = 20000,
}: UseLifeStateOptions): UseLifeStateReturn {
  const [life, setLife] = useState<LifeReadModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!frogId) {
      setLife(null);
      setError(null);
      return;
    }

    setLoading(true);
    try {
      const nextLife = await api.getLife(frogId);
      setLife(nextLife);
      setError(null);
      if (nextLife) {
        emitStatusEvent({
          frogId,
          mood: nextLife.mood,
          energy: nextLife.energy,
          happiness: nextLife.happiness,
          isDormant: nextLife.isDormant,
        });
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load life state');
    } finally {
      setLoading(false);
    }
  }, [frogId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!frogId) return;
    const timer = window.setInterval(() => {
      void refresh();
    }, syncIntervalMs);
    return () => window.clearInterval(timer);
  }, [frogId, syncIntervalMs, refresh]);

  const runAndRefresh = useCallback(
    async (action: () => Promise<boolean>, actionType: string): Promise<boolean> => {
      const ok = await action();
      if (ok) {
        emitStatusEvent({ frogId, actionType });
        await refresh();
      }
      return ok;
    },
    [frogId, refresh]
  );

  const toFrogStats = useCallback((): FrogStats | null => {
    if (!life) return null;
    return {
      hunger: Math.max(0, Math.min(100, Math.round(life.hunger))),
      energy: Math.max(0, Math.min(100, Math.round(life.energy))),
      happiness: Math.max(0, Math.min(100, Math.round(life.happiness))),
    };
  }, [life]);

  return useMemo(
    () => ({
      life,
      loading,
      error,
      refresh,
      feed: (foodType = 'BUG_BENTO', quantity = 1) =>
        runAndRefresh(
          () =>
            api.feedLife(frogId || 0, {
              foodType,
              quantity,
              source: 'desktop_life_actions',
            }),
          'feed'
        ),
      play: (gameType = 'guess') =>
        runAndRefresh(
          () =>
            api.playLife(frogId || 0, {
              gameType,
              source: 'desktop_life_actions',
            }),
          'play'
        ),
      clean: () => runAndRefresh(() => api.cleanLife(frogId || 0), 'clean'),
      heal: () => runAndRefresh(() => api.healLife(frogId || 0), 'heal'),
      startRest: () => runAndRefresh(() => api.startLifeRest(frogId || 0), 'rest_start'),
      endRest: () => runAndRefresh(() => api.endLifeRest(frogId || 0), 'rest_end'),
      toFrogStats,
    }),
    [life, loading, error, refresh, runAndRefresh, frogId, toFrogStats]
  );
}

export default useLifeState;
