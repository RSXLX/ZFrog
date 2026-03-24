import { Router } from 'express';
import { prisma } from '../../database';
import { FriendshipStatus, InteractionType } from '@prisma/client';
import { 
  notifyFriendRequestReceived, 
  notifyFriendRequestStatusChanged, 
  notifyFriendInteraction, 
  notifyFriendRemoved 
} from '../../websocket/index';
import * as intimacyService from '../../services/intimacy.service';
import * as notificationService from '../../services/notification.service';
import { badgeMaintenanceService } from '../../services/badge/badge-maintenance.service';
import { ApiRes, ErrorCode } from '../../utils/apiResponse';

const router: Router = Router();

/**
 * POST /api/friends/request
 * 发送好友请求
 */
/**
 * POST /api/friends/request
 * 发送好友请求
 * 注意: requesterId 和 addresseeId 现在接受 tokenId (NFT ID)
 */
router.post('/request', async (req, res) => {
    try {
        const { requesterId, addresseeId, walletAddress } = req.body;

        // 严格检查 requesterId（支持 tokenId = 0 的情况）
        if (requesterId === undefined || requesterId === null) {
            return ApiRes.validationError(res, 'Requester ID is required');
        }

        // 将 requesterId (tokenId) 转换为数据库 ID
        const requesterFrog = await prisma.frog.findUnique({ 
            where: { tokenId: requesterId } 
        });

        if (!requesterFrog) {
            return ApiRes.notFound(res, 'Requester frog not found');
        }

        let targetAddresseeFrog = null;

        // 如果提供了钱包地址，根据地址查找青蛙
        if (walletAddress && !addresseeId) {
            targetAddresseeFrog = await prisma.frog.findFirst({
                where: {
                    ownerAddress: {
                        equals: walletAddress.toLowerCase(),
                        mode: 'insensitive'
                    }
                }
            });

            if (!targetAddresseeFrog) {
                return ApiRes.notFound(res, 'No frog found with this wallet address');
            }
        } else if (addresseeId) {
            // 将 addresseeId (tokenId) 转换为数据库 ID
            targetAddresseeFrog = await prisma.frog.findUnique({ 
                where: { tokenId: addresseeId } 
            });

            if (!targetAddresseeFrog) {
                return ApiRes.notFound(res, 'Addressee frog not found');
            }
        }

        if (!targetAddresseeFrog) {
            return ApiRes.validationError(res, 'Addressee ID or wallet address is required');
        }

        // 使用数据库 ID 进行比较
        if (requesterFrog.id === targetAddresseeFrog.id) {
            return ApiRes.validationError(res, 'Cannot send friend request to yourself');
        }

        // 检查是否已存在好友关系
        const existingFriendship = await prisma.friendship.findFirst({
            where: {
                OR: [
                    { requesterId: requesterFrog.id, addresseeId: targetAddresseeFrog.id },
                    { requesterId: targetAddresseeFrog.id, addresseeId: requesterFrog.id }
                ]
            }
        });

        if (existingFriendship) {
            if (existingFriendship.status === 'Accepted') {
                return ApiRes.validationError(res, 'Already friends');
            } else if (existingFriendship.status === 'Pending') {
                return ApiRes.validationError(res, 'Friend request already pending');
            } else {
                // 如果是之前拒绝或拉黑的关系，更新为待处理
                const friendship = await prisma.friendship.update({
                    where: { id: existingFriendship.id },
                    data: { status: FriendshipStatus.Pending, updatedAt: new Date() },
                    include: {
                        requester: true,
                        addressee: true
                    }
                });
                return ApiRes.success(res, friendship, 'Friend request resent');
            }
        }

        // 创建新的好友请求（使用数据库 ID）
        const friendship = await prisma.friendship.create({
            data: {
                requesterId: requesterFrog.id,
                addresseeId: targetAddresseeFrog.id,
                status: FriendshipStatus.Pending
            },
            include: {
                requester: true,
                addressee: true
            }
        });

        // 发送WebSocket通知给接收者（使用数据库 ID）
        notifyFriendRequestReceived(targetAddresseeFrog.id, friendship);

        return ApiRes.created(res, friendship, 'Friend request sent');
    } catch (error) {
        console.error('Error sending friend request:', error);
        return ApiRes.serverError(res, error as Error);
    }
});

/**
 * PUT /api/friends/request/:id/respond
 * 响应好友请求 (接受/拒绝)
 */
