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
  type AddMemoryPalaceCollaboratorCommand,
  type AddMemoryPalaceContributionCommand,
  type AddMemoryPalaceVisitCommand,
  type CreateMemoryPalaceWorldCommand,
  MEMORY_PALACE_CONTRIBUTION_TYPES,
  MEMORY_PALACE_VISIT_ENTRY_TYPES,
  v3CollaborativeMemoryService,
} from '../../../modules/memory-palace-v3/collaborative-memory.service';
import {
  MEMORY_PALACE_TEMPLATE_STATUSES,
  type CreateMemoryPalaceTemplateCommand,
  type MemoryPalaceTemplateStatus,
  type SubmitMemoryPalaceTemplateReviewCommand,
  v3MemoryPalaceTemplatePackService,
} from '../../../modules/memory-palace-templates/template-pack.service';

const router: Router = Router();

const WORLD_ID_PATTERN = /^mpw_[a-z0-9]+$/;
const TEMPLATE_ID_PATTERN = /^mpt_[a-z0-9]+$/;
const APP_ID_PATTERN = /^[a-z0-9_:-]{3,64}$/i;
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

const createWorldBodySchema = z
  .object({
    journeyId: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(120).optional(),
    summary: z.string().trim().max(500).optional(),
    templateSlug: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
  })
  .strict();

const upsertCollaboratorBodySchema = z
  .object({
    appId: z.string().trim().min(3).max(64).regex(APP_ID_PATTERN),
    role: z.enum(['CONTRIBUTOR', 'EDITOR']).optional(),
  })
  .strict();

const addContributionBodySchema = z
  .object({
    type: z.enum(MEMORY_PALACE_CONTRIBUTION_TYPES),
    content: z.string().trim().min(1).max(800),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict();

const addVisitBodySchema = z
  .object({
    entryType: z.enum(MEMORY_PALACE_VISIT_ENTRY_TYPES).optional(),
    message: z.string().trim().min(1).max(280),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict();

const templateThemeSchema = z
  .object({
    palette: z
      .object({
        background: z.string().trim().regex(HEX_COLOR_PATTERN),
        surface: z.string().trim().regex(HEX_COLOR_PATTERN),
        accent: z.string().trim().regex(HEX_COLOR_PATTERN),
        text: z.string().trim().regex(HEX_COLOR_PATTERN),
      })
      .strict(),
    badgeLabel: z.string().trim().min(1).max(40).optional(),
    coverImageUrl: z.string().trim().url().max(320).optional(),
  })
  .strict();

const createTemplateBodySchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: z.string().trim().min(1).max(80),
    summary: z.string().trim().min(1).max(280).optional(),
    theme: templateThemeSchema,
  })
  .strict();

const submitTemplateReviewBodySchema = z
  .object({
    note: z.string().trim().max(240).optional(),
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

const parseWorldId = (value: string): string => {
  const worldId = value.trim().toLowerCase();
  if (!WORLD_ID_PATTERN.test(worldId)) {
    throw new AppError(400, 'worldId is invalid', 'INVALID_INPUT', {
      worldId: value,
    });
  }
  return worldId;
};

const parseTemplateId = (value: string): string => {
  const templateId = value.trim().toLowerCase();
  if (!TEMPLATE_ID_PATTERN.test(templateId)) {
    throw new AppError(400, 'templateId is invalid', 'INVALID_INPUT', {
      templateId: value,
    });
  }
  return templateId;
};

const parseLimit = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 20;
  }
  return Math.min(parsed, 100);
};

const parseTemplateStatus = (value: unknown): MemoryPalaceTemplateStatus | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return undefined;
  }

  if (!MEMORY_PALACE_TEMPLATE_STATUSES.includes(normalized as MemoryPalaceTemplateStatus)) {
    throw new AppError(400, 'template status is invalid', 'INVALID_INPUT', {
      status: value,
    });
  }

  return normalized as MemoryPalaceTemplateStatus;
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

const memoryWriteRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (req.v3Integration) {
      return `v3-memory:${req.v3Integration.app.id}:${req.v3Integration.key.id}:write`;
    }
    return `v3-memory:ip:${req.ip || req.socket.remoteAddress || 'unknown'}:write`;
  },
  handler: (req, res) =>
    respondError(
      req,
      res,
      429,
      'MEMORY_WRITE_RATE_LIMITED',
      'too many collaborative memory write operations, retry later',
      {
        windowMs: 60_000,
        max: 30,
      }
    ),
});

router.post(
  '/',
  v3IntegrationAuthRequired({ module: 'memory', action: 'write' }),
  memoryWriteRateLimiter,
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('memory');
    const body = parseBody(createWorldBodySchema, req.body);
    const actor = getIntegrationActor(req);

    const command: CreateMemoryPalaceWorldCommand = {
      journeyId: body.journeyId.trim(),
      ...(body.title ? { title: body.title.trim() } : {}),
      ...(body.summary ? { summary: body.summary.trim() } : {}),
      ...(body.templateSlug ? { templateSlug: body.templateSlug.trim().toLowerCase() } : {}),
      requestedBy: {
        appId: actor.appId,
        keyId: actor.keyId,
        actor: actor.actor,
        requestId: actor.requestId,
      },
    };

    const world = await v3CollaborativeMemoryService.createWorld(command);
    return respondSuccess(req, res, world, 201);
  })
);

router.get(
  '/templates',
  v3IntegrationAuthRequired({ module: 'memory', action: 'read' }),
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('memory');
    const templates = await v3MemoryPalaceTemplatePackService.listPublishedTemplates({
      limit: parseLimit(req.query.limit),
    });
    return respondSuccess(req, res, templates);
  })
);

