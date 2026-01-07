// frontend/src/stores/travelStore.ts
import { create } from 'zustand';
import type { Travel } from '../types';

export interface TravelState {
  // 当前活跃的旅行列表
  activeTravels: Travel[];
  // 旅行历史记录
  travelHistory: Travel[];
  // 加载状态
  isLoading: boolean;
  // 错误信息
  error: string | null;
  // 当前选中的旅行
  selectedTravel: Travel | null;
  
  // Actions
  setActiveTravels: (travels: Travel[]) => void;
  setTravelHistory: (travels: Travel[]) => void;
  addTravel: (travel: Travel) => void;
  updateTravel: (travelId: number, updates: Partial<Travel>) => void;
  removeTravel: (travelId: number) => void;
  setSelectedTravel: (travel: Travel | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  activeTravels: [],
  travelHistory: [],
  isLoading: false,
  error: null,
  selectedTravel: null,
};

export const useTravelStore = create<TravelState>((set) => ({
  ...initialState,
  
  setActiveTravels: (travels) => set({ activeTravels: travels }),
  
  setTravelHistory: (travels) => set({ travelHistory: travels }),
  
  addTravel: (travel) => set((state) => ({
    activeTravels: [...state.activeTravels, travel],
  })),
  
  updateTravel: (travelId, updates) => set((state) => ({
    activeTravels: state.activeTravels.map((t) =>
      t.id === travelId ? { ...t, ...updates } : t
    ),
    travelHistory: state.travelHistory.map((t) =>
      t.id === travelId ? { ...t, ...updates } : t
    ),
    selectedTravel: state.selectedTravel?.id === travelId 
      ? { ...state.selectedTravel, ...updates } 
      : state.selectedTravel,
  })),
  
  removeTravel: (travelId) => set((state) => ({
    activeTravels: state.activeTravels.filter((t) => t.id !== travelId),
  })),
  
  setSelectedTravel: (travel) => set({ selectedTravel: travel }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  reset: () => set(initialState),
}));

// Selectors
export const selectActiveTravels = (state: TravelState) => state.activeTravels;
export const selectTravelHistory = (state: TravelState) => state.travelHistory;
export const selectIsLoading = (state: TravelState) => state.isLoading;
export const selectError = (state: TravelState) => state.error;
export const selectSelectedTravel = (state: TravelState) => state.selectedTravel;
