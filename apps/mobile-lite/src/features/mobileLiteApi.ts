import {
  ClientSdkError,
  createCouncilResourceClient,
  createHttpClient,
} from '@zfrog/client-sdk';
import {
  getStoredSession,
  httpClient,
  lifeClient,
  setStoredSession,
  socialClient,
  travelClient,
} from '../lib/sdk';

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

export interface AuthMeResponse {
  walletAddress: string;
  world: {
    verifiedActions: string[];
  };
  frogTokenId: number | null;
}

export interface MobileStatusSnapshot {
  authMe: AuthMeResponse;
  life: unknown;
  travelStats: unknown;
  socialStatus: unknown;
}

export interface MobileLiteErrorShape {
  message: string;
  code?: string;
  status?: number;
  requestId?: string;
}

export interface MobileCouncilBriefReadModel {
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

export interface MobileCouncilBriefPreferencesReadModel {
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

export type CareActionType =
  | 'feed'
  | 'clean'
  | 'play'
  | 'heal'
  | 'startRest'
  | 'endRest'
  | 'revive';

export interface RunCareActionInput {
  action: CareActionType;
  frogId: number;
  foodType?: string;
  quantity?: number;
}

export interface BlessActionInput {
  targetFrogId: number;
  blesserFrogId: number;
  verificationId: string;
}

export interface RescueActionInput {
  travelId: number;
  rescuerFrogId: number;
  verificationId: string;
}

interface ApiEnvelopeError {
  code?: string;
  message?: string;
  details?: unknown;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: ApiEnvelopeError | string;
  meta?: {
    requestId?: string;
  };
}

class MobileLiteActionError extends Error {
  code?: string;
  status?: number;
  requestId?: string;

  constructor(message: string, options?: { code?: string; status?: number; requestId?: string }) {
    super(message);
    this.name = 'MobileLiteActionError';
    this.code = options?.code;
    this.status = options?.status;
    this.requestId = options?.requestId;
  }
}

const ACTION_COOLDOWN_MS = 1200;
const inflightActions = new Set<string>();
const actionLastFiredAt = new Map<string, number>();

const isApiEnvelope = <T>(value: unknown): value is ApiEnvelope<T> => {
  return Boolean(value && typeof value === 'object' && 'success' in value);
};

const normalizeErrorMessage = (error: ApiEnvelopeError | string | undefined, fallback: string): string => {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error && typeof error === 'object' && error.message) {
    return error.message;
  }

  return fallback;
};

const unwrapEnvelope = <T>(payload: unknown, fallbackMessage: string): T => {
  if (!isApiEnvelope<T>(payload)) {
    return payload as T;
  }

  if (payload.success) {
    return payload.data as T;
  }

  const code = typeof payload.error === 'object' && payload.error ? payload.error.code : undefined;
  const message = normalizeErrorMessage(payload.error, fallbackMessage);

  throw new MobileLiteActionError(message, {
    code,
    requestId: payload.meta?.requestId,
  });
};

const withActionGuard = async <T>(
  actionKey: string,
  task: () => Promise<T>,
  cooldownMs = ACTION_COOLDOWN_MS
): Promise<T> => {
  if (inflightActions.has(actionKey)) {
    throw new MobileLiteActionError('Action already in progress', {
      code: 'ACTION_IN_PROGRESS',
    });
  }

  const now = Date.now();
  const previous = actionLastFiredAt.get(actionKey);
  if (previous && now - previous < cooldownMs) {
    throw new MobileLiteActionError('Action throttled to avoid duplicate submission', {
      code: 'ACTION_COOLDOWN',
    });
  }

  inflightActions.add(actionKey);
  actionLastFiredAt.set(actionKey, now);

  try {
    return await task();
  } finally {
    inflightActions.delete(actionKey);
  }
};

const parsePositiveInt = (value: number, fieldName: string): number => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new MobileLiteActionError(`${fieldName} must be a positive integer`, {
      code: 'INVALID_INPUT',
    });
  }

  return value;
};

const normalizeWalletAddress = (walletAddress: string): string => {
  const normalized = walletAddress.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(normalized)) {
    throw new MobileLiteActionError('Wallet address must be 0x + 40 hex chars', {
      code: 'INVALID_INPUT',
    });
  }
  return normalized;
};

const normalizeVerificationId = (value: string): string => {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9:_-]{3,120}$/.test(normalized)) {
    throw new MobileLiteActionError('verificationId must be 3-120 chars: A-Z a-z 0-9 : _ -', {
      code: 'INVALID_INPUT',
    });
  }
  return normalized;
};

const normalizeQuantity = (value: number | undefined): number => {
  if (value === undefined) {
    return 1;
  }
  if (!Number.isInteger(value) || value <= 0 || value > 50) {
    throw new MobileLiteActionError('quantity must be an integer in range 1-50', {
      code: 'INVALID_INPUT',
    });
  }
  return value;
};

