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
  PARTNER_CALLBACK_EVENT_TYPES,
  PARTNER_CAMPAIGN_STATUSES,
  type CreatePartnerCampaignCommand,
  type PartnerCampaignStatus,
  type ReceivePartnerCallbackCommand,
  type UpdatePartnerCampaignStatusCommand,
  v3PartnerCampaignService,
} from '../../../modules/partners/partner-campaign.service';

const router: Router = Router();

const CAMPAIGN_ID_PATTERN = /^pcm_[a-z0-9]+$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const createPartnerCampaignBodySchema = z
  .object({
    slug: z.string().trim().min(1).max(64).regex(SLUG_PATTERN),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).optional(),
    callback: z
      .object({
        endpoint: z.string().trim().url().max(512),
        secret: z.string().trim().min(16).max(256),
      })
      .strict(),
    rewardPolicy: z.record(z.unknown()).optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict();

const partnerCallbackBodySchema = z
  .object({
    partnerEventId: z.string().trim().min(1).max(120),
    eventType: z.enum(PARTNER_CALLBACK_EVENT_TYPES),
    payload: z.record(z.unknown()),
    reward: z
      .object({
        recipientWallet: z.string().trim().min(1).max(120),
        rewardType: z.string().trim().min(1).max(40),
        amount: z.string().trim().min(1).max(64),
        metadata: z.record(z.unknown()).optional(),
      })
      .strict()
      .optional(),
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

const parseCampaignId = (value: string): string => {
  const campaignId = value.trim().toLowerCase();
  if (!CAMPAIGN_ID_PATTERN.test(campaignId)) {
    throw new AppError(400, 'campaignId is invalid', 'INVALID_INPUT', {
      campaignId: value,
    });
  }
  return campaignId;
};

const parseLimit = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 20;
  }
  return Math.min(parsed, 100);
};

const parseCampaignStatus = (value: unknown): PartnerCampaignStatus | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return undefined;
  }

  if (!PARTNER_CAMPAIGN_STATUSES.includes(normalized as PartnerCampaignStatus)) {
    throw new AppError(400, 'campaign status is invalid', 'INVALID_INPUT', {
      status: value,
    });
  }

  return normalized as PartnerCampaignStatus;
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

const partnerWriteRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (req.v3Integration) {
      return `v3-partner:${req.v3Integration.app.id}:${req.v3Integration.key.id}:write`;
    }
    return `v3-partner:ip:${req.ip || req.socket.remoteAddress || 'unknown'}:write`;
  },
  handler: (req, res) =>
    respondError(
      req,
      res,
      429,
      'PARTNER_WRITE_RATE_LIMITED',
      'too many partner write operations, retry later',
      {
        windowMs: 60_000,
        max: 20,
      }
    ),
});

const partnerCallbackRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 80,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) =>
    `v3-partner-callback:${req.ip || req.socket.remoteAddress || 'unknown'}`,
  handler: (req, res) =>
    respondError(
      req,
      res,
      429,
      'PARTNER_CALLBACK_RATE_LIMITED',
      'too many callback requests, retry later',
      {
        windowMs: 60_000,
        max: 80,
      }
    ),
});

router.post(
  '/campaigns',
  v3IntegrationAuthRequired({
    permission: 'partner.campaign.write',
    module: 'partner',
    action: 'write',
  }),
  partnerWriteRateLimiter,
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('partner');
    const body = parseBody(createPartnerCampaignBodySchema, req.body);
    const actor = getIntegrationActor(req);

    const command: CreatePartnerCampaignCommand = {
      slug: body.slug.trim().toLowerCase(),
      title: body.title.trim(),
      ...(body.description ? { description: body.description.trim() } : {}),
      callbackEndpoint: body.callback.endpoint.trim(),
      callbackSecret: body.callback.secret.trim(),
      ...(body.rewardPolicy ? { rewardPolicy: body.rewardPolicy } : {}),
      ...(body.metadata ? { metadata: body.metadata } : {}),
      requestedBy: {
        appId: actor.appId,
        keyId: actor.keyId,
        actor: actor.actor,
        requestId: actor.requestId,
      },
    };

    const campaign = await v3PartnerCampaignService.createCampaign(command);
    return respondSuccess(req, res, campaign, 201);
  })
);

