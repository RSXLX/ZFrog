// ========== Sync with Backend Schema ==========

export enum Personality {
  PHILOSOPHER = 'PHILOSOPHER',
  COMEDIAN = 'COMEDIAN',
  POET = 'POET',
  GOSSIP = 'GOSSIP',
}

export enum TravelStage {
  DEPARTING = 'DEPARTING',
  CROSSING = 'CROSSING',
  ARRIVING = 'ARRIVING',
  EXPLORING = 'EXPLORING',
  RETURNING = 'RETURNING',
}

export enum ChainType {
  BSC_TESTNET = 'BSC_TESTNET',
  ETH_SEPOLIA = 'ETH_SEPOLIA',
  ZETACHAIN_ATHENS = 'ZETACHAIN_ATHENS',
  POLYGON_MUMBAI = 'POLYGON_MUMBAI',
  ARBITRUM_GOERLI = 'ARBITRUM_GOERLI',
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: any;
}

export interface Frog {
  id: number;
  tokenId: number;
  name: string;
  ownerAddress: string;
  birthday: Date;
  totalTravels: number;
  status: 'Idle' | 'Traveling' | 'CrossChainLocked' | 'Returning';
  xp?: number;
  level?: number;
  personality?: Personality;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  
  // Compatibility for api.ts usage
  travels?: any[];
  souvenirs?: any[];
  friendshipStatus?: 'Pending' | 'Accepted' | 'Declined' | 'None';
  friendshipId?: number;
}

export interface Travel {
  id: number;
  frogId: number;
  targetWallet: string;
  targetChain?: ChainType; // New
  chainId: number;
  isRandom?: boolean; // New
  
  startTime: Date | string;
  endTime: Date | string;
  completedAt?: Date | string | null;
  
  status: 'Active' | 'Processing' | 'Completed' | 'Cancelled' | 'Failed';
  currentStage?: TravelStage; // New
  progress?: number; // New
  
  startTxHash?: string; // New
  completeTxHash?: string; // New
  errorMessage?: string; // New

  observedTxCount?: number | null;
  observedTotalValue?: string | null;
  
  journalHash?: string;
  journalContent?: string | null;
  journal?: Journal | null;
  souvenir?: Souvenir | null;
  
  // P0 Fields
  exploredBlock?: bigint;
  exploredTimestamp?: Date;
  exploredSnapshot?: any;
  diary?: string;
  diaryMood?: DiaryMood;
  souvenirData?: SouvenirP0;
  
  // Group Travel
  groupTravel?: {
    id: number;
    companionId: number;
    companion?: Frog;
  };

  // Cross-Chain Travel
  isCrossChain?: boolean;
  crossChainStatus?: 'LOCKED' | 'CROSSING_OUT' | 'ON_TARGET_CHAIN' | 'CROSSING_BACK' | 'UNLOCKED' | 'FAILED';
  messageIds?: string[];
  
  // Relations
  frog?: Frog;
}

export interface Souvenir {
  id: number;
  tokenId: number;
  name: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
  metadataUri?: string;
}

export interface Journal {
  title: string;
  content: string;
  mood: 'happy' | 'excited' | 'thoughtful' | 'adventurous' | 'tired' | 'HAPPY' | 'CURIOUS' | 'SURPRISED' | 'PEACEFUL' | 'EXCITED' | 'SLEEPY' | string;
  highlights: string[];
}

// 好友系统相关类型
export interface Friendship {
  id: number;
  requesterId: number;
  addresseeId: number;
  status: 'Pending' | 'Accepted' | 'Declined' | 'Blocked';
  createdAt: Date;
  updatedAt: Date;
  requester?: Frog;
  addressee?: Frog;
  interactions?: FriendInteraction[];
}

export type InteractionType = 'Visit' | 'Feed' | 'Play' | 'Gift' | 'Message' | 'Travel';

export interface FriendInteraction {
  id: number;
  friendshipId: number;
  actorId: number;
  type: InteractionType;
  message?: string;
  metadata?: any;
  createdAt: Date;
  friendship?: Friendship;
  actor?: Frog;
}

export interface FriendRequest {
  id: number;
  requester: Frog;
  addressee: Frog;
  status: 'Pending' | 'Accepted' | 'Declined' | 'Blocked';
  createdAt: Date;
}

// 结伴旅行
export type GroupTravelStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface GroupTravel {
  id: number;
  leaderId: number;
  companionId: number;
  travelId: number;
  status: GroupTravelStatus;
  createdAt: Date | string;
  leader?: Frog;
  companion?: Frog;
}

// ========== P0 新增类型 ==========

export type DiaryMood = 'HAPPY' | 'CURIOUS' | 'SURPRISED' | 'PEACEFUL' | 'EXCITED' | 'SLEEPY';

export interface Discovery {
  type: 'balance' | 'activity' | 'timing' | 'fun_fact';
  title: string;
  description: string;
  rarity: number;
}

export interface SouvenirP0 {
  type: 'postcard' | 'leaf' | 'stone' | 'photo' | 'story' | 'feather' | 'shell';
  name: string;
  description: string;
  rarity: number;
  chainOrigin: string;
  blockOrigin: string;
  emoji: string;
}

export interface TravelBadge {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  unlockType: 'TRIP_COUNT' | 'CHAIN_VISIT' | 'MULTI_CHAIN' | 'RARE_FIND' | 'SPECIAL';
  unlockCondition: any;
  rarity: number;
  isHidden: boolean;
  unlocked?: boolean;
  unlockedAt?: Date;
}

export interface UserBadge {
  id: string;
  frogId: number;
  badgeId: string;
  unlockedAt: Date;
  unlockedByTravelId?: number;
  badge?: TravelBadge;
}

export interface FrogTravelStats {
  id: string;
  frogId: number;
  totalTrips: number;
  bscTrips: number;
  ethTrips: number;
  zetaTrips: number;
  totalDiscoveries: number;
  rareFinds: number;
  earliestBlockVisited?: bigint;
  oldestDateVisited?: Date;
}
