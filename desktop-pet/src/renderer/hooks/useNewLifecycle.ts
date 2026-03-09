/**
 * New Lifecycle Hook - Enhanced with fixed decay rates
 * Integrates with the improved lifecycle configuration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { LIFECYCLE_CONFIG } from '../../config/lifecycle';

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

export function useNewLifecycle(): UseNewLifecycleReturn {
  const [stats, setStats] = useState<LifeStats>({
    hunger: 80,
    energy: 80,
    happiness: 80,
    health: 80,
  });

  const decayIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Apply decay
  const applyDecay = useCallback(() => {
    setStats((prev) => {
      const now = Date.now();
      
      // Calculate decay for each stat
      const hungerDecay = calculateDecay(
        prev.hunger,
        LIFECYCLE_CONFIG.decay.hunger,
        now
      );
      
      const energyDecay = calculateDecay(
        prev.energy,
        LIFECYCLE_CONFIG.decay.energy,
        now
      );
      
      const happinessDecay = calculateDecay(
        prev.happiness,
        LIFECYCLE_CONFIG.decay.happiness,
        now
      );
      
      const healthDecay = calculateDecay(
        prev.health,
        LIFECYCLE_CONFIG.decay.health,
        now
      );

      return {
        hunger: clamp(hungerDecay, 0, 100),
        energy: clamp(energyDecay, 0, 100),
        happiness: clamp(happinessDecay, 0, 100),
        health: clamp(healthDecay, 0, 100),
      };
    });
  }, []);

  // Start decay interval
  useEffect(() => {
    // Apply decay every minute
    decayIntervalRef.current = setInterval(applyDecay, 60000);

    return () => {
      if (decayIntervalRef.current) {
        clearInterval(decayIntervalRef.current);
      }
    };
  }, [applyDecay]);

  // Actions
  const feed = useCallback(() => {
    setStats((prev) => ({
      ...prev,
      hunger: clamp(prev.hunger + LIFECYCLE_CONFIG.recovery.feed.hunger, 0, 100),
      health: clamp(prev.health + LIFECYCLE_CONFIG.recovery.feed.health, 0, 100),
    }));
  }, []);

  const sleep = useCallback(() => {
    setStats((prev) => ({
      ...prev,
      energy: clamp(prev.energy + LIFECYCLE_CONFIG.recovery.sleep.energy, 0, 100),
      health: clamp(prev.health + LIFECYCLE_CONFIG.recovery.sleep.health, 0, 100),
    }));
  }, []);

  const play = useCallback(() => {
    setStats((prev) => ({
      ...prev,
      happiness: clamp(prev.happiness + LIFECYCLE_CONFIG.recovery.play.happiness, 0, 100),
      energy: clamp(prev.energy + LIFECYCLE_CONFIG.recovery.play.energy, 0, 100),
    }));
  }, []);

  const pet = useCallback(() => {
    setStats((prev) => ({
      ...prev,
      happiness: clamp(prev.happiness + LIFECYCLE_CONFIG.recovery.pet.happiness, 0, 100),
      health: clamp(prev.health + LIFECYCLE_CONFIG.recovery.pet.health, 0, 100),
    }));
  }, []);

  const giveMedicine = useCallback(() => {
    setStats((prev) => ({
      ...prev,
      health: clamp(prev.health + LIFECYCLE_CONFIG.recovery.medicine.health, 0, 100),
    }));
  }, []);

  // Status checks
  const isWarning = useCallback((stat: keyof LifeStats): boolean => {
    return stats[stat] <= LIFECYCLE_CONFIG.thresholds.warning && stats[stat] > LIFECYCLE_CONFIG.thresholds.critical;
  }, [stats]);

  const isCritical = useCallback((stat: keyof LifeStats): boolean => {
    return stats[stat] <= LIFECYCLE_CONFIG.thresholds.critical;
  }, [stats]);

  return {
    stats,
    feed,
    sleep,
    play,
    pet,
    giveMedicine,
    isWarning,
    isCritical,
  };
}

// Helper functions
function calculateDecay(currentValue: number, decayConfig: { value: number; interval: number }, lastUpdate: number): number {
  // Simplified decay calculation
  // In real implementation, would track last update time per stat
  return currentValue - decayConfig.value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export default useNewLifecycle;
