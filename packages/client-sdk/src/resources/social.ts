import { HttpClient } from '../core/http';
import { unwrapEnvelope } from './envelope';

export interface SocialResourceClient {
  getStatus<T = unknown>(): Promise<T>;
  createRitual<T = unknown>(payload: unknown): Promise<T>;
  rescueTravel<T = unknown>(payload: {
    travelId: number | string;
    rescuerFrogId: number;
    verificationId: string;
  }): Promise<T>;
  createFamily<T = unknown>(payload: {
    name: string;
    ownerFrogId: number;
    goal?: string;
    visibility?: 'private' | 'friends' | 'public';
  }): Promise<T>;
  getFamilyById<T = unknown>(familyId: number | string): Promise<T>;
  getCommunityById<T = unknown>(communityId: string): Promise<T>;
  listCommunityMembers<T = unknown>(communityId: string, query?: { limit?: number }): Promise<T>;
  joinCommunity<T = unknown>(
    communityId: string,
    payload: {
      frogId: number;
      role?: 'member' | 'moderator';
    }
  ): Promise<T>;
  createRelationshipAttestation<T = unknown>(payload: {
    subjectFrogId: number;
    objectFrogId: number;
    attestationType: string;
    source?: string;
    idempotencyKey?: string;
    evidence?: Record<string, unknown>;
  }): Promise<T>;
  submitRelationshipAttestationOnchain<T = unknown>(
    attestationId: string,
    payload?: {
      force?: boolean;
    }
  ): Promise<T>;
}

export const createSocialResourceClient = (httpClient: HttpClient): SocialResourceClient => {
  return {
    async getStatus<T = unknown>(): Promise<T> {
      const payload = await httpClient.get<unknown>('/v1/social/status');
      return unwrapEnvelope<T>(payload, 'Failed to fetch social status');
    },

    async createRitual<T = unknown>(payload: unknown): Promise<T> {
      const response = await httpClient.post<unknown>('/v1/rituals', {
        body: payload,
      });
      return unwrapEnvelope<T>(response, 'Failed to create ritual');
    },

    async rescueTravel<T = unknown>(payload: {
      travelId: number | string;
      rescuerFrogId: number;
      verificationId: string;
    }): Promise<T> {
      const response = await httpClient.post<unknown>(`/v1/travels/${payload.travelId}/rescue`, {
        body: {
          rescuerFrogId: payload.rescuerFrogId,
          verificationId: payload.verificationId,
        },
      });
      return unwrapEnvelope<T>(response, 'Failed to rescue travel');
    },

    async createFamily<T = unknown>(payload: {
      name: string;
      ownerFrogId: number;
      goal?: string;
      visibility?: 'private' | 'friends' | 'public';
    }): Promise<T> {
      const response = await httpClient.post<unknown>('/v2/families', {
        body: {
          name: payload.name,
          ownerFrogId: payload.ownerFrogId,
          ...(payload.goal ? { goal: payload.goal } : {}),
          ...(payload.visibility ? { visibility: payload.visibility } : {}),
        },
      });
      return unwrapEnvelope<T>(response, 'Failed to create family');
    },

    async getFamilyById<T = unknown>(familyId: number | string): Promise<T> {
      const payload = await httpClient.get<unknown>(`/v2/families/${encodeURIComponent(String(familyId))}`);
      return unwrapEnvelope<T>(payload, 'Failed to fetch family');
    },

    async getCommunityById<T = unknown>(communityId: string): Promise<T> {
      const payload = await httpClient.get<unknown>(`/v2/communities/${encodeURIComponent(communityId)}`);
      return unwrapEnvelope<T>(payload, 'Failed to fetch community');
    },

    async listCommunityMembers<T = unknown>(
      communityId: string,
      query?: { limit?: number }
    ): Promise<T> {
      const payload = await httpClient.get<unknown>(
        `/v2/communities/${encodeURIComponent(communityId)}/members`,
        {
          params: {
            ...(query?.limit ? { limit: query.limit } : {}),
          },
        }
      );
      return unwrapEnvelope<T>(payload, 'Failed to fetch community members');
    },

    async joinCommunity<T = unknown>(
      communityId: string,
      payload: {
        frogId: number;
        role?: 'member' | 'moderator';
      }
    ): Promise<T> {
      const response = await httpClient.post<unknown>(
        `/v2/communities/${encodeURIComponent(communityId)}/join`,
        {
          body: {
            frogId: payload.frogId,
            ...(payload.role ? { role: payload.role } : {}),
          },
        }
      );
      return unwrapEnvelope<T>(response, 'Failed to join community');
    },

    async createRelationshipAttestation<T = unknown>(payload: {
      subjectFrogId: number;
      objectFrogId: number;
      attestationType: string;
      source?: string;
      idempotencyKey?: string;
      evidence?: Record<string, unknown>;
    }): Promise<T> {
      const response = await httpClient.post<unknown>('/v2/attestations/relationship', {
        body: {
          subjectFrogId: payload.subjectFrogId,
          objectFrogId: payload.objectFrogId,
          attestationType: payload.attestationType,
          ...(payload.source ? { source: payload.source } : {}),
          ...(payload.idempotencyKey ? { idempotencyKey: payload.idempotencyKey } : {}),
          ...(payload.evidence ? { evidence: payload.evidence } : {}),
        },
      });
      return unwrapEnvelope<T>(response, 'Failed to create relationship attestation');
    },

    async submitRelationshipAttestationOnchain<T = unknown>(
      attestationId: string,
      payload?: {
        force?: boolean;
      }
    ): Promise<T> {
      const response = await httpClient.post<unknown>(
        `/v2/attestations/relationship/${encodeURIComponent(attestationId)}/submit-onchain`,
        {
          ...(payload?.force !== undefined ? { body: { force: payload.force } } : {}),
        }
      );
      return unwrapEnvelope<T>(response, 'Failed to submit relationship attestation on-chain');
    },
  };
};
