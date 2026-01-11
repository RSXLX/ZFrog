import { PrismaClient, CommunityCredentialType } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

interface VerifyCredentialResult {
  success: boolean;
  community?: {
    id: string;
    name: string;
    icon: string;
    themeColor: string;
    credentialType: CommunityCredentialType;
    memberCount: number;
    description?: string | null;
  };
  message?: string;
}

export class CommunityService {
  
  /**
   * 获取所有公开社区
   */
  async getPublicCommunities() {
    return prisma.community.findMany({
      where: {
        isActive: true,
        credentialType: 'PUBLIC',
      },
      orderBy: { memberCount: 'desc' },
    });
  }
  
  /**
   * 获取用户加入的社区列表
   */
  async getUserCommunities(userAddress: string) {
    const userCommunities = await prisma.userCommunity.findMany({
      where: { userAddress: userAddress.toLowerCase() },
      include: { community: true },
      orderBy: { joinedAt: 'desc' },
    });
    
    return userCommunities.map(uc => ({
      communityId: uc.communityId,
      community: uc.community,
      joinedAt: uc.joinedAt,
      isActive: uc.isActive,
    }));
  }
  
  /**
   * 验证凭证并加入社区
   */
  async verifyCredential(credential: string, userAddress: string): Promise<VerifyCredentialResult> {
    // 首先尝试查找邀请码类型的社区
    const inviteCodeCommunity = await prisma.community.findFirst({
      where: {
        isActive: true,
        credentialType: 'INVITE_CODE',
        credentialData: {
          path: ['codes'],
          array_contains: credential.toUpperCase(),
        },
      },
    });
    
    if (inviteCodeCommunity) {
      // 检查是否已加入
      const existing = await prisma.userCommunity.findUnique({
        where: {
          userAddress_communityId: {
            userAddress: userAddress.toLowerCase(),
            communityId: inviteCodeCommunity.id,
          },
        },
      });
      
      if (existing) {
        return {
          success: false,
          message: '你已经加入了这个社区',
        };
      }
      
      // 加入社区
      await prisma.$transaction([
        prisma.userCommunity.create({
          data: {
            userAddress: userAddress.toLowerCase(),
            communityId: inviteCodeCommunity.id,
            credential,
          },
        }),
        prisma.community.update({
          where: { id: inviteCodeCommunity.id },
          data: { memberCount: { increment: 1 } },
        }),
      ]);
      
      return {
        success: true,
        community: inviteCodeCommunity,
      };
    }
    
    // 尝试作为 NFT 合约地址
    if (ethers.isAddress(credential)) {
      const nftCommunity = await prisma.community.findFirst({
        where: {
          isActive: true,
          credentialType: 'NFT',
          credentialData: {
            path: ['contractAddress'],
            equals: credential.toLowerCase(),
          },
        },
      });
      
      if (nftCommunity) {
        // TODO: 验证用户是否持有该 NFT
        // 这里需要调用链上查询
        
        const existing = await prisma.userCommunity.findUnique({
          where: {
            userAddress_communityId: {
              userAddress: userAddress.toLowerCase(),
              communityId: nftCommunity.id,
            },
          },
        });
        
        if (existing) {
          return {
            success: false,
            message: '你已经加入了这个社区',
          };
        }
        
        await prisma.$transaction([
          prisma.userCommunity.create({
            data: {
              userAddress: userAddress.toLowerCase(),
              communityId: nftCommunity.id,
              credential,
            },
          }),
          prisma.community.update({
            where: { id: nftCommunity.id },
            data: { memberCount: { increment: 1 } },
          }),
        ]);
        
        return {
          success: true,
          community: nftCommunity,
        };
      }
    }
    
    return {
      success: false,
      message: '无效的社区凭证',
    };
  }
  
  /**
   * 设置活跃社区
   */
  async setActiveCommunity(userAddress: string, communityId: string) {
    // 先取消所有活跃状态
    await prisma.userCommunity.updateMany({
      where: { userAddress: userAddress.toLowerCase() },
      data: { isActive: false },
    });
    
    // 设置新的活跃社区
    await prisma.userCommunity.update({
      where: {
        userAddress_communityId: {
          userAddress: userAddress.toLowerCase(),
          communityId,
        },
      },
      data: { isActive: true },
    });
    
    return { success: true };
  }
  
  /**
   * 离开社区
   */
  async leaveCommunity(userAddress: string, communityId: string) {
    const userCommunity = await prisma.userCommunity.findUnique({
      where: {
        userAddress_communityId: {
          userAddress: userAddress.toLowerCase(),
          communityId,
        },
      },
    });
    
    if (!userCommunity) {
      return { success: false, message: '你没有加入这个社区' };
    }
    
    await prisma.$transaction([
      prisma.userCommunity.delete({
        where: { id: userCommunity.id },
      }),
      prisma.community.update({
        where: { id: communityId },
        data: { memberCount: { decrement: 1 } },
      }),
    ]);
    
    return { success: true };
  }
  
  /**
   * 创建社区
   */
  async createCommunity(params: {
    name: string;
    icon?: string;
    themeColor?: string;
    description?: string;
    credentialType: CommunityCredentialType;
    credentialData?: object;
    creatorAddress: string;
  }) {
    const community = await prisma.community.create({
      data: {
        name: params.name,
        icon: params.icon || '🏠',
        themeColor: params.themeColor || '#4CAF50',
        description: params.description,
        credentialType: params.credentialType,
        credentialData: params.credentialData,
        creatorAddress: params.creatorAddress.toLowerCase(),
      },
    });
    
    // 创建者自动加入
    await prisma.userCommunity.create({
      data: {
        userAddress: params.creatorAddress.toLowerCase(),
        communityId: community.id,
        isActive: true,
      },
    });
    
    await prisma.community.update({
      where: { id: community.id },
      data: { memberCount: 1 },
    });
    
    return community;
  }
  
  /**
   * 获取社区详情
   */
  async getCommunityById(communityId: string) {
    return prisma.community.findUnique({
      where: { id: communityId },
    });
  }
  
  /**
   * 获取社区成员列表
   */
  async getCommunityMembers(communityId: string, limit = 50) {
    return prisma.userCommunity.findMany({
      where: { communityId },
      take: limit,
      orderBy: { joinedAt: 'asc' },
    });
  }
}

export const communityService = new CommunityService();
