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

describeIfRealDb('V2 Communities Routes E2E (Real DB)', () => {
  const app = express();
  const communityIds: string[] = [];
  const frogIds: number[] = [];

  app.use(express.json());
  app.use('/api/v2', v2Routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  afterEach(async () => {
    if (communityIds.length > 0) {
      await prisma.domainEvent.deleteMany({
        where: {
          aggregateType: 'Community',
          aggregateId: { in: communityIds },
        },
      });
      await prisma.userCommunity.deleteMany({
        where: { communityId: { in: communityIds } },
      });
      await prisma.community.deleteMany({
        where: { id: { in: communityIds } },
      });
    }

    if (frogIds.length > 0) {
      await prisma.domainEvent.deleteMany({
        where: {
          aggregateType: 'Community',
          frogId: { in: frogIds },
        },
      });
      await prisma.frog.deleteMany({
        where: { id: { in: frogIds } },
      });
    }

    communityIds.length = 0;
    frogIds.length = 0;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('POST /api/v2/communities/:communityId/join joins community and emits domain event', async () => {
    const community = await prisma.community.create({
      data: {
        name: `Community-${Date.now()}`,
        credentialType: 'PUBLIC',
        isActive: true,
      },
    });
    communityIds.push(community.id);

    const walletAddress = uniqueAddress();
    const frog = await prisma.frog.create({
      data: {
        tokenId: uniqueTokenId(),
        name: `Frog-${Date.now()}`,
        ownerAddress: walletAddress,
        birthday: new Date('2026-03-23T00:00:00.000Z'),
      },
      select: { id: true },
    });
    frogIds.push(frog.id);

    const response = await request(app)
      .post(`/api/v2/communities/${community.id}/join`)
      .set('x-wallet-address', walletAddress)
      .send({
        frogId: frog.id,
        role: 'moderator',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.community.id).toBe(community.id);
    expect(response.body.data.community.memberCount).toBe(1);
    expect(response.body.data.membership.userAddress).toBe(walletAddress.toLowerCase());
    expect(response.body.data.membership.frogId).toBe(frog.id);
    expect(response.body.data.membership.role).toBe('moderator');

    const joined = await prisma.userCommunity.findUnique({
      where: {
        userAddress_communityId: {
          userAddress: walletAddress.toLowerCase(),
          communityId: community.id,
        },
      },
    });
    expect(joined).not.toBeNull();
    expect(joined?.credential).toBe(`v2-community:moderator:${frog.id}`);

    const event = await prisma.domainEvent.findFirst({
      where: {
        aggregateType: 'Community',
        aggregateId: community.id,
        eventType: 'CommunityJoined',
      },
    });
    expect(event).not.toBeNull();
  });

  it('GET /api/v2/communities/:communityId returns active community profile', async () => {
    const community = await prisma.community.create({
      data: {
        name: `Profile-${Date.now()}`,
        icon: 'frog',
        themeColor: '#00AA88',
        description: 'community profile test',
        credentialType: 'PUBLIC',
        memberCount: 2,
        isOfficial: true,
        isActive: true,
      },
    });
    communityIds.push(community.id);

    const response = await request(app)
      .get(`/api/v2/communities/${community.id}`)
      .set('x-wallet-address', uniqueAddress());

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(community.id);
    expect(response.body.data.name).toBe(community.name);
    expect(response.body.data.icon).toBe('frog');
    expect(response.body.data.credentialType).toBe('PUBLIC');
    expect(response.body.data.memberCount).toBe(2);
    expect(response.body.data.isOfficial).toBe(true);
  });

  it('GET /api/v2/communities/:communityId/members returns normalized members projection', async () => {
    const community = await prisma.community.create({
      data: {
        name: `Members-${Date.now()}`,
        credentialType: 'PUBLIC',
        memberCount: 2,
      },
    });
    communityIds.push(community.id);

    await prisma.userCommunity.createMany({
      data: [
        {
          userAddress: uniqueAddress().toLowerCase(),
          communityId: community.id,
          credential: 'v2-community:member:101',
          joinedAt: new Date('2026-03-23T00:00:01.000Z'),
          isActive: false,
        },
        {
          userAddress: uniqueAddress().toLowerCase(),
          communityId: community.id,
          credential: 'v2-community:moderator:202',
          joinedAt: new Date('2026-03-23T00:00:02.000Z'),
          isActive: true,
        },
      ],
    });

    const response = await request(app)
      .get(`/api/v2/communities/${community.id}/members`)
      .set('x-wallet-address', uniqueAddress());

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.communityId).toBe(community.id);
    expect(response.body.data.memberCount).toBe(2);
    expect(response.body.data.members).toHaveLength(2);
    expect(response.body.data.members[0].frogId).toBe(101);
    expect(response.body.data.members[0].role).toBe('member');
    expect(response.body.data.members[1].frogId).toBe(202);
    expect(response.body.data.members[1].role).toBe('moderator');
    expect(response.body.data.members[1].isActive).toBe(true);
  });

  it('POST /api/v2/communities/:communityId/join blocks non-owner wallet', async () => {
    const community = await prisma.community.create({
      data: {
        name: `Permission-${Date.now()}`,
        credentialType: 'PUBLIC',
      },
    });
    communityIds.push(community.id);

    const ownerWallet = uniqueAddress();
    const attackerWallet = uniqueAddress();
    const frog = await prisma.frog.create({
      data: {
        tokenId: uniqueTokenId(),
        name: `Owner-${Date.now()}`,
        ownerAddress: ownerWallet,
        birthday: new Date('2026-03-23T00:00:00.000Z'),
      },
      select: { id: true },
    });
    frogIds.push(frog.id);

    const response = await request(app)
      .post(`/api/v2/communities/${community.id}/join`)
      .set('x-wallet-address', attackerWallet)
      .send({ frogId: frog.id });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('COMMUNITY_PERMISSION_DENIED');
  });

  it('POST /api/v2/communities/:communityId/join rejects duplicate membership', async () => {
    const community = await prisma.community.create({
      data: {
        name: `Duplicate-${Date.now()}`,
        credentialType: 'PUBLIC',
      },
    });
    communityIds.push(community.id);

    const walletAddress = uniqueAddress();
    const frog = await prisma.frog.create({
      data: {
        tokenId: uniqueTokenId(),
        name: `DupFrog-${Date.now()}`,
        ownerAddress: walletAddress,
        birthday: new Date('2026-03-23T00:00:00.000Z'),
      },
      select: { id: true },
    });
    frogIds.push(frog.id);

    await prisma.userCommunity.create({
      data: {
        userAddress: walletAddress.toLowerCase(),
        communityId: community.id,
        credential: `v2-community:member:${frog.id}`,
      },
    });
    await prisma.community.update({
      where: { id: community.id },
      data: { memberCount: 1 },
    });

    const response = await request(app)
      .post(`/api/v2/communities/${community.id}/join`)
      .set('x-wallet-address', walletAddress)
      .send({ frogId: frog.id });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('COMMUNITY_ALREADY_MEMBER');
  });
});
