import {
  resetV3MemoryPalaceTemplatePackStoreForTest,
  v3MemoryPalaceTemplatePackService,
} from '../../modules/memory-palace-templates/template-pack.service';

describe('MemoryPalaceTemplatePackService (integration)', () => {
  const originalEnv = {
    V3_MEMORY_PALACE_STORAGE_MODE: process.env.V3_MEMORY_PALACE_STORAGE_MODE,
    V3_MEMORY_PALACE_TEMPLATE_STORAGE_MODE: process.env.V3_MEMORY_PALACE_TEMPLATE_STORAGE_MODE,
    V3_MEMORY_PALACE_TEMPLATE_PACK_ENABLED: process.env.V3_MEMORY_PALACE_TEMPLATE_PACK_ENABLED,
    V3_MEMORY_PALACE_TEMPLATE_PUBLIC_ENABLED: process.env.V3_MEMORY_PALACE_TEMPLATE_PUBLIC_ENABLED,
  };

  beforeEach(() => {
    process.env.V3_MEMORY_PALACE_STORAGE_MODE = 'memory';
    process.env.V3_MEMORY_PALACE_TEMPLATE_STORAGE_MODE = 'memory';
    process.env.V3_MEMORY_PALACE_TEMPLATE_PACK_ENABLED = 'true';
    process.env.V3_MEMORY_PALACE_TEMPLATE_PUBLIC_ENABLED = 'true';
    resetV3MemoryPalaceTemplatePackStoreForTest();
  });

  afterAll(() => {
    process.env.V3_MEMORY_PALACE_STORAGE_MODE = originalEnv.V3_MEMORY_PALACE_STORAGE_MODE;
    process.env.V3_MEMORY_PALACE_TEMPLATE_STORAGE_MODE =
      originalEnv.V3_MEMORY_PALACE_TEMPLATE_STORAGE_MODE;
    process.env.V3_MEMORY_PALACE_TEMPLATE_PACK_ENABLED =
      originalEnv.V3_MEMORY_PALACE_TEMPLATE_PACK_ENABLED;
    process.env.V3_MEMORY_PALACE_TEMPLATE_PUBLIC_ENABLED =
      originalEnv.V3_MEMORY_PALACE_TEMPLATE_PUBLIC_ENABLED;
    resetV3MemoryPalaceTemplatePackStoreForTest();
  });

  it('supports draft -> review -> published flow with feature toggle', async () => {
    const draft = await v3MemoryPalaceTemplatePackService.createTemplateDraft({
      slug: 'moonlake-celadon',
      name: 'Moonlake Celadon',
      summary: 'Template awaiting review.',
      theme: {
        palette: {
          background: '#ecfeff',
          surface: '#ffffff',
          accent: '#0ea5e9',
          text: '#0f172a',
        },
        badgeLabel: 'Moonlake',
        coverImageUrl: null,
      },
      requestedBy: {
        appId: 'int_creator',
        keyId: 'ikey_creator',
        actor: 'creator:ikey_creator',
      },
    });

    expect(draft.status).toBe('DRAFT');
    expect(draft.featureEnabled).toBe(false);

    await expect(
      v3MemoryPalaceTemplatePackService.assertTemplateAvailableForWorld({
        templateSlug: draft.slug,
      })
    ).rejects.toMatchObject({
      code: 'MEMORY_TEMPLATE_UNAVAILABLE',
      statusCode: 403,
    });

    const inReview = await v3MemoryPalaceTemplatePackService.submitTemplateForReview({
      templateId: draft.id,
      note: 'please review',
      requestedBy: {
        appId: 'int_creator',
        actor: 'creator:ikey_creator',
      },
    });

    expect(inReview.status).toBe('IN_REVIEW');

    const published = await v3MemoryPalaceTemplatePackService.adminReviewTemplate({
      templateId: draft.id,
      decision: 'APPROVE',
      featureEnabled: true,
      requestedBy: {
        actor: '0xadmin',
      },
    });

    expect(published.status).toBe('PUBLISHED');
    expect(published.featureEnabled).toBe(true);

    const catalog = await v3MemoryPalaceTemplatePackService.listPublishedTemplates({
      limit: 10,
    });

    expect(catalog.total).toBe(1);
    expect(catalog.items[0]?.slug).toBe('moonlake-celadon');

    const available = await v3MemoryPalaceTemplatePackService.assertTemplateAvailableForWorld({
      templateSlug: 'moonlake-celadon',
    });

    expect(available.id).toBe(draft.id);

    const disabled = await v3MemoryPalaceTemplatePackService.adminToggleTemplateFeature({
      templateId: draft.id,
      enabled: false,
      reason: 'pause rollout',
      requestedBy: {
        actor: '0xadmin',
      },
    });

    expect(disabled.featureEnabled).toBe(false);

    await expect(
      v3MemoryPalaceTemplatePackService.assertTemplateAvailableForWorld({
        templateSlug: draft.slug,
      })
    ).rejects.toMatchObject({
      code: 'MEMORY_TEMPLATE_UNAVAILABLE',
      statusCode: 403,
    });
  });

  it('fails closed when template public catalog is disabled by env flag', async () => {
    process.env.V3_MEMORY_PALACE_TEMPLATE_PUBLIC_ENABLED = 'false';

    await expect(v3MemoryPalaceTemplatePackService.listPublishedTemplates()).rejects.toMatchObject({
      code: 'MEMORY_TEMPLATE_PUBLIC_DISABLED',
      statusCode: 503,
    });
  });
});
