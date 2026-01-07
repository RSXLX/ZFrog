// frontend/src/hooks/useTravelQuery.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { useTravelStore } from '../stores/travelStore';
import type { Travel } from '../types';

// Query keys
export const travelKeys = {
  all: ['travels'] as const,
  lists: () => [...travelKeys.all, 'list'] as const,
  list: (filters: { frogId?: number; address?: string }) => 
    [...travelKeys.lists(), filters] as const,
  details: () => [...travelKeys.all, 'detail'] as const,
  detail: (id: number) => [...travelKeys.details(), id] as const,
  history: (address: string, frogId?: number) => 
    [...travelKeys.all, 'history', address, frogId] as const,
};

/**
 * 获取青蛙的旅行历史
 */
export function useFrogTravels(frogId: number, enabled = true) {
  const setTravelHistory = useTravelStore((state) => state.setTravelHistory);
  
  return useQuery({
    queryKey: travelKeys.detail(frogId),
    queryFn: async () => {
      const travels = await apiService.getFrogsTravels(frogId);
      setTravelHistory(travels);
      return travels;
    },
    enabled: enabled && frogId > 0,
    staleTime: 30 * 1000, // 30秒内认为数据是新鲜的
    gcTime: 5 * 60 * 1000, // 5分钟后垃圾回收
  });
}

/**
 * 获取地址的旅行历史
 */
export function useTravelHistory(address: string, frogId?: number, enabled = true) {
  const setTravelHistory = useTravelStore((state) => state.setTravelHistory);
  
  return useQuery({
    queryKey: travelKeys.history(address, frogId),
    queryFn: async () => {
      const history = await apiService.getTravelHistory(address, frogId);
      setTravelHistory(history);
      return history;
    },
    enabled: enabled && !!address,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * 开始随机旅行
 */
export function useStartRandomTravel() {
  const queryClient = useQueryClient();
  const addTravel = useTravelStore((state) => state.addTravel);
  
  return useMutation({
    mutationFn: async ({ 
      frogId, 
      targetChain, 
      duration 
    }: { 
      frogId: number; 
      targetChain: string; 
      duration: number;
    }) => {
      return apiService.startRandomTravel(frogId, targetChain, duration);
    },
    onSuccess: (data, variables) => {
      // 使相关查询失效
      queryClient.invalidateQueries({ queryKey: travelKeys.detail(variables.frogId) });
      queryClient.invalidateQueries({ queryKey: travelKeys.lists() });
    },
  });
}

/**
 * 开始定向旅行
 */
export function useStartTargetedTravel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      frogId, 
      targetChain, 
      targetAddress,
      duration 
    }: { 
      frogId: number; 
      targetChain: string; 
      targetAddress: string;
      duration: number;
    }) => {
      return apiService.startTargetedTravel(frogId, targetChain, targetAddress, duration);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: travelKeys.detail(variables.frogId) });
      queryClient.invalidateQueries({ queryKey: travelKeys.lists() });
    },
  });
}

/**
 * 预取旅行数据
 */
export function usePrefetchTravels() {
  const queryClient = useQueryClient();
  
  const prefetchFrogTravels = async (frogId: number) => {
    await queryClient.prefetchQuery({
      queryKey: travelKeys.detail(frogId),
      queryFn: () => apiService.getFrogsTravels(frogId),
      staleTime: 30 * 1000,
    });
  };
  
  return { prefetchFrogTravels };
}