router.get(
  '/templates/mine',
  v3IntegrationAuthRequired({ module: 'memory', action: 'read' }),
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('memory');
    const actor = getIntegrationActor(req);
    const status = parseTemplateStatus(req.query.status);
    const templates = await v3MemoryPalaceTemplatePackService.listTemplatesForApp({
      scopeAppId: actor.appId,
      ...(status ? { status } : {}),
      limit: parseLimit(req.query.limit),
    });
    return respondSuccess(req, res, templates);
  })
);

router.post(
  '/templates',
  v3IntegrationAuthRequired({ module: 'memory', action: 'write' }),
  memoryWriteRateLimiter,
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('memory');
    const body = parseBody(createTemplateBodySchema, req.body);
    const actor = getIntegrationActor(req);

    const command: CreateMemoryPalaceTemplateCommand = {
      slug: body.slug.trim().toLowerCase(),
      name: body.name.trim(),
      ...(body.summary ? { summary: body.summary.trim() } : {}),
      theme: {
        palette: {
          background: body.theme.palette.background.trim().toLowerCase(),
          surface: body.theme.palette.surface.trim().toLowerCase(),
          accent: body.theme.palette.accent.trim().toLowerCase(),
          text: body.theme.palette.text.trim().toLowerCase(),
        },
        badgeLabel: body.theme.badgeLabel?.trim() || null,
        coverImageUrl: body.theme.coverImageUrl?.trim() || null,
      },
      requestedBy: {
        appId: actor.appId,
        keyId: actor.keyId,
        actor: actor.actor,
        requestId: actor.requestId,
      },
    };

    const template = await v3MemoryPalaceTemplatePackService.createTemplateDraft(command);
    return respondSuccess(req, res, template, 201);
  })
);

router.post(
  '/templates/:templateId/submit-review',
  v3IntegrationAuthRequired({ module: 'memory', action: 'write' }),
  memoryWriteRateLimiter,
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('memory');
    const templateId = parseTemplateId(req.params.templateId);
    const body = parseBody(submitTemplateReviewBodySchema, req.body);
    const actor = getIntegrationActor(req);

    const command: SubmitMemoryPalaceTemplateReviewCommand = {
      templateId,
      ...(body.note ? { note: body.note.trim() } : {}),
      requestedBy: {
        appId: actor.appId,
        actor: actor.actor,
        requestId: actor.requestId,
      },
    };

    const template = await v3MemoryPalaceTemplatePackService.submitTemplateForReview(command);
    return respondSuccess(req, res, template);
  })
);

router.get(
  '/:worldId/visits',
  v3IntegrationAuthRequired({ module: 'memory', action: 'read' }),
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('memory');
    const worldId = parseWorldId(req.params.worldId);
    const actor = getIntegrationActor(req);
    const visits = await v3CollaborativeMemoryService.listVisits({
      worldId,
      scopeAppId: actor.appId,
      limit: parseLimit(req.query.limit),
    });
    return respondSuccess(req, res, visits);
  })
);

router.post(
  '/:worldId/visits',
  v3IntegrationAuthRequired({ module: 'memory', action: 'write' }),
  memoryWriteRateLimiter,
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('memory');
    const worldId = parseWorldId(req.params.worldId);
    const body = parseBody(addVisitBodySchema, req.body);
    const actor = getIntegrationActor(req);

    const command: AddMemoryPalaceVisitCommand = {
      worldId,
      ...(body.entryType ? { entryType: body.entryType } : {}),
      message: body.message.trim(),
      ...(body.metadata ? { metadata: body.metadata } : {}),
      requestedBy: {
        appId: actor.appId,
        keyId: actor.keyId,
        actor: actor.actor,
        requestId: actor.requestId,
      },
    };

    const visit = await v3CollaborativeMemoryService.addVisit(command);
    return respondSuccess(req, res, visit, 201);
  })
);

router.get(
  '/:worldId',
  v3IntegrationAuthRequired({ module: 'memory', action: 'read' }),
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('memory');
    const worldId = parseWorldId(req.params.worldId);
    const actor = getIntegrationActor(req);
    const world = await v3CollaborativeMemoryService.getWorldById({
      worldId,
      scopeAppId: actor.appId,
    });
    return respondSuccess(req, res, world);
  })
);

router.post(
  '/:worldId/collaborators',
  v3IntegrationAuthRequired({ module: 'memory', action: 'write' }),
  memoryWriteRateLimiter,
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('memory');
    const worldId = parseWorldId(req.params.worldId);
    const body = parseBody(upsertCollaboratorBodySchema, req.body);
    const actor = getIntegrationActor(req);

    const command: AddMemoryPalaceCollaboratorCommand = {
      worldId,
      collaboratorAppId: body.appId.trim(),
      ...(body.role ? { role: body.role } : {}),
      requestedBy: {
        appId: actor.appId,
        actor: actor.actor,
        requestId: actor.requestId,
      },
    };

    const world = await v3CollaborativeMemoryService.addCollaborator(command);
    return respondSuccess(req, res, world);
  })
);

router.post(
  '/:worldId/contributions',
  v3IntegrationAuthRequired({ module: 'memory', action: 'write' }),
  memoryWriteRateLimiter,
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('memory');
    const worldId = parseWorldId(req.params.worldId);
    const body = parseBody(addContributionBodySchema, req.body);
    const actor = getIntegrationActor(req);

    const command: AddMemoryPalaceContributionCommand = {
      worldId,
      type: body.type,
      content: body.content.trim(),
      ...(body.metadata ? { metadata: body.metadata } : {}),
      requestedBy: {
        appId: actor.appId,
        actor: actor.actor,
        requestId: actor.requestId,
      },
    };

    const world = await v3CollaborativeMemoryService.addContribution(command);
    return respondSuccess(req, res, world);
  })
);

export default router;
