import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { config } from '../../config';
import { prisma } from '../../database';
import { AppError } from '../../middlewares/errorHandler';
import { V2SocialErrorCodes } from '../../types/api';
import { onchainMilestoneService } from './onchain-milestone.service';

const RELATIONSHIP_ATTESTED_MILESTONE = 'RELATIONSHIP_ATTESTED';
const DEFAULT_SOURCE = 'v2.attestation.adapter';

export interface AttestationOnchainTrace {
  attestationId: string;
  milestoneId: string;
  txHash: string | null;
  chainId: number | null;
  blockNumber: string | null;
  recordedAt: string;
}

export interface SubmitRelationshipAttestationOnchainInput {
  attestationId: string;
  requestId?: string;
  source?: string;
  force?: boolean;
}

export interface SubmitRelationshipAttestationOnchainResult {
  attestationId: string;
  status: 'CONFIRMED' | 'FAILED';
  idempotentReplay: boolean;
  trace: AttestationOnchainTrace | null;
  error?: string;
}

export interface ReplayRelationshipAttestationsInput {
  limit?: number;
  includeFailed?: boolean;
  force?: boolean;
  requestId?: string;
  source?: string;
}

export interface ReplayRelationshipAttestationsResult {
  scanned: number;
  confirmed: number;
  failed: number;
  skipped: number;
  results: SubmitRelationshipAttestationOnchainResult[];
}

const toAppErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'unknown error';
};

