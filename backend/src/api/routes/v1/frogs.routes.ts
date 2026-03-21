import { Router } from 'express';
import { asyncHandler, AppError } from '../../../middlewares/errorHandler';
import { authRequired } from '../../../middlewares/auth.middleware';
import { respondError, respondSuccess } from '../../response';
import { eggService } from '../../../modules/life/egg.service';
import { soulImprintService } from '../../../modules/soul/soul-imprint.service';
import { hatchService } from '../../../modules/life/hatch.service';
import { eggQueryService } from '../../../modules/life/egg.query';
import { normalizeWalletAddress } from '../../../modules/identity/nonce.service';
import { frogWalletQueryService } from '../../../modules/web3/frog-wallet.query';

const router = Router();

router.get('/status', (req, res) =>
  respondSuccess(req, res, {
    module: 'frogs',
    status: 'ready',
    nextIssue: 'V1-I08',
  })
);

router.post(
  '/claim-egg',
  authRequired,
  asyncHandler(async (req, res) => {
    const walletAddress = req.body?.walletAddress as string | undefined;
    const verificationId = req.body?.verificationId as string | undefined;
    const petName = req.body?.petName as string | undefined;
    const authWallet = req.user?.walletAddress || req.user?.address;

    if (!walletAddress || !verificationId || !petName) {
      return respondError(req, res, 400, 'INVALID_INPUT', 'walletAddress, verificationId and petName are required');
    }
    if (!authWallet) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const normalizedBodyWallet = normalizeWalletAddress(walletAddress);
    if (normalizedBodyWallet !== authWallet.toLowerCase()) {
      return respondError(req, res, 403, 'FORBIDDEN', 'walletAddress does not match auth token');
    }

    const result = await eggService.claimEgg({
      walletAddress: normalizedBodyWallet,
      verificationId,
      petName,
      requestId: req.requestId,
    });

    return respondSuccess(req, res, result);
  })
);

router.post(
  '/:frogId/soul-imprint',
  authRequired,
  asyncHandler(async (req, res) => {
    const frogId = Number(req.params.frogId);
    if (Number.isNaN(frogId) || frogId <= 0) {
      return respondError(req, res, 400, 'INVALID_INPUT', 'frogId must be a positive integer');
    }

    const introText = req.body?.introText as string | undefined;
    const voiceSummary = req.body?.voiceSummary as string | undefined;
    const preferredStyle = req.body?.preferredStyle as string | undefined;
    const authWallet = req.user?.walletAddress || req.user?.address;
    if (!authWallet) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const result = await soulImprintService.imprint({
      frogId,
      walletAddress: authWallet,
      introText: introText || '',
      voiceSummary,
      preferredStyle,
      requestId: req.requestId,
    });

    return respondSuccess(req, res, result);
  })
);

router.post(
  '/:frogId/hatch',
  authRequired,
  asyncHandler(async (req, res) => {
    const frogId = Number(req.params.frogId);
    if (Number.isNaN(frogId) || frogId <= 0) {
      return respondError(req, res, 400, 'INVALID_INPUT', 'frogId must be a positive integer');
    }

    const source = (req.body?.source as string | undefined) || 'web';
    const authWallet = req.user?.walletAddress || req.user?.address;
    if (!authWallet) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const result = await hatchService.hatch({
      frogId,
      walletAddress: authWallet,
      source,
      requestId: req.requestId,
    });

    return respondSuccess(req, res, result);
  })
);

router.get(
  '/:frogId/wallet',
  authRequired,
  asyncHandler(async (req, res) => {
    const frogId = Number(req.params.frogId);
    if (Number.isNaN(frogId) || frogId <= 0) {
      return respondError(req, res, 400, 'INVALID_INPUT', 'frogId must be a positive integer');
    }

    const authWallet = req.user?.walletAddress || req.user?.address;
    if (!authWallet) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const wallet = await frogWalletQueryService.getWalletByFrogId(frogId, authWallet);
    return respondSuccess(req, res, wallet);
  })
);

router.get(
  '/:frogId/milestones',
  authRequired,
  asyncHandler(async (req, res) => {
    const frogId = Number(req.params.frogId);
    if (Number.isNaN(frogId) || frogId <= 0) {
      return respondError(req, res, 400, 'INVALID_INPUT', 'frogId must be a positive integer');
    }

    const rawLimit = req.query.limit === undefined ? 100 : Number(req.query.limit);
    if (!Number.isInteger(rawLimit) || rawLimit <= 0 || rawLimit > 200) {
      return respondError(req, res, 400, 'INVALID_INPUT', 'limit must be an integer between 1 and 200');
    }

    const authWallet = req.user?.walletAddress || req.user?.address;
    if (!authWallet) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const milestones = await frogWalletQueryService.getMilestonesByFrogId(
      frogId,
      authWallet,
      rawLimit
    );
    return respondSuccess(req, res, milestones);
  })
);

router.get(
  '/:frogId',
  authRequired,
  asyncHandler(async (req, res) => {
    const frogId = Number(req.params.frogId);
    if (Number.isNaN(frogId) || frogId <= 0) {
      return respondError(req, res, 400, 'INVALID_INPUT', 'frogId must be a positive integer');
    }

    const authWallet = req.user?.walletAddress || req.user?.address;
    if (!authWallet) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const lifecycle = await eggQueryService.getEggLifecycle(frogId, authWallet);
    return respondSuccess(req, res, lifecycle);
  })
);

export default router;
