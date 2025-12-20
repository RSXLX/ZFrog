import { useAccount, useBalance, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { useCallback, useEffect, useState } from 'react';
import { useSessionStore, formatAddress } from '../services/wallet/sessionStore';
import { zetachainAthens } from '../config/chains';

export interface UseWalletReturn {
  // 状态
  address: string | undefined;
  shortAddress: string;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | undefined;
  isCorrectChain: boolean;
  balance: string;
  balanceSymbol: string;
  
  // 会话
  // @ts-ignore
  session: ReturnType<typeof useSessionStore>['session'];
  isSessionValid: boolean;
  
  // 操作
  connect: () => void;
  disconnect: () => void;
  switchToZetaChain: () => Promise<void>;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
}

export function useWallet(): UseWalletReturn {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { address, isConnected, isConnecting, connector } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  
  const { 
    session, 
    saveSession, 
    clearSession, 
    isSessionValid,
    updateLastActive 
  } = useSessionStore();
  
  // 获取余额
  const { data: balanceData } = useBalance({
    address,
    chainId: zetachainAthens.id,
  });
  
  // 检查是否在正确的链上
  const isCorrectChain = chainId === zetachainAthens.id;
  
  // 连接成功后保存会话
  useEffect(() => {
    if (isConnected && address && connector) {
      saveSession({
        address,
        chainId: chainId || zetachainAthens.id,
        connector: connector.id,
        connectedAt: Date.now(),
        lastActiveAt: Date.now(),
        metadata: {
          name: connector.name,
          icon: connector.icon,
        },
      });
    }
  }, [isConnected, address, connector, chainId, saveSession]);
  
  // 定期更新活跃时间
  useEffect(() => {
    if (!isConnected) return;
    
    const interval = setInterval(() => {
      updateLastActive();
    }, 60000); // 每分钟更新
    
    return () => clearInterval(interval);
  }, [isConnected, updateLastActive]);
  
  // 连接
  const connect = useCallback(() => {
    setIsModalOpen(true);
  }, []);
  
  // 断开连接
  const disconnect = useCallback(() => {
    wagmiDisconnect();
    clearSession();
    setIsModalOpen(false);
  }, [wagmiDisconnect, clearSession]);
  
  // 切换到 ZetaChain
  const switchToZetaChain = useCallback(async () => {
    if (switchChain) {
      await switchChain({ chainId: zetachainAthens.id });
    }
  }, [switchChain]);
  
  return {
    // 状态
    address,
    shortAddress: address ? formatAddress(address) : '',
    isConnected,
    isConnecting,
    chainId,
    isCorrectChain,
    balance: balanceData?.formatted || '0',
    balanceSymbol: balanceData?.symbol || 'ZETA',
    
    // 会话
    session,
    isSessionValid: isSessionValid(),
    
    // 操作
    connect,
    disconnect,
    switchToZetaChain,
    isModalOpen,
    setIsModalOpen,
  };
}