import { Router } from 'express';
import {
  V3_RUNTIME_MODULES,
  V3RuntimeModule,
  getV3RuntimeActor,
  getV3RuntimeStatusSnapshot,
  setV3KillSwitchOverride,
  setV3ModuleOverride,
} from '../../../platform/runtime/v3-runtime.service';
import {
  listV3RuntimeAuditEvents,
  recordV3RuntimeAuditEvent,
} from '../../../platform/runtime/v3-runtime-audit.service';

const router: Router = Router();
const runtimeModuleSet = new Set<string>(V3_RUNTIME_MODULES);

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

const parseOptionalReason = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim().slice(0, 200) : null;

const parseRuntimeModule = (value: unknown): V3RuntimeModule | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!runtimeModuleSet.has(normalized)) {
    return null;
  }

  return normalized as V3RuntimeModule;
};

router.get('/status', (_req, res) => {
  return ok(res, getV3RuntimeStatusSnapshot());
});

router.post('/kill-switch', async (req, res, next) => {
  const active = req.body?.active;
  if (typeof active !== 'boolean') {
    return fail(res, 400, 'active must be a boolean');
  }

  const reason = parseOptionalReason(req.body?.reason);
  const actor = getV3RuntimeActor(req);

  try {
    const snapshot = setV3KillSwitchOverride({
      active,
      updatedBy: actor,
      reason,
    });

    const action = active ? 'kill_switch_enabled' : 'kill_switch_disabled';
    await recordV3RuntimeAuditEvent({
      action,
      actor,
      reason: snapshot.override.reason,
      requestId: req.requestId ?? null,
      source: 'admin.v3.runtime',
      details: {
        killSwitchActive: snapshot.killSwitchActive,
        runtimeEnabled: snapshot.enabled,
        effectiveEnabled: snapshot.effectiveEnabled,
      },
    });

    return ok(res, {
      ...snapshot,
      receipt: {
        action,
        updatedAt: snapshot.override.updatedAt,
        updatedBy: snapshot.override.updatedBy,
        reason: snapshot.override.reason,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/modules/:module/toggle', async (req, res, next) => {
  const module = parseRuntimeModule(req.params.module);
  if (!module) {
    return fail(res, 400, 'module is invalid');
  }

  const active = req.body?.active;
  if (typeof active !== 'boolean') {
    return fail(res, 400, 'active must be a boolean');
  }

  const reason = parseOptionalReason(req.body?.reason);
  const actor = getV3RuntimeActor(req);

  try {
    const snapshot = setV3ModuleOverride({
      module,
      enabled: active,
      updatedBy: actor,
      reason,
    });

    const moduleOverride = snapshot.moduleOverrides.find((item) => item.module === module) || null;
    const action = active ? 'module_enabled' : 'module_disabled';
    await recordV3RuntimeAuditEvent({
      action,
      module,
      actor,
      reason: moduleOverride?.reason || reason,
      requestId: req.requestId ?? null,
      source: 'admin.v3.runtime',
      details: {
        runtimeEnabled: snapshot.enabled,
        runtimeEffectiveEnabled: snapshot.effectiveEnabled,
        moduleEffectiveEnabled:
          snapshot.modules.find((item) => item.module === module)?.effectiveEnabled ?? false,
      },
    });

    return ok(res, {
      ...snapshot,
      receipt: {
        action,
        module,
        updatedAt: moduleOverride?.updatedAt || null,
        updatedBy: moduleOverride?.updatedBy || null,
        reason: moduleOverride?.reason || null,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/audit', async (req, res, next) => {
  const moduleParam = req.query.module ? parseRuntimeModule(req.query.module) : null;
  if (req.query.module && !moduleParam) {
    return fail(res, 400, 'module is invalid');
  }
  const module = moduleParam || undefined;

  try {
    const items = await listV3RuntimeAuditEvents({
      limit: typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined,
      module,
    });
    return ok(res, {
      items,
      count: items.length,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
