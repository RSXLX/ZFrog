import { Router, Request, Response } from 'express';
import { communityService } from '../../services/community.service';
import { authOptional } from '../../middlewares/auth.middleware';
import { ApiRes } from '../../utils/apiResponse';

const router: Router = Router();
router.use(authOptional);

function getRequestAddress(req: Request): string | undefined {
  const bodyAddress = typeof req.body?.userAddress === 'string' ? req.body.userAddress : undefined;
  if (bodyAddress) return bodyAddress.toLowerCase();

  if (req.user?.address) return req.user.address.toLowerCase();

  const rawHeaderAddress = req.headers['x-wallet-address'] ?? req.headers['x-admin-address'];
  const headerAddress = Array.isArray(rawHeaderAddress) ? rawHeaderAddress[0] : rawHeaderAddress;
  if (typeof headerAddress === 'string' && headerAddress) {
    return headerAddress.toLowerCase();
  }

  return undefined;
}

/**
 * GET /communities/public
 * 获取所有公开社区
 */
router.get('/public', async (req: Request, res: Response) => {
  try {
    const communities = await communityService.getPublicCommunities();
    return ApiRes.success(res, communities);
  } catch (error) {
    console.error('Error fetching public communities:', error);
    return ApiRes.serverError(res, error instanceof Error ? error : undefined);
  }
});

/**
 * GET /communities/user/:address
 * 获取用户加入的社区列表
 */
router.get('/user/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    if (!address) {
      return ApiRes.validationError(res, 'Address is required');
    }
    const communities = await communityService.getUserCommunities(address);
    return ApiRes.success(res, communities);
  } catch (error) {
    console.error('Error fetching user communities:', error);
    return ApiRes.serverError(res, error instanceof Error ? error : undefined);
  }
});

/**
 * POST /communities/verify-credential
 * 验证凭证并加入社区
 */
router.post('/verify-credential', async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;
    const userAddress = getRequestAddress(req);
    
    if (!credential || !userAddress) {
      return ApiRes.validationError(res, 'Missing required fields: credential, userAddress');
    }
    
    const result = await communityService.verifyCredential(credential, userAddress);
    if (!result.success) {
      return ApiRes.validationError(res, result.message || 'Credential verification failed');
    }

    return ApiRes.success(res, { community: result.community });
  } catch (error) {
    console.error('Error verifying credential:', error);
    return ApiRes.serverError(res, error instanceof Error ? error : undefined);
  }
});

/**
 * POST /communities/set-active
 * 设置活跃社区
 */
router.post('/set-active', async (req: Request, res: Response) => {
  try {
    const userAddress = getRequestAddress(req);
    const { communityId } = req.body;
    
    if (!userAddress || !communityId) {
      return ApiRes.validationError(res, 'Missing required fields: userAddress, communityId');
    }
    
    const result = await communityService.setActiveCommunity(userAddress, communityId);
    if (!result.success) {
      return ApiRes.validationError(res, 'Failed to set active community');
    }

    return ApiRes.success(res, result);
  } catch (error) {
    console.error('Error setting active community:', error);
    return ApiRes.serverError(res, error instanceof Error ? error : undefined);
  }
});

/**
 * POST /communities/leave
 * 离开社区
 */
router.post('/leave', async (req: Request, res: Response) => {
  try {
    const userAddress = getRequestAddress(req);
    const { communityId } = req.body;
    
    if (!userAddress || !communityId) {
      return ApiRes.validationError(res, 'Missing required fields: userAddress, communityId');
    }
    
    const result = await communityService.leaveCommunity(userAddress, communityId);
    if (!result.success) {
      return ApiRes.validationError(res, result.message || 'Failed to leave community');
    }

    return ApiRes.success(res, result);
  } catch (error) {
    console.error('Error leaving community:', error);
    return ApiRes.serverError(res, error instanceof Error ? error : undefined);
  }
});

/**
 * GET /communities/:id
 * 获取社区详情
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return ApiRes.validationError(res, 'Community id is required');
    }
    const community = await communityService.getCommunityById(id);
    
    if (!community) {
      return ApiRes.notFound(res, 'Community not found');
    }
    
    return ApiRes.success(res, community);
  } catch (error) {
    console.error('Error fetching community:', error);
    return ApiRes.serverError(res, error instanceof Error ? error : undefined);
  }
});

/**
 * GET /communities/:id/members
 * 获取社区成员列表
 */
router.get('/:id/members', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return ApiRes.validationError(res, 'Community id is required');
    }
    const rawLimit = parseInt(req.query.limit as string, 10);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 50;
    
    const members = await communityService.getCommunityMembers(id, limit);
    return ApiRes.success(res, members);
  } catch (error) {
    console.error('Error fetching community members:', error);
    return ApiRes.serverError(res, error instanceof Error ? error : undefined);
  }
});

export default router;
