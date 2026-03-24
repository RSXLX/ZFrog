/**
 * 🐸 宠物蛋系统 - 养成状态 Hook
 * 负责养成状态查询、实时计算、养成操作调用
 */

import { useState, useEffect, useCallback } from 'react';
import { lifeFeatureApi } from '../features/life/api';

// 状态配置
export const NURTURE_STATUS_CONFIG = {
  hunger: { decayRate: 5, warningLine: 30, dangerLine: 10, icon: '🍔', label: '饱食度' },
  happiness: { decayRate: 3, warningLine: 30, dangerLine: 10, icon: '😊', label: '幸福度' },
  cleanliness: { decayRate: 0, warningLine: 40, dangerLine: 20, icon: '✨', label: '清洁度' },
  health: { decayRate: 8, warningLine: 40, dangerLine: 15, icon: '❤️', label: '健康度' },
  energy: { decayRate: 2, warningLine: 20, dangerLine: 5, icon: '⚡', label: '活力值' },
};

export interface NurtureStatus {
  hunger: number;
  happiness: number;
  cleanliness: number;
  health: number;
  energy: number;
  isSick: boolean;
  needsClean: boolean;
  warnings: string[];
  dangers: string[];
  lastStatusUpdate: string;
}

export interface LilyBalance {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  dailyGameEarned: number;
  dailyRemainingGameReward: number;
}

export function useFrogNurture(frogId: number | undefined) {
  const [status, setStatus] = useState<NurtureStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realTimeStatus, setRealTimeStatus] = useState<NurtureStatus | null>(null);

  // 获取状态
  const fetchStatus = useCallback(async () => {
    if (!frogId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await lifeFeatureApi.getLegacyNurtureStatus(frogId);
      if (response.success) {
        setStatus(response.data);
        setRealTimeStatus(response.data);
      }
    } catch (err: any) {
      setError(err.message || '获取状态失败');
    } finally {
      setLoading(false);
    }
  }, [frogId]);

  // 实时计算状态（每秒更新）
  useEffect(() => {
    if (!status?.lastStatusUpdate) return;

    const interval = setInterval(() => {
      const lastUpdate = new Date(status.lastStatusUpdate);
      const now = new Date();
      const hoursPassed = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

      // 计算实时值
      const hunger = Math.max(0, Math.round(status.hunger - NURTURE_STATUS_CONFIG.hunger.decayRate * hoursPassed));
      const happiness = Math.max(0, Math.round(status.happiness - NURTURE_STATUS_CONFIG.happiness.decayRate * hoursPassed));
      const energy = Math.max(0, Math.round(status.energy - NURTURE_STATUS_CONFIG.energy.decayRate * hoursPassed));

      // 检查警告和危险
      const warnings: string[] = [];
      const dangers: string[] = [];

      const checkLevel = (value: number, key: string) => {
        const config = NURTURE_STATUS_CONFIG[key as keyof typeof NURTURE_STATUS_CONFIG];
        if (value <= config.dangerLine) {
          dangers.push(key);
        } else if (value <= config.warningLine) {
          warnings.push(key);
        }
      };

      checkLevel(hunger, 'hunger');
      checkLevel(happiness, 'happiness');
      checkLevel(status.cleanliness, 'cleanliness');
      checkLevel(status.health, 'health');
      checkLevel(energy, 'energy');

      setRealTimeStatus({
        ...status,
        hunger,
        happiness,
        energy,
        warnings,
        dangers,
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  // 首次加载获取状态
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    status: realTimeStatus,
    loading,
    error,
    refresh: fetchStatus,
    CONFIG: NURTURE_STATUS_CONFIG,
  };
}

export function useLilyBalance(ownerAddress: string | undefined, refreshTrigger = 0) {
  const [balance, setBalance] = useState<LilyBalance | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!ownerAddress) return;
    
    setLoading(true);
    try {
      const response = await lifeFeatureApi.getLegacyLilyBalance(ownerAddress);
      if (response.success) {
        setBalance(response.data);
      }
    } catch (err) {
      console.error('获取余额失败:', err);
    } finally {
      setLoading(false);
    }
  }, [ownerAddress]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance, refreshTrigger]);

  return {
    balance,
    loading,
    refresh: fetchBalance,
  };
}

export function useFrogNurtureActions(frogId: number | undefined) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const feed = async (foodType: 'BREAD' | 'BUG_BENTO' | 'CAKE') => {
    if (!frogId) return null;
    
    setActionLoading('feed');
    try {
      const response = await lifeFeatureApi.feedLegacyNurture(frogId, { foodType });
      return response;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || '喂食失败');
    } finally {
      setActionLoading(null);
    }
  };

  const clean = async () => {
    if (!frogId) return null;
    
    setActionLoading('clean');
    try {
      const response = await lifeFeatureApi.cleanLegacyNurture(frogId);
      return response;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || '清洁失败');
    } finally {
      setActionLoading(null);
    }
  };

  const playGuess = async (guess: 'left' | 'right') => {
    if (!frogId) return null;
    
    setActionLoading('play');
    try {
      const response = await lifeFeatureApi.playGuessLegacy(frogId, { guess });
      return response;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || '游戏失败');
    } finally {
      setActionLoading(null);
    }
  };

  const heal = async () => {
    if (!frogId) return null;
    
    setActionLoading('heal');
    try {
      const response = await lifeFeatureApi.healLegacyNurture(frogId);
      return response;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || '治疗失败');
    } finally {
      setActionLoading(null);
    }
  };

  const checkTravelRequirements = async () => {
    if (!frogId) return null;
    
    try {
      const response = await lifeFeatureApi.checkTravelRequirementsLegacy(frogId);
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || '检查失败');
    }
  };

  const evolve = async (evolutionType: 'explorer' | 'scholar' | 'social') => {
    if (!frogId) return null;
    
    setActionLoading('evolve');
    try {
      const response = await lifeFeatureApi.evolveLegacyNurture(frogId, { evolutionType });
      return response;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || '进化失败');
    } finally {
      setActionLoading(null);
    }
  };

  return {
    actionLoading,
    feed,
    clean,
    playGuess,
    heal,
    checkTravelRequirements,
    evolve,
  };
}

export default useFrogNurture;
