import { useState, useEffect, useCallback } from 'react';

export interface GameEvent {
  id: string;
  type: 'birthday' | 'season' | 'holiday' | 'achievement' | 'milestone';
  title: string;
  description: string;
  icon: string;
  reward?: number;
  startDate?: number;
  endDate?: number;
}

const seasonalEvents: GameEvent[] = [
  {
    id: 'spring_festival',
    type: 'holiday',
    title: '春节活动',
    description: '春节期间登录领取额外奖励！',
    icon: '🧧',
    reward: 500,
  },
  {
    id: 'valentine',
    type: 'holiday',
    title: '情人节',
    description: '和宠物一起过情人节~',
    icon: '💕',
    reward: 200,
  },
  {
    id: 'halloween',
    type: 'holiday',
    title: '万圣节',
    description: '不给糖就捣蛋！',
    icon: '🎃',
    reward: 300,
  },
  {
    id: 'christmas',
    type: 'holiday',
    title: '圣诞节',
    description: '圣诞快乐！',
    icon: '🎄',
    reward: 500,
  },
];

export function useEventSystem() {
  const [activeEvents, setActiveEvents] = useState<GameEvent[]>([]);
  const [currentSeason, setCurrentSeason] = useState<string>('');

  // Determine current season
  useEffect(() => {
    const month = new Date().getMonth();
    let season = '';
    if (month >= 2 && month <= 4) season = 'spring';
    else if (month >= 5 && month <= 7) season = 'summer';
    else if (month >= 8 && month <= 10) season = 'autumn';
    else season = 'winter';
    setCurrentSeason(season);
  }, []);

  // Load active events
  useEffect(() => {
    // In a real app, this would fetch from server
    setActiveEvents(seasonalEvents);
  }, []);

  const getSeasonIcon = useCallback(() => {
    const icons: Record<string, string> = {
      spring: '🌸',
      summer: '☀️',
      autumn: '🍂',
      winter: '❄️',
    };
    return icons[currentSeason] || '🌤️';
  }, [currentSeason]);

  const getSeasonName = useCallback(() => {
    const names: Record<string, string> = {
      spring: '春天',
      summer: '夏天',
      autumn: '秋天',
      winter: '冬天',
    };
    return names[currentSeason] || '';
  }, [currentSeason]);

  return {
    activeEvents,
    currentSeason,
    getSeasonIcon,
    getSeasonName,
    seasonalEvents,
  };
}
