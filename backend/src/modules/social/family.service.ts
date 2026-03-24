import { Prisma } from '@prisma/client';
import { AppError } from '../../middlewares/errorHandler';
import { V2SocialErrorCodes } from '../../types/api';

export const FAMILY_VISIBILITY_VALUES = ['private', 'friends', 'public'] as const;
export type FamilyVisibility = (typeof FAMILY_VISIBILITY_VALUES)[number];

export const DEFAULT_FAMILY_VISIBILITY: FamilyVisibility = 'private';

export interface FamilyMemberReadModel {
  frogId: number;
  tokenId: number;
  name: string;
  ownerAddress: string;
  role: 'leader' | 'member';
  joinedAt: string;
}

export interface FamilyReadModel {
  id: number;
  name: string;
  ownerFrogId: number;
  goal: string | null;
  visibility: FamilyVisibility;
  totemLevel: number;
  totemProgress: number;
  weeklyMileage: number;
  memberCount: number;
  members: FamilyMemberReadModel[];
  createdAt: string;
  updatedAt: string;
}

export interface FamilyProjectionMeta {
  goal: string | null;
  visibility: FamilyVisibility;
}

export type FamilyWithMembers = Prisma.FamilyGetPayload<{
  include: {
    leader: {
      select: {
        id: true;
        tokenId: true;
        name: true;
        ownerAddress: true;
        updatedAt: true;
      };
    };
    members: {
      orderBy: {
        id: 'asc';
      };
      select: {
        id: true;
        tokenId: true;
        name: true;
        ownerAddress: true;
        updatedAt: true;
      };
    };
  };
}>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseVisibility = (value: unknown): FamilyVisibility => {
  if (typeof value !== 'string') {
    return DEFAULT_FAMILY_VISIBILITY;
  }
  if (FAMILY_VISIBILITY_VALUES.includes(value as FamilyVisibility)) {
    return value as FamilyVisibility;
  }
  return DEFAULT_FAMILY_VISIBILITY;
};

export const parseFamilyProjectionMeta = (payload: unknown): FamilyProjectionMeta => {
  if (!isRecord(payload)) {
    return {
      goal: null,
      visibility: DEFAULT_FAMILY_VISIBILITY,
    };
  }

  const goal = typeof payload.goal === 'string' && payload.goal.trim().length > 0 ? payload.goal : null;

  return {
    goal,
    visibility: parseVisibility(payload.visibility),
  };
};

export const sanitizeFamilyName = (name: string): string => {
  const normalized = name.trim();
  if (normalized.length < 2 || normalized.length > 32) {
    throw new AppError(
      400,
      'name must be 2-32 characters',
      V2SocialErrorCodes.FAMILY_INVALID_INPUT
    );
  }
  return normalized;
};

export const sanitizeFamilyGoal = (goal?: string): string | null => {
  if (goal === undefined || goal === null) {
    return null;
  }
  const normalized = goal.trim();
  if (normalized.length === 0) {
    return null;
  }
  if (normalized.length > 120) {
    throw new AppError(
      400,
      'goal must be <= 120 characters',
      V2SocialErrorCodes.FAMILY_INVALID_INPUT
    );
  }
  return normalized;
};

export const sanitizeFamilyVisibility = (visibility?: string): FamilyVisibility => {
  if (!visibility) {
    return DEFAULT_FAMILY_VISIBILITY;
  }
  const normalized = visibility.trim() as FamilyVisibility;
  if (!FAMILY_VISIBILITY_VALUES.includes(normalized)) {
    throw new AppError(
      400,
      'visibility must be one of private/friends/public',
      V2SocialErrorCodes.FAMILY_INVALID_INPUT
    );
  }
  return normalized;
};

export const toFamilyReadModel = (
  family: FamilyWithMembers,
  projection: FamilyProjectionMeta
): FamilyReadModel => {
  const members = family.members.map((member) => {
    const role: FamilyMemberReadModel['role'] = member.id === family.leaderId ? 'leader' : 'member';

    return {
      frogId: member.id,
      tokenId: member.tokenId,
      name: member.name,
      ownerAddress: member.ownerAddress.toLowerCase(),
      role,
      joinedAt: member.updatedAt.toISOString(),
    };
  });

  return {
    id: family.id,
    name: family.name,
    ownerFrogId: family.leaderId,
    goal: projection.goal,
    visibility: projection.visibility,
    totemLevel: family.totemLevel,
    totemProgress: family.totemProgress,
    weeklyMileage: family.weeklyMileage,
    memberCount: members.length,
    members,
    createdAt: family.createdAt.toISOString(),
    updatedAt: family.updatedAt.toISOString(),
  };
};
