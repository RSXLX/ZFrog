import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { emitDomainEvent } from '../../services/domainEvents';

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

interface TravelRuntime extends TravelDestination {
  backendTravelId?: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
  startedAt: number;
  progress: number;
}

interface UseTravelSyncOptions {
  frogId: number | null;
}

interface TravelResult {
  exp: number;
  items: string[];
}

const STORAGE_KEY = 'zfrog_travel';

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

const emitTravelEvent = (
  eventName: string,
  detail: Record<string, unknown>,
  domainEventName?: 'TravelStarted' | 'TravelCompleted'
) => {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
  if (domainEventName) {
    emitDomainEvent({
      eventName: domainEventName,
      source: 'desktop.travel-sync',
      payload: detail,
    });
  }
};

const toHistoryEntry = (travel: TravelRuntime, completed: boolean): LocalTravelHistoryEntry => {
  const rewardItem = (travel.rewards.items || [])[0];
  return {
    id: `${travel.id}-${Date.now()}`,
    destinationId: travel.id,
    destination: travel.name,
    targetChain: travel.targetChain,
    chainId: travel.chainId,
    icon: travel.icon,
    timestamp: Date.now(),
    completed,
    journalTitle: `${travel.name} Journey`,
    journalContent: travel.journalTemplate,
    journalMood: travel.journalMood,
    souvenir: rewardItem ? souvenirByItem[rewardItem] : undefined,
  };
};

export function useTravelSync({ frogId }: UseTravelSyncOptions) {
  const [currentTravel, setCurrentTravel] = useState<TravelRuntime | null>(null);
  const [travelHistory, setTravelHistory] = useState<LocalTravelHistoryEntry[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.history)) {
        setTravelHistory(parsed.history);
      }
      if (parsed.currentTravel) {
        const restored = parsed.currentTravel as TravelRuntime;
        setCurrentTravel(restored);
        const start = Number(parsed.startedAt || Date.now());
        setStartedAt(start);
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }
    } catch (error) {
      console.warn('[useTravelSync] Failed to restore travel state:', error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        history: travelHistory,
        currentTravel,
        startedAt,
      })
    );
  }, [travelHistory, currentTravel, startedAt]);

  useEffect(() => {
    if (!currentTravel) return;
    const timer = window.setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [currentTravel]);

  useEffect(() => {
    if (!currentTravel?.backendTravelId) return;

    const timer = window.setInterval(async () => {
      const remote = await api.getTravelByIdV1(currentTravel.backendTravelId!);
      if (!remote) return;

      const normalizedStatus = (remote.status || '').toUpperCase();
      setCurrentTravel(prev =>
        prev
          ? {
              ...prev,
              progress: Math.max(prev.progress, Math.round(Number(remote.progress || prev.progress || 0))),
              status: normalizedStatus === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE',
            }
          : prev
      );

      if (normalizedStatus === 'COMPLETED') {
        setCurrentTravel(prev => {
          if (!prev) return prev;
          setTravelHistory(history => [...history, toHistoryEntry(prev, true)]);
          return null;
        });
        setElapsed(0);
        setStartedAt(null);
        emitTravelEvent(
          'travel:completed',
          { travelId: remote.travelId || remote.id },
          'TravelCompleted'
        );
        emitTravelEvent('desktop:travel-completed', { travelId: remote.travelId || remote.id });
      }
    }, 5000);

    return () => window.clearInterval(timer);
  }, [currentTravel?.backendTravelId]);

  const startTravel = useCallback(
    async (destination: TravelDestination) => {
      const startTimestamp = Date.now();
      let backendTravelId: number | undefined;

      if (frogId) {
        const remote = await api.startTravelV1({
          frogId,
          travelType: 'random',
          targetChain: destination.targetChain,
          duration: Math.max(300, destination.duration * 60),
          source: 'desktop_travel_sync',
        });
        backendTravelId = remote?.travelId;
      }

      setCurrentTravel({
        ...destination,
        backendTravelId,
        startedAt: startTimestamp,
        progress: 0,
        status: 'ACTIVE',
      });
      setElapsed(0);
      setStartedAt(startTimestamp);

      emitTravelEvent('travel:started', {
        travelId: backendTravelId || null,
        targetChain: destination.targetChain,
      }, 'TravelStarted');
      emitTravelEvent('desktop:travel-started', {
        travelId: backendTravelId || null,
        targetChain: destination.targetChain,
      });
    },
    [frogId]
  );

  const completeTravel = useCallback(async (): Promise<TravelResult | null> => {
    if (!currentTravel) return null;

    if (currentTravel.backendTravelId) {
      await api.completeTravelV1(currentTravel.backendTravelId);
    }

    setTravelHistory(prev => [...prev, toHistoryEntry(currentTravel, true)]);
    setCurrentTravel(null);
    setElapsed(0);
    setStartedAt(null);
    emitTravelEvent(
      'travel:completed',
      { travelId: currentTravel.backendTravelId || null },
      'TravelCompleted'
    );
    emitTravelEvent('desktop:travel-completed', { travelId: currentTravel.backendTravelId || null });

    return {
      exp: currentTravel.rewards.exp,
      items: currentTravel.rewards.items || [],
    };
  }, [currentTravel]);

  const cancelTravel = useCallback(() => {
    if (!currentTravel) return;
    setTravelHistory(prev => [...prev, toHistoryEntry(currentTravel, false)]);
    setCurrentTravel(null);
    setElapsed(0);
    setStartedAt(null);
  }, [currentTravel]);

  const getProgress = useCallback(() => {
    if (!currentTravel) return 0;
    if (currentTravel.progress > 0) {
      return Math.max(0, Math.min(100, currentTravel.progress));
    }
    return Math.min(100, (elapsed / (currentTravel.duration * 60)) * 100);
  }, [currentTravel, elapsed]);

  const getRemainingTime = useCallback(() => {
    if (!currentTravel) return 0;
    return Math.max(0, currentTravel.duration * 60 - elapsed);
  }, [currentTravel, elapsed]);

  return useMemo(
    () => ({
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
    }),
    [
      currentTravel,
      travelHistory,
      elapsed,
      startedAt,
      startTravel,
      completeTravel,
      cancelTravel,
      getProgress,
      getRemainingTime,
    ]
  );
}

export default useTravelSync;
