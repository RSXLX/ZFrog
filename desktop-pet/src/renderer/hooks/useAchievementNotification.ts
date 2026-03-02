import { useState, useEffect, useCallback } from 'react';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  maxProgress: number;
  reward: number;
  unlocked: boolean;
  unlockedAt?: number;
}

const achievementList: Achievement[] = [
  { id: 'first_interaction', title: '初次互动', description: '进行第一次互动', icon: '👋', progress: 0, maxProgress: 1, reward: 10, unlocked: false },
  { id: 'feed_10', title: '美食家', description: '喂食10次', icon: '🍎', progress: 0, maxProgress: 10, reward: 50, unlocked: false },
  { id: 'pet_50', title: '亲密伙伴', description: '抚摸50次', icon: '💕', progress: 0, maxProgress: 50, reward: 100, unlocked: false },
  { id: 'level_5', title: '小有名气', description: '达到5级', icon: '⭐', progress: 0, maxProgress: 5, reward: 200, unlocked: false },
  { id: 'level_10', title: '小有名气', description: '达到10级', icon: '🌟', progress: 0, maxProgress: 10, reward: 500, unlocked: false },
  { id: 'patrol_10', title: '巡逻达人', description: '巡逻10次', icon: '🎯', progress: 0, maxProgress: 10, reward: 100, unlocked: false },
  { id: 'travel_5', title: '旅行家', description: '旅行5次', icon: '✈️', progress: 0, maxProgress: 5, reward: 150, unlocked: false },
  { id: 'friend_5', title: '人脉广', description: '添加5个好友', icon: '👥', progress: 0, maxProgress: 5, reward: 100, unlocked: false },
  { id: 'streak_7', title: '坚持不懈', description: '连续登录7天', icon: '🔥', progress: 0, maxProgress: 7, reward: 300, unlocked: false },
  { id: 'rich', title: '小富翁', description: '拥有1000金币', icon: '💰', progress: 0, maxProgress: 1000, reward: 500, unlocked: false },
];

export function useAchievementNotification() {
  const [achievements, setAchievements] = useState<Achievement[]>(achievementList);
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('zfrog_achievements');
      if (saved) {
        const loaded = JSON.parse(saved);
        setAchievements(prev => prev.map(a => {
          const saved = loaded.find((s: Achievement) => s.id === a.id);
          return saved ? { ...a, ...saved } : a;
        }));
      }
    } catch (e) {
      console.warn('Failed to load achievements:', e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('zfrog_achievements', JSON.stringify(achievements));
    } catch (e) {
      console.warn('Failed to save achievements:', e);
    }
  }, [achievements]);

  const updateProgress = useCallback((id: string, amount: number = 1) => {
    setAchievements(prev => prev.map(a => {
      if (a.id === id && !a.unlocked) {
        const newProgress = Math.min(a.maxProgress, a.progress + amount);
        if (newProgress >= a.maxProgress) {
          setTimeout(() => setNewAchievement({ ...a, progress: newProgress, unlocked: true, unlockedAt: Date.now() }), 500);
          return { ...a, progress: newProgress, unlocked: true, unlockedAt: Date.now() };
        }
        return { ...a, progress: newProgress };
      }
      return a;
    }));
  }, []);

  const dismissAchievement = useCallback(() => {
    setNewAchievement(null);
  }, []);

  return { achievements, updateProgress, newAchievement, dismissAchievement };
}
