import { HttpClient } from '../core/http';
import { unwrapEnvelope } from './envelope';

export interface MemoryPalacesResourceClient {
  listTemplates<T = unknown>(options?: { limit?: number }): Promise<T>;
  listMyTemplates<T = unknown>(options?: {
    status?: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
    limit?: number;
  }): Promise<T>;
  createTemplate<T = unknown>(payload: {
    slug: string;
    name: string;
    summary?: string;
    theme: {
      palette: {
        background: string;
        surface: string;
        accent: string;
        text: string;
      };
      badgeLabel?: string;
      coverImageUrl?: string;
    };
  }): Promise<T>;
  submitTemplateForReview<T = unknown>(
    templateId: string,
    payload?: {
      note?: string;
    }
  ): Promise<T>;
  createWorld<T = unknown>(payload: {
    journeyId: string;
    title?: string;
    summary?: string;
    templateSlug?: string;
  }): Promise<T>;
  getWorldById<T = unknown>(worldId: string): Promise<T>;
  addCollaborator<T = unknown>(
    worldId: string,
    payload: {
      appId: string;
      role?: 'CONTRIBUTOR' | 'EDITOR';
    }
  ): Promise<T>;
  addContribution<T = unknown>(
    worldId: string,
    payload: {
      type: 'WITNESS_NOTE' | 'RELIC_PLACEMENT' | 'PHOTO' | 'MEMORY_FRAGMENT';
      content: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<T>;
  listVisits<T = unknown>(
    worldId: string,
    options?: {
      limit?: number;
    }
  ): Promise<T>;
  addVisit<T = unknown>(
    worldId: string,
    payload: {
      entryType?: 'GUESTBOOK' | 'WITNESS';
      message: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<T>;
}

export const createMemoryPalacesResourceClient = (
  httpClient: HttpClient
): MemoryPalacesResourceClient => {
  return {
    async listTemplates<T = unknown>(options?: { limit?: number }): Promise<T> {
      const query =
        typeof options?.limit === 'number' && Number.isInteger(options.limit) && options.limit > 0
          ? `?limit=${encodeURIComponent(String(options.limit))}`
          : '';
      const response = await httpClient.get<unknown>(`/v3/memory-palaces/templates${query}`);
      return unwrapEnvelope<T>(response, 'Failed to fetch memory world templates');
    },

    async listMyTemplates<T = unknown>(options?: {
      status?: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
      limit?: number;
    }): Promise<T> {
      const query = new URLSearchParams();
      if (options?.status) {
        query.set('status', options.status);
      }
      if (typeof options?.limit === 'number' && Number.isInteger(options.limit) && options.limit > 0) {
        query.set('limit', String(options.limit));
      }

      const queryString = query.toString();
      const response = await httpClient.get<unknown>(
        `/v3/memory-palaces/templates/mine${queryString ? `?${queryString}` : ''}`
      );
      return unwrapEnvelope<T>(response, 'Failed to fetch own memory world templates');
    },

    async createTemplate<T = unknown>(payload: {
      slug: string;
      name: string;
      summary?: string;
      theme: {
        palette: {
          background: string;
          surface: string;
          accent: string;
          text: string;
        };
        badgeLabel?: string;
        coverImageUrl?: string;
      };
    }): Promise<T> {
      const response = await httpClient.post<unknown>('/v3/memory-palaces/templates', {
        body: payload,
      });
      return unwrapEnvelope<T>(response, 'Failed to create memory world template');
    },

    async submitTemplateForReview<T = unknown>(
      templateId: string,
      payload?: {
        note?: string;
      }
    ): Promise<T> {
      const response = await httpClient.post<unknown>(
        `/v3/memory-palaces/templates/${encodeURIComponent(templateId)}/submit-review`,
        {
          body: payload?.note
            ? {
                note: payload.note,
              }
            : {},
        }
      );
      return unwrapEnvelope<T>(response, 'Failed to submit memory world template for review');
    },

    async createWorld<T = unknown>(payload: {
      journeyId: string;
      title?: string;
      summary?: string;
      templateSlug?: string;
    }): Promise<T> {
      const response = await httpClient.post<unknown>('/v3/memory-palaces', {
        body: payload,
      });
      return unwrapEnvelope<T>(response, 'Failed to create collaborative memory world');
    },

    async getWorldById<T = unknown>(worldId: string): Promise<T> {
      const response = await httpClient.get<unknown>(
        `/v3/memory-palaces/${encodeURIComponent(worldId)}`
      );
      return unwrapEnvelope<T>(response, 'Failed to fetch collaborative memory world');
    },

    async addCollaborator<T = unknown>(
      worldId: string,
      payload: {
        appId: string;
        role?: 'CONTRIBUTOR' | 'EDITOR';
      }
    ): Promise<T> {
      const response = await httpClient.post<unknown>(
        `/v3/memory-palaces/${encodeURIComponent(worldId)}/collaborators`,
        {
          body: {
            appId: payload.appId,
            ...(payload.role ? { role: payload.role } : {}),
          },
        }
      );
      return unwrapEnvelope<T>(response, 'Failed to upsert memory world collaborator');
    },

    async addContribution<T = unknown>(
      worldId: string,
      payload: {
        type: 'WITNESS_NOTE' | 'RELIC_PLACEMENT' | 'PHOTO' | 'MEMORY_FRAGMENT';
        content: string;
        metadata?: Record<string, unknown>;
      }
    ): Promise<T> {
      const response = await httpClient.post<unknown>(
        `/v3/memory-palaces/${encodeURIComponent(worldId)}/contributions`,
        {
          body: {
            type: payload.type,
            content: payload.content,
            ...(payload.metadata ? { metadata: payload.metadata } : {}),
          },
        }
      );
      return unwrapEnvelope<T>(response, 'Failed to add memory world contribution');
    },

    async listVisits<T = unknown>(
      worldId: string,
      options?: {
        limit?: number;
      }
    ): Promise<T> {
      const query =
        typeof options?.limit === 'number' && Number.isInteger(options.limit) && options.limit > 0
          ? `?limit=${encodeURIComponent(String(options.limit))}`
          : '';
      const response = await httpClient.get<unknown>(
        `/v3/memory-palaces/${encodeURIComponent(worldId)}/visits${query}`
      );
      return unwrapEnvelope<T>(response, 'Failed to fetch memory world visits');
    },

    async addVisit<T = unknown>(
      worldId: string,
      payload: {
        entryType?: 'GUESTBOOK' | 'WITNESS';
        message: string;
        metadata?: Record<string, unknown>;
      }
    ): Promise<T> {
      const response = await httpClient.post<unknown>(
        `/v3/memory-palaces/${encodeURIComponent(worldId)}/visits`,
        {
          body: {
            ...(payload.entryType ? { entryType: payload.entryType } : {}),
            message: payload.message,
            ...(payload.metadata ? { metadata: payload.metadata } : {}),
          },
        }
      );
      return unwrapEnvelope<T>(response, 'Failed to add memory world visit');
    },
  };
};
