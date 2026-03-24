import { Router } from 'express';
import {
  listCouncilPolicyAuditEvents,
  recordCouncilPolicyAuditEvent,
} from '../../../modules/council/council-audit.service';
import {
  getCouncilRiskPolicySnapshot,
  isCouncilPolicyRiskLevel,
  setCouncilRiskLevelOverride,
  type CouncilPolicyRiskLevel,
} from '../../../modules/council/council-policy.service';
import {
  isCouncilSuggestionRiskLevel,
  isCouncilSuggestionStatus,
  type CouncilSuggestionRiskLevel,
  type CouncilSuggestionStatus,
  v3CouncilSuggestionService,
} from '../../../modules/council/council-suggestion.service';
import { getV3RuntimeActor } from '../../../platform/runtime/v3-runtime.service';

const router: Router = Router();

const ok = <T>(res: any, data: T, status = 200) =>
  res.status(status).json({
    success: true,
    data,
  });

const fail = (res: any, status: number, message: string, details?: Record<string, unknown>) =>
  res.status(status).json({
    success: false,
    message,
    ...(details ? { details } : {}),
  });

const parseOptionalReason = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim().slice(0, 200) : null;

const parseOptionalStatus = (value: unknown): CouncilSuggestionStatus | undefined => {
  if (typeof value === 'undefined' || value === null) {
    return undefined;
  }
  const normalized = String(value).trim().toUpperCase();
  if (!normalized) {
    return undefined;
  }
  if (!isCouncilSuggestionStatus(normalized)) {
    return undefined;
  }
  return normalized;
};

const parseOptionalRiskLevel = (value: unknown): CouncilSuggestionRiskLevel | undefined => {
  if (typeof value === 'undefined' || value === null) {
    return undefined;
  }
  const normalized = String(value).trim().toUpperCase();
  if (!normalized) {
    return undefined;
  }
  if (!isCouncilSuggestionRiskLevel(normalized)) {
    return undefined;
  }
  return normalized;
};

const parseOptionalPolicyRiskLevel = (value: unknown): CouncilPolicyRiskLevel | undefined => {
  if (typeof value === 'undefined' || value === null) {
    return undefined;
  }
  const normalized = String(value).trim().toUpperCase();
  if (!normalized) {
    return undefined;
  }
  if (!isCouncilPolicyRiskLevel(normalized)) {
    return undefined;
  }
  return normalized;
};

const parseLimit = (value: unknown): number => {
  if (typeof value === 'undefined' || value === null || value === '') {
    return 20;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 20;
  }
  return Math.min(parsed, 100);
};

const parseOptionalAppId = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  if (!/^[a-zA-Z0-9_-]{2,80}$/.test(normalized)) {
    return undefined;
  }

  return normalized;
};

router.get('/audit', async (req, res, next) => {
  const status = parseOptionalStatus(req.query.status);
  if (req.query.status && !status) {
    return fail(res, 400, 'status is invalid');
  }

  const riskLevel = parseOptionalRiskLevel(req.query.riskLevel);
  if (req.query.riskLevel && !riskLevel) {
    return fail(res, 400, 'riskLevel is invalid');
  }

  const appId = parseOptionalAppId(req.query.appId);
  if (req.query.appId && !appId) {
    return fail(res, 400, 'appId is invalid');
  }

  const limit = parseLimit(req.query.limit);

  try {
    const result = await v3CouncilSuggestionService.listSuggestionsForAdmin({
      scopeAppId: appId,
      ...(status ? { status } : {}),
      ...(riskLevel ? { riskLevel } : {}),
      limit,
    });

    return ok(res, {
      ...result,
      filters: {
        appId: appId || null,
        status: status || null,
        riskLevel: riskLevel || null,
        limit,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/policy', (_req, res) => {
  return ok(res, getCouncilRiskPolicySnapshot());
});

router.get('/policy/audit', async (req, res, next) => {
  const riskLevel = parseOptionalPolicyRiskLevel(req.query.riskLevel);
  if (req.query.riskLevel && !riskLevel) {
    return fail(res, 400, 'riskLevel is invalid');
  }
  const limit = parseLimit(req.query.limit);

  try {
    const items = await listCouncilPolicyAuditEvents({
      limit,
      ...(riskLevel ? { riskLevel } : {}),
    });

    return ok(res, {
      items,
      count: items.length,
      filters: {
        riskLevel: riskLevel || null,
        limit,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/policy/risk-levels/:riskLevel/toggle', async (req, res, next) => {
  const riskLevel = parseOptionalPolicyRiskLevel(req.params.riskLevel);
  if (!riskLevel) {
    return fail(res, 400, 'riskLevel is invalid');
  }

  const active = req.body?.active;
  if (typeof active !== 'boolean') {
    return fail(res, 400, 'active must be a boolean');
  }

  const reason = parseOptionalReason(req.body?.reason);
  const actor = getV3RuntimeActor(req);

  try {
    const snapshot = setCouncilRiskLevelOverride({
      riskLevel,
      enabled: active,
      updatedBy: actor,
      reason,
    });

    const levelStatus = snapshot.levels.find((item) => item.riskLevel === riskLevel) || null;
    const override = snapshot.overrides.find((item) => item.riskLevel === riskLevel) || null;
    const action = active ? 'risk_level_enabled' : 'risk_level_disabled';

    await recordCouncilPolicyAuditEvent({
      action,
      riskLevel,
      actor,
      reason: override?.reason || reason,
      requestId: req.requestId ?? null,
      source: 'admin.v3.council',
      details: {
        envEnabled: levelStatus?.envEnabled ?? true,
        overrideEnabled: levelStatus?.overrideEnabled ?? true,
        effectiveEnabled: levelStatus?.effectiveEnabled ?? false,
        reason: levelStatus?.reason || 'policy_override_disabled',
      },
    });

    return ok(res, {
      ...snapshot,
      receipt: {
        action,
        riskLevel,
        updatedAt: override?.updatedAt || null,
        updatedBy: override?.updatedBy || null,
        reason: override?.reason || null,
      },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
