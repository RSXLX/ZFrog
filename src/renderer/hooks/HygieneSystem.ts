export interface HygieneState {
  excretionCount: number;
  lastCleaned: number;
  cleanliness: number; // 0 to 100
}

export const EXCRETION_INTERVAL_MS = 1000 * 60 * 60 * 4; // 4 hours

export function triggerExcretion(state: HygieneState): HygieneState {
  return {
    ...state,
    excretionCount: state.excretionCount + 1,
    cleanliness: Math.max(0, state.cleanliness - 20)
  };
}

export function cleanEnvironment(state: HygieneState): HygieneState {
  return {
    ...state,
    excretionCount: 0,
    cleanliness: 100,
    lastCleaned: Date.now()
  };
}
