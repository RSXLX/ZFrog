import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';
import {
  createApiEnvelopeSchema,
  domainEventSchema,
  integrationAppReadModelSchema,
  integrationRegistryCatalogSchema,
  isApiFailureEnvelope,
  isApiSuccessEnvelope,
  v3CreatorAssetListReadModelSchema,
  v3CreatorCreateAssetPayloadSchema,
  v3CreatorCreateLicenseAnchorPayloadSchema,
  v3CreatorCreatePackPayloadSchema,
  v3CreatorLicenseAnchorMutationResultSchema,
  v3CreatorLicenseBindingListReadModelSchema,
  v3CreatorPackReadModelSchema,
  v3CreatorReplayLicenseAnchorPayloadSchema,
  v3CouncilBriefPreferencesReadModelSchema,
  v3CouncilBriefReadModelSchema,
  v3CouncilSuggestionListReadModelSchema,
  v3JourneyIncidentReadModelSchema,
  v3JourneyIncidentRespondResultSchema,
  v3JourneyReadModelSchema,
  v3JourneyWorldGraphReadModelSchema,
  v3JourneyViewerReadModelSchema,
  v3MemoryPalaceAddCollaboratorPayloadSchema,
  v3MemoryPalaceAddContributionPayloadSchema,
  v3MemoryPalaceAddVisitPayloadSchema,
  v3MemoryPalaceCreateTemplatePayloadSchema,
  v3MemoryPalaceCreateWorldPayloadSchema,
  v3MemoryPalaceReviewTemplatePayloadSchema,
  v3MemoryPalaceSubmitTemplateReviewPayloadSchema,
  v3MemoryPalaceTemplateListReadModelSchema,
  v3MemoryPalaceToggleTemplateFeaturePayloadSchema,
  v3MemoryPalaceVisitListReadModelSchema,
  v3MemoryPalaceWorldReadModelSchema,
  v3PartnerCallbackPayloadSchema,
  v3PartnerCampaignReadModelSchema,
  v3PartnerCreateCampaignPayloadSchema,
  v3PartnerRewardReadModelSchema,
  v3RelationshipGraphReadModelSchema,
  v3RuntimeStatusSchema,
  v3RuntimeStatusViewSchema,
} from '../index';

test('api envelope contract: success payload can be parsed', () => {
  const schema = createApiEnvelopeSchema(
    z.object({
      id: z.number().int(),
      status: z.string(),
    })
  );

  const payload = {
    success: true,
    data: { id: 7, status: 'ok' },
    meta: { requestId: 'req-1', timestamp: '2026-03-22T00:00:00.000Z' },
  };

  const parsed = schema.parse(payload);
  assert.equal(parsed.success, true);
  assert.equal(isApiSuccessEnvelope(parsed), true);
});

test('api envelope contract: failure payload can be parsed', () => {
  const schema = createApiEnvelopeSchema(z.unknown());

  const payload = {
    success: false,
    error: { code: 'INVALID_INPUT', message: 'field is required' },
    meta: { requestId: 'req-2' },
  };

  const parsed = schema.parse(payload);
  assert.equal(parsed.success, false);
  assert.equal(isApiFailureEnvelope(parsed), true);
});

test('domain event contract: required fields are enforced', () => {
  const parsed = domainEventSchema.parse({
    eventName: 'FamilyCreated',
    eventVersion: 1,
    source: 'v2-social',
    occurredAt: '2026-03-22T00:00:00.000Z',
    payload: { familyId: 101 },
  });

  assert.equal(parsed.eventName, 'FamilyCreated');
  assert.equal(parsed.eventVersion, 1);
});

test('v3 runtime contract: runtime status can be parsed', () => {
  const parsed = v3RuntimeStatusSchema.parse({
    enabled: false,
    effectiveEnabled: false,
    killSwitchActive: true,
    env: {
      enabled: false,
      killSwitchActive: false,
    },
    override: {
      active: true,
      updatedAt: '2026-03-23T00:00:00.000Z',
      updatedBy: '0xabc0000000000000000000000000000000000001',
      reason: 'manual-safety-stop',
    },
    modules: [
      {
        module: 'journey',
        envEnabled: true,
        overrideEnabled: true,
        effectiveEnabled: false,
        reason: 'kill_switch_active',
      },
    ],
    moduleOverrides: [
      {
        module: 'journey',
        enabled: true,
        updatedAt: null,
        updatedBy: null,
        reason: null,
      },
    ],
  });

  assert.equal(parsed.killSwitchActive, true);
  assert.equal(parsed.modules[0]?.module, 'journey');
});

