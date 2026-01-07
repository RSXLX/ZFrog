# 浏览器连接后同步（WalletConnect）详细实现方案

## 📋 方案概述

用户通过浏览器中的主流钱包（MetaMask、Coinbase Wallet 等）授权，桌面应用通过 WalletConnect 协议获取会话信息，后续交易签名请求会推送到用户的钱包应用中确认。

```
┌────────────────────────────────────────────────────────────────────┐
│                        整体架构流程                                 │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   ┌──────────────┐                      ┌──────────────────────┐  │
│   │ ZetaFrog     │    WalletConnect     │   用户钱包           │  │
│   │ 桌面应用     │◄────协议通信────────►│   (MetaMask等)       │  │
│   │              │                      │                      │  │
│   │ 1.生成配对URI│                      │                      │  │
│   │ 2.显示二维码 │─────扫码/链接──────►│ 3.用户确认连接       │  │
│   │ 4.收到会话   │◄────会话建立────────│                      │  │
│   │ 5.存储会话   │                      │                      │  │
│   │              │                      │                      │  │
│   │ 6.发送交易   │─────签名请求────────►│ 7.用户确认签名       │  │
│   │ 8.收到签名   │◄────返回签名────────│                      │  │
│   │ 9.广播交易   │                      │                      │  │
│   └──────────────┘                      └──────────────────────┘  │
│          │                                                        │
│          ▼                                                        │
│   ┌──────────────┐                                                │
│   │  ZetaChain   │                                                │
│   │  Testnet     │                                                │
│   └──────────────┘                                                │
└────────────────────────────────────────────────────────────────────┘
```

---

## 📁 项目结构

```
frontend/
├── src/
│   ├── config/
│   │   ├── wagmi.ts                 # Wagmi 配置
│   │   ├── web3modal.ts             # Web3Modal 配置
│   │   └── chains.ts                # 链配置
│   ├── services/
│   │   └── wallet/
│   │       ├── index.ts             # 钱包服务入口
│   │       ├── walletConnect.ts     # WalletConnect 核心逻辑
│   │       ├── sessionStore.ts      # 会话存储管理
│   │       └── transactionManager.ts # 交易管理
│   ├── hooks/
│   │   ├── useWallet.ts             # 钱包状态 Hook
│   │   ├── useWalletConnect.ts      # WalletConnect Hook
│   │   └── useTransaction.ts        # 交易 Hook
│   ├── components/
│   │   └── wallet/
│   │       ├── ConnectButton.tsx    # 连接按钮
│   │       ├── WalletModal.tsx      # 钱包选择弹窗
│   │       ├── QRCodeModal.tsx      # 二维码弹窗
│   │       ├── AccountInfo.tsx      # 账户信息展示
│   │       └── TransactionToast.tsx # 交易通知
│   ├── stores/
│   │   └── walletStore.ts           # Zustand 钱包状态
│   └── types/
│       └── wallet.ts                # 钱包相关类型
├── .env.example
└── package.json
```

---

## 🔧 第一步：环境准备

### 1.1 获取 WalletConnect Project ID

