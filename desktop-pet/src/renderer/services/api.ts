// API Service for ZetaFrog Desktop Pet
const API_BASE = 'http://localhost:3000/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
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
  tokenId: number;
  name: string;
  status: string;
  level: number;
  xp: number;
  birthday: string;
  totalTravels: number;
}

// Wallet types
interface WalletInfo {
  address: string;
  balance: number;
  frogs: Frog[];
}

// API Functions
export const api = {
  // Get tasks for a wallet address
  async getTasks(walletAddress: string): Promise<TasksResponse | null> {
    try {
      const response = await fetch(`${API_BASE}/tasks/${walletAddress}`);
      const data: ApiResponse<TasksResponse> = await response.json();
      if (data.success && data.data) {
        return data.data;
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
      const response = await fetch(`${API_BASE}/tasks/${walletAddress}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('[API] Claim reward error:', error);
      return false;
    }
  },

  // Get wallet info
  async getWalletInfo(walletAddress: string): Promise<WalletInfo | null> {
    try {
      const response = await fetch(`${API_BASE}/address/${walletAddress}`);
      const data = await response.json();
      if (data.success && data.data) {
        return data.data;
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
      const response = await fetch(`${API_BASE}/frogs/${walletAddress}`);
      const data = await response.json();
      if (data.success && data.data) {
        return data.data;
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
      const response = await fetch(`${API_BASE}/frog/${tokenId}`);
      const data = await response.json();
      if (data.success && data.data) {
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('[API] Get frog details error:', error);
      return null;
    }
  },

  // Start a travel
  async startTravel(tokenId: number, chain: string, duration: number): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/travel/${tokenId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chain, duration }),
      });
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('[API] Start travel error:', error);
      return false;
    }
  },

  // Get travel status
  async getTravelStatus(tokenId: number): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/travel/${tokenId}/status`);
      const data = await response.json();
      if (data.success && data.data) {
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('[API] Get travel status error:', error);
      return null;
    }
  },

  // Get badges for frog
  async getBadges(tokenId: number): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE}/badges/${tokenId}`);
      const data = await response.json();
      if (data.success && data.data) {
        return data.data;
      }
      return [];
    } catch (error) {
      console.error('[API] Get badges error:', error);
      return [];
    }
  },

  // Get friends list
  async getFriends(walletAddress: string): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE}/friends/${walletAddress}`);
      const data = await response.json();
      if (data.success && data.data) {
        return data.data;
      }
      return [];
    } catch (error) {
      console.error('[API] Get friends error:', error);
      return [];
    }
  },
};

export default api;
