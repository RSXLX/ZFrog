import { useState, useCallback, useRef } from 'react';
import { InteractionStats, FoodItem } from '../types/frogAnimation';

export function useFrogInteraction() {
  const [stats, setStats] = useState<InteractionStats>({
    totalClicks: 0,
    totalPets: 0,
    totalFeeds: 0,
    totalTravels: 0,
    lastInteraction: Date.now(),
  });
  
  const clickTimestamps = useRef<number[]>([]);
  const interactionHistory = useRef<string[]>([]);
  
  // 记录点击
  const recordClick = useCallback(() => {
    const now = Date.now();
    
    // 清理 2 秒前的点击记录
    clickTimestamps.current = clickTimestamps.current.filter(
      ts => now - ts < 2000
    );
    clickTimestamps.current.push(now);
    
    setStats(prev => ({
      ...prev,
      totalClicks: prev.totalClicks + 1,
      lastInteraction: now,
    }));
    
    // 记录互动历史
    interactionHistory.current.push('click');
    if (interactionHistory.current.length > 10) {
      interactionHistory.current.shift();
    }
    
    return clickTimestamps.current.length;
  }, []);
  
  // 抚摸
  const pet = useCallback(() => {
    setStats(prev => ({
      ...prev,
      totalPets: prev.totalPets + 1,
      lastInteraction: Date.now(),
    }));
    
    interactionHistory.current.push('pet');
    if (interactionHistory.current.length > 10) {
      interactionHistory.current.shift();
    }
  }, []);
  
  // 喂食
  const feed = useCallback((foodType: string) => {
    setStats(prev => ({
      ...prev,
      totalFeeds: prev.totalFeeds + 1,
      lastInteraction: Date.now(),
    }));
    
    interactionHistory.current.push(`feed_${foodType}`);
    if (interactionHistory.current.length > 10) {
      interactionHistory.current.shift();
    }
    
    // 返回喂食效果
    const effects: Record<string, { energy: number; happiness: number }> = {
      'fly': { energy: 10, happiness: 5 },      // 苍蝇 - 普通
      'worm': { energy: 20, happiness: 10 },    // 虫子 - 好吃
      'cricket': { energy: 30, happiness: 15 }, // 蟋蟀 - 美味
      'butterfly': { energy: 25, happiness: 20 }, // 蝴蝶 - 漂亮
      'dragonfly': { energy: 35, happiness: 25 }, // 蜻蜓 - 稀有
      'golden_fly': { energy: 50, happiness: 30 }, // 金苍蝇 - 稀有
    };
    
    return effects[foodType] || { energy: 5, happiness: 2 };
  }, []);
  
  // 旅行
  const travel = useCallback((destination: string) => {
    setStats(prev => ({
      ...prev,
      totalTravels: prev.totalTravels + 1,
      lastInteraction: Date.now(),
    }));
    
    interactionHistory.current.push(`travel_${destination}`);
    if (interactionHistory.current.length > 10) {
      interactionHistory.current.shift();
    }
    
    // 返回旅行效果
    const destinations: Record<string, { duration: number; reward: number }> = {
      'forest': { duration: 30000, reward: 10 },      // 森林 - 30秒
      'lake': { duration: 45000, reward: 15 },        // 湖边 - 45秒
      'mountain': { duration: 60000, reward: 25 },     // 山顶 - 60秒
      'city': { duration: 90000, reward: 35 },         // 城市 - 90秒
      'beach': { duration: 75000, reward: 30 },        // 海滩 - 75秒
    };
    
    return destinations[destination] || { duration: 30000, reward: 10 };
  }, []);
  
  // 检查是否需要注意力
  const needsAttention = useCallback(() => {
    const timeSinceLastInteraction = Date.now() - stats.lastInteraction;
    return timeSinceLastInteraction > 5 * 60 * 1000; // 5 分钟没互动
  }, [stats.lastInteraction]);
  
  // 获取互动建议
  const getSuggestion = useCallback((): string => {
    if (needsAttention()) {
      return '我有点无聊...来玩玩吧！';
    }
    
    // 基于最近互动历史提供建议
    const recentInteractions = interactionHistory.current.slice(-5);
    const petCount = recentInteractions.filter(i => i === 'pet').length;
    const feedCount = recentInteractions.filter(i => i.startsWith('feed')).length;
    
    if (petCount > 3) {
      return '好舒服~还想被抚摸！🥰';
    }
    
    if (feedCount > 3) {
      return '吃饱了！我们去旅行吧？🎒';
    }
    
    const suggestions = [
      '点击我可以互动哦！',
      '双击有惊喜~',
      '可以拖动我移动位置！',
      '给我找点虫子吃吧~',
      '想不想派我去旅行？',
      '最近链上有什么大事吗？',
      '我好无聊，陪我玩玩吧！',
    ];
    
    return suggestions[Math.floor(Math.random() * suggestions.length)];
  }, [needsAttention]);
  
  // 获取青蛙心情
  const getFrogMood = useCallback((): 'very_happy' | 'happy' | 'neutral' | 'sad' | 'very_sad' => {
    const timeSinceLastInteraction = Date.now() - stats.lastInteraction;
    const recentInteractions = interactionHistory.current.slice(-10);
    const positiveInteractions = recentInteractions.filter(i => 
      i === 'pet' || i.startsWith('feed') || i.startsWith('travel')
    ).length;
    
    // 基于互动频率和类型计算心情
    if (timeSinceLastInteraction > 10 * 60 * 1000) {
      return 'very_sad'; // 超过10分钟没互动
    }
    
    if (timeSinceLastInteraction > 5 * 60 * 1000) {
      return 'sad'; // 超过5分钟没互动
    }
    
    if (positiveInteractions >= 7) {
      return 'very_happy'; // 最近积极互动很多
    }
    
    if (positiveInteractions >= 4) {
      return 'happy'; // 最近积极互动较多
    }
    
    return 'neutral';
  }, [stats.lastInteraction]);
  
  // 获取互动统计
  const getInteractionStats = useCallback(() => {
    const total = stats.totalClicks + stats.totalPets + stats.totalFeeds + stats.totalTravels;
    const timeSinceLastInteraction = Date.now() - stats.lastInteraction;
    
    return {
      total,
      clicks: stats.totalClicks,
      pets: stats.totalPets,
      feeds: stats.totalFeeds,
      travels: stats.totalTravels,
      timeSinceLastInteraction,
      lastInteractionFormatted: formatTimeSince(stats.lastInteraction),
    };
  }, [stats]);
  
  // 检查连续互动
  const getComboLevel = useCallback((): number => {
    const now = Date.now();
    const recentInteractions = interactionHistory.current.filter(
      (_, index) => {
        const interactionTime = now - (interactionHistory.current.length - index) * 1000;
        return now - interactionTime < 10000; // 最近10秒
      }
    );
    
    return Math.min(recentInteractions.length, 10); // 最高10连击
  }, []);
  
  // 重置统计
  const resetStats = useCallback(() => {
    setStats({
      totalClicks: 0,
      totalPets: 0,
      totalFeeds: 0,
      totalTravels: 0,
      lastInteraction: Date.now(),
    });
    interactionHistory.current = [];
  }, []);
  
  return {
    stats,
    recordClick,
    pet,
    feed,
    travel,
    needsAttention,
    getSuggestion,
    getFrogMood,
    getInteractionStats,
    getComboLevel,
    resetStats,
  };
}

