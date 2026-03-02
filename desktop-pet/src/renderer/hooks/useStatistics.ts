import { useState, useEffect, useCallback } from 'react';

export interface Statistics {
  totalPlayTime: number; // minutes
  totalInteractions: number;
  feedCount: number;
  petCount: number;
  patrolCount: number;
  travelCount: number;
  achievementsUnlocked: number;
  longestSession: number; // minutes
  firstPlayDate: number;
  lastPlayDate: number;
}

const defaultStats: Statistics = {
  totalPlayTime: 0,
  totalInteractions: 0,
  feedCount: 0,
  petCount: 0,
  patrolCount: 0,
  travelCount: 0,
  achievementsUnlocked: 0,
  longestSession: 0,
  firstPlayDate: Date.now(),
  lastPlayDate: Date.now(),
};

export function useStatistics() {
  const [stats, setStats] = useState<Statistics>(defaultStats);
  const [sessionStart] = useState(Date.now());
  const [currentSessionTime, setCurrentSessionTime] = useState(0);

  // Load from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zfrog_statistics');
      if (saved) {
        setStats(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load statistics:', e);
    }
  }, []);

  // Save to storage
  useEffect(() => {
    try {
      localStorage.setItem('zfrog_statistics', JSON.stringify(stats));
    } catch (e) {
      console.warn('Failed to save statistics:', e);
    }
  }, [stats]);

  // Track session time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSessionTime(Math.floor((Date.now() - sessionStart) / 60000));
    }, 60000);
    return () => clearInterval(timer);
  }, [sessionStart]);

  // Update stat
  const incrementStat = useCallback((key: keyof Statistics, amount: number = 1) => {
    setStats(prev => ({
      ...prev,
      [key]: (prev[key] as number) + amount,
      totalInteractions: prev.totalInteractions + 1,
      lastPlayDate: Date.now(),
    }));
  }, []);

  // Calculate total stats
  const getTotalScore = useCallback(() => {
    return (
      stats.feedCount * 10 +
      stats.petCount * 5 +
      stats.patrolCount * 15 +
      stats.travelCount * 20 +
      stats.achievementsUnlocked * 50
    );
  }, [stats]);

  // End session
  const endSession = useCallback(() => {
    const sessionTime = Math.floor((Date.now() - sessionStart) / 60000);
    setStats(prev => ({
      ...prev,
      totalPlayTime: prev.totalPlayTime + sessionTime,
      longestSession: Math.max(prev.longestSession, sessionTime),
    }));
  }, [sessionStart]);

  return {
    stats,
    currentSessionTime,
    incrementStat,
    getTotalScore,
    endSession,
  };
}
