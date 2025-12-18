const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface Frog {
  id: number;
  tokenId: number;
  name: string;
  ownerAddress: string;
  birthday: Date;
  totalTravels: number;
  status: 'Idle' | 'Traveling' | 'Returning';
  createdAt: Date;
  updatedAt: Date;
  travels?: any[];
  souvenirs?: any[];
  xp?: number;
  level?: number;
}

class ApiService {
  private async request(endpoint: string, options?: RequestInit) {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 获取某地址拥有的所有青蛙
   */
  async getFrogsByOwner(address: string): Promise<Frog[]> {
    return this.request(`/api/frogs/owner/${address.toLowerCase()}`);
  }

  /**
   * 获取青蛙详情
   */
  async getFrogDetail(tokenId: number): Promise<Frog | null> {
    try {
      return await this.request(`/api/frogs/${tokenId}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * 手动同步青蛙数据
   */
  async syncFrog(tokenId: number): Promise<boolean> {
    try {
      const response = await this.request('/api/frogs/sync', {
        method: 'POST',
        body: JSON.stringify({ tokenId }),
      });
      return response.success;
    } catch (error) {
        console.error('Sync failed:', error);
        return false;
    }
  }
  
  /**
   * 获取青蛙旅行历史
   */
  async getFrogsTravels(frogId: number): Promise<any[]> {
    return this.request(`/api/travels/${frogId}`);
  }
}

export const apiService = new ApiService();