/**
 * 🌙 useHibernation - 冬眠状态管理 Hook
 * 
 * 功能:
 * - 获取和监听冬眠状态
 * - 唤醒操作
 * - 祈福操作
 */

import { useState, useEffect, useCallback } from 'react';
import { lifeFeatureApi } from '../features/life/api';
import type { LifeHibernationStatus } from '../lib/api/contracts';

interface UseHibernationResult {
  // 状态
  status: LifeHibernationStatus;
  hibernatedAt: Date | null;
  blessingsReceived: number;
  revivalCost: {
    baseCost: number;
    discount: number;
    finalCost: number;
    blessings: number;
  } | null;
  loading: boolean;
  error: string | null;
  
  // 操作
  refresh: () => Promise<void>;
  revive: () => Promise<boolean>;
  bless: (blesserFrogId: number) => Promise<boolean>;
  
  // 辅助
  isActive: boolean;
  isDrowsy: boolean;
  isSleeping: boolean;
  needsAttention: boolean;
}

export function useHibernation(frogId: number | null): UseHibernationResult {
  const [status, setStatus] = useState<LifeHibernationStatus>('ACTIVE');
  const [hibernatedAt, setHibernatedAt] = useState<Date | null>(null);
  const [blessingsReceived, setBlessingsReceived] = useState(0);
  const [revivalCost, setRevivalCost] = useState<{
    baseCost: number;
    discount: number;
    finalCost: number;
    blessings: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 获取冬眠状态
  const fetchStatus = useCallback(async () => {
    if (!frogId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await lifeFeatureApi.getLegacyHibernationStatus(frogId);
      setStatus(data.status);
      setHibernatedAt(data.hibernatedAt ? new Date(data.hibernatedAt) : null);
      setBlessingsReceived(data.blessingsReceived || 0);
      
      if (data.revivalCost) {
        setRevivalCost(data.revivalCost);
      }
    } catch (err: any) {
      setError(err.message || '获取状态失败');
    } finally {
      setLoading(false);
    }
  }, [frogId]);
  
  // 初始加载
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);
  
  // 唤醒
  const revive = useCallback(async (): Promise<boolean> => {
    if (!frogId) return false;
    
    try {
      const result = await lifeFeatureApi.reviveLegacy(frogId);
      if (result.success) {
        setStatus('ACTIVE');
        setHibernatedAt(null);
        setRevivalCost(null);
        return true;
      }
      setError(result.message);
      return false;
    } catch (err: any) {
      setError(err.message || '唤醒失败');
      return false;
    }
  }, [frogId]);
  
  // 祈福
  const bless = useCallback(async (blesserFrogId: number): Promise<boolean> => {
    if (!frogId) return false;
    
    try {
      const result = await lifeFeatureApi.blessLegacy(frogId, { blesserFrogId });
      if (result.success) {
        setBlessingsReceived(prev => prev + 1);
        // 重新获取费用信息
        await fetchStatus();
        return true;
      }
      setError(result.message);
      return false;
    } catch (err: any) {
      setError(err.message || '祈福失败');
      return false;
    }
  }, [frogId, fetchStatus]);
  
  return {
    status,
    hibernatedAt,
    blessingsReceived,
    revivalCost,
    loading,
    error,
    
    refresh: fetchStatus,
    revive,
    bless,
    
    isActive: status === 'ACTIVE',
    isDrowsy: status === 'DROWSY',
    isSleeping: status === 'SLEEPING',
    needsAttention: status !== 'ACTIVE',
  };
}

export default useHibernation;
