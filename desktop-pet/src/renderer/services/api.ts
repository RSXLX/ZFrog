// API Service for ZetaFrog Desktop Pet
import storage from './storage';

const FALLBACK_API_BASE = 'http://localhost:3001/api';

const getApiBase = () => {
  try {
    return storage.getSettings().apiUrl || FALLBACK_API_BASE;
  } catch {
    return FALLBACK_API_BASE;
  }
};

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

// Task types
interface Task {
  id: string;
  name: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  completed: boolean;
  claimed: boolean;
  reward: {
    lily?: number;
    xp?: number;
    zeta?: number;
  };
}

interface TasksResponse {
  daily: Task[];
  weekly: Task[];
  todayLoginTime: string;
  allDailyComplete: boolean;
}

// Frog types
interface Frog {
  id?: number;
  tokenId: number;
  name: string;
  status: string;
  level: number;
  xp: number;
  birthday: string;
  totalTravels: number;
  ownerAddress?: string;
}

// Wallet types
interface WalletInfo {
  address: string;
  balance: number;
  frogs: Frog[];
}

export interface BadgeData {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  rarity: number;
  isHidden: boolean;
  unlocked: boolean;
  unlockedAt?: string;
  unlockType?: string;
  airdropAmount?: string;
  airdropEnabled?: boolean;
}

export interface BadgeReward {
  id: string;
  amount: string;
  status: string;
  badgeName: string;
  badgeIcon: string;
  createdAt: string;
  txHash?: string;
  claimedAt?: string;
}

export interface TravelJournal {
  title: string;
  content: string;
  mood: string;
  highlights: string[];
}

export interface TravelSouvenir {
  name: string;
  rarity: string;
  tokenId?: number;
}

export interface TravelHistoryRecord {
  id: number;
  frogId: number;
  chainId: number;
  status: string;
  exploredBlock?: string;
  journalContent?: string | null;
  diary?: string | null;
  diaryMood?: string | null;
  journal?: TravelJournal | null;
  souvenir?: TravelSouvenir | null;
  completedAt?: string;
  frog?: {
    name: string;
    tokenId: number;
  };
}

export interface TravelHistoryResponse {
  travels: TravelHistoryRecord[];
  total: number;
  hasMore: boolean;
}

export interface TravelStats {
  totalTrips: number;
  bscTrips: number;
  ethTrips: number;
  zetaTrips: number;
  totalDiscoveries: number;
  rareFinds: number;
  totalFrogs?: number;
  recentTravel?: {
    id: number;
    frogName: string;
    completedAt?: string;
  } | null;
}

async function request<T>(endpoint: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const response = await fetch(`${getApiBase()}${normalizedEndpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    ...init,
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      success: false,
      error:
        typeof json?.error === 'string'
          ? json.error
          : `API Error: ${response.status} ${response.statusText}`,
      details: typeof json?.details === 'string' ? json.details : undefined,
    };
  }

  if (json && typeof json === 'object' && 'success' in json) {
    return json as ApiResponse<T>;
  }

  return {
    success: true,
    data: json as T,
  };
}

// API Functions
export const api = {
  // Get tasks for a wallet address
  async getTasks(walletAddress: string): Promise<TasksResponse | null> {
    try {
      const response = await request<TasksResponse>(`/tasks/${walletAddress}`);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('[API] Get tasks error:', error);
      return null;
    }
  },

  // Claim task reward
  async claimTaskReward(walletAddress: string, taskId: string): Promise<boolean> {
    try {
      const response = await request<boolean>(`/tasks/${walletAddress}/claim`, {
        method: 'POST',
        body: JSON.stringify({ taskId }),
      });
      return response.success;
    } catch (error) {
      console.error('[API] Claim reward error:', error);
      return false;
    }
  },

  // Get wallet info
  async getWalletInfo(walletAddress: string): Promise<WalletInfo | null> {
    try {
      const response = await request<WalletInfo>(`/address/${walletAddress}`);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('[API] Get wallet info error:', error);
      return null;
    }
  },

  // Get frogs for wallet
  async getFrogs(walletAddress: string): Promise<Frog[]> {
    try {
      const response = await request<Frog[]>(`/frogs/${walletAddress}`);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('[API] Get frogs error:', error);
      return [];
    }
  },

  // Get frog details
  async getFrogDetails(tokenId: number): Promise<Frog | null> {
    try {
      const response = await request<Frog>(`/frog/${tokenId}`);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('[API] Get frog details error:', error);
      return null;
    }
  },

  async getMyFrog(walletAddress: string): Promise<Frog | null> {
    try {
      const response = await request<Frog>(`/frogs/my/${walletAddress.toLowerCase()}`);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('[API] Get my frog error:', error);
      return null;
    }
  },

  // Start a travel
  async startTravel(tokenId: number, chain: string, duration: number): Promise<boolean> {
    try {
      const response = await request<boolean>(`/travel/${tokenId}/start`, {
        method: 'POST',
        body: JSON.stringify({ chain, duration }),
      });
      return response.success;
    } catch (error) {
      console.error('[API] Start travel error:', error);
      return false;
    }
  },

  // Get travel status
  async getTravelStatus(tokenId: number): Promise<any> {
    try {
      const response = await request<any>(`/travel/${tokenId}/status`);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('[API] Get travel status error:', error);
      return null;
    }
  },

  async getTravelHistory(walletAddress: string, frogId?: number): Promise<TravelHistoryResponse | null> {
    try {
      const params = new URLSearchParams({ address: walletAddress.toLowerCase() });
      if (frogId) {
        params.set('frogId', `${frogId}`);
      }

      const response = await request<TravelHistoryResponse>(`/travels/history?${params.toString()}`);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('[API] Get travel history error:', error);
      return null;
    }
  },

  async getTravelStats(walletAddress: string, frogId?: number): Promise<TravelStats | null> {
    try {
      const params = new URLSearchParams({ address: walletAddress.toLowerCase() });
      if (frogId) {
        params.set('frogId', `${frogId}`);
      }

      const response = await request<TravelStats>(`/travels/stats?${params.toString()}`);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('[API] Get travel stats error:', error);
      return null;
    }
  },

  // Get badges for frog
  async getBadges(tokenId?: number, ownerAddress?: string): Promise<BadgeData[]> {
    try {
      const endpoint = tokenId
        ? `/badges/${tokenId}`
        : ownerAddress
          ? `/badges?ownerAddress=${ownerAddress.toLowerCase()}`
          : null;

      if (!endpoint) {
        return [];
      }

      const response = await request<BadgeData[]>(endpoint);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('[API] Get badges error:', error);
      return [];
    }
  },

  async getPendingRewards(ownerAddress: string): Promise<BadgeReward[]> {
    try {
      const response = await request<BadgeReward[]>(`/badges/rewards?ownerAddress=${ownerAddress.toLowerCase()}`);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('[API] Get pending rewards error:', error);
      return [];
    }
  },

  async claimAllRewards(ownerAddress: string): Promise<{ successCount: number; txHashes: string[] }> {
    const response = await request<{ successCount: number; txHashes: string[] }>('/badges/rewards/claim-all', {
      method: 'POST',
      body: JSON.stringify({ ownerAddress }),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || response.details || 'Failed to claim rewards');
    }

    return response.data;
  },

  // Get friends list
  async getFriends(walletAddress: string): Promise<any[]> {
    try {
      const response = await request<any[]>(`/friends/${walletAddress}`);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('[API] Get friends error:', error);
      return [];
    }
  },
};

export default api;
