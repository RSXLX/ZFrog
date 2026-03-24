import {
  RelationshipEdgeAnchorService,
  type RelationshipEdgeAnchorStatus,
} from '../../modules/relationship-graph/relationship-edge-anchor.service';

describe('RelationshipEdgeAnchorService (integration)', () => {
  const originalEnv = {
    V3_RELATIONSHIP_EDGE_ANCHOR_STORAGE_MODE: process.env.V3_RELATIONSHIP_EDGE_ANCHOR_STORAGE_MODE,
    V3_RELATIONSHIP_EDGE_ANCHOR_ENABLED: process.env.V3_RELATIONSHIP_EDGE_ANCHOR_ENABLED,
    V3_RELATIONSHIP_EDGE_ONCHAIN_ENABLED: process.env.V3_RELATIONSHIP_EDGE_ONCHAIN_ENABLED,
    V3_RELATIONSHIP_EDGE_ONCHAIN_REQUIRED: process.env.V3_RELATIONSHIP_EDGE_ONCHAIN_REQUIRED,
    V3_RELATIONSHIP_EDGE_ANCHOR_FORCE_FAIL: process.env.V3_RELATIONSHIP_EDGE_ANCHOR_FORCE_FAIL,
    V3_RELATIONSHIP_EDGE_ANCHOR_MIN_SCORE: process.env.V3_RELATIONSHIP_EDGE_ANCHOR_MIN_SCORE,
  };

  const seedEdge = (service: RelationshipEdgeAnchorService, input: { id: string; score: number }): void => {
    service.seedEdgeForTest({
      id: input.id,
      scopeAppId: 'int_relationship_anchor',
      frogId: 1001,
      peerFrogId: 1002,
      score: input.score,
      signalCount: 3,
      journeyCount: 1,
      rescueCount: 1,
      witnessCount: 1,
      contributionCount: 0,
      firstOccurredAt: '2026-03-24T04:00:00.000Z',
      lastOccurredAt: '2026-03-24T04:30:00.000Z',
    });
  };

  beforeEach(() => {
    process.env.V3_RELATIONSHIP_EDGE_ANCHOR_STORAGE_MODE = 'memory';
    process.env.V3_RELATIONSHIP_EDGE_ANCHOR_ENABLED = 'true';
    process.env.V3_RELATIONSHIP_EDGE_ONCHAIN_ENABLED = 'true';
    process.env.V3_RELATIONSHIP_EDGE_ONCHAIN_REQUIRED = 'false';
    process.env.V3_RELATIONSHIP_EDGE_ANCHOR_FORCE_FAIL = 'false';
    process.env.V3_RELATIONSHIP_EDGE_ANCHOR_MIN_SCORE = '6';
  });

  afterAll(() => {
    process.env.V3_RELATIONSHIP_EDGE_ANCHOR_STORAGE_MODE =
      originalEnv.V3_RELATIONSHIP_EDGE_ANCHOR_STORAGE_MODE;
    process.env.V3_RELATIONSHIP_EDGE_ANCHOR_ENABLED = originalEnv.V3_RELATIONSHIP_EDGE_ANCHOR_ENABLED;
    process.env.V3_RELATIONSHIP_EDGE_ONCHAIN_ENABLED = originalEnv.V3_RELATIONSHIP_EDGE_ONCHAIN_ENABLED;
    process.env.V3_RELATIONSHIP_EDGE_ONCHAIN_REQUIRED =
      originalEnv.V3_RELATIONSHIP_EDGE_ONCHAIN_REQUIRED;
    process.env.V3_RELATIONSHIP_EDGE_ANCHOR_FORCE_FAIL =
      originalEnv.V3_RELATIONSHIP_EDGE_ANCHOR_FORCE_FAIL;
    process.env.V3_RELATIONSHIP_EDGE_ANCHOR_MIN_SCORE =
      originalEnv.V3_RELATIONSHIP_EDGE_ANCHOR_MIN_SCORE;
  });

  it('creates idempotent onchain anchor for the same edge digest', async () => {
    const service = new RelationshipEdgeAnchorService();
    seedEdge(service, {
      id: 'reg_edge_high_001',
      score: 9,
    });

    const first = await service.createAnchorForEdge({
      scopeAppId: 'int_relationship_anchor',
      edgeId: 'reg_edge_high_001',
      requestedBy: {
        appId: 'int_relationship_anchor',
        keyId: 'ikey_anchor_001',
        actor: 'relationship-anchor:ikey_anchor_001',
      },
    });

    expect(first.idempotentReplay).toBe(false);
    expect(first.anchor.status).toBe<RelationshipEdgeAnchorStatus>('ANCHORED');
    expect(first.anchor.onchain.anchored).toBe(true);

    const second = await service.createAnchorForEdge({
      scopeAppId: 'int_relationship_anchor',
      edgeId: 'reg_edge_high_001',
      requestedBy: {
        appId: 'int_relationship_anchor',
        keyId: 'ikey_anchor_001',
        actor: 'relationship-anchor:ikey_anchor_001',
      },
    });

    expect(second.idempotentReplay).toBe(true);
    expect(second.anchor.id).toBe(first.anchor.id);
    expect(second.replayed).toBe(false);
  });

  it('marks failed anchor and replays to anchored once failure is cleared', async () => {
    const service = new RelationshipEdgeAnchorService();
    seedEdge(service, {
      id: 'reg_edge_high_002',
      score: 12,
    });

    process.env.V3_RELATIONSHIP_EDGE_ANCHOR_FORCE_FAIL = 'true';

    const failed = await service.createAnchorForEdge({
      scopeAppId: 'int_relationship_anchor',
      edgeId: 'reg_edge_high_002',
      requestedBy: {
        appId: 'int_relationship_anchor',
        keyId: 'ikey_anchor_002',
        actor: 'relationship-anchor:ikey_anchor_002',
      },
    });

    expect(failed.anchor.status).toBe<RelationshipEdgeAnchorStatus>('FAILED');
    expect(failed.anchor.lastError).toBeTruthy();

    process.env.V3_RELATIONSHIP_EDGE_ANCHOR_FORCE_FAIL = 'false';

    const replayed = await service.replayAnchor({
      anchorId: failed.anchor.id,
      scopeAppId: 'int_relationship_anchor',
      requestedBy: {
        actor: 'relationship-anchor:ikey_anchor_002',
      },
    });

    expect(replayed.replayed).toBe(true);
    expect(replayed.anchor.status).toBe<RelationshipEdgeAnchorStatus>('ANCHORED');
    expect(replayed.anchor.replayCount).toBe(1);
    expect(replayed.anchor.onchain.anchored).toBe(true);
  });

  it('fails closed when onchain anchor is required but disabled', async () => {
    const service = new RelationshipEdgeAnchorService();
    seedEdge(service, {
      id: 'reg_edge_high_003',
      score: 8,
    });

    process.env.V3_RELATIONSHIP_EDGE_ONCHAIN_ENABLED = 'false';
    process.env.V3_RELATIONSHIP_EDGE_ONCHAIN_REQUIRED = 'true';

    await expect(
      service.createAnchorForEdge({
        scopeAppId: 'int_relationship_anchor',
        edgeId: 'reg_edge_high_003',
        requestedBy: {
          appId: 'int_relationship_anchor',
          keyId: 'ikey_anchor_003',
          actor: 'relationship-anchor:ikey_anchor_003',
        },
      })
    ).rejects.toMatchObject({
      code: 'RELATIONSHIP_EDGE_ONCHAIN_DISABLED',
    });
  });
});
