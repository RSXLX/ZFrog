import { Router } from 'express';
import { authRequired } from '../../../middlewares/auth.middleware';
import { AppError, asyncHandler } from '../../../middlewares/errorHandler';
import { createV2WriteRateLimiter } from '../../../middlewares/rateLimit.middleware';
import { getV2SocialRolloutStatus, v2SocialRolloutGuard } from '../../../middlewares/v2-social-rollout.middleware';
import { attestationCommandServiceV2 } from '../../../modules/social/attestation.command';
import { attestationQueryServiceV2 } from '../../../modules/social/attestation.query';
import { relationshipAttestationOnchainAdapter } from '../../../modules/web3/attestation-onchain.adapter';
import { respondError, respondSuccess } from '../../response';
import { V2SocialErrorCodes } from '../../../types/api';
import {
  isPlainObject,
  parseOptionalTrimmedString,
  parsePositiveInt,
} from './contract';

const router: Router = Router();

const parseEnvPositiveInt = (raw: string | undefined, fallback: number): number => {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const attestationCreateRateLimiter = createV2WriteRateLimiter({
  windowMs: parseEnvPositiveInt(process.env.V2_ATTESTATION_WRITE_RATE_LIMIT_WINDOW_MS, 60_000),
  max: parseEnvPositiveInt(process.env.V2_ATTESTATION_WRITE_RATE_LIMIT_MAX, 30),
  code: V2SocialErrorCodes.ATTESTATION_RATE_LIMITED,
  message: 'Too many attestation write requests',
});

const attestationOnchainSubmitRateLimiter = createV2WriteRateLimiter({
  windowMs: parseEnvPositiveInt(process.env.V2_ATTESTATION_ONCHAIN_RATE_LIMIT_WINDOW_MS, 60_000),
  max: parseEnvPositiveInt(process.env.V2_ATTESTATION_ONCHAIN_RATE_LIMIT_MAX, 20),
  code: V2SocialErrorCodes.ATTESTATION_RATE_LIMITED,
  message: 'Too many attestation onchain submit requests',
});

router.get('/status', (req, res) =>
  respondSuccess(req, res, {
    module: 'v2-attestations',
    status: 'ready',
    mode: 'db-read-write',
    nextIssue: 'V2-W8-02',
    rollout: getV2SocialRolloutStatus(req),
  })
);

const getAuthWallet = (req: Express.Request): string => {
  const walletAddress = req.user?.walletAddress || req.user?.address;
  if (!walletAddress) {
    throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  }
  return walletAddress;
};

const parseNonNegativeInt = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
};

router.post(
  '/relationship',
  authRequired,
  v2SocialRolloutGuard,
  attestationCreateRateLimiter,
  asyncHandler(async (req, res) => {
    const subjectFrogId = parsePositiveInt(req.body?.subjectFrogId);
    const objectFrogId = parsePositiveInt(req.body?.objectFrogId);
    const attestationType = parseOptionalTrimmedString(req.body?.attestationType);
    const source = parseOptionalTrimmedString(req.body?.source) || 'v2-social';
    const idempotencyKey = parseOptionalTrimmedString(req.body?.idempotencyKey);
    const evidence = req.body?.evidence as unknown;

    if (!subjectFrogId || !objectFrogId || !attestationType) {
      return respondError(
        req,
        res,
        400,
        V2SocialErrorCodes.ATTESTATION_INVALID_INPUT,
        'subjectFrogId, objectFrogId and attestationType are required'
      );
    }
    if (subjectFrogId === objectFrogId) {
      return respondError(
        req,
        res,
        400,
        V2SocialErrorCodes.ATTESTATION_INVALID_INPUT,
        'subjectFrogId and objectFrogId must be different'
      );
    }
    if (evidence !== undefined && !isPlainObject(evidence)) {
      return respondError(
        req,
        res,
        400,
        V2SocialErrorCodes.ATTESTATION_INVALID_INPUT,
        'evidence must be an object when provided'
      );
    }

    const result = await attestationCommandServiceV2.createRelationshipAttestation({
      subjectFrogId,
      objectFrogId,
      attestationType,
      source,
      evidence,
      ...(idempotencyKey ? { idempotencyKey } : {}),
      walletAddress: getAuthWallet(req),
      requestId: req.requestId,
    });

    return respondSuccess(
      req,
      res,
      {
        ...result.attestation,
        idempotentReplay: result.idempotentReplay,
      },
      result.idempotentReplay ? 200 : 201
    );
  })
);