test('v3 relationship graph contract: graph read model can be parsed', () => {
  const parsed = v3RelationshipGraphReadModelSchema.parse({
    frogId: 901,
    scopeAppId: 'int_rel_main',
    generatedAt: '2026-03-24T05:00:00.000Z',
    summary: {
      totalEdges: 1,
      totalSignalCount: 2,
      totalScore: 7,
    },
    nodes: [
      {
        frogId: 901,
        role: 'ROOT',
        rank: 0,
        score: 7,
        signalCount: 2,
        lastOccurredAt: '2026-03-24T04:59:00.000Z',
      },
      {
        frogId: 902,
        role: 'PEER',
        rank: 1,
        score: 7,
        signalCount: 2,
        lastOccurredAt: '2026-03-24T04:59:00.000Z',
      },
    ],
    edges: [
      {
        id: 'reg_abc123',
        frogId: 901,
        peerFrogId: 902,
        sourceFrogId: 901,
        targetFrogId: 902,
        score: 7,
        signalCount: 2,
        strength: 'MEDIUM',
        firstOccurredAt: '2026-03-24T04:40:00.000Z',
        lastOccurredAt: '2026-03-24T04:59:00.000Z',
        signals: {
          journey: 1,
          rescue: 1,
          witness: 0,
          contribution: 0,
        },
        anchor: {
          id: 'rea_abc123',
          status: 'ANCHORED',
          replayCount: 0,
          lastError: null,
          anchoredAt: '2026-03-24T05:00:00.000Z',
          onchain: {
            required: false,
            enabled: true,
            anchored: true,
            anchorId: 'orea_abc123',
            chainId: 7000,
            txHash: '0xabc123',
            blockNumber: '9100001',
          },
        },
      },
    ],
    snapshot: {
      id: 'rgs_abc123',
      scopeAppId: 'int_rel_main',
      frogId: 901,
      version: 1,
      computedAt: '2026-03-24T05:00:00.000Z',
      totalEdges: 1,
      totalScore: 7,
      strongestPeerFrogId: 902,
      strongestScore: 7,
      digest: '6f35a1d7f9f4d9c37ec6d6a7f0f42ef8c9acde01',
    },
  });

  assert.equal(parsed.summary.totalEdges, 1);
  assert.equal(parsed.edges[0]?.signals.rescue, 1);
  assert.equal(parsed.snapshot.strongestPeerFrogId, 902);
});

test('v3 runtime contract: runtime access view can be parsed', () => {
  const parsed = v3RuntimeStatusViewSchema.parse({
    enabled: true,
    effectiveEnabled: true,
    killSwitchActive: false,
    env: {
      enabled: true,
      killSwitchActive: false,
    },
    override: {
      active: false,
      updatedAt: null,
      updatedBy: null,
      reason: null,
    },
    modules: [
      {
        module: 'journey',
        envEnabled: true,
        overrideEnabled: true,
        effectiveEnabled: true,
        reason: 'enabled',
      },
    ],
    moduleOverrides: [
      {
        module: 'journey',
        enabled: true,
        updatedAt: null,
        updatedBy: null,
        reason: null,
      },
    ],
    access: {
      app: {
        id: 'int_001',
        slug: 'seasonal-world-lab',
        name: 'Seasonal World Lab',
        appType: 'CREATOR',
        status: 'ACTIVE',
      },
      key: {
        id: 'ikey_001',
        keyPrefix: 'zfi_abc123',
        label: 'preview',
        status: 'ACTIVE',
        issuedBy: '0xabc0000000000000000000000000000000000001',
        issuedAt: '2026-03-23T00:00:00.000Z',
        expiresAt: null,
        lastUsedAt: '2026-03-23T00:10:00.000Z',
      },
      permissions: ['runtime.read', 'journey.read'],
      hasRuntimeRead: true,
      moduleCapabilities: [
        {
          module: 'journey',
          grantedPermissions: ['journey.read'],
          canRead: true,
          canWrite: false,
          runtimeEnabled: true,
          runtimeReason: 'enabled',
        },
      ],
    },
  });

  assert.equal(parsed.access.hasRuntimeRead, true);
  assert.equal(parsed.access.moduleCapabilities[0]?.module, 'journey');
});

test('integration contract: app read model can be parsed', () => {
  const parsed = integrationAppReadModelSchema.parse({
    id: 'int_001',
    slug: 'seasonal-world-lab',
    name: 'Seasonal World Lab',
    appType: 'CREATOR',
    status: 'ACTIVE',
    permissions: ['memory.write', 'creator.pack.write'],
    metadata: {
      region: 'global',
    },
    createdAt: '2026-03-23T00:00:00.000Z',
    updatedAt: '2026-03-23T00:00:00.000Z',
    keys: [
      {
        id: 'ikey_001',
        keyPrefix: 'zfi_abc123',
        label: 'preview',
        status: 'ACTIVE',
        issuedBy: '0xabc0000000000000000000000000000000000001',
        issuedAt: '2026-03-23T00:00:00.000Z',
        revokedAt: null,
        expiresAt: null,
        lastUsedAt: null,
        createdAt: '2026-03-23T00:00:00.000Z',
        updatedAt: '2026-03-23T00:00:00.000Z',
      },
    ],
  });

  assert.equal(parsed.appType, 'CREATOR');
  assert.equal(parsed.permissions[0], 'memory.write');
});

