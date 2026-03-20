import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount, useChainId, useSignMessage } from 'wagmi';
import { walletConnectService } from '../services/wallet/walletConnect';
import { useSessionStore } from '../services/wallet/sessionStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface ApiEnvelope<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
  };
}

async function requestV1<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message || `HTTP_${response.status}`);
  }
  return payload.data as T;
}

interface AuthMePayload {
  walletAddress: string;
  world?: {
    verifiedActions?: string[];
  };
  frogTokenId?: number | null;
}

interface AuthNoncePayload {
  nonce: string;
  message: string;
  expiresAt: string;
}

interface AuthWalletPayload {
  token: string;
  walletAddress: string;
  frogTokenId: number | null;
  hasFrog: boolean;
}

export interface UseWalletConnectReturn {
  // 状态
  isConnected: boolean;
  address: string | undefined;
  isAuthenticating: boolean;
  authError: string | null;
  
  // 操作
  initialize: () => Promise<void>;
  disconnect: () => Promise<void>;
  authenticate: (force?: boolean) => Promise<void>;
}

export function useWalletConnect(): UseWalletConnectReturn {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const lastAuthAddressRef = useRef<string | null>(null);
  const {
    session,
    setRestoring,
    saveSession,
    setAuthToken,
    setVerifiedActions,
  } = useSessionStore();
  
  // 初始化 WalletConnect
  const initialize = useCallback(async () => {
    try {
      setRestoring(true);
      await walletConnectService.initialize();
      console.log('🔗 WalletConnect initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize WalletConnect:', error);
    } finally {
      setRestoring(false);
    }
  }, [setRestoring]);
  
  // 断开连接
  const disconnect = useCallback(async () => {
    try {
      await walletConnectService.cleanup();
      setAuthToken(null);
      console.log('🔌 WalletConnect disconnected');
    } catch (error) {
      console.error('❌ Failed to disconnect WalletConnect:', error);
    }
  }, [setAuthToken]);

  const authenticate = useCallback(
    async (force = false) => {
      if (!isConnected || !address) return;

      const normalizedAddress = address.toLowerCase();
      if (!force && session?.authToken && session.address?.toLowerCase() === normalizedAddress) {
        return;
      }

      setIsAuthenticating(true);
      setAuthError(null);

      try {
        const nonceData = await requestV1<AuthNoncePayload>('/api/v1/auth/nonce', {
          method: 'POST',
          body: JSON.stringify({ walletAddress: normalizedAddress }),
        });

        const signature = await signMessageAsync({
          account: address,
          message: nonceData.message,
        });
        const authData = await requestV1<AuthWalletPayload>('/api/v1/auth/wallet', {
          method: 'POST',
          body: JSON.stringify({
            walletAddress: normalizedAddress,
            signature,
            chainId,
          }),
        });

        setAuthToken(authData.token);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('walletAddress', normalizedAddress);
          window.localStorage.setItem('address', normalizedAddress);
        }

        saveSession({
          address: normalizedAddress,
          chainId: chainId || session?.chainId || 7001,
          connector: session?.connector || 'walletConnect',
          connectedAt: session?.connectedAt || Date.now(),
          lastActiveAt: Date.now(),
          authToken: authData.token,
          verifiedActions: session?.verifiedActions || [],
          metadata: session?.metadata,
        });

        const me = await requestV1<AuthMePayload>('/api/v1/auth/me', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authData.token}`,
          },
        });
        setVerifiedActions(me.world?.verifiedActions || []);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Authentication failed';
        setAuthError(message);
        console.error('❌ Wallet authentication failed:', error);
      } finally {
        setIsAuthenticating(false);
      }
    },
    [isConnected, address, session, signMessageAsync, chainId, setAuthToken, saveSession, setVerifiedActions]
  );
  
  // 组件挂载时初始化
  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isConnected || !address) {
      lastAuthAddressRef.current = null;
      return;
    }

    const normalizedAddress = address.toLowerCase();
    if (lastAuthAddressRef.current === normalizedAddress) {
      return;
    }

    lastAuthAddressRef.current = normalizedAddress;
    authenticate(false).catch((error) => {
      console.error('❌ Auto authenticate failed:', error);
    });
  }, [isConnected, address, authenticate]);
  
  return {
    isConnected,
    address,
    isAuthenticating,
    authError,
    initialize,
    disconnect,
    authenticate,
  };
}
