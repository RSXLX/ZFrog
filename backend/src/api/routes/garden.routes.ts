import { Router } from 'express';
import { prisma } from '../../database';
import { 
  notifyGardenVisitRequest,
  notifyGardenVisitorEntered,
  notifyGardenVisitorLeft,
  notifyGardenInteraction 
} from '../../websocket/index';

const router = Router();

/**
 * GET /api/garden/:frogId
 * 获取家园状态
 */
router.get('/:frogId', async (req, res) => {
  try {
    const frogId = parseInt(req.params.frogId);
    
    // 获取青蛙信息
    const frog = await prisma.frog.findUnique({
      where: { tokenId: frogId }
    });
    
    if (!frog) {
      return res.status(404).json({ error: 'Frog not found' });
    }
    
    // 获取当前访客（通过 FriendInteraction 中最近的 Visit 类型）
    const recentVisits = await prisma.friendInteraction.findMany({
      where: {
        type: 'Visit',
        createdAt: {
          gte: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2小时内
        },
        friendship: {
          OR: [
            { requesterId: frog.id },
            { addresseeId: frog.id }
          ],
          status: 'Accepted'
        }
      },
      include: {
        actor: true,
        friendship: {
          include: {
            requester: true,
            addressee: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    // 转换为访客列表
    const currentVisitors = recentVisits.map(visit => ({
      id: visit.id,
      guestFrogId: visit.actorId,
      guestFrog: visit.actor,
      hostFrogId: frog.id,
      status: 'Active',
      startedAt: visit.createdAt,
      duration: Math.floor((Date.now() - visit.createdAt.getTime()) / 60000)
    }));
    
    // 获取今日来访数量
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayVisitCount = await prisma.friendInteraction.count({
      where: {
        type: 'Visit',
        createdAt: { gte: todayStart },
        friendship: {
          OR: [
            { requesterId: frog.id },
            { addresseeId: frog.id }
          ]
        }
      }
    });
    
    // 获取总访客数量
    const totalVisitCount = await prisma.friendInteraction.count({
      where: {
        type: 'Visit',
        friendship: {
          OR: [
            { requesterId: frog.id },
            { addresseeId: frog.id }
          ]
        }
      }
    });
    
    res.json({
      success: true,
      data: {
        ownerId: frog.id,
        ownerFrog: frog,
        background: 'pond', // TODO: 从用户设置获取
        decorations: [],    // TODO: 从数据库获取装饰
        currentVisitors,
        pendingRequests: [],
        todayVisitCount,
        totalVisitCount
      }
    });
  } catch (error) {
    console.error('Error fetching garden state:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/garden/:frogId/visit
 * 发送访问请求（派青蛙去做客）
 */
router.post('/:frogId/visit', async (req, res) => {
  try {
    const hostFrogId = parseInt(req.params.frogId);
    const { guestFrogId, giftType } = req.body;
    
    if (!guestFrogId) {
      return res.status(400).json({ error: 'Guest frog ID is required' });
    }
    
    // 验证两只青蛙存在
    const [hostFrog, guestFrog] = await Promise.all([
      prisma.frog.findUnique({ where: { tokenId: hostFrogId } }),
      prisma.frog.findUnique({ where: { tokenId: guestFrogId } })
    ]);
    
    if (!hostFrog || !guestFrog) {
      return res.status(404).json({ error: 'One or both frogs not found' });
    }
    
    // 检查是否为好友
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: hostFrog.id, addresseeId: guestFrog.id },
          { requesterId: guestFrog.id, addresseeId: hostFrog.id }
        ],
        status: 'Accepted'
      }
    });
    
    if (!friendship) {
      return res.status(403).json({ error: 'You can only visit friends' });
    }
    
    // 创建访问互动记录
    const visit = await prisma.friendInteraction.create({
      data: {
        friendshipId: friendship.id,
        actorId: guestFrog.id,
        type: 'Visit',
        message: giftType ? `携带礼物：${giftType}` : null,
        metadata: giftType ? { giftType } : undefined
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
    
    // WebSocket 通知主人
    notifyGardenVisitorEntered(hostFrog.id, {
      id: visit.id,
      guestFrogId: guestFrog.id,
      guestFrog: guestFrog,
      hostFrogId: hostFrog.id,
      status: 'Active',
      startedAt: visit.createdAt
    });
    
    res.status(201).json({
      success: true,
      data: {
        visitId: visit.id,
        status: 'Active'
      }
    });
  } catch (error) {
    console.error('Error creating visit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/garden/:frogId/visitors
 * 获取当前访客列表
 */
router.get('/:frogId/visitors', async (req, res) => {
  try {
    const frogId = parseInt(req.params.frogId);
    
    const frog = await prisma.frog.findUnique({
      where: { tokenId: frogId }
    });
    
    if (!frog) {
      return res.status(404).json({ error: 'Frog not found' });
    }
    
    // 获取2小时内的访问记录
    const visitors = await prisma.friendInteraction.findMany({
      where: {
        type: 'Visit',
        createdAt: {
          gte: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        friendship: {
          OR: [
            { requesterId: frog.id },
            { addresseeId: frog.id }
          ],
          status: 'Accepted'
        },
        actorId: { not: frog.id } // 排除自己的访问
      },
      include: {
        actor: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      success: true,
      data: visitors.map(v => ({
        id: v.id,
        guestFrogId: v.actorId,
        guestFrog: v.actor,
        hostFrogId: frog.id,
        status: 'Active',
        startedAt: v.createdAt,
        duration: Math.floor((Date.now() - v.createdAt.getTime()) / 60000)
      }))
    });
  } catch (error) {
    console.error('Error fetching visitors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/garden/:frogId/interact
 * 与访客互动（点赞/喂食/送礼）
 */
router.post('/:frogId/interact', async (req, res) => {
  try {
    const frogId = parseInt(req.params.frogId);
    const { targetFrogId, type, data } = req.body;
    
    if (!targetFrogId || !type) {
      return res.status(400).json({ error: 'Target frog ID and interaction type are required' });
    }
    
    // 验证青蛙
    const [hostFrog, targetFrog] = await Promise.all([
      prisma.frog.findUnique({ where: { tokenId: frogId } }),
      prisma.frog.findUnique({ where: { tokenId: targetFrogId } })
    ]);
    
    if (!hostFrog || !targetFrog) {
      return res.status(404).json({ error: 'Frog not found' });
    }
    
    // 查找好友关系
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: hostFrog.id, addresseeId: targetFrog.id },
          { requesterId: targetFrog.id, addresseeId: hostFrog.id }
        ],
        status: 'Accepted'
      }
    });
    
    if (!friendship) {
      return res.status(403).json({ error: 'No friendship found' });
    }
    
    // 计算友好度增加值
    const friendshipPointsMap: Record<string, number> = {
      'like': 5,
      'feed': 10,
      'gift': 30,
      'photo': 15,
      'message': 5
    };
    const friendshipPoints = friendshipPointsMap[type] || 5;
    
    // 创建互动记录
    const interactionTypeMap: Record<string, string> = {
      'like': 'Play',
      'feed': 'Feed',
      'gift': 'Gift',
      'photo': 'Play',
      'message': 'Message'
    };
    
    const interaction = await prisma.friendInteraction.create({
      data: {
        friendshipId: friendship.id,
        actorId: hostFrog.id,
        type: interactionTypeMap[type] as any || 'Play',
        message: data?.message,
        metadata: { 
          gardenInteraction: true,
          interactionType: type,
          friendshipPoints,
          ...data 
        }
      },
      include: {
        actor: true
      }
    });
    
    // WebSocket 通知目标青蛙
    notifyGardenInteraction(targetFrog.id, {
      type,
      fromFrogId: hostFrog.id,
      fromFrog: hostFrog,
      friendshipPoints,
      interactionId: interaction.id
    });
    
    res.status(201).json({
      success: true,
      data: {
        interactionId: interaction.id,
        friendshipPoints,
        type
      }
    });
  } catch (error) {
    console.error('Error creating garden interaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/garden/:frogId/leave
 * 访客离开家园
 */
router.post('/:frogId/leave', async (req, res) => {
  try {
    const hostFrogId = parseInt(req.params.frogId);
    const { guestFrogId } = req.body;
    
    if (!guestFrogId) {
      return res.status(400).json({ error: 'Guest frog ID is required' });
    }
    
    const hostFrog = await prisma.frog.findUnique({ 
      where: { tokenId: hostFrogId } 
    });
    
    if (!hostFrog) {
      return res.status(404).json({ error: 'Host frog not found' });
    }
    
    // 通知主人访客离开
    notifyGardenVisitorLeft(hostFrog.id, {
      visitId: 0, // 简化实现
      guestFrogId
    });
    
    res.json({
      success: true,
      data: { message: 'Visitor left successfully' }
    });
  } catch (error) {
    console.error('Error processing visitor leave:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/garden/:frogId/messages
 * 获取家园留言板
 */
router.get('/:frogId/messages', async (req, res) => {
  try {
    const frogId = parseInt(req.params.frogId);
    const { limit = 20, offset = 0 } = req.query;
    
    const frog = await prisma.frog.findUnique({
      where: { tokenId: frogId }
    });
    
    if (!frog) {
      return res.status(404).json({ error: 'Frog not found' });
    }
    
    // 获取留言类型的互动
    const messages = await prisma.friendInteraction.findMany({
      where: {
        type: 'Message',
        friendship: {
          OR: [
            { requesterId: frog.id },
            { addresseeId: frog.id }
          ],
          status: 'Accepted'
        }
      },
      include: {
        actor: true,
        friendship: {
          include: {
            requester: true,
            addressee: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });
    
    res.json({
      success: true,
      data: messages.map(m => ({
        id: m.id,
        authorFrog: m.actor,
        content: m.message || '',
        createdAt: m.createdAt,
        likes: m.likesCount,  // Now using database field
        giftType: (m.metadata as any)?.giftType
      }))
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/garden/:frogId/messages
 * 发送留言
 */
router.post('/:frogId/messages', async (req, res) => {
  try {
    const frogId = parseInt(req.params.frogId);
    const { authorFrogId, content, isQuick } = req.body;
    
    if (!authorFrogId || !content) {
      return res.status(400).json({ error: 'Author frog ID and content are required' });
    }
    
    const [hostFrog, authorFrog] = await Promise.all([
      prisma.frog.findUnique({ where: { tokenId: frogId } }),
      prisma.frog.findUnique({ where: { tokenId: authorFrogId } })
    ]);
    
    if (!hostFrog || !authorFrog) {
      return res.status(404).json({ error: 'Frog not found' });
    }
    
    // 查找好友关系
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: hostFrog.id, addresseeId: authorFrog.id },
          { requesterId: authorFrog.id, addresseeId: hostFrog.id }
        ],
        status: 'Accepted'
      }
    });
    
    if (!friendship) {
      return res.status(403).json({ error: 'No friendship found' });
    }
    
    const message = await prisma.friendInteraction.create({
      data: {
        friendshipId: friendship.id,
        actorId: authorFrog.id,
        type: 'Message',
        message: content,
        metadata: { isQuick, gardenMessage: true }
      },
      include: {
        actor: true
      }
    });
    
    res.status(201).json({
      success: true,
      data: {
        id: message.id,
        authorFrog: message.actor,
        content: message.message,
        createdAt: message.createdAt,
        isQuick
      }
    });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/garden/:frogId/messages/:messageId/like
 * 点赞留言
 */
router.post('/:frogId/messages/:messageId/like', async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    
    // 增加点赞计数
    const message = await prisma.friendInteraction.update({
      where: { id: messageId },
      data: { likesCount: { increment: 1 } },
      include: { actor: true }
    });
    
    res.json({
      success: true,
      data: {
        id: message.id,
        likes: message.likesCount
      }
    });
  } catch (error) {
    console.error('Error liking message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
