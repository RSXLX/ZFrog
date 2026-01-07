// frontend/src/hooks/useZetaFrog.ts

import { useReadContract } from 'wagmi';
import { ZETAFROG_ADDRESS, ZETAFROG_ABI } from '../config/contracts';
import { usePendingTravel } from './usePendingTravel';

/**
 * 获取青蛙数据
 * 合约返回: [name, birthday, totalTravels, status, xp, level]
 */
export function useFrogData(tokenId: number) {
    const { data, isLoading, error, refetch } = useReadContract({
        address: ZETAFROG_ADDRESS,
        abi: ZETAFROG_ABI,
        functionName: 'getFrog',
        args: [BigInt(tokenId)],
        query: {
            enabled: tokenId >= 0 && !!ZETAFROG_ADDRESS,
        },
    });

    const frog = (data && Array.isArray(data)) ? {
        name: data[0] as string,
        birthday: new Date(Number(data[1]) * 1000),
        totalTravels: Number(data[2]),
        status: (['Idle', 'Traveling', 'Returning'] as const)[Number(data[3])],
        xp: Number(data[4]),
        level: Number(data[5]),
    } : null;

    return { frog, isLoading, error, refetch };
}

/**
 * 检查青蛙是否可以旅行
 */
export function useCanTravel(tokenId: number) {
    const { data, isLoading, refetch } = useReadContract({
        address: ZETAFROG_ADDRESS,
        abi: ZETAFROG_ABI,
        functionName: 'canTravel',
        args: [BigInt(tokenId)],
        query: {
            enabled: tokenId >= 0 && !!ZETAFROG_ADDRESS,
        },
    });

    return { canTravel: data as boolean | undefined, isLoading, refetch };
}

/**
 * 获取活跃旅行数据
 * 合约返回: [startTime, endTime, targetWallet, targetChainId, completed]
 */
export function useActiveTravel(tokenId: number) {
    const { data, isLoading, refetch } = useReadContract({
        address: ZETAFROG_ADDRESS,
        abi: ZETAFROG_ABI,
        functionName: 'getActiveTravel',
        args: [BigInt(tokenId)],
        query: {
            enabled: tokenId >= 0 && !!ZETAFROG_ADDRESS,
        },
    });

    // 正确解析合约返回数据
    const travel = (data && Array.isArray(data)) ? {
        startTime: new Date(Number(data[0]) * 1000),
        endTime: new Date(Number(data[1]) * 1000),
        targetWallet: data[2] as string,
        targetChainId: Number(data[3]),
        completed: data[4] as boolean,
    } : null;

    // 如果 startTime 为 0，表示没有活跃旅行
    const hasActiveTravel = travel && travel.startTime.getTime() > 0 && !travel.completed;

    return {
        travel: hasActiveTravel ? travel : null,
        rawTravel: travel,
        isLoading,
        refetch
    };
}

/**
 * 获取旅行日记列表
 */
export function useTravelJournals(tokenId: number) {
    const { data, isLoading, refetch } = useReadContract({
        address: ZETAFROG_ADDRESS,
        abi: ZETAFROG_ABI,
        functionName: 'getTravelJournals',
        args: [BigInt(tokenId)],
        query: {
            enabled: tokenId >= 0 && !!ZETAFROG_ADDRESS,
        },
    });

    return {
        journals: (data as string[]) || [],
        isLoading,
        refetch
    };
}

/**
 * 获取总供应量
 */
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

/**
 * 获取青蛙所有者
 */
export function useFrogOwner(tokenId: number) {
    const { data, isLoading, error } = useReadContract({
        address: ZETAFROG_ADDRESS,
        abi: ZETAFROG_ABI,
        functionName: 'ownerOf',
        args: [BigInt(tokenId)],
        query: {
            enabled: tokenId >= 0 && !!ZETAFROG_ADDRESS,
        },
    });

    return { owner: data as string | undefined, isLoading, error };
}

/**
 * 获取用户拥有的青蛙数量
 */
export function useUserFrogBalance(address: string | undefined) {
    const { data, isLoading } = useReadContract({
        address: ZETAFROG_ADDRESS,
        abi: ZETAFROG_ABI,
        functionName: 'balanceOf',
        args: address ? [address as `0x${string}`] : undefined,
        query: {
            enabled: !!address && !!ZETAFROG_ADDRESS,
        },
    });

    return { balance: data ? Number(data) : 0, isLoading };
}

/**
 * 获取青蛙状态（简化版，用于 FrogPetAnimated）
 */
export function useFrogStatus(frogId: number | undefined) {
    const { data, isLoading } = useReadContract({
        address: ZETAFROG_ADDRESS,
        abi: ZETAFROG_ABI,
        functionName: 'getFrog',
        args: frogId !== undefined ? [BigInt(frogId)] : undefined,
        query: {
            enabled: frogId !== undefined && !!ZETAFROG_ADDRESS,
        },
    });

    const { pendingTravel } = usePendingTravel(frogId);

    const status = (pendingTravel) 
        ? 'Traveling' 
        : (data && Array.isArray(data))
            ? (['Idle', 'Traveling', 'Returning'] as const)[Number(data[3])]
            : 'Idle';

    return { status, isLoading };
}