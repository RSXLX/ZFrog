import { z } from 'zod';
import {
  V3_PARTNER_CALLBACK_EVENT_TYPES,
  V3_PARTNER_CALLBACK_STATUSES,
  V3_PARTNER_CAMPAIGN_STATUSES,
  V3_PARTNER_REWARD_STATUSES,
} from '../types/partner';

const partnerAppIdSchema = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9_:-]{3,64}$/i);

const partnerCampaignIdSchema = z.string().trim().regex(/^pcm_[a-z0-9]+$/);
const partnerCallbackIdSchema = z.string().trim().regex(/^pcb_[a-z0-9]+$/);
const partnerRewardIdSchema = z.string().trim().regex(/^prw_[a-z0-9]+$/);

export const v3PartnerCampaignStatusSchema = z.enum(V3_PARTNER_CAMPAIGN_STATUSES);
export const v3PartnerCallbackEventTypeSchema = z.enum(V3_PARTNER_CALLBACK_EVENT_TYPES);
export const v3PartnerCallbackStatusSchema = z.enum(V3_PARTNER_CALLBACK_STATUSES);
export const v3PartnerRewardStatusSchema = z.enum(V3_PARTNER_REWARD_STATUSES);

export const v3PartnerCampaignReadModelSchema = z.object({
  id: partnerCampaignIdSchema,
  partnerAppId: partnerAppIdSchema,
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1),
  description: z.string().nullable(),
  status: v3PartnerCampaignStatusSchema,
  callbackEndpoint: z.string().url(),
  publishedAt: z.string().datetime().nullable(),
  pausedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  audit: z.object({
    createdByKeyId: z.string().min(1),
    createdByActor: z.string().min(1),
    requestId: z.string().nullable(),
  }),
  rollout: z.object({
    rewardPolicy: z.record(z.unknown()).nullable(),
    metadata: z.record(z.unknown()).nullable(),
  }),
});

export const v3PartnerCampaignListReadModelSchema = z.object({
  total: z.number().int().nonnegative(),
  items: z.array(v3PartnerCampaignReadModelSchema),
});

export const v3PartnerCallbackReadModelSchema = z.object({
  id: partnerCallbackIdSchema,
  campaignId: partnerCampaignIdSchema,
  partnerEventId: z.string().min(1),
  eventType: v3PartnerCallbackEventTypeSchema,
  signatureVersion: z.literal('v1-hmac-sha256'),
  verified: z.boolean(),
  status: v3PartnerCallbackStatusSchema,
  reason: z.string().nullable(),
  payload: z.record(z.unknown()),
  requestId: z.string().nullable(),
  receivedAt: z.string().datetime(),
  processedAt: z.string().datetime(),
  rewardId: partnerRewardIdSchema.nullable(),
});

export const v3PartnerCallbackListReadModelSchema = z.object({
  total: z.number().int().nonnegative(),
  items: z.array(v3PartnerCallbackReadModelSchema),
});

export const v3PartnerRewardReadModelSchema = z.object({
  id: partnerRewardIdSchema,
  campaignId: partnerCampaignIdSchema,
  callbackId: partnerCallbackIdSchema,
  recipientWallet: z.string().min(1),
  rewardType: z.string().min(1),
  amount: z.string().min(1),
  status: v3PartnerRewardStatusSchema,
  metadata: z.record(z.unknown()).nullable(),
  grantedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const v3PartnerRewardListReadModelSchema = z.object({
  total: z.number().int().nonnegative(),
  items: z.array(v3PartnerRewardReadModelSchema),
});

export const v3PartnerCreateCampaignPayloadSchema = z
  .object({
    slug: z.string().trim().min(1).max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
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

export const v3PartnerCallbackPayloadSchema = z
  .object({
    partnerEventId: z.string().trim().min(1).max(120),
    eventType: v3PartnerCallbackEventTypeSchema,
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
