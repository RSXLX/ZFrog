import {
  resetV3RelationshipEdgeLedgerStoreForTest,
  v3RelationshipEdgeLedgerService,
} from '../../modules/relationship-graph/relationship-edge-ledger.service';

describe('RelationshipEdgeLedgerService (integration)', () => {
  const originalEnv = {
    V3_RELATIONSHIP_EDGE_STORAGE_MODE: process.env.V3_RELATIONSHIP_EDGE_STORAGE_MODE,
    V3_RELATIONSHIP_EDGE_LEDGER_ENABLED: process.env.V3_RELATIONSHIP_EDGE_LEDGER_ENABLED,
    V3_RELATIONSHIP_GRAPH_QUERY_ENABLED: process.env.V3_RELATIONSHIP_GRAPH_QUERY_ENABLED,
  };

  beforeEach(() => {
    process.env.V3_RELATIONSHIP_EDGE_STORAGE_MODE = 'memory';
    process.env.V3_RELATIONSHIP_EDGE_LEDGER_ENABLED = 'true';
    process.env.V3_RELATIONSHIP_GRAPH_QUERY_ENABLED = 'true';
    resetV3RelationshipEdgeLedgerStoreForTest();
  });

  afterAll(() => {
    process.env.V3_RELATIONSHIP_EDGE_STORAGE_MODE = originalEnv.V3_RELATIONSHIP_EDGE_STORAGE_MODE;
    process.env.V3_RELATIONSHIP_EDGE_LEDGER_ENABLED = originalEnv.V3_RELATIONSHIP_EDGE_LEDGER_ENABLED;
    process.env.V3_RELATIONSHIP_GRAPH_QUERY_ENABLED = originalEnv.V3_RELATIONSHIP_GRAPH_QUERY_ENABLED;
    resetV3RelationshipEdgeLedgerStoreForTest();
  });

  it('aggregates journey/rescue/witness/contribution signals with identity-key dedupe and snapshot', async () => {
    const ingest = await v3RelationshipEdgeLedgerService.ingestSignals({
      signals: [
        {
          sourceFrogId: 101,
          targetFrogId: 202,
          signalType: 'JOURNEY',
          identityKey: 'journey-001',
          occurredAt: '2026-03-24T02:00:00.000Z',
        },
        {
          sourceFrogId: 202,
          targetFrogId: 101,
          signalType: 'RESCUE',
          identityKey: 'rescue-001',
          occurredAt: '2026-03-24T02:10:00.000Z',
        },
        {
          sourceFrogId: 101,
          targetFrogId: 202,
          signalType: 'WITNESS',
          identityKey: 'witness-001',
          occurredAt: '2026-03-24T02:20:00.000Z',
        },
        {
          sourceFrogId: 101,
          targetFrogId: 202,
          signalType: 'WITNESS',
          identityKey: 'witness-001',
          occurredAt: '2026-03-24T02:20:00.000Z',
        },
        {
          sourceFrogId: 101,
          targetFrogId: 303,
          signalType: 'CONTRIBUTION',
          identityKey: 'contribution-001',
          occurredAt: '2026-03-24T02:30:00.000Z',
        },
      ],
      requestedBy: {
        appId: 'int_relationship_lab',
        keyId: 'ikey_relationship_lab',
        actor: 'relationship-lab:ikey_relationship_lab',
        requestId: 'req_rel_001',
      },
    });

    expect(ingest.acceptedCount).toBe(4);
    expect(ingest.deduplicatedCount).toBe(1);
    expect(ingest.snapshots.length).toBe(3);

    const graph = await v3RelationshipEdgeLedgerService.getGraphByFrogId({
      frogId: 101,
      scopeAppId: 'int_relationship_lab',
      limit: 10,
    });

    expect(graph.summary.totalEdges).toBe(2);
    expect(graph.summary.totalSignalCount).toBe(4);
    expect(graph.summary.totalScore).toBe(10);
    expect(graph.edges[0]).toMatchObject({
      peerFrogId: 202,
      signalCount: 3,
      score: 9,
      signals: {
        journey: 1,
        rescue: 1,
        witness: 1,
        contribution: 0,
      },
    });
    expect(graph.edges[1]).toMatchObject({
      peerFrogId: 303,
      signalCount: 1,
      score: 1,
      signals: {
        contribution: 1,
      },
    });
    expect(graph.snapshot.totalEdges).toBe(2);
    expect(graph.snapshot.strongestPeerFrogId).toBe(202);
  });

  it('supports event-type mapping ingestion and app-scope fail-closed query', async () => {
    const ingest = await v3RelationshipEdgeLedgerService.ingestEventRecords({
      events: [
        {
          frogId: 501,
          counterpartyFrogId: 502,
          eventType: 'rescue',
          identityKey: 'evt-rescue-001',
        },
        {
          frogId: 501,
          counterpartyFrogId: 502,
          eventType: 'memory_contribution',
          identityKey: 'evt-contribution-001',
        },
        {
          frogId: 501,
          counterpartyFrogId: 503,
          eventType: 'unknown_event_type',
          identityKey: 'evt-ignored-001',
        },
      ],
      requestedBy: {
        appId: 'int_scope_a',
        keyId: 'ikey_scope_a',
        actor: 'scope-a:ikey_scope_a',
      },
    });

    expect(ingest.acceptedCount).toBe(2);
    expect(ingest.skippedCount).toBe(1);

    const graph = await v3RelationshipEdgeLedgerService.getGraphByFrogId({
      frogId: 501,
      scopeAppId: 'int_scope_a',
    });
    expect(graph.summary.totalScore).toBe(5);

    await expect(
      v3RelationshipEdgeLedgerService.getGraphByFrogId({
        frogId: 501,
        scopeAppId: 'int_scope_b',
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('fails closed when ledger write gate is disabled', async () => {
    process.env.V3_RELATIONSHIP_EDGE_LEDGER_ENABLED = 'false';

    await expect(
      v3RelationshipEdgeLedgerService.ingestSignals({
        signals: [
          {
            sourceFrogId: 1,
            targetFrogId: 2,
            signalType: 'JOURNEY',
            identityKey: 'closed-001',
          },
        ],
        requestedBy: {
          appId: 'int_closed',
          keyId: 'ikey_closed',
          actor: 'closed:ikey_closed',
        },
      })
    ).rejects.toMatchObject({
      statusCode: 503,
      code: 'RELATIONSHIP_EDGE_LEDGER_DISABLED',
    });
  });

  it('fails closed when graph query gate is disabled', async () => {
    await v3RelationshipEdgeLedgerService.ingestSignals({
      signals: [
        {
          sourceFrogId: 11,
          targetFrogId: 12,
          signalType: 'JOURNEY',
          identityKey: 'query-001',
        },
      ],
      requestedBy: {
        appId: 'int_query_gate',
        keyId: 'ikey_query_gate',
        actor: 'query-gate:ikey_query_gate',
      },
    });

    process.env.V3_RELATIONSHIP_GRAPH_QUERY_ENABLED = 'false';

    await expect(
      v3RelationshipEdgeLedgerService.getGraphByFrogId({
        frogId: 11,
        scopeAppId: 'int_query_gate',
      })
    ).rejects.toMatchObject({
      statusCode: 503,
      code: 'RELATIONSHIP_GRAPH_QUERY_DISABLED',
    });
  });
});
