import { CreatorPipelineService } from '../../modules/creator/creator-pipeline.service';

type MockCreatorProfile = {
  id: string;
  appId: string;
  status: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

type MockCreatorAsset = {
  id: string;
  creatorAppId: string;
  createdByKeyId: string;
  createdByActor: string;
  requestId: string | null;
  assetType: string;
  mimeType: string;
  sourceUrl: string;
  checksum: string;
  bytes: number;
  status: string;
  preview: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

type MockCreatorPack = {
  id: string;
  creatorAppId: string;
  slug: string;
  title: string;
  summary: string | null;
  status: string;
  previewState: string;
  createdByKeyId: string;
  createdByActor: string;
  requestId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type MockCreatorPackAsset = {
  id: string;
  packId: string;
  assetId: string;
  sortOrder: number;
  createdAt: Date;
};

const toDate = (value: Date | string | undefined): Date => {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string') {
    return new Date(value);
  }
  return new Date();
};

const createMockPrisma = () => {
  const profiles = new Map<string, MockCreatorProfile>();
  const assets = new Map<string, MockCreatorAsset>();
  const packs = new Map<string, MockCreatorPack>();
  const packAssets = new Map<string, MockCreatorPackAsset[]>();

  const toPackWithAssets = (pack: MockCreatorPack | null) => {
    if (!pack) {
      return null;
    }

    const links = packAssets.get(pack.id) || [];
    const hydratedLinks = links
      .slice()
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((link) => ({
        ...link,
        asset: assets.get(link.assetId) || null,
      }));

    return {
      ...pack,
      assets: hydratedLinks,
    };
  };

  const mockPrisma: any = {};

  mockPrisma.creatorProfile = {
    upsert: jest.fn(async ({ where, create, update }: any) => {
      const existing = profiles.get(where.appId);
      const now = new Date();
      if (!existing) {
        const created: MockCreatorProfile = {
          id: `cp_${profiles.size + 1}`,
          appId: create.appId,
          status: create.status,
          metadata: create.metadata ?? null,
          createdAt: now,
          updatedAt: now,
        };
        profiles.set(create.appId, created);
        return created;
      }

      const merged: MockCreatorProfile = {
        ...existing,
        status: update.status ?? existing.status,
        metadata: update.metadata ?? existing.metadata,
        updatedAt: now,
      };
      profiles.set(existing.appId, merged);
      return merged;
    }),
  };

  mockPrisma.creatorAsset = {
    create: jest.fn(async ({ data }: any) => {
      const created: MockCreatorAsset = {
        ...data,
        requestId: data.requestId ?? null,
        metadata: data.metadata ?? null,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      };
      assets.set(data.id, created);
      return created;
    }),
    findFirst: jest.fn(async ({ where }: any) => {
      let rows = Array.from(assets.values());
      if (where?.id) {
        rows = rows.filter((item) => item.id === where.id);
      }
      if (where?.creatorAppId) {
        rows = rows.filter((item) => item.creatorAppId === where.creatorAppId);
      }
      return rows[0] || null;
    }),
    findMany: jest.fn(async ({ where, orderBy, take }: any) => {
      let rows = Array.from(assets.values());
      if (where?.creatorAppId) {
        rows = rows.filter((item) => item.creatorAppId === where.creatorAppId);
      }
      if (where?.id?.in) {
        const idSet = new Set(where.id.in);
        rows = rows.filter((item) => idSet.has(item.id));
      }
      if (orderBy?.createdAt === 'desc') {
        rows = rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      if (typeof take === 'number') {
        rows = rows.slice(0, take);
      }
      return rows;
    }),
    count: jest.fn(async ({ where }: any) => {
      let rows = Array.from(assets.values());
      if (where?.creatorAppId) {
        rows = rows.filter((item) => item.creatorAppId === where.creatorAppId);
      }
      return rows.length;
    }),
  };

  mockPrisma.creatorPack = {
    create: jest.fn(async ({ data }: any) => {
      const created: MockCreatorPack = {
        ...data,
        summary: data.summary ?? null,
        requestId: data.requestId ?? null,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      };
      packs.set(data.id, created);
      return created;
    }),
    findFirst: jest.fn(async ({ where }: any) => {
      const row =
        Array.from(packs.values()).find(
          (item) =>
            (!where?.id || item.id === where.id) &&
            (!where?.creatorAppId || item.creatorAppId === where.creatorAppId)
        ) || null;
      return toPackWithAssets(row);
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const existing = where?.id ? packs.get(where.id) : undefined;
      if (!existing) {
        throw new Error('creator pack not found');
      }

      const next: MockCreatorPack = {
        ...existing,
        ...(typeof data?.slug === 'string' ? { slug: data.slug } : {}),
        ...(typeof data?.title === 'string' ? { title: data.title } : {}),
        ...(typeof data?.summary === 'string' || data?.summary === null ? { summary: data.summary } : {}),
        ...(typeof data?.status === 'string' ? { status: data.status } : {}),
        ...(typeof data?.previewState === 'string' ? { previewState: data.previewState } : {}),
        updatedAt: toDate(data?.updatedAt),
      };
      packs.set(next.id, next);
      return toPackWithAssets(next);
    }),
    findMany: jest.fn(async ({ where, orderBy, take }: any) => {
      let rows = Array.from(packs.values());
      if (where?.creatorAppId) {
        rows = rows.filter((item) => item.creatorAppId === where.creatorAppId);
      }
      if (where?.status) {
        rows = rows.filter((item) => item.status === where.status);
      }
      if (orderBy?.createdAt === 'desc') {
        rows = rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      if (typeof take === 'number') {
        rows = rows.slice(0, take);
      }
      return rows.map((row) => toPackWithAssets(row));
    }),
    count: jest.fn(async ({ where }: any) => {
      let rows = Array.from(packs.values());
      if (where?.creatorAppId) {
        rows = rows.filter((item) => item.creatorAppId === where.creatorAppId);
      }
      if (where?.status) {
        rows = rows.filter((item) => item.status === where.status);
      }
      return rows.length;
    }),
  };

  mockPrisma.creatorPackAsset = {
    createMany: jest.fn(async ({ data }: any) => {
      for (const row of data) {
        const current = packAssets.get(row.packId) || [];
        current.push({
          id: `cpa_${current.length + 1}`,
          packId: row.packId,
          assetId: row.assetId,
          sortOrder: row.sortOrder ?? 0,
          createdAt: new Date(),
        });
        packAssets.set(row.packId, current);
      }

      return {
        count: data.length,
      };
    }),
  };

  mockPrisma.domainEvent = {
    create: jest.fn(async ({ data }: any) => ({
      id: BigInt(1000),
      occurredAt: new Date(),
      ...data,
    })),
  };

  mockPrisma.$transaction = jest.fn(async (input: any): Promise<any> => {
    if (Array.isArray(input)) {
      return Promise.all(input);
    }
    if (typeof input === 'function') {
      return input(mockPrisma as any);
    }
    throw new Error('unsupported transaction payload');
  });

  return {
    mockPrisma,
    profiles,
    assets,
    packs,
  };
};

describe('CreatorPipelineService Integration', () => {
  const originalEnv = {
    V3_CREATOR_STORAGE_MODE: process.env.V3_CREATOR_STORAGE_MODE,
    V3_CREATOR_ASSET_PIPELINE_ENABLED: process.env.V3_CREATOR_ASSET_PIPELINE_ENABLED,
    V3_CREATOR_PACK_DRAFT_ENABLED: process.env.V3_CREATOR_PACK_DRAFT_ENABLED,
    V3_CREATOR_ALLOWED_APPS: process.env.V3_CREATOR_ALLOWED_APPS,
  };

  beforeEach(() => {
    process.env.V3_CREATOR_STORAGE_MODE = 'prisma';
    process.env.V3_CREATOR_ASSET_PIPELINE_ENABLED = 'true';
    process.env.V3_CREATOR_PACK_DRAFT_ENABLED = 'true';
    delete process.env.V3_CREATOR_ALLOWED_APPS;
  });

  afterAll(() => {
    process.env.V3_CREATOR_STORAGE_MODE = originalEnv.V3_CREATOR_STORAGE_MODE;
    process.env.V3_CREATOR_ASSET_PIPELINE_ENABLED = originalEnv.V3_CREATOR_ASSET_PIPELINE_ENABLED;
    process.env.V3_CREATOR_PACK_DRAFT_ENABLED = originalEnv.V3_CREATOR_PACK_DRAFT_ENABLED;
    process.env.V3_CREATOR_ALLOWED_APPS = originalEnv.V3_CREATOR_ALLOWED_APPS;
  });

  it('persists creator assets and writes audit domain event', async () => {
    const { mockPrisma, profiles, assets } = createMockPrisma();
    const service = new CreatorPipelineService({
      prismaClient: mockPrisma as any,
    });

    const created = await service.createAsset({
      type: 'IMAGE',
      mimeType: 'image/png',
      sourceUrl: 'https://cdn.example.com/assets/frog.png',
      checksum: 'aabbccddeeff00112233445566778899',
      bytes: 2048,
      metadata: {
        width: 512,
      },
      requestedBy: {
        appId: 'int_001',
        keyId: 'ikey_001',
        actor: 'creator-lab:ikey_001',
        requestId: 'req_creator_asset_001',
      },
    });

    expect(created.id.startsWith('cas_')).toBe(true);
    expect(created.status).toBe('READY');
    expect(profiles.has('int_001')).toBe(true);
    expect(assets.has(created.id)).toBe(true);
    expect(mockPrisma.domainEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          aggregateType: 'CreatorAsset',
          eventType: 'CreatorAssetUploaded',
          aggregateId: created.id,
        }),
      })
    );

    const listed = await service.listAssets({
      scopeAppId: 'int_001',
      limit: 20,
    });
    expect(listed.total).toBe(1);
    expect(listed.items[0].id).toBe(created.id);
  });

  it('blocks creator pack draft when assets reference another app scope', async () => {
    const { mockPrisma } = createMockPrisma();
    const service = new CreatorPipelineService({
      prismaClient: mockPrisma as any,
    });

    const first = await service.createAsset({
      type: 'IMAGE',
      mimeType: 'image/png',
      sourceUrl: 'https://cdn.example.com/assets/pack-a.png',
      checksum: '11112222333344445555666677778888',
      bytes: 1024,
      requestedBy: {
        appId: 'int_001',
        keyId: 'ikey_001',
        actor: 'creator-a:ikey_001',
      },
    });

    const second = await service.createAsset({
      type: 'IMAGE',
      mimeType: 'image/png',
      sourceUrl: 'https://cdn.example.com/assets/pack-b.png',
      checksum: '99990000aaaabbbbccccddddeeeeffff',
      bytes: 1024,
      requestedBy: {
        appId: 'int_002',
        keyId: 'ikey_002',
        actor: 'creator-b:ikey_002',
      },
    });

    await expect(
      service.createPackDraft({
        slug: 'mixed-scope-pack',
        title: 'Mixed Scope Pack',
        assetIds: [first.id, second.id],
        requestedBy: {
          appId: 'int_001',
          keyId: 'ikey_001',
          actor: 'creator-a:ikey_001',
          requestId: 'req_creator_pack_001',
        },
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'CREATOR_PERMISSION_DENIED',
    });
  });

  it('fails closed when creator pack draft kill switch is disabled', async () => {
    const { mockPrisma } = createMockPrisma();
    const service = new CreatorPipelineService({
      prismaClient: mockPrisma as any,
    });

    const asset = await service.createAsset({
      type: 'IMAGE',
      mimeType: 'image/png',
      sourceUrl: 'https://cdn.example.com/assets/ready.png',
      checksum: '0123456789abcdef0123456789abcdef',
      bytes: 1024,
      requestedBy: {
        appId: 'int_001',
        keyId: 'ikey_001',
        actor: 'creator-a:ikey_001',
      },
    });

    process.env.V3_CREATOR_PACK_DRAFT_ENABLED = 'false';

    await expect(
      service.createPackDraft({
        slug: 'kill-switch-pack',
        title: 'Kill Switch Pack',
        assetIds: [asset.id],
        requestedBy: {
          appId: 'int_001',
          keyId: 'ikey_001',
          actor: 'creator-a:ikey_001',
        },
      })
    ).rejects.toMatchObject({
      statusCode: 503,
      code: 'CREATOR_PACK_DRAFT_DISABLED',
    });
  });

  it('supports review queue lifecycle with reject, resubmit, approve, rollback and preview', async () => {
    const { mockPrisma } = createMockPrisma();
    const service = new CreatorPipelineService({
      prismaClient: mockPrisma as any,
    });

    const asset = await service.createAsset({
      type: 'IMAGE',
      mimeType: 'image/png',
      sourceUrl: 'https://cdn.example.com/assets/review-lifecycle.png',
      checksum: '00112233445566778899aabbccddeeff',
      bytes: 1024,
      requestedBy: {
        appId: 'int_001',
        keyId: 'ikey_001',
        actor: 'creator-a:ikey_001',
      },
    });

    const draft = await service.createPackDraft({
      slug: 'review-lifecycle-pack',
      title: 'Review Lifecycle Pack',
      assetIds: [asset.id],
      requestedBy: {
        appId: 'int_001',
        keyId: 'ikey_001',
        actor: 'creator-a:ikey_001',
      },
    });

    const submitted = await service.submitPackForReview({
      packId: draft.id,
      scopeAppId: 'int_001',
      note: 'submit',
      requestedBy: {
        appId: 'int_001',
        actor: 'creator-a:ikey_001',
      },
    });
    expect(submitted.status).toBe('IN_REVIEW');

    const rejected = await service.adminReviewPack({
      packId: draft.id,
      decision: 'REJECT',
      note: 'needs work',
      requestedBy: {
        actor: 'admin:qa',
      },
    });
    expect(rejected.status).toBe('REJECTED');

    const resubmitted = await service.submitPackForReview({
      packId: draft.id,
      scopeAppId: 'int_001',
      note: 'fixed',
      requestedBy: {
        appId: 'int_001',
        actor: 'creator-a:ikey_001',
      },
    });
    expect(resubmitted.status).toBe('IN_REVIEW');

    const approved = await service.adminReviewPack({
      packId: draft.id,
      decision: 'APPROVE',
      requestedBy: {
        actor: 'admin:qa',
      },
    });
    expect(approved.status).toBe('PUBLISHED');

    const preview = await service.buildPackPreview({
      packId: draft.id,
    });
    expect(preview.pack.id).toBe(draft.id);
    expect(preview.render.mode).toBe('SAFE');
    expect(preview.render.ready).toBe(true);
    expect(preview.assets.length).toBe(1);

    const rolledBack = await service.adminRollbackPack({
      packId: draft.id,
      reason: 'rollback',
      requestedBy: {
        actor: 'admin:qa',
      },
    });
    expect(rolledBack.status).toBe('DRAFT');

    const events = mockPrisma.domainEvent.create.mock.calls.map((call: any[]) => call?.[0]?.data?.eventType);
    expect(events).toEqual(
      expect.arrayContaining([
        'CreatorPackSubmittedForReview',
        'CreatorPackReviewRejected',
        'CreatorPackReviewApproved',
        'CreatorPackRolledBack',
      ])
    );
  });
});
