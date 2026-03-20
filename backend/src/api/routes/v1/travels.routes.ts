import { Router } from 'express';
import { respondSuccess } from '../../response';

const router = Router();

router.get('/status', (req, res) =>
  respondSuccess(req, res, {
    module: 'travels',
    status: 'ready',
    nextIssue: 'V1-I07',
  })
);

export default router;
