export interface Frog {
  id: number;
  tokenId: number;
  name: string;
  ownerAddress: string;
  birthday: Date;
  totalTravels: number;
  status: 'Idle' | 'Traveling' | 'Returning';
  xp?: number;
  level?: number;
}

export interface Travel {
  id: number;
  frogId: number;
  targetWallet: string;
  chainId: number;
  startTime: Date | string;
  endTime: Date | string;
  status: 'Active' | 'Processing' | 'Completed' | 'Cancelled' | 'Failed';
  observedTxCount?: number | null;
  observedTotalValue?: string | null;
  journalHash?: string;
  journalContent?: string | null;
  journal?: Journal | null;
  souvenir?: Souvenir | null;
  completedAt?: Date | string | null;
  
  // P0 新增字段
  exploredBlock?: bigint;
  exploredTimestamp?: Date;
  exploredSnapshot?: any;
  diary?: string;
  diaryMood?: DiaryMood;
  souvenirData?: SouvenirP0;
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
