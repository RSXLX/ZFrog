import { useCallback, useEffect, useMemo } from 'react';
import storage from '../services/storage';
import { useLifeState } from '../features/life-actions/useLifeState';
import type { FrogStats } from './useFrogState';

interface UseLifeCycleReturn {
  isSleeping: boolean;
  isCritical: boolean;
  feed: () => void;
  play: () => void;
  sleep: () => void;
  wake: () => void;
}

export function useLifeCycle(frogState: any): UseLifeCycleReturn {
  const lifeState = useLifeState({
    frogId: storage.getActiveFrogId(),
  });

  useEffect(() => {
    const stats = lifeState.toFrogStats();
    if (!stats) return;
    frogState.setStats((prev: FrogStats) => ({
      ...prev,
      hunger: stats.hunger,
      energy: stats.energy,
      happiness: stats.happiness,
    }));
  }, [lifeState.life, lifeState, frogState]);

  const isSleeping = useMemo(
    () => lifeState.life?.hibernationStatus === 'SLEEPING' || frogState.currentState === 'sleeping',
    [lifeState.life?.hibernationStatus, frogState.currentState]
  );

  const isCritical = useMemo(() => {
    if (lifeState.life) {
      return lifeState.life.health <= 20 || lifeState.life.energy <= 20 || lifeState.life.hunger <= 20;
    }
    return frogState.stats.hunger < 20 || frogState.stats.energy < 20 || frogState.stats.happiness < 20;
  }, [lifeState.life, frogState.stats]);

  const feed = useCallback(() => {
    void lifeState.feed('BUG_BENTO', 1);
    frogState.interact('feed');
  }, [lifeState, frogState]);

  const play = useCallback(() => {
    void lifeState.play('guess');
    frogState.interact('pet');
  }, [lifeState, frogState]);

  const sleep = useCallback(() => {
    void lifeState.startRest();
    frogState.setCurrentState('sleeping');
  }, [lifeState, frogState]);

  const wake = useCallback(() => {
    void lifeState.endRest();
    frogState.setCurrentState('idle');
  }, [lifeState, frogState]);

  return {
    isSleeping,
    isCritical,
    feed,
    play,
    sleep,
    wake,
  };
}
