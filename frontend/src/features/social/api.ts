import { apiClient } from '../../lib/api/client';
import { buildSessionAuthHeaders } from '../../lib/auth/session';
import type {
  ModuleStatusReadModel,
  SocialCreateRitualPayload,
  SocialRitualResult,
} from '../../lib/api/contracts';
import { createHttpClient, createSocialResourceClient } from '../../../../packages/client-sdk/src';

interface Envelope<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

type CommunityJoinRole = 'member' | 'moderator';
export type FamilyVisibility = 'private' | 'friends' | 'public';

export interface FamilyMemberReadModelV2 {
  frogId: number;
  tokenId: number;
  name: string;
  ownerAddress: string;
  role: 'leader' | 'member';
  joinedAt: string;
}

export interface FamilyReadModelV2 {
  id: number;
  name: string;
  ownerFrogId: number;
  goal: string | null;
  visibility: FamilyVisibility;
  totemLevel: number;
  totemProgress: number;
  weeklyMileage: number;
  memberCount: number;
  members: FamilyMemberReadModelV2[];
  createdAt: string;
  updatedAt: string;
}

export interface CommunityReadModelV2 {
  id: string;
  name: string;
  icon: string;
  themeColor: string;
  description: string | null;
  credentialType: 'PUBLIC' | 'NFT' | 'INVITE_CODE' | 'SIGNATURE';
  memberCount: number;
  creatorAddress: string | null;
  isOfficial: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityMemberReadModelV2 {
  userAddress: string;
  frogId: number | null;
  role: CommunityJoinRole;
  joinedAt: string;
  isActive: boolean;
}

export interface CommunityMembersReadModelV2 {
  communityId: string;
  memberCount: number;
  members: CommunityMemberReadModelV2[];
}

export interface CommunityJoinResultV2 {
  community: CommunityReadModelV2;
  membership: CommunityMemberReadModelV2;
}

export interface RelationshipAttestationReadModelV2 {
  id: string;
  subjectFrogId: number;
  objectFrogId: number;
  attestationType: string;
  source: string;
  evidence: Record<string, unknown> | null;
  status: 'QUEUED' | 'CONFIRMED' | 'FAILED';
  idempotencyKey: string | null;
  createdByAddress: string;
  onchainTrace: {
    milestoneId: string;
    txHash: string | null;
    chainId: number | null;
    blockNumber: string | null;
    recordedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitRelationshipAttestationOnchainResultV2 {
  attestationId: string;
  status: 'CONFIRMED' | 'FAILED';
  idempotentReplay: boolean;
  trace: {
    attestationId: string;
    milestoneId: string;
    txHash: string | null;
    chainId: number | null;
    blockNumber: string | null;
    recordedAt: string;
  } | null;
  error?: string;
}

class SocialFeatureApi {
  private readonly socialClient = createSocialResourceClient(
    createHttpClient({
      baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
      getAuthHeaders: () => buildSessionAuthHeaders(),
      retries: 0,
    })
  );

  private parseV2CommunityJoinCredential(credential: string):
    | {
        communityId: string;
        frogId: number;
        role?: CommunityJoinRole;
      }
    | null {
    if (!credential.startsWith('v2:')) {
      return null;
    }

    const [communityIdRaw, frogIdRaw, roleRaw] = credential.slice(3).split(':');
    const communityId = (communityIdRaw || '').trim();
    const frogId = Number(frogIdRaw);
    const role = roleRaw === 'member' || roleRaw === 'moderator' ? roleRaw : undefined;

    if (!communityId || !Number.isInteger(frogId) || frogId <= 0) {
      return null;
    }

    return {
      communityId,
      frogId,
      ...(role ? { role } : {}),
    };
  }

  async getStatus(): Promise<ModuleStatusReadModel> {
    return this.socialClient.getStatus<ModuleStatusReadModel>();
  }

  async createFamily(payload: {
    name: string;
    ownerFrogId: number;
    goal?: string;
    visibility?: FamilyVisibility;
  }): Promise<FamilyReadModelV2> {
    return this.socialClient.createFamily<FamilyReadModelV2>({
      name: payload.name,
      ownerFrogId: payload.ownerFrogId,
      ...(payload.goal ? { goal: payload.goal } : {}),
      ...(payload.visibility ? { visibility: payload.visibility } : {}),
    });
  }

  async getFamilyById(familyId: number): Promise<FamilyReadModelV2> {
    return this.socialClient.getFamilyById<FamilyReadModelV2>(familyId);
  }

  async createRitual(payload: SocialCreateRitualPayload): Promise<SocialRitualResult> {
    return this.socialClient.createRitual<SocialRitualResult>(payload);
  }

  async blessDormant(payload: {
    targetFrogId: number;
    initiatorFrogId: number;
    verificationId?: string;
  }): Promise<SocialRitualResult> {
    return this.createRitual({
      type: 'blessing',
      targetFrogId: payload.targetFrogId,
      initiatorFrogId: payload.initiatorFrogId,
      verificationId: payload.verificationId,
    });
  }

  async rescueTravel(payload: {
    travelId: number;
    initiatorFrogId: number;
    verificationId: string;
  }): Promise<SocialRitualResult> {
    return this.socialClient.rescueTravel<SocialRitualResult>({
      travelId: payload.travelId,
      rescuerFrogId: payload.initiatorFrogId,
      verificationId: payload.verificationId,
    });
  }

  async getCommunityById(communityId: string): Promise<CommunityReadModelV2> {
    return this.socialClient.getCommunityById<CommunityReadModelV2>(communityId);
  }

  async listCommunityMembers(
    communityId: string,
    limit = 50
  ): Promise<CommunityMembersReadModelV2> {
    return this.socialClient.listCommunityMembers<CommunityMembersReadModelV2>(communityId, {
      limit,
    });
  }

  async joinCommunity(payload: {
    communityId: string;
    frogId: number;
    role?: CommunityJoinRole;
  }): Promise<CommunityJoinResultV2> {
    return this.socialClient.joinCommunity<CommunityJoinResultV2>(payload.communityId, {
      frogId: payload.frogId,
      ...(payload.role ? { role: payload.role } : {}),
    });
  }

  async createRelationshipAttestation(payload: {
    subjectFrogId: number;
    objectFrogId: number;
    attestationType: string;
    source?: string;
    idempotencyKey?: string;
    evidence?: Record<string, unknown>;
  }): Promise<RelationshipAttestationReadModelV2 & { idempotentReplay: boolean }> {
    return this.socialClient.createRelationshipAttestation<
      RelationshipAttestationReadModelV2 & { idempotentReplay: boolean }
    >({
      subjectFrogId: payload.subjectFrogId,
      objectFrogId: payload.objectFrogId,
      attestationType: payload.attestationType,
      ...(payload.source ? { source: payload.source } : {}),
      ...(payload.idempotencyKey ? { idempotencyKey: payload.idempotencyKey } : {}),
      ...(payload.evidence ? { evidence: payload.evidence } : {}),
    });
  }

  async submitRelationshipAttestationOnchain(
    attestationId: string,
    payload?: {
      force?: boolean;
    }
  ): Promise<SubmitRelationshipAttestationOnchainResultV2> {
    return this.socialClient.submitRelationshipAttestationOnchain<SubmitRelationshipAttestationOnchainResultV2>(
      attestationId,
      payload
    );
  }

  async listFriends(frogTokenId: number | string): Promise<any[]> {
    const response = await apiClient.get<Envelope<any[]>>(`/friends/list/${frogTokenId}`);
    if (!response?.success || !Array.isArray(response.data)) return [];
    return response.data;
  }

  async sendFriendRequest(payload: {
    requesterId: number;
    addresseeId?: number;
    walletAddress?: string;
  }): Promise<Envelope<any>> {
    return apiClient.post<Envelope<any>>('/friends/request', payload);
  }

  async getFriendRequests(frogId: number | string): Promise<any[]> {
    const response = await apiClient.get<Envelope<any[]>>(`/friends/requests/${frogId}`);
    if (!response?.success || !Array.isArray(response.data)) return [];
    return response.data;
  }

  async respondFriendRequest(
    requestId: number | string,
    payload: { status: 'Accepted' | 'Declined'; message?: string }
  ): Promise<Envelope<any>> {
    return apiClient.put<Envelope<any>>(`/friends/request/${requestId}/respond`, payload);
  }

  async removeFriend(friendshipId: number | string): Promise<Envelope<any>> {
    return apiClient.delete<Envelope<any>>(`/friends/${friendshipId}`);
  }

  async getFriendInteractions(friendshipId: number | string, limit = 10): Promise<any[]> {
    const response = await apiClient.get<Envelope<any[]>>(
      `/friends/${friendshipId}/interactions?limit=${limit}`
    );
    if (!response?.success || !Array.isArray(response.data)) return [];
    return response.data;
  }

  async getFriendIntimacy(friendshipId: number | string): Promise<any | null> {
    const response = await apiClient.get<Envelope<any>>(`/friends/${friendshipId}/intimacy`);
    if (!response?.success) return null;
    return response.data || null;
  }

  async interactWithFriend(
    friendshipId: number | string,
    payload: {
      actorId: number;
      type: string;
      message?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<Envelope<any>> {
    return apiClient.post<Envelope<any>>(`/friends/${friendshipId}/interact`, payload);
  }

  async verifyCommunityCredential(credential: string): Promise<Envelope<any>> {
    const normalized = credential.trim();
    const v2JoinToken = this.parseV2CommunityJoinCredential(normalized);
    if (v2JoinToken) {
      try {
        const result = await this.joinCommunity(v2JoinToken);
        return {
          success: true,
          data: {
            community: result.community,
            membership: result.membership,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : '加入社区失败';
        return {
          success: false,
          error: message,
          message,
        };
      }
    }

    return apiClient.post<Envelope<any>>('/communities/verify-credential', { credential });
  }
}

export const socialFeatureApi = new SocialFeatureApi();
