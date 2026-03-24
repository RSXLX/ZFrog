import { z } from 'zod';
import {
  V3_CREATOR_ASSET_STATUSES,
  V3_CREATOR_ASSET_TYPES,
  V3_CREATOR_LICENSE_BINDING_STATUSES,
  V3_CREATOR_PACK_PREVIEW_STATES,
  V3_CREATOR_PACK_STATUSES,
} from '../types/creator';

const creatorAppIdSchema = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9_:-]{3,64}$/i);

const creatorAssetIdSchema = z.string().trim().regex(/^cas_[a-z0-9]+$/);
const creatorPackIdSchema = z.string().trim().regex(/^cpk_[a-z0-9]+$/);
const creatorLicenseBindingIdSchema = z.string().trim().regex(/^cab_[a-z0-9]+$/);

export const v3CreatorAssetTypeSchema = z.enum(V3_CREATOR_ASSET_TYPES);
export const v3CreatorAssetStatusSchema = z.enum(V3_CREATOR_ASSET_STATUSES);
export const v3CreatorPackStatusSchema = z.enum(V3_CREATOR_PACK_STATUSES);
export const v3CreatorPackPreviewStateSchema = z.enum(V3_CREATOR_PACK_PREVIEW_STATES);
export const v3CreatorLicenseBindingStatusSchema = z.enum(V3_CREATOR_LICENSE_BINDING_STATUSES);

export const v3CreatorAssetReadModelSchema = z.object({
  id: creatorAssetIdSchema,
  creatorAppId: creatorAppIdSchema,
  type: v3CreatorAssetTypeSchema,
  mimeType: z.string().min(1),
  sourceUrl: z.string().url(),
  checksum: z.string().regex(/^[a-f0-9]{16,128}$/i),
  bytes: z.number().int().positive(),
  status: v3CreatorAssetStatusSchema,
  metadata: z.record(z.unknown()).nullable(),
  preview: z.object({
    validatorVersion: z.string().min(1),
    acceptedMimeTypes: z.array(z.string().min(1)).min(1),
    maxBytes: z.number().int().positive(),
    checksumAlgorithm: z.literal('sha256'),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  audit: z.object({
    createdByKeyId: z.string().min(1),
    createdByActor: z.string().min(1),
    requestId: z.string().nullable(),
  }),
});

export const v3CreatorAssetListReadModelSchema = z.object({
  total: z.number().int().nonnegative(),
  items: z.array(v3CreatorAssetReadModelSchema),
});

export const v3CreatorPackReadModelSchema = z.object({
  id: creatorPackIdSchema,
  creatorAppId: creatorAppIdSchema,
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1),
  summary: z.string().nullable(),
  status: v3CreatorPackStatusSchema,
  previewState: v3CreatorPackPreviewStateSchema,
  assetIds: z.array(creatorAssetIdSchema),
  assetCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  audit: z.object({
    createdByKeyId: z.string().min(1),
    createdByActor: z.string().min(1),
    requestId: z.string().nullable(),
  }),
});

export const v3CreatorPackListReadModelSchema = z.object({
  total: z.number().int().nonnegative(),
  items: z.array(v3CreatorPackReadModelSchema),
});

export const v3CreatorLicenseBindingReadModelSchema = z.object({
  id: creatorLicenseBindingIdSchema,
  assetId: creatorAssetIdSchema,
  creatorAppId: creatorAppIdSchema,
  checksum: z.string().regex(/^[a-f0-9]{16,128}$/i),
  ownerWallet: z.string().regex(/^0x[a-f0-9]{40}$/i),
  issuedAt: z.string().datetime(),
  anchorDigest: z.string().regex(/^[a-f0-9]{64}$/i),
  status: v3CreatorLicenseBindingStatusSchema,
  replayCount: z.number().int().nonnegative(),
  lastError: z.string().nullable(),
  anchoredAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  audit: z.object({
    createdByKeyId: z.string().min(1),
    createdByActor: z.string().min(1),
    requestId: z.string().nullable(),
    lastReplayedByActor: z.string().nullable(),
  }),
  onchain: z.object({
    required: z.boolean(),
    enabled: z.boolean(),
    anchored: z.boolean(),
    mode: z.string().min(1),
    anchorId: z.string().nullable(),
    chainId: z.number().int().positive().nullable(),
    txHash: z.string().nullable(),
    blockNumber: z.string().nullable(),
  }),
});

export const v3CreatorLicenseBindingListReadModelSchema = z.object({
  total: z.number().int().nonnegative(),
  items: z.array(v3CreatorLicenseBindingReadModelSchema),
});

export const v3CreatorLicenseAnchorMutationResultSchema = z.object({
  binding: v3CreatorLicenseBindingReadModelSchema,
  idempotentReplay: z.boolean(),
  replayed: z.boolean(),
});

export const v3CreatorCreateAssetPayloadSchema = z
  .object({
    type: v3CreatorAssetTypeSchema,
    mimeType: z.string().trim().min(1).max(120),
    sourceUrl: z.string().trim().url().max(512),
    checksum: z.string().trim().regex(/^[a-f0-9]{16,128}$/i),
    bytes: z.number().int().positive(),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict();

export const v3CreatorCreatePackPayloadSchema = z
  .object({
    slug: z.string().trim().min(1).max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().trim().min(1).max(120),
    summary: z.string().trim().max(500).optional(),
    assetIds: z.array(creatorAssetIdSchema).min(1).max(24),
  })
  .strict();

export const v3CreatorCreateLicenseAnchorPayloadSchema = z
  .object({
    ownerWallet: z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/),
    issuedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export const v3CreatorReplayLicenseAnchorPayloadSchema = z
  .object({
    force: z.boolean().optional(),
  })
  .strict();
