import { apiClient } from '../../lib/api/client';
import { buildSessionAuthHeaders } from '../../lib/auth/session';
import type {
  LifeActionPayload,
  LifeBlessPayload,
  LifeBlessResult,
  LifeFeedPayload,
  LifeFeedResult,
  LifeHibernationReadModel,
  LifePlayPayload,
  LifePlayResult,
  LifeReadModel,
  LifeHibernationStatus,
  LifeRestEndResult,
  LifeRestStartResult,
  LifeRevivalCostInfo,
  LifeReviveResult,
  LifeStateResult,
} from '../../lib/api/contracts';
import { createHttpClient, createLifeResourceClient } from '../../../../packages/client-sdk/src';

interface LegacyApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  [key: string]: any;
}

interface LegacyHibernationResponse {
  status?: LifeHibernationStatus | string | null;
  hibernationStatus?: LifeHibernationStatus | string | null;
  isDormant?: boolean;
  mood?: string;
  hibernatedAt?: string | null;
  blessingsReceived?: number;
  revivalCost?: LifeRevivalCostInfo;
}

const normalizeHibernationStatus = (
  value?: LifeHibernationStatus | string | null
): LifeHibernationStatus => {
  switch ((value || '').toString().toUpperCase()) {
    case 'DROWSY':
      return 'DROWSY';
    case 'SLEEPING':
      return 'SLEEPING';
    case 'ACTIVE':
    default:
      return 'ACTIVE';
  }
};

type GameType = 'guess' | 'catch_bug' | 'lily_pad' | 'memory';

export interface LegacyFrogInteractionStatus {
  tokenId: number;
  name: string;
  hunger: number;
  happiness: number;
  lastFedAt: string | null;
  lastInteractedAt: string | null;
}

export interface LegacyFrogInventoryReadModel {
  tokenId: number;
  inventory: Record<string, number>;
  foodTypes: Record<string, unknown>;
}

export interface LegacyFrogFeedResult {
  hunger: number;
  happiness: number;
  lastFedAt: string;
  foodUsed: {
    type: string;
    name: string;
    energyGiven: number;
    happinessGiven: number;
  };
}

export interface LegacyFrogInteractResult {
  happiness: number;
  lastInteractedAt: string;
  interactionType: string;
  happinessGiven: number;
}

class LifeFeatureApi {
  private readonly lifeClient = createLifeResourceClient(
    createHttpClient({
      baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
      getAuthHeaders: () => buildSessionAuthHeaders(),
      retries: 0,
    })
  );

  async getLife(frogId: number | string): Promise<LifeReadModel> {
    return this.lifeClient.getLife<LifeReadModel>(frogId);
  }

  async feed(frogId: number | string, payload: LifeFeedPayload): Promise<LifeFeedResult> {
    return apiClient.postData<LifeFeedResult>(`/v1/frogs/${frogId}/care/feed`, payload);
  }

  async clean(frogId: number | string, payload?: LifeActionPayload): Promise<LifeStateResult> {
    return apiClient.postData<LifeStateResult>(`/v1/frogs/${frogId}/care/clean`, payload || {});
  }

  async play(frogId: number | string, payload?: LifePlayPayload): Promise<LifePlayResult> {
    return apiClient.postData<LifePlayResult>(`/v1/frogs/${frogId}/care/play`, payload || {});
  }

  async heal(frogId: number | string, payload?: LifeActionPayload): Promise<LifeStateResult> {
    return apiClient.postData<LifeStateResult>(`/v1/frogs/${frogId}/care/heal`, payload || {});
  }

  async startRest(
    frogId: number | string,
    payload?: LifeActionPayload
  ): Promise<LifeRestStartResult> {
    return apiClient.postData<LifeRestStartResult>(`/v1/frogs/${frogId}/care/rest/start`, payload || {});
  }

  async endRest(frogId: number | string, payload?: LifeActionPayload): Promise<LifeRestEndResult> {
    return apiClient.postData<LifeRestEndResult>(`/v1/frogs/${frogId}/care/rest/end`, payload || {});
  }

  async getHibernation(frogId: number | string): Promise<LifeHibernationReadModel> {
    return this.lifeClient.getHibernation<LifeHibernationReadModel>(frogId);
  }

  async getRevivalCost(frogId: number | string): Promise<LifeRevivalCostInfo> {
    return this.lifeClient.getRevivalCost<LifeRevivalCostInfo>(frogId);
  }

  async revive(frogId: number | string, payload?: LifeActionPayload): Promise<LifeReviveResult> {
    return apiClient.postData<LifeReviveResult>(`/v1/frogs/${frogId}/hibernation/revive`, payload || {});
  }

  async bless(frogId: number | string, payload: LifeBlessPayload): Promise<LifeBlessResult> {
    return apiClient.postData<LifeBlessResult>(`/v1/frogs/${frogId}/hibernation/bless`, payload);
  }

  async getLegacyNurtureStatus(frogId: number | string): Promise<LegacyApiResponse> {
    return apiClient.get<LegacyApiResponse>(`/nurture/${frogId}/status`);
  }

  async getLegacyLilyBalance(ownerAddress: string): Promise<LegacyApiResponse> {
    return apiClient.get<LegacyApiResponse>(`/nurture/balance/${ownerAddress}`);
  }

  async feedLegacyNurture(
    frogId: number | string,
    payload: { foodType: 'BREAD' | 'BUG_BENTO' | 'CAKE' }
  ): Promise<LegacyApiResponse> {
    return apiClient.post<LegacyApiResponse>(`/nurture/${frogId}/feed`, payload);
  }

