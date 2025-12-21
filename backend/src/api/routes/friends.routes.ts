import { Router } from 'express';
import { prisma } from '../../database';
import { FriendshipStatus, InteractionType } from '@prisma/client';
import { 
  notifyFriendRequestReceived, 
  notifyFriendRequestStatusChanged, 
  notifyFriendInteraction, 
  notifyFriendRemoved 
} from '../../websocket/index';

const router = Router();

/**
 * POST /api/friends/request
 * 发送好友请求
 */
router.post('/request', async (req, res) => {
    try {
        const { requesterId, addresseeId, walletAddress } = req.body;

        if (!requesterId) {
            return res.status(400).json({ error: 'Requester ID is required' });
        }

        let targetAddresseeId = addresseeId;

        // 如果提供了钱包地址，根据地址查找青蛙
        if (walletAddress && !addresseeId) {
            const targetFrog = await prisma.frog.findFirst({
                where: {
                    ownerAddress: {
                        equals: walletAddress.toLowerCase(),
                        mode: 'insensitive'
                    }
                }
            });

            if (!targetFrog) {
                return res.status(404).json({ error: 'No frog found with this wallet address' });
            }

            targetAddresseeId = targetFrog.id;
        }

        if (!targetAddresseeId) {
            return res.status(400).json({ error: 'Addressee ID or wallet address is required' });
        }
    if (requesterId === targetAddresseeId) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    // 检查青蛙是否存在
    const requester = await prisma.frog.findUnique({ where: { id: requesterId } });
    const addressee = await prisma.frog.findUnique({ where: { id: targetAddresseeId } });

    if (!requester || !addressee) {
      return res.status(404).json({ error: 'One or both frogs not found' });
    }

    // 检查是否已存在好友关系
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId: targetAddresseeId },
          { requesterId: targetAddresseeId, addresseeId: requesterId }
        ]
      }
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'Accepted') {
        return res.status(400).json({ error: 'Already friends' });
      } else if (existingFriendship.status === 'Pending') {
        return res.status(400).json({ error: 'Friend request already pending' });
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
        return res.json(friendship);
      }
    }

    // 创建新的好友请求
    const friendship = await prisma.friendship.create({
      data: {
        requesterId,
        addresseeId: targetAddresseeId,
        status: FriendshipStatus.Pending
      },
      include: {
        requester: true,
        addressee: true
      }
    });

    // 发送WebSocket通知给接收者
    notifyFriendRequestReceived(targetAddresseeId, friendship);

    res.status(201).json(friendship);
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ error: 'Internal server error' });
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
      return res.status(400).json({ error: 'Status must be Accepted or Declined' });
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
    }

    // 发送WebSocket通知给请求者
    notifyFriendRequestStatusChanged(friendship.requesterId, friendship.addresseeId, status);

    res.json(friendship);
  } catch (error) {
    console.error('Error responding to friend request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/friends/list/:frogId
 * 获取青蛙的好友列表
 */
router.get('/list/:frogId', async (req, res) => {
  try {
    const { frogId } = req.params;
    const { isFrogOnline } = require('../../websocket');

    const friendships = await prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.Accepted,
        OR: [
          { requesterId: parseInt(frogId) },
          { addresseeId: parseInt(frogId) }
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
      const friend = friendship.requesterId === parseInt(frogId) 
        ? friendship.addressee 
        : friendship.requester;
      
      return {
        ...friend,
        friendshipId: friendship.id,
        lastInteraction: friendship.interactions[0] || null,
        isOnline: isFrogOnline(friend.id)
      };
    });

    res.json(friends);
  } catch (error) {
    console.error('Error fetching friends list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/friends/requests/:frogId
 * 获取青蛙收到的好友请求
 */
router.get('/requests/:frogId', async (req, res) => {
  try {
    const { frogId } = req.params;

    const requests = await prisma.friendship.findMany({
      where: {
        addresseeId: parseInt(frogId),
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

    res.json(requests);
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/friends/:friendshipId
 * 删除好友关系
 */
router.delete('/:friendshipId', async (req, res) => {
  try {
    const { friendshipId } = req.params;

    // 检查好友关系是否存在
    const friendship = await prisma.friendship.findUnique({
      where: { id: parseInt(friendshipId) }
    });

    if (!friendship) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    // 删除相关的互动记录
    await prisma.friendInteraction.deleteMany({
      where: { friendshipId: parseInt(friendshipId) }
    });

    // 删除好友关系
    await prisma.friendship.delete({
      where: { id: parseInt(friendshipId) }
    });

    // 发送WebSocket通知给双方
    notifyFriendRemoved(friendship.requesterId, friendship.addresseeId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting friendship:', error);
    res.status(500).json({ error: 'Internal server error' });
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

    if (!actorId || !type) {
      return res.status(400).json({ error: 'Actor ID and interaction type are required' });
    }

    if (!Object.values(InteractionType).includes(type)) {
      return res.status(400).json({ error: 'Invalid interaction type' });
    }

    // 验证好友关系
    const friendship = await prisma.friendship.findUnique({
      where: { id: parseInt(friendshipId) }
    });

    if (!friendship || friendship.status !== FriendshipStatus.Accepted) {
      return res.status(404).json({ error: 'Friendship not found or not accepted' });
    }

    if (friendship.requesterId !== actorId && friendship.addresseeId !== actorId) {
      return res.status(403).json({ error: 'Not authorized to interact in this friendship' });
    }

    // 创建互动记录
    const interaction = await prisma.friendInteraction.create({
      data: {
        friendshipId: parseInt(friendshipId),
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

    // 发送WebSocket通知给好友双方
    const targetId = friendship.requesterId === actorId 
      ? friendship.addresseeId 
      : friendship.requesterId;
    notifyFriendInteraction(parseInt(friendshipId), actorId, targetId, interaction);

    res.status(201).json(interaction);
  } catch (error) {
    console.error('Error creating interaction:', error);
    res.status(500).json({ error: 'Internal server error' });
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

    const interactions = await prisma.friendInteraction.findMany({
      where: { friendshipId: parseInt(friendshipId) },
      include: {
        actor: true
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    res.json(interactions);
  } catch (error) {
    console.error('Error fetching interactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;