import {
  createAuthResourceClient,
  createHttpClient,
  createLifeResourceClient,
  createSocialResourceClient,
  createTravelResourceClient,
} from '@zfrog/client-sdk';

export const AUTH_TOKEN_STORAGE_KEY = 'zfrog_auth_token';
export const WALLET_ADDRESS_STORAGE_KEY = 'zfrog_wallet_address';

export interface MobileLiteSessionStorage {
  token: string | null;
  walletAddress: string | null;
}

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const resolveBaseUrl = (): string => {
  const envBase = import.meta.env.VITE_API_BASE_URL;
  if (envBase && envBase.trim().length > 0) {
    return envBase;
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'http://localhost:3001';
};

export const getStoredSession = (): MobileLiteSessionStorage => {
  const storage = getStorage();
  if (!storage) {
    return {
      token: null,
      walletAddress: null,
    };
  }

  return {
    token: storage.getItem(AUTH_TOKEN_STORAGE_KEY),
    walletAddress: storage.getItem(WALLET_ADDRESS_STORAGE_KEY),
  };
};

export const setStoredSession = (session: {
  token?: string | null;
  walletAddress?: string | null;
}): void => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  if (session.token !== undefined) {
    if (session.token) {
      storage.setItem(AUTH_TOKEN_STORAGE_KEY, session.token);
    } else {
      storage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
  }

  if (session.walletAddress !== undefined) {
    if (session.walletAddress) {
      storage.setItem(WALLET_ADDRESS_STORAGE_KEY, session.walletAddress.toLowerCase());
    } else {
      storage.removeItem(WALLET_ADDRESS_STORAGE_KEY);
    }
  }
};

export const clearStoredSession = (): void => {
  setStoredSession({
    token: null,
    walletAddress: null,
  });
};

const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {};
  const { token, walletAddress } = getStoredSession();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (walletAddress) {
    headers['x-wallet-address'] = walletAddress;
  }

  return headers;
};

export const httpClient = createHttpClient({
  baseUrl: resolveBaseUrl(),
  getAuthHeaders,
  retries: 0,
});

export const lifeClient = createLifeResourceClient(httpClient);
export const travelClient = createTravelResourceClient(httpClient);
export const socialClient = createSocialResourceClient(httpClient);
export const authClient = createAuthResourceClient(httpClient);
