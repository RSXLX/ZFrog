// frontend/src/hooks/useZetaFrog.ts

import { useReadContract, useReadContracts } from 'wagmi';
import { ZETAFROG_ADDRESS, ZETAFROG_ABI, SOUVENIR_ADDRESS, SOUVENIR_ABI } from '../config/contracts';

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
 * 获取合约常量
 */
export function useContractConstants() {
    const { data, isLoading } = useReadContracts({
        contracts: [
            {
                address: ZETAFROG_ADDRESS,
                abi: ZETAFROG_ABI,
                functionName: 'MAX_SUPPLY',
            },
            {
                address: ZETAFROG_ADDRESS,
                abi: ZETAFROG_ABI,
                functionName: 'MIN_TRAVEL_DURATION',
            },
            {
                address: ZETAFROG_ADDRESS,
                abi: ZETAFROG_ABI,
                functionName: 'MAX_TRAVEL_DURATION',
            },
            {
                address: ZETAFROG_ADDRESS,
                abi: ZETAFROG_ABI,
                functionName: 'COOLDOWN_PERIOD',
            },
        ],
        query: {
            enabled: !!ZETAFROG_ADDRESS,
        },
    });

    return {
        maxSupply: data?.[0]?.result ? Number(data[0].result) : 1000,
        minTravelDuration: data?.[1]?.result ? Number(data[1].result) : 60,
        maxTravelDuration: data?.[2]?.result ? Number(data[2].result) : 86400,
        cooldownPeriod: data?.[3]?.result ? Number(data[3].result) : 600,
        isLoading,
    };
}

/**
 * 获取青蛙的纪念品列表
 */
export function useFrogSouvenirs(frogId: number) {
    const { data, isLoading, refetch } = useReadContract({
        address: SOUVENIR_ADDRESS,
        abi: SOUVENIR_ABI,
        functionName: 'getFrogSouvenirs',
        args: [BigInt(frogId)],
        query: {
            enabled: frogId >= 0 && !!SOUVENIR_ADDRESS,
        },
    });

    const souvenirIds = (data as bigint[])?.map(id => Number(id)) || [];

    return { souvenirIds, isLoading, refetch };
}

/**
 * 获取单个纪念品详情
 */
export function useSouvenirData(souvenirId: number) {
    const { data, isLoading, error } = useReadContract({
        address: SOUVENIR_ADDRESS,
        abi: SOUVENIR_ABI,
        functionName: 'getSouvenir',
        args: [BigInt(souvenirId)],
        query: {
            enabled: souvenirId >= 0 && !!SOUVENIR_ADDRESS,
        },
    });

    // 合约返回: [name, rarity, frogId, mintTime, metadataURI]
    const souvenir = (data && Array.isArray(data)) ? {
        name: data[0] as string,
        rarity: Number(data[1]),
        frogId: Number(data[2]),
        mintTime: new Date(Number(data[3]) * 1000),
        metadataURI: data[4] as string,
    } : null;

    return { souvenir, isLoading, error };
}

/**
 * 综合 Hook：获取青蛙完整状态
 */
export function useFrogFullStatus(tokenId: number) {
    const { frog, isLoading: frogLoading, refetch: refetchFrog } = useFrogData(tokenId);
    const { canTravel, isLoading: canTravelLoading } = useCanTravel(tokenId);
    const { travel, isLoading: travelLoading, refetch: refetchTravel } = useActiveTravel(tokenId);
    const { journals, isLoading: journalsLoading } = useTravelJournals(tokenId);
    const { owner, isLoading: ownerLoading } = useFrogOwner(tokenId);

    const isLoading = frogLoading || canTravelLoading || travelLoading || journalsLoading || ownerLoading;

    const refetch = () => {
        refetchFrog();
        refetchTravel();
    };

    return {
        frog,
        owner,
        canTravel,
        activeTravel: travel,
        journals,
        isLoading,
        refetch,
    };
}