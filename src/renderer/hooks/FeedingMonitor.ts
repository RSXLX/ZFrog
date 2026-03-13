export interface FeedingState {
  snackCount: number;
  lastFed: number;
  isOverfed: boolean;
}

export const MAX_SNACKS_PER_DAY = 5;

export function feedSnack(state: FeedingState): FeedingState {
  const newSnackCount = state.snackCount + 1;
  return {
    ...state,
    snackCount: newSnackCount,
    lastFed: Date.now(),
    isOverfed: newSnackCount > MAX_SNACKS_PER_DAY
  };
}

export function resetDailyFeeding(state: FeedingState): FeedingState {
  return {
    ...state,
    snackCount: 0,
    isOverfed: false
  };
}
