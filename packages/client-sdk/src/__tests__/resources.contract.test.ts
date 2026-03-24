import assert from 'node:assert/strict';
import test from 'node:test';
import { ClientSdkError } from '../core/errors';
import { createHttpClient } from '../core/http';
import { createCouncilResourceClient } from '../resources/council';
import { createCreatorResourceClient } from '../resources/creator';
import { createJourneyResourceClient } from '../resources/journey';
import { createLifeResourceClient } from '../resources/life';
import { createMemoryPalacesResourceClient } from '../resources/memory-palaces';
import { createPartnerResourceClient } from '../resources/partner';
import { createRelationshipGraphResourceClient } from '../resources/relationship-graph';
import { createSocialResourceClient } from '../resources/social';
import { createTravelResourceClient } from '../resources/travel';

test('life resource unwraps envelope from /v1/frogs/:id/life', async () => {
  let capturedUrl = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url) => {
      capturedUrl = String(url);
      return new Response(
        JSON.stringify({
          success: true,
          data: { hunger: 80, happiness: 90 },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const lifeClient = createLifeResourceClient(httpClient);
  const result = await lifeClient.getLife<{ hunger: number; happiness: number }>(42);

  assert.equal(capturedUrl, 'http://localhost:3001/api/v1/frogs/42/life');
  assert.deepEqual(result, { hunger: 80, happiness: 90 });
});

test('travel resource forwards history query params', async () => {
  let capturedUrl = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url) => {
      capturedUrl = String(url);
      return new Response(
        JSON.stringify({
          success: true,
          data: { travels: [], total: 0 },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const travelClient = createTravelResourceClient(httpClient);
  const result = await travelClient.getHistory<{ travels: unknown[]; total: number }>({
    address: '0xabc',
    limit: 5,
    offset: 10,
    frogId: '7',
  });

  assert.equal(
    capturedUrl,
    'http://localhost:3001/api/travels/history?address=0xabc&limit=5&offset=10&frogId=7'
  );
  assert.deepEqual(result, { travels: [], total: 0 });
});

test('travel resource starts v1 travel via /api/v1/travels', async () => {
  let capturedUrl = '';
  let capturedBody = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url, init) => {
      capturedUrl = String(url);
      capturedBody = String(init?.body ?? '');
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            travelId: 101,
            status: 'ACTIVE',
          },
        }),
        {
          status: 201,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const travelClient = createTravelResourceClient(httpClient);
  const result = await travelClient.startV1<{ travelId: number; status: string }>({
    frogId: 7,
    travelType: 'random',
    targetChain: 'ZETACHAIN_ATHENS',
    duration: 1800,
    source: 'desktop_travel_sync',
  });

  assert.equal(capturedUrl, 'http://localhost:3001/api/v1/travels');
  assert.equal(
    capturedBody,
    JSON.stringify({
      frogId: 7,
      travelType: 'random',
      targetChain: 'ZETACHAIN_ATHENS',
      duration: 1800,
      source: 'desktop_travel_sync',
    })
  );
  assert.deepEqual(result, {
    travelId: 101,
    status: 'ACTIVE',
  });
});

test('journey resource gets viewer via /api/v3/journeys/:id/viewer', async () => {
  let capturedUrl = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url) => {
      capturedUrl = String(url);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 'jrn_001',
            progress: {
              totalChapters: 3,
              completionPercent: 33,
            },
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const journeyClient = createJourneyResourceClient(httpClient);
  const result = await journeyClient.getViewer<{
    id: string;
    progress: { totalChapters: number; completionPercent: number };
  }>('jrn_001');

  assert.equal(capturedUrl, 'http://localhost:3001/api/v3/journeys/jrn_001/viewer');
  assert.deepEqual(result, {
    id: 'jrn_001',
    progress: {
      totalChapters: 3,
      completionPercent: 33,
    },
  });
});

test('relationship graph resource gets graph via /api/v3/relationship-graph/frogs/:frogId', async () => {
  let capturedUrl = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url) => {
      capturedUrl = String(url);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            frogId: 901,
            summary: {
              totalEdges: 1,
            },
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const relationshipGraphClient = createRelationshipGraphResourceClient(httpClient);
  const result = await relationshipGraphClient.getFrogGraph<{
    frogId: number;
    summary: { totalEdges: number };
  }>(901, { limit: 10 });

  assert.equal(capturedUrl, 'http://localhost:3001/api/v3/relationship-graph/frogs/901?limit=10');
  assert.deepEqual(result, {
    frogId: 901,
    summary: {
      totalEdges: 1,
    },
  });
});

test('journey resource gets world graph via /api/v3/journeys/:id/world', async () => {
  let capturedUrl = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url) => {
      capturedUrl = String(url);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            journeyId: 'jrn_001',
            nodes: [{ id: 'node_jrn_001_launch' }],
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const journeyClient = createJourneyResourceClient(httpClient);
  const result = await journeyClient.getWorldGraph<{
    journeyId: string;
    nodes: Array<{ id: string }>;
  }>('jrn_001');

  assert.equal(capturedUrl, 'http://localhost:3001/api/v3/journeys/jrn_001/world');
  assert.deepEqual(result, {
    journeyId: 'jrn_001',
    nodes: [{ id: 'node_jrn_001_launch' }],
  });
});

test('journey resource triggers incident via /api/v3/journeys/:id/incidents/trigger', async () => {
  let capturedUrl = '';
  let capturedBody = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url, init) => {
      capturedUrl = String(url);
      capturedBody = String(init?.body ?? '');
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            incident: { id: 'evt_001', status: 'TRIGGERED' },
          },
        }),
        {
          status: 201,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const journeyClient = createJourneyResourceClient(httpClient);
  const result = await journeyClient.triggerIncident<{
    incident: { id: string; status: string };
  }>('jrn_001', {
    template: 'METEOR_RESCUE_NIGHT',
    contextNote: 'meteor cluster detected',
  });

  assert.equal(capturedUrl, 'http://localhost:3001/api/v3/journeys/jrn_001/incidents/trigger');
  assert.equal(
    capturedBody,
    JSON.stringify({
      template: 'METEOR_RESCUE_NIGHT',
      contextNote: 'meteor cluster detected',
    })
  );
  assert.deepEqual(result, {
    incident: { id: 'evt_001', status: 'TRIGGERED' },
  });
});

test('journey resource responds incident via /api/v3/world-events/:id/respond', async () => {
  let capturedUrl = '';
  let capturedBody = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url, init) => {
      capturedUrl = String(url);
      capturedBody = String(init?.body ?? '');
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            incident: { id: 'evt_001', status: 'RESOLVED' },
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const journeyClient = createJourneyResourceClient(httpClient);
  const result = await journeyClient.respondIncident<{
    incident: { id: string; status: string };
  }>('evt_001', {
    decision: 'DEPLOY_RESCUE',
    note: 'send rescue squad',
  });

  assert.equal(capturedUrl, 'http://localhost:3001/api/v3/world-events/evt_001/respond');
  assert.equal(
    capturedBody,
    JSON.stringify({
      decision: 'DEPLOY_RESCUE',
      note: 'send rescue squad',
    })
  );
  assert.deepEqual(result, {
    incident: { id: 'evt_001', status: 'RESOLVED' },
  });
});

test('journey resource advances step via /api/v3/journeys/:id/steps/:step/advance', async () => {
  let capturedUrl = '';
  let capturedBody = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url, init) => {
      capturedUrl = String(url);
      capturedBody = String(init?.body ?? '');
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 'jrn_001',
            currentStepId: 'midpoint',
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const journeyClient = createJourneyResourceClient(httpClient);
  const result = await journeyClient.advanceStep<{ id: string; currentStepId: string }>(
    'jrn_001',
    'launch',
    {
      reason: 'checkpoint reached',
    }
  );

  assert.equal(
    capturedUrl,
    'http://localhost:3001/api/v3/journeys/jrn_001/steps/launch/advance'
  );
  assert.equal(capturedBody, JSON.stringify({ reason: 'checkpoint reached' }));
  assert.deepEqual(result, {
    id: 'jrn_001',
    currentStepId: 'midpoint',
  });
});

test('council resource creates suggestion via /api/v3/council/suggestions', async () => {
  let capturedUrl = '';
  let capturedBody = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url, init) => {
      capturedUrl = String(url);
      capturedBody = String(init?.body ?? '');
      return new Response(
        JSON.stringify({
          success: true,
          data: { id: 'csg_001', status: 'OPEN' },
        }),
        {
          status: 201,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const councilClient = createCouncilResourceClient(httpClient);
  const result = await councilClient.createSuggestion<{ id: string; status: string }>({
    focus: 'meteor rescue',
    objective: 'secure route',
  });

  assert.equal(capturedUrl, 'http://localhost:3001/api/v3/council/suggestions');
  assert.equal(
    capturedBody,
    JSON.stringify({
      focus: 'meteor rescue',
      objective: 'secure route',
    })
  );
  assert.deepEqual(result, {
    id: 'csg_001',
    status: 'OPEN',
  });
});

test('council resource lists suggestions with query params', async () => {
  let capturedUrl = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url) => {
      capturedUrl = String(url);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            total: 1,
            items: [{ id: 'csg_001' }],
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const councilClient = createCouncilResourceClient(httpClient);
  const result = await councilClient.listSuggestions<{
    total: number;
    items: Array<{ id: string }>;
  }>({
    status: 'OPEN',
    limit: 5,
  });

  assert.equal(
    capturedUrl,
    'http://localhost:3001/api/v3/council/suggestions?status=OPEN&limit=5'
  );
  assert.deepEqual(result, {
    total: 1,
    items: [{ id: 'csg_001' }],
  });
});

test('council resource responds suggestion via /api/v3/council/suggestions/:id/respond', async () => {
  let capturedUrl = '';
  let capturedBody = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url, init) => {
      capturedUrl = String(url);
      capturedBody = String(init?.body ?? '');
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 'csg_001',
            status: 'ACCEPTED',
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const councilClient = createCouncilResourceClient(httpClient);
  const result = await councilClient.respondSuggestion<{ id: string; status: string }>(
    'csg_001',
    {
      decision: 'ACCEPT',
      note: 'ship with guardrails',
    }
  );

  assert.equal(
    capturedUrl,
    'http://localhost:3001/api/v3/council/suggestions/csg_001/respond'
  );
  assert.equal(
    capturedBody,
    JSON.stringify({
      decision: 'ACCEPT',
      note: 'ship with guardrails',
    })
  );
  assert.deepEqual(result, {
    id: 'csg_001',
    status: 'ACCEPTED',
  });
});

test('council resource fetches brief via /api/v3/council/brief', async () => {
  let capturedUrl = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url) => {
      capturedUrl = String(url);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 'cbrf_001',
            delivery: {
              status: 'DELIVERED',
            },
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const councilClient = createCouncilResourceClient(httpClient);
  const result = await councilClient.getBrief<{ id: string; delivery: { status: string } }>({
    channel: 'mobile_lite',
  });

  assert.equal(capturedUrl, 'http://localhost:3001/api/v3/council/brief?channel=mobile_lite');
  assert.deepEqual(result, {
    id: 'cbrf_001',
    delivery: {
      status: 'DELIVERED',
    },
  });
});

test('council resource updates brief preferences via /api/v3/council/brief/preferences', async () => {
  let capturedUrl = '';
  let capturedBody = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url, init) => {
      capturedUrl = String(url);
      capturedBody = String(init?.body ?? '');
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            enabled: true,
            channels: {
              desktop: true,
              mobileLite: false,
            },
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const councilClient = createCouncilResourceClient(httpClient);
  const result = await councilClient.updateBriefPreferences<{
    enabled: boolean;
    channels: { desktop: boolean; mobileLite: boolean };
  }>({
    channels: {
      mobileLite: false,
    },
    throttleMs: 300000,
  });

  assert.equal(capturedUrl, 'http://localhost:3001/api/v3/council/brief/preferences');
  assert.equal(
    capturedBody,
    JSON.stringify({
      channels: {
        mobileLite: false,
      },
      throttleMs: 300000,
    })
  );
  assert.deepEqual(result, {
    enabled: true,
    channels: {
      desktop: true,
      mobileLite: false,
    },
  });
});

test('council resource fetches brief preferences via /api/v3/council/brief/preferences', async () => {
  let capturedUrl = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url) => {
      capturedUrl = String(url);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            enabled: false,
            channels: {
              desktop: false,
              mobileLite: true,
            },
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const councilClient = createCouncilResourceClient(httpClient);
  const result = await councilClient.getBriefPreferences<{
    enabled: boolean;
    channels: { desktop: boolean; mobileLite: boolean };
  }>();

  assert.equal(capturedUrl, 'http://localhost:3001/api/v3/council/brief/preferences');
  assert.deepEqual(result, {
    enabled: false,
    channels: {
      desktop: false,
      mobileLite: true,
    },
  });
});

test('creator resource creates asset via /api/v3/creator/assets', async () => {
  let capturedUrl = '';
  let capturedBody = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url, init) => {
      capturedUrl = String(url);
      capturedBody = String(init?.body ?? '');
      return new Response(
        JSON.stringify({
          success: true,
          data: { id: 'cas_001', status: 'READY' },
        }),
        {
          status: 201,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const creatorClient = createCreatorResourceClient(httpClient);
  const result = await creatorClient.createAsset<{ id: string; status: string }>({
    type: 'IMAGE',
    mimeType: 'image/png',
    sourceUrl: 'https://cdn.example.com/assets/frog.png',
    checksum: 'aabbccddeeff00112233445566778899',
    bytes: 2048,
    metadata: {
      width: 512,
      height: 512,
    },
  });

  assert.equal(capturedUrl, 'http://localhost:3001/api/v3/creator/assets');
  assert.equal(
    capturedBody,
    JSON.stringify({
      type: 'IMAGE',
      mimeType: 'image/png',
      sourceUrl: 'https://cdn.example.com/assets/frog.png',
      checksum: 'aabbccddeeff00112233445566778899',
      bytes: 2048,
      metadata: {
        width: 512,
        height: 512,
      },
    })
  );
  assert.deepEqual(result, { id: 'cas_001', status: 'READY' });
});

test('creator resource creates/lists/gets packs through /api/v3/creator/packs*', async () => {
  const capturedUrls: string[] = [];
  const capturedBodies: string[] = [];

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url, init) => {
      capturedUrls.push(String(url));
      capturedBodies.push(String(init?.body ?? ''));
      const path = String(url);

      if (path.includes('/api/v3/creator/packs?')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              total: 1,
              items: [{ id: 'cpk_001', status: 'DRAFT' }],
            },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        );
      }

      if (path.endsWith('/api/v3/creator/packs/cpk_001')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: 'cpk_001',
              slug: 'moonlake-kit',
              assetIds: ['cas_001'],
            },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { id: 'cpk_001', status: 'DRAFT' },
        }),
        {
          status: 201,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const creatorClient = createCreatorResourceClient(httpClient);
  const created = await creatorClient.createPackDraft<{ id: string; status: string }>({
    slug: 'moonlake-kit',
    title: 'Moonlake Kit',
    assetIds: ['cas_001'],
  });
  const listed = await creatorClient.listPacks<{
    total: number;
    items: Array<{ id: string; status: string }>;
  }>({
    status: 'DRAFT',
    limit: 5,
  });
  const detail = await creatorClient.getPackById<{
    id: string;
    slug: string;
    assetIds: string[];
  }>('cpk_001');

  assert.equal(capturedUrls[0], 'http://localhost:3001/api/v3/creator/packs');
  assert.equal(
    capturedBodies[0],
    JSON.stringify({
      slug: 'moonlake-kit',
      title: 'Moonlake Kit',
      assetIds: ['cas_001'],
    })
  );
  assert.equal(capturedUrls[1], 'http://localhost:3001/api/v3/creator/packs?status=DRAFT&limit=5');
  assert.equal(capturedUrls[2], 'http://localhost:3001/api/v3/creator/packs/cpk_001');

  assert.deepEqual(created, { id: 'cpk_001', status: 'DRAFT' });
  assert.deepEqual(listed, {
    total: 1,
    items: [{ id: 'cpk_001', status: 'DRAFT' }],
  });
  assert.deepEqual(detail, {
    id: 'cpk_001',
    slug: 'moonlake-kit',
    assetIds: ['cas_001'],
  });
});

test('creator resource creates/lists/replays license anchors through /api/v3/creator/*license-anchor*', async () => {
  const capturedUrls: string[] = [];
  const capturedBodies: string[] = [];

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url, init) => {
      capturedUrls.push(String(url));
      capturedBodies.push(String(init?.body ?? ''));
      const path = String(url);

      if (path.includes('/api/v3/creator/assets/cas_001/license-anchor?')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              total: 1,
              items: [{ id: 'cab_001', status: 'ANCHORED' }],
            },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        );
      }

      if (path.endsWith('/api/v3/creator/license-anchors/cab_001/replay')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              binding: { id: 'cab_001', status: 'ANCHORED' },
              replayed: true,
              idempotentReplay: false,
            },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            binding: { id: 'cab_001', status: 'ANCHORED' },
            replayed: false,
            idempotentReplay: false,
          },
        }),
        {
          status: 201,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const creatorClient = createCreatorResourceClient(httpClient);
  const created = await creatorClient.createLicenseAnchor<{
    binding: { id: string; status: string };
    replayed: boolean;
    idempotentReplay: boolean;
  }>('cas_001', {
    ownerWallet: '0xabc0000000000000000000000000000000000001',
    issuedAt: '2026-03-24T02:00:00.000Z',
  });

  const listed = await creatorClient.listLicenseAnchors<{
    total: number;
    items: Array<{ id: string; status: string }>;
  }>('cas_001', {
    limit: 5,
  });

  const replayed = await creatorClient.replayLicenseAnchor<{
    binding: { id: string; status: string };
    replayed: boolean;
    idempotentReplay: boolean;
  }>('cab_001', {
    force: true,
  });

  assert.equal(capturedUrls[0], 'http://localhost:3001/api/v3/creator/assets/cas_001/license-anchor');
  assert.equal(
    capturedBodies[0],
    JSON.stringify({
      ownerWallet: '0xabc0000000000000000000000000000000000001',
      issuedAt: '2026-03-24T02:00:00.000Z',
    })
  );
  assert.equal(
    capturedUrls[1],
    'http://localhost:3001/api/v3/creator/assets/cas_001/license-anchor?limit=5'
  );
  assert.equal(
    capturedUrls[2],
    'http://localhost:3001/api/v3/creator/license-anchors/cab_001/replay'
  );
  assert.equal(capturedBodies[2], JSON.stringify({ force: true }));
  assert.equal(created.binding.id, 'cab_001');
  assert.equal(listed.total, 1);
  assert.equal(replayed.replayed, true);
});

