import { apiClient } from '../../lib/api/client';
import { buildSessionAuthHeaders } from '../../lib/auth/session';
import type {
  LegacyTravelHistoryReadModel,
  LegacyTravelJournalReadModel,
  LegacyTravelP0ReadModel,
  LegacyTravelStatsReadModel,
  SouvenirImageStatusResponse,
  TravelV1ReadModel,
} from '../../lib/api/contracts';
import { ApiClientError } from '../../lib/api/errors';
import { createHttpClient, createTravelResourceClient } from '../../../../packages/client-sdk/src';

interface HistoryQuery {
  address: string;
  limit?: number;
  offset?: number;
  frogId?: string;
}

type TravelExplorationCategory = 'all' | 'contract' | 'wallet';

interface TravelExplorationQuery {
  category?: TravelExplorationCategory;
  offset?: number;
  limit?: number;
}

interface GroupTravelStartPayload {
  leaderId: number;
  companionId: number;
  duration?: number;
  targetChain?: number | string;
}

interface GroupTravelStartResponse {
  success: boolean;
  data?: {
    travelId: number;
    groupTravelId: number;
    leader: {
      id: number;
      name: string;
      tokenId: number;
    };
    companion: {
      id: number;
      name: string;
      tokenId: number;
    };
  };
  message?: string;
  error?: string;
}

interface TravelStartResult {
  travelId: number;
  txHash: string;
}

type TravelAddressType = 'normal' | 'contract' | 'defi' | 'whale';

interface TravelAddressAnalysisReadModel {
  type: TravelAddressType;
  bonus: number;
  protocolName?: string;
  name?: string;
  protocolType?: string;
  address?: string;
  chainId?: number;
}

interface TravelFeedResult {
  success: boolean;
  timeReduced?: number;
  newEndTime?: string;
  triggeredLuckyBuff?: boolean;
  error?: string;
}

interface TravelRescueRequestReadModel {
  id: number;
  travelId: number;
  strandedFrog: { id: number; name: string; tokenId: number };
  travel: { id: number; chainId: number };
  status: string;
  requestedAt: string;
}

interface TravelRescueResult {
  success: boolean;
  xpEarned?: number;
  reputationEarned?: number;
  message?: string;
  error?: string;
}

interface GroupTravelConfirmPayload {
  txHash: string;
  leaderTokenId: number;
  companionTokenId: number;
  targetChainId: number;
  duration: number;
  crossChainMessageId: string;
  provisionsUsed: string;
}

interface GroupTravelConfirmResult {
  success: boolean;
  data?: {
    travelId: number;
    groupTravelId: number;
  };
  message?: string;
  error?: string;
}

interface CrossChainDiscoveryReadModel {
  id: number;
  type: string;
  title: string;
  description: string;
  rarity: number | string;
  blockNumber: string | number | null;
  createdAt: string;
}

interface CrossChainOnChainStatsReadModel {
  exploredBlock: number | null;
  gasUsed: string | null;
  targetChain: string;
  exploredAddress: string;
}

interface CrossChainDiscoverySummaryReadModel {
  total: number;
  byType: Record<string, number>;
  byRarity: Record<string, number>;
}

interface CrossChainDiscoveriesReadModel {
  discoveries: CrossChainDiscoveryReadModel[];
  onChainStats: CrossChainOnChainStatsReadModel;
  summary: CrossChainDiscoverySummaryReadModel;
}

interface TravelJournalEnvelope {
  success: boolean;
  data?: LegacyTravelJournalReadModel & Record<string, unknown>;
  message?: string;
  error?: string;
}

interface TravelInteractionReadModel {
  id?: number;
  travelId: number;
  message: string;
  exploredAddress: string;
  blockNumber: string;
  timestamp: string;
  isContract?: boolean;
}

interface TravelTrajectoryPointReadModel {
  id?: number;
  chainId: number;
  address: string;
  message: string;
  timestamp: string;
  type: 'start' | 'explore' | 'end';
  isContract?: boolean;
}

