import { Router } from 'express';
import { authRequired } from '../../../middlewares/auth.middleware';
import { AppError, asyncHandler } from '../../../middlewares/errorHandler';
import { relationshipMemoryQueryService } from '../../../modules/soul/relationship-memory.query';
import { respondError, respondSuccess } from '../../response';
import { parsePositiveInt } from './contract';

const router: Router = Router();

const getAuthWallet = (req: Express.Request): string => {
  const walletAddress = req.user?.walletAddress || req.user?.address;
  if (!walletAddress) {
    throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  }
  return walletAddress;
};

router.get(
  '/:frogId/relationship-memory',
  authRequired,
  asyncHandler(async (req, res) => {
    const frogId = parsePositiveInt(req.params?.frogId);
    if (!frogId) {
      return respondError(req, res, 400, 'INVALID_INPUT', 'frogId must be a positive integer');
    }

    const timelineLimitRaw = Array.isArray(req.query?.timelineLimit)
      ? req.query.timelineLimit[0]
      : req.query?.timelineLimit;
    const timelineLimit =
      timelineLimitRaw === undefined ? undefined : parsePositiveInt(timelineLimitRaw);

    if (timelineLimitRaw !== undefined && !timelineLimit) {
      return respondError(
        req,
        res,
        400,
        'INVALID_INPUT',
        'timelineLimit must be a positive integer'
      );
    }

    const payload = await relationshipMemoryQueryService.getByFrogId({
      frogId,
      ...(timelineLimit ? { timelineLimit } : {}),
      walletAddress: getAuthWallet(req),
    });

    return respondSuccess(req, res, payload);
  })
);

export default router;
