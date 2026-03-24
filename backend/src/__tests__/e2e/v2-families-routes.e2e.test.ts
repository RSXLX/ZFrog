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

describeIfRealDb('V2 Families Routes E2E (Real DB)', () => {
  const app = express();
  const familyIds: number[] = [];
  const frogIds: number[] = [];

  app.use(express.json());
  app.use('/api/v2', v2Routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  afterEach(async () => {
    if (frogIds.length > 0) {
      await prisma.frog.updateMany({
        where: { id: { in: frogIds } },
        data: { familyId: null },
      });
    }

    if (familyIds.length > 0) {
      await prisma.domainEvent.deleteMany({
        where: {
          aggregateType: 'Family',
          aggregateId: { in: familyIds.map((id) => String(id)) },
        },
      });
      await prisma.family.deleteMany({
        where: { id: { in: familyIds } },
      });
    }

    if (frogIds.length > 0) {
      await prisma.domainEvent.deleteMany({
        where: { frogId: { in: frogIds } },
      });
      await prisma.frog.deleteMany({
        where: { id: { in: frogIds } },
      });
    }

    familyIds.length = 0;
    frogIds.length = 0;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('POST /api/v2/families creates family, persists owner link, and emits family events', async () => {
    const ownerWallet = uniqueAddress();
    const ownerFrog = await prisma.frog.create({
      data: {
        tokenId: uniqueTokenId(),
        name: `Leader-${Date.now()}`,
        ownerAddress: ownerWallet,
        birthday: new Date('2026-03-23T00:00:00.000Z'),
      },
      select: { id: true },
    });
    frogIds.push(ownerFrog.id);

    const familyName = `W3Family-${Date.now()}`;
    const response = await request(app)
      .post('/api/v2/families')
      .set('x-wallet-address', ownerWallet)
      .send({
        name: familyName,
        ownerFrogId: ownerFrog.id,
        goal: 'Grow together',
        visibility: 'friends',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe(familyName);
    expect(response.body.data.ownerFrogId).toBe(ownerFrog.id);
    expect(response.body.data.goal).toBe('Grow together');
    expect(response.body.data.visibility).toBe('friends');
    expect(response.body.data.memberCount).toBe(1);

    const familyId = Number(response.body.data.id);
    familyIds.push(familyId);

    const family = await prisma.family.findUnique({
      where: { id: familyId },
      include: { members: true },
    });
    expect(family).not.toBeNull();
    expect(family?.leaderId).toBe(ownerFrog.id);
    expect(family?.name).toBe(familyName);
    expect(family?.members.some((member) => member.id === ownerFrog.id)).toBe(true);

    const ownerAfter = await prisma.frog.findUnique({
      where: { id: ownerFrog.id },
      select: { familyId: true },
    });
    expect(ownerAfter?.familyId).toBe(familyId);

    const events = await prisma.domainEvent.findMany({
      where: {
        aggregateType: 'Family',
        aggregateId: String(familyId),
      },
      select: { eventType: true },
    });
    expect(events.some((event) => event.eventType === 'FamilyCreated')).toBe(true);
    expect(events.some((event) => event.eventType === 'FamilyMemberJoined')).toBe(true);
  });

  it('GET /api/v2/families/:familyId returns persisted family read model with members', async () => {
    const ownerWallet = uniqueAddress();
    const ownerFrog = await prisma.frog.create({
      data: {
        tokenId: uniqueTokenId(),
        name: `Leader-${Date.now()}`,
        ownerAddress: ownerWallet,
        birthday: new Date('2026-03-23T00:00:00.000Z'),
      },
      select: { id: true },
    });
    frogIds.push(ownerFrog.id);

    const createResp = await request(app)
      .post('/api/v2/families')
      .set('x-wallet-address', ownerWallet)
      .send({
        name: `Family-${Date.now()}`,
        ownerFrogId: ownerFrog.id,
        goal: 'Sync travel',
        visibility: 'private',
      });

    expect(createResp.status).toBe(201);
    const familyId = Number(createResp.body.data.id);
    familyIds.push(familyId);

    const getResp = await request(app)
      .get(`/api/v2/families/${familyId}`)
      .set('x-wallet-address', ownerWallet);

    expect(getResp.status).toBe(200);
    expect(getResp.body.success).toBe(true);
    expect(getResp.body.data.id).toBe(familyId);
    expect(getResp.body.data.ownerFrogId).toBe(ownerFrog.id);
    expect(getResp.body.data.goal).toBe('Sync travel');
    expect(getResp.body.data.visibility).toBe('private');
    expect(getResp.body.data.memberCount).toBe(1);
    expect(getResp.body.data.members[0].role).toBe('leader');
    expect(getResp.body.data.members[0].frogId).toBe(ownerFrog.id);
  });

  it('POST /api/v2/families blocks non-owner wallet with FAMILY_PERMISSION_DENIED', async () => {
    const ownerWallet = uniqueAddress();
    const attackerWallet = uniqueAddress();

    const ownerFrog = await prisma.frog.create({
      data: {
        tokenId: uniqueTokenId(),
        name: `Owner-${Date.now()}`,
        ownerAddress: ownerWallet,
        birthday: new Date('2026-03-23T00:00:00.000Z'),
      },
      select: { id: true },
    });
    frogIds.push(ownerFrog.id);

    const response = await request(app)
      .post('/api/v2/families')
      .set('x-wallet-address', attackerWallet)
      .send({
        name: `Family-${Date.now()}`,
        ownerFrogId: ownerFrog.id,
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('FAMILY_PERMISSION_DENIED');
  });

  it('POST /api/v2/families enforces unique family name with FAMILY_ALREADY_EXISTS', async () => {
    const walletA = uniqueAddress();
    const walletB = uniqueAddress();

    const frogA = await prisma.frog.create({
      data: {
        tokenId: uniqueTokenId(),
        name: `FrogA-${Date.now()}`,
        ownerAddress: walletA,
        birthday: new Date('2026-03-23T00:00:00.000Z'),
      },
      select: { id: true },
    });
    frogIds.push(frogA.id);

    const frogB = await prisma.frog.create({
      data: {
        tokenId: uniqueTokenId(),
        name: `FrogB-${Date.now()}`,
        ownerAddress: walletB,
        birthday: new Date('2026-03-23T00:00:00.000Z'),
      },
      select: { id: true },
    });
    frogIds.push(frogB.id);

    const name = `UniqueFamily-${Date.now()}`;

    const first = await request(app).post('/api/v2/families').set('x-wallet-address', walletA).send({
      name,
      ownerFrogId: frogA.id,
    });
    expect(first.status).toBe(201);
    familyIds.push(Number(first.body.data.id));

    const second = await request(app).post('/api/v2/families').set('x-wallet-address', walletB).send({
      name,
      ownerFrogId: frogB.id,
    });
    expect(second.status).toBe(409);
    expect(second.body.success).toBe(false);
    expect(second.body.error.code).toBe('FAMILY_ALREADY_EXISTS');
  });
});
