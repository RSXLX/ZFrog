import { Frog, FrogStatus, HibernationStatus, Prisma } from '@prisma/client';
import { prisma } from '../database';

interface BackfillStats {
  totalFrogs: number;
  eggProfilesUpserted: number;
  petStatesUpserted: number;
  soulProfilesUpserted: number;
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const toLifeStage = (frog: Frog): string => {
  if (frog.hibernationStatus === HibernationStatus.SLEEPING) {
    return 'DORMANT';
  }
  if (frog.status === FrogStatus.Traveling) {
    return 'TRAVELING';
  }
  if (frog.status === FrogStatus.Returning) {
    return 'RETURNING';
  }
  return 'ACTIVE';
};

const buildEggProfilePayload = (frog: Frog): Prisma.EggProfileUncheckedCreateInput => ({
  frogId: frog.id,
  claimStatus: 'HATCHED',
  claimedAt: frog.createdAt,
  hatchReadyAt: frog.birthday,
  hatchedAt: frog.birthday,
  imprintSeed: `legacy-${frog.tokenId}`,
  metadata: {
    source: 'v1_backfill',
    tokenId: frog.tokenId,
    ownerAddress: frog.ownerAddress.toLowerCase(),
  },
});

const buildPetStatePayload = (frog: Frog): Prisma.PetStateUncheckedCreateInput => ({
  frogId: frog.id,
  lifeStage: toLifeStage(frog),
  hunger: clamp(frog.hunger, 0, 100),
  happiness: clamp(frog.happiness, 0, 100),
  health: clamp(frog.health, 0, 100),
  energy: clamp(frog.energy, 0, 100),
  cleanliness: clamp(frog.cleanliness, 0, 100),
  isSick: frog.isSick,
  isDormant: frog.hibernationStatus === HibernationStatus.SLEEPING,
  lastCareAt: frog.lastInteractedAt ?? frog.lastFedAt ?? frog.updatedAt,
  lastStateSyncAt: frog.lastStatusUpdate,
  metadata: {
    source: 'v1_backfill',
    legacyStatus: frog.status,
    needsClean: frog.needsClean,
    canEvolve: frog.canEvolve,
  },
});

const buildSoulProfilePayload = (frog: Frog): Prisma.SoulProfileUncheckedCreateInput => ({
  frogId: frog.id,
  personality: frog.personality,
  imprintText: `${frog.name} · ${frog.personality}`,
  temperament: {
    personality: frog.personality,
    level: frog.level,
    xp: frog.xp,
  },
  bondedAt: frog.birthday,
  metadata: {
    source: 'v1_backfill',
    tokenId: frog.tokenId,
  },
});

async function backfillSingleFrog(frog: Frog, dryRun: boolean): Promise<Omit<BackfillStats, 'totalFrogs'>> {
  if (dryRun) {
    return {
      eggProfilesUpserted: 1,
      petStatesUpserted: 1,
      soulProfilesUpserted: 1,
    };
  }

  await prisma.$transaction([
    prisma.eggProfile.upsert({
      where: { frogId: frog.id },
      update: buildEggProfilePayload(frog),
      create: buildEggProfilePayload(frog),
    }),
    prisma.petState.upsert({
      where: { frogId: frog.id },
      update: buildPetStatePayload(frog),
      create: buildPetStatePayload(frog),
    }),
    prisma.soulProfile.upsert({
      where: { frogId: frog.id },
      update: buildSoulProfilePayload(frog),
      create: buildSoulProfilePayload(frog),
    }),
  ]);

  return {
    eggProfilesUpserted: 1,
    petStatesUpserted: 1,
    soulProfilesUpserted: 1,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : undefined;

  const frogs = await prisma.frog.findMany({
    orderBy: { id: 'asc' },
    ...(limit && limit > 0 ? { take: limit } : {}),
  });

  const stats: BackfillStats = {
    totalFrogs: frogs.length,
    eggProfilesUpserted: 0,
    petStatesUpserted: 0,
    soulProfilesUpserted: 0,
  };

  console.log(`[Backfill] Starting V1 domain backfill for ${frogs.length} frogs${dryRun ? ' (dry-run)' : ''}`);

  for (const frog of frogs) {
    const result = await backfillSingleFrog(frog, dryRun);
    stats.eggProfilesUpserted += result.eggProfilesUpserted;
    stats.petStatesUpserted += result.petStatesUpserted;
    stats.soulProfilesUpserted += result.soulProfilesUpserted;
  }

  console.log('[Backfill] Done');
  console.table(stats);
}

main()
  .catch((error) => {
    console.error('[Backfill] Failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