1. 访问 [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. 注册/登录账户
3. 创建新项目，获取 `Project ID`

### 1.2 安装依赖

```bash
cd frontend
npm install @web3modal/wagmi @wagmi/core @wagmi/connectors wagmi viem @tanstack/react-query zustand qrcode.react
```

### 1.3 环境变量配置

```env
# frontend/.env.example

# WalletConnect
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here

# App Info
VITE_APP_NAME=ZetaFrog
VITE_APP_DESCRIPTION=Your Cross-chain Desktop Pet
VITE_APP_URL=https://zetafrog.xyz
VITE_APP_ICON=https://zetafrog.xyz/icon.png

# Chain
VITE_ZETACHAIN_RPC_URL=https://zetachain-athens-evm.blockpi.network/v1/rpc/public

# Contracts
VITE_ZETAFROG_NFT_ADDRESS=0x...
VITE_SOUVENIR_NFT_ADDRESS=0x...

# API
VITE_API_URL=http://localhost:3001
```

---

## 🔗 第二步：链和 Wagmi 配置

### 2.1 链配置

```typescript
// src/config/chains.ts

import { defineChain } from 'viem';

// ZetaChain Athens 测试网
export const zetachainAthens = defineChain({
  id: 7001,
  name: 'ZetaChain Athens Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'ZETA',
    symbol: 'ZETA',
  },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_ZETACHAIN_RPC_URL || 'https://zetachain-athens-evm.blockpi.network/v1/rpc/public'],
    },
    public: {
      http: ['https://zetachain-athens-evm.blockpi.network/v1/rpc/public'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ZetaScan',
      url: 'https://athens.explorer.zetachain.com',
    },
  },
  testnet: true,
});

// 支持的链列表
export const supportedChains = [zetachainAthens] as const;

// 链 ID 映射
export const chainIdToChain = {
  7001: zetachainAthens,
} as const;
```

### 2.2 Wagmi 配置

```typescript
// src/config/wagmi.ts

import { createConfig, http } from 'wagmi';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';
import { zetachainAthens, supportedChains } from './chains';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  throw new Error('VITE_WALLETCONNECT_PROJECT_ID is required');
}

// 应用元数据
const metadata = {
  name: import.meta.env.VITE_APP_NAME || 'ZetaFrog',
  description: import.meta.env.VITE_APP_DESCRIPTION || 'Your Cross-chain Desktop Pet',
  url: import.meta.env.VITE_APP_URL || 'https://zetafrog.xyz',
  icons: [import.meta.env.VITE_APP_ICON || 'https://zetafrog.xyz/icon.png'],
};

// 创建 Wagmi 配置
export const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors: [
    // 浏览器插件钱包 (MetaMask, etc.)
    injected({
      shimDisconnect: true,
    }),
    
    // WalletConnect (移动端钱包、桌面钱包)
    walletConnect({
      projectId,
      metadata,
      showQrModal: false, // 我们自己控制二维码显示
    }),
    
    // Coinbase Wallet
    coinbaseWallet({
      appName: metadata.name,
      appLogoUrl: metadata.icons[0],
    }),
  ],
  transports: {
    [zetachainAthens.id]: http(),
  },
});

// 导出类型
export type WagmiConfig = typeof wagmiConfig;
```

### 2.3 Web3Modal 配置

```typescript
// src/config/web3modal.ts

import { createWeb3Modal } from '@web3modal/wagmi/react';
import { wagmiConfig } from './wagmi';
import { zetachainAthens } from './chains';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// 创建 Web3Modal 实例
export const web3Modal = createWeb3Modal({
  wagmiConfig,
  projectId,
  // 主题配置
  themeMode: 'light',
  themeVariables: {
    '--w3m-accent': '#22c55e',           // ZetaFrog 绿色
    '--w3m-color-mix': '#22c55e',
    '--w3m-color-mix-strength': 20,
    '--w3m-border-radius-master': '12px',
  },
  // 特性标志
  featuredWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
    'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase
  ],
  // 链配置
  defaultChain: zetachainAthens,
  // 条款和隐私
  termsConditionsUrl: 'https://zetafrog.xyz/terms',
  privacyPolicyUrl: 'https://zetafrog.xyz/privacy',
});
```

---

## 💾 第三步：会话存储管理

### 3.1 会话存储服务

```typescript
// src/services/wallet/sessionStore.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// 会话信息接口
export interface WalletSession {
  address: string;
  chainId: number;
  connector: string;           // 连接器类型: 'walletConnect' | 'injected' | 'coinbaseWallet'
  connectedAt: number;         // 连接时间戳
  lastActiveAt: number;        // 最后活跃时间
  metadata?: {
    name?: string;             // 钱包名称
    icon?: string;             // 钱包图标
  };
}

// 存储状态接口
interface SessionStoreState {
  session: WalletSession | null;
  isRestoring: boolean;
  
  // Actions
  saveSession: (session: WalletSession) => void;
  clearSession: () => void;
  updateLastActive: () => void;
  setRestoring: (restoring: boolean) => void;
  
  // Getters
  isSessionValid: () => boolean;
  getSessionAge: () => number;
}

// 会话有效期：7 天
const SESSION_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000;

// 创建存储（支持 Electron 和浏览器）
const storage = createJSONStorage(() => {
  // 检测是否在 Electron 环境
  if (typeof window !== 'undefined' && window.electron?.store) {
    return {
      getItem: async (name: string) => {
        const value = await window.electron.store.get(name);
        return value ? JSON.stringify(value) : null;
      },
      setItem: async (name: string, value: string) => {
        await window.electron.store.set(name, JSON.parse(value));
      },
      removeItem: async (name: string) => {
        await window.electron.store.delete(name);
      },
    };
  }
  // 降级到 localStorage
  return localStorage;
});

export const useSessionStore = create<SessionStoreState>()(
  persist(
    (set, get) => ({
      session: null,
      isRestoring: false,
      
      saveSession: (session: WalletSession) => {
        set({
          session: {
            ...session,
            connectedAt: session.connectedAt || Date.now(),
            lastActiveAt: Date.now(),
          },
        });
        console.log('💾 Session saved:', session.address);
      },
      
      clearSession: () => {
        set({ session: null });
        console.log('🗑️ Session cleared');
      },
      
      updateLastActive: () => {
        const { session } = get();
        if (session) {
          set({
            session: {
              ...session,
              lastActiveAt: Date.now(),
            },
          });
        }
      },
      
      setRestoring: (restoring: boolean) => {
        set({ isRestoring: restoring });
      },
      
      isSessionValid: () => {
        const { session } = get();
        if (!session) return false;
        
        const age = Date.now() - session.connectedAt;
        return age < SESSION_VALIDITY_MS;
      },
      
      getSessionAge: () => {
        const { session } = get();
        if (!session) return Infinity;
        return Date.now() - session.connectedAt;
      },
    }),
    {
      name: 'zetafrog-wallet-session',
      storage,
      partialize: (state) => ({ session: state.session }),
    }
  )
);

// 辅助函数：格式化地址
export function formatAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

// 辅助函数：格式化会话年龄
export function formatSessionAge(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} 天前连接`;
  if (hours > 0) return `${hours} 小时前连接`;
  return '刚刚连接';
}
```

### 3.2 Electron Store 类型声明（如果使用 Electron）

```typescript
// src/types/electron.d.ts