// 辅助函数：格式化时间
function formatTimeSince(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}天前`;
  }
  
  if (hours > 0) {
    return `${hours}小时前`;
  }
  
  if (minutes > 0) {
    return `${minutes}分钟前`;
  }
  
  return '刚刚';
}

// 食物配置
export const FOOD_ITEMS: FoodItem[] = [
  { id: 'fly', name: '苍蝇', emoji: '🪰', rarity: 'common', energy: 10, happiness: 5 },
  { id: 'worm', name: '虫子', emoji: '🪱', rarity: 'common', energy: 15, happiness: 8 },
  { id: 'cricket', name: '蟋蟀', emoji: '🦗', rarity: 'uncommon', energy: 25, happiness: 15 },
  { id: 'butterfly', name: '蝴蝶', emoji: '🦋', rarity: 'uncommon', energy: 20, happiness: 20 },
  { id: 'dragonfly', name: '蜻蜓', emoji: '🪰', rarity: 'rare', energy: 35, happiness: 25 },
  { id: 'golden_fly', name: '金苍蝇', emoji: '✨🪰', rarity: 'legendary', energy: 50, happiness: 40 },
];

// 旅行目的地配置
export const TRAVEL_DESTINATIONS = [
  { id: 'forest', name: '森林', emoji: '🌲', duration: 30000, reward: 10 },
  { id: 'lake', name: '湖边', emoji: '🏞️', duration: 45000, reward: 15 },
  { id: 'mountain', name: '山顶', emoji: '⛰️', duration: 60000, reward: 25 },
  { id: 'city', name: '城市', emoji: '🏙️', duration: 90000, reward: 35 },
  { id: 'beach', name: '海滩', emoji: '🏖️', duration: 75000, reward: 30 },
];