router.put('/request/:id/respond', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, message } = req.body;

    if (!['Accepted', 'Declined'].includes(status)) {
      return ApiRes.validationError(res, 'Status must be Accepted or Declined');
    }

    const friendship = await prisma.friendship.update({
      where: { id: parseInt(id) },
      data: { 
        status: status as FriendshipStatus,
        updatedAt: new Date()
      },
      include: {
        requester: true,
        addressee: true
      }
    });

    // 如果接受请求，创建互动记录
    if (status === 'Accepted') {
      await prisma.friendInteraction.create({
        data: {
          friendshipId: friendship.id,
          actorId: friendship.addresseeId,
          type: InteractionType.Message,
          message: message || '我们成为朋友啦！🐸'
        }
      });

      try {
        await badgeMaintenanceService.reconcileFrogBadges(
          { frogId: friendship.requesterId },
          { syncDefinitions: false, syncStats: false }
        );
        await badgeMaintenanceService.reconcileFrogBadges(
          { frogId: friendship.addresseeId },
          { syncDefinitions: false, syncStats: false }
        );
      } catch (badgeError) {
        console.warn('[Friends] Failed to reconcile badge progress:', badgeError);
      }
    }

    // 发送WebSocket通知给请求者
    notifyFriendRequestStatusChanged(friendship.requesterId, friendship.addresseeId, status);

    return ApiRes.success(res, friendship, `Friend request ${status.toLowerCase()}`);
  } catch (error) {
    console.error('Error responding to friend request:', error);
    return ApiRes.serverError(res, error as Error);
  }
});

/**
 * GET /api/friends/list/:frogId
 * 获取青蛙的好友列表
 * 注意: frogId 参数为 NFT tokenId，非数据库 id
 */
