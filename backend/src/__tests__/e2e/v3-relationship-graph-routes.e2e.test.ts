import express from 'express';
import request from 'supertest';
import v3Routes from '../../api/routes/v3';
import { errorHandler, notFoundHandler } from '../../middlewares/errorHandler';
import { integrationRegistryService } from '../../platform/integrations/integration-registry.service';
import {
  resetV3RelationshipEdgeLedgerStoreForTest,
  v3RelationshipEdgeLedgerService,
} from '../../modules/relationship-graph/relationship-edge-ledger.service';
import {
  relationshipEdgeAnchorService,
  resetV3RelationshipEdgeAnchorStoreForTest,
} from '../../modules/relationship-graph/relationship-edge-anchor.service';
import type {
  AuthenticatedIntegrationContext,
  IntegrationPermissionValue,
} from '../../platform/integrations/integration-registry.service';

jest.mock('../../platform/integrations/integration-registry.service', () => ({
  integrationRegistryService: {
    authenticateKey: jest.fn(),
  },
}));

const buildIntegrationContext = (input: {
  appId: string;
  appSlug: string;
  permissions: IntegrationPermissionValue[];
}): AuthenticatedIntegrationContext => ({
  app: {
    id: input.appId,
    slug: input.appSlug,
    name: 'Relationship Graph App',
    appType: 'INTERNAL',
    status: 'ACTIVE',
  },
  key: {
    id: `ikey_${input.appId}`,
    keyPrefix: 'zfi_relgraph',
    label: 'relationship-graph',
    status: 'ACTIVE',
    issuedBy: '0xabc0000000000000000000000000000000000001',
    issuedAt: '2026-03-24T04:00:00.000Z',
    expiresAt: null,
    lastUsedAt: '2026-03-24T04:01:00.000Z',
  },
  permissions: input.permissions,
});

