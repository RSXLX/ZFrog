import { Router } from 'express';
import { asyncHandler, AppError } from '../../../middlewares/errorHandler';
import { authRequired } from '../../../middlewares/auth.middleware';
import { eggQueryService } from '../../../modules/life/egg.query';
import { lifeQueryService } from '../../../modules/life/life.query';
import { lifeCommandService } from '../../../modules/life/life.command';
import { dormancyService } from '../../../modules/life/dormancy.service';
import { respondError, respondSuccess } from '../../response';

const router = Router();

const parseFrogId = (raw: string): number => {
  const frogId = Number(raw);
  if (!Number.isInteger(frogId) || frogId <= 0) {
    throw new AppError(400, 'frogId must be a positive integer', 'INVALID_INPUT');
  }
  return frogId;
};

const getAuthWallet = (req: Express.Request): string => {
  const walletAddress = req.user?.walletAddress || req.user?.address;
  if (!walletAddress) {
    throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  }
  return walletAddress;
};

router.get('/status', (req, res) =>
  respondSuccess(req, res, {
    module: 'life',
    status: 'ready',
    nextIssue: 'V1-I06',
  })
);

router.get(
  '/:frogId/life',
  authRequired,
  asyncHandler(async (req, res) => {
    const frogId = parseFrogId(req.params.frogId);
    const walletAddress = getAuthWallet(req);

    const life = await lifeQueryService.getLifeByFrogId(frogId, walletAddress);
    return respondSuccess(req, res, {
      hunger: life.hunger,
      happiness: life.happiness,
      cleanliness: life.cleanliness,
      health: life.health,
      energy: life.energy,
      mood: life.mood,
      isSick: life.isSick,
      needsClean: life.needsClean,
      isDormant: life.isDormant,
      hibernationStatus: life.hibernationStatus,
      lifeStage: life.lifeStage,
    });
  })
);

router.post(
  '/:frogId/care/feed',
  authRequired,
  asyncHandler(async (req, res) => {
    const frogId = parseFrogId(req.params.frogId);
    const walletAddress = getAuthWallet(req);
    const foodType = (req.body?.foodType as string | undefined) || '';
    const quantity = Number(req.body?.quantity || 1);

    if (!foodType.trim()) {
      return respondError(req, res, 400, 'INVALID_INPUT', 'foodType is required');
    }

    const result = await lifeCommandService.feed({
      frogId,
      walletAddress,
      foodType,
      quantity,
      source: (req.body?.source as string | undefined) || 'v1_life_feed',
      requestId: req.requestId,
    });

    return respondSuccess(req, res, result);
  })
);

router.post(
  '/:frogId/care/clean',
  authRequired,
  asyncHandler(async (req, res) => {
    const frogId = parseFrogId(req.params.frogId);
    const walletAddress = getAuthWallet(req);

    const result = await lifeCommandService.clean({
      frogId,
      walletAddress,
      source: (req.body?.source as string | undefined) || 'v1_life_clean',
      requestId: req.requestId,
    });

    return respondSuccess(req, res, result);
  })
);

router.post(
  '/:frogId/care/play',
  authRequired,
  asyncHandler(async (req, res) => {
    const frogId = parseFrogId(req.params.frogId);
    const walletAddress = getAuthWallet(req);

    const result = await lifeCommandService.play({
      frogId,
      walletAddress,
      gameType: req.body?.gameType as string | undefined,
      score: typeof req.body?.score === 'number' ? req.body.score : undefined,
      source: (req.body?.source as string | undefined) || 'v1_life_play',
      requestId: req.requestId,
    });

    return respondSuccess(req, res, result);
  })
);

router.post(
  '/:frogId/care/heal',
  authRequired,
  asyncHandler(async (req, res) => {
    const frogId = parseFrogId(req.params.frogId);
    const walletAddress = getAuthWallet(req);

    const result = await lifeCommandService.heal({
      frogId,
      walletAddress,
      source: (req.body?.source as string | undefined) || 'v1_life_heal',
      requestId: req.requestId,
    });

    return respondSuccess(req, res, result);
  })
);