router.get(
  '/campaigns',
  v3IntegrationAuthRequired({
    permission: 'partner.campaign.write',
    module: 'partner',
    action: 'read',
  }),
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('partner');
    const actor = getIntegrationActor(req);
    const status = parseCampaignStatus(req.query.status);

    const campaigns = await v3PartnerCampaignService.listCampaigns({
      scopeAppId: actor.appId,
      ...(status ? { status } : {}),
      limit: parseLimit(req.query.limit),
    });

    return respondSuccess(req, res, campaigns);
  })
);

router.get(
  '/campaigns/:campaignId',
  v3IntegrationAuthRequired({
    permission: 'partner.campaign.write',
    module: 'partner',
    action: 'read',
  }),
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('partner');
    const actor = getIntegrationActor(req);
    const campaignId = parseCampaignId(req.params.campaignId);

    const campaign = await v3PartnerCampaignService.getCampaignById({
      campaignId,
      scopeAppId: actor.appId,
    });

    return respondSuccess(req, res, campaign);
  })
);

const runStatusUpdate = (
  path: '/publish' | '/pause' | '/resume',
  updater: (command: UpdatePartnerCampaignStatusCommand) => Promise<unknown>
): void => {
  router.post(
    `/campaigns/:campaignId${path}`,
    v3IntegrationAuthRequired({
      permission: 'partner.campaign.write',
      module: 'partner',
      action: 'write',
    }),
    partnerWriteRateLimiter,
    asyncHandler(async (req, res) => {
      assertV3RuntimeEnabled('partner');
      const actor = getIntegrationActor(req);
      const campaignId = parseCampaignId(req.params.campaignId);

      const command: UpdatePartnerCampaignStatusCommand = {
        campaignId,
        scopeAppId: actor.appId,
        requestedBy: {
          actor: actor.actor,
          requestId: actor.requestId,
        },
      };

      const campaign = await updater(command);
      return respondSuccess(req, res, campaign);
    })
  );
};

runStatusUpdate('/publish', (command) => v3PartnerCampaignService.publishCampaign(command));
runStatusUpdate('/pause', (command) => v3PartnerCampaignService.pauseCampaign(command));
runStatusUpdate('/resume', (command) => v3PartnerCampaignService.resumeCampaign(command));

router.post(
  '/campaigns/:campaignId/callbacks',
  partnerCallbackRateLimiter,
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('partner');
    const campaignId = parseCampaignId(req.params.campaignId);
    const body = parseBody(partnerCallbackBodySchema, req.body || {});

    const timestamp =
      typeof req.headers['x-partner-timestamp'] === 'string'
        ? req.headers['x-partner-timestamp'].trim()
        : '';
    const signature =
      typeof req.headers['x-partner-signature'] === 'string'
        ? req.headers['x-partner-signature'].trim()
        : '';

    if (!timestamp || !signature) {
      throw new AppError(401, 'partner callback signature headers are required', 'PARTNER_CALLBACK_SIGNATURE_INVALID', {
        requiredHeaders: ['x-partner-timestamp', 'x-partner-signature'],
      });
    }

    const command: ReceivePartnerCallbackCommand = {
      campaignId,
      partnerEventId: body.partnerEventId.trim(),
      eventType: body.eventType,
      timestamp,
      signature,
      payload: body.payload,
      ...(body.reward
        ? {
            reward: {
              recipientWallet: body.reward.recipientWallet.trim(),
              rewardType: body.reward.rewardType.trim(),
              amount: body.reward.amount.trim(),
              ...(body.reward.metadata ? { metadata: body.reward.metadata } : {}),
            },
          }
        : {}),
      requestId: req.requestId ?? null,
    };

    const result = await v3PartnerCampaignService.receiveCallback(command);
    return respondSuccess(req, res, result, 201);
  })
);

export default router;
