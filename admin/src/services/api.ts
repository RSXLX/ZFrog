import axios from 'axios';

const TOKEN_KEYS = ['authToken', 'token', 'jwt', 'accessToken'];
const ADDRESS_KEYS = ['walletAddress', 'address', 'ownerAddress'];

function readFirstLocalStorage(keys: string[]): string | null {
  if (typeof window === 'undefined') return null;
  for (const key of keys) {
    const value = window.localStorage.getItem(key);
    if (value) return value;
    const sessionValue = window.sessionStorage.getItem(key);
    if (sessionValue) return sessionValue;
  }
  return null;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = readFirstLocalStorage(TOKEN_KEYS);
    const walletAddress = readFirstLocalStorage(ADDRESS_KEYS);
    const envAddress = import.meta.env.VITE_ADMIN_ADDRESS as string | undefined;
    const authAddress = walletAddress || envAddress;

    if (token) {
      config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    } else if (authAddress) {
      // backend authRequired 在非生产环境支持 x-admin-address 作为开发态兜底
      config.headers['x-admin-address'] = authAddress;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    const payload = response.data;

    if (payload && typeof payload === 'object' && 'success' in payload) {
      if (!payload.success) {
        const message = payload?.error?.message || payload.message || 'API request failed';
        return Promise.reject(new Error(message));
      }

      if (payload.meta && typeof payload.meta === 'object') {
        return {
          data: payload.data,
          ...payload.meta,
        };
      }

      return payload.data;
    }

    return payload;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;

export async function requestWalletNonce(walletAddress: string): Promise<{
  nonce: string;
  message: string;
  expiresAt: string;
}> {
  const payload = await api.post('/api/v1/auth/nonce', { walletAddress });
  return payload.data || payload;
}

export async function loginWithWalletSignature(params: {
  walletAddress: string;
  signature: string;
  chainId?: number;
}): Promise<{
  token: string;
  walletAddress: string;
  frogTokenId: number | null;
  hasFrog: boolean;
}> {
  const payload = await api.post('/api/v1/auth/wallet', params);
  return payload.data || payload;
}

export async function getAuthMe() {
  const payload = await api.get('/api/v1/auth/me');
  return payload.data || payload;
}
