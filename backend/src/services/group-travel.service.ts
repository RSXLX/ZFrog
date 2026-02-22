import { prisma } from '../database';
import { logger } from '../utils/logger';
import { ChainKey, SUPPORTED_CHAINS } from '../config/chains';

/**
 * 结伴旅行 V2.0 服务
 * 处理跨链结伴旅行的业务逻辑
 */
class GroupTravelService {
  
  /**
   * 准备结伴旅行 - 验证并返回费用估算
   */
  async prepareGroupTravel(
    leaderTokenId: number,
    companionTokenId: number,
    targetChainId: number,
    duration: number
  ) {
    // 1. 查询 Leader 青蛙
    const leader = await prisma.frog.findUnique({
      where: { tokenId: leaderTokenId }
    });
    if (!leader) {
      return { success: false, error: 'Leader frog not found' };
    }

    // 2. 查询 Companion 青蛙
    const companion = await prisma.frog.findUnique({
      where: { tokenId: companionTokenId }
    });
    if (!companion) {
      return { success: false, error: 'Companion frog not found' };
    }

    // 3. 验证好友关系
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: leader.id, addresseeId: companion.id, status: 'Accepted' },
          { requesterId: companion.id, addresseeId: leader.id, status: 'Accepted' }
        ]
      }
    });
    if (!friendship) {
      return { success: false, error: 'Not friends - must be friends to travel together' };
    }

    // 4. 检查两只青蛙状态
    if (leader.status !== 'Idle') {
      return { 
        success: false, 
        error: 'Leader is not idle',
        leaderStatus: leader.status
      };
    }
    if (companion.status !== 'Idle') {
      return { 
        success: false, 
        error: 'Companion is not idle',
        companionStatus: companion.status
      };
    }

    // 5. 计算干粮费用 (1.5 倍)
    const durationHours = Math.ceil(duration / 3600);
    const MIN_PROVISIONS = 0.01; // ZETA
    const PROVISIONS_PER_HOUR = 0.005; // ZETA
    const singleProvisions = MIN_PROVISIONS + (durationHours * PROVISIONS_PER_HOUR);
    const groupProvisions = singleProvisions * 1.5;

    return {
      success: true,
      data: {
        canStart: true,
        leaderStatus: leader.status,
        companionStatus: companion.status,
        isFriend: true,
        friendshipId: friendship.id,
        estimatedProvisions: (groupProvisions * 1e18).toString(), // wei
        estimatedProvisionsZeta: groupProvisions.toFixed(4),
        targetChain: Object.keys(SUPPORTED_CHAINS).find(
          key => SUPPORTED_CHAINS[key as ChainKey]?.chainId === targetChainId
        ) || 'UNKNOWN'
      }
    };
  }

  /**
   * 确认结伴旅行 - 链上交易成功后创建数据库记录
   */
  async confirmGroupTravel(params: {
    txHash: string;
    leaderTokenId: number;
    companionTokenId: number;
    targetChainId: number;
    duration: number;
    crossChainMessageId: string;
    provisionsUsed: string;
  }) {
    const { 
      txHash, 
      leaderTokenId, 
      companionTokenId, 
      targetChainId, 
      duration,
      crossChainMessageId,
      provisionsUsed
    } = params;

    // 1. 查询两只青蛙
    const leader = await prisma.frog.findUnique({ where: { tokenId: leaderTokenId } });
    const companion = await prisma.frog.findUnique({ where: { tokenId: companionTokenId } });

    if (!leader || !companion) {
      throw new Error('Frog not found');
    }

    // 2. 确定目标链类型
    let targetChain: 'BSC_TESTNET' | 'ETH_SEPOLIA' | 'ZETACHAIN_ATHENS' = 'ZETACHAIN_ATHENS';
    if (targetChainId === 97) targetChain = 'BSC_TESTNET';
    else if (targetChainId === 11155111) targetChain = 'ETH_SEPOLIA';

    // 3. 使用事务创建记录
    const result = await prisma.$transaction(async (tx) => {
      // 创建 Travel 记录
      const travel = await tx.travel.create({
        data: {
          frogId: leader.id,
          targetWallet: companion.ownerAddress,
          targetChain,
          chainId: targetChainId,
          isRandom: false,
          startTime: new Date(),
          endTime: new Date(Date.now() + duration * 1000),
          duration,
          status: 'Active',
          currentStage: 'CROSSING',
          progress: 0,
          startTxHash: txHash,
          isCrossChain: true,
          crossChainStatus: 'CROSSING_OUT',
          crossChainMessageId
        }
      });

      // 创建 GroupTravel 记录
      const groupTravel = await tx.groupTravel.create({
        data: {
          leaderId: leader.id,
          companionId: companion.id,
          travelId: travel.id,
          status: 'ACTIVE',
          isCrossChain: true,
          crossChainMessageId,
          targetChainId,
          provisionsUsed
        }
      });

      // 更新两只青蛙状态
      await tx.frog.update({
        where: { id: leader.id },
        data: { status: 'Traveling' }
      });
      await tx.frog.update({
        where: { id: companion.id },
        data: { status: 'Traveling' }
      });

      // 创建好友互动记录
      const friendship = await tx.friendship.findFirst({
        where: {
          OR: [
            { requesterId: leader.id, addresseeId: companion.id, status: 'Accepted' },
            { requesterId: companion.id, addresseeId: leader.id, status: 'Accepted' }
          ]
        }
      });

      if (friendship) {
        await tx.friendInteraction.create({
          data: {
            friendshipId: friendship.id,
            actorId: leader.id,
            type: 'Travel',
            message: `开始跨链结伴旅行到 ${targetChain}`,
            metadata: {
              travelId: travel.id,
              groupTravelId: groupTravel.id,
              isCrossChain: true
            }
          }
        });
      }

      return { travel, groupTravel };
    });

    logger.info(`[GroupTravelService] Created group travel: travel=${result.travel.id}, groupTravel=${result.groupTravel.id}`);

    return {
      success: true,
      data: {
        travelId: result.travel.id,
        groupTravelId: result.groupTravel.id
      }
    };
  }

  /**
   * 完成结伴旅行 - 更新状态并增加友情值
   */
  async completeGroupTravel(crossChainMessageId: string, xpReward: number = 50) {
    const groupTravel = await prisma.groupTravel.findUnique({
      where: { crossChainMessageId },
      include: { leader: true, companion: true, travel: true }
    });

    if (!groupTravel) {
      throw new Error('Group travel not found');
    }

    await prisma.$transaction(async (tx) => {
      // 1. 更新 Travel 状态
      await tx.travel.update({
        where: { id: groupTravel.travelId },
        data: {
          status: 'Completed',
          currentStage: 'RETURNING',
          progress: 100,
          crossChainStatus: 'COMPLETED',
          completedAt: new Date()
        }
      });

      // 2. 更新 GroupTravel 状态
      await tx.groupTravel.update({
        where: { id: groupTravel.id },
        data: { status: 'COMPLETED' }
      });

      // 3. 更新两只青蛙状态
      await tx.frog.update({
        where: { id: groupTravel.leaderId },
        data: { 
          status: 'Idle',
          xp: { increment: xpReward },
          totalTravels: { increment: 1 }
        }
      });
      await tx.frog.update({
        where: { id: groupTravel.companionId },
        data: { 
          status: 'Idle',
          xp: { increment: xpReward },
          totalTravels: { increment: 1 }
        }
      });

      // 4. 增加友情值
      const friendship = await tx.friendship.findFirst({
        where: {
          OR: [
            { requesterId: groupTravel.leaderId, addresseeId: groupTravel.companionId },
            { requesterId: groupTravel.companionId, addresseeId: groupTravel.leaderId }
          ],
          status: 'Accepted'
        }
      });

      if (friendship) {
        await tx.friendship.update({
          where: { id: friendship.id },
          data: {
            groupTravelCount: { increment: 1 },
            lastTravelTogether: new Date(),
            affinityLevel: { increment: 1 } // 每次结伴旅行增加 1 点友情等级（最高 10）
          }
        });

        // 创建完成互动记录
        await tx.friendInteraction.create({
          data: {
            friendshipId: friendship.id,
            actorId: groupTravel.leaderId,
            type: 'Travel',
            message: '完成跨链结伴旅行',
            metadata: {
              travelId: groupTravel.travelId,
              xpEarned: xpReward,
              completed: true
            }
          }
        });
      }
    });

    logger.info(`[GroupTravelService] Completed group travel: messageId=${crossChainMessageId}, xp=${xpReward}`);

    return { success: true };
  }
}

export const groupTravelService = new GroupTravelService();
