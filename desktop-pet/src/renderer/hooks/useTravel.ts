import { useState, useEffect, useCallback } from 'react';

export type TravelChain = 'ZETACHAIN_ATHENS' | 'BSC_TESTNET' | 'ETH_SEPOLIA';

export interface TravelDestination {
  id: string;
  name: string;
  targetChain: TravelChain;
  chainId: number;
  description: string;
  icon: string;
  duration: number; // minutes
  journalMood: string;
  journalTemplate: string;
  rewards: {
    exp: number;
    items?: string[];
  };
}

export interface LocalTravelHistoryEntry {
  id: string;
  destinationId: string;
  destination: string;
  targetChain: TravelChain;
  chainId: number;
  icon: string;
  timestamp: number;
  completed: boolean;
  journalTitle?: string;
  journalContent?: string;
  journalMood?: string;
  souvenir?: {
    name: string;
    rarity: string;
  };
}

const destinations: TravelDestination[] = [
  {
    id: 'zeta-athens',
    name: 'ZetaChain Athens',
    targetChain: 'ZETACHAIN_ATHENS',
    chainId: 7001,
    description: '探索 ZetaChain Athens 的跨链中心',
    icon: '⚡',
    duration: 30,
    journalMood: 'EXCITED',
    journalTemplate: '在跨链枢纽间来回穿梭，带回了一段关于互操作性的旅行见闻。',
    rewards: { exp: 50, items: ['gift_box'] },
  },
  {
    id: 'bsc-testnet',
    name: 'BSC Testnet',
    targetChain: 'BSC_TESTNET',
    chainId: 97,
    description: '去 BNB Chain 测试网踩点新的链上足迹',
    icon: '🟡',
    duration: 20,
    journalMood: 'CURIOUS',
    journalTemplate: '这次在 BSC 的旅行更像一场试验，把每次探索都记成了新的足迹。',
    rewards: { exp: 30, items: ['cake'] },
  },
  {
    id: 'ethereum-sepolia',
    name: 'Ethereum Sepolia',
    targetChain: 'ETH_SEPOLIA',
    chainId: 11155111,
    description: '前往以太坊 Sepolia 收集更经典的链上风景',
    icon: '💎',
    duration: 45,
    journalMood: 'THOUGHTFUL',
    journalTemplate: '在 Sepolia 的区块之间慢慢散步，把观察到的细节都写进了日记里。',
    rewards: { exp: 60, items: ['toy_ball'] },
  },
];

const souvenirByItem: Record<string, { name: string; rarity: string }> = {
  gift_box: { name: '跨链礼盒', rarity: 'Rare' },
  cake: { name: '旅行蛋糕', rarity: 'Common' },
  toy_ball: { name: '纪念皮球', rarity: 'Uncommon' },
  flower: { name: '沿途花束', rarity: 'Common' },
};

export function useTravel() {
  const [currentTravel, setCurrentTravel] = useState<TravelDestination | null>(null);
  const [travelHistory, setTravelHistory] = useState<LocalTravelHistoryEntry[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  // Load from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zfrog_travel');
      if (saved) {
        const data = JSON.parse(saved);
        setTravelHistory(data.history || []);
        if (data.currentTravel) {
          setCurrentTravel(data.currentTravel);
          setStartedAt(data.startedAt || Date.now());
          setElapsed(Math.floor((Date.now() - (data.startedAt || Date.now())) / 1000));
        }
      }
    } catch (e) {
      console.warn('Failed to load travel data:', e);
    }
  }, []);

  // Save to storage
  useEffect(() => {
    try {
      localStorage.setItem('zfrog_travel', JSON.stringify({ history: travelHistory, currentTravel, startedAt }));
    } catch (e) {
      console.warn('Failed to save travel data:', e);
    }
  }, [travelHistory, currentTravel, startedAt]);

  // Timer
  useEffect(() => {
    if (!currentTravel) return;
    
    const timer = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [currentTravel]);

  const startTravel = useCallback((destination: TravelDestination) => {
    setCurrentTravel(destination);
    setElapsed(0);
    setStartedAt(Date.now());
  }, []);

  const completeTravel = useCallback(() => {
    if (!currentTravel) return null;

    const rewardItem = (currentTravel.rewards.items || [])[0];
    const souvenir = rewardItem ? souvenirByItem[rewardItem] : undefined;
    const result = {
      exp: currentTravel.rewards.exp,
      items: currentTravel.rewards.items || [],
    };

    setTravelHistory(prev => [...prev, {
      id: `${currentTravel.id}-${Date.now()}`,
      destinationId: currentTravel.id,
      destination: currentTravel.name,
      targetChain: currentTravel.targetChain,
      chainId: currentTravel.chainId,
      icon: currentTravel.icon,
      timestamp: Date.now(),
      completed: true,
      journalTitle: `${currentTravel.name} Journey`,
      journalContent: currentTravel.journalTemplate,
      journalMood: currentTravel.journalMood,
      souvenir,
    }]);

    setCurrentTravel(null);
    setElapsed(0);
    setStartedAt(null);

    return result;
  }, [currentTravel]);

  const cancelTravel = useCallback(() => {
    setTravelHistory(prev => [...prev, {
      id: `${currentTravel?.id || 'travel'}-${Date.now()}`,
      destinationId: currentTravel?.id || '',
      destination: currentTravel?.name || '',
      targetChain: currentTravel?.targetChain || 'ZETACHAIN_ATHENS',
      chainId: currentTravel?.chainId || 7001,
      icon: currentTravel?.icon || '⚡',
      timestamp: Date.now(),
      completed: false,
      journalTitle: currentTravel ? `${currentTravel.name} Journey` : undefined,
      journalContent: currentTravel ? '这次旅程临时取消了，等状态更好时再出发。' : undefined,
      journalMood: 'SLEEPY',
    }]);
    setCurrentTravel(null);
    setElapsed(0);
    setStartedAt(null);
  }, [currentTravel]);

  const getProgress = useCallback(() => {
    if (!currentTravel) return 0;
    return Math.min(100, (elapsed / (currentTravel.duration * 60)) * 100);
  }, [currentTravel, elapsed]);

  const getRemainingTime = useCallback(() => {
    if (!currentTravel) return 0;
    return Math.max(0, currentTravel.duration * 60 - elapsed);
  }, [currentTravel, elapsed]);

  return {
    destinations,
    currentTravel,
    travelHistory,
    elapsed,
    startedAt,
    startTravel,
    completeTravel,
    cancelTravel,
    getProgress,
    getRemainingTime,
  };
}
