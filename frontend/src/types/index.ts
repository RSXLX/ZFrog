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
  startTime: Date;
  endTime: Date;
  status: 'Active' | 'Processing' | 'Completed' | 'Cancelled' | 'Failed';
  journalHash?: string;
  journalContent?: string;
  souvenir?: Souvenir;
}

export interface Souvenir {
  id: number;
  tokenId: number;
  name: string;
  rarity: 'Common' | 'Uncommon' | 'Rare';
  metadataUri?: string;
}

export interface Journal {
  title: string;
  content: string;
  mood: 'happy' | 'excited' | 'thoughtful' | 'adventurous' | 'tired';
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
