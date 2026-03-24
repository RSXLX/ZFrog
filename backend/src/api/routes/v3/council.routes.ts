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
  type CouncilBriefChannel,
  type UpdateCouncilBriefPreferencesCommand,
  isCouncilBriefChannel,
  v3CouncilBriefService,
} from '../../../modules/council/council-brief.service';
import {
  type CouncilSuggestionDecision,
  type CouncilSuggestionRiskLevel,
  type CouncilSuggestionStatus,
  type CreateCouncilSuggestionCommand,
  isCouncilSuggestionStatus,
  type RespondCouncilSuggestionCommand,
  v3CouncilSuggestionService,
} from '../../../modules/council/council-suggestion.service';

const router: Router = Router();

const SUGGESTION_ID_PATTERN = /^csg_[a-z0-9]+$/;

const createSuggestionBodySchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    focus: z.string().trim().min(1).max(160),
    objective: z.string().trim().max(280).optional(),
    rationale: z.string().trim().max(500).optional(),
    riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    dataSources: z
      .array(
        z
          .object({
            source: z.string().trim().min(1).max(80),
            referenceId: z.string().trim().max(120).optional(),
            freshness: z.string().trim().max(80).optional(),
          })
          .strict()
      )
      .min(1)
      .max(8)
      .optional(),
    suggestedActions: z
      .array(
        z
          .object({
            label: z.string().trim().min(1).max(80),
            detail: z.string().trim().max(240).optional(),
          })
          .strict()
      )
      .min(1)
      .max(5)
      .optional(),
  })
  .strict();

const respondSuggestionBodySchema = z
  .object({
    decision: z.enum(['ACCEPT', 'REJECT', 'DEFER']),
    note: z.string().trim().max(280).optional(),
  })
  .strict();

const updateBriefPreferencesBodySchema = z
  .object({
    enabled: z.boolean().optional(),
    throttleMs: z.number().int().optional(),
    channels: z
      .object({
        desktop: z.boolean().optional(),
        mobileLite: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine(
    (payload) =>
      typeof payload.enabled === 'boolean' ||
      typeof payload.throttleMs === 'number' ||
      typeof payload.channels === 'object',
    {
      message: 'at least one preference field must be provided',
      path: [],
    }
  );

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

const parseSuggestionId = (value: string): string => {
  const suggestionId = value.trim().toLowerCase();
  if (!SUGGESTION_ID_PATTERN.test(suggestionId)) {
    throw new AppError(400, 'suggestionId is invalid', 'INVALID_INPUT', {
      suggestionId: value,
    });
  }
  return suggestionId;
};

const parseQueryStatus = (value: unknown): CouncilSuggestionStatus | undefined => {
  if (typeof value === 'undefined') {
    return undefined;
  }
  const candidate = String(value).trim().toUpperCase();
  if (!candidate) {
    return undefined;
  }
  if (!isCouncilSuggestionStatus(candidate)) {
    throw new AppError(400, 'status is invalid', 'INVALID_INPUT', {
      status: value,
      supported: ['OPEN', 'ACCEPTED', 'REJECTED', 'DEFERRED'],
    });
  }
  return candidate;
};

const parseQueryLimit = (value: unknown): number | undefined => {
  if (typeof value === 'undefined') {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(400, 'limit must be a positive integer', 'INVALID_INPUT', {
      limit: value,
    });
  }
  return parsed;
};

const parseBriefChannel = (value: unknown): CouncilBriefChannel => {
  if (typeof value === 'undefined') {
    return 'desktop';
  }
  const candidate = String(value).trim().toLowerCase();
  if (!candidate) {
    return 'desktop';
  }
  if (!isCouncilBriefChannel(candidate)) {
    throw new AppError(400, 'channel is invalid', 'INVALID_INPUT', {
      channel: value,
      supported: ['desktop', 'mobile_lite'],
    });
  }
  return candidate;
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

const councilWriteRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (req.v3Integration) {
      return `v3-council:${req.v3Integration.app.id}:${req.v3Integration.key.id}:write`;
    }
    return `v3-council:ip:${req.ip || req.socket.remoteAddress || 'unknown'}:write`;
  },
  handler: (req, res) =>
    respondError(
      req,
      res,
      429,
      'COUNCIL_RATE_LIMITED',
      'too many council write operations, retry later',
      {
        windowMs: 60_000,
        max: 20,
      }
    ),
});

router.get(
  '/brief/preferences',
  v3IntegrationAuthRequired({ module: 'council', action: 'read' }),
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('council');
    const actor = getIntegrationActor(req);
    const preferences = v3CouncilBriefService.getPreferences({
      scopeAppId: actor.appId,
    });
    return respondSuccess(req, res, preferences);
  })
);

