import { Router } from 'express';
import { respondSuccess } from '../../response';

const router = Router();

router.get('/status', (req, res) =>
  respondSuccess(req, res, {
    module: 'memory',
    status: 'ready',
    nextIssue: 'V1-I09',
  })
);

export default router;