router.post(
  '/:frogId/care/rest/start',
  authRequired,
  asyncHandler(async (req, res) => {
    const frogId = parseFrogId(req.params.frogId);
    const walletAddress = getAuthWallet(req);

    const result = await lifeCommandService.startRest({
      frogId,
      walletAddress,
      source: (req.body?.source as string | undefined) || 'v1_life_rest_start',
      requestId: req.requestId,
    });

    return respondSuccess(req, res, result);
  })
);

router.post(
  '/:frogId/care/rest/end',
  authRequired,
  asyncHandler(async (req, res) => {
    const frogId = parseFrogId(req.params.frogId);
    const walletAddress = getAuthWallet(req);

    const result = await lifeCommandService.endRest({
      frogId,
      walletAddress,
      source: (req.body?.source as string | undefined) || 'v1_life_rest_end',
      requestId: req.requestId,
    });

    return respondSuccess(req, res, result);
  })
);

router.get(
  '/:frogId/hibernation',
  authRequired,
  asyncHandler(async (req, res) => {
    const frogId = parseFrogId(req.params.frogId);
    const walletAddress = getAuthWallet(req);

    await lifeCommandService.syncDormancyStatus({ frogId, walletAddress });
    const life = await lifeQueryService.getLifeByFrogId(frogId, walletAddress);

    return respondSuccess(req, res, {
      hibernationStatus: life.hibernationStatus,
      isDormant: life.isDormant,
      mood: life.mood,
    });
  })
);

router.get(
  '/:frogId/hibernation/revival-cost',
  authRequired,
  asyncHandler(async (req, res) => {
    const frogId = parseFrogId(req.params.frogId);
    const walletAddress = getAuthWallet(req);

    const life = await lifeQueryService.getLifeByFrogId(frogId, walletAddress);
    if (life.hibernationStatus !== 'SLEEPING') {
      return respondSuccess(req, res, {
        baseCost: 0,
        discount: 0,
        finalCost: 0,
        blessings: 0,
      });
    }

    const costInfo = await dormancyService.getRevivalCostWithDiscount(frogId);
    return respondSuccess(req, res, costInfo);
  })
);

router.post(
  '/:frogId/hibernation/revive',
  authRequired,
  asyncHandler(async (req, res) => {
    const frogId = parseFrogId(req.params.frogId);
    const walletAddress = getAuthWallet(req);

    const result = await dormancyService.reviveDormant(frogId, walletAddress, req.requestId);
    return respondSuccess(req, res, result);
  })
);

router.post(
  '/:frogId/hibernation/bless',
  authRequired,
  asyncHandler(async (req, res) => {
    const targetFrogId = parseFrogId(req.params.frogId);
    const walletAddress = getAuthWallet(req);
    const blesserFrogId = Number(req.body?.blesserFrogId);
    const verificationId = req.body?.verificationId as string | undefined;

    if (!Number.isInteger(blesserFrogId) || blesserFrogId <= 0) {
      return respondError(req, res, 400, 'INVALID_INPUT', 'blesserFrogId is required');
    }
    if (!verificationId?.trim()) {
      return respondError(req, res, 400, 'INVALID_INPUT', 'verificationId is required');
    }

    const result = await lifeCommandService.blessDormant({
      blesserFrogId,
      targetFrogId,
      walletAddress,
      verificationId,
      requestId: req.requestId,
    });

    return respondSuccess(req, res, result);
  })
);

router.get(
  '/:frogId/egg-profile',
  authRequired,
  asyncHandler(async (req, res) => {
    const frogId = parseFrogId(req.params.frogId);
    const walletAddress = getAuthWallet(req);

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
    const frogId = parseFrogId(req.params.frogId);
    const walletAddress = getAuthWallet(req);

    const lifecycle = await eggQueryService.getEggLifecycle(frogId, walletAddress);
    return respondSuccess(req, res, {
      frogId: lifecycle.frogId,
      tokenId: lifecycle.tokenId,
      soulProfile: lifecycle.soulProfile,
    });
  })
);

export default router;
