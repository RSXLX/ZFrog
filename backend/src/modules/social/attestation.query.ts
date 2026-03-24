import { Prisma } from '@prisma/client';
import { prisma } from '../../database';
import { AppError } from '../../middlewares/errorHandler';
import { V2SocialErrorCodes } from '../../types/api';
import { normalizeWalletAddress } from '../identity/nonce.service';
import {
  sanitizeAttestationPageLimit,
  sanitizeAttestationPageOffset,
  sanitizeAttestationStatus,
  sanitizeAttestationType,
  toRelationshipAttestationReadModel,
  type RelationshipAttestationReadModel,
} from './attestation.service';

export interface GetRelationshipAttestationByIdInput {
  attestationId: string;
  walletAddress?: string;
}

export interface ListRelationshipAttestationsInput {
  subjectFrogId?: number;
  objectFrogId?: number;
  attestationType?: string;
  status?: string;
  limit?: number;
  offset?: number;
  walletAddress?: string;
}

export interface RelationshipAttestationListReadModel {
  items: RelationshipAttestationReadModel[];
  total: number;
  limit: number;
  offset: number;
}

const sanitizeAttestationId = (attestationId: string): string => {
  const normalized = attestationId.trim();
  if (!normalized || normalized.length > 128) {
    throw new AppError(
      400,
      'attestationId must be a non-empty string <= 128 chars',
      V2SocialErrorCodes.ATTESTATION_INVALID_INPUT
    );
  }
  return normalized;
};

const resolveOwnedFrogIdsByWallet = async (walletAddress: string): Promise<number[]> => {
  const normalizedWallet = normalizeWalletAddress(walletAddress);
  const frogs = await prisma.frog.findMany({
    where: {
      ownerAddress: {
        equals: normalizedWallet,
        mode: 'insensitive',
      },
    },
    select: { id: true },
  });

  return frogs.map((frog) => frog.id);
};

const buildWalletScopedWhere = async (
  walletAddress: string
): Promise<Prisma.RelationshipAttestationWhereInput> => {
  const normalizedWallet = normalizeWalletAddress(walletAddress);
  const ownedFrogIds = await resolveOwnedFrogIdsByWallet(normalizedWallet);

  const orFilters: Prisma.RelationshipAttestationWhereInput[] = [{ createdByAddress: normalizedWallet }];
  if (ownedFrogIds.length > 0) {
    orFilters.push({ subjectFrogId: { in: ownedFrogIds } }, { objectFrogId: { in: ownedFrogIds } });
  }

  return { OR: orFilters };
};

const assertWalletCanReadAttestation = async (
  input: {
    walletAddress: string;
    attestation: {
      id: string;
      subjectFrogId: number;
      objectFrogId: number;
      createdByAddress: string;
    };
  }
): Promise<void> => {
  const normalizedWallet = normalizeWalletAddress(input.walletAddress);
  if (input.attestation.createdByAddress === normalizedWallet) {
    return;
  }

  const ownerMatch = await prisma.frog.findFirst({
    where: {
      id: {
        in: [input.attestation.subjectFrogId, input.attestation.objectFrogId],
      },
      ownerAddress: {
        equals: normalizedWallet,
        mode: 'insensitive',
      },
    },
    select: { id: true },
  });

  if (!ownerMatch) {
    throw new AppError(
      403,
      'walletAddress cannot access this attestation',
      V2SocialErrorCodes.ATTESTATION_PERMISSION_DENIED
    );
  }
};

export class AttestationQueryService {
  async getById(input: GetRelationshipAttestationByIdInput): Promise<RelationshipAttestationReadModel> {
    const attestationId = sanitizeAttestationId(input.attestationId);

    const attestation = await prisma.relationshipAttestation.findUnique({
      where: { id: attestationId },
      include: {
        onchainMilestones: {
          where: {
            milestoneType: 'RELATIONSHIP_ATTESTED',
            attestationId,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            txHash: true,
            chainId: true,
            blockNumber: true,
            createdAt: true,
          },
        },
      },
    });

    if (!attestation) {
      throw new AppError(
        404,
        'Attestation not found',
        V2SocialErrorCodes.ATTESTATION_NOT_FOUND
      );
    }
    if (input.walletAddress) {
      await assertWalletCanReadAttestation({
        walletAddress: input.walletAddress,
        attestation,
      });
    }

    return toRelationshipAttestationReadModel(attestation, attestation.onchainMilestones[0] || null);
  }

  async list(
    input: ListRelationshipAttestationsInput
  ): Promise<RelationshipAttestationListReadModel> {
    const attestationType =
      input.attestationType === undefined
        ? undefined
        : sanitizeAttestationType(input.attestationType);

    const status = sanitizeAttestationStatus(input.status);
    const limit = sanitizeAttestationPageLimit(input.limit);
    const offset = sanitizeAttestationPageOffset(input.offset);

    const where: Prisma.RelationshipAttestationWhereInput = {
      ...(input.subjectFrogId ? { subjectFrogId: input.subjectFrogId } : {}),
      ...(input.objectFrogId ? { objectFrogId: input.objectFrogId } : {}),
      ...(attestationType ? { attestationType } : {}),
      ...(status ? { status } : {}),
    };
    if (input.walletAddress) {
      where.AND = [await buildWalletScopedWhere(input.walletAddress)];
    }

    const [items, total] = await prisma.$transaction([
      prisma.relationshipAttestation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          onchainMilestones: {
            where: {
              milestoneType: 'RELATIONSHIP_ATTESTED',
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              txHash: true,
              chainId: true,
              blockNumber: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.relationshipAttestation.count({ where }),
    ]);

    return {
      items: items.map((item) => toRelationshipAttestationReadModel(item, item.onchainMilestones[0] || null)),
      total,
      limit,
      offset,
    };
  }
}

export const attestationQueryServiceV2 = new AttestationQueryService();
