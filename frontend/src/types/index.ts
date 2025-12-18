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
