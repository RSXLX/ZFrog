import { useState, useEffect, useCallback } from 'react';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
  progress?: number;
  maxProgress?: number;
}

const achievementDefinitions: Achievement[] = [
  { id: 'first_pet', title: '初次抚摸', description: '第一次抚摸青蛙', icon: '👋', unlocked: false },
  { id: 'feed_10', title: '美食家', description: '喂食10次', icon: '🍎', unlocked: false, progress: 0, maxProgress: 10 },
  { id: 'pet_50', title: '亲密伙伴', description: '抚摸50次', icon: '💕', unlocked: false, progress: 0, maxProgress: 50 },
  { id: 'patrol_5', title: '巡逻达人', description: '完成5次巡逻', icon: '🎯', unlocked: false, progress: 0, maxProgress: 5 },
  { id: 'travel_3', title: '旅行家', description: '外出旅行3次', icon: '✈️', unlocked: false, progress: 0, maxProgress: 3 },
  { id: 'friends_10', title: '人脉广', description: '添加10个好友', icon: '👥', unlocked: false, progress: 0, maxProgress: 10 },
  { id: 'all_stats_max', title: '完美宠物', description: '所有数值达到100', icon: '⭐', unlocked: false },
  { id: 'streak_7', title: '坚持不懈', description: '连续登录7天', icon: '🔥', unlocked: false, progress: 0, maxProgress: 7 },
];

export function useAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>(achievementDefinitions);
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);

  // Load from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zfrog_achievements');
      if (saved) {
        setAchievements(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load achievements:', e);
    }
  }, []);

  // Save to storage
  useEffect(() => {
    try {
      localStorage.setItem('zfrog_achievements', JSON.stringify(achievements));
    } catch (e) {
      console.warn('Failed to save achievements:', e);
    }
  }, [achievements]);

  const unlockAchievement = useCallback((id: string) => {
    let unlocked = false;
    setAchievements(prev => prev.map(a => {
      if (a.id === id && !a.unlocked) {
        unlocked = true;
        return { ...a, unlocked: true, unlockedAt: Date.now() };
      }
      return a;
    }));
    
    if (unlocked) {
      const achievement = achievements.find(a => a.id === id);
      if (achievement) {
        setNewAchievement({ ...achievement, unlocked: true });
        setTimeout(() => setNewAchievement(null), 4000);
      }
    }
  }, [achievements]);

  const updateProgress = useCallback((id: string, progress: number) => {
    setAchievements(prev => prev.map(a => {
      if (a.id === id && !a.unlocked && a.maxProgress) {
        const newProgress = Math.min(progress, a.maxProgress);
        if (newProgress >= a.maxProgress) {
          setTimeout(() => unlockAchievement(id), 500);
          return { ...a, progress: newProgress, unlocked: true, unlockedAt: Date.now() };
        }
        return { ...a, progress: newProgress };
      }
      return a;
    }));
  }, [unlockAchievement]);

  const incrementProgress = useCallback((id: string) => {
    const achievement = achievements.find(a => a.id === id);
    if (achievement && achievement.progress !== undefined) {
      updateProgress(id, achievement.progress + 1);
    }
  }, [achievements, updateProgress]);

  const getUnlockedCount = useCallback(() => {
    return achievements.filter(a => a.unlocked).length;
  }, [achievements]);

  return {
    achievements,
    newAchievement,
    unlockAchievement,
    updateProgress,
    incrementProgress,
    getUnlockedCount,
  };
}
