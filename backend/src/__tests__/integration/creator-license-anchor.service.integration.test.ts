import { AppError } from '../../middlewares/errorHandler';
import {
  type CreatorAssetReadModel,
  type CreatorPipelineService,
} from '../../modules/creator/creator-pipeline.service';
import { CreatorLicenseAnchorService } from '../../modules/creator-onchain/creator-license-anchor.service';

const createMockCreatorPipelineService = (
  seedAssets: Record<string, CreatorAssetReadModel>
): CreatorPipelineService => {
  return {
    getAssetById: jest.fn(async ({ assetId, scopeAppId }: { assetId: string; scopeAppId?: string }) => {
      const asset = seedAssets[assetId];
      if (!asset) {
        throw new AppError(404, 'creator asset not found', 'NOT_FOUND', {
          assetId,
        });
      }
      if (scopeAppId && asset.creatorAppId !== scopeAppId) {
        throw new AppError(404, 'creator asset not found', 'NOT_FOUND', {
          assetId,
        });
      }
      return asset;
    }),
  } as unknown as CreatorPipelineService;
};

describe('CreatorLicenseAnchorService Integration', () => {
  const issuedAtForTest = (offsetMs = -60_000): string => new Date(Date.now() + offsetMs).toISOString();

  const originalEnv = {
    V3_CREATOR_STORAGE_MODE: process.env.V3_CREATOR_STORAGE_MODE,
    V3_CREATOR_ONCHAIN_STORAGE_MODE: process.env.V3_CREATOR_ONCHAIN_STORAGE_MODE,
    V3_CREATOR_LICENSE_ANCHOR_ENABLED: process.env.V3_CREATOR_LICENSE_ANCHOR_ENABLED,
    V3_CREATOR_LICENSE_ONCHAIN_ENABLED: process.env.V3_CREATOR_LICENSE_ONCHAIN_ENABLED,
    V3_CREATOR_LICENSE_ONCHAIN_REQUIRED: process.env.V3_CREATOR_LICENSE_ONCHAIN_REQUIRED,
    V3_CREATOR_LICENSE_FORCE_FAIL: process.env.V3_CREATOR_LICENSE_FORCE_FAIL,
  };

  beforeEach(() => {
    process.env.V3_CREATOR_STORAGE_MODE = 'memory';
    process.env.V3_CREATOR_ONCHAIN_STORAGE_MODE = 'memory';
    process.env.V3_CREATOR_LICENSE_ANCHOR_ENABLED = 'true';
    process.env.V3_CREATOR_LICENSE_ONCHAIN_ENABLED = 'true';
    process.env.V3_CREATOR_LICENSE_ONCHAIN_REQUIRED = 'false';
    process.env.V3_CREATOR_LICENSE_FORCE_FAIL = 'false';
  });

  afterAll(() => {
    process.env.V3_CREATOR_STORAGE_MODE = originalEnv.V3_CREATOR_STORAGE_MODE;
    process.env.V3_CREATOR_ONCHAIN_STORAGE_MODE = originalEnv.V3_CREATOR_ONCHAIN_STORAGE_MODE;
    process.env.V3_CREATOR_LICENSE_ANCHOR_ENABLED = originalEnv.V3_CREATOR_LICENSE_ANCHOR_ENABLED;
    process.env.V3_CREATOR_LICENSE_ONCHAIN_ENABLED = originalEnv.V3_CREATOR_LICENSE_ONCHAIN_ENABLED;
    process.env.V3_CREATOR_LICENSE_ONCHAIN_REQUIRED = originalEnv.V3_CREATOR_LICENSE_ONCHAIN_REQUIRED;
    process.env.V3_CREATOR_LICENSE_FORCE_FAIL = originalEnv.V3_CREATOR_LICENSE_FORCE_FAIL;
  });

  it('creates idempotent anchored binding for the same asset checksum owner issuedAt tuple', async () => {
    const issuedAt = issuedAtForTest();
    const service = new CreatorLicenseAnchorService({
      creatorPipelineService: createMockCreatorPipelineService({
        cas_001: {
          id: 'cas_001',
          creatorAppId: 'int_creator',
          type: 'IMAGE',
          mimeType: 'image/png',
          sourceUrl: 'https://cdn.example.com/assets/a.png',
          checksum: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          bytes: 1024,
          status: 'READY',
          metadata: null,
          preview: {
            validatorVersion: 'v3-creator-preview-v1',
            acceptedMimeTypes: ['image/png'],
            maxBytes: 8 * 1024 * 1024,
            checksumAlgorithm: 'sha256',
          },
          createdAt: '2026-03-24T00:00:00.000Z',
          updatedAt: '2026-03-24T00:00:00.000Z',
          audit: {
            createdByKeyId: 'ikey_001',
            createdByActor: 'creator:ikey_001',
            requestId: null,
          },
        },
      }),
    });

    const first = await service.createBinding({
      assetId: 'cas_001',
      ownerWallet: '0xabc0000000000000000000000000000000000001',
      issuedAt,
      requestedBy: {
        appId: 'int_creator',
        keyId: 'ikey_001',
        actor: 'creator:ikey_001',
      },
    });

    expect(first.binding.status).toBe('ANCHORED');
    expect(first.idempotentReplay).toBe(false);

    const second = await service.createBinding({
      assetId: 'cas_001',
      ownerWallet: '0xabc0000000000000000000000000000000000001',
      issuedAt,
      requestedBy: {
        appId: 'int_creator',
        keyId: 'ikey_001',
        actor: 'creator:ikey_001',
      },
    });

    expect(second.binding.id).toBe(first.binding.id);
    expect(second.idempotentReplay).toBe(true);
    expect(second.replayed).toBe(false);
  });

  it('marks failed anchor then replays to anchored after failure is cleared', async () => {
    const issuedAt = issuedAtForTest();
    process.env.V3_CREATOR_LICENSE_FORCE_FAIL = 'true';

    const service = new CreatorLicenseAnchorService({
      creatorPipelineService: createMockCreatorPipelineService({
        cas_002: {
          id: 'cas_002',
          creatorAppId: 'int_creator',
          type: 'IMAGE',
          mimeType: 'image/png',
          sourceUrl: 'https://cdn.example.com/assets/b.png',
          checksum: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          bytes: 1024,
          status: 'READY',
          metadata: null,
          preview: {
            validatorVersion: 'v3-creator-preview-v1',
            acceptedMimeTypes: ['image/png'],
            maxBytes: 8 * 1024 * 1024,
            checksumAlgorithm: 'sha256',
          },
          createdAt: '2026-03-24T00:00:00.000Z',
          updatedAt: '2026-03-24T00:00:00.000Z',
          audit: {
            createdByKeyId: 'ikey_002',
            createdByActor: 'creator:ikey_002',
            requestId: null,
          },
        },
      }),
    });

    const failed = await service.createBinding({
      assetId: 'cas_002',
      ownerWallet: '0xabc0000000000000000000000000000000000001',
      issuedAt,
      requestedBy: {
        appId: 'int_creator',
        keyId: 'ikey_002',
        actor: 'creator:ikey_002',
      },
    });

    expect(failed.binding.status).toBe('FAILED');
    expect(failed.binding.lastError).toBeTruthy();

    process.env.V3_CREATOR_LICENSE_FORCE_FAIL = 'false';

    const replayed = await service.replayBinding({
      bindingId: failed.binding.id,
      scopeAppId: 'int_creator',
      requestedBy: {
        actor: 'creator:ikey_002',
      },
    });

    expect(replayed.binding.status).toBe('ANCHORED');
    expect(replayed.binding.replayCount).toBe(1);
    expect(replayed.replayed).toBe(true);
  });

  it('falls back to db binding when onchain is disabled and not required', async () => {
    const issuedAt = issuedAtForTest();
    process.env.V3_CREATOR_LICENSE_ONCHAIN_ENABLED = 'false';

    const service = new CreatorLicenseAnchorService({
      creatorPipelineService: createMockCreatorPipelineService({
        cas_003: {
          id: 'cas_003',
          creatorAppId: 'int_creator',
          type: 'IMAGE',
          mimeType: 'image/png',
          sourceUrl: 'https://cdn.example.com/assets/c.png',
          checksum: 'cccccccccccccccccccccccccccccccc',
          bytes: 1024,
          status: 'READY',
          metadata: null,
          preview: {
            validatorVersion: 'v3-creator-preview-v1',
            acceptedMimeTypes: ['image/png'],
            maxBytes: 8 * 1024 * 1024,
            checksumAlgorithm: 'sha256',
          },
          createdAt: '2026-03-24T00:00:00.000Z',
          updatedAt: '2026-03-24T00:00:00.000Z',
          audit: {
            createdByKeyId: 'ikey_003',
            createdByActor: 'creator:ikey_003',
            requestId: null,
          },
        },
      }),
    });

    const created = await service.createBinding({
      assetId: 'cas_003',
      ownerWallet: '0xabc0000000000000000000000000000000000001',
      issuedAt,
      requestedBy: {
        appId: 'int_creator',
        keyId: 'ikey_003',
        actor: 'creator:ikey_003',
      },
    });

    expect(created.binding.status).toBe('BOUND');
    expect(created.binding.onchain.anchored).toBe(false);
    expect(created.binding.onchain.mode).toBe('disabled');
  });

  it('fails closed when onchain is required but disabled', async () => {
    const issuedAt = issuedAtForTest();
    process.env.V3_CREATOR_LICENSE_ONCHAIN_ENABLED = 'false';
    process.env.V3_CREATOR_LICENSE_ONCHAIN_REQUIRED = 'true';

    const service = new CreatorLicenseAnchorService({
      creatorPipelineService: createMockCreatorPipelineService({
        cas_004: {
          id: 'cas_004',
          creatorAppId: 'int_creator',
          type: 'IMAGE',
          mimeType: 'image/png',
          sourceUrl: 'https://cdn.example.com/assets/d.png',
          checksum: 'dddddddddddddddddddddddddddddddd',
          bytes: 1024,
          status: 'READY',
          metadata: null,
          preview: {
            validatorVersion: 'v3-creator-preview-v1',
            acceptedMimeTypes: ['image/png'],
            maxBytes: 8 * 1024 * 1024,
            checksumAlgorithm: 'sha256',
          },
          createdAt: '2026-03-24T00:00:00.000Z',
          updatedAt: '2026-03-24T00:00:00.000Z',
          audit: {
            createdByKeyId: 'ikey_004',
            createdByActor: 'creator:ikey_004',
            requestId: null,
          },
        },
      }),
    });

    await expect(
      service.createBinding({
        assetId: 'cas_004',
        ownerWallet: '0xabc0000000000000000000000000000000000001',
        issuedAt,
        requestedBy: {
          appId: 'int_creator',
          keyId: 'ikey_004',
          actor: 'creator:ikey_004',
        },
      })
    ).rejects.toMatchObject({
      code: 'CREATOR_LICENSE_ONCHAIN_DISABLED',
    });
  });
});