interface TravelExplorationReadModel {
  id: number;
  chainId: number;
  chainName?: string;
  chainSymbol?: string;
  blockNumber: string;
  blockUrl?: string | null;
  message: string;
  aiAnalysis?: string;
  exploredAddress: string | null;
  exploredUrl?: string | null;
  isContract: boolean;
  txHash: string | null;
  txUrl?: string | null;
  timestamp: string;
  source?: 'discovery' | 'interaction';
}

interface TravelExplorationSummaryReadModel {
  totalAll: number;
  totalContracts: number;
  totalWallets: number;
  filtered: number;
  uniqueAddresses: number;
}

interface TravelExplorationPageReadModel {
  summary: TravelExplorationSummaryReadModel;
  explorations: TravelExplorationReadModel[];
  pagination?: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  hasMore?: boolean;
}

class TravelFeatureApi {
  private readonly travelClient = createTravelResourceClient(
    createHttpClient({
      baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
      getAuthHeaders: () => buildSessionAuthHeaders(),
      retries: 0,
    })
  );

  async getById(travelId: number | string): Promise<TravelV1ReadModel> {
    return this.travelClient.getById<TravelV1ReadModel>(travelId);
  }

  async getFrogTravels(frogId: number | string): Promise<any[]> {
    const response = await apiClient.get<{ success: boolean; data?: any[] }>(`/travels/${frogId}`);

    if (!response?.success || !Array.isArray(response.data)) {
      return [];
    }

    return response.data;
  }

  async getHistory(query: HistoryQuery): Promise<LegacyTravelHistoryReadModel> {
    const response = await this.travelClient.getHistory<LegacyTravelHistoryReadModel>(query);

    return response || { travels: [], total: 0 };
  }

  async startRandomTravel(
    frogId: number | string,
    targetChain: string,
    duration: number
  ): Promise<TravelStartResult> {
    const response = await apiClient.post<{
      success: boolean;
      data?: TravelStartResult;
      error?: string;
      message?: string;
    }>('/travel/start', {
      frogId,
      travelType: 'RANDOM',
      targetChain,
      duration,
    });

    if (!response?.success || !response.data) {
      throw new Error(response?.error || response?.message || 'Failed to start travel');
    }

    return response.data;
  }

  async startTargetedTravel(
    frogId: number | string,
    targetChain: string,
    targetAddress: string,
    duration: number
  ): Promise<TravelStartResult> {
    if (!targetAddress || !/^0x[a-fA-F0-9]{40}$/.test(targetAddress)) {
      throw new Error('Invalid target address format');
    }

    const response = await apiClient.post<{
      success: boolean;
      data?: TravelStartResult;
      error?: string;
      message?: string;
    }>('/travel/start', {
      frogId,
      travelType: 'TARGETED',
      targetChain,
      targetAddress,
      duration,
    });

    if (!response?.success || !response.data) {
      throw new Error(response?.error || response?.message || 'Failed to start travel');
    }

    return response.data;
  }

