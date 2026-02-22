// frontend/src/hooks/useFrogStatus.ts
import { useState, useEffect, useCallback } from 'react';
import { useReadContract, useWatchContractEvent } from 'wagmi';
import { ZETAFROG_ABI, ZETAFROG_ADDRESS } from '../config/contracts';
import { useWebSocket } from './useWebSocket';
import { apiService } from '../services/api';

type FrogStatus = 'Idle' | 'Traveling' | 'Returning';

interface TravelInfo {
  startTime: number;
  endTime: number;
  targetWallet: string;
  targetChainId: number;
  completed: boolean;
}

interface FrogData {
  name: string;
  birthday: number;
  totalTravels: number;
  status: number;
  xp: number;
  level: number;
}

interface RemainingTime {
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

interface UseFrogStatusReturn {
  status: FrogStatus;
  travel: TravelInfo | null;
  canTravel: boolean;
  loading: boolean;
  error: Error | null;
  getRemainingTime: () => RemainingTime | null;
  refresh: () => Promise<void>;
  frogData: FrogData | null;
}

export function useFrogStatus(frogId: number | undefined): UseFrogStatusReturn {
  const [status, setStatus] = useState<FrogStatus>('Idle');
  const [travel, setTravel] = useState<TravelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [backendData, setBackendData] = useState<any>(null);

  const { on } = useWebSocket();
  const contractAddress = ZETAFROG_ADDRESS;

  // 读取青蛙基本信息
  const { 
    data: frogData, 
    refetch: refetchFrog,
    isLoading: frogLoading,
    error: frogError
  } = useReadContract({
    address: contractAddress,
    abi: ZETAFROG_ABI,
    functionName: 'getFrog',
    args: frogId !== undefined ? [BigInt(frogId)] : undefined,
    query: {
      enabled: frogId !== undefined && !!contractAddress,
    }
  });

  // 读取活跃旅行信息
  const { 
    data: travelData, 
    refetch: refetchTravel,
    isLoading: travelLoading
  } = useReadContract({
    address: contractAddress,
    abi: ZETAFROG_ABI,
    functionName: 'getActiveTravel',
    args: frogId !== undefined ? [BigInt(frogId)] : undefined,
    query: {
      enabled: frogId !== undefined && !!contractAddress,
    }
  });

  // 检查是否可以旅行
  const { data: canTravelData } = useReadContract({
    address: contractAddress,
    abi: ZETAFROG_ABI,
    functionName: 'canTravel',
    args: frogId !== undefined ? [BigInt(frogId)] : undefined,
    query: {
      enabled: frogId !== undefined && !!contractAddress,
    }
  });

  // 监听旅行开始事件
  useWatchContractEvent({
    address: contractAddress,
    abi: ZETAFROG_ABI,
    eventName: 'TravelStarted',
    onLogs(logs) {
      logs.forEach(log => {
        // Use Type assertion carefully as wagmi logs are generic
        const args = (log as any).args || {};
        if (args.tokenId?.toString() === frogId?.toString()) {
          setStatus('Traveling');
          setTravel({
            startTime: Number(args.startTime || 0) * 1000,
            endTime: Number(args.endTime || 0) * 1000,
            targetWallet: args.targetWallet || '',
            targetChainId: Number(args.targetChainId || 1),
            completed: false,
          });
          refetchFrog();
          refetchTravel();
        }
      });
    },
    enabled: !!contractAddress && frogId !== undefined,
  });

  // 监听旅行完成事件
  useWatchContractEvent({
    address: contractAddress,
    abi: ZETAFROG_ABI,
    eventName: 'TravelCompleted',
    onLogs(logs) {
      logs.forEach(log => {
        const args = (log as any).args || {};
        if (args.tokenId?.toString() === frogId?.toString()) {
          setStatus('Idle');
          setTravel(null);
          refetchFrog();
          refetchTravel();
          fetchBackendData();
        }
      });
    },
    enabled: !!contractAddress && frogId !== undefined,
  });

  // 后端数据获取
  const fetchBackendData = useCallback(async () => {
    if (frogId === undefined) return;
    try {
      const response = await apiService.get(`/frogs/${frogId}`);
      const data = response.data;
      setBackendData(data);
      
      // 如果后端显示正在旅行，则更新本地状态（兼容 P0）
      if (data.status === 'Traveling') {
        setStatus('Traveling');
        // 尝试获取活跃旅行详情
        const response = await apiService.get(`/travels/${frogId}/active`);
        const travelDetail = response.data;
        if (travelDetail) {
          setTravel({
            startTime: new Date(travelDetail.startTime).getTime(),
            endTime: new Date(travelDetail.endTime).getTime(),
            targetWallet: travelDetail.targetWallet,
            targetChainId: travelDetail.chainId || 1,
            completed: false,
          });
        }
      }
    } catch (err) {
      console.warn('Failed to fetch backend frog data:', err);
    }
  }, [frogId]);

  useEffect(() => {
    fetchBackendData();
  }, [fetchBackendData]);

  // WebSocket 实时同步
  useEffect(() => {
    if (frogId === undefined) return;

    const unsubscribeStarted = on<any>('travel:started', (data) => {
      if (Number(data.frogId) === frogId) {
        setStatus('Traveling');
        setTravel({
          startTime: new Date(data.startTime).getTime(),
          endTime: new Date(data.endTime).getTime(),
          targetWallet: data.targetWallet,
          targetChainId: data.targetChainId || 1,
          completed: false,
        });
        fetchBackendData();
      }
    });

    const unsubscribeCompleted = on<any>('travel:completed', (data) => {
      if (Number(data.frogId) === frogId) {
        setStatus('Idle');
        setTravel(null);
        fetchBackendData();
      }
    });

    return () => {
      unsubscribeStarted();
      unsubscribeCompleted();
    };
  }, [frogId, on, fetchBackendData]);

  // 处理数据更新
  useEffect(() => {
    if (frogData) {
      const [_name, _birthday, _totalTravels, statusCode] = frogData as [string, bigint, number, number, bigint, bigint];
      const statusMap: FrogStatus[] = ['Idle', 'Traveling', 'Returning'];
      
      // 优先保留 WebSocket 或后端设置的 Traveling 状态（针对 P0）
      setStatus(prev => {
        if (prev === 'Traveling' && statusMap[statusCode] === 'Idle') return 'Traveling';
        return statusMap[statusCode] || 'Idle';
      });
      setLoading(false);
    }
  }, [frogData]);

  useEffect(() => {
    if (travelData) {
      const [startTime, endTime, targetWallet, targetChainId, completed] = travelData as readonly [bigint, bigint, string, bigint, boolean, boolean];
      if (!completed && Number(endTime) > 0) {
        setTravel({
          startTime: Number(startTime) * 1000,
          endTime: Number(endTime) * 1000,
          targetWallet,
          targetChainId: Number(targetChainId),
          completed,
        });
      } else {
        setTravel(null);
      }
    }
  }, [travelData]);

  useEffect(() => {
    if (frogError) {
      setError(frogError as Error);
    }
  }, [frogError]);

  useEffect(() => {
    setLoading(frogLoading || travelLoading);
  }, [frogLoading, travelLoading]);

  // 计算旅行剩余时间
  const getRemainingTime = useCallback((): RemainingTime | null => {
    if (!travel || status !== 'Traveling') return null;
    
    const now = Date.now();
    const remaining = travel.endTime - now;
    
    if (remaining <= 0) return { hours: 0, minutes: 0, seconds: 0, total: 0 };
    
    const totalSeconds = Math.floor(remaining / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return { hours, minutes, seconds, total: totalSeconds };
  }, [travel, status]);

  // 刷新状态
  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    await Promise.all([refetchFrog(), refetchTravel(), fetchBackendData()]);
    setLoading(false);
  }, [refetchFrog, refetchTravel, fetchBackendData]);

  // 解析青蛙数据
  const parsedFrogData: FrogData | null = frogData 
    ? {
        name: (frogData as [string, bigint, number, number, bigint, bigint])[0],
        birthday: Number((frogData as [string, bigint, number, number, bigint, bigint])[1]),
        totalTravels: backendData?.totalTravels ?? Number((frogData as [string, bigint, number, number, bigint, bigint])[2]),
        status: backendData?.status === 'Traveling' ? 1 : (frogData as [string, bigint, number, number, bigint, bigint])[3],
        xp: backendData?.xp ?? Number((frogData as [string, bigint, number, number, bigint, bigint])[4]),
        level: backendData?.level ?? Number((frogData as [string, bigint, number, number, bigint, bigint])[5]),
      }
    : backendData ? {
        name: backendData.name,
        birthday: new Date(backendData.birthday).getTime(),
        totalTravels: backendData.totalTravels,
        status: backendData.status === 'Traveling' ? 1 : 0,
        xp: backendData.xp,
        level: backendData.level,
      } : null;

  return {
    status,
    travel,
    canTravel: canTravelData ?? false,
    loading,
    error,
    getRemainingTime,
    refresh,
    frogData: parsedFrogData,
  };
}

export default useFrogStatus;