export interface ElectronStore {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any) => Promise<void>;
  delete: (key: string) => Promise<void>;
  clear: () => Promise<void>;
}

declare global {
  interface Window {
    electron?: {
      store: ElectronStore;
      // 其他 Electron API...
    };
  }
}

export {};
```

---

## 🪝 第四步：React Hooks

### 4.1 钱包状态 Hook

```typescript
// src/hooks/useWallet.ts

import { useAccount, useBalance, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { useCallback, useEffect } from 'react';
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
  session: ReturnType<typeof useSessionStore>['session'];
  isSessionValid: boolean;
  
  // 操作
  connect: () => void;
  disconnect: () => void;
  switchToZetaChain: () => Promise<void>;
}

export function useWallet(): UseWalletReturn {
  const { open, close } = useWeb3Modal();
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
    open();
  }, [open]);
  
  // 断开连接
  const disconnect = useCallback(() => {
    wagmiDisconnect();
    clearSession();
    close();
  }, [wagmiDisconnect, clearSession, close]);
  
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
  };
}
```

### 4.2 交易 Hook

```typescript
// src/hooks/useTransaction.ts

import { 
  useWriteContract, 
  useWaitForTransactionReceipt,
  useSimulateContract,
} from 'wagmi';
import { useState, useCallback } from 'react';
import { parseEther, type Abi } from 'viem';

export type TransactionStatus = 'idle' | 'simulating' | 'pending' | 'confirming' | 'success' | 'error';

export interface TransactionState {
  status: TransactionStatus;
  hash?: `0x${string}`;
  error?: Error;
  receipt?: any;
}

export interface UseTransactionOptions {
  onSuccess?: (hash: string, receipt: any) => void;
  onError?: (error: Error) => void;
}

export function useTransaction(options: UseTransactionOptions = {}) {
  const [state, setState] = useState<TransactionState>({ status: 'idle' });
  
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();
  
  const { isLoading: isConfirming, data: receipt } = useWaitForTransactionReceipt({
    hash: state.hash,
  });
  
  // 执行合约写入
  const execute = useCallback(async ({
    address,
    abi,
    functionName,
    args = [],
    value,
  }: {
    address: `0x${string}`;
    abi: Abi;
    functionName: string;
    args?: any[];
    value?: bigint;
  }) => {
    try {
      setState({ status: 'pending' });
      
      const hash = await writeContractAsync({
        address,
        abi,
        functionName,
        args,
        value,
      });
      
      setState({ status: 'confirming', hash });
      console.log('📤 Transaction sent:', hash);
      
      return hash;
    } catch (error: any) {
      console.error('❌ Transaction failed:', error);
      setState({ status: 'error', error });
      options.onError?.(error);
      throw error;
    }
  }, [writeContractAsync, options]);
  
  // 监听交易确认
  useEffect(() => {
    if (receipt && state.status === 'confirming') {
      setState(prev => ({ ...prev, status: 'success', receipt }));
      console.log('✅ Transaction confirmed:', receipt);
      options.onSuccess?.(state.hash!, receipt);
    }
  }, [receipt, state.status, state.hash, options]);
  
  // 重置状态
  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);
  
  return {
    ...state,
    isLoading: state.status === 'pending' || state.status === 'confirming',
    execute,
    reset,
  };
}

