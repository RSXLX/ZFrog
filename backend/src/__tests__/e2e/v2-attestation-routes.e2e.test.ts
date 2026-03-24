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

describeIfRealDb('V2 Attestation Routes E2E (Real DB)', () => {
  const app = express();
  const frogIds: number[] = [];
  const attestationIds: string[] = [];

  app.use(express.json());
  app.use('/api/v2', v2Routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  afterEach(async () => {
    if (attestationIds.length > 0) {
      await prisma.domainEvent.deleteMany({
        where: {
          aggregateType: 'Attestation',
          aggregateId: { in: attestationIds },
        },
      });
    }

    if (frogIds.length > 0) {
      await prisma.relationshipEvent.deleteMany({
        where: {
          eventType: 'AttestationSubmitted',
          frogId: { in: frogIds },
        },
      });
    }

    if (attestationIds.length > 0 || frogIds.length > 0) {
      await prisma.relationshipAttestation.deleteMany({
        where: {
          OR: [
            ...(attestationIds.length > 0 ? [{ id: { in: attestationIds } }] : []),
            ...(frogIds.length > 0
              ? [{ subjectFrogId: { in: frogIds } }, { objectFrogId: { in: frogIds } }]
              : []),
          ],
        },
      });
    }

    if (frogIds.length > 0) {
      await prisma.frog.deleteMany({
        where: { id: { in: frogIds } },
      });
    }

    frogIds.length = 0;
    attestationIds.length = 0;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const createFrogPair = async () => {
    const ownerAddress = uniqueAddress();
    const subject = await prisma.frog.create({
      data: {
        tokenId: uniqueTokenId(),
        name: `Subject-${Date.now()}`,
        ownerAddress,
        birthday: new Date('2026-03-23T00:00:00.000Z'),
      },
      select: { id: true, ownerAddress: true },
    });
    const object = await prisma.frog.create({
      data: {
        tokenId: uniqueTokenId(),
        name: `Object-${Date.now()}`,
        ownerAddress: uniqueAddress(),
        birthday: new Date('2026-03-23T00:00:00.000Z'),
      },
      select: { id: true },
    });
    frogIds.push(subject.id, object.id);
    return { subject, object };
  };

  it('POST /api/v2/attestations/relationship creates attestation and domain event', async () => {
    const { subject, object } = await createFrogPair();

    const response = await request(app)
      .post('/api/v2/attestations/relationship')
      .set('x-wallet-address', subject.ownerAddress)
      .send({
        subjectFrogId: subject.id,
        objectFrogId: object.id,
        attestationType: 'blessing',
        source: 'v2-social',
        evidence: { eventId: 'evt_001' },
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('QUEUED');
    expect(response.body.data.idempotentReplay).toBe(false);
    expect(response.body.data.attestationType).toBe('blessing');

    const attestationId = response.body.data.id as string;
    attestationIds.push(attestationId);

    const persisted = await prisma.relationshipAttestation.findUnique({
      where: { id: attestationId },
    });
    expect(persisted).not.toBeNull();

    const event = await prisma.domainEvent.findFirst({
      where: {
        aggregateType: 'Attestation',
        aggregateId: attestationId,
        eventType: 'RelationshipAttested',
      },
    });
    expect(event).not.toBeNull();
  });

  it('POST /api/v2/attestations/relationship/:id/submit-onchain blocks non-owner wallet', async () => {
    const { subject, object } = await createFrogPair();
    const attackerWallet = uniqueAddress();

    const createResponse = await request(app)
      .post('/api/v2/attestations/relationship')
      .set('x-wallet-address', subject.ownerAddress)
      .send({
        subjectFrogId: subject.id,
        objectFrogId: object.id,
        attestationType: 'bond',
        source: 'v2-social',
      });

    expect(createResponse.status).toBe(201);
    const attestationId = createResponse.body.data.id as string;
    attestationIds.push(attestationId);

    const submitResponse = await request(app)
      .post(`/api/v2/attestations/relationship/${attestationId}/submit-onchain`)
      .set('x-wallet-address', attackerWallet)
      .send({});

    expect(submitResponse.status).toBe(403);
    expect(submitResponse.body.success).toBe(false);
    expect(submitResponse.body.error.code).toBe('ATTESTATION_PERMISSION_DENIED');
  });

  it('POST /api/v2/attestations/relationship replays same idempotencyKey', async () => {
    const { subject, object } = await createFrogPair();
    const idempotencyKey = `idem_${Date.now()}`;

    const first = await request(app)
      .post('/api/v2/attestations/relationship')
      .set('x-wallet-address', subject.ownerAddress)
      .send({
        subjectFrogId: subject.id,
        objectFrogId: object.id,
        attestationType: 'care',
        source: 'v2-social',
        idempotencyKey,
      });

    expect(first.status).toBe(201);
    expect(first.body.success).toBe(true);
    expect(first.body.data.idempotentReplay).toBe(false);
    attestationIds.push(first.body.data.id);

    const second = await request(app)
      .post('/api/v2/attestations/relationship')
      .set('x-wallet-address', subject.ownerAddress)
      .send({
        subjectFrogId: subject.id,
        objectFrogId: object.id,
        attestationType: 'care',
        source: 'v2-social',
        idempotencyKey,
      });

    expect(second.status).toBe(200);
    expect(second.body.success).toBe(true);
    expect(second.body.data.idempotentReplay).toBe(true);
    expect(second.body.data.id).toBe(first.body.data.id);

    const count = await prisma.relationshipAttestation.count({
      where: { idempotencyKey },
    });
    expect(count).toBe(1);
  });

  it('POST /api/v2/attestations/relationship replays same semantic tuple without idempotencyKey', async () => {
    const { subject, object } = await createFrogPair();

    const first = await request(app)
      .post('/api/v2/attestations/relationship')
      .set('x-wallet-address', subject.ownerAddress)
      .send({
        subjectFrogId: subject.id,
        objectFrogId: object.id,
        attestationType: 'bond',
        source: 'v2-social',
        evidence: { proof: 'snapshot-1' },
      });

    expect(first.status).toBe(201);
    expect(first.body.success).toBe(true);
    expect(first.body.data.idempotentReplay).toBe(false);
    attestationIds.push(first.body.data.id);

    const second = await request(app)
      .post('/api/v2/attestations/relationship')
      .set('x-wallet-address', subject.ownerAddress)
      .send({
        subjectFrogId: subject.id,
        objectFrogId: object.id,
        attestationType: 'bond',
        source: 'v2-social',
        evidence: { proof: 'snapshot-1' },
      });

    expect(second.status).toBe(200);
    expect(second.body.success).toBe(true);
    expect(second.body.data.idempotentReplay).toBe(true);
    expect(second.body.data.id).toBe(first.body.data.id);

    const count = await prisma.relationshipAttestation.count({
      where: {
        subjectFrogId: subject.id,
        objectFrogId: object.id,
        attestationType: 'bond',
        source: 'v2-social',
      },
    });
    expect(count).toBe(1);
  });

  it('POST /api/v2/attestations/relationship rejects changed payload for same idempotencyKey', async () => {
    const { subject, object } = await createFrogPair();
    const extraObject = await prisma.frog.create({
      data: {
        tokenId: uniqueTokenId(),
        name: `Object-extra-${Date.now()}`,
        ownerAddress: uniqueAddress(),
        birthday: new Date('2026-03-23T00:00:00.000Z'),
      },
      select: { id: true },
    });
    frogIds.push(extraObject.id);

    const idempotencyKey = `idem_conflict_${Date.now()}`;
    const first = await request(app)
      .post('/api/v2/attestations/relationship')
      .set('x-wallet-address', subject.ownerAddress)
      .send({
        subjectFrogId: subject.id,
        objectFrogId: object.id,
        attestationType: 'blessing',
        idempotencyKey,
      });
    expect(first.status).toBe(201);
    attestationIds.push(first.body.data.id);

    const second = await request(app)
      .post('/api/v2/attestations/relationship')
      .set('x-wallet-address', subject.ownerAddress)
      .send({
        subjectFrogId: subject.id,
        objectFrogId: extraObject.id,
        attestationType: 'blessing',
        idempotencyKey,
      });

    expect(second.status).toBe(409);
    expect(second.body.success).toBe(false);
    expect(second.body.error.code).toBe('ATTESTATION_DUPLICATE');
  });

  it('POST /api/v2/attestations/relationship rejects changed payload for same semantic tuple', async () => {
    const { subject, object } = await createFrogPair();

    const first = await request(app)
      .post('/api/v2/attestations/relationship')
      .set('x-wallet-address', subject.ownerAddress)
      .send({
        subjectFrogId: subject.id,
        objectFrogId: object.id,
        attestationType: 'care',
        source: 'v2-social',
        evidence: { level: 1 },
      });
    expect(first.status).toBe(201);
    attestationIds.push(first.body.data.id);

    const second = await request(app)
      .post('/api/v2/attestations/relationship')
      .set('x-wallet-address', subject.ownerAddress)
      .send({
        subjectFrogId: subject.id,
        objectFrogId: object.id,
        attestationType: 'care',
        source: 'v2-social',
        evidence: { level: 2 },
      });

    expect(second.status).toBe(409);
    expect(second.body.success).toBe(false);
    expect(second.body.error.code).toBe('ATTESTATION_DUPLICATE');
  });

  it('GET /api/v2/attestations/relationship supports subject/type filters', async () => {
    const { subject, object } = await createFrogPair();

    const createA = await request(app)
      .post('/api/v2/attestations/relationship')
      .set('x-wallet-address', subject.ownerAddress)
      .send({
        subjectFrogId: subject.id,
        objectFrogId: object.id,
        attestationType: 'blessing',
      });
    expect(createA.status).toBe(201);
    attestationIds.push(createA.body.data.id);

    const createB = await request(app)
      .post('/api/v2/attestations/relationship')
      .set('x-wallet-address', subject.ownerAddress)
      .send({
        subjectFrogId: subject.id,
        objectFrogId: object.id,
        attestationType: 'rescue',
      });
    expect(createB.status).toBe(201);
    attestationIds.push(createB.body.data.id);

    const query = await request(app)
      .get(`/api/v2/attestations/relationship?subjectFrogId=${subject.id}&attestationType=blessing`)
      .set('x-wallet-address', subject.ownerAddress);

    expect(query.status).toBe(200);
    expect(query.body.success).toBe(true);
    expect(query.body.data.total).toBe(1);
    expect(query.body.data.items[0].attestationType).toBe('blessing');
  });

  it('GET /api/v2/attestations/relationship/:attestationId returns attestation detail', async () => {
    const { subject, object } = await createFrogPair();

    const create = await request(app)
      .post('/api/v2/attestations/relationship')
      .set('x-wallet-address', subject.ownerAddress)
      .send({
        subjectFrogId: subject.id,
        objectFrogId: object.id,
        attestationType: 'bond',
      });
    expect(create.status).toBe(201);

    const attestationId = create.body.data.id as string;
    attestationIds.push(attestationId);

    const detail = await request(app)
      .get(`/api/v2/attestations/relationship/${attestationId}`)
      .set('x-wallet-address', subject.ownerAddress);

    expect(detail.status).toBe(200);
    expect(detail.body.success).toBe(true);
    expect(detail.body.data.id).toBe(attestationId);
    expect(detail.body.data.attestationType).toBe('bond');
  });

  it('GET /api/v2/attestations/relationship/:attestationId blocks unrelated wallet', async () => {
    const { subject, object } = await createFrogPair();
    const attackerWallet = uniqueAddress();

    const create = await request(app)
      .post('/api/v2/attestations/relationship')
      .set('x-wallet-address', subject.ownerAddress)
      .send({
        subjectFrogId: subject.id,
        objectFrogId: object.id,
        attestationType: 'care',
      });
    expect(create.status).toBe(201);

    const attestationId = create.body.data.id as string;
    attestationIds.push(attestationId);

    const detail = await request(app)
      .get(`/api/v2/attestations/relationship/${attestationId}`)
      .set('x-wallet-address', attackerWallet);

    expect(detail.status).toBe(403);
    expect(detail.body.success).toBe(false);
    expect(detail.body.error.code).toBe('ATTESTATION_PERMISSION_DENIED');
  });

  it('GET /api/v2/attestations/relationship scopes list results by wallet ownership', async () => {
    const pairA = await createFrogPair();
    const pairB = await createFrogPair();

    const createA = await request(app)
      .post('/api/v2/attestations/relationship')
      .set('x-wallet-address', pairA.subject.ownerAddress)
      .send({
        subjectFrogId: pairA.subject.id,
        objectFrogId: pairA.object.id,
        attestationType: 'bond',
      });
    expect(createA.status).toBe(201);
    attestationIds.push(createA.body.data.id);

    const createB = await request(app)
      .post('/api/v2/attestations/relationship')
      .set('x-wallet-address', pairB.subject.ownerAddress)
      .send({
        subjectFrogId: pairB.subject.id,
        objectFrogId: pairB.object.id,
        attestationType: 'blessing',
      });
    expect(createB.status).toBe(201);
    attestationIds.push(createB.body.data.id);

    const listA = await request(app)
      .get('/api/v2/attestations/relationship')
      .set('x-wallet-address', pairA.subject.ownerAddress);

    expect(listA.status).toBe(200);
    expect(listA.body.success).toBe(true);
    expect(listA.body.data.total).toBe(1);
    expect(listA.body.data.items).toHaveLength(1);
    expect(listA.body.data.items[0].id).toBe(createA.body.data.id);
  });
});
