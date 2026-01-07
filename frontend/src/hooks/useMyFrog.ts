import { useState, useEffect, useCallback } from 'react';
import { useWallet } from './useWallet';
import { apiService, type Frog } from '../services/api';

/**
 * 获取当前连接钱包的唯一青蛙
 * 每个钱包只能拥有一个青蛙，此 hook 自动获取当前用户的青蛙
 */
export function useMyFrog() {
  const { address, isConnected } = useWallet();
  const [frog, setFrog] = useState<Frog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasFrog, setHasFrog] = useState(false);

  const fetchMyFrog = useCallback(async () => {
    if (!address || !isConnected) {
      setFrog(null);
      setHasFrog(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      // 清除旧数据，防止状态残留
      setFrog(null);
      setHasFrog(false);
      
      // 获取该钱包地址的青蛙（现在每个钱包只有一个）
      const data = await apiService.getMyFrog(address);
      
      if (data) {
        setFrog(data);
        setHasFrog(true);
      } else {
        setFrog(null);
        setHasFrog(false);
      }
    } catch (err: any) {
      console.error('Error fetching my frog:', err);
      // 404 表示没有青蛙，不算错误
      if (err.response?.status === 404) {
        setFrog(null);
        setHasFrog(false);
      } else {
        setError(err as Error);
      }
    } finally {
      setLoading(false);
    }
  }, [address, isConnected]);

  useEffect(() => {
    fetchMyFrog();
  }, [fetchMyFrog]);

  return {
    // 青蛙数据
    frog,
    hasFrog,
    
    // 加载状态
    loading,
    error,
    
    // 钱包信息
    address,
    isConnected,
    
    // 操作
    refetch: fetchMyFrog,
  };
}

/**
 * 检查当前用户是否需要铸造青蛙
 * 如果已连接钱包但没有青蛙，返回 true
 */
export function useNeedsMint() {
  const { hasFrog, loading, isConnected } = useMyFrog();
  
  return {
    needsMint: isConnected && !loading && !hasFrog,
    isChecking: loading,
  };
}
