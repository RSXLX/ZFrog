import { Router } from 'express';
import { getV3RuntimeActor } from '../../../platform/runtime/v3-runtime.service';
import { integrationRegistryService } from '../../../platform/integrations/integration-registry.service';

const router: Router = Router();

const ok = <T>(res: any, data: T, status = 200) =>
  res.status(status).json({
    success: true,
    data,
  });

const fail = (res: any, status: number, message: string) =>
  res.status(status).json({
    success: false,
    message,
  });

router.get('/', async (_req, res, next) => {
  try {
    return ok(res, await integrationRegistryService.listApps());
  } catch (error) {
    return next(error);
  }
});

router.get('/catalog', (_req, res) => ok(res, integrationRegistryService.getCatalog()));

router.post('/', async (req, res, next) => {
  try {
    const result = await integrationRegistryService.registerApp({
      slug: req.body?.slug,
      name: req.body?.name,
      appType: req.body?.appType,
      permissions: req.body?.permissions,
      metadata: req.body?.metadata,
      requestId: req.requestId,
      source: 'admin.v3.integrations',
    });

    return ok(res, result, 201);
  } catch (error) {
    return next(error);
  }
});

router.get('/:appId', async (req, res, next) => {
  try {
    return ok(res, await integrationRegistryService.getAppById(req.params.appId));
  } catch (error) {
    return next(error);
  }
});

router.post('/:appId/keys', async (req, res, next) => {
  try {
    const result = await integrationRegistryService.issueKey({
      appId: req.params.appId,
      label: req.body?.label,
      expiresAt: req.body?.expiresAt,
      issuedBy: getV3RuntimeActor(req),
      requestId: req.requestId,
      source: 'admin.v3.integrations',
    });

    return ok(res, result, 201);
  } catch (error) {
    return next(error);
  }
});

router.post('/:appId/keys/:keyId/revoke', async (req, res, next) => {
  try {
    const result = await integrationRegistryService.revokeKey({
      appId: req.params.appId,
      keyId: req.params.keyId,
      revokedBy: getV3RuntimeActor(req),
      requestId: req.requestId,
      source: 'admin.v3.integrations',
    });

    return ok(res, result);
  } catch (error) {
    return next(error);
  }
});

router.post('/status', (_req, res) => {
  return fail(res, 405, 'Use GET /api/admin/v3/integrations');
});

export default router;
