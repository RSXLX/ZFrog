import { RelationshipEdgeAnchorReplayService } from '../../modules/relationship-graph/relationship-edge-anchor-replay.service';
import { RelationshipEdgeAnchorService } from '../../modules/relationship-graph/relationship-edge-anchor.service';

describe('RelationshipEdgeAnchorReplayService (integration)', () => {
  const originalEnv = {
    V3_RELATIONSHIP_EDGE_ANCHOR_STORAGE_MODE: process.env.V3_RELATIONSHIP_EDGE_ANCHOR_STORAGE_MODE,
    V3_RELATIONSHIP_EDGE_ANCHOR_ENABLED: process.env.V3_RELATIONSHIP_EDGE_ANCHOR_ENABLED,
    V3_RELATIONSHIP_EDGE_ONCHAIN_ENABLED: process.env.V3_RELATIONSHIP_EDGE_ONCHAIN_ENABLED,
    V3_RELATIONSHIP_EDGE_ONCHAIN_REQUIRED: process.env.V3_RELATIONSHIP_EDGE_ONCHAIN_REQUIRED,
    V3_RELATIONSHIP_EDGE_ANCHOR_FORCE_FAIL: process.env.V3_RELATIONSHIP_EDGE_ANCHOR_FORCE_FAIL,
    V3_RELATIONSHIP_EDGE_ANCHOR_REPLAY_ENABLED: process.env.V3_RELATIONSHIP_EDGE_ANCHOR_REPLAY_ENABLED,
    V3_RELATIONSHIP_EDGE_ANCHOR_MIN_SCORE: process.env.V3_RELATIONSHIP_EDGE_ANCHOR_MIN_SCORE,
  };

  const seedEdge = (service: RelationshipEdgeAnchorService, edgeId: string, score: number): void => {
    service.seedEdgeForTest({
      id: edgeId,
      scopeAppId: 'int_relationship_anchor',
      frogId: 2001,
      peerFrogId: 2002,
      score,
      signalCount: 4,
      journeyCount: 2,
      rescueCount: 1,
      witnessCount: 1,
      contributionCount: 0,
      firstOccurredAt: '2026-03-24T05:00:00.000Z',
      lastOccurredAt: '2026-03-24T05:30:00.000Z',
    });
  };

  beforeEach(() => {
    process.env.V3_RELATIONSHIP_EDGE_ANCHOR_STORAGE_MODE = 'memory';
    process.env.V3_RELATIONSHIP_EDGE_ANCHOR_ENABLED = 'true';
    process.env.V3_RELATIONSHIP_EDGE_ONCHAIN_ENABLED = 'true';
    process.env.V3_RELATIONSHIP_EDGE_ONCHAIN_REQUIRED = 'false';
    process.env.V3_RELATIONSHIP_EDGE_ANCHOR_FORCE_FAIL = 'false';
    process.env.V3_RELATIONSHIP_EDGE_ANCHOR_REPLAY_ENABLED = 'true';
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
    process.env.V3_RELATIONSHIP_EDGE_ANCHOR_REPLAY_ENABLED =
      originalEnv.V3_RELATIONSHIP_EDGE_ANCHOR_REPLAY_ENABLED;
    process.env.V3_RELATIONSHIP_EDGE_ANCHOR_MIN_SCORE =
      originalEnv.V3_RELATIONSHIP_EDGE_ANCHOR_MIN_SCORE;
  });

  it('replays failed anchors to anchored status', async () => {
    const anchorService = new RelationshipEdgeAnchorService();
    const replayService = new RelationshipEdgeAnchorReplayService({
      anchorService,
    });

    seedEdge(anchorService, 'reg_edge_replay_001', 11);
    seedEdge(anchorService, 'reg_edge_replay_002', 9);

    process.env.V3_RELATIONSHIP_EDGE_ANCHOR_FORCE_FAIL = 'true';
    const anchored = await anchorService.anchorTopEdges({
      scopeAppId: 'int_relationship_anchor',
      requestedBy: {
        appId: 'int_relationship_anchor',
        keyId: 'ikey_anchor_replay',
        actor: 'relationship-anchor:ikey_anchor_replay',
      },
      dryRun: false,
      limit: 10,
    });

    expect(anchored.createdCount).toBe(2);
    expect(anchored.failedCount).toBe(2);
    expect(anchored.failedAnchorIds.length).toBe(2);

    const dryRun = await replayService.replayCandidates({
      scopeAppId: 'int_relationship_anchor',
      keyId: 'ikey_anchor_replay',
      actor: 'relationship-anchor:ikey_anchor_replay',
      dryRun: true,
      statuses: ['FAILED'],
      limit: 10,
    });

    expect(dryRun.scannedCount).toBe(2);
    expect(dryRun.replayedCount).toBe(0);

    process.env.V3_RELATIONSHIP_EDGE_ANCHOR_FORCE_FAIL = 'false';

    const replayed = await replayService.replayCandidates({
      scopeAppId: 'int_relationship_anchor',
      keyId: 'ikey_anchor_replay',
      actor: 'relationship-anchor:ikey_anchor_replay',
      statuses: ['FAILED'],
      limit: 10,
    });

    expect(replayed.scannedCount).toBe(2);
    expect(replayed.replayedCount).toBe(2);
    expect(replayed.anchoredCount).toBe(2);
    expect(replayed.failedCount).toBe(0);

    const noFailedLeft = await replayService.replayCandidates({
      scopeAppId: 'int_relationship_anchor',
      keyId: 'ikey_anchor_replay',
      actor: 'relationship-anchor:ikey_anchor_replay',
      statuses: ['FAILED'],
      limit: 10,
      dryRun: true,
    });

    expect(noFailedLeft.scannedCount).toBe(0);
  });

  it('fails closed when replay gate is disabled', async () => {
    const replayService = new RelationshipEdgeAnchorReplayService({
      anchorService: new RelationshipEdgeAnchorService(),
    });

    process.env.V3_RELATIONSHIP_EDGE_ANCHOR_REPLAY_ENABLED = 'false';

    await expect(
      replayService.replayCandidates({
        scopeAppId: 'int_relationship_anchor',
        keyId: 'ikey_anchor_replay',
        actor: 'relationship-anchor:ikey_anchor_replay',
      })
    ).rejects.toMatchObject({
      code: 'RELATIONSHIP_EDGE_ANCHOR_REPLAY_DISABLED',
    });
  });
});
