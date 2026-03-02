import { useState, useEffect, useCallback } from 'react';

export type MoodType = 'very_happy' | 'happy' | 'neutral' | 'sad' | 'very_sad' | 'angry' | 'excited' | 'sleepy' | 'confused';

export interface MoodLog {
  mood: MoodType;
  timestamp: number;
  reason: string;
}

const moodReasons: Record<MoodType, string[]> = {
  very_happy: ['被抚摸了很多次', '吃了好吃的东西', '收到了礼物', '天气很好'],
  happy: ['和主人互动了', '完成了一个任务', '获得了新物品'],
  neutral: ['正在休息', '四处张望中', '无所事事'],
  sad: ['被戳了一下', '饿了', '困了'],
  very_sad: ['很长时间没互动了', '生病了', '心情不好'],
  angry: ['被弄疼了', '打扰到休息了', '不喜欢这个动作'],
  excited: ['发现了有趣的东西', '有好事发生了', '收到了好消息'],
  sleepy: ['太晚了', '刚睡醒', '有点困'],
  confused: ['发生了什么', '不太理解', '有点困惑'],
};

export function useMood() {
  const [currentMood, setCurrentMood] = useState<MoodType>('neutral');
  const [moodHistory, setMoodHistory] = useState<MoodLog[]>([]);

  // Load from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zfrog_mood_history');
      if (saved) setMoodHistory(JSON.parse(saved));
    } catch (e) {
      console.warn('Failed to load mood:', e);
    }
  }, []);

  // Save to storage
  useEffect(() => {
    try {
      localStorage.setItem('zfrog_mood_history', JSON.stringify(moodHistory.slice(0, 50)));
    } catch (e) {
      console.warn('Failed to save mood:', e);
    }
  }, [moodHistory]);

  const changeMood = useCallback((mood: MoodType, reason?: string) => {
    setCurrentMood(mood);
    const log: MoodLog = {
      mood,
      timestamp: Date.now(),
      reason: reason || moodReasons[mood][Math.floor(Math.random() * moodReasons[mood].length)],
    };
    setMoodHistory(prev => [log, ...prev].slice(0, 50));
  }, []);

  const getMoodEmoji = useCallback((mood: MoodType) => {
    const emojis: Record<MoodType, string> = {
      very_happy: '😄',
      happy: '😊',
      neutral: '😐',
      sad: '😢',
      very_sad: '😭',
      angry: '😠',
      excited: '🎉',
      sleepy: '😴',
      confused: '🤔',
    };
    return emojis[mood];
  }, []);

  const autoMoodFromStats = useCallback((stats: { hunger: number; energy: number; happiness: number }) => {
    if (stats.hunger < 20) return changeMood('sad', '太饿了');
    if (stats.energy < 20) return changeMood('sleepy', '太累了');
    if (stats.happiness > 80) return changeMood('very_happy', '很开心');
    if (stats.happiness > 50) return changeMood('happy', '心情不错');
    if (stats.happiness < 30) return changeMood('sad', '有点难过');
    return changeMood('neutral', '状态正常');
  }, [changeMood]);

  return { currentMood, moodHistory, changeMood, getMoodEmoji, autoMoodFromStats };
}
