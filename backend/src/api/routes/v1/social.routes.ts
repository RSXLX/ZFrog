import { Router } from 'express';
import { asyncHandler, AppError } from '../../../middlewares/errorHandler';
import { authRequired } from '../../../middlewares/auth.middleware';
import { ritualService } from '../../../modules/social/ritual.service';
import { respondError, respondSuccess } from '../../response';

const router: Router = Router();

const parseOptionalPositiveInt = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(400, 'Expected positive integer input', 'INVALID_INPUT');
  }

  return parsed;
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
    module: 'social',
    status: 'ready',
    nextIssue: 'V1-I13',
  })
);

const createRitualHandler = asyncHandler(async (req, res) => {
  const type = (req.body?.type as string | undefined)?.trim();
  if (!type) {
    return respondError(req, res, 400, 'INVALID_INPUT', 'type is required');
  }

  const initiatorFrogId = parseOptionalPositiveInt(req.body?.initiatorFrogId);
  const targetFrogId = parseOptionalPositiveInt(req.body?.targetFrogId);
  const travelId = parseOptionalPositiveInt(req.body?.travelId);
  const verificationId = (req.body?.verificationId as string | undefined)?.trim();

  if (type.toLowerCase() === 'blessing') {
    if (!initiatorFrogId || !targetFrogId) {
      return respondError(req, res, 400, 'INVALID_INPUT', 'initiatorFrogId and targetFrogId are required');
    }
  }

  if (type.toLowerCase() === 'rescue') {
    if (!initiatorFrogId || !travelId) {
      return respondError(req, res, 400, 'INVALID_INPUT', 'initiatorFrogId and travelId are required');
    }
    if (!verificationId) {
      return respondError(req, res, 400, 'INVALID_INPUT', 'verificationId is required for rescue ritual');
    }
  }

  const result = await ritualService.createRitual({
    type,
    targetFrogId,
    initiatorFrogId,
    travelId,
    verificationId,
    walletAddress: getAuthWallet(req),
    requestId: req.requestId,
    source: 'v1_social_routes',
  });

  return respondSuccess(req, res, result);
});

router.post('/', authRequired, createRitualHandler);
router.post('/rituals', authRequired, createRitualHandler);

export default router;
