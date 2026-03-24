import { Prisma } from '@prisma/client';
import { prisma } from '../../database';
import { AppError } from '../../middlewares/errorHandler';
import { V2SocialErrorCodes } from '../../types/api';
import { normalizeWalletAddress } from '../identity/nonce.service';
import {
  FamilyReadModel,
  sanitizeFamilyGoal,
  sanitizeFamilyName,
  sanitizeFamilyVisibility,
  toFamilyReadModel,
  type FamilyWithMembers,
} from './family.service';

type Tx = Prisma.TransactionClient;

export interface CreateFamilyInput {
  name: string;
  ownerFrogId: number;
  walletAddress: string;
  goal?: string;
  visibility?: string;
  requestId?: string;
  source?: string;
}

const getFamilyWithMembers = async (tx: Tx, familyId: number): Promise<FamilyWithMembers> => {
  const family = await tx.family.findUnique({
    where: { id: familyId },
    include: {
      leader: {
        select: {
          id: true,
          tokenId: true,
          name: true,
          ownerAddress: true,
          updatedAt: true,
        },
      },
      members: {
        orderBy: {
          id: 'asc',
        },
        select: {
          id: true,
          tokenId: true,
          name: true,
          ownerAddress: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!family) {
    throw new AppError(404, 'Family not found', V2SocialErrorCodes.FAMILY_NOT_FOUND);
  }

  return family;
};

export class FamilyCommandService {
  async createFamily(input: CreateFamilyInput): Promise<FamilyReadModel> {
    const name = sanitizeFamilyName(input.name);
    const goal = sanitizeFamilyGoal(input.goal);
    const visibility = sanitizeFamilyVisibility(input.visibility);
    const normalizedWallet = normalizeWalletAddress(input.walletAddress);

    return prisma.$transaction(async (tx) => {
      const ownerFrog = await tx.frog.findUnique({
        where: { id: input.ownerFrogId },
        select: {
          id: true,
          name: true,
          ownerAddress: true,
          familyId: true,
        },
      });

      if (!ownerFrog) {
        throw new AppError(404, 'Owner frog not found', 'NOT_FOUND');
      }

      if (ownerFrog.ownerAddress.toLowerCase() !== normalizedWallet) {
        throw new AppError(
          403,
          'walletAddress is not owner of ownerFrogId',
          V2SocialErrorCodes.FAMILY_PERMISSION_DENIED
        );
      }

      if (ownerFrog.familyId) {
        throw new AppError(
          409,
          'owner frog already belongs to a family',
          V2SocialErrorCodes.FAMILY_ALREADY_EXISTS
        );
      }

      const existingFamily = await tx.family.findUnique({
        where: { name },
        select: { id: true },
      });
      if (existingFamily) {
        throw new AppError(
          409,
          'family name already exists',
          V2SocialErrorCodes.FAMILY_ALREADY_EXISTS
        );
      }

      const family = await tx.family.create({
        data: {
          name,
          leaderId: ownerFrog.id,
        },
        select: { id: true },
      });

      await tx.frog.update({
        where: { id: ownerFrog.id },
        data: { familyId: family.id },
      });

      await tx.domainEvent.create({
        data: {
          frogId: ownerFrog.id,
          aggregateType: 'Family',
          aggregateId: String(family.id),
          eventType: 'FamilyCreated',
          payload: {
            familyId: family.id,
            name,
            ownerFrogId: ownerFrog.id,
            goal,
            visibility,
          },
          requestId: input.requestId,
          source: input.source || 'v2.family.command',
        },
      });

      await tx.domainEvent.create({
        data: {
          frogId: ownerFrog.id,
          aggregateType: 'Family',
          aggregateId: String(family.id),
          eventType: 'FamilyMemberJoined',
          payload: {
            familyId: family.id,
            frogId: ownerFrog.id,
            role: 'leader',
          },
          requestId: input.requestId,
          source: input.source || 'v2.family.command',
        },
      });

      const familyWithMembers = await getFamilyWithMembers(tx, family.id);

      return toFamilyReadModel(familyWithMembers, {
        goal,
        visibility,
      });
    });
  }
}

export const familyCommandServiceV2 = new FamilyCommandService();
