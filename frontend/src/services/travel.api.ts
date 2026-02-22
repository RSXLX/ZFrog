// frontend/src/services/travel.api.ts
// V2.0 旅行系统 API 服务

import { apiService } from './api';

// 地址类型
export type AddressType = 'normal' | 'contract' | 'defi' | 'whale';

// 接口定义
export interface AddressAnalysisResult {
  type: AddressType;
  bonus: number;
  protocolName?: string;
}

export interface FeedResult {
  success: boolean;
  timeReduced?: number;
  newEndTime?: string;
  triggeredLuckyBuff?: boolean;
  error?: string;
}

export interface ShareCardData {
  title: string;
  message: string;
  discoveries: { addressShort: string; isGoldLabel: boolean; addressType?: string }[];
}

export interface RescueRequest {
  id: number;
  travelId: number;
  strandedFrog: { id: number; name: string; tokenId: number };
  travel: { id: number; chainId: number };
  status: string;
  requestedAt: string;
}

export interface RescueResult {
  success: boolean;
  xpEarned?: number;
  reputationEarned?: number;
  message?: string;
  error?: string;
}

export interface Discovery {
  id: number;
  address: string;
  chainId: number;
  isGoldLabel: boolean;
  addressType?: string;
  protocolName?: string;
  discoveredAt: string;
}

class TravelApi {
  /**
   * 分析地址类型
   */
  async analyzeAddress(address: string, chainId: number): Promise<AddressAnalysisResult> {
    const res = await apiService.get('/address/analyze', {
      params: { address, chainId },
    });
    return res.data;
  }

  /**
   * 投喂旅行中的青蛙
   */
  async feedTravel(travelId: number, feederId: number, feedType: string = 'energy'): Promise<FeedResult> {
    try {
      const res = await apiService.post(`/travels/${travelId}/feed`, {
        feederId,
        feedType,
      });
      return {
        success: true,
        timeReduced: res.data.timeReduced,
        newEndTime: res.data.newEndTime,
        triggeredLuckyBuff: res.data.triggeredLuckyBuff,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '投喂失败',
      };
    }
  }

  /**
   * 获取投喂历史
   */
  async getFeedHistory(travelId: number): Promise<any[]> {
    const res = await apiService.get(`/travels/${travelId}/feeds`);
    return res.data || [];
  }

  /**
   * 生成分享卡片
   */
  async getShareCard(travelId: number): Promise<ShareCardData> {
    const res = await apiService.get(`/travels/${travelId}/share`);
    return res.data;
  }

  /**
   * 获取青蛙零食偏好
   */
  async getFrogPreference(frogId: number, chainKey?: string): Promise<{ preference: string | null; allSnacks: any[] }> {
    const params: any = {};
    if (chainKey) params.chainKey = chainKey;
    const res = await apiService.get(`/travels/frog/${frogId}/preference`, { params });
    return res.data;
  }

  /**
   * 获取青蛙发现记录
   */
  async getFrogDiscoveries(frogId: number): Promise<Discovery[]> {
    const res = await apiService.get(`/travels/frog/${frogId}/discoveries`);
    return res.data || [];
  }

  /**
   * 获取 Gold Label 排行榜
   */
  async getGoldLabelLeaderboard(limit: number = 10): Promise<any[]> {
    const res = await apiService.get('/travels/leaderboard/gold-label', { params: { limit } });
    return res.data || [];
  }

  // ============ 救援系统 API ============

  /**
   * 获取公共救援请求列表
   */
  async getPublicRescueRequests(limit: number = 20): Promise<RescueRequest[]> {
    const res = await apiService.get('/travels/rescue/public', { params: { limit } });
    return res.data || [];
  }

  /**
   * 获取好友待救援请求
   */
  async getFriendRescueRequests(frogId: number): Promise<RescueRequest[]> {
    const res = await apiService.get(`/travels/rescue/friends/${frogId}`);
    return res.data || [];
  }

  /**
   * 执行救援
   */
  async performRescue(requestId: number, rescuerId: number): Promise<RescueResult> {
    try {
      const res = await apiService.post(`/travels/rescue/${requestId}`, { rescuerId });
      return {
        success: true,
        xpEarned: res.data.xpEarned,
        reputationEarned: res.data.reputationEarned,
        message: res.message,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '救援失败',
      };
    }
  }

  // ============ 结伴旅行 API ============

  /**
   * 发起结伴旅行
   */
  async startGroupTravel(
    leaderId: number, 
    companionId: number, 
    duration: number = 3600
  ): Promise<{
    success: boolean;
    travelId?: number;
    groupTravelId?: number;
    message?: string;
    error?: string;
  }> {
    try {
      const res = await apiService.post('/travels/group', {
        leaderId,
        companionId,
        duration,
      });
      
      if (res.success && res.data) {
        return {
          success: true,
          travelId: res.data.travelId,
          groupTravelId: res.data.groupTravelId,
          message: res.message || '结伴旅行已开始',
        };
      }
      return {
        success: false,
        error: res.error || '发起结伴旅行失败',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || '发起结伴旅行失败',
      };
    }
  }

  /**
   * 获取结伴旅行详情
   */
  async getGroupTravelDetail(travelId: number): Promise<{
    success: boolean;
    data?: {
      id: number;
      leaderId: number;
      companionId: number;
      travelId: number;
      status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
      leader?: { id: number; name: string; tokenId: number };
      companion?: { id: number; name: string; tokenId: number };
    };
    error?: string;
  }> {
    try {
      const res = await apiService.get(`/travels/${travelId}/group`);
      return {
        success: res.success,
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '获取结伴旅行详情失败',
      };
    }
  }

  // ============ 跨链结伴旅行 API (V2.0) ============

  /**
   * 准备跨链结伴旅行 - 验证并返回费用估算
   */
  async prepareGroupCrossChainTravel(
    leaderTokenId: number,
    companionTokenId: number,
    targetChainId: number,
    duration: number
  ): Promise<{
    success: boolean;
    data?: {
      canStart: boolean;
      leaderStatus: string;
      companionStatus: string;
      isFriend: boolean;
      estimatedProvisions: string;
      estimatedProvisionsZeta: string;
      targetChain: string;
    };
    error?: string;
  }> {
    try {
      const res = await apiService.post('/group-travel/prepare', {
        leaderTokenId,
        companionTokenId,
        targetChainId,
        duration,
      });
      return res;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || '准备失败',
      };
    }
  }

  /**
   * 确认跨链结伴旅行 - 链上交易成功后创建数据库记录
   */
  async confirmGroupCrossChainTravel(params: {
    txHash: string;
    leaderTokenId: number;
    companionTokenId: number;
    targetChainId: number;
    duration: number;
    crossChainMessageId: string;
    provisionsUsed: string;
  }): Promise<{
    success: boolean;
    data?: {
      travelId: number;
      groupTravelId: number;
    };
    error?: string;
  }> {
    try {
      const res = await apiService.post('/group-travel/confirm', params);
      return res;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || '确认失败',
      };
    }
  }
}

export const travelApi = new TravelApi();
export default travelApi;