router.post(
  '/brief/preferences',
  v3IntegrationAuthRequired({ module: 'council', action: 'write' }),
  councilWriteRateLimiter,
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('council');
    const body = parseBody(updateBriefPreferencesBodySchema, req.body);
    const actor = getIntegrationActor(req);

    const command: UpdateCouncilBriefPreferencesCommand = {
      ...(typeof body.enabled === 'boolean' ? { enabled: body.enabled } : {}),
      ...(typeof body.throttleMs === 'number' ? { throttleMs: body.throttleMs } : {}),
      ...(body.channels
        ? {
            channels: {
              ...(typeof body.channels.desktop === 'boolean'
                ? { desktop: body.channels.desktop }
                : {}),
              ...(typeof body.channels.mobileLite === 'boolean'
                ? { mobileLite: body.channels.mobileLite }
                : {}),
            },
          }
        : {}),
      requestedBy: {
        appId: actor.appId,
        keyId: actor.keyId,
        actor: actor.actor,
        requestId: actor.requestId,
      },
    };

    const preferences = v3CouncilBriefService.updatePreferences(command);
    return respondSuccess(req, res, preferences);
  })
);

router.get(
  '/brief',
  v3IntegrationAuthRequired({ module: 'council', action: 'read' }),
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('council');
    const actor = getIntegrationActor(req);
    const channel = parseBriefChannel(req.query.channel);
    const brief = await v3CouncilBriefService.getBrief({
      scopeAppId: actor.appId,
      channel,
    });
    return respondSuccess(req, res, brief);
  })
);

router.get(
  '/suggestions',
  v3IntegrationAuthRequired({ module: 'council', action: 'read' }),
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('council');
    const actor = getIntegrationActor(req);
    const status = parseQueryStatus(req.query.status);
    const limit = parseQueryLimit(req.query.limit);

    const result = await v3CouncilSuggestionService.listSuggestions({
      scopeAppId: actor.appId,
      ...(status ? { status } : {}),
      ...(typeof limit === 'number' ? { limit } : {}),
    });

    return respondSuccess(req, res, result);
  })
);

router.post(
  '/suggestions',
  v3IntegrationAuthRequired({ module: 'council', action: 'write' }),
  councilWriteRateLimiter,
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('council');
    const body = parseBody(createSuggestionBodySchema, req.body);
    const actor = getIntegrationActor(req);

    const command: CreateCouncilSuggestionCommand = {
      ...(body.title ? { title: body.title.trim() } : {}),
      focus: body.focus.trim(),
      ...(body.objective ? { objective: body.objective.trim() } : {}),
      ...(body.rationale ? { rationale: body.rationale.trim() } : {}),
      ...(body.riskLevel ? { riskLevel: body.riskLevel as CouncilSuggestionRiskLevel } : {}),
      ...(body.dataSources
        ? {
            dataSources: body.dataSources.map((item) => ({
              source: item.source.trim(),
              ...(item.referenceId ? { referenceId: item.referenceId.trim() } : {}),
              ...(item.freshness ? { freshness: item.freshness.trim() } : {}),
            })),
          }
        : {}),
      ...(body.suggestedActions
        ? {
            suggestedActions: body.suggestedActions.map((item) => ({
              label: item.label.trim(),
              ...(item.detail ? { detail: item.detail.trim() } : {}),
            })),
          }
        : {}),
      requestedBy: {
        appId: actor.appId,
        keyId: actor.keyId,
        actor: actor.actor,
        requestId: actor.requestId,
      },
    };

    const suggestion = await v3CouncilSuggestionService.createSuggestion(command);
    return respondSuccess(req, res, suggestion, 201);
  })
);

router.get(
  '/suggestions/:suggestionId',
  v3IntegrationAuthRequired({ module: 'council', action: 'read' }),
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('council');
    const actor = getIntegrationActor(req);
    const suggestionId = parseSuggestionId(req.params.suggestionId);
    const suggestion = await v3CouncilSuggestionService.getSuggestionById({
      suggestionId,
      scopeAppId: actor.appId,
    });
    return respondSuccess(req, res, suggestion);
  })
);

router.post(
  '/suggestions/:suggestionId/respond',
  v3IntegrationAuthRequired({ module: 'council', action: 'write' }),
  councilWriteRateLimiter,
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('council');
    const actor = getIntegrationActor(req);
    const suggestionId = parseSuggestionId(req.params.suggestionId);
    const body = parseBody(respondSuggestionBodySchema, req.body);

    const command: RespondCouncilSuggestionCommand = {
      suggestionId,
      decision: body.decision as CouncilSuggestionDecision,
      ...(body.note ? { note: body.note.trim() } : {}),
      requestedBy: {
        appId: actor.appId,
        actor: actor.actor,
      },
    };

    const suggestion = await v3CouncilSuggestionService.respondSuggestion(command);
    return respondSuccess(req, res, suggestion);
  })
);

export default router;
