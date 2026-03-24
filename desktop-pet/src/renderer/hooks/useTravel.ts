import storage from '../services/storage';
import {
  useTravelSync,
  type LocalTravelHistoryEntry,
  type TravelDestination,
  type TravelChain,
} from '../features/travel/useTravelSync';

export type { LocalTravelHistoryEntry, TravelDestination, TravelChain };

export function useTravel() {
  const frogId = storage.getActiveFrogId();
  return useTravelSync({ frogId });
}
