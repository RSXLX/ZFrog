import { Router } from 'express';
import { asyncHandler, AppError } from '../../../middlewares/errorHandler';
import { authRequired } from '../../../middlewares/auth.middleware';
import { travelCommandServiceV1 } from '../../../modules/travel/travel.command';
import { travelQueryServiceV1 } from '../../../modules/travel/travel.query';
import { respondSuccess } from '../../response';

const router = Router();

const parsePositiveInt = (value: unknown, field: string): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(400, `${field} must be a positive integer`, 'INVALID_INPUT');
  }
  return parsed;
};

const parseOptionalPositiveInt = (value: unknown, field: string): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return parsePositiveInt(value, field);
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
    module: 'travels',
    status: 'ready',
    nextIssue: 'V1-I07',
  })
);

router.post(
  '/',
  authRequired,
  asyncHandler(async (req, res) => {
    const walletAddress = getAuthWallet(req);
    const frogId = parsePositiveInt(req.body?.frogId, 'frogId');
    const duration = parseOptionalPositiveInt(req.body?.duration, 'duration');
    const companionFrogId = parseOptionalPositiveInt(req.body?.companionFrogId, 'companionFrogId');

    const result = await travelCommandServiceV1.startTravel({
      frogId,
      walletAddress,
      travelType: req.body?.travelType as string | undefined,
      targetChain: req.body?.targetChain as string | number | undefined,
      targetAddress: req.body?.targetAddress as string | undefined,
      duration,
      companionFrogId: companionFrogId ?? null,
      source: (req.body?.source as string | undefined) || 'v1_travel_route',
      requestId: req.requestId,
    });

    return respondSuccess(req, res, result);
  })
);

router.get(
  '/:travelId',
  authRequired,
  asyncHandler(async (req, res) => {
    const walletAddress = getAuthWallet(req);
    const travelId = parsePositiveInt(req.params.travelId, 'travelId');

    const result = await travelQueryServiceV1.getTravel({
      travelId,
      walletAddress,
    });

    return respondSuccess(req, res, result);
  })
);

router.post(
  '/:travelId/complete',
  authRequired,
  asyncHandler(async (req, res) => {
    const walletAddress = getAuthWallet(req);
    const travelId = parsePositiveInt(req.params.travelId, 'travelId');

    const result = await travelCommandServiceV1.completeTravel({
      travelId,
      walletAddress,
      source: (req.body?.source as string | undefined) || 'v1_travel_complete_route',
      requestId: req.requestId,
    });

    return respondSuccess(req, res, result);
  })
);

export default router;
