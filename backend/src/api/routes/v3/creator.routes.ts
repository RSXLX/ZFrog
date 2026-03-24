import { Router, type Request } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { respondError, respondSuccess } from '../../response';
import { AppError, asyncHandler } from '../../../middlewares/errorHandler';
import {
  getV3IntegrationAccess,
  v3IntegrationAuthRequired,
} from '../../../middlewares/v3-integration-auth.middleware';
import { assertV3RuntimeEnabled } from '../../../platform/runtime/v3-runtime.service';
import {
  CREATOR_ASSET_TYPES,
  CREATOR_PACK_STATUSES,
  type CreateCreatorAssetCommand,
  type CreateCreatorPackDraftCommand,
  type CreatorPackStatus,
  type SubmitCreatorPackForReviewCommand,
  v3CreatorPipelineService,
} from '../../../modules/creator/creator-pipeline.service';
import {
  type CreateCreatorLicenseBindingCommand,
  type ReplayCreatorLicenseBindingCommand,
  v3CreatorLicenseAnchorService,
} from '../../../modules/creator-onchain/creator-license-anchor.service';

const router: Router = Router();

const PACK_ID_PATTERN = /^cpk_[a-z0-9]+$/;
const ASSET_ID_PATTERN = /^cas_[a-z0-9]+$/;
const BINDING_ID_PATTERN = /^cab_[a-z0-9]+$/;
const CHECKSUM_PATTERN = /^[a-f0-9]{16,128}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const createCreatorAssetBodySchema = z
  .object({
    type: z.enum(CREATOR_ASSET_TYPES),
    mimeType: z.string().trim().min(1).max(120),
    sourceUrl: z.string().trim().url().max(512),
    checksum: z.string().trim().regex(CHECKSUM_PATTERN),
    bytes: z.number().int().positive(),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict();

const createCreatorPackBodySchema = z
  .object({
    slug: z.string().trim().min(1).max(64).regex(SLUG_PATTERN),
    title: z.string().trim().min(1).max(120),
    summary: z.string().trim().max(500).optional(),
    assetIds: z.array(z.string().trim().regex(ASSET_ID_PATTERN)).min(1).max(24),
  })
  .strict();

const submitCreatorPackBodySchema = z
  .object({
    note: z.string().trim().max(280).optional(),
  })
  .strict();

const createCreatorLicenseAnchorBodySchema = z
  .object({
    ownerWallet: z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/),
    issuedAt: z.string().datetime({ offset: true }),
  })
  .strict();

const replayCreatorLicenseAnchorBodySchema = z
  .object({
    force: z.boolean().optional(),
  })
  .strict();

const parseBody = <TSchema extends z.ZodTypeAny>(schema: TSchema, payload: unknown): z.infer<TSchema> => {
  const parsed = schema.safeParse(payload);
  if (parsed.success) {
    return parsed.data;
  }

  throw new AppError(400, 'invalid request body', 'INVALID_INPUT', {
    issues: parsed.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  });
};

const parsePackId = (value: string): string => {
  const packId = value.trim().toLowerCase();
  if (!PACK_ID_PATTERN.test(packId)) {
    throw new AppError(400, 'packId is invalid', 'INVALID_INPUT', {
      packId: value,
    });
  }
  return packId;
};

const parseAssetId = (value: string): string => {
  const assetId = value.trim().toLowerCase();
  if (!ASSET_ID_PATTERN.test(assetId)) {
    throw new AppError(400, 'assetId is invalid', 'INVALID_INPUT', {
      assetId: value,
    });
  }
  return assetId;
};

const parseBindingId = (value: string): string => {
  const bindingId = value.trim().toLowerCase();
  if (!BINDING_ID_PATTERN.test(bindingId)) {
    throw new AppError(400, 'bindingId is invalid', 'INVALID_INPUT', {
      bindingId: value,
    });
  }
  return bindingId;
};

const parseLimit = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 20;
  }
  return Math.min(parsed, 100);
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
    throw new AppError(400, 'pack status is invalid', 'INVALID_INPUT', {
      status: value,
    });
  }

  return normalized as CreatorPackStatus;
};

const getIntegrationActor = (req: Request): {
  appId: string;
  keyId: string;
  actor: string;
  requestId: string | null;
} => {
  const integration = getV3IntegrationAccess(req);
  return {
    appId: integration.app.id,
    keyId: integration.key.id,
    actor: `${integration.app.slug}:${integration.key.id}`,
    requestId: req.requestId ?? null,
  };
};

const creatorWriteRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (req.v3Integration) {
      return `v3-creator:${req.v3Integration.app.id}:${req.v3Integration.key.id}:write`;
    }
    return `v3-creator:ip:${req.ip || req.socket.remoteAddress || 'unknown'}:write`;
  },
  handler: (req, res) =>
    respondError(
      req,
      res,
      429,
      'CREATOR_WRITE_RATE_LIMITED',
      'too many creator write operations, retry later',
      {
        windowMs: 60_000,
        max: 20,
      }
    ),
});

router.post(
  '/assets',
  v3IntegrationAuthRequired({
    permission: 'creator.asset.write',
    module: 'creator',
    action: 'write',
  }),
  creatorWriteRateLimiter,
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('creator');
    const body = parseBody(createCreatorAssetBodySchema, req.body);
    const actor = getIntegrationActor(req);

    const command: CreateCreatorAssetCommand = {
      type: body.type,
      mimeType: body.mimeType.trim().toLowerCase(),
      sourceUrl: body.sourceUrl.trim(),
      checksum: body.checksum.trim().toLowerCase(),
      bytes: body.bytes,
      ...(body.metadata ? { metadata: body.metadata } : {}),
      requestedBy: {
        appId: actor.appId,
        keyId: actor.keyId,
        actor: actor.actor,
        requestId: actor.requestId,
      },
    };

    const asset = await v3CreatorPipelineService.createAsset(command);
    return respondSuccess(req, res, asset, 201);
  })
);

