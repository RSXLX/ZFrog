import { useState, useEffect, useCallback } from 'react';

export interface Activity {
  id: string;
  type: 'login' | 'feed' | 'pet' | 'play' | 'task' | 'achievement';
  description: string;
  timestamp: number;
  reward?: number;
}

export function useActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [streak, setStreak] = useState(0);
  const [lastLogin, setLastLogin] = useState<string>('');

  // Load from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zfrog_activities');
      if (saved) setActivities(JSON.parse(saved));
      
      const streakData = localStorage.getItem('zfrog_streak');
      if (streakData) setStreak(JSON.parse(streakData));
      
      setLastLogin(localStorage.getItem('zfrog_last_login') || '');
    } catch (e) {
      console.warn('Failed to load activities:', e);
    }
  }, []);

  // Save to storage
  useEffect(() => {
    try {
      localStorage.setItem('zfrog_activities', JSON.stringify(activities.slice(0, 50)));
      localStorage.setItem('zfrog_streak', JSON.stringify(streak));
    } catch (e) {
      console.warn('Failed to save activities:', e);
    }
  }, [activities, streak]);

  const addActivity = useCallback((type: Activity['type'], description: string, reward?: number) => {
    const activity: Activity = {
      id: `activity_${Date.now()}`,
      type,
      description,
      timestamp: Date.now(),
      reward,
    };
    setActivities(prev => [activity, ...prev].slice(0, 50));
  }, []);

  const checkDailyLogin = useCallback(() => {
    const today = new Date().toDateString();
    if (lastLogin !== today) {
      // New day login
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastLogin === yesterday.toDateString()) {
        // Consecutive login
        setStreak(prev => prev + 1);
      } else if (lastLogin !== '') {
        // Streak broken
        setStreak(1);
      } else {
        // First login
        setStreak(1);
      }
      
      setLastLogin(today);
      localStorage.setItem('zfrog_last_login', today);
      
      // Login reward
      const loginReward = 10 + streak * 5;
      addActivity('login', '每日登录', loginReward);
      return loginReward;
    }
    return 0;
  }, [lastLogin, streak, addActivity]);

  const getTodayActivities = useCallback(() => {
    const today = new Date().toDateString();
    return activities.filter(a => new Date(a.timestamp).toDateString() === today);
  }, [activities]);

  const getActivitiesByType = useCallback((type: Activity['type']) => {
    return activities.filter(a => a.type === type);
  }, [activities]);

  return {
    activities,
    streak,
    addActivity,
    checkDailyLogin,
    getTodayActivities,
    getActivitiesByType,
  };
}
