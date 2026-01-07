const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
import { Frog } from '../types';
export type { Frog };




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

    const json = await response.json();
    
    // 如果后端已经包装了结构，直接返回
    if (json && typeof json === 'object' && 'success' in json) {
      return json;
    }

    return { success: true, data: json }; // 统一返回结构
  }

  async get<T = any>(endpoint: string, config?: { params?: Record<string, any> }): Promise<T> {
    let url = endpoint;
    if (config?.params) {
      const qs = new URLSearchParams(config.params).toString();
      url += (url.includes('?') ? '&' : '?') + qs;
    }
    return this.request(url, { method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    return this.request(endpoint, { method: 'DELETE' });
  }

  /**
   * 获取某地址拥有的所有青蛙
   * @deprecated 使用 getMyFrog 替代（每个钱包只有一个青蛙）
   */
  async getFrogsByOwner(address: string): Promise<Frog[]> {
    console.warn('[API] getFrogsByOwner is deprecated. Use getMyFrog instead (single frog per wallet).');
    const res = await this.get(`/api/frogs/owner/${address.toLowerCase()}`);
    return res.data;
  }

  /**
   * 获取某地址的唯一青蛙（单钱包单青蛙）
   */
  async getMyFrog(address: string): Promise<Frog | null> {
    try {
      const res = await this.get(`/api/frogs/my/${address.toLowerCase()}`);
      return res.data;
    } catch (error) {
      if ((error as any).response?.status === 404) {
        return null;
      }
      throw error;
    }
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

  /**
   * 获取旅行历史（支持青蛙筛选）
   */
  async getTravelHistory(address: string, frogId?: number): Promise<any> {
    const params = new URLSearchParams({ address });
    if (frogId) {
      params.append('frogId', frogId.toString());
    }
    const res = await this.get(`/api/travels/history?${params}`);
    return res.data;
  }

  /**
   * 获取纪念品图片生成状态
   */
  async getSouvenirImageStatus(souvenirId: string) {
    const res = await this.get(`/api/nft-image/status/${souvenirId}`);
    return res;
  }

  /**
   * 获取徽章（支持青蛙筛选）
   */
  async getBadges(frogId?: number, ownerAddress?: string): Promise<any> {
    if (frogId) {
      const res = await this.get(`/api/badges/${frogId}`);
      return res.data;
    } else if (ownerAddress) {
      const res = await this.get(`/api/badges?ownerAddress=${ownerAddress}`);
      return res.data;
    }
    return [];
  }

  /**
   * 获取纪念品（支持青蛙筛选）
   */
  async getSouvenirs(frogId?: number, ownerAddress?: string): Promise<any> {
    if (frogId) {
      const res = await this.get(`/api/souvenirs/${frogId}`);
      return res.data;
    } else if (ownerAddress) {
      const res = await this.get(`/api/souvenirs?ownerAddress=${ownerAddress}`);
      return res.data;
    }
    return [];
  }

  async discoverLuckyAddress(chain: string) {
    const res = await this.get(`/api/travels/lucky-address?chain=${chain}`);
    return res.data;
  }

  /**
   * 开始随机探索
   */
  async startRandomTravel(
    frogId: number,
    targetChain: string,
    duration: number
  ): Promise<{ travelId: number; txHash: string }> {
    try {
      const response = await this.post('/api/travel/start', {
        frogId,
        travelType: 'RANDOM',
        targetChain,
        // 不传 targetAddress，后端会使用零地址
        duration,
      });

      if (!response.success) {
        throw new Error(response.data?.error?.message || 'Failed to start travel');
      }

      return response.data;
    } catch (error: any) {
      console.error('Failed to start random travel:', error);
      
      // 用户友好的错误消息
      if (error.message.includes('Invalid target')) {
        throw new Error('合约不支持随机探索，请联系管理员更新合约');
      }
      
      throw error;
    }
  }

  /**
   * 开始指定地址旅行
   */
  async startTargetedTravel(
    frogId: number,
    targetChain: string,
    targetAddress: string,
    duration: number
  ): Promise<{ travelId: number; txHash: string }> {
    // 验证地址格式
    if (!targetAddress || !/^0x[a-fA-F0-9]{40}$/.test(targetAddress)) {
      throw new Error('Invalid target address format');
    }

    const response = await this.post('/api/travel/start', {
      frogId,
      travelType: 'TARGETED',
      targetChain,
      targetAddress, // 明确指定地址
      duration,
    });

    if (!response.success) {
      throw new Error(response.data?.error?.message || 'Failed to start travel');
    }

    return response.data;
  }
}

export const apiService = new ApiService();
export const api = apiService;