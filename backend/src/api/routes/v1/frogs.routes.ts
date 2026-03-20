import { Router } from 'express';
import { respondError, respondSuccess } from '../../response';

const router = Router();

router.get('/status', (req, res) =>
  respondSuccess(req, res, {
    module: 'frogs',
    status: 'ready',
    nextIssue: 'V1-I05',
  })
);

router.get('/:frogId', (req, res) => {
  const frogId = Number(req.params.frogId);
  if (Number.isNaN(frogId) || frogId <= 0) {
    return respondError(req, res, 400, 'INVALID_INPUT', 'frogId must be a positive integer');
  }

  return respondSuccess(req, res, {
    frogId,
    placeholder: true,
    message: 'Frog profile endpoint will be completed in V1-I05',
  });
});

export default router;
