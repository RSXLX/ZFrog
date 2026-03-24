import { Router } from 'express';
import { authRequired } from '../../../middlewares/auth.middleware';
import { AppError, asyncHandler } from '../../../middlewares/errorHandler';
import { createV2WriteRateLimiter } from '../../../middlewares/rateLimit.middleware';
import { getV2SocialRolloutStatus, v2SocialRolloutGuard } from '../../../middlewares/v2-social-rollout.middleware';
import { respondError, respondSuccess } from '../../response';
import { V2SocialErrorCodes } from '../../../types/api';
import { familyCommandServiceV2 } from '../../../modules/social/family.command';
import { familyQueryServiceV2 } from '../../../modules/social/family.query';
import { parsePositiveInt } from './contract';

const router: Router = Router();

const parseEnvPositiveInt = (raw: string | undefined, fallback: number): number => {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const familyWriteRateLimiter = createV2WriteRateLimiter({
  windowMs: parseEnvPositiveInt(process.env.V2_FAMILY_WRITE_RATE_LIMIT_WINDOW_MS, 60_000),
  max: parseEnvPositiveInt(process.env.V2_FAMILY_WRITE_RATE_LIMIT_MAX, 6),
  code: V2SocialErrorCodes.FAMILY_RATE_LIMITED,
  message: 'Too many family write requests',
});

router.get('/status', (req, res) =>
  respondSuccess(req, res, {
    module: 'v2-families',
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
  '/',
  authRequired,
  v2SocialRolloutGuard,
  familyWriteRateLimiter,
  asyncHandler(async (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name : '';
    const goal = typeof req.body?.goal === 'string' ? req.body.goal : undefined;
    const visibility = typeof req.body?.visibility === 'string' ? req.body.visibility : undefined;
    const ownerFrogId = parsePositiveInt(req.body?.ownerFrogId);

    if (!ownerFrogId) {
      return respondError(
        req,
        res,
        400,
        V2SocialErrorCodes.FAMILY_INVALID_INPUT,
        'ownerFrogId must be a positive integer'
      );
    }

    const result = await familyCommandServiceV2.createFamily({
      name,
      ownerFrogId,
      walletAddress: getAuthWallet(req),
      goal,
      visibility,
      requestId: req.requestId,
      source: 'v2_families_routes',
    });

    return respondSuccess(req, res, result, 201);
  })
);

router.get(
  '/:familyId',
  authRequired,
  v2SocialRolloutGuard,
  asyncHandler(async (req, res) => {
    const familyId = parsePositiveInt(req.params.familyId);
    if (!familyId) {
      return respondError(
        req,
        res,
        400,
        V2SocialErrorCodes.FAMILY_INVALID_INPUT,
        'familyId must be a positive integer'
      );
    }

    const family = await familyQueryServiceV2.getFamilyById({ familyId });
    return respondSuccess(req, res, family);
  })
);

export default router;
