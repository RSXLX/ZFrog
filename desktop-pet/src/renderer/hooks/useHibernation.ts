import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { UseFrogStateReturn } from './useFrogState';

export type HibernationStatus = 'ACTIVE' | 'SLEEPING' | 'WAKING';

export interface HibernationState {
  status: HibernationStatus;
  lastInteractionAt: number;
  hibernatedAt: number | null;
  wakeProgress: number;
  dormantHours: number;
  blessingsReceived: number;
  lastBlessingAt: number | null;
}

interface UseHibernationOptions {
  inactivityThresholdMs?: number;
  wakeDurationMs?: number;
  enabled?: boolean;
}

const STORAGE_KEY = 'zfrog_hibernation_state';
export const DEFAULT_INACTIVITY_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 2; // 48h
export const DEFAULT_WAKE_DURATION_MS = 1000 * 12; // 12s for UI feedback

export function shouldEnterHibernation(lastInteractionAt: number, now: number, inactivityThresholdMs: number) {
  return now - lastInteractionAt >= inactivityThresholdMs;
}

export function calculateDormantHours(hibernatedAt: number | null, now: number) {
  if (!hibernatedAt) return 0;
  return Math.max(0, Math.floor((now - hibernatedAt) / (1000 * 60 * 60)));
}

export function useHibernation(
  frogState: Pick<UseFrogStateReturn, 'currentState' | 'setCurrentState' | 'setMood' | 'setStats'>,
  options: UseHibernationOptions = {}
) {
  const {
    inactivityThresholdMs = DEFAULT_INACTIVITY_THRESHOLD_MS,
    wakeDurationMs = DEFAULT_WAKE_DURATION_MS,
    enabled = true,
  } = options;

  const [state, setState] = useState<HibernationState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<HibernationState>;
        return {
          status: parsed.status || 'ACTIVE',
          lastInteractionAt: parsed.lastInteractionAt || Date.now(),
          hibernatedAt: parsed.hibernatedAt || null,
          wakeProgress: parsed.wakeProgress || 0,
          dormantHours: parsed.dormantHours || 0,
          blessingsReceived: parsed.blessingsReceived || 0,
          lastBlessingAt: parsed.lastBlessingAt || null,
        };
      }
    } catch {}

    return {
      status: 'ACTIVE',
      lastInteractionAt: Date.now(),
      hibernatedAt: null,
      wakeProgress: 0,
      dormantHours: 0,
      blessingsReceived: 0,
      lastBlessingAt: null,
    } satisfies HibernationState;
  });

  const wakeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const dormantHours = useMemo(() => {
    return calculateDormantHours(state.hibernatedAt, Date.now());
  }, [state.hibernatedAt, state.status]);

  const recordInteraction = useCallback(() => {
    setState(prev => ({
      ...prev,
      lastInteractionAt: Date.now(),
      dormantHours: calculateDormantHours(prev.hibernatedAt, Date.now()),
    }));
  }, []);

  const enterHibernation = useCallback(() => {
    const now = Date.now();
    frogState.setCurrentState('sleeping');
    frogState.setMood('sad');

    setState(prev => ({
      ...prev,
      status: 'SLEEPING',
      hibernatedAt: prev.hibernatedAt ?? now,
      wakeProgress: 0,
      dormantHours: prev.hibernatedAt ? prev.dormantHours : 0,
      blessingsReceived: 0,
      lastBlessingAt: null,
    }));
  }, [frogState]);

  const finishWakeUp = useCallback(() => {
    if (wakeIntervalRef.current) {
      clearInterval(wakeIntervalRef.current);
      wakeIntervalRef.current = null;
    }

    frogState.setCurrentState('idle');
    frogState.setMood('happy');
    frogState.setStats(prev => ({
      ...prev,
      energy: Math.min(100, prev.energy + 20),
      happiness: Math.min(100, prev.happiness + 12),
      hunger: Math.max(10, prev.hunger - 5),
    }));

    setState({
      status: 'ACTIVE',
      lastInteractionAt: Date.now(),
      hibernatedAt: null,
      wakeProgress: 100,
      dormantHours: 0,
      blessingsReceived: 0,
      lastBlessingAt: null,
    });
  }, [frogState]);

  const wakeUp = useCallback(() => {
    if (state.status !== 'SLEEPING') return;

    frogState.setCurrentState('sleeping');
    frogState.setMood('neutral');
    setState(prev => ({ ...prev, status: 'WAKING', wakeProgress: 0 }));

    const startedAt = Date.now();
    wakeIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(100, Math.round((elapsed / wakeDurationMs) * 100));

      setState(prev => ({ ...prev, status: 'WAKING', wakeProgress: progress }));

      if (progress >= 100) {
        finishWakeUp();
      }
    }, 300);
  }, [finishWakeUp, frogState, state.status, wakeDurationMs]);

  useEffect(() => {
    if (!enabled || state.status === 'SLEEPING' || state.status === 'WAKING') return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (shouldEnterHibernation(state.lastInteractionAt, now, inactivityThresholdMs)) {
        enterHibernation();
      }
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [enabled, state.lastInteractionAt, state.status, inactivityThresholdMs, enterHibernation]);

  useEffect(() => {
    const onBlessingCompleted = () => {
      setState(prev => ({
        ...prev,
        blessingsReceived: prev.blessingsReceived + 1,
        lastBlessingAt: Date.now(),
        wakeProgress: prev.status === 'WAKING' ? Math.min(100, prev.wakeProgress + 20) : prev.wakeProgress,
      }));
    };

    window.addEventListener('ritual:blessingCompleted', onBlessingCompleted);
    return () => {
      window.removeEventListener('ritual:blessingCompleted', onBlessingCompleted);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (wakeIntervalRef.current) clearInterval(wakeIntervalRef.current);
    };
  }, []);

  return {
    hibernation: {
      ...state,
      dormantHours,
    },
    isHibernating: state.status === 'SLEEPING',
    isWaking: state.status === 'WAKING',
    recordInteraction,
    enterHibernation,
    wakeUp,
  };
}
