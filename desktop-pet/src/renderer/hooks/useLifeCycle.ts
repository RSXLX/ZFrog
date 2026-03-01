import { useEffect, useRef, useCallback } from 'react';
import { useFrogState, FrogStats } from './useFrogState';

// Constants for stat decay rates (per minute)
const DECAY_RATES = {
  hunger: 0.5,    // -0.5 per minute
  energy: 1.0,     // -1.0 per minute (faster)
  happiness: 0.3,  // -0.3 per minute
};

// Recovery rates (per minute)
const RECOVERY_RATES = {
  energy: 2.0,     // +2.0 per minute when sleeping
};

interface UseLifeCycleReturn {
  isSleeping: boolean;
  isCritical: boolean;
  feed: () => void;
  play: () => void;
  sleep: () => void;
  wake: () => void;
}

export function useLifeCycle(frogState: any): UseLifeCycleReturn {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  
  const isSleeping = frogState.currentState === 'sleeping';
  
  // Check if any stat is critical
  const isCritical = 
    frogState.stats.hunger < 20 ||
    frogState.stats.energy < 20 ||
    frogState.stats.happiness < 20;

  // Update stats based on time passed
  const updateStats = useCallback(() => {
    const now = Date.now();
    const minutesPassed = (now - lastUpdateRef.current) / 60000;
    lastUpdateRef.current = now;
    
    if (minutesPassed < 0.01) return; // Skip very small intervals
    
    frogState.setStats((prev: FrogStats) => {
      const newStats = { ...prev };
      
      if (isSleeping) {
        // Recover energy when sleeping, slower hunger decay
        newStats.energy = Math.min(100, prev.energy + (RECOVERY_RATES.energy * minutesPassed));
        newStats.hunger = Math.max(0, prev.hunger - (DECAY_RATES.hunger * 0.3 * minutesPassed));
      } else {
        // Normal decay
        newStats.hunger = Math.max(0, prev.hunger - (DECAY_RATES.hunger * minutesPassed));
        newStats.energy = Math.max(0, prev.energy - (DECAY_RATES.energy * minutesPassed));
      }
      
      newStats.happiness = Math.max(0, prev.happiness - (DECAY_RATES.happiness * minutesPassed));
      
      return newStats;
    });
  }, [frogState, isSleeping]);

  // Update state based on stats
  const updateState = useCallback(() => {
    const { hunger, energy, happiness } = frogState.stats;
    const currentState = frogState.currentState;
    
    // State transitions based on stats
    if (energy < 20 && currentState === 'idle') {
      frogState.setCurrentState('sleeping');
      frogState.setMood('sad');
    } else if (energy > 60 && isSleeping) {
      frogState.setCurrentState('idle');
    }
    
    if (hunger < 20 && currentState === 'idle') {
      frogState.setMood('sad');
    }
    
    if (happiness < 10) {
      frogState.setMood('very_sad');
    } else if (happiness < 30) {
      frogState.setMood('sad');
    } else if (happiness > 60 && currentState === 'idle') {
      frogState.setMood('happy');
    }
  }, [frogState, isSleeping]);

  // Main lifecycle loop
  useEffect(() => {
    // Update every 10 seconds
    intervalRef.current = setInterval(() => {
      updateStats();
    }, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [updateStats]);

  // Check state changes when stats change
  useEffect(() => {
    updateState();
  }, [frogState.stats, updateState]);

  // Feed action
  const feed = useCallback(() => {
    frogState.setStats((prev: FrogStats) => ({
      ...prev,
      hunger: Math.min(100, prev.hunger + 30),
      happiness: Math.min(100, prev.happiness + 5),
    }));
    frogState.interact('feed');
  }, [frogState]);

  // Play action
  const play = useCallback(() => {
    frogState.setStats((prev: FrogStats) => ({
      ...prev,
      happiness: Math.min(100, prev.happiness + 20),
      energy: Math.max(0, prev.energy - 5),
    }));
    frogState.interact('pet');
  }, [frogState]);

  // Sleep action
  const sleep = useCallback(() => {
    frogState.setCurrentState('sleeping');
    frogState.setMood('neutral');
  }, [frogState]);

  // Wake action
  const wake = useCallback(() => {
    frogState.setCurrentState('idle');
  }, [frogState]);

  return {
    isSleeping,
    isCritical,
    feed,
    play,
    sleep,
    wake,
  };
}
