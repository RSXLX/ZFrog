import express from 'express';
import request from 'supertest';
import adminV3RelationshipGraphRoutes from '../../api/routes/admin/v3-relationship-graph.routes';
import { errorHandler, notFoundHandler } from '../../middlewares/errorHandler';
import {
  resetV3RelationshipEdgeLedgerStoreForTest,
  v3RelationshipEdgeLedgerService,
} from '../../modules/relationship-graph/relationship-edge-ledger.service';
import {
  relationshipEdgeAnchorService,
  resetV3RelationshipEdgeAnchorStoreForTest,
} from '../../modules/relationship-graph/relationship-edge-anchor.service';

describe('Admin V3 Relationship Graph Routes E2E', () => {
  const app = express();
  const originalEnv = {
    V3_RUNTIME_ENABLED: process.env.V3_RUNTIME_ENABLED,
    V3_RUNTIME_KILL_SWITCH: process.env.V3_RUNTIME_KILL_SWITCH,
    V3_RUNTIME_RELATIONSHIP_GRAPH_ENABLED: process.env.V3_RUNTIME_RELATIONSHIP_GRAPH_ENABLED,
    V3_RELATIONSHIP_EDGE_STORAGE_MODE: process.env.V3_RELATIONSHIP_EDGE_STORAGE_MODE,
    V3_RELATIONSHIP_EDGE_LEDGER_ENABLED: process.env.V3_RELATIONSHIP_EDGE_LEDGER_ENABLED,
    V3_RELATIONSHIP_GRAPH_QUERY_ENABLED: process.env.V3_RELATIONSHIP_GRAPH_QUERY_ENABLED,
    V3_RELATIONSHIP_GRAPH_ADMIN_READ_ENABLED: process.env.V3_RELATIONSHIP_GRAPH_ADMIN_READ_ENABLED,
    V3_RELATIONSHIP_EDGE_ANCHOR_STORAGE_MODE: process.env.V3_RELATIONSHIP_EDGE_ANCHOR_STORAGE_MODE,
    V3_RELATIONSHIP_EDGE_ANCHOR_ENABLED: process.env.V3_RELATIONSHIP_EDGE_ANCHOR_ENABLED,
    V3_RELATIONSHIP_EDGE_ANCHOR_MIN_SCORE: process.env.V3_RELATIONSHIP_EDGE_ANCHOR_MIN_SCORE,
    V3_RELATIONSHIP_EDGE_ONCHAIN_ENABLED: process.env.V3_RELATIONSHIP_EDGE_ONCHAIN_ENABLED,
    V3_RELATIONSHIP_EDGE_ONCHAIN_REQUIRED: process.env.V3_RELATIONSHIP_EDGE_ONCHAIN_REQUIRED,
  };

  app.use(express.json());
  app.use('/api/admin/v3/relationship-graph', adminV3RelationshipGraphRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  beforeEach(async () => {
    process.env.V3_RUNTIME_ENABLED = 'true';
    process.env.V3_RUNTIME_KILL_SWITCH = 'false';
    process.env.V3_RUNTIME_RELATIONSHIP_GRAPH_ENABLED = 'true';
    process.env.V3_RELATIONSHIP_EDGE_STORAGE_MODE = 'memory';
    process.env.V3_RELATIONSHIP_EDGE_LEDGER_ENABLED = 'true';
    process.env.V3_RELATIONSHIP_GRAPH_QUERY_ENABLED = 'true';
    process.env.V3_RELATIONSHIP_GRAPH_ADMIN_READ_ENABLED = 'true';
    process.env.V3_RELATIONSHIP_EDGE_ANCHOR_STORAGE_MODE = 'memory';
    process.env.V3_RELATIONSHIP_EDGE_ANCHOR_ENABLED = 'true';
    process.env.V3_RELATIONSHIP_EDGE_ANCHOR_MIN_SCORE = '1';
    process.env.V3_RELATIONSHIP_EDGE_ONCHAIN_ENABLED = 'true';
    process.env.V3_RELATIONSHIP_EDGE_ONCHAIN_REQUIRED = 'false';

    resetV3RelationshipEdgeLedgerStoreForTest();
    resetV3RelationshipEdgeAnchorStoreForTest();

    await v3RelationshipEdgeLedgerService.ingestSignals({
      signals: [
        {
          sourceFrogId: 901,
          targetFrogId: 902,
          signalType: 'JOURNEY',
          identityKey: 'admin-route-journey-001',
        },
        {
          sourceFrogId: 901,
          targetFrogId: 902,
          signalType: 'WITNESS',
          identityKey: 'admin-route-witness-001',
        },
      ],
      requestedBy: {
        appId: 'int_rel_main',
        keyId: 'ikey_int_rel_main',
        actor: 'relationship-main:ikey_int_rel_main',
      },
    });

    const graph = await v3RelationshipEdgeLedgerService.getGraphByFrogId({
      frogId: 901,
      scopeAppId: 'int_rel_main',
      limit: 10,
    });
    const edge = graph.edges[0];
    if (!edge) {
      throw new Error('expected seeded relationship edge');
    }

    relationshipEdgeAnchorService.seedEdgeForTest({
      id: edge.id,
      scopeAppId: 'int_rel_main',
      frogId: edge.frogId,
      peerFrogId: edge.peerFrogId,
      score: edge.score,
      signalCount: edge.signalCount,
      journeyCount: edge.signals.journey,
      rescueCount: edge.signals.rescue,
      witnessCount: edge.signals.witness,
      contributionCount: edge.signals.contribution,
      firstOccurredAt: edge.firstOccurredAt,
      lastOccurredAt: edge.lastOccurredAt,
    });

    await relationshipEdgeAnchorService.createAnchorForEdge({
      scopeAppId: 'int_rel_main',
      edgeId: edge.id,
      requestedBy: {
        appId: 'int_rel_main',
        keyId: 'ikey_int_rel_main',
        actor: 'relationship-main:ikey_int_rel_main',
        requestId: 'req-admin-rel-anchor-seed',
      },
    });
  });

  afterAll(() => {
    process.env.V3_RUNTIME_ENABLED = originalEnv.V3_RUNTIME_ENABLED;
    process.env.V3_RUNTIME_KILL_SWITCH = originalEnv.V3_RUNTIME_KILL_SWITCH;
    process.env.V3_RUNTIME_RELATIONSHIP_GRAPH_ENABLED =
      originalEnv.V3_RUNTIME_RELATIONSHIP_GRAPH_ENABLED;
    process.env.V3_RELATIONSHIP_EDGE_STORAGE_MODE = originalEnv.V3_RELATIONSHIP_EDGE_STORAGE_MODE;
    process.env.V3_RELATIONSHIP_EDGE_LEDGER_ENABLED = originalEnv.V3_RELATIONSHIP_EDGE_LEDGER_ENABLED;
    process.env.V3_RELATIONSHIP_GRAPH_QUERY_ENABLED = originalEnv.V3_RELATIONSHIP_GRAPH_QUERY_ENABLED;
    process.env.V3_RELATIONSHIP_GRAPH_ADMIN_READ_ENABLED =
      originalEnv.V3_RELATIONSHIP_GRAPH_ADMIN_READ_ENABLED;
    process.env.V3_RELATIONSHIP_EDGE_ANCHOR_STORAGE_MODE =
      originalEnv.V3_RELATIONSHIP_EDGE_ANCHOR_STORAGE_MODE;
    process.env.V3_RELATIONSHIP_EDGE_ANCHOR_ENABLED = originalEnv.V3_RELATIONSHIP_EDGE_ANCHOR_ENABLED;
    process.env.V3_RELATIONSHIP_EDGE_ANCHOR_MIN_SCORE =
      originalEnv.V3_RELATIONSHIP_EDGE_ANCHOR_MIN_SCORE;
    process.env.V3_RELATIONSHIP_EDGE_ONCHAIN_ENABLED = originalEnv.V3_RELATIONSHIP_EDGE_ONCHAIN_ENABLED;
    process.env.V3_RELATIONSHIP_EDGE_ONCHAIN_REQUIRED =
      originalEnv.V3_RELATIONSHIP_EDGE_ONCHAIN_REQUIRED;
    resetV3RelationshipEdgeLedgerStoreForTest();
    resetV3RelationshipEdgeAnchorStoreForTest();
  });

  it('returns relationship graph read model for admin observability', async () => {
    const response = await request(app)
      .get('/api/admin/v3/relationship-graph/frogs/901')
      .query({
        appId: 'int_rel_main',
        limit: '10',
      })
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      frogId: 901,
      scopeAppId: 'int_rel_main',
      summary: {
        totalEdges: 1,
        totalSignalCount: 2,
        totalScore: 5,
      },
      filters: {
        appId: 'int_rel_main',
        limit: 10,
      },
    });
    expect(response.body.data.edges[0]).toMatchObject({
      peerFrogId: 902,
      score: 5,
      signalCount: 2,
      signals: {
        journey: 1,
        rescue: 0,
        witness: 1,
        contribution: 0,
      },
      anchor: {
        status: 'ANCHORED',
        replayCount: 0,
        lastError: null,
      },
    });
    expect(response.body.data.edges[0]?.anchor?.onchain?.txHash).toBeTruthy();
  });

  it('validates required appId query', async () => {
    const response = await request(app)
      .get('/api/admin/v3/relationship-graph/frogs/901')
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('appId is required');
  });

  it('fails closed across app scope', async () => {
    const response = await request(app)
      .get('/api/admin/v3/relationship-graph/frogs/901')
      .query({
        appId: 'int_rel_other',
      })
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('NOT_FOUND');
  });

  it('fails closed when admin read gate is disabled', async () => {
    process.env.V3_RELATIONSHIP_GRAPH_ADMIN_READ_ENABLED = 'false';

    const response = await request(app)
      .get('/api/admin/v3/relationship-graph/frogs/901')
      .query({
        appId: 'int_rel_main',
      })
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001');

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('RELATIONSHIP_GRAPH_ADMIN_READ_DISABLED');
  });

  it('fails closed when relationship graph runtime module is disabled', async () => {
    process.env.V3_RUNTIME_RELATIONSHIP_GRAPH_ENABLED = 'false';

    const response = await request(app)
      .get('/api/admin/v3/relationship-graph/frogs/901')
      .query({
        appId: 'int_rel_main',
      })
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001');

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('V3_MODULE_DISABLED');
  });
});
