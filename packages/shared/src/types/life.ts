export type LifeHibernationStatus = 'ACTIVE' | 'DROWSY' | 'SLEEPING';

export interface LifeStateReadModel {
  hunger: number;
  happiness: number;
  cleanliness: number;
  health: number;
  energy: number;
  mood: string;
  isSick: boolean;
  needsClean: boolean;
  isDormant: boolean;
  hibernationStatus: LifeHibernationStatus;
  lifeStage: string;
}

export interface LifeFeedCommand {
  frogId: number;
  foodType: string;
  quantity?: number;
  source?: string;
}

export interface LifeActionCommand {
  frogId: number;
  source?: string;
}

export interface LifeBlessCommand {
  frogId: number;
  blesserFrogId: number;
  verificationId?: string;
}
