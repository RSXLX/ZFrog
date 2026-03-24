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
  type JourneyAdvanceStepCommand,
  type JourneyRiskLevel,
  type JourneySettleStepCommand,
  type JourneyStepInput,
  v3JourneyService,
} from '../../../modules/journey/journey.service';
import { getJourneyViewerById } from '../../../modules/journey/journey.query';
import { getJourneyWorldGraphById } from '../../../modules/journey/world-graph.query';
import {
  type JourneyIncidentTemplate,
  type TriggerJourneyIncidentCommand,
  v3JourneyIncidentService,
} from '../../../modules/journey-events/journey-incident.service';

const router: Router = Router();

const JOURNEY_ID_PATTERN = /^jrn_[a-z0-9]+$/;
const STEP_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const WALLET_PATTERN = /^0x[a-f0-9]{40}$/i;

const journeyStepInputSchema = z
  .object({
    id: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(STEP_ID_PATTERN)
      .optional(),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(280).optional(),
    riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  })
  .strict();

const createJourneyBodySchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(3)
      .max(64)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    title: z.string().trim().min(1).max(120),
    narrativeSeed: z.string().trim().max(500).optional(),
    partyMembers: z.array(z.string().trim().regex(WALLET_PATTERN)).min(1).max(8).optional(),
    steps: z.array(journeyStepInputSchema).min(1).max(12).optional(),
  })
  .strict();

const settleJourneyStepBodySchema = z
  .object({
    result: z.enum(['COMPLETED', 'FAILED', 'SKIPPED']),
    reason: z.string().trim().max(280).optional(),
  })
  .strict();

const advanceJourneyStepBodySchema = z
  .object({
    reason: z.string().trim().max(280).optional(),
  })
  .strict();

const triggerIncidentBodySchema = z
  .object({
    stepId: z.string().trim().min(1).max(64).regex(STEP_ID_PATTERN).optional(),
    template: z.enum(['METEOR_RESCUE_NIGHT']).optional(),
    contextNote: z.string().trim().max(280).optional(),
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

const parseJourneyId = (value: string): string => {
  const journeyId = value.trim();
  if (!JOURNEY_ID_PATTERN.test(journeyId)) {
    throw new AppError(400, 'journeyId is invalid', 'INVALID_INPUT', {
      journeyId: value,
    });
  }
  return journeyId;
};

const parseStepId = (value: string): string => {
  const stepId = value.trim().toLowerCase();
  if (!STEP_ID_PATTERN.test(stepId)) {
    throw new AppError(400, 'stepId is invalid', 'INVALID_INPUT', {
      stepId: value,
    });
  }
  return stepId;
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

const normalizeJourneySteps = (steps: z.infer<typeof journeyStepInputSchema>[] | undefined): JourneyStepInput[] | undefined => {
  if (!steps) {
    return undefined;
  }
  return steps.map((step) => ({
    ...(step.id ? { id: step.id.trim().toLowerCase() } : {}),
    title: step.title.trim(),
    ...(step.description ? { description: step.description.trim() } : {}),
    ...(step.riskLevel ? { riskLevel: step.riskLevel as JourneyRiskLevel } : {}),
  }));
};

const journeyWriteRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (req.v3Integration) {
      return `v3-journey:${req.v3Integration.app.id}:${req.v3Integration.key.id}:write`;
    }
    return `v3-journey:ip:${req.ip || req.socket.remoteAddress || 'unknown'}:write`;
  },
  handler: (req, res) =>
    respondError(
      req,
      res,
      429,
      'JOURNEY_RATE_LIMITED',
      'too many journey write operations, retry later',
      {
        windowMs: 60_000,
        max: 30,
      }
    ),
});

router.post(
  '/',
  v3IntegrationAuthRequired({ module: 'journey', action: 'write' }),
  journeyWriteRateLimiter,
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('journey');
    const body = parseBody(createJourneyBodySchema, req.body);
    const actor = getIntegrationActor(req);

    const journey = v3JourneyService.createJourney({
      ...(body.slug ? { slug: body.slug.trim().toLowerCase() } : {}),
      title: body.title.trim(),
      ...(body.narrativeSeed ? { narrativeSeed: body.narrativeSeed.trim() } : {}),
      ...(body.partyMembers
        ? { partyMembers: body.partyMembers.map((wallet) => wallet.trim().toLowerCase()) }
        : {}),
      ...(body.steps ? { steps: normalizeJourneySteps(body.steps) } : {}),
      requestedBy: actor,
    });

    return respondSuccess(req, res, journey, 201);
  })
);