const readStringValue = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const resolveApiBaseUrl = (): string => {
  const fromEnv = readStringValue(import.meta.env.VITE_API_BASE_URL);
  if (fromEnv) {
    return fromEnv;
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:3001';
};

const resolveCouncilIntegrationApiKey = (): string | null => {
  const fromWindow =
    typeof window !== 'undefined'
      ? (window as unknown as { __ZFROG_V3_INTEGRATION_API_KEY__?: unknown })
          .__ZFROG_V3_INTEGRATION_API_KEY__
      : undefined;
  const parsedWindow = readStringValue(fromWindow);
  if (parsedWindow) {
    return parsedWindow;
  }

  return (
    readStringValue(import.meta.env.VITE_V3_COUNCIL_INTEGRATION_API_KEY) ||
    readStringValue(import.meta.env.VITE_V3_INTEGRATION_API_KEY)
  );
};

const createMobileCouncilClient = () => {
  const integrationApiKey = resolveCouncilIntegrationApiKey();
  if (!integrationApiKey) {
    throw new MobileLiteActionError('Missing V3 council integration api key', {
      code: 'COUNCIL_INTEGRATION_KEY_REQUIRED',
    });
  }

  const councilHttpClient = createHttpClient({
    baseUrl: resolveApiBaseUrl(),
    retries: 0,
    getAuthHeaders: () => {
      const headers: Record<string, string> = {};
      const { token, walletAddress } = getStoredSession();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      if (walletAddress) {
        headers['x-wallet-address'] = walletAddress;
      }
      headers['x-api-key'] = integrationApiKey;
      return headers;
    },
  });

  return createCouncilResourceClient(councilHttpClient);
};

export const describeMobileLiteError = (error: unknown): MobileLiteErrorShape => {
  if (error instanceof MobileLiteActionError) {
    return {
      message: error.message,
      code: error.code,
      status: error.status,
      requestId: error.requestId,
    };
  }

  if (error instanceof ClientSdkError) {
    return {
      message: error.message,
      code: error.code,
      status: error.status,
      requestId: error.requestId,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  return {
    message: 'Unknown request failure',
  };
};

export const formatMobileLiteError = (error: unknown): string => {
  const normalized = describeMobileLiteError(error);
  const code = normalized.code ? ` (${normalized.code})` : '';
  const requestId = normalized.requestId ? ` [req:${normalized.requestId}]` : '';
  return `${normalized.message}${code}${requestId}`;
};

export const getSessionSnapshot = (): {
  token: string | null;
  walletAddress: string | null;
  isLoggedIn: boolean;
  tokenPreview: string;
} => {
  const { token, walletAddress } = getStoredSession();
  const tokenPreview = token ? `${token.slice(0, 12)}...${token.slice(-8)}` : '--';

  return {
    token,
    walletAddress,
    isLoggedIn: Boolean(token),
    tokenPreview,
  };
};

export const issueAuthNonce = async (walletAddress: string): Promise<AuthNonceResponse> => {
  const normalizedWalletAddress = normalizeWalletAddress(walletAddress);

  return withActionGuard(
    `auth:nonce:${normalizedWalletAddress}`,
    async () => {
      const payload = await httpClient.post<unknown>('/v1/auth/nonce', {
        retries: 0,
        body: {
          walletAddress: normalizedWalletAddress,
        },
      });

      return unwrapEnvelope<AuthNonceResponse>(payload, 'Failed to issue auth nonce');
    },
    400
  );
};

export const loginWithWalletSignature = async (input: {
  walletAddress: string;
  signature: string;
  chainId?: number;
}): Promise<WalletLoginResponse> => {
  const walletAddress = normalizeWalletAddress(input.walletAddress);
  const signature = input.signature.trim();
  if (!signature) {
    throw new MobileLiteActionError('Signature is required', {
      code: 'INVALID_INPUT',
    });
  }

  const chainId = input.chainId;
  if (chainId !== undefined && (!Number.isInteger(chainId) || chainId <= 0)) {
    throw new MobileLiteActionError('chainId must be a positive integer', {
      code: 'INVALID_INPUT',
    });
  }

  const result = await withActionGuard(`auth:login:${walletAddress}`, async () => {
    const payload = await httpClient.post<unknown>('/v1/auth/wallet', {
      retries: 0,
      body: {
        walletAddress,
        signature,
        ...(chainId ? { chainId } : {}),
      },
    });

    return unwrapEnvelope<WalletLoginResponse>(payload, 'Failed to login with wallet signature');
  });

  setStoredSession({
    token: result.token,
    walletAddress: result.walletAddress,
  });

  return result;
};

export const getAuthMe = async (): Promise<AuthMeResponse> => {
  const payload = await httpClient.get<unknown>('/v1/auth/me', {
    retries: 0,
  });

  return unwrapEnvelope<AuthMeResponse>(payload, 'Failed to fetch auth profile');
};

export const fetchMobileStatusSnapshot = async (input: {
  frogId: number;
  walletAddress: string;
}): Promise<MobileStatusSnapshot> => {
  const frogId = parsePositiveInt(input.frogId, 'frogId');
  const walletAddress = normalizeWalletAddress(input.walletAddress);

  return withActionGuard(`status:${frogId}:${walletAddress}`, async () => {
    const [authMe, life, travelStats, socialStatus] = await Promise.all([
      getAuthMe(),
      lifeClient.getLife(frogId),
      travelClient.getStats({
        address: walletAddress,
        frogId,
      }),
      socialClient.getStatus(),
    ]);

    return {
      authMe,
      life,
      travelStats,
      socialStatus,
    };
  });
};

export const fetchCouncilBriefForMobile = async (): Promise<MobileCouncilBriefReadModel> => {
  return withActionGuard('council:brief:mobile', async () => {
    const councilClient = createMobileCouncilClient();
    return councilClient.getBrief<MobileCouncilBriefReadModel>({
      channel: 'mobile_lite',
    });
  }, 1200);
};

export const fetchCouncilBriefPreferencesForMobile = async (): Promise<MobileCouncilBriefPreferencesReadModel> => {
  return withActionGuard('council:brief:prefs:get', async () => {
    const councilClient = createMobileCouncilClient();
    return councilClient.getBriefPreferences<MobileCouncilBriefPreferencesReadModel>();
  }, 800);
};

export const updateCouncilBriefPreferencesForMobile = async (input: {
  mobileLiteEnabled?: boolean;
  throttleMs?: number;
}): Promise<MobileCouncilBriefPreferencesReadModel> => {
  return withActionGuard('council:brief:prefs:update', async () => {
    const councilClient = createMobileCouncilClient();
    return councilClient.updateBriefPreferences<MobileCouncilBriefPreferencesReadModel>({
      ...(typeof input.throttleMs === 'number' ? { throttleMs: input.throttleMs } : {}),
      ...(typeof input.mobileLiteEnabled === 'boolean'
        ? {
            channels: {
              mobileLite: input.mobileLiteEnabled,
            },
          }
        : {}),
    });
  }, 1200);
};

export const runCareAction = async (input: RunCareActionInput): Promise<unknown> => {
  const frogId = parsePositiveInt(input.frogId, 'frogId');

  return withActionGuard(`care:${input.action}:${frogId}`, async () => {
    if (input.action === 'feed') {
      const foodType = input.foodType?.trim();
      if (!foodType) {
        throw new MobileLiteActionError('foodType is required for feed action', {
          code: 'INVALID_INPUT',
        });
      }

      return lifeClient.feed(frogId, {
        foodType,
        quantity: normalizeQuantity(input.quantity),
        source: 'mobile_lite_care',
      });
    }

    if (input.action === 'clean') {
      return lifeClient.clean(frogId, {
        source: 'mobile_lite_care',
      });
    }

    if (input.action === 'play') {
      return lifeClient.play(frogId, {
        source: 'mobile_lite_care',
      });
    }

    if (input.action === 'heal') {
      return lifeClient.heal(frogId, {
        source: 'mobile_lite_care',
      });
    }

    if (input.action === 'startRest') {
      return lifeClient.startRest(frogId, {
        source: 'mobile_lite_care',
      });
    }

    if (input.action === 'endRest') {
      return lifeClient.endRest(frogId, {
        source: 'mobile_lite_care',
      });
    }

    if (input.action === 'revive') {
      return lifeClient.revive(frogId, {
        source: 'mobile_lite_care',
      });
    }

    throw new MobileLiteActionError('Unsupported care action', {
      code: 'INVALID_INPUT',
    });
  });
};

export const runBlessAction = async (input: BlessActionInput): Promise<unknown> => {
  const targetFrogId = parsePositiveInt(input.targetFrogId, 'targetFrogId');
  const blesserFrogId = parsePositiveInt(input.blesserFrogId, 'blesserFrogId');
  const verificationId = normalizeVerificationId(input.verificationId);

  return withActionGuard(`bless:${targetFrogId}:${blesserFrogId}`, async () => {
    return lifeClient.bless(targetFrogId, {
      blesserFrogId,
      verificationId,
      source: 'mobile_lite_bless',
    });
  });
};

export const runRescueAction = async (input: RescueActionInput): Promise<unknown> => {
  const travelId = parsePositiveInt(input.travelId, 'travelId');
  const rescuerFrogId = parsePositiveInt(input.rescuerFrogId, 'rescuerFrogId');
  const verificationId = normalizeVerificationId(input.verificationId);

  return withActionGuard(`rescue:${travelId}:${rescuerFrogId}`, async () => {
    return socialClient.rescueTravel({
      travelId,
      rescuerFrogId,
      verificationId,
    });
  });
};
