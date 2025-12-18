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