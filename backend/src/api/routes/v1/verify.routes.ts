import { Router } from 'express';
import { respondError, respondSuccess } from '../../response';
import { asyncHandler, AppError } from '../../../middlewares/errorHandler';
import { authRequired } from '../../../middlewares/auth.middleware';
import { worldVerifyService } from '../../../modules/identity';
import { normalizeWalletAddress } from '../../../modules/identity/nonce.service';

const router = Router();

router.post(
  '/world',
  authRequired,
  asyncHandler(async (req, res) => {
    const action = req.body?.action as string | undefined;
    const proof = req.body?.proof as { nullifierHash?: string; proof?: string } | undefined;
    const signal = req.body?.signal as string | undefined;
    const bodyWallet = req.body?.walletAddress as string | undefined;

    if (!action || !proof?.proof) {
      return respondError(req, res, 400, 'INVALID_INPUT', 'action and proof.proof are required');
    }
    const normalizedProof = {
      ...proof,
      proof: proof.proof,
    };

    const authWallet = req.user?.walletAddress || req.user?.address;
    if (!authWallet) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const requestWallet = bodyWallet ? normalizeWalletAddress(bodyWallet) : authWallet.toLowerCase();
    if (requestWallet !== authWallet.toLowerCase()) {
      return respondError(req, res, 403, 'FORBIDDEN', 'walletAddress does not match auth token');
    }

    const verified = await worldVerifyService.verify({
      action,
      walletAddress: requestWallet,
      proof: normalizedProof,
      signal,
    });

    return respondSuccess(req, res, verified);
  })
);

export default router;
