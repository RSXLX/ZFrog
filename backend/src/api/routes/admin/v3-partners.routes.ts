import { Router } from 'express';
import {
  PARTNER_CAMPAIGN_STATUSES,
  type AdminRollbackPartnerCampaignCommand,
  type PartnerCampaignStatus,
  type UpdatePartnerCampaignStatusCommand,
  v3PartnerCampaignService,
} from '../../../modules/partners/partner-campaign.service';
import { assertV3RuntimeEnabled, getV3RuntimeActor } from '../../../platform/runtime/v3-runtime.service';

const router: Router = Router();

const CAMPAIGN_ID_PATTERN = /^pcm_[a-z0-9]+$/;

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

const parseCampaignId = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (!CAMPAIGN_ID_PATTERN.test(normalized)) {
    return null;
  }
  return normalized;
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
    return undefined;
  }
  return normalized as PartnerCampaignStatus;
};

const parseLimit = (value: unknown): number => {
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
  if (!/^[a-zA-Z0-9_:-]{2,80}$/.test(normalized)) {
    return undefined;
  }
  return normalized;
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

const runStatusAction = (
  path: '/publish' | '/pause' | '/resume',
  action: 'publish' | 'pause' | 'resume',
  updater: (command: UpdatePartnerCampaignStatusCommand) => Promise<unknown>
): void => {
  router.post(`/campaigns/:campaignId${path}`, async (req, res, next) => {
    const campaignId = parseCampaignId(req.params.campaignId);
    if (!campaignId) {
      return fail(res, 400, 'campaignId is invalid');
    }

    const actor = getV3RuntimeActor(req) || 'admin:unknown';

    try {
      assertV3RuntimeEnabled('partner');
      const campaign = await v3PartnerCampaignService.getCampaignByIdForAdmin({
        campaignId,
      });

      const command: UpdatePartnerCampaignStatusCommand = {
        campaignId,
        scopeAppId: campaign.partnerAppId,
        requestedBy: {
          actor,
          requestId: req.requestId ?? null,
        },
      };

      const updated = await updater(command);
      return ok(res, {
        ...(updated as Record<string, unknown>),
        receipt: {
          action,
          campaignId,
          actor,
        },
      });
    } catch (error) {
      return next(error);
    }
  });
};

router.get('/campaigns', async (req, res, next) => {
  const status = parseCampaignStatus(req.query.status);
  if (req.query.status && !status) {
    return fail(res, 400, 'status is invalid');
  }

  const appId = parseOptionalAppId(req.query.appId);
  if (req.query.appId && !appId) {
    return fail(res, 400, 'appId is invalid');
  }

  try {
    assertV3RuntimeEnabled('partner');
    const result = await v3PartnerCampaignService.listCampaignsForAdmin({
      ...(status ? { status } : {}),
      ...(appId ? { partnerAppId: appId } : {}),
      limit: parseLimit(req.query.limit),
    });

    return ok(res, {
      ...result,
      filters: {
        status: status || null,
        appId: appId || null,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/campaigns/:campaignId/callbacks', async (req, res, next) => {
  const campaignId = parseCampaignId(req.params.campaignId);
  if (!campaignId) {
    return fail(res, 400, 'campaignId is invalid');
  }

  try {
    assertV3RuntimeEnabled('partner');
    const callbacks = await v3PartnerCampaignService.listCallbacksForAdmin({
      campaignId,
      limit: parseLimit(req.query.limit),
    });
    return ok(res, callbacks);
  } catch (error) {
    return next(error);
  }
});

router.get('/campaigns/:campaignId/rewards', async (req, res, next) => {
  const campaignId = parseCampaignId(req.params.campaignId);
  if (!campaignId) {
    return fail(res, 400, 'campaignId is invalid');
  }

  try {
    assertV3RuntimeEnabled('partner');
    const rewards = await v3PartnerCampaignService.listRewardsForAdmin({
      campaignId,
      limit: parseLimit(req.query.limit),
    });
    return ok(res, rewards);
  } catch (error) {
    return next(error);
  }
});

runStatusAction('/publish', 'publish', (command) => v3PartnerCampaignService.publishCampaign(command));
runStatusAction('/pause', 'pause', (command) => v3PartnerCampaignService.pauseCampaign(command));
runStatusAction('/resume', 'resume', (command) => v3PartnerCampaignService.resumeCampaign(command));

router.post('/campaigns/:campaignId/rollback', async (req, res, next) => {
  const campaignId = parseCampaignId(req.params.campaignId);
  if (!campaignId) {
    return fail(res, 400, 'campaignId is invalid');
  }

  const reason = parseOptionalText(req.body?.reason, 240);
  const actor = getV3RuntimeActor(req) || 'admin:unknown';

  try {
    assertV3RuntimeEnabled('partner');

    const command: AdminRollbackPartnerCampaignCommand = {
      campaignId,
      ...(reason ? { reason } : {}),
      requestedBy: {
        actor,
        requestId: req.requestId ?? null,
      },
    };

    const campaign = await v3PartnerCampaignService.adminRollbackCampaign(command);
    return ok(res, {
      ...campaign,
      receipt: {
        action: 'rollback_to_paused',
        campaignId,
        actor,
        ...(reason ? { reason } : {}),
      },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
