import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import storage from '../../services/storage';

type EggLifecycleStatus = 'checking' | 'ready' | 'no_frog' | 'no_wallet';

interface EggLifecycleState {
  status: EggLifecycleStatus;
  tokenId: number | null;
  frogId: number | null;
  frogName: string | null;
  walletAddress: string | null;
  loading: boolean;
  error: string | null;
}

interface UseEggLifecycleReturn extends EggLifecycleState {
  refresh: () => Promise<void>;
  setAuthToken: (token: string) => void;
  clearAuthToken: () => void;
}

const DEFAULT_STATE: EggLifecycleState = {
  status: 'checking',
  tokenId: null,
  frogId: null,
  frogName: null,
  walletAddress: null,
  loading: true,
  error: null,
};

export function useEggLifecycle(walletAddress?: string | null): UseEggLifecycleReturn {
  const [state, setState] = useState<EggLifecycleState>(DEFAULT_STATE);

  const resolveLifecycle = useCallback(async () => {
    const resolvedWallet = (walletAddress || storage.getWalletAddress() || '').trim().toLowerCase();
    if (!resolvedWallet) {
      storage.clearActiveFrogId();
      setState({
        ...DEFAULT_STATE,
        status: 'no_wallet',
        walletAddress: null,
        loading: false,
      });
      return;
    }

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      walletAddress: resolvedWallet,
    }));

    try {
      const me = await api.getAuthMe();
      const remoteFrog = await api.getMyFrog(resolvedWallet);
      const tokenId = me?.frogTokenId ?? remoteFrog?.tokenId ?? null;
      const frogId = remoteFrog?.id ?? null;
      const frogName = remoteFrog?.name ?? null;

      if (frogId) {
        storage.setActiveFrogId(frogId);
      } else {
        storage.clearActiveFrogId();
      }

      setState({
        status: tokenId ? 'ready' : 'no_frog',
        tokenId,
        frogId,
        frogName,
        walletAddress: resolvedWallet,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        status: 'no_frog',
        loading: false,
        error: error?.message || 'Failed to resolve egg lifecycle',
      }));
    }
  }, [walletAddress]);

  useEffect(() => {
    void resolveLifecycle();
  }, [resolveLifecycle]);

  return {
    ...state,
    refresh: resolveLifecycle,
    setAuthToken: (token: string) => {
      storage.setAuthToken(token);
    },
    clearAuthToken: () => {
      storage.clearAuthToken();
    },
  };
}

export default useEggLifecycle;
