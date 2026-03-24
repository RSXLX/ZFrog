import { prisma } from '../../database';
import { AppError } from '../../middlewares/errorHandler';
import { V2SocialErrorCodes } from '../../types/api';
import {
  parseFamilyProjectionMeta,
  toFamilyReadModel,
  type FamilyReadModel,
  type FamilyWithMembers,
} from './family.service';

export interface GetFamilyByIdInput {
  familyId: number;
}

const getFamilyWithMembers = async (familyId: number): Promise<FamilyWithMembers> => {
  const family = await prisma.family.findUnique({
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

export class FamilyQueryService {
  private async getFamilyProjection(familyId: number) {
    const createdEvent = await prisma.domainEvent.findFirst({
      where: {
        aggregateType: 'Family',
        aggregateId: String(familyId),
        eventType: 'FamilyCreated',
      },
      orderBy: { occurredAt: 'desc' },
      select: { payload: true },
    });

    return parseFamilyProjectionMeta(createdEvent?.payload);
  }

  async getFamilyById(input: GetFamilyByIdInput): Promise<FamilyReadModel> {
    const family = await getFamilyWithMembers(input.familyId);
    const projection = await this.getFamilyProjection(input.familyId);
    return toFamilyReadModel(family, projection);
  }
}

export const familyQueryServiceV2 = new FamilyQueryService();
