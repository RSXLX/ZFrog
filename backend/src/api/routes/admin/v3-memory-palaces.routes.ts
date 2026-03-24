import { Router } from 'express';
import { v3CollaborativeMemoryService } from '../../../modules/memory-palace-v3/collaborative-memory.service';
import {
  MEMORY_PALACE_TEMPLATE_REVIEW_DECISIONS,
  MEMORY_PALACE_TEMPLATE_STATUSES,
  type MemoryPalaceTemplateReviewDecision,
  type MemoryPalaceTemplateStatus,
  v3MemoryPalaceTemplatePackService,
} from '../../../modules/memory-palace-templates/template-pack.service';
import { assertV3RuntimeEnabled, getV3RuntimeActor } from '../../../platform/runtime/v3-runtime.service';

const router: Router = Router();

const WORLD_ID_PATTERN = /^mpw_[a-z0-9]+$/;
const VISIT_ID_PATTERN = /^mpv_[a-z0-9]+$/;
const TEMPLATE_ID_PATTERN = /^mpt_[a-z0-9]+$/;

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

const parseWorldId = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (!WORLD_ID_PATTERN.test(normalized)) {
    return null;
  }
  return normalized;
};

const parseVisitId = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (!VISIT_ID_PATTERN.test(normalized)) {
    return null;
  }
  return normalized;
};

const parseTemplateId = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (!TEMPLATE_ID_PATTERN.test(normalized)) {
    return null;
  }
  return normalized;
};

const parseReason = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }
  return normalized.slice(0, 240);
};

const parseLimit = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 20;
  }
  return Math.min(parsed, 100);
};

const parseTemplateStatus = (value: unknown): MemoryPalaceTemplateStatus | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return null;
  }
  if (!MEMORY_PALACE_TEMPLATE_STATUSES.includes(normalized as MemoryPalaceTemplateStatus)) {
    return null;
  }
  return normalized as MemoryPalaceTemplateStatus;
};

const parseTemplateReviewDecision = (value: unknown): MemoryPalaceTemplateReviewDecision | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return null;
  }
  if (!MEMORY_PALACE_TEMPLATE_REVIEW_DECISIONS.includes(normalized as MemoryPalaceTemplateReviewDecision)) {
    return null;
  }
  return normalized as MemoryPalaceTemplateReviewDecision;
};

const parseAppId = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  if (!/^[a-zA-Z0-9_:-]{3,64}$/.test(normalized)) {
    return null;
  }
  return normalized;
};

const parseMetadata = (value: unknown): Record<string, unknown> | undefined | null => {
  if (typeof value === 'undefined') {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (Array.isArray(value) || typeof value !== 'object') {
    return null;
  }
  return value as Record<string, unknown>;
};

router.get('/templates/review', async (req, res, next) => {
  const status = parseTemplateStatus(req.query.status);
  if (req.query.status && !status) {
    return fail(res, 400, 'status is invalid');
  }

  const createdByAppId = parseAppId(req.query.appId);
  if (req.query.appId && !createdByAppId) {
    return fail(res, 400, 'appId is invalid');
  }

  const limit = parseLimit(req.query.limit);

  try {
    assertV3RuntimeEnabled('memory');
    const result = await v3MemoryPalaceTemplatePackService.listTemplatesForAdmin({
      status: status || 'IN_REVIEW',
      ...(createdByAppId ? { createdByAppId } : {}),
      limit,
    });

    return ok(res, {
      ...result,
      filters: {
        status: status || 'IN_REVIEW',
        appId: createdByAppId || null,
        limit,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/templates/:templateId/review', async (req, res, next) => {
  const templateId = parseTemplateId(req.params.templateId);
  if (!templateId) {
    return fail(res, 400, 'templateId is invalid');
  }

  const decision = parseTemplateReviewDecision(req.body?.decision);
  if (!decision) {
    return fail(res, 400, 'decision is invalid');
  }

  const featureEnabled = req.body?.featureEnabled;
  if (typeof featureEnabled !== 'undefined' && typeof featureEnabled !== 'boolean') {
    return fail(res, 400, 'featureEnabled must be a boolean');
  }

  const note = parseReason(req.body?.note);
  const actor = getV3RuntimeActor(req) || 'admin:unknown';

  try {
    assertV3RuntimeEnabled('memory');
    const result = await v3MemoryPalaceTemplatePackService.adminReviewTemplate({
      templateId,
      decision,
      ...(typeof featureEnabled === 'boolean' ? { featureEnabled } : {}),
      ...(note ? { note } : {}),
      requestedBy: {
        actor,
        requestId: req.requestId ?? null,
      },
    });

    return ok(res, {
      ...result,
      receipt: {
        action: decision === 'APPROVE' ? 'approved' : 'rejected',
        templateId,
        actor,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/templates/:templateId/feature', async (req, res, next) => {
  const templateId = parseTemplateId(req.params.templateId);
  if (!templateId) {
    return fail(res, 400, 'templateId is invalid');
  }

  const enabled = req.body?.enabled;
  if (typeof enabled !== 'boolean') {
    return fail(res, 400, 'enabled must be a boolean');
  }

  const reason = parseReason(req.body?.reason);
  const actor = getV3RuntimeActor(req) || 'admin:unknown';

  try {
    assertV3RuntimeEnabled('memory');
    const result = await v3MemoryPalaceTemplatePackService.adminToggleTemplateFeature({
      templateId,
      enabled,
      ...(reason ? { reason } : {}),
      requestedBy: {
        actor,
        requestId: req.requestId ?? null,
      },
    });

    return ok(res, {
      ...result,
      receipt: {
        action: enabled ? 'feature_enabled' : 'feature_disabled',
        templateId,
        actor,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/:worldId/feature', async (req, res, next) => {
  const worldId = parseWorldId(req.params.worldId);
  if (!worldId) {
    return fail(res, 400, 'worldId is invalid');
  }

  const visitId = parseVisitId(req.body?.visitId);
  if (!visitId) {
    return fail(res, 400, 'visitId is invalid');
  }

  const featured = req.body?.featured;
  if (typeof featured !== 'boolean') {
    return fail(res, 400, 'featured must be a boolean');
  }

  const metadata = parseMetadata(req.body?.metadata);
  if (metadata === null) {
    return fail(res, 400, 'metadata must be an object');
  }
  const reason = parseReason(req.body?.reason);

  const actor = getV3RuntimeActor(req) || 'admin:unknown';

  try {
    assertV3RuntimeEnabled('memory');

    const result = await v3CollaborativeMemoryService.featureVisitByAdmin({
      worldId,
      visitId,
      featured,
      ...(typeof metadata !== 'undefined' ? { metadata } : {}),
      ...(reason ? { reason } : {}),
      requestedBy: {
        actor,
        requestId: req.requestId ?? null,
      },
    });

    return ok(res, {
      ...result,
      receipt: {
        action: featured ? 'featured' : 'unfeatured',
        worldId,
        visitId,
        actor,
      },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
