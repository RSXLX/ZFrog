import { Router } from 'express';
import { respondSuccess } from '../../response';
import authRoutes from './auth.routes';
import frogsRoutes from './frogs.routes';
import lifeRoutes from './life.routes';
import travelsRoutes from './travels.routes';
import socialRoutes from './social.routes';
import memoryRoutes from './memory.routes';
import verifyRoutes from './verify.routes';

const router: Router = Router();

router.get('/health', (req, res) =>
  respondSuccess(req, res, {
    service: 'zetafrog-backend',
    api: 'v1',
    status: 'ok',
  })
);

router.use('/auth', authRoutes);
router.use('/frogs', frogsRoutes);
router.use('/frogs', lifeRoutes);
router.use('/life', lifeRoutes);
router.use('/travels', travelsRoutes);
router.use('/social', socialRoutes);
router.use('/rituals', socialRoutes);
router.use('/memory', memoryRoutes);
router.use('/memory-palaces', memoryRoutes);
router.use('/verify', verifyRoutes);

export default router;