  async getStats(address: string, frogId?: string): Promise<LegacyTravelStatsReadModel | null> {
    try {
      const response = await apiClient.getData<LegacyTravelStatsReadModel | null>('/travels/stats', {
        params: {
          address,
          ...(frogId && frogId !== 'all' ? { frogId } : {}),
        },
      });

      return response || null;
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getSouvenirImageStatus(souvenirId: string | number): Promise<SouvenirImageStatusResponse> {
    return apiClient.get<SouvenirImageStatusResponse>(`/nft-image/status/${souvenirId}`);
  }

  async getP0Detail(travelId: number | string): Promise<LegacyTravelP0ReadModel> {
    return apiClient.getData<LegacyTravelP0ReadModel>(`/travels/p0/${travelId}`);
  }

  async getJournal(travelId: number | string): Promise<LegacyTravelJournalReadModel> {
    return apiClient.getData<LegacyTravelJournalReadModel>(`/travels/journal/${travelId}`);
  }

  async getJournalEnvelope(travelId: number | string): Promise<TravelJournalEnvelope> {
    return apiClient.get<TravelJournalEnvelope>(`/travels/journal/${travelId}`);
  }

  async getCrossChainDiscoveries(travelId: number | string): Promise<CrossChainDiscoveriesReadModel> {
    const response = await apiClient.get<{
      success: boolean;
      data?: CrossChainDiscoveriesReadModel;
    }>(`/cross-chain/travel/${travelId}/discoveries`);

    if (response?.success && response.data) {
      return response.data;
    }

    return {
      discoveries: [],
      onChainStats: {
        exploredBlock: null,
        gasUsed: null,
        targetChain: '',
        exploredAddress: '',
      },
      summary: {
        total: 0,
        byType: {},
        byRarity: {},
      },
    };
  }

  async analyzeAddress(
    address: string,
    chainId: number | string
  ): Promise<TravelAddressAnalysisReadModel> {
    return apiClient.getData<TravelAddressAnalysisReadModel>('/address/analyze', {
      params: {
        address,
        chainId,
      },
    });
  }

  async feedTravel(
    travelId: number | string,
    feederId: number | string,
    feedType = 'energy'
  ): Promise<TravelFeedResult> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data?: {
          timeReduced?: number;
          newEndTime?: string;
          triggeredLuckyBuff?: boolean;
        };
        message?: string;
        error?: string;
      }>(`/travels/${travelId}/feed`, {
        feederId,
        feedType,
      });

      if (response?.success) {
        return {
          success: true,
          timeReduced: response.data?.timeReduced,
          newEndTime: response.data?.newEndTime,
          triggeredLuckyBuff: response.data?.triggeredLuckyBuff,
        };
      }

      return {
        success: false,
        error: response?.error || response?.message || '投喂失败',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || '投喂失败',
      };
    }
  }

  async getFeedHistory(travelId: number | string): Promise<any[]> {
    const response = await apiClient.get<{
      success: boolean;
      data?: any[];
    }>(`/travels/${travelId}/feeds`);

    if (!response?.success || !Array.isArray(response.data)) {
      return [];
    }

    return response.data;
  }

  async getPublicRescueRequests(limit = 20): Promise<TravelRescueRequestReadModel[]> {
    const response = await apiClient.get<{
      success: boolean;
      data?: TravelRescueRequestReadModel[];
    }>('/travels/rescue/public', {
      params: {
        limit,
      },
    });

    if (!response?.success || !Array.isArray(response.data)) {
      return [];
    }

    return response.data;
  }

  async getFriendRescueRequests(frogId: number | string): Promise<TravelRescueRequestReadModel[]> {
    const response = await apiClient.get<{
      success: boolean;
      data?: TravelRescueRequestReadModel[];
    }>(`/travels/rescue/friends/${frogId}`);

    if (!response?.success || !Array.isArray(response.data)) {
      return [];
    }

    return response.data;
  }

  async performRescue(
    requestId: number | string,
    rescuerId: number | string
  ): Promise<TravelRescueResult> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data?: {
          xpEarned?: number;
          reputationEarned?: number;
        };
        message?: string;
        error?: string;
      }>(`/travels/rescue/${requestId}`, { rescuerId });

      if (response?.success) {
        return {
          success: true,
          xpEarned: response.data?.xpEarned,
          reputationEarned: response.data?.reputationEarned,
          message: response.message,
        };
      }

      return {
        success: false,
        error: response?.error || response?.message || '救援失败',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || '救援失败',
      };
    }
  }

  async rescueTravelV1(
    travelId: number | string,
    rescuerFrogId: number | string,
    verificationId: string
  ): Promise<TravelRescueResult> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data?: {
          success?: boolean;
          message?: string;
          xpEarned?: number;
          reputationEarned?: number;
        };
        message?: string;
        error?: string;
      }>(`/v1/travels/${travelId}/rescue`, {
        rescuerFrogId,
        verificationId,
      });

      if (response?.success && response.data?.success) {
        return {
          success: true,
          xpEarned: response.data?.xpEarned,
          reputationEarned: response.data?.reputationEarned,
          message: response.data?.message || response.message,
        };
      }

      return {
        success: false,
        error: response?.error || response?.message || response.data?.message || '救援失败',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || '救援失败',
      };
    }
  }

  async confirmGroupCrossChainTravel(payload: GroupTravelConfirmPayload): Promise<GroupTravelConfirmResult> {
    try {
      const response = await apiClient.post<GroupTravelConfirmResult>('/group-travel/confirm', payload);
      if (response?.success) {
        return response;
      }
      return {
        success: false,
        error: response?.error || response?.message || '确认失败',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || '确认失败',
      };
    }
  }

  async getInteractions(travelId: number | string): Promise<TravelInteractionReadModel[]> {
    const response = await apiClient.get<{
      success: boolean;
      data?: TravelInteractionReadModel[];
    }>(`/travels/${travelId}/interactions`);

    if (!response?.success || !Array.isArray(response.data)) {
      return [];
    }

    return response.data;
  }

  async getTrajectory(travelId: number | string): Promise<TravelTrajectoryPointReadModel[]> {
    const response = await apiClient.get<{
      success: boolean;
      points?: TravelTrajectoryPointReadModel[];
    }>(`/travels/${travelId}/trajectory`);

    if (!response?.success || !Array.isArray(response.points)) {
      return [];
    }

    return response.points;
  }

  async getExplorations(
    travelId: number | string,
    query: TravelExplorationQuery = {}
  ): Promise<TravelExplorationPageReadModel> {
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 20;
    const response = await apiClient.get<{
      success: boolean;
      data?: TravelExplorationPageReadModel;
    }>(`/travels/${travelId}/explorations`, {
      params: {
        category: query.category ?? 'all',
        offset,
        limit,
      },
    });

    if (response?.success && response.data) {
      return response.data;
    }

    return {
      summary: {
        totalAll: 0,
        totalContracts: 0,
        totalWallets: 0,
        filtered: 0,
        uniqueAddresses: 0,
      },
      explorations: [],
      pagination: {
        offset,
        limit,
        total: 0,
        hasMore: false,
      },
      hasMore: false,
    };
  }

  async getActiveByTokenId(tokenId: number | string): Promise<any | null> {
    const response = await apiClient.get<{
      success: boolean;
      data?: any | null;
    }>(`/travels/${tokenId}/active`);

    if (!response?.success) {
      return null;
    }

    return response?.data || null;
  }

  async startGroupTravel(payload: GroupTravelStartPayload): Promise<GroupTravelStartResponse> {
    return apiClient.post<GroupTravelStartResponse>('/travels/group', payload);
  }
}

export const travelFeatureApi = new TravelFeatureApi();
export type {
  CrossChainDiscoveriesReadModel,
  CrossChainDiscoveryReadModel,
  CrossChainDiscoverySummaryReadModel,
  CrossChainOnChainStatsReadModel,
  GroupTravelConfirmPayload,
  GroupTravelConfirmResult,
  LegacyTravelHistoryReadModel,
  LegacyTravelJournalReadModel,
  LegacyTravelP0ReadModel,
  LegacyTravelStatsReadModel,
  TravelAddressAnalysisReadModel,
  TravelAddressType,
  TravelExplorationCategory,
  TravelExplorationPageReadModel,
  TravelExplorationQuery,
  TravelExplorationReadModel,
  TravelExplorationSummaryReadModel,
  TravelFeedResult,
  TravelInteractionReadModel,
  TravelJournalEnvelope,
  TravelRescueRequestReadModel,
  TravelRescueResult,
  TravelTrajectoryPointReadModel,
  TravelV1ReadModel,
};