// 便捷 Hook: 铸造青蛙
export function useMintFrog(options: UseTransactionOptions = {}) {
  const tx = useTransaction(options);
  
  const mint = useCallback(async (name: string) => {
    const { ZETAFROG_ABI, ZETAFROG_ADDRESS } = await import('../config/contracts');
    
    return tx.execute({
      address: ZETAFROG_ADDRESS,
      abi: ZETAFROG_ABI,
      functionName: 'mintFrog',
      args: [name],
    });
  }, [tx]);
  
  return { ...tx, mint };
}

// 便捷 Hook: 发起旅行
export function useStartTravel(options: UseTransactionOptions = {}) {
  const tx = useTransaction(options);
  
  const startTravel = useCallback(async (
    tokenId: bigint,
    targetWallet: `0x${string}`,
    duration: bigint
  ) => {
    const { ZETAFROG_ABI, ZETAFROG_ADDRESS } = await import('../config/contracts');
    
    return tx.execute({
      address: ZETAFROG_ADDRESS,
      abi: ZETAFROG_ABI,
      functionName: 'startTravel',
      args: [tokenId, targetWallet, duration],
    });
  }, [tx]);
  
  return { ...tx, startTravel };
}
```

---

## 🎨 第五步：UI 组件

### 5.1 连接按钮组件

```tsx
// src/components/wallet/ConnectButton.tsx

import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../../hooks/useWallet';
import { formatSessionAge } from '../../services/wallet/sessionStore';

interface ConnectButtonProps {
  className?: string;
  showBalance?: boolean;
}

export function ConnectButton({ className = '', showBalance = true }: ConnectButtonProps) {
  const {
    address,
    shortAddress,
    isConnected,
    isConnecting,
    isCorrectChain,
    balance,
    balanceSymbol,
    session,
    connect,
    disconnect,
    switchToZetaChain,
  } = useWallet();

  // 未连接状态
  if (!isConnected) {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={connect}
        disabled={isConnecting}
        className={`
          relative overflow-hidden
          bg-gradient-to-r from-green-500 to-emerald-600
          hover:from-green-600 hover:to-emerald-700
          text-white font-semibold
          py-3 px-6 rounded-2xl
          shadow-lg shadow-green-500/25
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
      >
        <AnimatePresence mode="wait">
          {isConnecting ? (
            <motion.span
              key="connecting"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2"
            >
              <LoadingSpinner size={18} />
              连接中...
            </motion.span>
          ) : (
            <motion.span
              key="connect"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2"
            >
              <WalletIcon size={18} />
              连接钱包
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    );
  }

  // 错误链状态
  if (!isCorrectChain) {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={switchToZetaChain}
        className={`
          bg-gradient-to-r from-orange-500 to-amber-600
          hover:from-orange-600 hover:to-amber-700
          text-white font-semibold
          py-3 px-6 rounded-2xl
          shadow-lg shadow-orange-500/25
          transition-all duration-200
          ${className}
        `}
      >
        <span className="flex items-center gap-2">
          <AlertIcon size={18} />
          切换到 ZetaChain
        </span>
      </motion.button>
    );
  }

  // 已连接状态
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        flex items-center gap-3
        bg-white/80 backdrop-blur-sm
        border border-gray-200
        rounded-2xl px-4 py-2
        shadow-sm
        ${className}
      `}
    >
      {/* 连接状态指示 */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
          <div className="absolute inset-0 w-2.5 h-2.5 bg-green-500 rounded-full animate-ping opacity-75" />
        </div>
        
        {/* 钱包图标 */}
        {session?.metadata?.icon && (
          <img 
            src={session.metadata.icon} 
            alt={session.metadata.name} 
            className="w-5 h-5 rounded"
          />
        )}
      </div>
      
      {/* 地址和余额 */}
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-800">
          {shortAddress}
        </span>
        {showBalance && (
          <span className="text-xs text-gray-500">
            {parseFloat(balance).toFixed(4)} {balanceSymbol}
          </span>
        )}
      </div>
      
      {/* 断开按钮 */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={disconnect}
        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        title="断开连接"
      >
        <DisconnectIcon size={16} className="text-gray-400 hover:text-gray-600" />
      </motion.button>
    </motion.div>
  );
}

// 图标组件
function WalletIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" />
      <path d="M16 12h5" />
      <circle cx="18" cy="12" r="1" />
    </svg>
  );
}

function AlertIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function DisconnectIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin">
      <circle 
        cx="12" cy="12" r="10" 
        stroke="currentColor" 
        strokeWidth="3" 
        fill="none" 
        strokeLinecap="round"
        strokeDasharray="60"
        strokeDashoffset="20"
      />
    </svg>
  );
}
```

### 5.2 账户信息卡片

```tsx
// src/components/wallet/AccountCard.tsx

import { motion } from 'framer-motion';
import { useWallet } from '../../hooks/useWallet';
import { formatSessionAge } from '../../services/wallet/sessionStore';

export function AccountCard() {
  const {
    address,
    shortAddress,
    isConnected,
    balance,
    balanceSymbol,
    session,
    disconnect,
  } = useWallet();

  if (!isConnected) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl shadow-xl p-6 max-w-sm"
    >
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center">
            <span className="text-2xl">🐸</span>
          </div>
          <div>
            <h3 className="font-bold text-gray-800">ZetaFrog 钱包</h3>
            <p className="text-xs text-gray-500">
              {session ? formatSessionAge(Date.now() - session.connectedAt) : ''}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-xs text-green-600 font-medium">已连接</span>
        </div>
      </div>
      
      {/* 地址 */}
      <div className="bg-gray-50 rounded-2xl p-4 mb-4">
        <p className="text-xs text-gray-500 mb-1">钱包地址</p>
        <div className="flex items-center justify-between">
          <code className="text-sm font-mono text-gray-800">{shortAddress}</code>
          <button
            onClick={() => navigator.clipboard.writeText(address || '')}
            className="text-green-600 hover:text-green-700 text-sm font-medium"
          >
            复制
          </button>
        </div>
      </div>
      
      {/* 余额 */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 mb-6">
        <p className="text-xs text-gray-500 mb-1">余额</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-800">
            {parseFloat(balance).toFixed(4)}
          </span>
          <span className="text-sm text-gray-500">{balanceSymbol}</span>
        </div>
      </div>
      
      {/* 操作按钮 */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href={`https://athens.explorer.zetachain.com/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors"
        >
          <ExplorerIcon size={16} />
          查看详情
        </a>
        <button
          onClick={disconnect}
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-red-50 hover:bg-red-100 rounded-xl text-sm font-medium text-red-600 transition-colors"
        >
          <LogoutIcon size={16} />
          断开连接
        </button>
      </div>
    </motion.div>
  );
}

function ExplorerIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function LogoutIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
```

### 5.3 交易状态 Toast

```tsx
// src/components/wallet/TransactionToast.tsx

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { TransactionStatus } from '../../hooks/useTransaction';

interface TransactionToastProps {
  status: TransactionStatus;
  hash?: string;
  message?: string;
  onClose?: () => void;
}

export function TransactionToast({ status, hash, message, onClose }: TransactionToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status !== 'idle') {
      setVisible(true);
    }
    
    // 成功后 5 秒自动关闭
    if (status === 'success') {
      const timer = setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [status, onClose]);

  const configs = {
    pending: {
      icon: '⏳',
      title: '交易发送中',
      description: message || '请在钱包中确认交易...',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
    },
    confirming: {
      icon: '🔄',
      title: '等待确认',
      description: '交易已提交，等待区块确认...',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-800',
    },
    success: {
      icon: '✅',
      title: '交易成功',
      description: message || '交易已确认！',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
    },
    error: {
      icon: '❌',
      title: '交易失败',
      description: message || '交易执行失败，请重试',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
    },
    idle: null,
    simulating: null,
  };

  const config = configs[status];
  if (!config) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <div className={`
            ${config.bgColor} ${config.borderColor} border
            rounded-2xl shadow-lg p-4 max-w-sm
          `}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{config.icon}</span>
              
              <div className="flex-1">
                <h4 className={`font-semibold ${config.textColor}`}>
                  {config.title}
                </h4>
                <p className="text-sm text-gray-600 mt-0.5">
                  {config.description}
                </p>
                
                {hash && (
                  <a
                    href={`https://athens.explorer.zetachain.com/tx/${hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700 mt-2"
                  >
                    查看交易
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                )}
              </div>
              
              <button
                onClick={() => {
                  setVisible(false);
                  onClose?.();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

## 🚀 第六步：应用集成

### 6.1 Provider 包装

```tsx
// src/App.tsx

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from './config/wagmi';
import './config/web3modal'; // 初始化 Web3Modal
import { RouterProvider } from 'react-router-dom';
import { router } from './router';

const queryClient = new QueryClient();

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### 6.2 首页集成示例

```tsx
// src/pages/Home.tsx

import { motion } from 'framer-motion';
import { ConnectButton } from '../components/wallet/ConnectButton';
import { AccountCard } from '../components/wallet/AccountCard';
import { FrogPet } from '../components/frog/FrogPet';
import { FrogMint } from '../components/frog/FrogMint';
import { useWallet } from '../hooks/useWallet';

export function Home() {
  const { isConnected } = useWallet();

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-100">
      {/* 顶部导航 */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🐸</span>
            <span className="font-bold text-xl text-gray-800">ZetaFrog</span>
          </div>
          
          <ConnectButton showBalance />
        </div>
      </nav>

      {/* 主内容 */}
      <main className="pt-24 pb-12 px-6">
        <div className="max-w-6xl mx-auto">
          {/* 标题 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl font-bold text-gray-800 mb-4">
              🐸 ZetaFrog
            </h1>
            <p className="text-xl text-gray-600">
              你的跨链桌面宠物 —— 陪伴、探索、连接
            </p>
          </motion.div>

          {/* Demo 青蛙 */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="flex justify-center mb-12"
          >
            <FrogPet frogId={0} name="Demo Frog" status="Idle" />
          </motion.div>

          {/* 根据连接状态显示不同内容 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center gap-8"
          >
            {!isConnected ? (
              <div className="text-center">
                <p className="text-gray-600 mb-6">
                  连接钱包开始你的 ZetaFrog 之旅
                </p>
                <ConnectButton />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
                <AccountCard />
                <FrogMint />
              </div>
            )}
          </motion.div>

          {/* 功能卡片 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="grid md:grid-cols-3 gap-6 mt-16"
          >
            <FeatureCard
              emoji="🎨"
              title="独特 NFT"
              description="每只 ZetaFrog 旅游后都会生成独一无二的 NFT"
            />
            <FeatureCard
              emoji="🔍"
              title="钱包探索"
              description="派你的青蛙去观察任意以太坊钱包"
            />
            <FeatureCard
              emoji="📖"
              title="AI 故事"
              description="获得 AI 生成的旅行日记和纪念品"
            />
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ emoji, title, description }: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 text-center shadow-sm"
    >
      <div className="text-4xl mb-3">{emoji}</div>
      <h3 className="font-bold text-lg mb-2 text-gray-800">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </motion.div>
  );
}
```

---

## 📋 实施清单

```
□ 获取 WalletConnect Project ID
□ 安装依赖包
□ 配置环境变量
□ 创建链配置 (chains.ts)
□ 创建 Wagmi 配置 (wagmi.ts)
□ 创建 Web3Modal 配置 (web3modal.ts)
□ 实现会话存储 (sessionStore.ts)
□ 实现 useWallet Hook
□ 实现 useTransaction Hook
□ 创建 ConnectButton 组件
□ 创建 AccountCard 组件
□ 创建 TransactionToast 组件
□ 集成到 App.tsx
□ 测试连接流程
□ 测试交易签名流程
```

---

## ✨ 方案二优势总结

| 特点 | 说明 |
|------|------|
| **安全性高** | 私钥始终在用户自己的钱包中 |
| **信任度高** | 使用 MetaMask 等主流钱包 |
| **开发成本低** | 无需实现钱包核心功能 |
| **兼容性好** | 支持多种钱包和硬件钱包 |
| **用户体验** | Web3Modal 提供美观的 UI |
| **维护成本低** | 钱包更新由钱包提供商负责 |

这个方案非常适合 **Hackathon MVP**，可以快速实现钱包连接功能，同时保持高安全性和良好的用户体验！