import {
  resetV3CollaborativeMemoryStoreForTest,
  v3CollaborativeMemoryService,
} from '../../modules/memory-palace-v3/collaborative-memory.service';

describe('CollaborativeMemoryService (integration)', () => {
  const originalEnv = {
    V3_MEMORY_PALACE_STORAGE_MODE: process.env.V3_MEMORY_PALACE_STORAGE_MODE,
    V3_MEMORY_PALACE_COLLAB_ENABLED: process.env.V3_MEMORY_PALACE_COLLAB_ENABLED,
    V3_MEMORY_PALACE_VISIT_WRITE_ENABLED: process.env.V3_MEMORY_PALACE_VISIT_WRITE_ENABLED,
  };

  beforeEach(() => {
    process.env.V3_MEMORY_PALACE_STORAGE_MODE = 'memory';
    process.env.V3_MEMORY_PALACE_COLLAB_ENABLED = 'true';
    process.env.V3_MEMORY_PALACE_VISIT_WRITE_ENABLED = 'true';
    resetV3CollaborativeMemoryStoreForTest();
  });

  afterAll(() => {
    process.env.V3_MEMORY_PALACE_STORAGE_MODE = originalEnv.V3_MEMORY_PALACE_STORAGE_MODE;
    process.env.V3_MEMORY_PALACE_COLLAB_ENABLED = originalEnv.V3_MEMORY_PALACE_COLLAB_ENABLED;
    process.env.V3_MEMORY_PALACE_VISIT_WRITE_ENABLED = originalEnv.V3_MEMORY_PALACE_VISIT_WRITE_ENABLED;
    resetV3CollaborativeMemoryStoreForTest();
  });

  it('creates a world, onboards collaborator, and accepts contribution', async () => {
    const world = await v3CollaborativeMemoryService.createWorld({
      journeyId: 'jrn_collab_001',
      title: 'Shared Meteor Night',
      requestedBy: {
        appId: 'int_owner',
        keyId: 'ikey_owner',
        actor: 'owner:ikey_owner',
      },
    });

    expect(world.id.startsWith('mpw_')).toBe(true);
    expect(world.ownerAppId).toBe('int_owner');
    expect(world.metrics.collaboratorCount).toBe(1);

    const worldWithCollaborator = await v3CollaborativeMemoryService.addCollaborator({
      worldId: world.id,
      collaboratorAppId: 'int_friend',
      role: 'CONTRIBUTOR',
      requestedBy: {
        appId: 'int_owner',
        actor: 'owner:ikey_owner',
      },
    });

    expect(worldWithCollaborator.metrics.collaboratorCount).toBe(2);

    const worldWithContribution = await v3CollaborativeMemoryService.addContribution({
      worldId: world.id,
      type: 'WITNESS_NOTE',
      content: 'Witnessed rescue with family.',
      requestedBy: {
        appId: 'int_friend',
        actor: 'friend:ikey_friend',
      },
    });

    expect(worldWithContribution.metrics.contributionCount).toBe(1);
    expect(worldWithContribution.contributions[0]).toMatchObject({
      appId: 'int_friend',
      type: 'WITNESS_NOTE',
      content: 'Witnessed rescue with family.',
    });
  });

  it('fails closed for app-scoped reads', async () => {
    const world = await v3CollaborativeMemoryService.createWorld({
      journeyId: 'jrn_scope_001',
      requestedBy: {
        appId: 'int_owner',
        keyId: 'ikey_owner',
        actor: 'owner:ikey_owner',
      },
    });

    await expect(
      v3CollaborativeMemoryService.getWorldById({
        worldId: world.id,
        scopeAppId: 'int_other',
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('write gate can disable collaborative writes', async () => {
    process.env.V3_MEMORY_PALACE_COLLAB_ENABLED = 'false';

    await expect(
      v3CollaborativeMemoryService.createWorld({
        journeyId: 'jrn_write_gate_001',
        requestedBy: {
          appId: 'int_owner',
          keyId: 'ikey_owner',
          actor: 'owner:ikey_owner',
        },
      })
    ).rejects.toMatchObject({
      statusCode: 503,
      code: 'MEMORY_COLLAB_DISABLED',
    });
  });

  it('supports guestbook visit flow and admin feature toggle', async () => {
    const world = await v3CollaborativeMemoryService.createWorld({
      journeyId: 'jrn_visit_001',
      title: 'Visitor Hall',
      requestedBy: {
        appId: 'int_owner',
        keyId: 'ikey_owner',
        actor: 'owner:ikey_owner',
      },
    });

    const visit = await v3CollaborativeMemoryService.addVisit({
      worldId: world.id,
      entryType: 'WITNESS',
      message: 'Witnessed moonlight ripples across the relic.',
      requestedBy: {
        appId: 'int_guest',
        keyId: 'ikey_guest',
        actor: 'guest:ikey_guest',
      },
    });

    expect(visit.worldId).toBe(world.id);
    expect(visit.entryType).toBe('WITNESS');
    expect(visit.featured.isFeatured).toBe(false);

    const featured = await v3CollaborativeMemoryService.featureVisitByAdmin({
      worldId: world.id,
      visitId: visit.id,
      featured: true,
      reason: 'showcase witness quality',
      requestedBy: {
        actor: '0xadmin',
      },
    });

    expect(featured.featured).toBe(true);
    expect(featured.exhibitId).toBeTruthy();

    const visits = await v3CollaborativeMemoryService.listVisits({
      worldId: world.id,
      scopeAppId: 'int_owner',
      limit: 10,
    });

    expect(visits.total).toBe(1);
    expect(visits.featuredCount).toBe(1);
    expect(visits.items[0]).toMatchObject({
      id: visit.id,
      visitorAppId: 'int_guest',
      entryType: 'WITNESS',
      featured: {
        isFeatured: true,
      },
    });
  });

  it('visit write gate can disable visitor writes', async () => {
    const world = await v3CollaborativeMemoryService.createWorld({
      journeyId: 'jrn_visit_gate_001',
      requestedBy: {
        appId: 'int_owner',
        keyId: 'ikey_owner',
        actor: 'owner:ikey_owner',
      },
    });

    process.env.V3_MEMORY_PALACE_VISIT_WRITE_ENABLED = 'false';

    await expect(
      v3CollaborativeMemoryService.addVisit({
        worldId: world.id,
        message: 'Should be blocked by visit gate.',
        requestedBy: {
          appId: 'int_guest',
          keyId: 'ikey_guest',
          actor: 'guest:ikey_guest',
        },
      })
    ).rejects.toMatchObject({
      statusCode: 503,
      code: 'MEMORY_VISIT_WRITE_DISABLED',
    });
  });
});