test('integration contract: registry catalog can be parsed', () => {
  const parsed = integrationRegistryCatalogSchema.parse({
    appTypes: ['INTERNAL', 'CREATOR', 'PARTNER', 'PLUGIN'],
    appStatuses: ['ACTIVE', 'DISABLED'],
    keyStatuses: ['ACTIVE', 'REVOKED', 'EXPIRED'],
    permissions: ['runtime.read', 'memory.write'],
  });

  assert.equal(parsed.permissions[1], 'memory.write');
});

test('v3 creator contract: asset list and pack read model can be parsed', () => {
  const assets = v3CreatorAssetListReadModelSchema.parse({
    total: 1,
    items: [
      {
        id: 'cas_abc123',
        creatorAppId: 'int_001',
        type: 'IMAGE',
        mimeType: 'image/png',
        sourceUrl: 'https://cdn.example.com/assets/frog.png',
        checksum: 'aabbccddeeff00112233445566778899',
        bytes: 2048,
        status: 'READY',
        metadata: {
          width: 512,
          height: 512,
        },
        preview: {
          validatorVersion: 'v3-creator-preview-v1',
          acceptedMimeTypes: ['image/png', 'image/jpeg'],
          maxBytes: 8388608,
          checksumAlgorithm: 'sha256',
        },
        createdAt: '2026-03-24T00:00:00.000Z',
        updatedAt: '2026-03-24T00:00:00.000Z',
        audit: {
          createdByKeyId: 'ikey_001',
          createdByActor: 'creator-lab:ikey_001',
          requestId: 'req_creator_asset_001',
        },
      },
    ],
  });

  const pack = v3CreatorPackReadModelSchema.parse({
    id: 'cpk_abc123',
    creatorAppId: 'int_001',
    slug: 'moonlake-skyline-kit',
    title: 'Moonlake Skyline Kit',
    summary: 'Starter world pack assets.',
    status: 'DRAFT',
    previewState: 'READY',
    assetIds: ['cas_abc123'],
    assetCount: 1,
    createdAt: '2026-03-24T00:00:00.000Z',
    updatedAt: '2026-03-24T00:00:00.000Z',
    audit: {
      createdByKeyId: 'ikey_001',
      createdByActor: 'creator-lab:ikey_001',
      requestId: 'req_creator_pack_001',
    },
  });

  assert.equal(assets.total, 1);
  assert.equal(pack.status, 'DRAFT');
  assert.equal(pack.assetIds[0], 'cas_abc123');
});

test('v3 creator contract: create payload schemas can be parsed', () => {
  const assetPayload = v3CreatorCreateAssetPayloadSchema.parse({
    type: 'IMAGE',
    mimeType: 'image/png',
    sourceUrl: 'https://cdn.example.com/assets/frog.png',
    checksum: 'aabbccddeeff00112233445566778899',
    bytes: 1024,
    metadata: {
      width: 512,
      height: 512,
    },
  });

  const packPayload = v3CreatorCreatePackPayloadSchema.parse({
    slug: 'moonlake-skyline-kit',
    title: 'Moonlake Skyline Kit',
    summary: 'draft',
    assetIds: ['cas_abc123'],
  });

  assert.equal(assetPayload.type, 'IMAGE');
  assert.equal(packPayload.assetIds[0], 'cas_abc123');
});

test('v3 creator contract: license anchor payload and read models can be parsed', () => {
  const createPayload = v3CreatorCreateLicenseAnchorPayloadSchema.parse({
    ownerWallet: '0xabc0000000000000000000000000000000000001',
    issuedAt: '2026-03-24T02:00:00.000Z',
  });

  const replayPayload = v3CreatorReplayLicenseAnchorPayloadSchema.parse({
    force: true,
  });

  const list = v3CreatorLicenseBindingListReadModelSchema.parse({
    total: 1,
    items: [
      {
        id: 'cab_abc123',
        assetId: 'cas_abc123',
        creatorAppId: 'int_001',
        checksum: 'aabbccddeeff00112233445566778899',
        ownerWallet: '0xabc0000000000000000000000000000000000001',
        issuedAt: '2026-03-24T02:00:00.000Z',
        anchorDigest: '1111111111111111111111111111111111111111111111111111111111111111',
        status: 'ANCHORED',
        replayCount: 1,
        lastError: null,
        anchoredAt: '2026-03-24T02:00:10.000Z',
        createdAt: '2026-03-24T02:00:00.000Z',
        updatedAt: '2026-03-24T02:00:10.000Z',
        audit: {
          createdByKeyId: 'ikey_001',
          createdByActor: 'creator-lab:ikey_001',
          requestId: 'req_anchor_001',
          lastReplayedByActor: 'admin:0xabc0000000000000000000000000000000000001',
        },
        onchain: {
          required: false,
          enabled: true,
          anchored: true,
          mode: 'mock',
          anchorId: '0x2222222222222222222222222222222222222222222222222222222222222222',
          chainId: 7001,
          txHash: '0x3333333333333333333333333333333333333333333333333333333333333333',
          blockNumber: '1700000000',
        },
      },
    ],
  });

  const mutation = v3CreatorLicenseAnchorMutationResultSchema.parse({
    binding: list.items[0],
    idempotentReplay: false,
    replayed: true,
  });

  assert.equal(createPayload.ownerWallet, '0xabc0000000000000000000000000000000000001');
  assert.equal(replayPayload.force, true);
  assert.equal(mutation.binding.status, 'ANCHORED');
});

