/**
 * 青蛙互动 Hook (服务器同步版)
 * 与后端 API 同步，支持持久化状态
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { lifeFeatureApi, LegacyFrogInteractionStatus } from '../features/life/api';
import { FoodItem } from '../types/frogAnimation';

type FrogStatus = LegacyFrogInteractionStatus;
type FoodInventory = Record<string, number>;

export interface InteractionStats {
  totalClicks: number;
  totalPets: number;
  totalFeeds: number;
  totalTravels: number;
  lastInteraction: number;
}

export interface UseFrogInteractionOptions {
  tokenId?: number;
  ownerAddress?: string;
  autoSync?: boolean;
}

export function useFrogInteraction(options: UseFrogInteractionOptions = {}) {
  const { tokenId, ownerAddress, autoSync = true } = options;
  
  // 本地统计 (会话级别)
  const [stats, setStats] = useState<InteractionStats>({
    totalClicks: 0,
    totalPets: 0,
    totalFeeds: 0,
    totalTravels: 0,
    lastInteraction: Date.now(),
  });
  
  // 服务器同步状态
  const [serverStatus, setServerStatus] = useState<FrogStatus | null>(null);
  const [inventory, setInventory] = useState<FoodInventory>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const clickTimestamps = useRef<number[]>([]);
  const interactionHistory = useRef<string[]>([]);
  
  // 从服务器加载状态
  const loadStatus = useCallback(async () => {
    if (!tokenId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const status = await lifeFeatureApi.getLegacyInteractionStatus(tokenId);
      setServerStatus(status);
    } catch (err) {
      console.error('Failed to load frog status:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [tokenId]);
  
  // 从服务器加载库存
  const loadInventory = useCallback(async () => {
    if (!tokenId) return;
    
    try {
      const result = await lifeFeatureApi.getLegacyInteractionInventory(tokenId);
      setInventory(result.inventory || {});
    } catch (err) {
      console.error('Failed to load inventory:', err);
    }
  }, [tokenId]);
  
  // 初始加载
  useEffect(() => {
    if (autoSync && tokenId) {
      loadStatus();
      loadInventory();
    }
  }, [autoSync, tokenId, loadStatus, loadInventory]);
  
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
  
  // 抚摸 (同步到服务器)
  const pet = useCallback(async () => {
    const now = Date.now();
    
    setStats(prev => ({
      ...prev,
      totalPets: prev.totalPets + 1,
      lastInteraction: now,
    }));
    
    interactionHistory.current.push('pet');
    if (interactionHistory.current.length > 10) {
      interactionHistory.current.shift();
    }
    
    // 同步到服务器
    if (tokenId && ownerAddress) {
      try {
        const result = await lifeFeatureApi.interactLegacyInteraction(tokenId, {
          interactionType: 'pet',
          ownerAddress,
        });
        setServerStatus(prev => prev ? {
          ...prev,
          happiness: result.happiness,
          lastInteractedAt: result.lastInteractedAt,
        } : null);
        return result;
      } catch (err) {
        console.error('Failed to sync pet interaction:', err);
      }
    }
    
    return { happiness: 0, happinessGiven: 5, interactionType: 'pet', lastInteractedAt: '' };
  }, [tokenId, ownerAddress]);
  
  // 喂食 (同步到服务器)
  const feed = useCallback(async (foodType: string) => {
    const now = Date.now();
    
    setStats(prev => ({
      ...prev,
      totalFeeds: prev.totalFeeds + 1,
      lastInteraction: now,
    }));
    
    interactionHistory.current.push(`feed_${foodType}`);
    if (interactionHistory.current.length > 10) {
      interactionHistory.current.shift();
    }
    
    // 同步到服务器
    if (tokenId && ownerAddress) {
      try {
        const result = await lifeFeatureApi.feedLegacyInteraction(tokenId, {
          foodType,
          ownerAddress,
        });
        
        // 更新服务器状态
        setServerStatus(prev => prev ? {
          ...prev,
          hunger: result.hunger,
          happiness: result.happiness,
          lastFedAt: result.lastFedAt,
        } : null);
        
        // 更新本地库存
        setInventory(prev => ({
          ...prev,
          [foodType]: Math.max(0, (prev[foodType] || 0) - 1),
        }));
        
        return {
          energy: result.foodUsed.energyGiven,
          happiness: result.foodUsed.happinessGiven,
          success: true,
        };
      } catch (err) {
        console.error('Failed to sync feed:', err);
        return { energy: 0, happiness: 0, success: false, error: (err as Error).message };
      }
    }
    
    // Fallback: 本地效果
    const effects: Record<string, { energy: number; happiness: number }> = {
      'fly': { energy: 10, happiness: 5 },
      'worm': { energy: 20, happiness: 10 },
      'cricket': { energy: 30, happiness: 15 },
      'butterfly': { energy: 25, happiness: 20 },
      'dragonfly': { energy: 35, happiness: 25 },
      'golden_fly': { energy: 50, happiness: 30 },
    };
    
    return { ...effects[foodType] || { energy: 5, happiness: 2 }, success: true };
  }, [tokenId, ownerAddress]);
  
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
      'forest': { duration: 30000, reward: 10 },
      'lake': { duration: 45000, reward: 15 },
      'mountain': { duration: 60000, reward: 25 },
      'city': { duration: 90000, reward: 35 },
      'beach': { duration: 75000, reward: 30 },
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
    // 基于服务器状态的建议
    if (serverStatus) {
      if (serverStatus.hunger < 30) {
        return '我好饿...给我找点吃的吧！🍽️';
      }
      if (serverStatus.happiness < 30) {
        return '我有点不开心...来陪我玩玩吧！😢';
      }
    }
    
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
  }, [needsAttention, serverStatus]);
  
  // 获取青蛙心情 (优先使用服务器状态)
  const getFrogMood = useCallback((): 'very_happy' | 'happy' | 'neutral' | 'sad' | 'very_sad' => {
    // 优先基于服务器状态
    if (serverStatus) {
      const avgStatus = (serverStatus.hunger + serverStatus.happiness) / 2;
      if (avgStatus >= 80) return 'very_happy';
      if (avgStatus >= 60) return 'happy';
      if (avgStatus >= 40) return 'neutral';
      if (avgStatus >= 20) return 'sad';
      return 'very_sad';
    }
    
    // Fallback: 基于本地互动
    const timeSinceLastInteraction = Date.now() - stats.lastInteraction;
    const recentInteractions = interactionHistory.current.slice(-10);
    const positiveInteractions = recentInteractions.filter(i => 
      i === 'pet' || i.startsWith('feed') || i.startsWith('travel')
    ).length;
    
    if (timeSinceLastInteraction > 10 * 60 * 1000) {
      return 'very_sad';
    }
    
    if (timeSinceLastInteraction > 5 * 60 * 1000) {
      return 'sad';
    }
    
    if (positiveInteractions >= 7) {
      return 'very_happy';
    }
    
    if (positiveInteractions >= 4) {
      return 'happy';
    }
    
    return 'neutral';
  }, [stats.lastInteraction, serverStatus]);
  
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
      // 服务器状态
      hunger: serverStatus?.hunger ?? 100,
      happiness: serverStatus?.happiness ?? 100,
    };
  }, [stats, serverStatus]);
  
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
  
  // 刷新所有数据
  const refresh = useCallback(async () => {
    await Promise.all([loadStatus(), loadInventory()]);
  }, [loadStatus, loadInventory]);
  
  return {
    // 本地统计
    stats,
    
    // 服务器状态
    serverStatus,
    inventory,
    isLoading,
    error,
    
    // 操作方法
    recordClick,
    pet,
    feed,
    travel,
    
    // 状态查询
    needsAttention,
    getSuggestion,
    getFrogMood,
    getInteractionStats,
    getComboLevel,
    
    // 数据管理
    resetStats,
    refresh,
    loadStatus,
    loadInventory,
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

// 食物配置 (保持向后兼容)
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