router.get('/list/:frogId', async (req, res) => {
  try {
    const tokenId = parseInt(req.params.frogId);
    const { isFrogOnline } = require('../../websocket');
    if (isNaN(tokenId)) {
      return ApiRes.validationError(res, 'Invalid frogId');
    }
    
    // 先根据 tokenId 查找青蛙
    const frog = await prisma.frog.findUnique({
      where: { tokenId }
    });
    
    if (!frog) {
      return ApiRes.notFound(res, 'Frog not found');
    }
    
    const dbFrogId = frog.id;

    const friendships = await prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.Accepted,
        OR: [
          { requesterId: dbFrogId },
          { addresseeId: dbFrogId }
        ]
      },
      include: {
        requester: {
          include: {
            travels: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        },
        addressee: {
          include: {
            travels: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        },
        interactions: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    // 提取好友信息（排除自己）
    const friends = friendships.map(friendship => {
      const friend = friendship.requesterId === dbFrogId 
        ? friendship.addressee 
        : friendship.requester;
      
      return {
        ...friend,
        friendshipId: friendship.id,
        lastInteraction: friendship.interactions[0] || null,
        isOnline: isFrogOnline(friend.id),
        // P3.1 亲密度数据
        intimacy: friendship.intimacy,
        intimacyLevel: friendship.intimacyLevel,
      };
    });

    return ApiRes.success(res, friends);
  } catch (error) {
    console.error('Error fetching friends list:', error);
    return ApiRes.serverError(res, error as Error);
  }
});

/**
 * GET /api/friends/requests/:frogId
 * 获取青蛙收到的好友请求
 * 注意: frogId 参数为 NFT tokenId，非数据库 id
 */
router.get('/requests/:frogId', async (req, res) => {
  try {
    const tokenId = parseInt(req.params.frogId);
    if (isNaN(tokenId)) {
      return ApiRes.validationError(res, 'Invalid frogId');
    }
    
    // 先根据 tokenId 查找青蛙
    const frog = await prisma.frog.findUnique({
      where: { tokenId }
    });
    
    if (!frog) {
      return ApiRes.notFound(res, 'Frog not found');
    }

    const requests = await prisma.friendship.findMany({
      where: {
        addresseeId: frog.id,
        status: FriendshipStatus.Pending
      },
      include: {
        requester: {
          include: {
            travels: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        },
        addressee: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return ApiRes.success(res, requests);
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    return ApiRes.serverError(res, error as Error);
  }
});

/**
 * DELETE /api/friends/:friendshipId
 * 删除好友关系
 */
router.delete('/:friendshipId', async (req, res) => {
  try {
    const { friendshipId } = req.params;
    const id = parseInt(friendshipId);
    if (isNaN(id)) {
      return ApiRes.validationError(res, 'Invalid friendshipId');
    }

    // 检查好友关系是否存在
    const friendship = await prisma.friendship.findUnique({
      where: { id }
    });

    if (!friendship) {
      return ApiRes.notFound(res, 'Friendship not found');
    }

    // 删除相关的互动记录
    await prisma.friendInteraction.deleteMany({
      where: { friendshipId: id }
    });

    // 删除好友关系
    await prisma.friendship.delete({
      where: { id }
    });

    // 发送WebSocket通知给双方
    notifyFriendRemoved(friendship.requesterId, friendship.addresseeId);

    return ApiRes.deleted(res, 'Friendship deleted');
  } catch (error) {
    console.error('Error deleting friendship:', error);
    return ApiRes.serverError(res, error as Error);
  }
});

/**
 * POST /api/friends/:friendshipId/interact
 * 与好友互动
 */
router.post('/:friendshipId/interact', async (req, res) => {
  try {
    const { friendshipId } = req.params;
    const { actorId, type, message, metadata } = req.body;
    const id = parseInt(friendshipId);
    if (isNaN(id)) {
      return ApiRes.validationError(res, 'Invalid friendshipId');
    }

    if (!actorId || !type) {
      return ApiRes.validationError(res, 'Actor ID and interaction type are required');
    }

    if (!Object.values(InteractionType).includes(type)) {
      return ApiRes.validationError(res, 'Invalid interaction type');
    }

    // 验证好友关系
    const friendship = await prisma.friendship.findUnique({
      where: { id }
    });

    if (!friendship || friendship.status !== FriendshipStatus.Accepted) {
      return ApiRes.notFound(res, 'Friendship not found or not accepted');
    }

    if (friendship.requesterId !== actorId && friendship.addresseeId !== actorId) {
      return ApiRes.error(res, ErrorCode.FORBIDDEN, 'Not authorized to interact in this friendship', 403);
    }

    // 创建互动记录
    const interaction = await prisma.friendInteraction.create({
      data: {
        friendshipId: id,
        actorId,
        type: type as InteractionType,
        message,
        metadata: metadata || {}
      },
      include: {
        actor: true,
        friendship: {
          include: {
            requester: true,
            addressee: true
          }
        }
      }
    });

    // 记录亲密度
    const intimacyResult = await intimacyService.recordInteraction(
      id,
      type as InteractionType,
      metadata?.giftValue
    );

    // 如果亲密度升级，发送通知
    if (intimacyResult.levelUp) {
      const levelInfo = intimacyService.getIntimacyLevel(intimacyResult.newIntimacy);
      const targetFrogId = friendship.requesterId === actorId 
        ? friendship.addresseeId 
        : friendship.requesterId;
      
      await notificationService.createNotification(
        targetFrogId,
        notificationService.NotificationType.INTIMACY_LEVEL_UP,
        { friendName: interaction.actor.name, levelName: levelInfo.name }
      );
    }

    // 发送WebSocket通知给好友双方
    const targetId = friendship.requesterId === actorId 
      ? friendship.addresseeId 
      : friendship.requesterId;
    notifyFriendInteraction(id, actorId, targetId, interaction);

    return ApiRes.created(
      res,
      {
        ...interaction,
        intimacy: intimacyResult,
      },
      'Interaction created'
    );
  } catch (error) {
    console.error('Error creating interaction:', error);
    return ApiRes.serverError(res, error as Error);
  }
});

/**
 * GET /api/friends/:friendshipId/interactions
 * 获取好友间的互动记录
 */
router.get('/:friendshipId/interactions', async (req, res) => {
  try {
    const { friendshipId } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    const id = parseInt(friendshipId);
    if (isNaN(id)) {
      return ApiRes.validationError(res, 'Invalid friendshipId');
    }

    const interactions = await prisma.friendInteraction.findMany({
      where: { friendshipId: id },
      include: {
        actor: true
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    return ApiRes.success(res, interactions);
  } catch (error) {
    console.error('Error fetching interactions:', error);
    return ApiRes.serverError(res, error as Error);
  }
});

/**
 * GET /api/friends/:friendshipId/intimacy
 * 获取亲密度详情
 */
router.get('/:friendshipId/intimacy', async (req, res) => {
  try {
    const friendshipId = parseInt(req.params.friendshipId);
    if (isNaN(friendshipId)) {
      return ApiRes.validationError(res, 'Invalid friendshipId');
    }
    
    const intimacyDetails = await intimacyService.getFriendshipIntimacy(friendshipId);
    
    if (!intimacyDetails) {
      return ApiRes.notFound(res, 'Friendship not found');
    }
    
    return ApiRes.success(res, intimacyDetails);
  } catch (error) {
    console.error('Error fetching intimacy details:', error);
    return ApiRes.serverError(res, error as Error);
  }
});

/**
 * GET /api/friends/:friendshipId/daily-limit/:type
 * 检查每日互动限制
 */
router.get('/:friendshipId/daily-limit/:type', async (req, res) => {
  try {
    const friendshipId = parseInt(req.params.friendshipId);
    const type = req.params.type as InteractionType;
    if (isNaN(friendshipId)) {
      return ApiRes.validationError(res, 'Invalid friendshipId');
    }
    
    const limitCheck = await intimacyService.checkDailyLimit(friendshipId, type);
    
    return ApiRes.success(res, limitCheck);
  } catch (error) {
    console.error('Error checking daily limit:', error);
    return ApiRes.serverError(res, error as Error);
  }
});

export default router;
