import { Router } from 'express';
import { respondError, respondSuccess } from '../../response';
import { asyncHandler, AppError } from '../../../middlewares/errorHandler';
import { authRequired } from '../../../middlewares/auth.middleware';
import { authService, worldVerifyService } from '../../../modules/identity';
import { prisma } from '../../../database';

const router: Router = Router();

router.get('/status', (req, res) =>
  respondSuccess(req, res, {
    module: 'auth',
    status: 'ready',
    nextIssue: 'V1-I03',
  })
);

router.post(
  '/nonce',
  asyncHandler(async (req, res) => {
    const walletAddress = req.body?.walletAddress as string | undefined;
    if (!walletAddress) {
      return respondError(req, res, 400, 'INVALID_INPUT', 'walletAddress is required');
    }

    const noncePayload = await authService.issueNonce(walletAddress);
    return respondSuccess(req, res, noncePayload);
  })
);

router.post(
  '/wallet',
  asyncHandler(async (req, res) => {
    const walletAddress = req.body?.walletAddress as string | undefined;
    const signature = req.body?.signature as string | undefined;
    const chainIdRaw = req.body?.chainId;
    const chainId = typeof chainIdRaw === 'number' ? chainIdRaw : Number(chainIdRaw || 0) || undefined;

    if (!walletAddress || !signature) {
      return respondError(req, res, 400, 'INVALID_INPUT', 'walletAddress and signature are required');
    }

    const payload = await authService.loginWithWallet({
      walletAddress,
      signature,
      chainId,
    });

    return respondSuccess(req, res, payload);
  })
);

router.get(
  '/me',
  authRequired,
  asyncHandler(async (req, res) => {
    const walletAddress = req.user?.walletAddress || req.user?.address;
    if (!walletAddress) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const verifiedActions = await worldVerifyService.getVerifiedActions(walletAddress);
    const frog = await prisma.frog.findUnique({
      where: { ownerAddress: walletAddress.toLowerCase() },
      select: { tokenId: true },
    });

    return respondSuccess(req, res, {
      walletAddress: walletAddress.toLowerCase(),
      world: {
        verifiedActions,
      },
      frogTokenId: frog?.tokenId ?? null,
    });
  })
);

export default router;
