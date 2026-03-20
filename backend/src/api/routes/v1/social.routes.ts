import { Router } from 'express';
import { respondSuccess } from '../../response';

const router = Router();

router.get('/status', (req, res) =>
  respondSuccess(req, res, {
    module: 'social',
    status: 'ready',
    nextIssue: 'V1-I13',
  })
);

export default router;
