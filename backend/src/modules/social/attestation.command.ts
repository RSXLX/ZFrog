import { Prisma, RelationshipAttestation } from '@prisma/client';
import { prisma } from '../../database';
import { AppError } from '../../middlewares/errorHandler';
import { V2SocialErrorCodes } from '../../types/api';
import { normalizeWalletAddress } from '../identity/nonce.service';
import {
  sanitizeAttestationEvidence,
  sanitizeAttestationIdempotencyKey,
  sanitizeAttestationSource,
  sanitizeAttestationType,
  toRelationshipAttestationReadModel,
  type RelationshipAttestationReadModel,
} from './attestation.service';

type Tx = Prisma.TransactionClient;

export interface CreateRelationshipAttestationInput {
  subjectFrogId: number;
  objectFrogId: number;
  attestationType: string;
  source?: string;
  evidence?: unknown;
  idempotencyKey?: string;
  walletAddress: string;
  requestId?: string;
}

export interface CreateRelationshipAttestationResult {
  attestation: RelationshipAttestationReadModel;
  idempotentReplay: boolean;
}

const normalizeEvidenceString = (value: unknown): string => JSON.stringify(value || null);

const assertSameIdempotentPayload = (
  existing: {
    subjectFrogId: number;
    objectFrogId: number;
    attestationType: string;
    source: string;
    evidence: Prisma.JsonValue | null;
  },
  incoming: {
    subjectFrogId: number;
    objectFrogId: number;
    attestationType: string;
    source: string;
    evidence: Record<string, unknown> | null;
  }
): void => {
  const isSamePayload =
    existing.subjectFrogId === incoming.subjectFrogId &&
    existing.objectFrogId === incoming.objectFrogId &&
    existing.attestationType === incoming.attestationType &&
    existing.source === incoming.source &&
    normalizeEvidenceString(existing.evidence) === normalizeEvidenceString(incoming.evidence);

  if (isSamePayload) {
    return;
  }

  throw new AppError(
    409,
    'attestation already exists with different payload',
    V2SocialErrorCodes.ATTESTATION_DUPLICATE
  );
};

const findIdempotentReplay = async (
  tx: Tx,
  idempotencyKey: string,
  payload: {
    subjectFrogId: number;
    objectFrogId: number;
    attestationType: string;
    source: string;
    evidence: Record<string, unknown> | null;
  }
): Promise<RelationshipAttestationReadModel | null> => {
  const existing = await tx.relationshipAttestation.findUnique({
    where: { idempotencyKey },
  });

  if (!existing) {
    return null;
  }

  assertSameIdempotentPayload(existing, payload);
  return toRelationshipAttestationReadModel(existing);
};

