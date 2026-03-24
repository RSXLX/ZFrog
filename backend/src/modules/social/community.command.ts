import { Prisma } from '@prisma/client';
import { prisma } from '../../database';
import { AppError } from '../../middlewares/errorHandler';
import { V2SocialErrorCodes } from '../../types/api';
import { normalizeWalletAddress } from '../identity/nonce.service';
import {
  buildCommunityMembershipCredential,
  sanitizeCommunityId,
  sanitizeCommunityRole,
  toCommunityMemberReadModel,
  toCommunityReadModel,
  type CommunityMemberReadModel,
  type CommunityReadModel,
} from './community.service';

type Tx = Prisma.TransactionClient;

export interface JoinCommunityInput {
  communityId: string;
  frogId: number;
  role?: string;
  walletAddress: string;
  requestId?: string;
  source?: string;
}

export interface JoinCommunityResult {
  community: CommunityReadModel;
  membership: CommunityMemberReadModel;
}

const getCommunityForJoin = async (tx: Tx, communityId: string) => {
  const community = await tx.community.findUnique({
    where: { id: communityId },
  });

  if (!community || !community.isActive) {
    throw new AppError(404, 'Community not found', V2SocialErrorCodes.COMMUNITY_NOT_FOUND);
  }

  return community;
};

export class CommunityCommandService {
  async joinCommunity(input: JoinCommunityInput): Promise<JoinCommunityResult> {
    const communityId = sanitizeCommunityId(input.communityId);
    const role = sanitizeCommunityRole(input.role);
    const normalizedWallet = normalizeWalletAddress(input.walletAddress);

    return prisma.$transaction(async (tx) => {
      const [community, frog] = await Promise.all([
        getCommunityForJoin(tx, communityId),
        tx.frog.findUnique({
          where: { id: input.frogId },
          select: {
            id: true,
            ownerAddress: true,
          },
        }),
      ]);

      if (!frog) {
        throw new AppError(404, 'Frog not found', 'NOT_FOUND');
      }

      if (frog.ownerAddress.toLowerCase() !== normalizedWallet) {
        throw new AppError(
          403,
          'walletAddress is not owner of frogId',
          V2SocialErrorCodes.COMMUNITY_PERMISSION_DENIED
        );
      }

      const existingMembership = await tx.userCommunity.findUnique({
        where: {
          userAddress_communityId: {
            userAddress: normalizedWallet,
            communityId,
          },
        },
      });

      if (existingMembership) {
        throw new AppError(
          409,
          'walletAddress already joined this community',
          V2SocialErrorCodes.COMMUNITY_ALREADY_MEMBER
        );
      }

      const createdMembership = await tx.userCommunity.create({
        data: {
          userAddress: normalizedWallet,
          communityId,
          credential: buildCommunityMembershipCredential({
            frogId: frog.id,
            role,
          }),
        },
      });

      const updatedCommunity = await tx.community.update({
        where: { id: community.id },
        data: { memberCount: { increment: 1 } },
      });

      await tx.domainEvent.create({
        data: {
          frogId: frog.id,
          aggregateType: 'Community',
          aggregateId: community.id,
          eventType: 'CommunityJoined',
          payload: {
            communityId: community.id,
            frogId: frog.id,
            walletAddress: normalizedWallet,
            role,
          },
          requestId: input.requestId,
          source: input.source || 'v2.community.command',
        },
      });

      return {
        community: toCommunityReadModel(updatedCommunity),
        membership: toCommunityMemberReadModel(createdMembership),
      };
    });
  }
}

export const communityCommandServiceV2 = new CommunityCommandService();