router.get(
  '/assets',
  v3IntegrationAuthRequired({
    permission: 'creator.asset.write',
    module: 'creator',
    action: 'read',
  }),
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('creator');
    const actor = getIntegrationActor(req);

    const assets = await v3CreatorPipelineService.listAssets({
      scopeAppId: actor.appId,
      limit: parseLimit(req.query.limit),
    });

    return respondSuccess(req, res, assets);
  })
);

router.post(
  '/packs',
  v3IntegrationAuthRequired({
    permission: 'creator.pack.write',
    module: 'creator',
    action: 'write',
  }),
  creatorWriteRateLimiter,
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('creator');
    const body = parseBody(createCreatorPackBodySchema, req.body);
    const actor = getIntegrationActor(req);

    const command: CreateCreatorPackDraftCommand = {
      slug: body.slug.trim().toLowerCase(),
      title: body.title.trim(),
      ...(body.summary ? { summary: body.summary.trim() } : {}),
      assetIds: body.assetIds.map((assetId) => assetId.trim().toLowerCase()),
      requestedBy: {
        appId: actor.appId,
        keyId: actor.keyId,
        actor: actor.actor,
        requestId: actor.requestId,
      },
    };

    const pack = await v3CreatorPipelineService.createPackDraft(command);
    return respondSuccess(req, res, pack, 201);
  })
);

router.get(
  '/packs',
  v3IntegrationAuthRequired({
    permission: 'creator.pack.write',
    module: 'creator',
    action: 'read',
  }),
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('creator');
    const actor = getIntegrationActor(req);
    const status = parsePackStatus(req.query.status);

    const packs = await v3CreatorPipelineService.listPacks({
      scopeAppId: actor.appId,
      ...(status ? { status } : {}),
      limit: parseLimit(req.query.limit),
    });

    return respondSuccess(req, res, packs);
  })
);

router.get(
  '/packs/:packId',
  v3IntegrationAuthRequired({
    permission: 'creator.pack.write',
    module: 'creator',
    action: 'read',
  }),
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('creator');
    const actor = getIntegrationActor(req);
    const packId = parsePackId(req.params.packId);

    const pack = await v3CreatorPipelineService.getPackById({
      packId,
      scopeAppId: actor.appId,
    });

    return respondSuccess(req, res, pack);
  })
);

router.post(
  '/packs/:packId/resubmit',
  v3IntegrationAuthRequired({
    permission: 'creator.pack.write',
    module: 'creator',
    action: 'write',
  }),
  creatorWriteRateLimiter,
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('creator');
    const actor = getIntegrationActor(req);
    const packId = parsePackId(req.params.packId);
    const body = parseBody(submitCreatorPackBodySchema, req.body || {});

    const command: SubmitCreatorPackForReviewCommand = {
      packId,
      scopeAppId: actor.appId,
      ...(body.note ? { note: body.note.trim() } : {}),
      requestedBy: {
        appId: actor.appId,
        actor: actor.actor,
        requestId: actor.requestId,
      },
    };

    const pack = await v3CreatorPipelineService.submitPackForReview(command);
    return respondSuccess(req, res, pack);
  })
);

router.post(
  '/assets/:assetId/license-anchor',
  v3IntegrationAuthRequired({
    permission: 'creator.asset.write',
    module: 'creator',
    action: 'write',
  }),
  creatorWriteRateLimiter,
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('creator');
    const actor = getIntegrationActor(req);
    const assetId = parseAssetId(req.params.assetId);
    const body = parseBody(createCreatorLicenseAnchorBodySchema, req.body || {});

    const command: CreateCreatorLicenseBindingCommand = {
      assetId,
      ownerWallet: body.ownerWallet.trim().toLowerCase(),
      issuedAt: body.issuedAt,
      requestedBy: {
        appId: actor.appId,
        keyId: actor.keyId,
        actor: actor.actor,
        requestId: actor.requestId,
      },
    };

    const result = await v3CreatorLicenseAnchorService.createBinding(command);
    return respondSuccess(req, res, result, 201);
  })
);

router.get(
  '/assets/:assetId/license-anchor',
  v3IntegrationAuthRequired({
    permission: 'creator.asset.write',
    module: 'creator',
    action: 'read',
  }),
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('creator');
    const actor = getIntegrationActor(req);
    const assetId = parseAssetId(req.params.assetId);

    const result = await v3CreatorLicenseAnchorService.listBindingsByAsset({
      scopeAppId: actor.appId,
      assetId,
      limit: parseLimit(req.query.limit),
    });

    return respondSuccess(req, res, result);
  })
);

router.post(
  '/license-anchors/:bindingId/replay',
  v3IntegrationAuthRequired({
    permission: 'creator.asset.write',
    module: 'creator',
    action: 'write',
  }),
  creatorWriteRateLimiter,
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('creator');
    const actor = getIntegrationActor(req);
    const bindingId = parseBindingId(req.params.bindingId);
    const body = parseBody(replayCreatorLicenseAnchorBodySchema, req.body || {});

    const command: ReplayCreatorLicenseBindingCommand = {
      bindingId,
      scopeAppId: actor.appId,
      force: body.force,
      requestedBy: {
        actor: actor.actor,
        requestId: actor.requestId,
      },
    };

    const result = await v3CreatorLicenseAnchorService.replayBinding(command);
    return respondSuccess(req, res, result);
  })
);

export default router;
