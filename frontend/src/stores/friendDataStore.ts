import { create } from 'zustand';
import { Frog } from '../types';
import { apiService } from '../services/api';

interface Friend extends Frog {
  friendshipId: number;
  lastInteraction?: {
    type: string;
    createdAt: string;
  } | null;
  isOnline?: boolean;
}

interface FriendRequest {
  id: number;
  requesterId: number;
  requester: Frog;
  createdAt: string;
}

interface FriendDataState {
  // 好友数据
  friends: Friend[];
  requests: FriendRequest[];
  
  // 未读计数
  unreadCount: number;
  pendingRequestCount: number;
  
  // 加载状态
  loading: boolean;
  error: string | null;
  
  // Actions
  setFriends: (friends: Friend[]) => void;
  addFriend: (friend: Friend) => void;
  removeFriend: (friendshipId: number) => void;
  updateFriendOnlineStatus: (frogId: number, isOnline: boolean) => void;
  
  setRequests: (requests: FriendRequest[]) => void;
  addRequest: (request: FriendRequest) => void;
  removeRequest: (requestId: number) => void;
  
  setUnreadCount: (count: number) => void;
  setPendingRequestCount: (count: number) => void;
  incrementUnread: () => void;
  clearUnread: () => void;
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // 数据获取
  fetchFriends: (frogId: number) => Promise<void>;
  fetchRequests: (frogId: number) => Promise<void>;
}

/**
 * 好友业务数据 Store
 * 负责好友列表、请求、未读计数等业务数据
 * 不持久化，每次刷新从服务器获取
 */
export const useFriendDataStore = create<FriendDataState>()((set, get) => ({
  // 初始状态
  friends: [],
  requests: [],
  unreadCount: 0,
  pendingRequestCount: 0,
  loading: false,
  error: null,

  // 好友列表 Actions
  setFriends: (friends) => set({ friends }),
  
  addFriend: (friend) => set((state) => ({
    friends: [...state.friends, friend]
  })),
  
  removeFriend: (friendshipId) => set((state) => ({
    friends: state.friends.filter(f => f.friendshipId !== friendshipId)
  })),
  
  updateFriendOnlineStatus: (frogId, isOnline) => set((state) => ({
    friends: state.friends.map(f => 
      f.id === frogId ? { ...f, isOnline } : f
    )
  })),

  // 请求列表 Actions
  setRequests: (requests) => set({ 
    requests,
    pendingRequestCount: requests.length 
  }),
  
  addRequest: (request) => set((state) => ({
    requests: [...state.requests, request],
    pendingRequestCount: state.pendingRequestCount + 1
  })),
  
  removeRequest: (requestId) => set((state) => ({
    requests: state.requests.filter(r => r.id !== requestId),
    pendingRequestCount: Math.max(0, state.pendingRequestCount - 1)
  })),

  // 未读计数 Actions
  setUnreadCount: (count) => set({ unreadCount: count }),
  setPendingRequestCount: (count) => set({ pendingRequestCount: count }),
  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  clearUnread: () => set({ unreadCount: 0 }),

  // 加载状态 Actions
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // 数据获取
  fetchFriends: async (frogId: number) => {
    set({ loading: true, error: null });
    try {
      const response = await apiService.get(`/friends/list/${frogId}`);
      if (response.success) {
        set({ friends: response.data || [], loading: false });
      } else {
        set({ error: response.message || 'Failed to fetch friends', loading: false });
      }
    } catch (error) {
      set({ error: 'Network error', loading: false });
    }
  },

  fetchRequests: async (frogId: number) => {
    try {
      const response = await apiService.get(`/friends/requests/${frogId}`);
      if (response.success) {
        const requests = response.data || [];
        set({ 
          requests,
          pendingRequestCount: requests.length 
        });
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    }
  },
}));
