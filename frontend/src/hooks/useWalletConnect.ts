import { useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { walletConnectService } from '../services/wallet/walletConnect';
import { useSessionStore } from '../services/wallet/sessionStore';

export interface UseWalletConnectReturn {
  // 状态
  isConnected: boolean;
  address: string | undefined;
  
  // 操作
  initialize: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export function useWalletConnect(): UseWalletConnectReturn {
  const { address, isConnected } = useAccount();
  const { setRestoring } = useSessionStore();
  
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
      console.log('🔌 WalletConnect disconnected');
    } catch (error) {
      console.error('❌ Failed to disconnect WalletConnect:', error);
    }
  }, []);
  
  // 组件挂载时初始化
  useEffect(() => {
    initialize();
  }, [initialize]);
  
  return {
    isConnected,
    address,
    initialize,
    disconnect,
  };
}