const normalizeAttestationId = (attestationId: string): string => {
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

const sanitizeReplayLimit = (limit?: number): number => {
  if (limit === undefined || limit === null) {
    return 20;
  }
  if (!Number.isInteger(limit) || limit <= 0 || limit > 200) {
    throw new AppError(
      400,
      'limit must be a positive integer <= 200',
      V2SocialErrorCodes.ATTESTATION_INVALID_INPUT
    );
  }
  return limit;
};

const resolveChainId = (): number | null => {
  const raw = process.env.V2_ATTESTATION_CHAIN_ID;
  if (!raw || !raw.trim()) {
    return Number.isInteger(config.CHAIN_ID) ? config.CHAIN_ID : null;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(
      500,
      'V2_ATTESTATION_CHAIN_ID is invalid',
      V2SocialErrorCodes.ATTESTATION_CHAIN_SUBMIT_FAILED
    );
  }
  return parsed;
};

const shouldForceMockFailure = (): boolean =>
  ['1', 'true', 'yes', 'on'].includes((process.env.V2_ATTESTATION_FORCE_FAIL || '').trim().toLowerCase());

const toTrace = (row: {
  id: bigint;
  attestationId: string | null;
  txHash: string | null;
  chainId: number | null;
  blockNumber: bigint | null;
  createdAt: Date;
}): AttestationOnchainTrace => ({
  attestationId: row.attestationId || '',
  milestoneId: row.id.toString(),
  txHash: row.txHash,
  chainId: row.chainId,
  blockNumber: row.blockNumber?.toString() || null,
  recordedAt: row.createdAt.toISOString(),
});

export class RelationshipAttestationOnchainAdapter {
  private async findTraceByAttestationId(attestationId: string): Promise<AttestationOnchainTrace | null> {
    const latest = await prisma.onchainMilestone.findFirst({
      where: {
        attestationId,
        milestoneType: RELATIONSHIP_ATTESTED_MILESTONE,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        attestationId: true,
        txHash: true,
        chainId: true,
        blockNumber: true,
        createdAt: true,
      },
    });

    if (!latest) {
      return null;
    }
    return toTrace(latest);
  }

  async findTraceByTxHash(txHash: string): Promise<AttestationOnchainTrace | null> {
    const normalized = txHash.trim().toLowerCase();
    if (!normalized) {
      throw new AppError(
        400,
        'txHash is required',
        V2SocialErrorCodes.ATTESTATION_INVALID_INPUT
      );
    }

    const latest = await prisma.onchainMilestone.findFirst({
      where: {
        txHash: normalized,
        milestoneType: RELATIONSHIP_ATTESTED_MILESTONE,
        attestationId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        attestationId: true,
        txHash: true,
        chainId: true,
        blockNumber: true,
        createdAt: true,
      },
    });

    if (!latest || !latest.attestationId) {
      return null;
    }
    return toTrace(latest);
  }

  private async markAttestationFailed(input: {
    attestationId: string;
    frogId: number;
    reason: string;
    requestId?: string;
    source?: string;
  }): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.relationshipAttestation.update({
        where: { id: input.attestationId },
        data: { status: 'FAILED' },
      });
      await tx.domainEvent.create({
        data: {
          frogId: input.frogId,
          aggregateType: 'Attestation',
          aggregateId: input.attestationId,
          eventType: 'RelationshipAttestationOnchainFailed',
          payload: {
            attestationId: input.attestationId,
            reason: input.reason,
          } as Prisma.InputJsonValue,
          requestId: input.requestId,
          source: input.source || DEFAULT_SOURCE,
        },
      });
    });
  }

  private async submitToMockChain(attestation: {
    id: string;
    subjectFrogId: number;
    objectFrogId: number;
    attestationType: string;
    source: string;
  }): Promise<{
    txHash: string;
    chainId: number | null;
    blockNumber: bigint | null;
    adapterMode: string;
    payload: Prisma.InputJsonValue;
  }> {
    if (shouldForceMockFailure()) {
      throw new Error('forced failure by V2_ATTESTATION_FORCE_FAIL');
    }

    const txHash = `0x${randomBytes(32).toString('hex')}`;
    const chainId = resolveChainId();
    const blockNumber = BigInt(Math.floor(Date.now() / 1000));
    const adapterMode = (process.env.V2_ATTESTATION_CHAIN_MODE || 'mock').trim() || 'mock';

    return {
      txHash,
      chainId,
      blockNumber,
      adapterMode,
      payload: {
        attestationId: attestation.id,
        subjectFrogId: attestation.subjectFrogId,
        objectFrogId: attestation.objectFrogId,
        attestationType: attestation.attestationType,
        source: attestation.source,
        adapterMode,
        submittedAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    };
  }

  async submitByAttestationId(
    input: SubmitRelationshipAttestationOnchainInput
  ): Promise<SubmitRelationshipAttestationOnchainResult> {
    const attestationId = normalizeAttestationId(input.attestationId);
    const source = input.source || DEFAULT_SOURCE;

    const attestation = await prisma.relationshipAttestation.findUnique({
      where: { id: attestationId },
      select: {
        id: true,
        subjectFrogId: true,
        objectFrogId: true,
        attestationType: true,
        source: true,
        status: true,
        evidence: true,
      },
    });

    if (!attestation) {
      throw new AppError(404, 'Attestation not found', V2SocialErrorCodes.ATTESTATION_NOT_FOUND);
    }

    const existingTrace = await this.findTraceByAttestationId(attestationId);
    if (existingTrace) {
      if (attestation.status !== 'CONFIRMED') {
        await prisma.relationshipAttestation.update({
          where: { id: attestationId },
          data: { status: 'CONFIRMED' },
        });
      }
      return {
        attestationId,
        status: 'CONFIRMED',
        idempotentReplay: true,
        trace: existingTrace,
      };
    }

    if (!input.force && !['QUEUED', 'FAILED'].includes(attestation.status)) {
      throw new AppError(
        409,
        `attestation status ${attestation.status} cannot be submitted on-chain`,
        V2SocialErrorCodes.ATTESTATION_CHAIN_SUBMIT_FAILED
      );
    }

    try {
      const chainResult = await this.submitToMockChain(attestation);

      await prisma.$transaction(async (tx) => {
        await tx.relationshipAttestation.update({
          where: { id: attestation.id },
          data: { status: 'CONFIRMED' },
        });

        const milestone = await onchainMilestoneService.record(
          {
            frogId: attestation.subjectFrogId,
            attestationId: attestation.id,
            milestoneType: RELATIONSHIP_ATTESTED_MILESTONE,
            chainId: chainResult.chainId,
            txHash: chainResult.txHash,
            blockNumber: chainResult.blockNumber,
            payload: chainResult.payload,
          },
          {
            tx,
            requestId: input.requestId,
            source,
          }
        );

        await tx.domainEvent.create({
          data: {
            frogId: attestation.subjectFrogId,
            aggregateType: 'Attestation',
            aggregateId: attestation.id,
            eventType: 'RelationshipAttestationOnchainConfirmed',
            payload: {
              attestationId: attestation.id,
              txHash: chainResult.txHash,
              chainId: chainResult.chainId,
              blockNumber: chainResult.blockNumber?.toString() || null,
              milestoneId: milestone.id,
              adapterMode: chainResult.adapterMode,
            } as Prisma.InputJsonValue,
            requestId: input.requestId,
            source,
          },
        });
      });

      const trace = await this.findTraceByAttestationId(attestation.id);
      return {
        attestationId: attestation.id,
        status: 'CONFIRMED',
        idempotentReplay: false,
        trace,
      };
    } catch (error) {
      const reason = toAppErrorMessage(error);
      await this.markAttestationFailed({
        attestationId: attestation.id,
        frogId: attestation.subjectFrogId,
        reason,
        requestId: input.requestId,
        source,
      });
      throw new AppError(
        502,
        `Failed to submit attestation on-chain: ${reason}`,
        V2SocialErrorCodes.ATTESTATION_CHAIN_SUBMIT_FAILED
      );
    }
  }

  async replayPendingAttestations(
    input: ReplayRelationshipAttestationsInput = {}
  ): Promise<ReplayRelationshipAttestationsResult> {
    const limit = sanitizeReplayLimit(input.limit);
    const source = input.source || `${DEFAULT_SOURCE}.replay`;
    const statuses = input.includeFailed ? ['QUEUED', 'FAILED'] : ['QUEUED'];

    const candidates = await prisma.relationshipAttestation.findMany({
      where: {
        status: {
          in: statuses,
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { id: true },
    });

    const results: SubmitRelationshipAttestationOnchainResult[] = [];
    let confirmed = 0;
    let failed = 0;
    let skipped = 0;

    for (const candidate of candidates) {
      try {
        const result = await this.submitByAttestationId({
          attestationId: candidate.id,
          requestId: input.requestId,
          source,
          force: input.force,
        });
        if (result.idempotentReplay) {
          skipped += 1;
        } else {
          confirmed += 1;
        }
        results.push(result);
      } catch (error) {
        failed += 1;
        results.push({
          attestationId: candidate.id,
          status: 'FAILED',
          idempotentReplay: false,
          trace: null,
          error: toAppErrorMessage(error),
        });
      }
    }

    return {
      scanned: candidates.length,
      confirmed,
      failed,
      skipped,
      results,
    };
  }
}

export const relationshipAttestationOnchainAdapter = new RelationshipAttestationOnchainAdapter();
