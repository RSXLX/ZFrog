import type {
  ApiEnvelope as SharedApiEnvelope,
  ApiErrorBody as SharedApiErrorBody,
  ApiFailureEnvelope as SharedApiFailureEnvelope,
  ApiMeta as SharedApiMeta,
  ApiSuccessEnvelope as SharedApiSuccessEnvelope,
} from '../../../../packages/shared/src/types/api';

export type ApiMeta = SharedApiMeta;
export type ApiError = SharedApiErrorBody;
export type ApiSuccessEnvelope<T> = SharedApiSuccessEnvelope<T>;
export type ApiFailureEnvelope = SharedApiFailureEnvelope;
export type ApiEnvelope<T> = SharedApiEnvelope<T>;

export interface AuthMeReadModel {
  walletAddress: string;
  world: {
    verifiedActions: string[];
  };
  frogTokenId: number | null;
}

export interface EggClaimPayload {
  walletAddress: string;
  verificationId: string;
  petName: string;
}

export type EggHatchStatus = 'incubating' | 'soul_imprinted' | 'hatched';

export interface EggClaimResult {
  frogId: number;
  tokenId: number;
  eggProfile: {
    hatchStatus: EggHatchStatus;
    hatchProgress: number;
  };
}

export interface SoulImprintPayload {
  introText: string;
  voiceSummary?: string;
  preferredStyle?: string;
}

export interface SoulImprintResult {
  tone: string;
  traits: string[];
  evolutionBias: string;
}

export interface HatchPayload {
  source?: string;
}

export interface HatchResult {
  hatched: boolean;
  frogStatus: 'Idle';
  eggStatus: 'hatched';
}

export interface EggLifecycleReadModel {
  frogId: number;
  tokenId: number;
  walletAddress: string;
  petName: string;
  eggProfile: {
    hatchStatus: EggHatchStatus;
    hatchProgress: number;
    claimedAt: string | null;
    hatchReadyAt: string | null;
    hatchedAt: string | null;
  } | null;
  soulProfile: {
    personality: string | null;
    imprintText: string | null;
    temperament: unknown;
    bondedAt: string | null;
  } | null;
}

export type LifeHibernationStatus = 'ACTIVE' | 'DROWSY' | 'SLEEPING';

