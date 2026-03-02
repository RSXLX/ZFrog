import { useState, useEffect, useCallback } from 'react';

export interface PetStats {
  level: number;
  exp: number;
  expToNext: number;
  health: number;
  hunger: number;
  energy: number;
  happiness: number;
  charm: number;
  intelligence: number;
}

const MAX_STAT = 100;

export function usePetStats() {
  const [stats, setStats] = useState<PetStats>({
    level: 1,
    exp: 0,
    expToNext: 100,
    health: 100,
    hunger: 70,
    energy: 80,
    happiness: 60,
    charm: 50,
    intelligence: 50,
  });

  // Load from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zfrog_pet_stats');
      if (saved) {
        setStats(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load pet stats:', e);
    }
  }, []);

  // Save to storage
  useEffect(() => {
    try {
      localStorage.setItem('zfrog_pet_stats', JSON.stringify(stats));
    } catch (e) {
      console.warn('Failed to save pet stats:', e);
    }
  }, [stats]);

  // Add experience
  const addExp = useCallback((amount: number) => {
    setStats(prev => {
      let newExp = prev.exp + amount;
      let newLevel = prev.level;
      let newExpToNext = prev.expToNext;
      
      // Level up
      while (newExp >= newExpToNext) {
        newExp -= newExpToNext;
        newLevel++;
        newExpToNext = Math.floor(newExpToNext * 1.5);
      }
      
      return { ...prev, exp: newExp, level: newLevel, expToNext: newExpToNext };
    });
  }, []);

  // Update stat
  const updateStat = useCallback((stat: keyof Omit<PetStats, 'level' | 'exp' | 'expToNext'>, value: number) => {
    setStats(prev => ({
      ...prev,
      [stat]: Math.min(MAX_STAT, Math.max(0, value))
    }));
  }, []);

  // Increase stat
  const increaseStat = useCallback((stat: keyof Omit<PetStats, 'level' | 'exp' | 'expToNext'>, amount: number) => {
    setStats(prev => ({
      ...prev,
      [stat]: Math.min(MAX_STAT, prev[stat] + amount)
    }));
  }, []);

  return { stats, addExp, updateStat, increaseStat };
}
