import { Router } from 'express';
import { authRequired } from '../../../middlewares/auth.middleware';
import { AppError, asyncHandler } from '../../../middlewares/errorHandler';
import { createV2WriteRateLimiter } from '../../../middlewares/rateLimit.middleware';
import { getV2SocialRolloutStatus, v2SocialRolloutGuard } from '../../../middlewares/v2-social-rollout.middleware';
import { communityCommandServiceV2 } from '../../../modules/social/community.command';
import { communityQueryServiceV2 } from '../../../modules/social/community.query';
import { respondError, respondSuccess } from '../../response';
import { V2SocialErrorCodes } from '../../../types/api';
import { parseOptionalTrimmedString, parsePositiveInt } from './contract';

const router: Router = Router();

const parseEnvPositiveInt = (raw: string | undefined, fallback: number): number => {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const communityJoinRateLimiter = createV2WriteRateLimiter({
  windowMs: parseEnvPositiveInt(process.env.V2_COMMUNITY_JOIN_RATE_LIMIT_WINDOW_MS, 60_000),
  max: parseEnvPositiveInt(process.env.V2_COMMUNITY_JOIN_RATE_LIMIT_MAX, 20),
  code: V2SocialErrorCodes.COMMUNITY_RATE_LIMITED,
  message: 'Too many community join requests',
});

router.get('/status', (req, res) =>
  respondSuccess(req, res, {
    module: 'v2-communities',
    status: 'ready',
    mode: 'db-read-write',
    nextIssue: 'V2-W8-02',
    rollout: getV2SocialRolloutStatus(req),
  })
);

const getAuthWallet = (req: Express.Request): string => {
  const walletAddress = req.user?.walletAddress || req.user?.address;
  if (!walletAddress) {
    throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  }
  return walletAddress;
};

router.post(
  '/:communityId/join',
  authRequired,
  v2SocialRolloutGuard,
  communityJoinRateLimiter,
  asyncHandler(async (req, res) => {
    const frogId = parsePositiveInt(req.body?.frogId);
    const role = parseOptionalTrimmedString(req.body?.role);

    if (!frogId) {
      return respondError(
        req,
        res,
        400,
        V2SocialErrorCodes.COMMUNITY_INVALID_INPUT,
        'frogId must be a positive integer'
      );
    }

    const result = await communityCommandServiceV2.joinCommunity({
      communityId: req.params.communityId,
      frogId,
      role: role || undefined,
      walletAddress: getAuthWallet(req),
      requestId: req.requestId,
      source: 'v2_communities_routes',
    });

    return respondSuccess(req, res, result, 201);
  })
);

router.get(
  '/:communityId',
  authRequired,
  v2SocialRolloutGuard,
  asyncHandler(async (req, res) => {
    const community = await communityQueryServiceV2.getCommunityById({
      communityId: req.params.communityId,
    });

    return respondSuccess(req, res, community);
  })
);

router.get(
  '/:communityId/members',
  authRequired,
  v2SocialRolloutGuard,
  asyncHandler(async (req, res) => {
    const rawLimit = Array.isArray(req.query?.limit) ? req.query.limit[0] : req.query?.limit;
    const limit = rawLimit === undefined ? undefined : parsePositiveInt(rawLimit);

    if (rawLimit !== undefined && !limit) {
      return respondError(
        req,
        res,
        400,
        V2SocialErrorCodes.COMMUNITY_INVALID_INPUT,
        'limit must be a positive integer'
      );
    }

    const members = await communityQueryServiceV2.listCommunityMembers({
      communityId: req.params.communityId,
      ...(limit ? { limit } : {}),
    });

    return respondSuccess(req, res, members);
  })
);

export default router;
