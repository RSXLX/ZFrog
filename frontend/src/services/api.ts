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
  friendshipStatus?: 'Pending' | 'Accepted' | 'Declined' | 'None';
  friendshipId?: number;
  level?: number;
}

class ApiService {
  private async request(endpoint: string, options?: RequestInit) {
    let finalEndpoint = endpoint;
    // 如果不是以 http 开头且不是以 /api 开头，自动补全 /api
    if (!endpoint.startsWith('http') && !endpoint.startsWith('/api')) {
      finalEndpoint = `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    }
    
    const url = finalEndpoint.startsWith('http') ? finalEndpoint : `${API_BASE_URL}${finalEndpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMessage = `API Error: ${response.status} ${response.statusText}`;
        
        if (errorData.error) {
          if (typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (errorData.error.message) {
            errorMessage = errorData.error.message;
          }
        }
        
        const error = new Error(errorMessage);
        (error as any).response = { data: errorData, status: response.status };
        throw error;
    }

    const data = await response.json();
    return { data }; // 模拟 axios 返回结构
  }

  async get(endpoint: string, config?: { params?: Record<string, any> }) {
    let url = endpoint;
    if (config?.params) {
      const qs = new URLSearchParams(config.params).toString();
      url += (url.includes('?') ? '&' : '?') + qs;
    }
    return this.request(url, { method: 'GET' });
  }

  async post(endpoint: string, data?: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint: string, data?: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint: string) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  /**
   * 获取某地址拥有的所有青蛙
   */
  async getFrogsByOwner(address: string): Promise<Frog[]> {
    const res = await this.get(`/api/frogs/owner/${address.toLowerCase()}`);
    return res.data;
  }

  /**
   * 获取青蛙详情
   */
  async getFrogDetail(tokenId: number, viewerAddress?: string): Promise<Frog | null> {
    try {
      const url = viewerAddress 
        ? `/api/frogs/${tokenId}?viewerAddress=${viewerAddress.toLowerCase()}`
        : `/api/frogs/${tokenId}`;
      const res = await this.get(url);
      return res.data;
    } catch (error) {
      if ((error as any).response?.status === 404) {
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
      const response = await this.post('/api/frogs/sync', { tokenId });
      return response.data.success;
    } catch (error) {
        console.error('Sync failed:', error);
        return false;
    }
  }
  
  /**
   * 获取青蛙旅行历史
   */
  async getFrogsTravels(frogId: number): Promise<any[]> {
    const res = await this.get(`/api/travels/${frogId}`);
    return res.data;
  }
}

export const apiService = new ApiService();
export const api = apiService;