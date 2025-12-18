import { useReadContract } from 'wagmi';
import { ZETAFROG_ADDRESS, ZETAFROG_ABI } from '../config/contracts';

export function useFrogData(tokenId: number) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: ZETAFROG_ADDRESS,
    abi: ZETAFROG_ABI,
    functionName: 'getFrog',
    args: [BigInt(tokenId)],
  });
  
  const frog = (data && Array.isArray(data)) ? {
    name: (data as any[])[0] as string,
    birthday: new Date(Number((data as any[])[1]) * 1000),
    totalTravels: Number((data as any[])[2]),
    status: (['Idle', 'Traveling', 'Returning'] as const)[Number((data as any[])[3])],
  } : null;
  
  return { frog, isLoading, error, refetch };
}

export function useCanTravel(tokenId: number) {
  const { data, isLoading } = useReadContract({
    address: ZETAFROG_ADDRESS,
    abi: ZETAFROG_ABI,
    functionName: 'canTravel',
    args: [BigInt(tokenId)],
  });
  
  return { canTravel: data as boolean, isLoading };
}

export function useActiveTravel(tokenId: number) {
  const { data, isLoading } = useReadContract({
    address: ZETAFROG_ADDRESS,
    abi: ZETAFROG_ABI,
    functionName: 'getActiveTravel',
    args: [BigInt(tokenId)],
  });
  
  const d = data as any[];
  // ABI: [startTime, duration, targetChainId, targetWallet]
  const travel = (data && Array.isArray(data)) ? {
    startTime: new Date(Number(d[0]) * 1000),
    endTime: new Date((Number(d[0]) + Number(d[1])) * 1000),
    targetChainId: Number(d[2]),
    targetWallet: d[3] as string,
    completed: false, 
  } : null;
  
  return { travel, isLoading };
}

export function useTotalSupply() {
  const { data, isLoading } = useReadContract({
    address: ZETAFROG_ADDRESS,
    abi: ZETAFROG_ABI,
    functionName: 'totalSupply',
  });
  
  return { totalSupply: data ? Number(data) : 0, isLoading };
}
