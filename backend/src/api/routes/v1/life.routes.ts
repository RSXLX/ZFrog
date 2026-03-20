import { Router } from 'express';
import { respondSuccess } from '../../response';

const router = Router();

router.get('/status', (req, res) =>
  respondSuccess(req, res, {
    module: 'life',
    status: 'ready',
    nextIssue: 'V1-I06',
  })
);

export default router;
