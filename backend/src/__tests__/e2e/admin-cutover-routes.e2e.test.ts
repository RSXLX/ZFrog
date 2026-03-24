import express from 'express';
import request from 'supertest';
import adminRoutes from '../../api/routes/admin.routes';
import { errorHandler, notFoundHandler } from '../../middlewares/errorHandler';
import { prisma } from '../../database';
import { lifeCommandService } from '../../modules/life/life.command';
import { memoryPalaceService } from '../../modules/memory-palace/memory-palace.service';

jest.mock('../../database', () => ({
  prisma: {
    frog: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    travel: {
      findUnique: jest.fn(),
    },
    relationshipAttestation: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    domainEvent: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock('../../modules/life/life.command', () => ({
  lifeCommandService: {
    syncLifeState: jest.fn(),
  },
}));

jest.mock('../../modules/memory-palace/memory-palace.service', () => ({
  memoryPalaceService: {
    upsertFromTravel: jest.fn(),
  },
}));

jest.mock('../../services/airdrop/airdrop.service', () => ({
  airdropService: {
    getStats: jest.fn(),
    getFailedRewards: jest.fn(),
    retryFailedReward: jest.fn(),
    isEnabled: jest.fn(() => false),
  },
}));

describe('Admin Cutover Routes E2E', () => {
  const app = express();
  const mockPrisma = prisma as unknown as {
    frog: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
    travel: {
      findUnique: jest.Mock;
    };
    relationshipAttestation: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
    domainEvent: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };
  const mockLife = lifeCommandService as jest.Mocked<typeof lifeCommandService>;
  const mockMemoryPalace = memoryPalaceService as jest.Mocked<typeof memoryPalaceService>;

  app.use(express.json());
  app.use('/api/admin', adminRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma.frog.findUnique.mockResolvedValue({
      id: 7,
      tokenId: 1001,
      name: 'AdminFrog',
      status: 'Idle',
      hibernationStatus: 'ACTIVE',
    });
    mockPrisma.frog.findMany.mockResolvedValue([
      { id: 7, tokenId: 1001, name: 'AdminFrog' },
      { id: 9, tokenId: 1009, name: 'PeerFrog' },
    ]);

    mockLife.syncLifeState.mockResolvedValue({
      hunger: 88,
      happiness: 92,
      cleanliness: 90,
      health: 95,
      energy: 84,
      isSick: false,
      needsClean: false,
      isDormant: false,
      hibernationStatus: 'ACTIVE',
      mood: 'HAPPY',
    });

    mockPrisma.travel.findUnique.mockResolvedValue({
      id: 55,
      frogId: 7,
      status: 'Completed',
    });

    mockPrisma.relationshipAttestation.findMany.mockResolvedValue([
      {
        id: 'att_1',
        subjectFrogId: 7,
        objectFrogId: 9,
        attestationType: 'blessing',
        source: 'v2-social',
        status: 'QUEUED',
        idempotencyKey: 'idem_1',
        createdByAddress: '0xabc0000000000000000000000000000000000001',
        createdAt: new Date('2026-03-23T11:00:00.000Z'),
        updatedAt: new Date('2026-03-23T11:00:00.000Z'),
        onchainMilestones: [
          {
            id: 88n,
            txHash: '0xattestation',
            chainId: 7001,
            blockNumber: 321n,
            createdAt: new Date('2026-03-23T11:30:00.000Z'),
          },
        ],
      },
    ]);
    mockPrisma.relationshipAttestation.count.mockResolvedValue(1);

    mockPrisma.domainEvent.findMany.mockResolvedValue([
      {
        id: BigInt(9001),
        aggregateType: 'Family',
        aggregateId: '42',
        eventType: 'FamilyCreated',
        frogId: 7,
        travelId: null,
        payload: { familyId: 42 },
        requestId: 'req-family-42',
        traceId: 'trace-family-42',
        source: 'v2.family.command',
        occurredAt: new Date('2026-03-22T16:00:00.000Z'),
        createdAt: new Date('2026-03-22T16:00:00.000Z'),
      },
    ]);
    mockPrisma.domainEvent.count.mockResolvedValue(1);

    mockMemoryPalace.upsertFromTravel.mockResolvedValue({
      id: 33,
      frogId: 7,
      recapText: '一次快乐的旅行',
      updatedAt: new Date().toISOString(),
    });
  });

  it('POST /api/admin/frogs/:tokenId/recalculate-life delegates to life.command and returns receipt', async () => {
    const response = await request(app).post('/api/admin/frogs/1001/recalculate-life');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.frog).toMatchObject({
      id: 7,
      tokenId: 1001,
      name: 'AdminFrog',
    });
    expect(response.body.data.life).toMatchObject({
      mood: 'HAPPY',
      hunger: 88,
    });
    expect(typeof response.body.data.recalculatedAt).toBe('string');
    expect(mockLife.syncLifeState).toHaveBeenCalledWith({ tokenId: 1001 });
  });

  it('POST /api/admin/frogs/:tokenId/recalculate-life validates positive tokenId', async () => {
    const response = await request(app).post('/api/admin/frogs/not-a-number/recalculate-life');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('tokenId');
    expect(mockLife.syncLifeState).not.toHaveBeenCalled();
  });

  it('POST /api/admin/travels/:id/rebuild-memory delegates to memory-palace service and returns receipt', async () => {
    const response = await request(app)
      .post('/api/admin/travels/55/rebuild-memory')
      .send({ requestId: 'req-admin-1' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      travelId: 55,
      frogId: 7,
      memoryPalace: {
        id: 33,
        frogId: 7,
      },
    });
    expect(mockMemoryPalace.upsertFromTravel).toHaveBeenCalledWith({
      travelId: 55,
      requestId: 'req-admin-1',
      source: 'admin.rebuild-memory',
    });
  });

  it('POST /api/admin/travels/:id/rebuild-memory rejects non-completed travel', async () => {
    mockPrisma.travel.findUnique.mockResolvedValue({
      id: 56,
      frogId: 7,
      status: 'Active',
    });

    const response = await request(app).post('/api/admin/travels/56/rebuild-memory');

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('completed travel');
    expect(mockMemoryPalace.upsertFromTravel).not.toHaveBeenCalled();
  });

  it('POST /api/admin/travels/:id/rebuild-memory returns conflict when rebuild is skipped', async () => {
    mockMemoryPalace.upsertFromTravel.mockResolvedValue(null);

    const response = await request(app).post('/api/admin/travels/55/rebuild-memory');

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('not eligible');
  });

  it('GET /api/admin/domain-events supports familyId filter for family aggregate events', async () => {
    const response = await request(app).get('/api/admin/domain-events?familyId=42&page=1&pageSize=10');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      aggregateType: 'Family',
      aggregateId: '42',
      eventType: 'FamilyCreated',
    });

    expect(mockPrisma.domainEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        AND: expect.arrayContaining([
          { aggregateType: { contains: 'family', mode: 'insensitive' } },
          { aggregateId: '42' },
        ]),
      }),
      skip: 0,
      take: 10,
      orderBy: { occurredAt: 'desc' },
    }));

    expect(mockPrisma.domainEvent.count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        AND: expect.arrayContaining([
          { aggregateType: { contains: 'family', mode: 'insensitive' } },
          { aggregateId: '42' },
        ]),
      }),
    }));
  });

  it('GET /api/admin/attestations supports status filter and returns onchain trace', async () => {
    const response = await request(app).get('/api/admin/attestations?status=QUEUED&page=1&pageSize=10');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      id: 'att_1',
      status: 'QUEUED',
      attestationType: 'blessing',
      onchainTrace: {
        txHash: '0xattestation',
        chainId: 7001,
      },
    });

    expect(mockPrisma.relationshipAttestation.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: 'QUEUED',
      }),
      skip: 0,
      take: 10,
      orderBy: { createdAt: 'desc' },
    }));
    expect(mockPrisma.relationshipAttestation.count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: 'QUEUED',
      }),
    }));
  });
});