export interface LifeReadModel {
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

export interface LifeStateResult {
  hunger: number;
  happiness: number;
  cleanliness: number;
  health: number;
  energy: number;
  isSick: boolean;
  needsClean: boolean;
  isDormant: boolean;
  hibernationStatus: LifeHibernationStatus;
  mood: string;
}

export interface LifeFeedPayload {
  foodType: string;
  quantity?: number;
  source?: string;
}

export interface LifeFeedResult extends LifeStateResult {
  foodType: string;
  quantity: number;
  foodEffects: {
    hunger: number;
    energy: number;
    happiness: number;
  };
}

export interface LifePlayPayload {
  gameType?: string;
  score?: number;
  source?: string;
}

export interface LifePlayResult extends LifeStateResult {
  gameType: string;
  happinessGain: number;
}

export interface LifeActionPayload {
  source?: string;
}

export interface LifeRestStartResult {
  started: boolean;
  message: string;
}

export interface LifeRestEndResult {
  ended: boolean;
  energyGain: number;
  state: LifeStateResult;
  message: string;
}

export interface LifeHibernationReadModel {
  hibernationStatus: LifeHibernationStatus;
  isDormant: boolean;
  mood: string;
}

export interface LifeRevivalCostInfo {
  baseCost: number;
  discount: number;
  finalCost: number;
  blessings: number;
}

export interface LifeReviveResult {
  success: boolean;
  message: string;
  cost: number;
}

export interface LifeBlessPayload {
  blesserFrogId: number;
  verificationId: string;
}

export interface LifeBlessResult {
  success: boolean;
  message: string;
  blessingsReceived: number;
  blesserEnergy: number;
}

export type SocialRitualType = 'blessing' | 'rescue';

export interface SocialCreateRitualPayload {
  type: SocialRitualType;
  targetFrogId?: number;
  initiatorFrogId: number;
  travelId?: number;
  verificationId?: string;
}

export interface SocialRitualResult {
  type?: SocialRitualType;
  success: boolean;
  message: string;
  blessingsReceived?: number;
  blesserEnergy?: number;
  xpEarned?: number;
  reputationEarned?: number;
}

export interface FrogWalletReadModel {
  frogId: number;
  tokenId: number;
  frogName: string;
  ownerAddress: string;
  tbaAddress: string;
  tbaSource: 'erc6551_registry' | 'deterministic_fallback';
  chainId: number;
  assets: {
    souvenirs: Array<{
      id: number;
      tokenId: number;
      name: string;
      rarity: string;
      chainType: string;
      mintedAt: string;
    }>;
    badges: Array<{
      id: string;
      code: string;
      name: string;
      icon: string;
      rarity: number;
      unlockedAt: string;
      unlockedByTravelId: number | null;
    }>;
    decorations: Array<{
      id: string;
      name: string;
      type: string;
      assetUrl: string;
      rarity: number;
      amount: number;
      souvenirId: number | null;
    }>;
  };
  milestones: {
    total: number;
    latestAt: string | null;
  };
}

export interface OnchainMilestoneReadModel {
  id: string;
  frogId: number;
  travelId: number | null;
  type: string;
  milestoneType: string;
  chainId: number | null;
  txHash: string | null;
  blockNumber: string | null;
  payload: unknown;
  createdAt: string;
}

export interface ModuleStatusReadModel {
  module: string;
  status: string;
  nextIssue?: string;
}

export interface TravelDiscoveryReadModel {
  id?: number;
  type: string;
  title: string;
  description: string;
  rarity: number;
  chainType?: string;
  blockNumber?: string | null;
  metadata?: unknown;
  createdAt?: string;
}

export interface TravelJournalReadModel {
  title: string;
  content: string;
  mood: string;
  highlights: string[];
}

export interface TravelSouvenirReadModel {
  id?: number;
  tokenId?: number;
  name: string;
  rarity: string;
  description?: string;
}

export interface TravelV1ReadModel {
  id?: number;
  travelId: number;
  frogId: number;
  tokenId: number;
  frogName: string;
  walletAddress: string;
  status: string;
  currentStage: string;
  progress: number;
  travelType: 'random' | 'specific' | 'cross_chain';
  targetWallet: string;
  targetChain: string;
  chainId: number;
  duration: number;
  startTime: string;
  endTime: string;
  completedAt: string | null;
  updatedAt: string;
  souvenirId: number | null;
  souvenir: TravelSouvenirReadModel | null;
  journal: TravelJournalReadModel | null;
  diary?: string;
  diaryMood?: string;
  exploredSnapshot?: {
    discoveries?: TravelDiscoveryReadModel[];
  };
  frog?: {
    id: number;
    tokenId: number;
    name: string;
    ownerAddress: string;
    birthday?: string | Date;
    totalTravels?: number;
    status?: string;
  };
  discoveries: TravelDiscoveryReadModel[];
}

export interface LegacyTravelHistoryItem {
  id: number;
  frogId: number;
  targetChain: string;
  targetWallet: string;
  chainId: number;
  status: string;
  exploredBlock?: string;
  exploredTimestamp?: string;
  diary?: string;
  diaryMood?: string;
  journalContent?: string | null;
  journal?: TravelJournalReadModel | null;
  souvenir?: TravelSouvenirReadModel | null;
  completedAt?: string;
  frog?: {
    name: string;
    tokenId: number;
  };
  discoveries?: TravelDiscoveryReadModel[];
  exploredSnapshot?: {
    discoveries?: TravelDiscoveryReadModel[];
  };
}

export interface LegacyTravelHistoryReadModel {
  travels: LegacyTravelHistoryItem[];
  total: number;
  hasMore?: boolean;
}

export interface LegacyTravelStatsReadModel {
  totalTrips: number;
  bscTrips: number;
  ethTrips: number;
  zetaTrips: number;
  totalDiscoveries: number;
  rareFinds: number;
}

export interface LegacyTravelJournalReadModel {
  id: number;
  frogName?: string;
  journalHash?: string | null;
  journal: TravelJournalReadModel | null;
  souvenir?: TravelSouvenirReadModel | null;
  completedAt?: string | null;
  exploredBlock?: string | null;
  exploredSnapshot?: {
    discoveries?: TravelDiscoveryReadModel[];
  };
  status?: string;
  chainId?: number;
  targetWallet?: string;
}

export interface LegacyTravelP0ReadModel {
  id: number;
  travelId: number;
  frogId: number;
  tokenId: number;
  status: string;
  currentStage: string;
  progress: number;
  chainId: number;
  targetWallet: string;
  startTime: string;
  endTime: string;
  completedAt: string | null;
  journal: TravelJournalReadModel | null;
  exploredSnapshot: {
    discoveries: TravelDiscoveryReadModel[];
  };
  souvenir?: TravelSouvenirReadModel | null;
  exploredBlock?: string | null;
}

export interface MemoryPalaceLite {
  id: string;
  frogId: number;
  frog: {
    id: number;
    tokenId: number;
    name: string;
    ownerAddress: string;
    birthday: string;
    totalTravels: number;
    status: 'Idle' | 'Traveling' | 'CrossChainLocked' | 'Returning';
    xp: number;
    level: number;
  };
  title: string;
  summary: string;
  journal?: {
    title: string;
    content: string;
    mood: string;
  } | null;
  souvenir?: {
    id?: number;
    name?: string;
    description?: string;
    rarity?: number;
    chainOrigin?: string;
    emoji?: string;
    tokenId?: number;
  } | null;
  highlights?: string[];
}

export interface SouvenirImageStatusRecord {
  id: string;
  souvenirId: string;
  status: string;
  imageUrl?: string | null;
  gatewayUrl?: string | null;
}

export interface SouvenirImageStatusResponse {
  success: boolean;
  record?: SouvenirImageStatusRecord;
  error?: string;
}
