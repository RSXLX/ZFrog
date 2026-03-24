import { Router } from 'express';
import {
  CREATOR_PACK_REVIEW_DECISIONS,
  CREATOR_PACK_STATUSES,
  type CreatorPackReviewDecision,
  type CreatorPackStatus,
  v3CreatorPipelineService,
} from '../../../modules/creator/creator-pipeline.service';
import {
  CREATOR_LICENSE_BINDING_STATUSES,
  type CreatorLicenseBindingStatus,
  type ReplayCreatorLicenseBindingCommand,
  v3CreatorLicenseAnchorService,
} from '../../../modules/creator-onchain/creator-license-anchor.service';
import { assertV3RuntimeEnabled, getV3RuntimeActor } from '../../../platform/runtime/v3-runtime.service';

const router: Router = Router();

const PACK_ID_PATTERN = /^cpk_[a-z0-9]+$/;
const BINDING_ID_PATTERN = /^cab_[a-z0-9]+$/;
const ASSET_ID_PATTERN = /^cas_[a-z0-9]+$/;

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

const parsePackId = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (!PACK_ID_PATTERN.test(normalized)) {
    return null;
  }
  return normalized;
};

const parseBindingId = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (!BINDING_ID_PATTERN.test(normalized)) {
    return null;
  }
  return normalized;
};

const parseAssetId = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (!ASSET_ID_PATTERN.test(normalized)) {
    return undefined;
  }
  return normalized;
};

const parsePackStatus = (value: unknown): CreatorPackStatus | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return undefined;
  }
  if (!CREATOR_PACK_STATUSES.includes(normalized as CreatorPackStatus)) {
    return undefined;
  }
  return normalized as CreatorPackStatus;
};

const parseReviewDecision = (value: unknown): CreatorPackReviewDecision | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return null;
  }
  if (!CREATOR_PACK_REVIEW_DECISIONS.includes(normalized as CreatorPackReviewDecision)) {
    return null;
  }
  return normalized as CreatorPackReviewDecision;
};

const parseBindingStatus = (value: unknown): CreatorLicenseBindingStatus | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return undefined;
  }
  if (!CREATOR_LICENSE_BINDING_STATUSES.includes(normalized as CreatorLicenseBindingStatus)) {
    return undefined;
  }
  return normalized as CreatorLicenseBindingStatus;
};

const parseLimit = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 20;
  }
  return Math.min(parsed, 100);
};

const parseOptionalText = (value: unknown, maxLength: number): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }
  return normalized.slice(0, maxLength);
};

const parseOptionalAppId = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }
  if (!/^[a-zA-Z0-9_:-]{2,80}$/.test(normalized)) {
    return undefined;
  }
  return normalized;
};

router.get('/review-queue', async (req, res, next) => {
  const status = parsePackStatus(req.query.status);
  if (req.query.status && !status) {
    return fail(res, 400, 'status is invalid');
  }

  const appId = parseOptionalAppId(req.query.appId);
  if (req.query.appId && !appId) {
    return fail(res, 400, 'appId is invalid');
  }

  const limit = parseLimit(req.query.limit);

  try {
    assertV3RuntimeEnabled('creator');
    const result = await v3CreatorPipelineService.listPacksForAdmin({
      status: status || 'IN_REVIEW',
      ...(appId ? { creatorAppId: appId } : {}),
      limit,
    });

    return ok(res, {
      ...result,
      filters: {
        status: status || 'IN_REVIEW',
        appId: appId || null,
        limit,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/packs/:packId/preview', async (req, res, next) => {
  const packId = parsePackId(req.params.packId);
  if (!packId) {
    return fail(res, 400, 'packId is invalid');
  }

  try {
    assertV3RuntimeEnabled('creator');
    const preview = await v3CreatorPipelineService.buildPackPreview({
      packId,
    });

    return ok(res, preview);
  } catch (error) {
    return next(error);
  }
});

router.post('/packs/:packId/review', async (req, res, next) => {
  const packId = parsePackId(req.params.packId);
  if (!packId) {
    return fail(res, 400, 'packId is invalid');
  }

  const decision = parseReviewDecision(req.body?.decision);
  if (!decision) {
    return fail(res, 400, 'decision is invalid');
  }

  const note = parseOptionalText(req.body?.note, 280);
  const actor = getV3RuntimeActor(req) || 'admin:unknown';

  try {
    assertV3RuntimeEnabled('creator');
    const pack = await v3CreatorPipelineService.adminReviewPack({
      packId,
      decision,
      ...(note ? { note } : {}),
      requestedBy: {
        actor,
        requestId: req.requestId ?? null,
      },
    });

    return ok(res, {
      ...pack,
      receipt: {
        action: decision === 'APPROVE' ? 'approved' : 'rejected',
        packId,
        actor,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/packs/:packId/rollback', async (req, res, next) => {
  const packId = parsePackId(req.params.packId);
  if (!packId) {
    return fail(res, 400, 'packId is invalid');
  }

  const reason = parseOptionalText(req.body?.reason, 240);
  const actor = getV3RuntimeActor(req) || 'admin:unknown';

  try {
    assertV3RuntimeEnabled('creator');
    const pack = await v3CreatorPipelineService.adminRollbackPack({
      packId,
      ...(reason ? { reason } : {}),
      requestedBy: {
        actor,
        requestId: req.requestId ?? null,
      },
    });

    return ok(res, {
      ...pack,
      receipt: {
        action: 'rolled_back',
        packId,
        actor,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/license-anchors', async (req, res, next) => {
  const status = parseBindingStatus(req.query.status);
  if (req.query.status && !status) {
    return fail(res, 400, 'status is invalid');
  }

  const appId = parseOptionalAppId(req.query.appId);
  if (req.query.appId && !appId) {
    return fail(res, 400, 'appId is invalid');
  }

  const assetId = parseAssetId(req.query.assetId);
  if (req.query.assetId && !assetId) {
    return fail(res, 400, 'assetId is invalid');
  }

  try {
    assertV3RuntimeEnabled('creator');
    const result = await v3CreatorLicenseAnchorService.listBindingsForAdmin({
      ...(status ? { status } : {}),
      ...(appId ? { creatorAppId: appId } : {}),
      ...(assetId ? { assetId } : {}),
      limit: parseLimit(req.query.limit),
    });

    return ok(res, {
      ...result,
      filters: {
        status: status || null,
        appId: appId || null,
        assetId: assetId || null,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/license-anchors/:bindingId/replay', async (req, res, next) => {
  const bindingId = parseBindingId(req.params.bindingId);
  if (!bindingId) {
    return fail(res, 400, 'bindingId is invalid');
  }

  const actor = getV3RuntimeActor(req) || 'admin:unknown';
  const command: ReplayCreatorLicenseBindingCommand = {
    bindingId,
    force: Boolean(req.body?.force),
    requestedBy: {
      actor,
      requestId: req.requestId ?? null,
    },
  };

  try {
    assertV3RuntimeEnabled('creator');
    const result = await v3CreatorLicenseAnchorService.replayBinding(command);
    return ok(res, {
      ...result,
      receipt: {
        action: 'anchor_replay',
        bindingId,
        actor,
      },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
