import { Router } from 'express';
import { respondError, respondSuccess } from '../../response';

const router = Router();

router.get('/status', (req, res) =>
  respondSuccess(req, res, {
    module: 'auth',
    status: 'ready',
    nextIssue: 'V1-I03',
  })
);

router.post('/nonce', (req, res) =>
  respondError(
    req,
    res,
    501,
    'NOT_IMPLEMENTED',
    'Wallet nonce login is planned in V1-I03'
  )
);

export default router;
