import { Router } from 'express';
import { respondSuccess } from '../../response';
import { getV3IntegrationAccess, v3IntegrationAuthRequired } from '../../../middlewares/v3-integration-auth.middleware';
import { buildV3RuntimeStatusView } from '../../../platform/runtime/v3-access-control.service';

const router: Router = Router();

router.get('/status', v3IntegrationAuthRequired({ permission: 'runtime.read' }), (req, res) =>
  respondSuccess(req, res, buildV3RuntimeStatusView(getV3IntegrationAccess(req)))
);

export default router;