router.get(
  '/:journeyId',
  v3IntegrationAuthRequired({ module: 'journey', action: 'read' }),
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('journey');
    const journeyId = parseJourneyId(req.params.journeyId);
    const actor = getIntegrationActor(req);
    const journey = v3JourneyService.getJourneyById(journeyId, {
      scopeAppId: actor.appId,
    });
    return respondSuccess(req, res, journey);
  })
);

router.get(
  '/:journeyId/viewer',
  v3IntegrationAuthRequired({ module: 'journey', action: 'read' }),
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('journey');
    const journeyId = parseJourneyId(req.params.journeyId);
    const actor = getIntegrationActor(req);
    const viewer = getJourneyViewerById({
      journeyId,
      scopeAppId: actor.appId,
    });
    return respondSuccess(req, res, viewer);
  })
);

router.get(
  '/:journeyId/world',
  v3IntegrationAuthRequired({ module: 'journey', action: 'read' }),
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('journey');
    const journeyId = parseJourneyId(req.params.journeyId);
    const actor = getIntegrationActor(req);
    const world = getJourneyWorldGraphById({
      journeyId,
      scopeAppId: actor.appId,
    });
    return respondSuccess(req, res, world);
  })
);

router.get(
  '/:journeyId/incidents',
  v3IntegrationAuthRequired({ module: 'journey', action: 'read' }),
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('journey');
    const journeyId = parseJourneyId(req.params.journeyId);
    const actor = getIntegrationActor(req);
    const incidents = v3JourneyIncidentService.listJourneyIncidents({
      journeyId,
      scopeAppId: actor.appId,
    });
    return respondSuccess(req, res, {
      journeyId,
      items: incidents,
    });
  })
);

router.post(
  '/:journeyId/incidents/trigger',
  v3IntegrationAuthRequired({ module: 'journey', action: 'write' }),
  journeyWriteRateLimiter,
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('journey');
    const journeyId = parseJourneyId(req.params.journeyId);
    const body = parseBody(triggerIncidentBodySchema, req.body);
    const actor = getIntegrationActor(req);

    const command: TriggerJourneyIncidentCommand = {
      journeyId,
      ...(body.stepId ? { stepId: body.stepId.trim().toLowerCase() } : {}),
      ...(body.template ? { template: body.template as JourneyIncidentTemplate } : {}),
      ...(body.contextNote ? { contextNote: body.contextNote.trim() } : {}),
      requestedBy: {
        appId: actor.appId,
        keyId: actor.keyId,
        actor: actor.actor,
        requestId: actor.requestId,
      },
    };

    const result = v3JourneyIncidentService.triggerIncident(command);
    return respondSuccess(req, res, result, 201);
  })
);

router.post(
  '/:journeyId/steps/:stepId/settle',
  v3IntegrationAuthRequired({ module: 'journey', action: 'write' }),
  journeyWriteRateLimiter,
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('journey');
    const journeyId = parseJourneyId(req.params.journeyId);
    const stepId = parseStepId(req.params.stepId);
    const body = parseBody(settleJourneyStepBodySchema, req.body);
    const actor = getIntegrationActor(req);

    const command: JourneySettleStepCommand = {
      journeyId,
      stepId,
      result: body.result,
      ...(body.reason ? { reason: body.reason.trim() } : {}),
      requestedBy: {
        appId: actor.appId,
        actor: actor.actor,
      },
    };

    const journey = v3JourneyService.settleJourneyStep(command);
    return respondSuccess(req, res, journey);
  })
);

router.post(
  '/:journeyId/steps/:stepId/advance',
  v3IntegrationAuthRequired({ module: 'journey', action: 'write' }),
  journeyWriteRateLimiter,
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('journey');
    const journeyId = parseJourneyId(req.params.journeyId);
    const stepId = parseStepId(req.params.stepId);
    const body = parseBody(advanceJourneyStepBodySchema, req.body);
    const actor = getIntegrationActor(req);

    const command: JourneyAdvanceStepCommand = {
      journeyId,
      stepId,
      ...(body.reason ? { reason: body.reason.trim() } : {}),
      requestedBy: {
        appId: actor.appId,
        actor: actor.actor,
      },
    };

    const journey = v3JourneyService.advanceJourneyStep(command);
    return respondSuccess(req, res, journey);
  })
);

export default router;