  async cleanLegacyNurture(frogId: number | string): Promise<LegacyApiResponse> {
    return apiClient.post<LegacyApiResponse>(`/nurture/${frogId}/clean`);
  }

  async playGuessLegacy(
    frogId: number | string,
    payload: { guess: 'left' | 'right' }
  ): Promise<LegacyApiResponse> {
    return apiClient.post<LegacyApiResponse>(`/nurture/${frogId}/play/guess`, payload);
  }

  async healLegacyNurture(frogId: number | string): Promise<LegacyApiResponse> {
    return apiClient.post<LegacyApiResponse>(`/nurture/${frogId}/heal`);
  }

  async checkTravelRequirementsLegacy(frogId: number | string): Promise<LegacyApiResponse> {
    return apiClient.get<LegacyApiResponse>(`/nurture/${frogId}/travel-check`);
  }

  async evolveLegacyNurture(
    frogId: number | string,
    payload: { evolutionType: 'explorer' | 'scholar' | 'social' }
  ): Promise<LegacyApiResponse> {
    return apiClient.post<LegacyApiResponse>(`/nurture/${frogId}/evolve`, payload);
  }

  async getLegacyTransactions(ownerAddress: string, limit = 20): Promise<LegacyApiResponse> {
    return apiClient.get<LegacyApiResponse>(`/nurture/transactions/${ownerAddress}`, {
      params: { limit },
    });
  }

  async getLegacyGameRemaining(
    frogId: number | string,
    game: GameType
  ): Promise<LegacyApiResponse & { remaining?: number }> {
    return apiClient.get<LegacyApiResponse & { remaining?: number }>(`/nurture/${frogId}/game-remaining`, {
      params: { game },
    });
  }

  async playLilyPadLegacy(
    frogId: number | string,
    payload: { score: number }
  ): Promise<LegacyApiResponse> {
    return apiClient.post<LegacyApiResponse>(`/nurture/${frogId}/play/lily-pad`, payload);
  }

  async playMemoryLegacy(
    frogId: number | string,
    payload: { score: number; moves: number; time: number }
  ): Promise<LegacyApiResponse> {
    return apiClient.post<LegacyApiResponse>(`/nurture/${frogId}/play/memory`, payload);
  }

  async playCatchBugLegacy(
    frogId: number | string,
    payload: { score: number }
  ): Promise<LegacyApiResponse> {
    return apiClient.post<LegacyApiResponse>(`/nurture/${frogId}/play/catch-bug`, payload);
  }

  async getLegacyRestStatus(frogId: number | string): Promise<LegacyApiResponse> {
    return apiClient.get<LegacyApiResponse>(`/nurture/${frogId}/rest-status`);
  }

  async startLegacyRest(frogId: number | string): Promise<LegacyApiResponse> {
    return apiClient.post<LegacyApiResponse>(`/nurture/${frogId}/rest/start`);
  }

  async endLegacyRest(frogId: number | string): Promise<LegacyApiResponse> {
    return apiClient.post<LegacyApiResponse>(`/nurture/${frogId}/rest/end`);
  }

  async getLegacyHibernationStatus(
    frogId: number | string
  ): Promise<{
    status: 'ACTIVE' | 'DROWSY' | 'SLEEPING';
    isDormant: boolean;
    mood: string;
    hibernatedAt?: string | null;
    blessingsReceived?: number;
    revivalCost?: LifeRevivalCostInfo;
  }> {
    const data = await apiClient.getData<LegacyHibernationResponse>(`/frog/${frogId}/hibernation`);

    return {
      status: normalizeHibernationStatus(data.status || data.hibernationStatus),
      isDormant: Boolean(data.isDormant),
      mood: data.mood || '',
      hibernatedAt: data.hibernatedAt ?? null,
      blessingsReceived: data.blessingsReceived ?? 0,
      revivalCost: data.revivalCost,
    };
  }

  async getLegacyRevivalCost(frogId: number | string): Promise<LifeRevivalCostInfo> {
    return apiClient.getData<LifeRevivalCostInfo>(`/frog/${frogId}/hibernation/revival-cost`);
  }

  async reviveLegacy(frogId: number | string): Promise<LifeReviveResult> {
    return apiClient.post(`/frog/${frogId}/hibernation/revive`);
  }

  async blessLegacy(
    frogId: number | string,
    payload: { blesserFrogId: number; verificationId?: string }
  ): Promise<LifeBlessResult> {
    return apiClient.post(`/frog/${frogId}/hibernation/bless`, payload);
  }

  async getLegacyInteractionStatus(
    frogId: number | string
  ): Promise<LegacyFrogInteractionStatus> {
    return apiClient.getData<LegacyFrogInteractionStatus>(`/frogs/${frogId}/status`);
  }

  async getLegacyInteractionInventory(
    frogId: number | string
  ): Promise<LegacyFrogInventoryReadModel> {
    return apiClient.getData<LegacyFrogInventoryReadModel>(`/frogs/${frogId}/inventory`);
  }

  async feedLegacyInteraction(
    frogId: number | string,
    payload: { foodType: string; ownerAddress: string }
  ): Promise<LegacyFrogFeedResult> {
    return apiClient.postData<LegacyFrogFeedResult>(`/frogs/${frogId}/feed`, payload);
  }

  async interactLegacyInteraction(
    frogId: number | string,
    payload: { interactionType: 'pet' | 'play' | 'talk'; ownerAddress: string }
  ): Promise<LegacyFrogInteractResult> {
    return apiClient.postData<LegacyFrogInteractResult>(`/frogs/${frogId}/interact`, payload);
  }
}

export const lifeFeatureApi = new LifeFeatureApi();
