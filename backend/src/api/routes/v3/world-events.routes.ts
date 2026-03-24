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
  type JourneyIncidentDecision,
  type RespondJourneyIncidentCommand,
  v3JourneyIncidentService,
} from '../../../modules/journey-events/journey-incident.service';

const router: Router = Router();

const INCIDENT_ID_PATTERN = /^evt_[a-z0-9]+$/;

const respondIncidentBodySchema = z
  .object({
    decision: z.enum(['DEPLOY_RESCUE', 'HOLD_FORMATION', 'ABORT_MISSION']),
    note: z.string().trim().max(280).optional(),
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

const parseIncidentId = (value: string): string => {
  const incidentId = value.trim().toLowerCase();
  if (!INCIDENT_ID_PATTERN.test(incidentId)) {
    throw new AppError(400, 'incidentId is invalid', 'INVALID_INPUT', {
      incidentId: value,
    });
  }
  return incidentId;
};

const getIntegrationActor = (req: Request): {
  appId: string;
  actor: string;
} => {
  const integration = getV3IntegrationAccess(req);
  return {
    appId: integration.app.id,
    actor: `${integration.app.slug}:${integration.key.id}`,
  };
};

const worldEventWriteRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (req.v3Integration) {
      return `v3-world-events:${req.v3Integration.app.id}:${req.v3Integration.key.id}:write`;
    }
    return `v3-world-events:ip:${req.ip || req.socket.remoteAddress || 'unknown'}:write`;
  },
  handler: (req, res) =>
    respondError(
      req,
      res,
      429,
      'WORLD_EVENT_RATE_LIMITED',
      'too many world event write operations, retry later',
      {
        windowMs: 60_000,
        max: 30,
      }
    ),
});

router.post(
  '/:incidentId/respond',
  v3IntegrationAuthRequired({ module: 'journey', action: 'write' }),
  worldEventWriteRateLimiter,
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('journey');
    const incidentId = parseIncidentId(req.params.incidentId);
    const body = parseBody(respondIncidentBodySchema, req.body);
    const actor = getIntegrationActor(req);

    const command: RespondJourneyIncidentCommand = {
      incidentId,
      decision: body.decision as JourneyIncidentDecision,
      ...(body.note ? { note: body.note.trim() } : {}),
      requestedBy: {
        appId: actor.appId,
        actor: actor.actor,
      },
    };

    const result = v3JourneyIncidentService.respondIncident(command);
    return respondSuccess(req, res, result);
  })
);

export default router;
