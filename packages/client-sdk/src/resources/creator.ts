import { HttpClient } from '../core/http';
import { unwrapEnvelope } from './envelope';

export interface CreatorListPacksQuery {
  status?: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
  limit?: number;
}

export interface CreatorResourceClient {
  createAsset<T = unknown>(payload: {
    type: 'IMAGE' | 'AUDIO' | 'MODEL' | 'TEXTURE' | 'SCRIPT';
    mimeType: string;
    sourceUrl: string;
    checksum: string;
    bytes: number;
    metadata?: Record<string, unknown>;
  }): Promise<T>;
  listAssets<T = unknown>(query?: { limit?: number }): Promise<T>;
  createPackDraft<T = unknown>(payload: {
    slug: string;
    title: string;
    summary?: string;
    assetIds: string[];
  }): Promise<T>;
  listPacks<T = unknown>(query?: CreatorListPacksQuery): Promise<T>;
  getPackById<T = unknown>(packId: string): Promise<T>;
  createLicenseAnchor<T = unknown>(
    assetId: string,
    payload: {
      ownerWallet: string;
      issuedAt: string;
    }
  ): Promise<T>;
  listLicenseAnchors<T = unknown>(assetId: string, query?: { limit?: number }): Promise<T>;
  replayLicenseAnchor<T = unknown>(bindingId: string, payload?: { force?: boolean }): Promise<T>;
}

export const createCreatorResourceClient = (httpClient: HttpClient): CreatorResourceClient => {
  return {
    async createAsset<T = unknown>(payload: {
      type: 'IMAGE' | 'AUDIO' | 'MODEL' | 'TEXTURE' | 'SCRIPT';
      mimeType: string;
      sourceUrl: string;
      checksum: string;
      bytes: number;
      metadata?: Record<string, unknown>;
    }): Promise<T> {
      const response = await httpClient.post<unknown>('/v3/creator/assets', {
        body: payload,
      });
      return unwrapEnvelope<T>(response, 'Failed to create creator asset');
    },

    async listAssets<T = unknown>(query?: { limit?: number }): Promise<T> {
      const response = await httpClient.get<unknown>('/v3/creator/assets', {
        params: {
          ...(typeof query?.limit === 'number' ? { limit: query.limit } : {}),
        },
      });
      return unwrapEnvelope<T>(response, 'Failed to list creator assets');
    },

    async createPackDraft<T = unknown>(payload: {
      slug: string;
      title: string;
      summary?: string;
      assetIds: string[];
    }): Promise<T> {
      const response = await httpClient.post<unknown>('/v3/creator/packs', {
        body: payload,
      });
      return unwrapEnvelope<T>(response, 'Failed to create creator pack draft');
    },

    async listPacks<T = unknown>(query?: CreatorListPacksQuery): Promise<T> {
      const response = await httpClient.get<unknown>('/v3/creator/packs', {
        params: {
          ...(query?.status ? { status: query.status } : {}),
          ...(typeof query?.limit === 'number' ? { limit: query.limit } : {}),
        },
      });
      return unwrapEnvelope<T>(response, 'Failed to list creator packs');
    },

    async getPackById<T = unknown>(packId: string): Promise<T> {
      const response = await httpClient.get<unknown>(
        `/v3/creator/packs/${encodeURIComponent(packId)}`
      );
      return unwrapEnvelope<T>(response, 'Failed to fetch creator pack');
    },

    async createLicenseAnchor<T = unknown>(
      assetId: string,
      payload: {
        ownerWallet: string;
        issuedAt: string;
      }
    ): Promise<T> {
      const response = await httpClient.post<unknown>(
        `/v3/creator/assets/${encodeURIComponent(assetId)}/license-anchor`,
        {
          body: payload,
        }
      );
      return unwrapEnvelope<T>(response, 'Failed to create creator license anchor');
    },

    async listLicenseAnchors<T = unknown>(assetId: string, query?: { limit?: number }): Promise<T> {
      const response = await httpClient.get<unknown>(
        `/v3/creator/assets/${encodeURIComponent(assetId)}/license-anchor`,
        {
          params: {
            ...(typeof query?.limit === 'number' ? { limit: query.limit } : {}),
          },
        }
      );
      return unwrapEnvelope<T>(response, 'Failed to list creator license anchors');
    },

    async replayLicenseAnchor<T = unknown>(bindingId: string, payload?: { force?: boolean }): Promise<T> {
      const response = await httpClient.post<unknown>(
        `/v3/creator/license-anchors/${encodeURIComponent(bindingId)}/replay`,
        {
          body: payload || {},
        }
      );
      return unwrapEnvelope<T>(response, 'Failed to replay creator license anchor');
    },
  };
};
