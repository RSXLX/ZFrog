import { RelationshipAttestation } from '@prisma/client';
import { AppError } from '../../middlewares/errorHandler';
import { V2SocialErrorCodes } from '../../types/api';

export const ATTESTATION_STATUS_VALUES = ['QUEUED', 'CONFIRMED', 'FAILED'] as const;
export type AttestationStatus = (typeof ATTESTATION_STATUS_VALUES)[number];

export interface RelationshipAttestationReadModel {
  id: string;
  subjectFrogId: number;
  objectFrogId: number;
  attestationType: string;
  source: string;
  evidence: Record<string, unknown> | null;
  status: AttestationStatus;
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const sanitizeAttestationType = (attestationType?: string): string => {
  const normalized = (attestationType || '').trim();
  if (!normalized) {
    throw new AppError(
      400,
      'attestationType is required',
      V2SocialErrorCodes.ATTESTATION_INVALID_INPUT
    );
  }
  if (normalized.length > 64) {
    throw new AppError(
      400,
      'attestationType must be <= 64 characters',
      V2SocialErrorCodes.ATTESTATION_INVALID_INPUT
    );
  }
  return normalized;
};

export const sanitizeAttestationSource = (source?: string): string => {
  const normalized = (source || '').trim();
  if (!normalized) {
    return 'v2-social';
  }
  if (normalized.length > 64) {
    throw new AppError(
      400,
      'source must be <= 64 characters',
      V2SocialErrorCodes.ATTESTATION_INVALID_INPUT
    );
  }
  return normalized;
};

export const sanitizeAttestationEvidence = (
  evidence?: unknown
): Record<string, unknown> | null => {
  if (evidence === undefined || evidence === null) {
    return null;
  }
  if (!isRecord(evidence)) {
    throw new AppError(
      400,
      'evidence must be an object when provided',
      V2SocialErrorCodes.ATTESTATION_INVALID_INPUT
    );
  }
  return evidence;
};

export const sanitizeAttestationIdempotencyKey = (idempotencyKey?: string): string | null => {
  if (!idempotencyKey) {
    return null;
  }
  const normalized = idempotencyKey.trim();
  if (!normalized) {
    return null;
  }
  if (normalized.length > 128) {
    throw new AppError(
      400,
      'idempotencyKey must be <= 128 characters',
      V2SocialErrorCodes.ATTESTATION_INVALID_INPUT
    );
  }
  return normalized;
};

export const sanitizeAttestationStatus = (status?: string): AttestationStatus | undefined => {
  if (!status) {
    return undefined;
  }
  const normalized = status.trim().toUpperCase();
  if (!ATTESTATION_STATUS_VALUES.includes(normalized as AttestationStatus)) {
    throw new AppError(
      400,
      'status must be one of QUEUED/CONFIRMED/FAILED',
      V2SocialErrorCodes.ATTESTATION_INVALID_INPUT
    );
  }
  return normalized as AttestationStatus;
};

export const sanitizeAttestationPageLimit = (limit?: number): number => {
  if (limit === undefined || limit === null) {
    return 20;
  }
  if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
    throw new AppError(
      400,
      'limit must be a positive integer <= 100',
      V2SocialErrorCodes.ATTESTATION_INVALID_INPUT
    );
  }
  return limit;
};

export const sanitizeAttestationPageOffset = (offset?: number): number => {
  if (offset === undefined || offset === null) {
    return 0;
  }
  if (!Number.isInteger(offset) || offset < 0) {
    throw new AppError(
      400,
      'offset must be a non-negative integer',
      V2SocialErrorCodes.ATTESTATION_INVALID_INPUT
    );
  }
  return offset;
};

export const toRelationshipAttestationReadModel = (
  attestation: RelationshipAttestation,
  latestOnchainMilestone?: {
    id: bigint;
    txHash: string | null;
    chainId: number | null;
    blockNumber: bigint | null;
    createdAt: Date;
  } | null
): RelationshipAttestationReadModel => ({
  id: attestation.id,
  subjectFrogId: attestation.subjectFrogId,
  objectFrogId: attestation.objectFrogId,
  attestationType: attestation.attestationType,
  source: attestation.source,
  evidence: isRecord(attestation.evidence) ? attestation.evidence : null,
  status: (ATTESTATION_STATUS_VALUES.includes(attestation.status as AttestationStatus)
    ? attestation.status
    : 'QUEUED') as AttestationStatus,
  idempotencyKey: attestation.idempotencyKey,
  createdByAddress: attestation.createdByAddress.toLowerCase(),
  onchainTrace: latestOnchainMilestone
    ? {
        milestoneId: latestOnchainMilestone.id.toString(),
        txHash: latestOnchainMilestone.txHash,
        chainId: latestOnchainMilestone.chainId,
        blockNumber: latestOnchainMilestone.blockNumber?.toString() || null,
        recordedAt: latestOnchainMilestone.createdAt.toISOString(),
      }
    : null,
  createdAt: attestation.createdAt.toISOString(),
  updatedAt: attestation.updatedAt.toISOString(),
});