describe('V3 Relationship Graph Routes E2E', () => {
  const app = express();
  const mockRegistry = integrationRegistryService as jest.Mocked<typeof integrationRegistryService>;
  const originalEnv = {
    V3_RUNTIME_ENABLED: process.env.V3_RUNTIME_ENABLED,
    V3_RUNTIME_KILL_SWITCH: process.env.V3_RUNTIME_KILL_SWITCH,
    V3_RUNTIME_RELATIONSHIP_GRAPH_ENABLED: process.env.V3_RUNTIME_RELATIONSHIP_GRAPH_ENABLED,
    V3_RELATIONSHIP_EDGE_STORAGE_MODE: process.env.V3_RELATIONSHIP_EDGE_STORAGE_MODE,
    V3_RELATIONSHIP_EDGE_LEDGER_ENABLED: process.env.V3_RELATIONSHIP_EDGE_LEDGER_ENABLED,
    V3_RELATIONSHIP_GRAPH_QUERY_ENABLED: process.env.V3_RELATIONSHIP_GRAPH_QUERY_ENABLED,
    V3_RELATIONSHIP_EDGE_ANCHOR_STORAGE_MODE: process.env.V3_RELATIONSHIP_EDGE_ANCHOR_STORAGE_MODE,
    V3_RELATIONSHIP_EDGE_ANCHOR_ENABLED: process.env.V3_RELATIONSHIP_EDGE_ANCHOR_ENABLED,
    V3_RELATIONSHIP_EDGE_ANCHOR_MIN_SCORE: process.env.V3_RELATIONSHIP_EDGE_ANCHOR_MIN_SCORE,
    V3_RELATIONSHIP_EDGE_ONCHAIN_ENABLED: process.env.V3_RELATIONSHIP_EDGE_ONCHAIN_ENABLED,
    V3_RELATIONSHIP_EDGE_ONCHAIN_REQUIRED: process.env.V3_RELATIONSHIP_EDGE_ONCHAIN_REQUIRED,
  };

  app.use(express.json());
  app.use('/api/v3', v3Routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  beforeEach(async () => {
    process.env.V3_RUNTIME_ENABLED = 'true';
    process.env.V3_RUNTIME_KILL_SWITCH = 'false';
    process.env.V3_RUNTIME_RELATIONSHIP_GRAPH_ENABLED = 'true';
    process.env.V3_RELATIONSHIP_EDGE_STORAGE_MODE = 'memory';
    process.env.V3_RELATIONSHIP_EDGE_LEDGER_ENABLED = 'true';
    process.env.V3_RELATIONSHIP_GRAPH_QUERY_ENABLED = 'true';
    process.env.V3_RELATIONSHIP_EDGE_ANCHOR_STORAGE_MODE = 'memory';
    process.env.V3_RELATIONSHIP_EDGE_ANCHOR_ENABLED = 'true';
    process.env.V3_RELATIONSHIP_EDGE_ANCHOR_MIN_SCORE = '1';
    process.env.V3_RELATIONSHIP_EDGE_ONCHAIN_ENABLED = 'true';
    process.env.V3_RELATIONSHIP_EDGE_ONCHAIN_REQUIRED = 'false';

    resetV3RelationshipEdgeLedgerStoreForTest();
    resetV3RelationshipEdgeAnchorStoreForTest();
    jest.clearAllMocks();

    mockRegistry.authenticateKey.mockImplementation(async (secret) => {
      const key = String(secret);
      if (key.startsWith('zfi_other')) {
        return buildIntegrationContext({
          appId: 'int_rel_other',
          appSlug: 'relationship-other',
          permissions: ['relationship_graph.read'],
        });
      }

      if (key.startsWith('zfi_denied')) {
        return buildIntegrationContext({
          appId: 'int_rel_main',
          appSlug: 'relationship-main',
          permissions: ['journey.read'],
        });
      }

      return buildIntegrationContext({
        appId: 'int_rel_main',
        appSlug: 'relationship-main',
        permissions: ['relationship_graph.read'],
      });
    });

    await v3RelationshipEdgeLedgerService.ingestSignals({
      signals: [
        {
          sourceFrogId: 901,
          targetFrogId: 902,
          signalType: 'JOURNEY',
          identityKey: 'route-journey-001',
        },
        {
          sourceFrogId: 902,
          targetFrogId: 901,
          signalType: 'RESCUE',
          identityKey: 'route-rescue-001',
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
        requestId: 'req-rel-anchor-seed',
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

  it('returns scoped graph read model for frog id', async () => {
    const response = await request(app)
      .get('/api/v3/relationship-graph/frogs/901')
      .set('x-api-key', 'zfi_relgraph.main.secret')
      .query({ limit: 10 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      frogId: 901,
      scopeAppId: 'int_rel_main',
      summary: {
        totalEdges: 1,
        totalSignalCount: 2,
        totalScore: 7,
      },
    });
    expect(response.body.data.edges[0]).toMatchObject({
      peerFrogId: 902,
      signalCount: 2,
      score: 7,
      signals: {
        journey: 1,
        rescue: 1,
        witness: 0,
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

  it('fails closed across app scope', async () => {
    const response = await request(app)
      .get('/api/v3/relationship-graph/frogs/901')
      .set('x-api-key', 'zfi_other.scope.secret');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('requires relationship graph read permission', async () => {
    const response = await request(app)
      .get('/api/v3/relationship-graph/frogs/901')
      .set('x-api-key', 'zfi_denied.scope.secret');

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INTEGRATION_PERMISSION_DENIED');
  });

  it('fails closed when relationship graph runtime module is disabled', async () => {
    process.env.V3_RUNTIME_RELATIONSHIP_GRAPH_ENABLED = 'false';

    const response = await request(app)
      .get('/api/v3/relationship-graph/frogs/901')
      .set('x-api-key', 'zfi_relgraph.main.secret');

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('V3_MODULE_DISABLED');
  });
});