test('v3 partner contract: campaign/callback/reward schemas can be parsed', () => {
  const campaign = v3PartnerCampaignReadModelSchema.parse({
    id: 'pcm_abc123',
    partnerAppId: 'int_partner_001',
    slug: 'q2-growth-campaign',
    title: 'Q2 Growth Campaign',
    description: 'Partner reward campaign for Spring festival.',
    status: 'PUBLISHED',
    callbackEndpoint: 'https://partner.example.com/callbacks/zfrog',
    publishedAt: '2026-03-24T00:00:00.000Z',
    pausedAt: null,
    createdAt: '2026-03-24T00:00:00.000Z',
    updatedAt: '2026-03-24T00:00:00.000Z',
    audit: {
      createdByKeyId: 'ikey_partner_001',
      createdByActor: 'partner-growth:ikey_partner_001',
      requestId: 'req_partner_campaign_001',
    },
    rollout: {
      rewardPolicy: {
        rewardType: 'POINTS',
        defaultAmount: '100',
      },
      metadata: {
        channel: 'festival',
      },
    },
  });

  const reward = v3PartnerRewardReadModelSchema.parse({
    id: 'prw_abc123',
    campaignId: 'pcm_abc123',
    callbackId: 'pcb_abc123',
    recipientWallet: '0xabc0000000000000000000000000000000000001',
    rewardType: 'POINTS',
    amount: '100',
    status: 'GRANTED',
    metadata: {
      source: 'partner',
    },
    grantedAt: '2026-03-24T00:01:00.000Z',
    createdAt: '2026-03-24T00:01:00.000Z',
    updatedAt: '2026-03-24T00:01:00.000Z',
  });

  const createPayload = v3PartnerCreateCampaignPayloadSchema.parse({
    slug: 'q2-growth-campaign',
    title: 'Q2 Growth Campaign',
    callback: {
      endpoint: 'https://partner.example.com/callbacks/zfrog',
      secret: 'partner-secret-0123456789',
    },
    rewardPolicy: {
      rewardType: 'POINTS',
    },
  });

  const callbackPayload = v3PartnerCallbackPayloadSchema.parse({
    partnerEventId: 'evt_10001',
    eventType: 'REWARD_GRANTED',
    payload: {
      source: 'partner.rewards',
      externalRewardId: 'rw_10001',
    },
    reward: {
      recipientWallet: '0xabc0000000000000000000000000000000000001',
      rewardType: 'POINTS',
      amount: '100',
    },
  });

  assert.equal(campaign.status, 'PUBLISHED');
  assert.equal(reward.status, 'GRANTED');
  assert.equal(createPayload.callback.endpoint, 'https://partner.example.com/callbacks/zfrog');
  assert.equal(callbackPayload.eventType, 'REWARD_GRANTED');
});

test('v3 council contract: suggestion list read model can be parsed', () => {
  const parsed = v3CouncilSuggestionListReadModelSchema.parse({
    total: 1,
    items: [
      {
        id: 'csg_001',
        runId: 'crn_001',
        title: 'Council Plan: meteor rescue',
        focus: 'meteor rescue',
        objective: 'secure relic route',
        rationale: 'Generated from journey and memory signals.',
        risk: {
          level: 'MEDIUM',
          reason: 'Moderate impact; apply staged rollout and monitor key metrics.',
        },
        dataSources: [
          {
            source: 'journey.viewer.summary',
            referenceId: 'jrn_001',
            freshness: 'latest',
          },
        ],
        suggestedActions: [
          {
            id: 'act_1',
            label: 'Assign Owner',
            detail: 'Nominate a lead owner for the next step.',
          },
        ],
        status: 'OPEN',
        trace: {
          traceId: 'trace_001',
          promptKitVersion: 'v3-council-suggest-v1',
          model: 'heuristic-council-planner',
          fingerprint: 'abc123',
        },
        createdAt: '2026-03-23T00:00:00.000Z',
        updatedAt: '2026-03-23T00:00:00.000Z',
        response: {
          decision: null,
          note: null,
          respondedAt: null,
          respondedByActor: null,
        },
        audit: {
          createdByAppId: 'int_001',
          createdByKeyId: 'ikey_001',
          createdByActor: 'council-app:ikey_001',
          requestId: 'req_001',
          updatedByActor: 'council-app:ikey_001',
        },
      },
    ],
  });

  assert.equal(parsed.total, 1);
  assert.equal(parsed.items[0]?.status, 'OPEN');
});

