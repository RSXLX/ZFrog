import { Router } from 'express';
import { authRequired } from '../../../middlewares/auth.middleware';
import { AppError, asyncHandler } from '../../../middlewares/errorHandler';
import { frogWalletAssetEventService } from '../../../modules/web3/wallet-asset-event.service';
import { frogWalletQueryService } from '../../../modules/web3/frog-wallet.query';
import { logger } from '../../../utils/logger';
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
  '/:frogId/wallet',
  authRequired,
  asyncHandler(async (req, res) => {
    const frogId = parsePositiveInt(req.params?.frogId);
    if (!frogId) {
      return respondError(req, res, 400, 'INVALID_INPUT', 'frogId must be a positive integer');
    }

    const walletAddress = getAuthWallet(req);
    const wallet = await frogWalletQueryService.getWalletByFrogId(frogId, walletAddress);

    let assetSync;
    try {
      assetSync = await frogWalletAssetEventService.observeWalletAssets(wallet, {
        requestId: req.requestId,
        source: 'api.v2.wallet',
      });
    } catch (error) {
      logger.warn('[V2 Wallet] Failed to emit FrogWalletAssetChanged event', {
        frogId,
        error,
      });
      assetSync = {
        emitted: false,
        eventId: null,
        assetHash: '',
        assetCounts: {
          souvenirs: wallet.assets.souvenirs.length,
          badges: wallet.assets.badges.length,
          decorations: wallet.assets.decorations.length,
        },
      };
    }

    return respondSuccess(req, res, {
      ...wallet,
      assetSync,
    });
  })
);

router.get(
  '/:frogId/wallet/milestones',
  authRequired,
  asyncHandler(async (req, res) => {
    const frogId = parsePositiveInt(req.params?.frogId);
    if (!frogId) {
      return respondError(req, res, 400, 'INVALID_INPUT', 'frogId must be a positive integer');
    }

    const limitRaw = req.query.limit === undefined ? 100 : parsePositiveInt(req.query.limit);
    if (limitRaw === null || limitRaw === undefined || limitRaw > 200) {
      return respondError(req, res, 400, 'INVALID_INPUT', 'limit must be an integer between 1 and 200');
    }

    const walletAddress = getAuthWallet(req);
    const milestones = await frogWalletQueryService.getMilestonesByFrogId(
      frogId,
      walletAddress,
      limitRaw
    );

    return respondSuccess(req, res, milestones);
  })
);

export default router;
