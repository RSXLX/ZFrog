import { useCallback, useMemo } from 'react';
import storage from '../services/storage';
import { useLifeState } from '../features/life-actions/useLifeState';

interface LifeStats {
  hunger: number;
  energy: number;
  happiness: number;
  health: number;
}

interface UseNewLifecycleReturn {
  stats: LifeStats;
  feed: () => void;
  sleep: () => void;
  play: () => void;
  pet: () => void;
  giveMedicine: () => void;
  isWarning: (stat: keyof LifeStats) => boolean;
  isCritical: (stat: keyof LifeStats) => boolean;
}

const WARNING_LINE = 35;
const CRITICAL_LINE = 20;

export function useNewLifecycle(): UseNewLifecycleReturn {
  const lifeState = useLifeState({
    frogId: storage.getActiveFrogId(),
  });

  const stats = useMemo<LifeStats>(
    () => ({
      hunger: Math.round(lifeState.life?.hunger ?? 80),
      energy: Math.round(lifeState.life?.energy ?? 80),
      happiness: Math.round(lifeState.life?.happiness ?? 80),
      health: Math.round(lifeState.life?.health ?? 80),
    }),
    [lifeState.life]
  );

  const isWarning = useCallback((stat: keyof LifeStats) => {
    return stats[stat] <= WARNING_LINE && stats[stat] > CRITICAL_LINE;
  }, [stats]);

  const isCritical = useCallback((stat: keyof LifeStats) => {
    return stats[stat] <= CRITICAL_LINE;
  }, [stats]);

  return {
    stats,
    feed: () => {
      void lifeState.feed('BUG_BENTO', 1);
    },
    sleep: () => {
      void lifeState.startRest();
    },
    play: () => {
      void lifeState.play('guess');
    },
    pet: () => {
      void lifeState.play('pet');
    },
    giveMedicine: () => {
      void lifeState.heal();
    },
    isWarning,
    isCritical,
  };
}

export default useNewLifecycle;
