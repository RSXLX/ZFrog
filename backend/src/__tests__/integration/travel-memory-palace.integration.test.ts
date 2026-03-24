import { ChainType, FrogStatus, Rarity, TravelStage, TravelStatus } from '@prisma/client';
import { prisma } from '../../database';
import { travelCommandServiceV1 } from '../../modules/travel/travel.command';

const describeIfRealDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

const uniqueHex = (): string => {
  const seed = `${Date.now().toString(16)}${Math.floor(Math.random() * 1_000_000)
    .toString(16)
    .padStart(5, '0')}`;
  return seed.slice(-40).padStart(40, '0');
};

describeIfRealDb('Travel Command + Memory Palace Integration (Real DB)', () => {
  let frogId: number | null = null;
  let travelId: number | null = null;
  let souvenirId: number | null = null;

  afterEach(async () => {
    if (travelId) {
      await prisma.domainEvent.deleteMany({ where: { travelId } });
      await prisma.onchainMilestone.deleteMany({ where: { travelId } });
      await prisma.travelDiscovery.deleteMany({ where: { travelId } });
      await prisma.travel.deleteMany({ where: { id: travelId } });
    }

    if (frogId) {
      await prisma.domainEvent.deleteMany({ where: { frogId } });
      await prisma.onchainMilestone.deleteMany({ where: { frogId } });
      await prisma.memoryPalace.deleteMany({ where: { frogId } });
    }

    if (souvenirId) {
      await prisma.souvenir.deleteMany({ where: { id: souvenirId } });
    }

    if (frogId) {
      await prisma.frog.deleteMany({ where: { id: frogId } });
    }

    frogId = null;
    travelId = null;
    souvenirId = null;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('completeTravel upserts memory_palaces and emits recap domain events', async () => {
    const ownerAddress = `0x${uniqueHex()}`;
    const tokenId = Number(`${Date.now()}`.slice(-8));
    const souvenirTokenId = Number(`${Date.now()}`.slice(-8)) + 100_000;
    const now = Date.now();

    const frog = await prisma.frog.create({
      data: {
        tokenId,
        name: `MemoryFrog-${tokenId}`,
        ownerAddress,
        birthday: new Date('2026-03-21T00:00:00.000Z'),
        status: FrogStatus.Traveling,
      },
      select: { id: true },
    });
    frogId = frog.id;

    const souvenir = await prisma.souvenir.create({
      data: {
        tokenId: souvenirTokenId,
        frogId: frog.id,
        name: '潮汐碎片',
        rarity: Rarity.Rare,
        chainType: ChainType.ZETACHAIN_ATHENS,
        mintedAt: new Date(now - 15 * 60_000),
      },
      select: { id: true },
    });
    souvenirId = souvenir.id;

    const travel = await prisma.travel.create({
      data: {
        frogId: frog.id,
        targetWallet: '0x0000000000000000000000000000000000000000',
        targetChain: ChainType.ZETACHAIN_ATHENS,
        chainId: 7001,
        isRandom: true,
        isCrossChain: false,
        startTime: new Date(now - 60 * 60_000),
        endTime: new Date(now + 10 * 60_000),
        duration: 3600,
        status: TravelStatus.Active,
        currentStage: TravelStage.DEPARTING,
        progress: 42,
        journalContent: JSON.stringify({
          title: '旅行日志',
          content: '今天我在链上遇到了新的朋友，还捡到了纪念品。',
          mood: 'EXCITED',
        }),
        souvenirId: souvenir.id,
      },
      select: { id: true },
    });
    travelId = travel.id;

    await prisma.travelDiscovery.create({
      data: {
        travelId: travel.id,
        type: 'fun_fact',
        title: '发现新地址',
        description: '在链上发现了活跃账户',
        rarity: 3,
        chainType: ChainType.ZETACHAIN_ATHENS,
      },
    });

    await prisma.onchainMilestone.create({
      data: {
        frogId: frog.id,
        travelId: travel.id,
        milestoneType: 'TRAVEL_STARTED',
        chainId: 7001,
        txHash: `0x${uniqueHex()}`,
        blockNumber: BigInt(123456),
        payload: { source: 'integration-test' },
      },
    });

    const result = await travelCommandServiceV1.completeTravel({
      travelId: travel.id,
      walletAddress: ownerAddress,
      source: 'integration_test',
      requestId: `req-${Date.now()}`,
    });

    expect(result.travelId).toBe(travel.id);
    expect(result.status).toBe('COMPLETED');
    expect(result.currentStage).toBe('COMPLETED');

    const updatedTravel = await prisma.travel.findUnique({
      where: { id: travel.id },
      select: { status: true, currentStage: true, progress: true, completedAt: true },
    });
    expect(updatedTravel?.status).toBe(TravelStatus.Completed);
    expect(updatedTravel?.currentStage).toBe(TravelStage.RETURNING);
    expect(updatedTravel?.progress).toBe(100);
    expect(updatedTravel?.completedAt).not.toBeNull();

    const updatedFrog = await prisma.frog.findUnique({
      where: { id: frog.id },
      select: { status: true },
    });
    expect(updatedFrog?.status).toBe(FrogStatus.Idle);

    const palace = await prisma.memoryPalace.findUnique({
      where: { frogId: frog.id },
      select: {
        id: true,
        frogId: true,
        recapText: true,
        timeline: true,
        highlights: true,
        metadata: true,
      },
    });

    expect(palace).not.toBeNull();
    expect(palace?.frogId).toBe(frog.id);
    expect(palace?.recapText).toContain('MemoryFrog');
    expect(Array.isArray(palace?.timeline)).toBe(true);
    expect(Array.isArray(palace?.highlights)).toBe(true);

    const timeline = (palace?.timeline || []) as Array<Record<string, unknown>>;
    expect(timeline.some((item) => item.type === 'TRAVEL_STARTED')).toBe(true);

    const events = await prisma.domainEvent.findMany({
      where: { travelId: travel.id },
      select: {
        aggregateType: true,
        eventType: true,
      },
    });

    expect(
      events.some((event) => event.aggregateType === 'Travel' && event.eventType === 'TravelCompleted')
    ).toBe(true);
    expect(
      events.some(
        (event) => event.aggregateType === 'MemoryPalace' && event.eventType === 'TravelRecapGenerated'
      )
    ).toBe(true);
    expect(
      events.some(
        (event) => event.aggregateType === 'MemoryPalace' && event.eventType === 'MemoryPalaceCreated'
      )
    ).toBe(true);
  });
});
