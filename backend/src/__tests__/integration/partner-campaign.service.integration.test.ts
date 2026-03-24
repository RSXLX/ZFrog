import { createHmac } from 'crypto';
import { PartnerCampaignService } from '../../modules/partners/partner-campaign.service';

type MockPartnerCampaign = {
  id: string;
  partnerAppId: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  callbackEndpoint: string;
  callbackSecret: string;
  callbackSecretHash: string;
  rewardPolicy: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdByKeyId: string;
  createdByActor: string;
  requestId: string | null;
  publishedAt: Date | null;
  pausedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MockPartnerCallback = {
  id: string;
  campaignId: string;
  partnerEventId: string;
  eventType: string;
  signatureVersion: string;
  signature: string;
  verified: boolean;
  status: string;
  reason: string | null;
  payload: Record<string, unknown>;
  requestId: string | null;
  receivedAt: Date;
  processedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

type MockPartnerReward = {
  id: string;
  campaignId: string;
  callbackId: string;
  recipientWallet: string;
  rewardType: string;
  amount: string;
  status: string;
  metadata: Record<string, unknown> | null;
  grantedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

const toDate = (value: Date | string | undefined | null): Date | null => {
  if (value === null) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string') {
    return new Date(value);
  }
  return new Date();
};

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`).join(',')}}`;
};

const computeSignature = (secret: string, timestamp: string, payload: Record<string, unknown>): string => {
  const message = `${timestamp}.${stableStringify(payload)}`;
  return createHmac('sha256', secret).update(message).digest('hex');
};

const createMockPrisma = () => {
  const campaigns = new Map<string, MockPartnerCampaign>();
  const callbacks = new Map<string, MockPartnerCallback>();
  const rewards = new Map<string, MockPartnerReward>();
  const domainEvents: any[] = [];

  const applyCampaignWhere = (where: any): MockPartnerCampaign[] => {
    let rows = Array.from(campaigns.values());
    if (!where) {
      return rows;
    }
    if (where.id) {
      rows = rows.filter((item) => item.id === where.id);
    }
    if (where.partnerAppId) {
      rows = rows.filter((item) => item.partnerAppId === where.partnerAppId);
    }
    if (where.slug) {
      rows = rows.filter((item) => item.slug === where.slug);
    }
    if (where.status) {
      rows = rows.filter((item) => item.status === where.status);
    }
    return rows;
  };

  const applyCallbackWhere = (where: any): MockPartnerCallback[] => {
    let rows = Array.from(callbacks.values());
    if (!where) {
      return rows;
    }
    if (where.id) {
      rows = rows.filter((item) => item.id === where.id);
    }
    if (where.campaignId) {
      rows = rows.filter((item) => item.campaignId === where.campaignId);
    }
    if (where.partnerEventId) {
      rows = rows.filter((item) => item.partnerEventId === where.partnerEventId);
    }
    return rows;
  };

  const applyRewardWhere = (where: any): MockPartnerReward[] => {
    let rows = Array.from(rewards.values());
    if (!where) {
      return rows;
    }
    if (where.id) {
      rows = rows.filter((item) => item.id === where.id);
    }
    if (where.campaignId) {
      rows = rows.filter((item) => item.campaignId === where.campaignId);
    }
    if (where.callbackId) {
      rows = rows.filter((item) => item.callbackId === where.callbackId);
    }
    return rows;
  };

  const mockPrisma: any = {};

  mockPrisma.partnerCampaign = {
    create: jest.fn(async ({ data }: any) => {
      const created: MockPartnerCampaign = {
        ...data,
        description: data.description ?? null,
        rewardPolicy: data.rewardPolicy ?? null,
        metadata: data.metadata ?? null,
        requestId: data.requestId ?? null,
        publishedAt: toDate(data.publishedAt),
        pausedAt: toDate(data.pausedAt),
        createdAt: toDate(data.createdAt) || new Date(),
        updatedAt: toDate(data.updatedAt) || new Date(),
      };
      campaigns.set(created.id, created);
      return created;
    }),
    findFirst: jest.fn(async ({ where }: any) => applyCampaignWhere(where)[0] || null),
    findMany: jest.fn(async ({ where, orderBy, take }: any) => {
      let rows = applyCampaignWhere(where);
      if (orderBy?.createdAt === 'desc') {
        rows = rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      if (typeof take === 'number') {
        rows = rows.slice(0, take);
      }
      return rows;
    }),
    count: jest.fn(async ({ where }: any) => applyCampaignWhere(where).length),
    update: jest.fn(async ({ where, data }: any) => {
      const existing = campaigns.get(where.id);
      if (!existing) {
        throw new Error(`campaign ${where.id} not found`);
      }
      const updated: MockPartnerCampaign = {
        ...existing,
        ...(data.status ? { status: data.status } : {}),
        ...(Object.prototype.hasOwnProperty.call(data, 'publishedAt')
          ? { publishedAt: toDate(data.publishedAt) }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(data, 'pausedAt')
          ? { pausedAt: toDate(data.pausedAt) }
          : {}),
        ...(data.updatedAt ? { updatedAt: toDate(data.updatedAt) || new Date() } : {}),
      };
      campaigns.set(updated.id, updated);
      return updated;
    }),
  };

  mockPrisma.partnerCallback = {
    create: jest.fn(async ({ data }: any) => {
      const created: MockPartnerCallback = {
        ...data,
        reason: data.reason ?? null,
        payload: data.payload ?? {},
        requestId: data.requestId ?? null,
        receivedAt: toDate(data.receivedAt) || new Date(),
        processedAt: toDate(data.processedAt) || new Date(),
        createdAt: toDate(data.createdAt) || new Date(),
        updatedAt: toDate(data.updatedAt) || new Date(),
      };
      callbacks.set(created.id, created);
      return created;
    }),
    findFirst: jest.fn(async ({ where }: any) => applyCallbackWhere(where)[0] || null),
    findMany: jest.fn(async ({ where, orderBy, take, include }: any) => {
      let rows = applyCallbackWhere(where);
      if (orderBy?.receivedAt === 'desc') {
        rows = rows.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
      }
      if (typeof take === 'number') {
        rows = rows.slice(0, take);
      }
      if (include?.reward) {
        return rows.map((item) => ({
          ...item,
          reward: applyRewardWhere({ callbackId: item.id })[0] || null,
        }));
      }
      return rows;
    }),
    count: jest.fn(async ({ where }: any) => applyCallbackWhere(where).length),
  };

  mockPrisma.partnerReward = {
    create: jest.fn(async ({ data }: any) => {
      const created: MockPartnerReward = {
        ...data,
        metadata: data.metadata ?? null,
        grantedAt: toDate(data.grantedAt) || new Date(),
        createdAt: toDate(data.createdAt) || new Date(),
        updatedAt: toDate(data.updatedAt) || new Date(),
      };
      rewards.set(created.id, created);
      return created;
    }),
    findMany: jest.fn(async ({ where, orderBy, take }: any) => {
      let rows = applyRewardWhere(where);
      if (orderBy?.createdAt === 'desc') {
        rows = rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      if (typeof take === 'number') {
        rows = rows.slice(0, take);
      }
      return rows;
    }),
    count: jest.fn(async ({ where }: any) => applyRewardWhere(where).length),
    findFirst: jest.fn(async ({ where }: any) => applyRewardWhere(where)[0] || null),
  };

  mockPrisma.domainEvent = {
    create: jest.fn(async ({ data }: any) => {
      domainEvents.push(data);
      return {
        id: BigInt(1_000 + domainEvents.length),
        occurredAt: new Date(),
        ...data,
      };
    }),
  };

  mockPrisma.$transaction = jest.fn(async (input: any): Promise<any> => {
    if (Array.isArray(input)) {
      return Promise.all(input);
    }
    if (typeof input === 'function') {
      return input(mockPrisma);
    }
    throw new Error('unsupported transaction payload');
  });

  return {
    mockPrisma,
    domainEvents,
  };
};

describe('PartnerCampaignService Integration', () => {
  const originalEnv = {
    V3_PARTNER_STORAGE_MODE: process.env.V3_PARTNER_STORAGE_MODE,
    V3_PARTNER_CAMPAIGN_RUNTIME_ENABLED: process.env.V3_PARTNER_CAMPAIGN_RUNTIME_ENABLED,
    V3_PARTNER_CAMPAIGN_PUBLISH_ENABLED: process.env.V3_PARTNER_CAMPAIGN_PUBLISH_ENABLED,
    V3_PARTNER_CAMPAIGN_PAUSE_ENABLED: process.env.V3_PARTNER_CAMPAIGN_PAUSE_ENABLED,
    V3_PARTNER_CAMPAIGN_RESUME_ENABLED: process.env.V3_PARTNER_CAMPAIGN_RESUME_ENABLED,
    V3_PARTNER_CALLBACKS_ENABLED: process.env.V3_PARTNER_CALLBACKS_ENABLED,
    V3_PARTNER_REWARD_RECORD_ENABLED: process.env.V3_PARTNER_REWARD_RECORD_ENABLED,
    V3_PARTNER_CALLBACK_MAX_SKEW_SECONDS: process.env.V3_PARTNER_CALLBACK_MAX_SKEW_SECONDS,
    V3_PARTNER_ALLOWED_APPS: process.env.V3_PARTNER_ALLOWED_APPS,
  };

  beforeEach(() => {
    process.env.V3_PARTNER_STORAGE_MODE = 'prisma';
    process.env.V3_PARTNER_CAMPAIGN_RUNTIME_ENABLED = 'true';
    process.env.V3_PARTNER_CAMPAIGN_PUBLISH_ENABLED = 'true';
    process.env.V3_PARTNER_CAMPAIGN_PAUSE_ENABLED = 'true';
    process.env.V3_PARTNER_CAMPAIGN_RESUME_ENABLED = 'true';
    process.env.V3_PARTNER_CALLBACKS_ENABLED = 'true';
    process.env.V3_PARTNER_REWARD_RECORD_ENABLED = 'true';
    process.env.V3_PARTNER_CALLBACK_MAX_SKEW_SECONDS = '600';
    delete process.env.V3_PARTNER_ALLOWED_APPS;
  });

  afterAll(() => {
    process.env.V3_PARTNER_STORAGE_MODE = originalEnv.V3_PARTNER_STORAGE_MODE;
    process.env.V3_PARTNER_CAMPAIGN_RUNTIME_ENABLED = originalEnv.V3_PARTNER_CAMPAIGN_RUNTIME_ENABLED;
    process.env.V3_PARTNER_CAMPAIGN_PUBLISH_ENABLED = originalEnv.V3_PARTNER_CAMPAIGN_PUBLISH_ENABLED;
    process.env.V3_PARTNER_CAMPAIGN_PAUSE_ENABLED = originalEnv.V3_PARTNER_CAMPAIGN_PAUSE_ENABLED;
    process.env.V3_PARTNER_CAMPAIGN_RESUME_ENABLED = originalEnv.V3_PARTNER_CAMPAIGN_RESUME_ENABLED;
    process.env.V3_PARTNER_CALLBACKS_ENABLED = originalEnv.V3_PARTNER_CALLBACKS_ENABLED;
    process.env.V3_PARTNER_REWARD_RECORD_ENABLED = originalEnv.V3_PARTNER_REWARD_RECORD_ENABLED;
    process.env.V3_PARTNER_CALLBACK_MAX_SKEW_SECONDS = originalEnv.V3_PARTNER_CALLBACK_MAX_SKEW_SECONDS;
    process.env.V3_PARTNER_ALLOWED_APPS = originalEnv.V3_PARTNER_ALLOWED_APPS;
  });

  it('persists publish/pause/resume lifecycle and admin rollback with audit events', async () => {
    const { mockPrisma, domainEvents } = createMockPrisma();
    const service = new PartnerCampaignService({
      prismaClient: mockPrisma as any,
    });

    const drafted = await service.createCampaign({
      slug: 'growth-q2',
      title: 'Growth Q2',
      callbackEndpoint: 'https://partner.example.com/callbacks/zfrog',
      callbackSecret: 'partner-secret-0123456789',
      requestedBy: {
        appId: 'int_partner_001',
        keyId: 'ikey_partner_001',
        actor: 'partner:ikey_partner_001',
      },
    });

    expect(drafted.status).toBe('DRAFT');

    const published = await service.publishCampaign({
      campaignId: drafted.id,
      scopeAppId: drafted.partnerAppId,
      requestedBy: {
        actor: 'partner:ikey_partner_001',
      },
    });
    expect(published.status).toBe('PUBLISHED');

    const paused = await service.pauseCampaign({
      campaignId: drafted.id,
      scopeAppId: drafted.partnerAppId,
      requestedBy: {
        actor: 'partner:ikey_partner_001',
      },
    });
    expect(paused.status).toBe('PAUSED');

    const resumed = await service.resumeCampaign({
      campaignId: drafted.id,
      scopeAppId: drafted.partnerAppId,
      requestedBy: {
        actor: 'partner:ikey_partner_001',
      },
    });
    expect(resumed.status).toBe('PUBLISHED');

    const rolledBack = await service.adminRollbackCampaign({
      campaignId: drafted.id,
      reason: 'safety stop',
      requestedBy: {
        actor: 'admin:ops',
      },
    });
    expect(rolledBack.status).toBe('PAUSED');

    const adminList = await service.listCampaignsForAdmin({
      status: 'PAUSED',
      limit: 10,
    });
    expect(adminList.total).toBe(1);
    expect(adminList.items[0]?.id).toBe(drafted.id);

    const eventTypes = domainEvents.map((event) => String(event.eventType));
    expect(eventTypes).toEqual(
      expect.arrayContaining([
        'PartnerCampaignDrafted',
        'PartnerCampaignPublished',
        'PartnerCampaignPaused',
        'PartnerCampaignResumed',
        'PartnerCampaignRolledBack',
      ])
    );
  });

  it('verifies callback signature, records rewards, and blocks callback replay', async () => {
    const { mockPrisma, domainEvents } = createMockPrisma();
    const service = new PartnerCampaignService({
      prismaClient: mockPrisma as any,
    });

    const campaign = await service.createCampaign({
      slug: 'callback-guarded',
      title: 'Callback Guarded Campaign',
      callbackEndpoint: 'https://partner.example.com/callbacks/zfrog',
      callbackSecret: 'partner-secret-signature-001',
      requestedBy: {
        appId: 'int_partner_001',
        keyId: 'ikey_partner_001',
        actor: 'partner:ikey_partner_001',
      },
    });

    await service.publishCampaign({
      campaignId: campaign.id,
      scopeAppId: campaign.partnerAppId,
      requestedBy: {
        actor: 'partner:ikey_partner_001',
      },
    });

    const callbackPayload = {
      source: 'partner.rewards',
      campaignVersion: 'v1',
      externalRewardId: 'rw_001',
    };
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = `sha256=${computeSignature('partner-secret-signature-001', timestamp, callbackPayload)}`;

    const accepted = await service.receiveCallback({
      campaignId: campaign.id,
      partnerEventId: 'evt_001',
      eventType: 'REWARD_GRANTED',
      timestamp,
      signature,
      payload: callbackPayload,
      reward: {
        recipientWallet: '0xabc0000000000000000000000000000000000001',
        rewardType: 'points',
        amount: '100',
      },
      requestId: 'req_partner_cb_001',
    });

    expect(accepted.callback.status).toBe('ACCEPTED');
    expect(accepted.callback.verified).toBe(true);
    expect(accepted.reward?.status).toBe('GRANTED');

    await expect(
      service.receiveCallback({
        campaignId: campaign.id,
        partnerEventId: 'evt_001',
        eventType: 'REWARD_GRANTED',
        timestamp,
        signature,
        payload: callbackPayload,
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'PARTNER_CALLBACK_REPLAYED',
    });

    await expect(
      service.receiveCallback({
        campaignId: campaign.id,
        partnerEventId: 'evt_002',
        eventType: 'CAMPAIGN_STATUS_SYNC',
        timestamp,
        signature: 'sha256=deadbeef',
        payload: {
          from: 'PUBLISHED',
          to: 'PAUSED',
        },
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'PARTNER_CALLBACK_SIGNATURE_INVALID',
    });

    const callbacks = await service.listCallbacksForAdmin({
      campaignId: campaign.id,
      limit: 10,
    });
    expect(callbacks.total).toBe(2);
    expect(callbacks.items.some((item) => item.status === 'REJECTED')).toBe(true);

    const rewards = await service.listRewardsForAdmin({
      campaignId: campaign.id,
      limit: 10,
    });
    expect(rewards.total).toBe(1);
    expect(rewards.items[0]?.status).toBe('GRANTED');

    const eventTypes = domainEvents.map((event) => String(event.eventType));
    expect(eventTypes).toEqual(
      expect.arrayContaining([
        'PartnerCallbackAccepted',
        'PartnerRewardGranted',
        'PartnerCallbackRejected',
      ])
    );
  });

  it('fails closed when publish switch is disabled', async () => {
    const { mockPrisma } = createMockPrisma();
    const service = new PartnerCampaignService({
      prismaClient: mockPrisma as any,
    });

    const campaign = await service.createCampaign({
      slug: 'kill-switch-campaign',
      title: 'Kill Switch Campaign',
      callbackEndpoint: 'https://partner.example.com/callbacks/zfrog',
      callbackSecret: 'partner-secret-kill-switch-001',
      requestedBy: {
        appId: 'int_partner_001',
        keyId: 'ikey_partner_001',
        actor: 'partner:ikey_partner_001',
      },
    });

    process.env.V3_PARTNER_CAMPAIGN_PUBLISH_ENABLED = 'false';

    await expect(
      service.publishCampaign({
        campaignId: campaign.id,
        scopeAppId: campaign.partnerAppId,
        requestedBy: {
          actor: 'partner:ikey_partner_001',
        },
      })
    ).rejects.toMatchObject({
      statusCode: 503,
      code: 'PARTNER_CAMPAIGN_PUBLISH_DISABLED',
    });
  });
});