test('partner resource creates/lists/gets campaigns through /api/v3/partners/campaigns*', async () => {
  const capturedUrls: string[] = [];
  const capturedBodies: string[] = [];

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url, init) => {
      capturedUrls.push(String(url));
      capturedBodies.push(String(init?.body ?? ''));
      const path = String(url);

      if (path.includes('/api/v3/partners/campaigns?')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              total: 1,
              items: [{ id: 'pcm_001', status: 'DRAFT' }],
            },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        );
      }

      if (path.endsWith('/api/v3/partners/campaigns/pcm_001')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: 'pcm_001',
              slug: 'q2-growth',
              status: 'DRAFT',
            },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { id: 'pcm_001', status: 'DRAFT' },
        }),
        {
          status: 201,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const partnerClient = createPartnerResourceClient(httpClient);
  const created = await partnerClient.createCampaign<{ id: string; status: string }>({
    slug: 'q2-growth',
    title: 'Q2 Growth',
    callback: {
      endpoint: 'https://partner.example.com/callbacks/zfrog',
      secret: 'partner-secret-0123456789',
    },
  });
  const listed = await partnerClient.listCampaigns<{
    total: number;
    items: Array<{ id: string; status: string }>;
  }>({
    status: 'DRAFT',
    limit: 5,
  });
  const detail = await partnerClient.getCampaignById<{
    id: string;
    slug: string;
    status: string;
  }>('pcm_001');

  assert.equal(capturedUrls[0], 'http://localhost:3001/api/v3/partners/campaigns');
  assert.equal(
    capturedBodies[0],
    JSON.stringify({
      slug: 'q2-growth',
      title: 'Q2 Growth',
      callback: {
        endpoint: 'https://partner.example.com/callbacks/zfrog',
        secret: 'partner-secret-0123456789',
      },
    })
  );
  assert.equal(capturedUrls[1], 'http://localhost:3001/api/v3/partners/campaigns?status=DRAFT&limit=5');
  assert.equal(capturedUrls[2], 'http://localhost:3001/api/v3/partners/campaigns/pcm_001');
  assert.deepEqual(created, { id: 'pcm_001', status: 'DRAFT' });
  assert.deepEqual(listed, {
    total: 1,
    items: [{ id: 'pcm_001', status: 'DRAFT' }],
  });
  assert.deepEqual(detail, {
    id: 'pcm_001',
    slug: 'q2-growth',
    status: 'DRAFT',
  });
});

