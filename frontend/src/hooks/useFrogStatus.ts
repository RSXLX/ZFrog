// frontend/src/hooks/useFrogStatus.ts
import { useState, useEffect, useCallback } from 'react';
import { useReadContract, useWatchContractEvent } from 'wagmi';
import { ZETAFROG_ABI, ZETAFROG_ADDRESS } from '../config/contracts';

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
        const args = log.args as { tokenId?: bigint; targetWallet?: string; targetChainId?: bigint; startTime?: bigint; endTime?: bigint };
        if (args.tokenId?.toString() === frogId?.toString()) {
          setStatus('Traveling');
          setTravel({
            startTime: Number(args.startTime || 0),
            endTime: Number(args.endTime || 0),
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
        const args = log.args as { tokenId?: bigint };
        if (args.tokenId?.toString() === frogId?.toString()) {
          setStatus('Idle');
          setTravel(null);
          refetchFrog();
          refetchTravel();
        }
      });
    },
    enabled: !!contractAddress && frogId !== undefined,
  });

  // 处理数据更新
  useEffect(() => {
    if (frogData) {
      const [_name, _birthday, _totalTravels, statusCode] = frogData as [string, bigint, number, number, bigint, bigint];
      const statusMap: FrogStatus[] = ['Idle', 'Traveling', 'Returning'];
      setStatus(statusMap[statusCode] || 'Idle');
      setLoading(false);
    }
  }, [frogData]);

  useEffect(() => {
    if (travelData) {
      const [startTime, endTime, targetWallet, targetChainId, completed] = travelData as [bigint, bigint, string, bigint, boolean];
      if (!completed && Number(endTime) > 0) {
        setTravel({
          startTime: Number(startTime),
          endTime: Number(endTime),
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
    
    const now = Math.floor(Date.now() / 1000);
    const remaining = travel.endTime - now;
    
    if (remaining <= 0) return { hours: 0, minutes: 0, seconds: 0, total: 0 };
    
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;
    
    return { hours, minutes, seconds, total: remaining };
  }, [travel, status]);

  // 刷新状态
  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    await Promise.all([refetchFrog(), refetchTravel()]);
    setLoading(false);
  }, [refetchFrog, refetchTravel]);

  // 解析青蛙数据
  const parsedFrogData: FrogData | null = frogData 
    ? {
        name: (frogData as [string, bigint, number, number, bigint, bigint])[0],
        birthday: Number((frogData as [string, bigint, number, number, bigint, bigint])[1]),
        totalTravels: Number((frogData as [string, bigint, number, number, bigint, bigint])[2]),
        status: (frogData as [string, bigint, number, number, bigint, bigint])[3],
        xp: Number((frogData as [string, bigint, number, number, bigint, bigint])[4]),
        level: Number((frogData as [string, bigint, number, number, bigint, bigint])[5]),
      }
    : null;

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