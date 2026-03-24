import { Router } from 'express';
import { asyncHandler, AppError } from '../../../middlewares/errorHandler';
import { authOptional } from '../../../middlewares/auth.middleware';
import { memoryPalaceQueryService } from '../../../modules/memory-palace/memory-palace.query';
import { respondSuccess } from '../../response';

const router: Router = Router();

const parsePositiveInt = (value: unknown, field: string): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(400, `${field} must be a positive integer`, 'INVALID_INPUT');
  }
  return parsed;
};

const getAuthWallet = (req: Express.Request): string | undefined =>
  req.user?.walletAddress || req.user?.address;

router.get('/status', (req, res) =>
  respondSuccess(req, res, {
    module: 'memory-palaces',
    status: 'ready',
    nextIssue: 'V1-I09',
  })
);

router.get(
  '/:id',
  authOptional,
  asyncHandler(async (req, res) => {
    const frogId = parsePositiveInt(req.params.id, 'id');
    const walletAddress = getAuthWallet(req);

    const result = await memoryPalaceQueryService.getByFrogId(frogId, walletAddress);
    return respondSuccess(req, res, result);
  })
);

export default router;