router.post(
  '/relationship/:attestationId/submit-onchain',
  authRequired,
  v2SocialRolloutGuard,
  attestationOnchainSubmitRateLimiter,
  asyncHandler(async (req, res) => {
    const attestationId = parseOptionalTrimmedString(req.params?.attestationId);
    if (!attestationId) {
      return respondError(
        req,
        res,
        400,
        V2SocialErrorCodes.ATTESTATION_INVALID_INPUT,
        'attestationId is required'
      );
    }

    const walletAddress = getAuthWallet(req).toLowerCase();
    const attestation = await attestationQueryServiceV2.getById({
      attestationId,
      walletAddress,
    });
    if (attestation.createdByAddress !== walletAddress) {
      return respondError(
        req,
        res,
        403,
        V2SocialErrorCodes.ATTESTATION_PERMISSION_DENIED,
        'walletAddress cannot submit this attestation on-chain'
      );
    }

    const result = await relationshipAttestationOnchainAdapter.submitByAttestationId({
      attestationId,
      requestId: req.requestId,
      source: 'api.v2.attestations.submit-onchain',
      force: req.body?.force === true,
    });

    return respondSuccess(req, res, result, result.idempotentReplay ? 200 : 202);
  })
);

router.get(
  '/relationship',
  authRequired,
  v2SocialRolloutGuard,
  asyncHandler(async (req, res) => {
    const subjectFrogIdRaw = Array.isArray(req.query?.subjectFrogId)
      ? req.query.subjectFrogId[0]
      : req.query?.subjectFrogId;
    const objectFrogIdRaw = Array.isArray(req.query?.objectFrogId)
      ? req.query.objectFrogId[0]
      : req.query?.objectFrogId;
    const limitRaw = Array.isArray(req.query?.limit) ? req.query.limit[0] : req.query?.limit;
    const offsetRaw = Array.isArray(req.query?.offset) ? req.query.offset[0] : req.query?.offset;

    const subjectFrogId = subjectFrogIdRaw === undefined ? undefined : parsePositiveInt(subjectFrogIdRaw);
    const objectFrogId = objectFrogIdRaw === undefined ? undefined : parsePositiveInt(objectFrogIdRaw);
    const limit = limitRaw === undefined ? undefined : parsePositiveInt(limitRaw);
    const offset = offsetRaw === undefined ? undefined : parseNonNegativeInt(offsetRaw);
    const attestationType = parseOptionalTrimmedString(req.query?.attestationType);
    const status = parseOptionalTrimmedString(req.query?.status);

    if (subjectFrogIdRaw !== undefined && !subjectFrogId) {
      return respondError(
        req,
        res,
        400,
        V2SocialErrorCodes.ATTESTATION_INVALID_INPUT,
        'subjectFrogId must be a positive integer'
      );
    }
    if (objectFrogIdRaw !== undefined && !objectFrogId) {
      return respondError(
        req,
        res,
        400,
        V2SocialErrorCodes.ATTESTATION_INVALID_INPUT,
        'objectFrogId must be a positive integer'
      );
    }
    if (limitRaw !== undefined && !limit) {
      return respondError(
        req,
        res,
        400,
        V2SocialErrorCodes.ATTESTATION_INVALID_INPUT,
        'limit must be a positive integer'
      );
    }
    if (offsetRaw !== undefined && offset === null) {
      return respondError(
        req,
        res,
        400,
        V2SocialErrorCodes.ATTESTATION_INVALID_INPUT,
        'offset must be a non-negative integer'
      );
    }

    const payload = await attestationQueryServiceV2.list({
      ...(subjectFrogId ? { subjectFrogId } : {}),
      ...(objectFrogId ? { objectFrogId } : {}),
      ...(attestationType ? { attestationType } : {}),
      ...(status ? { status } : {}),
      ...(limit ? { limit } : {}),
      ...(typeof offset === 'number' ? { offset } : {}),
      walletAddress: getAuthWallet(req),
    });

    return respondSuccess(req, res, payload);
  })
);

router.get(
  '/relationship/:attestationId',
  authRequired,
  v2SocialRolloutGuard,
  asyncHandler(async (req, res) => {
    const walletAddress = getAuthWallet(req);
    const attestation = await attestationQueryServiceV2.getById({
      attestationId: req.params.attestationId,
      walletAddress,
    });
    return respondSuccess(req, res, attestation);
  })
);

export default router;