test('v3 council contract: brief read model and preferences can be parsed', () => {
  const brief = v3CouncilBriefReadModelSchema.parse({
    id: 'cbrf_001',
    generatedAt: '2026-03-23T00:00:00.000Z',
    window: {
      startAt: '2026-03-16T00:00:00.000Z',
      endAt: '2026-03-23T00:00:00.000Z',
    },
    summary: '本周共 3 条议会建议，待处理 1 条。',
    metrics: {
      total: 3,
      open: 1,
      accepted: 1,
      rejected: 0,
      deferred: 1,
      resolved: 2,
    },
    highlights: [
      {
        suggestionId: 'csg_001',
        title: 'Council Plan: meteor rescue',
        focus: 'meteor rescue',
        status: 'OPEN',
        riskLevel: 'MEDIUM',
        decision: null,
        updatedAt: '2026-03-23T00:00:00.000Z',
      },
    ],
    delivery: {
      channel: 'desktop',
      status: 'DELIVERED',
      shouldNotify: true,
      notificationsEnabled: true,
      throttleMs: 900000,
      lastDeliveredAt: null,
      nextAllowedAt: null,
    },
  });

  const preferences = v3CouncilBriefPreferencesReadModelSchema.parse({
    enabled: true,
    throttleMs: 900000,
    channels: {
      desktop: true,
      mobileLite: false,
    },
    updatedAt: '2026-03-23T00:00:00.000Z',
    updatedByActor: 'council-app:ikey_001',
    requestId: 'req_001',
  });

  assert.equal(brief.delivery.status, 'DELIVERED');
  assert.equal(preferences.channels.mobileLite, false);
});

test('v3 memory palace contract: world read model and payloads can be parsed', () => {
  const world = v3MemoryPalaceWorldReadModelSchema.parse({
    id: 'mpw_001',
    journeyId: 'jrn_story_001',
    title: 'Moonlake Witness Hall',
    summary: 'Shared memories from rescue night.',
    templateSlug: 'moonlake-hall',
    status: 'ACTIVE',
    ownerAppId: 'int_001',
    createdAt: '2026-03-23T00:00:00.000Z',
    updatedAt: '2026-03-23T00:05:00.000Z',
    collaborators: [
      {
        appId: 'int_001',
        role: 'OWNER',
        addedByActor: 'owner-app:ikey_001',
        createdAt: '2026-03-23T00:00:00.000Z',
      },
    ],
    contributions: [
      {
        id: 'mpc_001',
        appId: 'int_001',
        actor: 'owner-app:ikey_001',
        type: 'RELIC_PLACEMENT',
        content: 'Placed moon shard relic near the witness gate.',
        metadata: {
          slot: 'gate',
        },
        createdAt: '2026-03-23T00:05:00.000Z',
      },
    ],
    metrics: {
      collaboratorCount: 1,
      contributionCount: 1,
    },
  });

  const createPayload = v3MemoryPalaceCreateWorldPayloadSchema.parse({
    journeyId: 'jrn_story_001',
    title: 'Moonlake Witness Hall',
    summary: 'Shared memories from rescue night.',
    templateSlug: 'moonlake-hall',
  });

  const collaboratorPayload = v3MemoryPalaceAddCollaboratorPayloadSchema.parse({
    appId: 'int_002',
    role: 'CONTRIBUTOR',
  });

  const contributionPayload = v3MemoryPalaceAddContributionPayloadSchema.parse({
    type: 'WITNESS_NOTE',
    content: 'Left a witness note near the lantern bridge.',
    metadata: {
      lane: 'north',
    },
  });

  const visits = v3MemoryPalaceVisitListReadModelSchema.parse({
    worldId: 'mpw_001',
    total: 1,
    featuredCount: 1,
    items: [
      {
        id: 'mpv_001',
        worldId: 'mpw_001',
        visitorAppId: 'int_002',
        visitorActor: 'guest-app:ikey_002',
        entryType: 'WITNESS',
        message: 'Witnessed a beacon shimmer in the hall.',
        metadata: {
          area: 'north_gate',
        },
        createdAt: '2026-03-23T00:06:00.000Z',
        featured: {
          isFeatured: true,
          exhibitId: 'mpe_001',
          featuredAt: '2026-03-23T00:07:00.000Z',
          featuredByActor: '0xadmin',
          reason: 'high quality witness',
        },
      },
    ],
  });

  const visitPayload = v3MemoryPalaceAddVisitPayloadSchema.parse({
    entryType: 'GUESTBOOK',
    message: 'Left my signature in the guestbook.',
    metadata: {
      mood: 'curious',
    },
  });

  assert.equal(world.metrics.collaboratorCount, 1);
  assert.equal(createPayload.templateSlug, 'moonlake-hall');
  assert.equal(collaboratorPayload.role, 'CONTRIBUTOR');
  assert.equal(contributionPayload.type, 'WITNESS_NOTE');
  assert.equal(visits.featuredCount, 1);
  assert.equal(visitPayload.entryType, 'GUESTBOOK');
});

