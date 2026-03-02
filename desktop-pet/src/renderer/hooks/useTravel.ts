import { useState, useEffect, useCallback } from 'react';

export type Chain = 'zetachain' | 'bsc' | 'ethereum' | 'solana';

export interface TravelDestination {
  id: string;
  name: string;
  chain: Chain;
  description: string;
  icon: string;
  duration: number; // minutes
  rewards: {
    exp: number;
    items?: string[];
  };
}

const destinations: TravelDestination[] = [
  { id: '1', name: 'ZetaChain Athens', chain: 'zetachain', description: '探索 ZetaChain 主网', icon: '⛓️', duration: 30, rewards: { exp: 50, items: ['zn'] } },
  { id: '2', name: 'BSC Testnet', chain: 'bsc', description: 'BNB Chain 测试网', icon: '🟡', duration: 20, rewards: { exp: 30, items: ['bnb'] } },
  { id: '3', name: 'Ethereum Sepolia', chain: 'ethereum', description: '以太坊测试网', icon: '💎', duration: 45, rewards: { exp: 60, items: ['eth'] } },
  { id: '4', name: 'Solana Devnet', chain: 'solana', description: 'Solana 开发网', icon: '☀️', duration: 25, rewards: { exp: 40, items: ['sol'] } },
];

export function useTravel() {
  const [currentTravel, setCurrentTravel] = useState<TravelDestination | null>(null);
  const [travelHistory, setTravelHistory] = useState<{destination: string; timestamp: number; completed: boolean}[]>([]);
  const [elapsed, setElapsed] = useState(0);

  // Load from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zfrog_travel');
      if (saved) {
        const data = JSON.parse(saved);
        setTravelHistory(data.history || []);
        if (data.currentTravel) {
          setCurrentTravel(data.currentTravel);
          setElapsed(Math.floor((Date.now() - data.startTime) / 1000));
        }
      }
    } catch (e) {
      console.warn('Failed to load travel data:', e);
    }
  }, []);

  // Save to storage
  useEffect(() => {
    try {
      localStorage.setItem('zfrog_travel', JSON.stringify({ history: travelHistory, currentTravel }));
    } catch (e) {
      console.warn('Failed to save travel data:', e);
    }
  }, [travelHistory, currentTravel]);

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
  }, []);

  const completeTravel = useCallback(() => {
    if (!currentTravel) return null;
    
    const result = {
      exp: currentTravel.rewards.exp,
      items: currentTravel.rewards.items || [],
    };
    
    setTravelHistory(prev => [...prev, {
      destination: currentTravel.name,
      timestamp: Date.now(),
      completed: true
    }]);
    
    setCurrentTravel(null);
    setElapsed(0);
    
    return result;
  }, [currentTravel]);

  const cancelTravel = useCallback(() => {
    setTravelHistory(prev => [...prev, {
      destination: currentTravel?.name || '',
      timestamp: Date.now(),
      completed: false
    }]);
    setCurrentTravel(null);
    setElapsed(0);
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
    startTravel,
    completeTravel,
    cancelTravel,
    getProgress,
    getRemainingTime,
  };
}
