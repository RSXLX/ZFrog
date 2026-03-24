import { Router } from 'express';
import { getV2SocialRolloutStatus } from '../../../middlewares/v2-social-rollout.middleware';
import { respondSuccess } from '../../response';
import attestationsRoutes from './attestations.routes';
import chatRoutes from './chat.routes';
import communitiesRoutes from './communities.routes';
import familiesRoutes from './families.routes';
import relationshipMemoryRoutes from './relationship-memory.routes';
import walletRoutes from './wallet.routes';
import { V2_SOCIAL_CONTRACT_VERSION, V2_SOCIAL_IMPLEMENTATION_TARGET } from './contract';

const router: Router = Router();

router.get('/health', (req, res) =>
  respondSuccess(req, res, {
    service: 'zetafrog-backend',
    api: 'v2',
    status: 'contract-ready',
    contractVersion: V2_SOCIAL_CONTRACT_VERSION,
    implementationTarget: V2_SOCIAL_IMPLEMENTATION_TARGET,
    socialRollout: getV2SocialRolloutStatus(req),
  })
);

router.use('/families', familiesRoutes);
router.use('/communities', communitiesRoutes);
router.use('/attestations', attestationsRoutes);
router.use('/chat', chatRoutes);
router.use('/frogs', relationshipMemoryRoutes);
router.use('/frogs', walletRoutes);

export default router;
