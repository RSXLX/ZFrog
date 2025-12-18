// frontend/src/hooks/useZetaFrog.ts

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ZETAFROG_ADDRESS, ZETAFROG_ABI } from '../config/contracts';

// 🔧 修复：定义正确的返回类型
type FrogStatus = 'Idle' | 'Traveling' | 'Returning';

interface FrogData {
  name: string;
  birthday: Date;
  totalTravels: number;
  status: FrogStatus;
  xp: number;
  level: number;
}

interface ActiveTravel {
  startTime: Date;
  endTime: Date;
  targetWallet: string;
  targetChainId: number;
  completed: boolean;
}

export function useFrogData(tokenId: number | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: ZETAFROG_ADDRESS,
    abi: ZETAFROG_ABI,
    functionName: 'getFrog',
    args: tokenId !== undefined ? [BigInt(tokenId)] : undefined,
    query: {
      enabled: tokenId !== undefined && !!ZETAFROG_ADDRESS,
    },
  });

  // 🔧 修复：正确解析 6 个返回值
  const frog: FrogData | null = data && Array.isArray(data)
    ? {
        name: data[0] as string,
        birthday: new Date(Number(data[1]) * 1000),
        totalTravels: Number(data[2]),
        status: (['Idle', 'Traveling', 'Returning'] as const)[Number(data[3])] as FrogStatus,
        xp: Number(data[4]),      // 🔧 新增
        level: Number(data[5]),   // 🔧 新增
      }
    : null;

  return { frog, isLoading, error, refetch };
}

export function useCanTravel(tokenId: number | undefined) {
  const { data, isLoading, refetch } = useReadContract({
    address: ZETAFROG_ADDRESS,
    abi: ZETAFROG_ABI,
    functionName: 'canTravel',
    args: tokenId !== undefined ? [BigInt(tokenId)] : undefined,
    query: {
      enabled: tokenId !== undefined && !!ZETAFROG_ADDRESS,
    },
  });

  return { canTravel: data as boolean | undefined, isLoading, refetch };
}

export function useActiveTravel(tokenId: number | undefined) {
  const { data, isLoading, refetch } = useReadContract({
    address: ZETAFROG_ADDRESS,
    abi: ZETAFROG_ABI,
    functionName: 'getActiveTravel',
    args: tokenId !== undefined ? [BigInt(tokenId)] : undefined,
    query: {
      enabled: tokenId !== undefined && !!ZETAFROG_ADDRESS,
    },
  });

  // 🔧 修复：正确解析 5 个返回值，顺序为 [startTime, endTime, targetWallet, targetChainId, completed]
  const travel: ActiveTravel | null = data && Array.isArray(data)
    ? {
        startTime: new Date(Number(data[0]) * 1000),
        endTime: new Date(Number(data[1]) * 1000),        // 🔧 修复：data[1] 是 endTime
        targetWallet: data[2] as string,                   // 🔧 修复：data[2] 是 targetWallet
        targetChainId: Number(data[3]),                    // 🔧 修复：data[3] 是 targetChainId
        completed: data[4] as boolean,                     // 🔧 修复：data[4] 是 completed
      }
    : null;

  // 🔧 修复：如果旅行已完成或 endTime 为 0，返回 null
  const hasActiveTravel = travel && !travel.completed && travel.endTime.getTime() > 0;

  return { 
    travel: hasActiveTravel ? travel : null, 
    isLoading, 
    refetch 
  };
}

export function useTotalSupply() {
  const { data, isLoading, refetch } = useReadContract({
    address: ZETAFROG_ADDRESS,
    abi: ZETAFROG_ABI,
    functionName: 'totalSupply',
    query: {
      enabled: !!ZETAFROG_ADDRESS,
    },
  });

  return { totalSupply: data ? Number(data) : 0, isLoading, refetch };
}

// 🔧 新增：获取旅行日记列表
export function useTravelJournals(tokenId: number | undefined) {
  const { data, isLoading, refetch } = useReadContract({
    address: ZETAFROG_ADDRESS,
    abi: ZETAFROG_ABI,
    functionName: 'getTravelJournals',
    args: tokenId !== undefined ? [BigInt(tokenId)] : undefined,
    query: {
      enabled: tokenId !== undefined && !!ZETAFROG_ADDRESS,
    },
  });

  return { 
    journals: (data as string[] | undefined) || [], 
    isLoading, 
    refetch 
  };
}

// 🔧 新增：铸造青蛙 Hook
export function useMintFrog() {
  const { 
    data: hash, 
    writeContract, 
    isPending, 
    error,
    reset 
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const mint = (name: string) => {
    if (!ZETAFROG_ADDRESS) {
      throw new Error('Contract address not configured');
    }
    
    writeContract({
      address: ZETAFROG_ADDRESS,
      abi: ZETAFROG_ABI,
      functionName: 'mintFrog',
      args: [name],
    });
  };

  return {
    mint,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}

// 🔧 新增：发起旅行 Hook
export function useStartTravel() {
  const { 
    data: hash, 
    writeContract, 
    isPending, 
    error,
    reset 
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const startTravel = (
    tokenId: number, 
    targetWallet: string, 
    duration: number,
    targetChainId: number = 1
  ) => {
    if (!ZETAFROG_ADDRESS) {
      throw new Error('Contract address not configured');
    }

    writeContract({
      address: ZETAFROG_ADDRESS,
      abi: ZETAFROG_ABI,
      functionName: 'startTravel',
      args: [
        BigInt(tokenId), 
        targetWallet as `0x${string}`, 
        BigInt(duration),
        BigInt(targetChainId)
      ],
    });
  };

  return {
    startTravel,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}

// 🔧 新增：取消旅行 Hook
export function useCancelTravel() {
  const { 
    data: hash, 
    writeContract, 
    isPending, 
    error,
    reset 
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const cancelTravel = (tokenId: number) => {
    if (!ZETAFROG_ADDRESS) {
      throw new Error('Contract address not configured');
    }

    writeContract({
      address: ZETAFROG_ADDRESS,
      abi: ZETAFROG_ABI,
      functionName: 'cancelTravel',
      args: [BigInt(tokenId)],
    });
  };

  return {
    cancelTravel,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}