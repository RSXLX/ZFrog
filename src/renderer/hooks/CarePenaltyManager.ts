import { DiseaseState } from './DiseaseSystem';
import { HygieneState } from './HygieneSystem';
import { FeedingState } from './FeedingMonitor';

export interface PetStatus {
  health: number; // 0-100
  happiness: number; // 0-100
}

export function calculatePenalties(
  status: PetStatus,
  diseaseState: DiseaseState,
  hygieneState: HygieneState,
  feedingState: FeedingState
): PetStatus {
  let healthPenalty = 0;
  let happinessPenalty = 0;

  // Disease penalties
  if (diseaseState.isSick) {
    healthPenalty += 10;
    happinessPenalty += 15;
  }

  // Hygiene penalties
  if (hygieneState.excretionCount > 2) {
    healthPenalty += 5;
    happinessPenalty += 10;
  }

  // Overfeeding penalties
  if (feedingState.isOverfed) {
    healthPenalty += 15;
    happinessPenalty += 5;
  }

  return {
    health: Math.max(0, status.health - healthPenalty),
    happiness: Math.max(0, status.happiness - happinessPenalty)
  };
}
