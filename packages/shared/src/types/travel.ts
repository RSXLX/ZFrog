export type TravelStatus =
  | 'IDLE'
  | 'TRAVELING'
  | 'EXPLORING'
  | 'RETURNING'
  | 'COMPLETED'
  | 'FAILED';

export interface TravelReadModel {
  id: number;
  frogId: number;
  chainId: number;
  targetAddress: string;
  status: TravelStatus;
  startedAt: string;
  endedAt?: string | null;
}

export interface TravelStartCommand {
  frogId: number;
  chainId: number;
  targetAddress: string;
  duration?: number;
  source?: string;
}

export interface TravelCompleteCommand {
  travelId: number;
  result?: Record<string, unknown>;
  source?: string;
}
