import { Router } from 'express';
import { respondSuccess } from '../../response';
import runtimeRoutes from './runtime.routes';
import journeysRoutes from './journeys.routes';
import worldEventsRoutes from './world-events.routes';
import councilRoutes from './council.routes';
import memoryPalacesRoutes from './memory-palaces.routes';
import creatorRoutes from './creator.routes';
import partnersRoutes from './partners.routes';
import relationshipGraphRoutes from './relationship-graph.routes';

const router: Router = Router();

router.get('/health', (req, res) =>
  respondSuccess(req, res, {
    api: 'v3',
    status: 'ok',
  })
);

router.use('/runtime', runtimeRoutes);
router.use('/journeys', journeysRoutes);
router.use('/world-events', worldEventsRoutes);
router.use('/council', councilRoutes);
router.use('/memory-palaces', memoryPalacesRoutes);
router.use('/creator', creatorRoutes);
router.use('/partners', partnersRoutes);
router.use('/relationship-graph', relationshipGraphRoutes);

export default router;
