export const V3_CREATOR_ASSET_TYPES = ['IMAGE', 'AUDIO', 'MODEL', 'TEXTURE', 'SCRIPT'] as const;
export const V3_CREATOR_ASSET_STATUSES = ['READY', 'REJECTED'] as const;
export const V3_CREATOR_PACK_STATUSES = ['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED'] as const;
export const V3_CREATOR_PACK_PREVIEW_STATES = ['READY', 'NEEDS_REVIEW'] as const;
export const V3_CREATOR_LICENSE_BINDING_STATUSES = ['BOUND', 'ANCHORED', 'FAILED'] as const;

export type V3CreatorAssetType = (typeof V3_CREATOR_ASSET_TYPES)[number];
export type V3CreatorAssetStatus = (typeof V3_CREATOR_ASSET_STATUSES)[number];
export type V3CreatorPackStatus = (typeof V3_CREATOR_PACK_STATUSES)[number];
export type V3CreatorPackPreviewState = (typeof V3_CREATOR_PACK_PREVIEW_STATES)[number];
export type V3CreatorLicenseBindingStatus = (typeof V3_CREATOR_LICENSE_BINDING_STATUSES)[number];

export interface V3CreatorAssetReadModel {
  id: string;
  creatorAppId: string;
  type: V3CreatorAssetType;
  mimeType: string;
  sourceUrl: string;
  checksum: string;
  bytes: number;
  status: V3CreatorAssetStatus;
  metadata: Record<string, unknown> | null;
  preview: {
    validatorVersion: string;
    acceptedMimeTypes: string[];
    maxBytes: number;
    checksumAlgorithm: 'sha256';
  };
  createdAt: string;
  updatedAt: string;
  audit: {
    createdByKeyId: string;
    createdByActor: string;
    requestId: string | null;
  };
}

export interface V3CreatorAssetListReadModel {
  total: number;
  items: V3CreatorAssetReadModel[];
}

export interface V3CreatorPackReadModel {
  id: string;
  creatorAppId: string;
  slug: string;
  title: string;
  summary: string | null;
  status: V3CreatorPackStatus;
  previewState: V3CreatorPackPreviewState;
  assetIds: string[];
  assetCount: number;
  createdAt: string;
  updatedAt: string;
  audit: {
    createdByKeyId: string;
    createdByActor: string;
    requestId: string | null;
  };
}

export interface V3CreatorPackListReadModel {
  total: number;
  items: V3CreatorPackReadModel[];
}

export interface V3CreatorLicenseBindingReadModel {
  id: string;
  assetId: string;
  creatorAppId: string;
  checksum: string;
  ownerWallet: string;
  issuedAt: string;
  anchorDigest: string;
  status: V3CreatorLicenseBindingStatus;
  replayCount: number;
  lastError: string | null;
  anchoredAt: string | null;
  createdAt: string;
  updatedAt: string;
  audit: {
    createdByKeyId: string;
    createdByActor: string;
    requestId: string | null;
    lastReplayedByActor: string | null;
  };
  onchain: {
    required: boolean;
    enabled: boolean;
    anchored: boolean;
    mode: string;
    anchorId: string | null;
    chainId: number | null;
    txHash: string | null;
    blockNumber: string | null;
  };
}

export interface V3CreatorLicenseBindingListReadModel {
  total: number;
  items: V3CreatorLicenseBindingReadModel[];
}

export interface V3CreatorLicenseAnchorMutationResult {
  binding: V3CreatorLicenseBindingReadModel;
  idempotentReplay: boolean;
  replayed: boolean;
}

export interface V3CreatorCreateAssetPayload {
  type: V3CreatorAssetType;
  mimeType: string;
  sourceUrl: string;
  checksum: string;
  bytes: number;
  metadata?: Record<string, unknown>;
}

export interface V3CreatorCreatePackPayload {
  slug: string;
  title: string;
  summary?: string;
  assetIds: string[];
}

export interface V3CreatorCreateLicenseAnchorPayload {
  ownerWallet: string;
  issuedAt: string;
}

export interface V3CreatorReplayLicenseAnchorPayload {
  force?: boolean;
}
