import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CredentialType = 'PUBLIC' | 'NFT' | 'INVITE_CODE' | 'SIGNATURE';

export interface Community {
  id: string;
  name: string;
  icon: string;
  themeColor: string;
  credentialType: CredentialType;
  credentialContract?: string;
  memberCount: number;
  description?: string;
}

export interface UserCommunity {
  communityId: string;
  community: Community;
  joinedAt: Date;
  credential?: string;
  isActive: boolean;
}

interface CommunityState {
  // 用户加入的社区列表
  userCommunities: UserCommunity[];
  // 当前激活的社区
  activeCommunity: Community | null;
  // 加载状态
  loading: boolean;
  
  // Actions
  setUserCommunities: (communities: UserCommunity[]) => void;
  setActiveCommunity: (community: Community | null) => void;
  addCommunity: (userCommunity: UserCommunity) => void;
  removeCommunity: (communityId: string) => void;
  setLoading: (loading: boolean) => void;
}

// 默认公共社区
export const DEFAULT_COMMUNITY: Community = {
  id: 'zetafrog-official',
  name: 'ZetaFrog Official',
  icon: '🏠',
  themeColor: '#4CAF50',
  credentialType: 'PUBLIC',
  memberCount: 0,
  description: '官方默认社区，所有用户自动加入',
};

export const useCommunityStore = create<CommunityState>()(
  persist(
    (set) => ({
      userCommunities: [],
      activeCommunity: DEFAULT_COMMUNITY,
      loading: false,

      setUserCommunities: (communities) => set({ userCommunities: communities }),
      
      setActiveCommunity: (community) => set({ activeCommunity: community }),
      
      addCommunity: (userCommunity) => set((state) => ({
        userCommunities: [...state.userCommunities, userCommunity],
      })),
      
      removeCommunity: (communityId) => set((state) => ({
        userCommunities: state.userCommunities.filter(uc => uc.communityId !== communityId),
        // 如果移除的是当前激活的社区，切换到默认社区
        activeCommunity: state.activeCommunity?.id === communityId 
          ? DEFAULT_COMMUNITY 
          : state.activeCommunity,
      })),
      
      setLoading: (loading) => set({ loading }),
    }),
    {
      name: 'community-storage',
      partialize: (state) => ({
        activeCommunity: state.activeCommunity,
      }),
    }
  )
);
