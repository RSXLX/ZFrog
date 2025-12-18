import { create } from 'zustand';
import type { Frog, Travel, Journal } from '../types';

interface FrogStore {
  // State
  frogs: Frog[];
  currentFrog: Frog | null;
  activeTravel: Travel | null;
  
  // Actions
  setFrogs: (frogs: Frog[]) => void;
  addFrog: (frog: Frog) => void;
  setCurrentFrog: (frog: Frog | null) => void;
  updateFrogStatus: (frogId: number, status: Frog['status']) => void;
  setActiveTravel: (travel: Travel | null) => void;
  addTravelResult: (frogId: number, result: { journal: Journal; souvenir?: unknown }) => void;
}

export const useFrogStore = create<FrogStore>((set) => ({
  frogs: [],
  currentFrog: null,
  activeTravel: null,
  
  setFrogs: (frogs) => set({ frogs }),
  
  addFrog: (frog) => set((state) => ({
    frogs: [...state.frogs, frog],
  })),
  
  setCurrentFrog: (frog) => set({ currentFrog: frog }),
  
  updateFrogStatus: (frogId, status) => set((state) => ({
    frogs: state.frogs.map((f) =>
      f.tokenId === frogId ? { ...f, status } : f
    ),
    currentFrog: state.currentFrog?.tokenId === frogId
      ? { ...state.currentFrog, status }
      : state.currentFrog,
  })),
  
  setActiveTravel: (travel) => set({ activeTravel: travel }),
  
  addTravelResult: (frogId, result) => set((state) => {
    console.log('Travel result for frog', frogId, result);
    return state;
  }),
}));