const findSemanticReplay = async (
  tx: Tx,
  payload: {
    subjectFrogId: number;
    objectFrogId: number;
    attestationType: string;
    source: string;
    evidence: Record<string, unknown> | null;
  }
): Promise<RelationshipAttestationReadModel | null> => {
  const existing = await tx.relationshipAttestation.findFirst({
    where: {
      subjectFrogId: payload.subjectFrogId,
      objectFrogId: payload.objectFrogId,
      attestationType: payload.attestationType,
      source: payload.source,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!existing) {
    return null;
  }

  assertSameIdempotentPayload(existing, payload);
  return toRelationshipAttestationReadModel(existing);
};

const assertAttestationPermission = async (
  tx: Tx,
  input: { subjectFrogId: number; objectFrogId: number; walletAddress: string }
): Promise<void> => {
  const [subjectFrog, objectFrog] = await Promise.all([
    tx.frog.findUnique({
      where: { id: input.subjectFrogId },
      select: { id: true, ownerAddress: true },
    }),
    tx.frog.findUnique({
      where: { id: input.objectFrogId },
      select: { id: true },
    }),
  ]);

  if (!subjectFrog || !objectFrog) {
    throw new AppError(404, 'Frog not found', 'NOT_FOUND');
  }

  if (subjectFrog.ownerAddress.toLowerCase() !== input.walletAddress) {
    throw new AppError(
      403,
      'walletAddress is not owner of subjectFrogId',
      V2SocialErrorCodes.ATTESTATION_PERMISSION_DENIED
    );
  }
};

export class AttestationCommandService {
  async createRelationshipAttestation(
    input: CreateRelationshipAttestationInput
  ): Promise<CreateRelationshipAttestationResult> {
    if (input.subjectFrogId === input.objectFrogId) {
      throw new AppError(
        400,
        'subjectFrogId and objectFrogId must be different',
        V2SocialErrorCodes.ATTESTATION_INVALID_INPUT
      );
    }

    const normalizedInput = {
      subjectFrogId: input.subjectFrogId,
      objectFrogId: input.objectFrogId,
      attestationType: sanitizeAttestationType(input.attestationType),
      source: sanitizeAttestationSource(input.source),
      evidence: sanitizeAttestationEvidence(input.evidence),
      idempotencyKey: sanitizeAttestationIdempotencyKey(input.idempotencyKey),
      walletAddress: normalizeWalletAddress(input.walletAddress),
      requestId: input.requestId,
    };

    return prisma.$transaction(async (tx) => {
      await assertAttestationPermission(tx, {
        subjectFrogId: normalizedInput.subjectFrogId,
        objectFrogId: normalizedInput.objectFrogId,
        walletAddress: normalizedInput.walletAddress,
      });

      if (normalizedInput.idempotencyKey) {
        const replay = await findIdempotentReplay(tx, normalizedInput.idempotencyKey, {
          subjectFrogId: normalizedInput.subjectFrogId,
          objectFrogId: normalizedInput.objectFrogId,
          attestationType: normalizedInput.attestationType,
          source: normalizedInput.source,
          evidence: normalizedInput.evidence,
        });
        if (replay) {
          return {
            attestation: replay,
            idempotentReplay: true,
          };
        }
      }

      const semanticReplay = await findSemanticReplay(tx, {
        subjectFrogId: normalizedInput.subjectFrogId,
        objectFrogId: normalizedInput.objectFrogId,
        attestationType: normalizedInput.attestationType,
        source: normalizedInput.source,
        evidence: normalizedInput.evidence,
      });
      if (semanticReplay) {
        return {
          attestation: semanticReplay,
          idempotentReplay: true,
        };
      }

      let created: RelationshipAttestation;
      try {
        created = await tx.relationshipAttestation.create({
          data: {
            subjectFrogId: normalizedInput.subjectFrogId,
            objectFrogId: normalizedInput.objectFrogId,
            attestationType: normalizedInput.attestationType,
            source: normalizedInput.source,
            evidence:
              normalizedInput.evidence === null
                ? Prisma.JsonNull
                : (normalizedInput.evidence as Prisma.InputJsonObject),
            status: 'QUEUED',
            idempotencyKey: normalizedInput.idempotencyKey,
            requestId: normalizedInput.requestId,
            createdByAddress: normalizedInput.walletAddress,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          if (normalizedInput.idempotencyKey) {
            const replayByIdempotencyKey = await findIdempotentReplay(
              tx,
              normalizedInput.idempotencyKey,
              {
                subjectFrogId: normalizedInput.subjectFrogId,
                objectFrogId: normalizedInput.objectFrogId,
                attestationType: normalizedInput.attestationType,
                source: normalizedInput.source,
                evidence: normalizedInput.evidence,
              }
            );
            if (replayByIdempotencyKey) {
              return {
                attestation: replayByIdempotencyKey,
                idempotentReplay: true,
              };
            }
          }

          const replayBySemanticKey = await findSemanticReplay(tx, {
            subjectFrogId: normalizedInput.subjectFrogId,
            objectFrogId: normalizedInput.objectFrogId,
            attestationType: normalizedInput.attestationType,
            source: normalizedInput.source,
            evidence: normalizedInput.evidence,
          });
          if (replayBySemanticKey) {
            return {
              attestation: replayBySemanticKey,
              idempotentReplay: true,
            };
          }
        }

        throw error;
      }

      await tx.relationshipEvent.create({
        data: {
          frogId: normalizedInput.subjectFrogId,
          actorFrogId: normalizedInput.subjectFrogId,
          counterpartyFrogId: normalizedInput.objectFrogId,
          eventType: 'AttestationSubmitted',
          payload: {
            attestationId: created.id,
            subjectFrogId: normalizedInput.subjectFrogId,
            objectFrogId: normalizedInput.objectFrogId,
            attestationType: normalizedInput.attestationType,
            source: normalizedInput.source,
            status: created.status,
          },
        },
      });

      await tx.domainEvent.create({
        data: {
          frogId: normalizedInput.subjectFrogId,
          aggregateType: 'Attestation',
          aggregateId: created.id,
          eventType: 'RelationshipAttested',
          payload: {
            attestationId: created.id,
            subjectFrogId: created.subjectFrogId,
            objectFrogId: created.objectFrogId,
            attestationType: created.attestationType,
            source: created.source,
            status: created.status,
            evidence: created.evidence,
          },
          requestId: normalizedInput.requestId,
          source: 'v2.attestation.command',
        },
      });

      return {
        attestation: toRelationshipAttestationReadModel(created),
        idempotentReplay: false,
      };
    });
  }
}

export const attestationCommandServiceV2 = new AttestationCommandService();
