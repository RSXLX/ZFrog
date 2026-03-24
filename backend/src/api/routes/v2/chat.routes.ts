import { Router } from 'express';
import { authRequired } from '../../../middlewares/auth.middleware';
import { asyncHandler } from '../../../middlewares/errorHandler';
import { respondError, respondSuccess } from '../../response';
import { parseOptionalTrimmedString, parsePositiveInt } from './contract';
import { v2ChatService } from '../../../modules/soul/v2-chat.service';

const router: Router = Router();

const parseWalletAddress = (req: Express.Request): string | null => {
  const address = req.user?.walletAddress || req.user?.address || null;
  if (!address) {
    return null;
  }
  return String(address).trim().toLowerCase();
};

router.get('/status', (_req, res) =>
  respondSuccess(_req, res, {
    module: 'v2-chat',
    status: 'ready',
    mode: 'prompt-memory-trace',
    nextIssue: 'V2-W11-02',
  })
);

router.post(
  '/',
  authRequired,
  asyncHandler(async (req, res) => {
    const frogId = parsePositiveInt(req.body?.frogId);
    const sessionIdRaw = req.body?.sessionId;
    const sessionId = sessionIdRaw === undefined ? undefined : parsePositiveInt(sessionIdRaw);
    const message = parseOptionalTrimmedString(req.body?.message);

    if (!frogId) {
      return respondError(req, res, 400, 'CHAT_INVALID_INPUT', 'frogId must be a positive integer');
    }
    if (sessionIdRaw !== undefined && !sessionId) {
      return respondError(
        req,
        res,
        400,
        'CHAT_INVALID_INPUT',
        'sessionId must be a positive integer'
      );
    }
    if (!message) {
      return respondError(req, res, 400, 'CHAT_INVALID_INPUT', 'message is required');
    }

    const walletAddress = parseWalletAddress(req);
    if (!walletAddress) {
      return respondError(req, res, 401, 'UNAUTHORIZED', 'wallet address is missing in auth context');
    }

    const payload = await v2ChatService.sendMessage({
      frogId,
      message,
      walletAddress,
      ...(sessionId ? { sessionId } : {}),
      requestId: req.requestId,
    });

    return respondSuccess(req, res, payload);
  })
);

export default router;
