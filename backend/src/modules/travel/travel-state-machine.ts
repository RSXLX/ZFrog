import { TravelStage, TravelStatus } from '@prisma/client';

export type TravelApiStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED';

export type TravelApiStage =
  | 'PREPARING'
  | 'DEPARTING'
  | 'CROSSING'
  | 'ARRIVING'
  | 'OBSERVING'
  | 'RETURNING'
  | 'INTERACTING'
  | 'STRANDED'
  | 'COMPLETED';

export interface TravelMachineState {
  status: TravelApiStatus;
  currentStage: TravelApiStage;
  progress: number;
}

export interface PrismaTravelState {
  status: TravelStatus;
  currentStage: TravelStage;
  progress: number;
}

const clampProgress = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const mapApiStage = (stage: TravelStage): TravelApiStage => {
  switch (stage) {
    case TravelStage.DEPARTING:
      return 'DEPARTING';
    case TravelStage.CROSSING:
      return 'CROSSING';
    case TravelStage.ARRIVING:
      return 'ARRIVING';
    case TravelStage.EXPLORING:
      return 'OBSERVING';
    case TravelStage.RETURNING:
      return 'RETURNING';
    case TravelStage.INTERACTING:
      return 'INTERACTING';
    case TravelStage.STRANDED:
      return 'STRANDED';
    default:
      return 'DEPARTING';
  }
};

const mapApiStatus = (
  status: TravelStatus,
  stage: TravelStage,
  progress: number
): TravelApiStatus => {
  if (status === TravelStatus.Active && stage === TravelStage.DEPARTING && progress <= 5) {
    return 'PENDING';
  }

  switch (status) {
    case TravelStatus.Active:
      return 'ACTIVE';
    case TravelStatus.Processing:
      return 'PROCESSING';
    case TravelStatus.Completed:
      return 'COMPLETED';
    case TravelStatus.Cancelled:
      return 'CANCELLED';
    case TravelStatus.Failed:
      return 'FAILED';
    default:
      return 'ACTIVE';
  }
};

export const toTravelMachineState = (state: PrismaTravelState): TravelMachineState => {
  const progress = clampProgress(state.progress);
  const status = mapApiStatus(state.status, state.currentStage, progress);

  if (status === 'PENDING') {
    return {
      status,
      currentStage: 'PREPARING',
      progress,
    };
  }

  if (status === 'COMPLETED') {
    return {
      status,
      currentStage: 'COMPLETED',
      progress: 100,
    };
  }

  return {
    status,
    currentStage: mapApiStage(state.currentStage),
    progress,
  };
};

export const createInitialTravelState = (): PrismaTravelState => ({
  status: TravelStatus.Active,
  currentStage: TravelStage.DEPARTING,
  progress: 0,
});

export const createCompletedTravelState = (): PrismaTravelState => ({
  status: TravelStatus.Completed,
  currentStage: TravelStage.RETURNING,
  progress: 100,
});

export const createFailedTravelState = (): PrismaTravelState => ({
  status: TravelStatus.Failed,
  currentStage: TravelStage.STRANDED,
  progress: 100,
});
