import { Community, CommunityCredentialType, UserCommunity } from '@prisma/client';
import { AppError } from '../../middlewares/errorHandler';
import { V2SocialErrorCodes } from '../../types/api';

export const COMMUNITY_ROLE_VALUES = ['member', 'moderator'] as const;
export type CommunityRole = (typeof COMMUNITY_ROLE_VALUES)[number];
export const DEFAULT_COMMUNITY_ROLE: CommunityRole = 'member';

const COMMUNITY_ID_PATTERN = /^[a-zA-Z0-9_-]{2,64}$/;
const MEMBERSHIP_CREDENTIAL_PREFIX = 'v2-community:';

export interface CommunityReadModel {
  id: string;
  name: string;
  icon: string;
  themeColor: string;
  description: string | null;
  credentialType: CommunityCredentialType;
  memberCount: number;
  creatorAddress: string | null;
  isOfficial: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityMemberReadModel {
  userAddress: string;
  frogId: number | null;
  role: CommunityRole;
  joinedAt: string;
  isActive: boolean;
}

interface CommunityMembershipMeta {
  frogId: number | null;
  role: CommunityRole;
}

export const sanitizeCommunityId = (communityId: string): string => {
  const normalized = communityId.trim();
  if (!COMMUNITY_ID_PATTERN.test(normalized)) {
    throw new AppError(
      400,
      'communityId must be 2-64 characters of [a-zA-Z0-9_-]',
      V2SocialErrorCodes.COMMUNITY_INVALID_INPUT
    );
  }
  return normalized;
};

export const sanitizeCommunityRole = (role?: string): CommunityRole => {
  if (role === undefined || role === null) {
    return DEFAULT_COMMUNITY_ROLE;
  }
  const normalized = role.trim() as CommunityRole;
  if (!COMMUNITY_ROLE_VALUES.includes(normalized)) {
    throw new AppError(
      400,
      'role must be one of member/moderator',
      V2SocialErrorCodes.COMMUNITY_INVALID_INPUT
    );
  }
  return normalized;
};

export const sanitizeCommunityMembersLimit = (limit?: number): number => {
  if (limit === undefined || limit === null) {
    return 50;
  }
  if (!Number.isInteger(limit) || limit <= 0 || limit > 200) {
    throw new AppError(
      400,
      'limit must be a positive integer <= 200',
      V2SocialErrorCodes.COMMUNITY_INVALID_INPUT
    );
  }
  return limit;
};

export const buildCommunityMembershipCredential = (input: {
  frogId: number;
  role: CommunityRole;
}): string => `${MEMBERSHIP_CREDENTIAL_PREFIX}${input.role}:${input.frogId}`;

const parseCommunityMembershipCredential = (credential: string | null): CommunityMembershipMeta => {
  if (!credential || !credential.startsWith(MEMBERSHIP_CREDENTIAL_PREFIX)) {
    return {
      frogId: null,
      role: DEFAULT_COMMUNITY_ROLE,
    };
  }

  const [roleRaw, frogIdRaw] = credential.slice(MEMBERSHIP_CREDENTIAL_PREFIX.length).split(':');
  const role =
    roleRaw && COMMUNITY_ROLE_VALUES.includes(roleRaw as CommunityRole)
      ? (roleRaw as CommunityRole)
      : DEFAULT_COMMUNITY_ROLE;

  const frogIdParsed = Number(frogIdRaw);
  const frogId = Number.isInteger(frogIdParsed) && frogIdParsed > 0 ? frogIdParsed : null;

  return {
    frogId,
    role,
  };
};

export const toCommunityReadModel = (community: Community): CommunityReadModel => ({
  id: community.id,
  name: community.name,
  icon: community.icon,
  themeColor: community.themeColor,
  description: community.description,
  credentialType: community.credentialType,
  memberCount: community.memberCount,
  creatorAddress: community.creatorAddress?.toLowerCase() || null,
  isOfficial: community.isOfficial,
  isActive: community.isActive,
  createdAt: community.createdAt.toISOString(),
  updatedAt: community.updatedAt.toISOString(),
});

export const toCommunityMemberReadModel = (membership: UserCommunity): CommunityMemberReadModel => {
  const metadata = parseCommunityMembershipCredential(membership.credential);

  return {
    userAddress: membership.userAddress.toLowerCase(),
    frogId: metadata.frogId,
    role: metadata.role,
    joinedAt: membership.joinedAt.toISOString(),
    isActive: membership.isActive,
  };
};