test('v3 memory palace contract: template pack read model and payloads can be parsed', () => {
  const templates = v3MemoryPalaceTemplateListReadModelSchema.parse({
    total: 1,
    items: [
      {
        id: 'mpt_001',
        slug: 'moonlake-celadon',
        name: 'Moonlake Celadon',
        summary: 'A cool-toned witness hall preset.',
        status: 'PUBLISHED',
        featureEnabled: true,
        createdByAppId: 'int_001',
        createdAt: '2026-03-23T00:00:00.000Z',
        updatedAt: '2026-03-23T00:10:00.000Z',
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
        review: {
          submittedAt: '2026-03-23T00:02:00.000Z',
          reviewedAt: '2026-03-23T00:08:00.000Z',
          reviewedByActor: '0xadmin',
          note: 'approved for beta catalog',
        },
      },
    ],
  });

  const createPayload = v3MemoryPalaceCreateTemplatePayloadSchema.parse({
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

  const submitPayload = v3MemoryPalaceSubmitTemplateReviewPayloadSchema.parse({
    note: 'requesting publish review',
  });

  const reviewPayload = v3MemoryPalaceReviewTemplatePayloadSchema.parse({
    decision: 'APPROVE',
    note: 'looks good',
    featureEnabled: true,
  });

  const togglePayload = v3MemoryPalaceToggleTemplateFeaturePayloadSchema.parse({
    enabled: false,
    reason: 'pause rollout',
  });

  assert.equal(templates.items[0]?.status, 'PUBLISHED');
  assert.equal(createPayload.slug, 'moonlake-celadon');
  assert.equal(submitPayload.note, 'requesting publish review');
  assert.equal(reviewPayload.decision, 'APPROVE');
  assert.equal(togglePayload.enabled, false);
});

test('v3 journey contract: read model can be parsed', () => {
  const parsed = v3JourneyReadModelSchema.parse({
    id: 'jrn_001',
    slug: 'meteor-rescue-night',
    title: 'Meteor Rescue Night',
    narrativeSeed: 'community rescue',
    status: 'ACTIVE',
    currentStepId: 'launch',
    createdAt: '2026-03-23T00:00:00.000Z',
    updatedAt: '2026-03-23T00:00:00.000Z',
    steps: [
      {
        id: 'launch',
        title: 'Launch',
        description: 'Prepare for departure',
        riskLevel: 'LOW',
        order: 1,
        status: 'ACTIVE',
        completedAt: null,
        settledByActor: null,
        resultNote: null,
      },
    ],
    partyMembers: [
      {
        walletAddress: '0xabc0000000000000000000000000000000000001',
        role: 'LEAD',
        joinedAt: '2026-03-23T00:00:00.000Z',
      },
    ],
    audit: {
      createdByAppId: 'int_001',
      createdByKeyId: 'ikey_001',
      createdByActor: 'seasonal-world-lab:ikey_001',
      requestId: 'req-journey-1',
      updatedByActor: 'seasonal-world-lab:ikey_001',
    },
  });

  assert.equal(parsed.slug, 'meteor-rescue-night');
  assert.equal(parsed.steps[0]?.status, 'ACTIVE');
});

test('v3 journey contract: viewer read model can be parsed', () => {
  const parsed = v3JourneyViewerReadModelSchema.parse({
    id: 'jrn_001',
    slug: 'meteor-rescue-night',
    title: 'Meteor Rescue Night',
    narrativeSeed: 'community rescue',
    status: 'ACTIVE',
    currentStepId: 'launch',
    createdAt: '2026-03-23T00:00:00.000Z',
    updatedAt: '2026-03-23T00:00:00.000Z',
    progress: {
      totalChapters: 3,
      completedChapters: 1,
      failedChapters: 0,
      skippedChapters: 0,
      pendingChapters: 1,
      activeChapters: 1,
      completionPercent: 33,
    },
    chapters: [
      {
        id: 'launch',
        title: 'Launch',
        description: 'Prepare for departure',
        riskLevel: 'LOW',
        order: 1,
        status: 'COMPLETED',
        completedAt: '2026-03-23T00:05:00.000Z',
        settledByActor: 'seasonal-world-lab:ikey_001',
        resultNote: 'checkpoint reached',
        isCurrent: false,
      },
      {
        id: 'midpoint',
        title: 'Midpoint',
        description: 'Resolve obstacle',
        riskLevel: 'MEDIUM',
        order: 2,
        status: 'ACTIVE',
        completedAt: null,
        settledByActor: null,
        resultNote: null,
        isCurrent: true,
      },
      {
        id: 'return-home',
        title: 'Return Home',
        description: null,
        riskLevel: 'LOW',
        order: 3,
        status: 'PENDING',
        completedAt: null,
        settledByActor: null,
        resultNote: null,
        isCurrent: false,
      },
    ],
    party: {
      leadWalletAddress: '0xabc0000000000000000000000000000000000001',
      memberCount: 2,
      members: [
        {
          walletAddress: '0xabc0000000000000000000000000000000000001',
          role: 'LEAD',
          joinedAt: '2026-03-23T00:00:00.000Z',
        },
        {
          walletAddress: '0xabc0000000000000000000000000000000000002',
          role: 'MEMBER',
          joinedAt: '2026-03-23T00:00:00.000Z',
        },
      ],
    },
    rewards: {
      status: 'LOCKED',
      hint: 'Complete all required chapters to unlock reward distribution.',
    },
    audit: {
      createdByAppId: 'int_001',
      createdByKeyId: 'ikey_001',
      createdByActor: 'seasonal-world-lab:ikey_001',
      requestId: 'req-journey-1',
      updatedByActor: 'seasonal-world-lab:ikey_001',
    },
  });

  assert.equal(parsed.progress.completionPercent, 33);
  assert.equal(parsed.rewards.status, 'LOCKED');
});

test('v3 journey contract: world graph read model can be parsed', () => {
  const parsed = v3JourneyWorldGraphReadModelSchema.parse({
    journeyId: 'jrn_001',
    generatedAt: '2026-03-23T00:10:00.000Z',
    nodes: [
      {
        id: 'node_jrn_001_launch',
        stepId: 'launch',
        title: 'Launch',
        order: 1,
        riskLevel: 'HIGH',
        status: 'CLEARED',
        unlockedAt: '2026-03-23T00:05:00.000Z',
        clearedAt: '2026-03-23T00:05:00.000Z',
        footprintCount: 1,
      },
      {
        id: 'node_jrn_001_midpoint',
        stepId: 'midpoint',
        title: 'Midpoint',
        order: 2,
        riskLevel: 'MEDIUM',
        status: 'AVAILABLE',
        unlockedAt: '2026-03-23T00:05:00.000Z',
        clearedAt: null,
        footprintCount: 0,
      },
    ],
    relics: [
      {
        id: 'relic_jrn_001_launch',
        stepId: 'launch',
        nodeId: 'node_jrn_001_launch',
        name: 'Launch Relic',
        rarity: 'RARE',
        status: 'DISCOVERED',
        discoveredAt: '2026-03-23T00:05:00.000Z',
        milestoneEligible: true,
      },
      {
        id: 'relic_jrn_001_midpoint',
        stepId: 'midpoint',
        nodeId: 'node_jrn_001_midpoint',
        name: 'Midpoint Relic',
        rarity: 'COMMON',
        status: 'LOCKED',
        discoveredAt: null,
        milestoneEligible: false,
      },
    ],
    footprints: [
      {
        id: 'fp_jrn_001_launch',
        stepId: 'launch',
        actor: 'seasonal-world-lab:ikey_001',
        outcome: 'COMPLETED',
        createdAt: '2026-03-23T00:05:00.000Z',
      },
    ],
    milestones: {
      eligible: true,
      candidates: [
        {
          type: 'JOURNEY_HIGH_RISK_NODE_CLEARED',
          stepId: 'launch',
          reason: 'High-risk node "Launch" completed.',
          occurredAt: '2026-03-23T00:05:00.000Z',
        },
      ],
    },
  });

  assert.equal(parsed.nodes[0]?.status, 'CLEARED');
  assert.equal(parsed.relics[0]?.milestoneEligible, true);
});

test('v3 journey contract: incident read model can be parsed', () => {
  const parsed = v3JourneyIncidentReadModelSchema.parse({
    id: 'evt_001',
    journeyId: 'jrn_001',
    stepId: 'launch',
    template: 'METEOR_RESCUE_NIGHT',
    title: 'Meteor Rescue Night',
    description: 'Meteor shower threatens launch corridor.',
    status: 'TRIGGERED',
    options: ['DEPLOY_RESCUE', 'HOLD_FORMATION', 'ABORT_MISSION'],
    promptTrace: {
      traceId: 'trace_001',
      promptKitVersion: '2026-03-23.journey-incidents.prompt-kit.v1',
      systemPromptVersion: '2026-03-23.journey-incidents.system.v1',
      responsePromptVersion: '2026-03-23.journey-incidents.response.v1',
      fingerprint: 'abc123',
      variables: {
        journeyId: 'jrn_001',
        stepId: 'launch',
      },
    },
    triggeredAt: '2026-03-23T00:10:00.000Z',
    resolvedAt: null,
    resolution: {
      decision: null,
      outcome: null,
      note: null,
      respondedByActor: null,
    },
    effects: {
      relationshipSignals: [],
      memoryFragments: [],
    },
    audit: {
      createdByAppId: 'int_001',
      createdByKeyId: 'ikey_001',
      createdByActor: 'seasonal-world-lab:ikey_001',
      requestId: 'req-incident-1',
      updatedByActor: 'seasonal-world-lab:ikey_001',
    },
  });

  assert.equal(parsed.status, 'TRIGGERED');
  assert.equal(parsed.promptTrace.traceId, 'trace_001');
});

test('v3 journey contract: incident respond result can be parsed', () => {
  const parsed = v3JourneyIncidentRespondResultSchema.parse({
    incident: {
      id: 'evt_001',
      journeyId: 'jrn_001',
      stepId: 'launch',
      template: 'METEOR_RESCUE_NIGHT',
      title: 'Meteor Rescue Night',
      description: 'Meteor shower threatens launch corridor.',
      status: 'RESOLVED',
      options: ['DEPLOY_RESCUE', 'HOLD_FORMATION', 'ABORT_MISSION'],
      promptTrace: {
        traceId: 'trace_001',
        promptKitVersion: '2026-03-23.journey-incidents.prompt-kit.v1',
        systemPromptVersion: '2026-03-23.journey-incidents.system.v1',
        responsePromptVersion: '2026-03-23.journey-incidents.response.v1',
        fingerprint: 'abc123',
        variables: {
          journeyId: 'jrn_001',
          stepId: 'launch',
        },
      },
      triggeredAt: '2026-03-23T00:10:00.000Z',
      resolvedAt: '2026-03-23T00:12:00.000Z',
      resolution: {
        decision: 'DEPLOY_RESCUE',
        outcome: 'RESCUED',
        note: 'Rescue team launched',
        respondedByActor: 'seasonal-world-lab:ikey_001',
      },
      effects: {
        relationshipSignals: [
          {
            sourceWallet: '0xabc0000000000000000000000000000000000001',
            targetWallet: '0xabc0000000000000000000000000000000000002',
            trustDelta: 2,
            reason: 'incident:rescued',
          },
        ],
        memoryFragments: [
          {
            id: 'mem_evt_001',
            title: 'Journey Incident Memory',
            text: 'Incident resolved.',
            importance: 'HIGH',
            tags: ['journey', 'incident', 'rescued'],
          },
        ],
      },
      audit: {
        createdByAppId: 'int_001',
        createdByKeyId: 'ikey_001',
        createdByActor: 'seasonal-world-lab:ikey_001',
        requestId: 'req-incident-1',
        updatedByActor: 'seasonal-world-lab:ikey_001',
      },
    },
    journey: {
      id: 'jrn_001',
      slug: 'meteor-rescue-night',
      title: 'Meteor Rescue Night',
      narrativeSeed: 'community rescue',
      status: 'ACTIVE',
      currentStepId: 'midpoint',
      createdAt: '2026-03-23T00:00:00.000Z',
      updatedAt: '2026-03-23T00:12:00.000Z',
      steps: [
        {
          id: 'launch',
          title: 'Launch',
          description: 'Prepare for departure',
          riskLevel: 'LOW',
          order: 1,
          status: 'COMPLETED',
          completedAt: '2026-03-23T00:12:00.000Z',
          settledByActor: 'seasonal-world-lab:ikey_001',
          resultNote: 'Rescue team launched',
        },
        {
          id: 'midpoint',
          title: 'Midpoint',
          description: 'Resolve obstacle',
          riskLevel: 'MEDIUM',
          order: 2,
          status: 'ACTIVE',
          completedAt: null,
          settledByActor: null,
          resultNote: null,
        },
      ],
      partyMembers: [
        {
          walletAddress: '0xabc0000000000000000000000000000000000001',
          role: 'LEAD',
          joinedAt: '2026-03-23T00:00:00.000Z',
        },
      ],
      audit: {
        createdByAppId: 'int_001',
        createdByKeyId: 'ikey_001',
        createdByActor: 'seasonal-world-lab:ikey_001',
        requestId: 'req-journey-1',
        updatedByActor: 'seasonal-world-lab:ikey_001',
      },
    },
  });

  assert.equal(parsed.incident.resolution.outcome, 'RESCUED');
  assert.equal(parsed.journey.currentStepId, 'midpoint');
});
