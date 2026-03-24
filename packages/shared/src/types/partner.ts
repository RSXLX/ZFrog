export const V3_PARTNER_CAMPAIGN_STATUSES = ['DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED'] as const;
export const V3_PARTNER_CALLBACK_EVENT_TYPES = ['REWARD_GRANTED', 'CAMPAIGN_STATUS_SYNC'] as const;
export const V3_PARTNER_CALLBACK_STATUSES = ['ACCEPTED', 'REJECTED'] as const;
export const V3_PARTNER_REWARD_STATUSES = ['GRANTED', 'REVOKED'] as const;

export type V3PartnerCampaignStatus = (typeof V3_PARTNER_CAMPAIGN_STATUSES)[number];
export type V3PartnerCallbackEventType = (typeof V3_PARTNER_CALLBACK_EVENT_TYPES)[number];
export type V3PartnerCallbackStatus = (typeof V3_PARTNER_CALLBACK_STATUSES)[number];
export type V3PartnerRewardStatus = (typeof V3_PARTNER_REWARD_STATUSES)[number];

export interface V3PartnerCampaignReadModel {
  id: string;
  partnerAppId: string;
  slug: string;
  title: string;
  description: string | null;
  status: V3PartnerCampaignStatus;
  callbackEndpoint: string;
  publishedAt: string | null;
  pausedAt: string | null;
  createdAt: string;
  updatedAt: string;
  audit: {
    createdByKeyId: string;
    createdByActor: string;
    requestId: string | null;
  };
  rollout: {
    rewardPolicy: Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
  };
}

export interface V3PartnerCampaignListReadModel {
  total: number;
  items: V3PartnerCampaignReadModel[];
}

export interface V3PartnerCallbackReadModel {
  id: string;
  campaignId: string;
  partnerEventId: string;
  eventType: V3PartnerCallbackEventType;
  signatureVersion: 'v1-hmac-sha256';
  verified: boolean;
  status: V3PartnerCallbackStatus;
  reason: string | null;
  payload: Record<string, unknown>;
  requestId: string | null;
  receivedAt: string;
  processedAt: string;
  rewardId: string | null;
}

export interface V3PartnerCallbackListReadModel {
  total: number;
  items: V3PartnerCallbackReadModel[];
}

export interface V3PartnerRewardReadModel {
  id: string;
  campaignId: string;
  callbackId: string;
  recipientWallet: string;
  rewardType: string;
  amount: string;
  status: V3PartnerRewardStatus;
  metadata: Record<string, unknown> | null;
  grantedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface V3PartnerRewardListReadModel {
  total: number;
  items: V3PartnerRewardReadModel[];
}

export interface V3PartnerCreateCampaignPayload {
  slug: string;
  title: string;
  description?: string;
  callback: {
    endpoint: string;
    secret: string;
  };
  rewardPolicy?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface V3PartnerCallbackPayload {
  partnerEventId: string;
  eventType: V3PartnerCallbackEventType;
  payload: Record<string, unknown>;
  reward?: {
    recipientWallet: string;
    rewardType: string;
    amount: string;
    metadata?: Record<string, unknown>;
  };
}
