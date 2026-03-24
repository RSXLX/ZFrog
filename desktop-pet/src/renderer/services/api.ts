// API Service for ZetaFrog Desktop Pet
import {
  createCouncilResourceClient,
  createHttpClient,
  createLifeResourceClient,
  createTravelResourceClient,
} from '../../../../packages/client-sdk/src';
import storage from './storage';

const FALLBACK_API_BASE = 'http://localhost:3001/api';

const getApiBase = () => {
  try {
    return storage.getSettings().apiUrl || FALLBACK_API_BASE;
  } catch {
    return FALLBACK_API_BASE;
  }
};

const hasAuthToken = (): boolean => Boolean(storage.getAuthToken());

const readStringValue = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const getDesktopCouncilIntegrationApiKey = (): string | null => {
  const fromWindow =
    typeof window !== 'undefined'
      ? (window as unknown as { __ZFROG_V3_INTEGRATION_API_KEY__?: unknown })
          .__ZFROG_V3_INTEGRATION_API_KEY__
      : undefined;
  const parsedWindow = readStringValue(fromWindow);
  if (parsedWindow) {
    return parsedWindow;
  }

  const fromProcess =
    typeof process !== 'undefined' && process.env
      ? process.env.VITE_V3_COUNCIL_INTEGRATION_API_KEY || process.env.VITE_V3_INTEGRATION_API_KEY
      : undefined;
  return readStringValue(fromProcess);
};

const createDesktopHttpClient = () =>
  createHttpClient({
    // Desktop settings currently store a value like http://localhost:3001/api,
    // so we disable apiPrefix and keep endpoint paths unchanged.
    baseUrl: getApiBase(),
    apiPrefix: '',
    retries: 0,
    getAuthHeaders: () => {
      const headers: Record<string, string> = {};
      const token = storage.getAuthToken();
      const walletAddress = storage.getWalletAddress();

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      if (walletAddress) {
        headers['x-wallet-address'] = walletAddress.toLowerCase();
      }

      return headers;
    },
  });

const createDesktopLifeClient = () => createLifeResourceClient(createDesktopHttpClient());
const createDesktopTravelClient = () => createTravelResourceClient(createDesktopHttpClient());
const createDesktopCouncilClient = () => {
  const integrationApiKey = getDesktopCouncilIntegrationApiKey();
  if (!integrationApiKey) {
    return null;
  }

  return createCouncilResourceClient(
    createHttpClient({
      baseUrl: getApiBase(),
      apiPrefix: '',
      retries: 0,
      getAuthHeaders: () => {
        const headers: Record<string, string> = {};
        const token = storage.getAuthToken();
        const walletAddress = storage.getWalletAddress();

        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        if (walletAddress) {
          headers['x-wallet-address'] = walletAddress.toLowerCase();
        }
        headers['x-api-key'] = integrationApiKey;
        return headers;
      },
    })
  );
};

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  message?: string;
}

type RequestAuthMode = 'none' | 'optional' | 'required';

