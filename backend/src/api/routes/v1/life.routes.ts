import { Router } from 'express';
import { asyncHandler, AppError } from '../../../middlewares/errorHandler';
import { authRequired } from '../../../middlewares/auth.middleware';
import { eggQueryService } from '../../../modules/life/egg.query';
import { respondSuccess } from '../../response';

const router = Router();

router.get('/status', (req, res) =>
  respondSuccess(req, res, {
    module: 'life',
    status: 'ready',
    nextIssue: 'V1-I05',
  })
);

router.get(
  '/:frogId/egg-profile',
  authRequired,
  asyncHandler(async (req, res) => {
    const frogId = Number(req.params.frogId);
    if (Number.isNaN(frogId) || frogId <= 0) {
      throw new AppError(400, 'frogId must be a positive integer', 'INVALID_INPUT');
    }
    const walletAddress = req.user?.walletAddress || req.user?.address;
    if (!walletAddress) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const lifecycle = await eggQueryService.getEggLifecycle(frogId, walletAddress);
    return respondSuccess(req, res, {
      frogId: lifecycle.frogId,
      tokenId: lifecycle.tokenId,
      eggProfile: lifecycle.eggProfile,
    });
  })
);

router.get(
  '/:frogId/soul-profile',
  authRequired,
  asyncHandler(async (req, res) => {
    const frogId = Number(req.params.frogId);
    if (Number.isNaN(frogId) || frogId <= 0) {
      throw new AppError(400, 'frogId must be a positive integer', 'INVALID_INPUT');
    }
    const walletAddress = req.user?.walletAddress || req.user?.address;
    if (!walletAddress) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const lifecycle = await eggQueryService.getEggLifecycle(frogId, walletAddress);
    return respondSuccess(req, res, {
      frogId: lifecycle.frogId,
      tokenId: lifecycle.tokenId,
      soulProfile: lifecycle.soulProfile,
    });
  })
);

export default router;
