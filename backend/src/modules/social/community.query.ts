import { prisma } from '../../database';
import { AppError } from '../../middlewares/errorHandler';
import { V2SocialErrorCodes } from '../../types/api';
import {
  sanitizeCommunityId,
  sanitizeCommunityMembersLimit,
  toCommunityMemberReadModel,
  toCommunityReadModel,
  type CommunityMemberReadModel,
  type CommunityReadModel,
} from './community.service';

export interface GetCommunityByIdInput {
  communityId: string;
}

export interface ListCommunityMembersInput {
  communityId: string;
  limit?: number;
}

export interface CommunityMembersReadModel {
  communityId: string;
  memberCount: number;
  members: CommunityMemberReadModel[];
}

const getActiveCommunity = async (communityId: string) => {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
  });

  if (!community || !community.isActive) {
    throw new AppError(404, 'Community not found', V2SocialErrorCodes.COMMUNITY_NOT_FOUND);
  }

  return community;
};

export class CommunityQueryService {
  async getCommunityById(input: GetCommunityByIdInput): Promise<CommunityReadModel> {
    const communityId = sanitizeCommunityId(input.communityId);
    const community = await getActiveCommunity(communityId);
    return toCommunityReadModel(community);
  }

  async listCommunityMembers(input: ListCommunityMembersInput): Promise<CommunityMembersReadModel> {
    const communityId = sanitizeCommunityId(input.communityId);
    const limit = sanitizeCommunityMembersLimit(input.limit);
    const community = await getActiveCommunity(communityId);

    const members = await prisma.userCommunity.findMany({
      where: { communityId },
      orderBy: { joinedAt: 'asc' },
      take: limit,
    });

    return {
      communityId: community.id,
      memberCount: community.memberCount,
      members: members.map(toCommunityMemberReadModel),
    };
  }
}

export const communityQueryServiceV2 = new CommunityQueryService();
