import { Router, Request, Response } from 'express';
import { communityService } from '../../services/community.service';

const router = Router();

/**
 * GET /communities/public
 * 获取所有公开社区
 */
router.get('/public', async (req: Request, res: Response) => {
  try {
    const communities = await communityService.getPublicCommunities();
    res.json({ success: true, data: communities });
  } catch (error) {
    console.error('Error fetching public communities:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /communities/user/:address
 * 获取用户加入的社区列表
 */
router.get('/user/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const communities = await communityService.getUserCommunities(address);
    res.json({ success: true, data: communities });
  } catch (error) {
    console.error('Error fetching user communities:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /communities/verify-credential
 * 验证凭证并加入社区
 */
router.post('/verify-credential', async (req: Request, res: Response) => {
  try {
    const { credential, userAddress } = req.body;
    
    if (!credential || !userAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: credential, userAddress' 
      });
    }
    
    const result = await communityService.verifyCredential(credential, userAddress);
    res.json(result);
  } catch (error) {
    console.error('Error verifying credential:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /communities/set-active
 * 设置活跃社区
 */
router.post('/set-active', async (req: Request, res: Response) => {
  try {
    const { userAddress, communityId } = req.body;
    
    if (!userAddress || !communityId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: userAddress, communityId' 
      });
    }
    
    const result = await communityService.setActiveCommunity(userAddress, communityId);
    res.json(result);
  } catch (error) {
    console.error('Error setting active community:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /communities/leave
 * 离开社区
 */
router.post('/leave', async (req: Request, res: Response) => {
  try {
    const { userAddress, communityId } = req.body;
    
    if (!userAddress || !communityId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: userAddress, communityId' 
      });
    }
    
    const result = await communityService.leaveCommunity(userAddress, communityId);
    res.json(result);
  } catch (error) {
    console.error('Error leaving community:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /communities/:id
 * 获取社区详情
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const community = await communityService.getCommunityById(id);
    
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }
    
    res.json({ success: true, data: community });
  } catch (error) {
    console.error('Error fetching community:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /communities/:id/members
 * 获取社区成员列表
 */
router.get('/:id/members', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const members = await communityService.getCommunityMembers(id, limit);
    res.json({ success: true, data: members });
  } catch (error) {
    console.error('Error fetching community members:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