interface RequestOptions extends RequestInit {
  auth?: RequestAuthMode;
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

export interface AuthMeResponse {
  walletAddress: string;
  world: {
    verifiedActions: string[];
  };
  frogTokenId: number | null;
}

export interface AuthNonceResponse {
  nonce: string;
  message: string;
  expiresAt: string;
}

export interface WalletLoginResponse {
  token: string;
  walletAddress: string;
  frogTokenId: number | null;
  hasFrog: boolean;
}

export interface LifeReadModel {
  hunger: number;
  happiness: number;
  cleanliness: number;
  health: number;
  energy: number;
  mood: string;
  isSick: boolean;
  needsClean: boolean;
  isDormant: boolean;
  hibernationStatus: 'ACTIVE' | 'DROWSY' | 'SLEEPING';
  lifeStage: string;
}

export interface TravelReadModelV1 {
  id?: number;
  travelId: number;
  frogId: number;
  status: string;
  progress: number;
  targetWallet: string;
  targetChain: string;
  chainId: number;
  duration: number;
  startTime: string;
  endTime: string;
  completedAt: string | null;
}

export interface StartTravelPayloadV1 {
  frogId: number;
  travelType?: 'random' | 'specific' | 'cross_chain';
  targetChain?: string | number;
  targetAddress?: string;
  duration?: number;
  source?: string;
}

export interface StartTravelResultV1 {
  travelId: number;
  status: string;
  currentStage?: string;
  progress?: number;
  startedAt?: string;
  endTime?: string;
}

export interface NotificationFeedItem {
  id: number;
  type: string;
  title: string;
  message: string;
  metadata?: unknown;
  isRead: boolean;
  createdAt: string;
}

export interface CouncilBriefReadModel {
  id: string;
  generatedAt: string;
  summary: string;
  metrics: {
    total: number;
    open: number;
    accepted: number;
    rejected: number;
    deferred: number;
    resolved: number;
  };
  delivery: {
    channel: 'desktop' | 'mobile_lite';
    status: 'DELIVERED' | 'THROTTLED' | 'DISABLED';
    shouldNotify: boolean;
    notificationsEnabled: boolean;
    throttleMs: number;
    lastDeliveredAt: string | null;
    nextAllowedAt: string | null;
  };
}

export interface CouncilBriefPreferencesReadModel {
  enabled: boolean;
  throttleMs: number;
  channels: {
    desktop: boolean;
    mobileLite: boolean;
  };
  updatedAt: string;
  updatedByActor: string;
  requestId: string | null;
}

export interface UpdateCouncilBriefPreferencesPayload {
  enabled?: boolean;
  throttleMs?: number;
  channels?: {
    desktop?: boolean;
    mobileLite?: boolean;
  };
}

export interface V2ChatTraceMeta {
  traceId: string;
  domainEventId: string;
  promptKitVersion: string;
  systemPromptVersion: string;
  responsePromptVersion: string;
  memoryTraceVersion: string;
  memorySummaryType: string;
  memorySummaryId: number | null;
  recordedAt: string;
}

export interface V2ChatMessageResponse {
  sessionId: number;
  reply: {
    content: string;
    intent: string;
    data?: unknown;
  };
  frogMood: string;
  trace: V2ChatTraceMeta;
}

const getAuthHeaders = (auth: RequestAuthMode = 'optional'): Record<string, string> => {
  const token = storage.getAuthToken();
  const walletAddress = storage.getWalletAddress();
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // 旧路由兼容 header
  if (walletAddress) {
    headers['x-wallet-address'] = walletAddress.toLowerCase();
  }

  if (auth === 'required' && !token) {
    headers['x-auth-missing'] = 'true';
  }

  return headers;
};

async function request<T>(endpoint: string, init?: RequestOptions): Promise<ApiResponse<T>> {
  const authMode = init?.auth || 'optional';
  const token = storage.getAuthToken();
  if (authMode === 'required' && !token) {
    return {
      success: false,
      error: 'AUTH_REQUIRED',
      details: 'Missing desktop auth token for /api/v1 request',
    };
  }

  const { auth: _auth, ...fetchInit } = init || {};
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const response = await fetch(`${getApiBase()}${normalizedEndpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(authMode),
      ...(fetchInit.headers || {}),
    },
    ...fetchInit,
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

  async getAuthMe(): Promise<AuthMeResponse | null> {
    try {
      const response = await request<AuthMeResponse>('/v1/auth/me', {
        method: 'GET',
        auth: 'required',
      });

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('[API] Get auth me error:', error);
      return null;
    }
  },

  async issueAuthNonce(walletAddress: string): Promise<AuthNonceResponse | null> {
    try {
      const response = await request<AuthNonceResponse>('/v1/auth/nonce', {
        method: 'POST',
        auth: 'none',
        body: JSON.stringify({ walletAddress: walletAddress.toLowerCase() }),
      });
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('[API] Issue auth nonce error:', error);
      return null;
    }
  },

  async loginWithWalletSignature(input: {
    walletAddress: string;
    signature: string;
    chainId?: number;
  }): Promise<WalletLoginResponse | null> {
    try {
      const response = await request<WalletLoginResponse>('/v1/auth/wallet', {
        method: 'POST',
        auth: 'none',
        body: JSON.stringify({
          walletAddress: input.walletAddress.toLowerCase(),
          signature: input.signature,
          chainId: input.chainId,
        }),
      });
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('[API] Wallet login error:', error);
      return null;
    }
  },

  async getLife(frogId: number): Promise<LifeReadModel | null> {
    if (!hasAuthToken()) {
      return null;
    }
    try {
      const lifeClient = createDesktopLifeClient();
      const life = await lifeClient.getLife<LifeReadModel>(frogId);
      return life ?? null;
    } catch (error) {
      console.error('[API] Get life error (sdk):', error);
      return null;
    }
  },

  async feedLife(
    frogId: number,
    payload: { foodType: string; quantity?: number; source?: string }
  ): Promise<boolean> {
    if (!hasAuthToken()) {
      return false;
    }
    try {
      const lifeClient = createDesktopLifeClient();
      await lifeClient.feed(frogId, payload);
      return true;
    } catch (error) {
      console.error('[API] Feed life error (sdk):', error);
      return false;
    }
  },

  async playLife(
    frogId: number,
    payload: { gameType?: string; score?: number; source?: string } = {}
  ): Promise<boolean> {
    if (!hasAuthToken()) {
      return false;
    }
    try {
      const lifeClient = createDesktopLifeClient();
      await lifeClient.play(frogId, payload);
      return true;
    } catch (error) {
      console.error('[API] Play life error (sdk):', error);
      return false;
    }
  },

  async cleanLife(frogId: number, source = 'desktop_life_actions'): Promise<boolean> {
    if (!hasAuthToken()) {
      return false;
    }
    try {
      const lifeClient = createDesktopLifeClient();
      await lifeClient.clean(frogId, { source });
      return true;
    } catch (error) {
      console.error('[API] Clean life error (sdk):', error);
      return false;
    }
  },

  async healLife(frogId: number, source = 'desktop_life_actions'): Promise<boolean> {
    if (!hasAuthToken()) {
      return false;
    }
    try {
      const lifeClient = createDesktopLifeClient();
      await lifeClient.heal(frogId, { source });
      return true;
    } catch (error) {
      console.error('[API] Heal life error (sdk):', error);
      return false;
    }
  },

  async startLifeRest(frogId: number, source = 'desktop_life_actions'): Promise<boolean> {
    if (!hasAuthToken()) {
      return false;
    }
    try {
      const lifeClient = createDesktopLifeClient();
      await lifeClient.startRest(frogId, { source });
      return true;
    } catch (error) {
      console.error('[API] Start life rest error (sdk):', error);
      return false;
    }
  },

  async endLifeRest(frogId: number, source = 'desktop_life_actions'): Promise<boolean> {
    if (!hasAuthToken()) {
      return false;
    }
    try {
      const lifeClient = createDesktopLifeClient();
      await lifeClient.endRest(frogId, { source });
      return true;
    } catch (error) {
      console.error('[API] End life rest error (sdk):', error);
      return false;
    }
  },

  // Start a travel
  async startTravel(tokenId: number, chain: string, duration: number): Promise<boolean> {
    // Legacy compatibility: redirect desktop write path to v1 command.
    const frogId = storage.getActiveFrogId() || tokenId;
    const response = await api.startTravelV1({
      frogId,
      travelType: 'random',
      targetChain: chain,
      duration,
      source: 'desktop_legacy_startTravel',
    });
    return Boolean(response);
  },

  async startTravelV1(payload: StartTravelPayloadV1): Promise<StartTravelResultV1 | null> {
    if (!hasAuthToken()) {
      return null;
    }
    try {
      const travelClient = createDesktopTravelClient();
      const result = await travelClient.startV1<StartTravelResultV1>({
        ...payload,
        source: payload.source || 'desktop_travel_sync',
      });
      return result ?? null;
    } catch (error) {
      console.error('[API] Start v1 travel error (sdk):', error);
      return null;
    }
  },

  async getTravelByIdV1(travelId: number): Promise<TravelReadModelV1 | null> {
    if (!hasAuthToken()) {
      return null;
    }
    try {
      const travelClient = createDesktopTravelClient();
      const travel = await travelClient.getById<TravelReadModelV1>(travelId);
      return travel ?? null;
    } catch (error) {
      console.error('[API] Get v1 travel error (sdk):', error);
      return null;
    }
  },

  async completeTravelV1(travelId: number): Promise<TravelReadModelV1 | null> {
    if (!hasAuthToken()) {
      return null;
    }
    try {
      const travelClient = createDesktopTravelClient();
      const result = await travelClient.completeV1<TravelReadModelV1>(travelId, {
        source: 'desktop_travel_sync',
      });
      return result ?? null;
    } catch (error) {
      console.error('[API] Complete v1 travel error (sdk):', error);
      return null;
    }
  },

  // Get travel status (legacy fallback)
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
      const travelClient = createDesktopTravelClient();
      const history = await travelClient.getHistory<TravelHistoryResponse>({
        address: walletAddress.toLowerCase(),
        ...(frogId ? { frogId } : {}),
      });
      return history ?? null;
    } catch (error) {
      console.error('[API] Get travel history error (sdk):', error);
      return null;
    }
  },

  async getTravelStats(walletAddress: string, frogId?: number): Promise<TravelStats | null> {
    try {
      const travelClient = createDesktopTravelClient();
      const stats = await travelClient.getStats<TravelStats>({
        address: walletAddress.toLowerCase(),
        ...(frogId ? { frogId } : {}),
      });
      return stats ?? null;
    } catch (error) {
      console.error('[API] Get travel stats error (sdk):', error);
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

  async getNotificationFeed(
    frogTokenId: number,
    options: { limit?: number; unreadOnly?: boolean } = {}
  ): Promise<NotificationFeedItem[]> {
    try {
      const params = new URLSearchParams({
        limit: String(options.limit || 20),
        unreadOnly: options.unreadOnly ? 'true' : 'false',
      });
      const response = await request<{ notifications?: NotificationFeedItem[] }>(
        `/notifications/${frogTokenId}?${params.toString()}`,
        { method: 'GET', auth: 'optional' }
      );
      if (response.success && response.data && Array.isArray(response.data.notifications)) {
        return response.data.notifications;
      }
      return [];
    } catch (error) {
      console.error('[API] Get notification feed error:', error);
      return [];
    }
  },

  async getCouncilBrief(channel: 'desktop' | 'mobile_lite' = 'desktop'): Promise<CouncilBriefReadModel | null> {
    try {
      const councilClient = createDesktopCouncilClient();
      if (!councilClient) {
        return null;
      }
      return await councilClient.getBrief<CouncilBriefReadModel>({
        channel,
      });
    } catch (error) {
      console.error('[API] Get council brief error:', error);
      return null;
    }
  },

  async getCouncilBriefPreferences(): Promise<CouncilBriefPreferencesReadModel | null> {
    try {
      const councilClient = createDesktopCouncilClient();
      if (!councilClient) {
        return null;
      }
      return await councilClient.getBriefPreferences<CouncilBriefPreferencesReadModel>();
    } catch (error) {
      console.error('[API] Get council brief preferences error:', error);
      return null;
    }
  },

  async updateCouncilBriefPreferences(
    payload: UpdateCouncilBriefPreferencesPayload
  ): Promise<CouncilBriefPreferencesReadModel | null> {
    try {
      const councilClient = createDesktopCouncilClient();
      if (!councilClient) {
        return null;
      }
      return await councilClient.updateBriefPreferences<CouncilBriefPreferencesReadModel>(payload);
    } catch (error) {
      console.error('[API] Update council brief preferences error:', error);
      return null;
    }
  },

  async sendRelationshipAwareChat(input: {
    frogId: number;
    message: string;
    sessionId?: number;
  }): Promise<V2ChatMessageResponse | null> {
    try {
      const response = await request<V2ChatMessageResponse>('/v2/chat', {
        method: 'POST',
        auth: 'required',
        body: JSON.stringify({
          frogId: input.frogId,
          message: input.message,
          ...(input.sessionId ? { sessionId: input.sessionId } : {}),
        }),
      });
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('[API] Send relationship-aware chat error:', error);
      return null;
    }
  },
};

export default api;