test('partner resource posts lifecycle routes and callback signature headers', async () => {
  const capturedUrls: string[] = [];
  const capturedHeaders: Array<Record<string, string | undefined>> = [];

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url, init) => {
      capturedUrls.push(String(url));
      capturedHeaders.push({
        timestamp:
          (init?.headers as Record<string, string>)?.['x-partner-timestamp'] ||
          (init?.headers as Record<string, string>)?.['X-Partner-Timestamp'],
        signature:
          (init?.headers as Record<string, string>)?.['x-partner-signature'] ||
          (init?.headers as Record<string, string>)?.['X-Partner-Signature'],
      });

      return new Response(
        JSON.stringify({
          success: true,
          data: { ok: true },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const partnerClient = createPartnerResourceClient(httpClient);
  await partnerClient.publishCampaign('pcm_001');
  await partnerClient.pauseCampaign('pcm_001');
  await partnerClient.resumeCampaign('pcm_001');
  await partnerClient.submitCallback(
    'pcm_001',
    {
      partnerEventId: 'evt_001',
      eventType: 'REWARD_GRANTED',
      payload: {
        source: 'partner.rewards',
      },
      reward: {
        recipientWallet: '0xabc0000000000000000000000000000000000001',
        rewardType: 'POINTS',
        amount: '100',
      },
    },
    {
      timestamp: '1711234567',
      value: 'sha256=abc123',
    }
  );

  assert.equal(capturedUrls[0], 'http://localhost:3001/api/v3/partners/campaigns/pcm_001/publish');
  assert.equal(capturedUrls[1], 'http://localhost:3001/api/v3/partners/campaigns/pcm_001/pause');
  assert.equal(capturedUrls[2], 'http://localhost:3001/api/v3/partners/campaigns/pcm_001/resume');
  assert.equal(capturedUrls[3], 'http://localhost:3001/api/v3/partners/campaigns/pcm_001/callbacks');
  assert.equal(capturedHeaders[3]?.timestamp, '1711234567');
  assert.equal(capturedHeaders[3]?.signature, 'sha256=abc123');
});

test('memory palace resource creates world via /api/v3/memory-palaces', async () => {
  let capturedUrl = '';
  let capturedBody = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url, init) => {
      capturedUrl = String(url);
      capturedBody = String(init?.body ?? '');
      return new Response(
        JSON.stringify({
          success: true,
          data: { id: 'mpw_001', journeyId: 'jrn_story_001' },
        }),
        {
          status: 201,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const memoryClient = createMemoryPalacesResourceClient(httpClient);
  const result = await memoryClient.createWorld<{ id: string; journeyId: string }>({
    journeyId: 'jrn_story_001',
    title: 'Moonlake Witness Hall',
  });

  assert.equal(capturedUrl, 'http://localhost:3001/api/v3/memory-palaces');
  assert.equal(
    capturedBody,
    JSON.stringify({
      journeyId: 'jrn_story_001',
      title: 'Moonlake Witness Hall',
    })
  );
  assert.deepEqual(result, { id: 'mpw_001', journeyId: 'jrn_story_001' });
});

test('memory palace resource lists published templates via /api/v3/memory-palaces/templates', async () => {
  let capturedUrl = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url) => {
      capturedUrl = String(url);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            total: 1,
            items: [{ id: 'mpt_001', slug: 'moonlake-celadon' }],
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const memoryClient = createMemoryPalacesResourceClient(httpClient);
  const result = await memoryClient.listTemplates<{
    total: number;
    items: Array<{ id: string; slug: string }>;
  }>({ limit: 12 });

  assert.equal(capturedUrl, 'http://localhost:3001/api/v3/memory-palaces/templates?limit=12');
  assert.deepEqual(result, {
    total: 1,
    items: [{ id: 'mpt_001', slug: 'moonlake-celadon' }],
  });
});

test('memory palace resource lists own templates via /api/v3/memory-palaces/templates/mine', async () => {
  let capturedUrl = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url) => {
      capturedUrl = String(url);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            total: 1,
            items: [{ id: 'mpt_001', status: 'IN_REVIEW' }],
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const memoryClient = createMemoryPalacesResourceClient(httpClient);
  const result = await memoryClient.listMyTemplates<{
    total: number;
    items: Array<{ id: string; status: string }>;
  }>({
    status: 'IN_REVIEW',
    limit: 5,
  });

  assert.equal(
    capturedUrl,
    'http://localhost:3001/api/v3/memory-palaces/templates/mine?status=IN_REVIEW&limit=5'
  );
  assert.deepEqual(result, {
    total: 1,
    items: [{ id: 'mpt_001', status: 'IN_REVIEW' }],
  });
});

test('memory palace resource creates template via /api/v3/memory-palaces/templates', async () => {
  let capturedUrl = '';
  let capturedBody = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url, init) => {
      capturedUrl = String(url);
      capturedBody = String(init?.body ?? '');
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 'mpt_001',
            slug: 'moonlake-celadon',
          },
        }),
        {
          status: 201,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const memoryClient = createMemoryPalacesResourceClient(httpClient);
  const result = await memoryClient.createTemplate<{
    id: string;
    slug: string;
  }>({
    slug: 'moonlake-celadon',
    name: 'Moonlake Celadon',
    summary: 'A cool-toned witness hall preset.',
    theme: {
      palette: {
        background: '#ecfeff',
        surface: '#ffffff',
        accent: '#0ea5e9',
        text: '#0f172a',
      },
      badgeLabel: 'Moonlake',
      coverImageUrl: 'https://cdn.zfrog.local/templates/moonlake.jpg',
    },
  });

  assert.equal(capturedUrl, 'http://localhost:3001/api/v3/memory-palaces/templates');
  assert.equal(
    capturedBody,
    JSON.stringify({
      slug: 'moonlake-celadon',
      name: 'Moonlake Celadon',
      summary: 'A cool-toned witness hall preset.',
      theme: {
        palette: {
          background: '#ecfeff',
          surface: '#ffffff',
          accent: '#0ea5e9',
          text: '#0f172a',
        },
        badgeLabel: 'Moonlake',
        coverImageUrl: 'https://cdn.zfrog.local/templates/moonlake.jpg',
      },
    })
  );
  assert.deepEqual(result, {
    id: 'mpt_001',
    slug: 'moonlake-celadon',
  });
});

test('memory palace resource submits template review via /api/v3/memory-palaces/templates/:id/submit-review', async () => {
  let capturedUrl = '';
  let capturedBody = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url, init) => {
      capturedUrl = String(url);
      capturedBody = String(init?.body ?? '');
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 'mpt_001',
            status: 'IN_REVIEW',
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const memoryClient = createMemoryPalacesResourceClient(httpClient);
  const result = await memoryClient.submitTemplateForReview<{
    id: string;
    status: string;
  }>('mpt_001', {
    note: 'requesting review',
  });

  assert.equal(
    capturedUrl,
    'http://localhost:3001/api/v3/memory-palaces/templates/mpt_001/submit-review'
  );
  assert.equal(capturedBody, JSON.stringify({ note: 'requesting review' }));
  assert.deepEqual(result, {
    id: 'mpt_001',
    status: 'IN_REVIEW',
  });
});

test('memory palace resource fetches world via /api/v3/memory-palaces/:worldId', async () => {
  let capturedUrl = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url) => {
      capturedUrl = String(url);
      return new Response(
        JSON.stringify({
          success: true,
          data: { id: 'mpw_001', title: 'Moonlake Witness Hall' },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const memoryClient = createMemoryPalacesResourceClient(httpClient);
  const result = await memoryClient.getWorldById<{ id: string; title: string }>('mpw_001');

  assert.equal(capturedUrl, 'http://localhost:3001/api/v3/memory-palaces/mpw_001');
  assert.deepEqual(result, {
    id: 'mpw_001',
    title: 'Moonlake Witness Hall',
  });
});

test('memory palace resource adds contribution via /api/v3/memory-palaces/:worldId/contributions', async () => {
  let capturedUrl = '';
  let capturedBody = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url, init) => {
      capturedUrl = String(url);
      capturedBody = String(init?.body ?? '');
      return new Response(
        JSON.stringify({
          success: true,
          data: { id: 'mpw_001', metrics: { contributionCount: 2 } },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const memoryClient = createMemoryPalacesResourceClient(httpClient);
  const result = await memoryClient.addContribution<{ id: string; metrics: { contributionCount: number } }>(
    'mpw_001',
    {
      type: 'WITNESS_NOTE',
      content: 'Left a witness note near the gate.',
      metadata: {
        lane: 'north',
      },
    }
  );

  assert.equal(capturedUrl, 'http://localhost:3001/api/v3/memory-palaces/mpw_001/contributions');
  assert.equal(
    capturedBody,
    JSON.stringify({
      type: 'WITNESS_NOTE',
      content: 'Left a witness note near the gate.',
      metadata: {
        lane: 'north',
      },
    })
  );
  assert.deepEqual(result, {
    id: 'mpw_001',
    metrics: { contributionCount: 2 },
  });
});

test('memory palace resource lists visits via /api/v3/memory-palaces/:worldId/visits', async () => {
  let capturedUrl = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url) => {
      capturedUrl = String(url);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            worldId: 'mpw_001',
            total: 1,
            featuredCount: 0,
            items: [],
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const memoryClient = createMemoryPalacesResourceClient(httpClient);
  const result = await memoryClient.listVisits<{
    worldId: string;
    total: number;
    featuredCount: number;
    items: unknown[];
  }>('mpw_001', { limit: 25 });

  assert.equal(capturedUrl, 'http://localhost:3001/api/v3/memory-palaces/mpw_001/visits?limit=25');
  assert.deepEqual(result, {
    worldId: 'mpw_001',
    total: 1,
    featuredCount: 0,
    items: [],
  });
});

test('memory palace resource adds visit via /api/v3/memory-palaces/:worldId/visits', async () => {
  let capturedUrl = '';
  let capturedBody = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url, init) => {
      capturedUrl = String(url);
      capturedBody = String(init?.body ?? '');
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 'mpv_001',
            entryType: 'WITNESS',
          },
        }),
        {
          status: 201,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const memoryClient = createMemoryPalacesResourceClient(httpClient);
  const result = await memoryClient.addVisit<{ id: string; entryType: string }>('mpw_001', {
    entryType: 'WITNESS',
    message: 'Signed the witness board.',
    metadata: {
      lane: 'west',
    },
  });

  assert.equal(capturedUrl, 'http://localhost:3001/api/v3/memory-palaces/mpw_001/visits');
  assert.equal(
    capturedBody,
    JSON.stringify({
      entryType: 'WITNESS',
      message: 'Signed the witness board.',
      metadata: {
        lane: 'west',
      },
    })
  );
  assert.deepEqual(result, {
    id: 'mpv_001',
    entryType: 'WITNESS',
  });
});

test('travel resource completes v1 travel via /api/v1/travels/:id/complete', async () => {
  let capturedUrl = '';
  let capturedBody = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url, init) => {
      capturedUrl = String(url);
      capturedBody = String(init?.body ?? '');
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 101,
            status: 'COMPLETED',
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const travelClient = createTravelResourceClient(httpClient);
  const result = await travelClient.completeV1<{ id: number; status: string }>(101, {
    source: 'desktop_travel_sync',
  });

  assert.equal(capturedUrl, 'http://localhost:3001/api/v1/travels/101/complete');
  assert.equal(capturedBody, JSON.stringify({ source: 'desktop_travel_sync' }));
  assert.deepEqual(result, {
    id: 101,
    status: 'COMPLETED',
  });
});

test('social resource throws ClientSdkError for failure envelope', async () => {
  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async () => {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'SOCIAL_DISABLED', message: 'social disabled' },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const socialClient = createSocialResourceClient(httpClient);

  await assert.rejects(
    () => socialClient.getStatus(),
    (error: unknown) => {
      assert.ok(error instanceof ClientSdkError);
      assert.equal((error as ClientSdkError).code, 'SOCIAL_DISABLED');
      assert.equal((error as ClientSdkError).message, 'social disabled');
      return true;
    }
  );
});

test('social resource joins community via /api/v2/communities/:communityId/join', async () => {
  let capturedUrl = '';
  let capturedBody = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url, init) => {
      capturedUrl = String(url);
      capturedBody = String(init?.body ?? '');
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            community: { id: 'cm_001', memberCount: 2 },
            membership: { frogId: 7, role: 'member' },
          },
        }),
        {
          status: 201,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const socialClient = createSocialResourceClient(httpClient);
  const result = await socialClient.joinCommunity<{
    community: { id: string; memberCount: number };
    membership: { frogId: number; role: string };
  }>('cm_001', {
    frogId: 7,
  });

  assert.equal(capturedUrl, 'http://localhost:3001/api/v2/communities/cm_001/join');
  assert.equal(capturedBody, JSON.stringify({ frogId: 7 }));
  assert.deepEqual(result, {
    community: { id: 'cm_001', memberCount: 2 },
    membership: { frogId: 7, role: 'member' },
  });
});

test('social resource creates family via /api/v2/families', async () => {
  let capturedUrl = '';
  let capturedBody = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url, init) => {
      capturedUrl = String(url);
      capturedBody = String(init?.body ?? '');
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 88,
            name: 'River Keepers',
          },
        }),
        {
          status: 201,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const socialClient = createSocialResourceClient(httpClient);
  const result = await socialClient.createFamily<{ id: number; name: string }>({
    name: 'River Keepers',
    ownerFrogId: 7,
    goal: 'Discover all portals',
    visibility: 'friends',
  });

  assert.equal(capturedUrl, 'http://localhost:3001/api/v2/families');
  assert.equal(
    capturedBody,
    JSON.stringify({
      name: 'River Keepers',
      ownerFrogId: 7,
      goal: 'Discover all portals',
      visibility: 'friends',
    })
  );
  assert.deepEqual(result, {
    id: 88,
    name: 'River Keepers',
  });
});

test('social resource forwards community member limit query', async () => {
  let capturedUrl = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url) => {
      capturedUrl = String(url);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            communityId: 'cm_001',
            memberCount: 1,
            members: [],
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const socialClient = createSocialResourceClient(httpClient);
  const result = await socialClient.listCommunityMembers<{
    communityId: string;
    memberCount: number;
    members: unknown[];
  }>('cm_001', {
    limit: 15,
  });

  assert.equal(capturedUrl, 'http://localhost:3001/api/v2/communities/cm_001/members?limit=15');
  assert.deepEqual(result, {
    communityId: 'cm_001',
    memberCount: 1,
    members: [],
  });
});

test('social resource creates relationship attestation via /api/v2/attestations/relationship', async () => {
  let capturedUrl = '';
  let capturedBody = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url, init) => {
      capturedUrl = String(url);
      capturedBody = String(init?.body ?? '');
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 'att_001',
            status: 'QUEUED',
          },
        }),
        {
          status: 201,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const socialClient = createSocialResourceClient(httpClient);
  const result = await socialClient.createRelationshipAttestation<{ id: string; status: string }>({
    subjectFrogId: 7,
    objectFrogId: 8,
    attestationType: 'bond',
    source: 'web-social-v2',
    evidence: { channel: 'web' },
  });

  assert.equal(capturedUrl, 'http://localhost:3001/api/v2/attestations/relationship');
  assert.equal(
    capturedBody,
    JSON.stringify({
      subjectFrogId: 7,
      objectFrogId: 8,
      attestationType: 'bond',
      source: 'web-social-v2',
      evidence: { channel: 'web' },
    })
  );
  assert.deepEqual(result, {
    id: 'att_001',
    status: 'QUEUED',
  });
});

test('social resource submits attestation onchain via /api/v2/attestations/relationship/:id/submit-onchain', async () => {
  let capturedUrl = '';
  let capturedBody = '';

  const httpClient = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (url, init) => {
      capturedUrl = String(url);
      capturedBody = String(init?.body ?? '');
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            txHash: '0xabc',
            status: 'PENDING_ONCHAIN',
          },
        }),
        {
          status: 202,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const socialClient = createSocialResourceClient(httpClient);
  const result = await socialClient.submitRelationshipAttestationOnchain<{
    txHash: string;
    status: string;
  }>('att_001', { force: true });

  assert.equal(
    capturedUrl,
    'http://localhost:3001/api/v2/attestations/relationship/att_001/submit-onchain'
  );
  assert.equal(capturedBody, JSON.stringify({ force: true }));
  assert.deepEqual(result, {
    txHash: '0xabc',
    status: 'PENDING_ONCHAIN',
  });
});
