import { HttpClient } from '../core/http';
import { unwrapEnvelope } from './envelope';

export interface PartnerListCampaignsQuery {
  status?: 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'ARCHIVED';
  limit?: number;
}

export interface PartnerResourceClient {
  createCampaign<T = unknown>(payload: {
    slug: string;
    title: string;
    description?: string;
    callback: {
      endpoint: string;
      secret: string;
    };
    rewardPolicy?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): Promise<T>;
  listCampaigns<T = unknown>(query?: PartnerListCampaignsQuery): Promise<T>;
  getCampaignById<T = unknown>(campaignId: string): Promise<T>;
  publishCampaign<T = unknown>(campaignId: string): Promise<T>;
  pauseCampaign<T = unknown>(campaignId: string): Promise<T>;
  resumeCampaign<T = unknown>(campaignId: string): Promise<T>;
  submitCallback<T = unknown>(
    campaignId: string,
    payload: {
      partnerEventId: string;
      eventType: 'REWARD_GRANTED' | 'CAMPAIGN_STATUS_SYNC';
      payload: Record<string, unknown>;
      reward?: {
        recipientWallet: string;
        rewardType: string;
        amount: string;
        metadata?: Record<string, unknown>;
      };
    },
    signature: {
      timestamp: string;
      value: string;
    }
  ): Promise<T>;
}

export const createPartnerResourceClient = (httpClient: HttpClient): PartnerResourceClient => {
  return {
    async createCampaign<T = unknown>(payload: {
      slug: string;
      title: string;
      description?: string;
      callback: {
        endpoint: string;
        secret: string;
      };
      rewardPolicy?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    }): Promise<T> {
      const response = await httpClient.post<unknown>('/v3/partners/campaigns', {
        body: payload,
      });
      return unwrapEnvelope<T>(response, 'Failed to create partner campaign');
    },

    async listCampaigns<T = unknown>(query?: PartnerListCampaignsQuery): Promise<T> {
      const response = await httpClient.get<unknown>('/v3/partners/campaigns', {
        params: {
          ...(query?.status ? { status: query.status } : {}),
          ...(typeof query?.limit === 'number' ? { limit: query.limit } : {}),
        },
      });
      return unwrapEnvelope<T>(response, 'Failed to list partner campaigns');
    },

    async getCampaignById<T = unknown>(campaignId: string): Promise<T> {
      const response = await httpClient.get<unknown>(
        `/v3/partners/campaigns/${encodeURIComponent(campaignId)}`
      );
      return unwrapEnvelope<T>(response, 'Failed to fetch partner campaign');
    },

    async publishCampaign<T = unknown>(campaignId: string): Promise<T> {
      const response = await httpClient.post<unknown>(
        `/v3/partners/campaigns/${encodeURIComponent(campaignId)}/publish`
      );
      return unwrapEnvelope<T>(response, 'Failed to publish partner campaign');
    },

    async pauseCampaign<T = unknown>(campaignId: string): Promise<T> {
      const response = await httpClient.post<unknown>(
        `/v3/partners/campaigns/${encodeURIComponent(campaignId)}/pause`
      );
      return unwrapEnvelope<T>(response, 'Failed to pause partner campaign');
    },

    async resumeCampaign<T = unknown>(campaignId: string): Promise<T> {
      const response = await httpClient.post<unknown>(
        `/v3/partners/campaigns/${encodeURIComponent(campaignId)}/resume`
      );
      return unwrapEnvelope<T>(response, 'Failed to resume partner campaign');
    },

    async submitCallback<T = unknown>(
      campaignId: string,
      payload: {
        partnerEventId: string;
        eventType: 'REWARD_GRANTED' | 'CAMPAIGN_STATUS_SYNC';
        payload: Record<string, unknown>;
        reward?: {
          recipientWallet: string;
          rewardType: string;
          amount: string;
          metadata?: Record<string, unknown>;
        };
      },
      signature: {
        timestamp: string;
        value: string;
      }
    ): Promise<T> {
      const response = await httpClient.post<unknown>(
        `/v3/partners/campaigns/${encodeURIComponent(campaignId)}/callbacks`,
        {
          headers: {
            'x-partner-timestamp': signature.timestamp,
            'x-partner-signature': signature.value,
          },
          body: payload,
        }
      );
      return unwrapEnvelope<T>(response, 'Failed to submit partner callback');
    },
  };
};
