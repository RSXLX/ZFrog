import express from 'express';
import request from 'supertest';
import v2Routes from '../../api/routes/v2';
import { prisma } from '../../database';
import { errorHandler, notFoundHandler } from '../../middlewares/errorHandler';

jest.mock('../../middlewares/auth.middleware', () => ({
  authRequired: (req: any, _res: any, next: any) => {
    const raw =
      (Array.isArray(req.headers['x-wallet-address'])
        ? req.headers['x-wallet-address'][0]
        : req.headers['x-wallet-address']) || '0xabc0000000000000000000000000000000000001';
    const wallet = String(raw).toLowerCase();
    req.user = {
      address: wallet,
      walletAddress: wallet,
    };
    next();
  },
}));

const describeIfRealDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

const uniqueHex = (): string => {
  const seed = `${Date.now().toString(16)}${Math.floor(Math.random() * 1_000_000)
    .toString(16)
    .padStart(5, '0')}`;
  return seed.slice(-40).padStart(40, '0');
};

const uniqueAddress = (): string => `0x${uniqueHex()}`;
const uniqueTokenId = (): number => Number(`${Date.now()}${Math.floor(Math.random() * 100)}`.slice(-9));

describeIfRealDb('V2 Relationship Memory Routes E2E (Real DB)', () => {
  const app = express();
  const frogIds: number[] = [];
  const relationshipEventIds: bigint[] = [];
  const attestationIds: string[] = [];
  const onchainMilestoneIds: bigint[] = [];

  app.use(express.json());
  app.use('/api/v2', v2Routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  afterEach(async () => {
    if (onchainMilestoneIds.length > 0) {
      await prisma.onchainMilestone.deleteMany({
        where: {
          id: { in: onchainMilestoneIds },
        },
      });
    }

    if (attestationIds.length > 0) {
      await prisma.relationshipAttestation.deleteMany({
        where: {
          id: { in: attestationIds },
        },
      });
    }

    if (relationshipEventIds.length > 0) {
      await prisma.relationshipEvent.deleteMany({
        where: {
          id: { in: relationshipEventIds },
        },
      });
    }

    if (frogIds.length > 0) {
      await prisma.soulProfile.deleteMany({
        where: {
          frogId: { in: frogIds },
        },
      });

      await prisma.frog.deleteMany({
        where: { id: { in: frogIds } },
      });
    }

    frogIds.length = 0;
    relationshipEventIds.length = 0;
    attestationIds.length = 0;
    onchainMilestoneIds.length = 0;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const createFrogPair = async (ownerAddress = uniqueAddress()) => {
    const subject = await prisma.frog.create({
      data: {
        tokenId: uniqueTokenId(),
        name: `MemorySubject-${Date.now()}`,
        ownerAddress,
        birthday: new Date('2026-03-23T00:00:00.000Z'),
      },
      select: { id: true, tokenId: true, name: true },
    });

    const peer = await prisma.frog.create({
      data: {
        tokenId: uniqueTokenId(),
        name: `MemoryPeer-${Date.now()}`,
        ownerAddress: uniqueAddress(),
        birthday: new Date('2026-03-23T00:00:00.000Z'),
      },
      select: { id: true, tokenId: true, name: true },
    });

    frogIds.push(subject.id, peer.id);
    return { subject, peer };
  };

  it('GET /api/v2/frogs/:frogId/relationship-memory aggregates events and attestations', async () => {
    const ownerWallet = uniqueAddress();
    const { subject, peer } = await createFrogPair(ownerWallet);

    await prisma.soulProfile.upsert({
      where: { frogId: subject.id },
      update: {
        personality: 'warm',
        imprintText: 'I like friends',
        temperament: { tone: 'warm' },
        bondedAt: new Date('2026-03-23T00:00:00.000Z'),
      },
      create: {
        frogId: subject.id,
        personality: 'warm',
        imprintText: 'I like friends',
        temperament: { tone: 'warm' },
        bondedAt: new Date('2026-03-23T00:00:00.000Z'),
      },
    });

    const relationshipEvent = await prisma.relationshipEvent.create({
      data: {
        frogId: subject.id,
        actorFrogId: subject.id,
        counterpartyFrogId: peer.id,
        eventType: 'Blessed',
        payload: {
          source: 'test',
        },
      },
      select: { id: true },
    });
    relationshipEventIds.push(relationshipEvent.id);

    const attestation = await prisma.relationshipAttestation.create({
      data: {
        subjectFrogId: subject.id,
        objectFrogId: peer.id,
        attestationType: 'blessing',
        source: 'test-suite',
        status: 'CONFIRMED',
        createdByAddress: uniqueAddress(),
        evidence: { test: true },
      },
      select: { id: true },
    });
    attestationIds.push(attestation.id);

    const milestone = await prisma.onchainMilestone.create({
      data: {
        frogId: subject.id,
        attestationId: attestation.id,
        milestoneType: 'RELATIONSHIP_ATTESTED',
        chainId: 7001,
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        blockNumber: 123n,
      },
      select: { id: true },
    });
    onchainMilestoneIds.push(milestone.id);

    const response = await request(app)
      .get(`/api/v2/frogs/${subject.id}/relationship-memory`)
      .set('x-wallet-address', ownerWallet);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.frog.id).toBe(subject.id);
    expect(response.body.data.summary.relationshipEventCount).toBeGreaterThanOrEqual(1);
    expect(response.body.data.summary.attestationCount).toBeGreaterThanOrEqual(1);
    expect(response.body.data.summary.confirmedAttestationCount).toBeGreaterThanOrEqual(1);
    expect(response.body.data.relatedFrogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: peer.id,
          tokenId: peer.tokenId,
        }),
      ])
    );
    expect(response.body.data.attestationTypeStats).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          attestationType: 'blessing',
          total: expect.any(Number),
        }),
      ])
    );
    expect(response.body.data.recentTimeline.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v2/frogs/:frogId/relationship-memory rejects non-owner wallet', async () => {
    const ownerWallet = uniqueAddress();
    const attackerWallet = uniqueAddress();
    const { subject } = await createFrogPair(ownerWallet);

    const response = await request(app)
      .get(`/api/v2/frogs/${subject.id}/relationship-memory`)
      .set('x-wallet-address', attackerWallet);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});
