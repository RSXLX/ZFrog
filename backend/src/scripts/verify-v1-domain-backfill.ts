import { prisma } from '../database';

const SAMPLE_LIMIT = 20;

async function main() {
  const frogs = await prisma.frog.findMany({
    select: { id: true, tokenId: true, ownerAddress: true },
    orderBy: { id: 'asc' },
  });

  const frogIds = frogs.map((frog) => frog.id);
  const totalFrogs = frogs.length;

  const [eggProfiles, petStates, soulProfiles] = await Promise.all([
    prisma.eggProfile.findMany({
      where: { frogId: { in: frogIds } },
      select: { frogId: true },
    }),
    prisma.petState.findMany({
      where: { frogId: { in: frogIds } },
      select: { frogId: true },
    }),
    prisma.soulProfile.findMany({
      where: { frogId: { in: frogIds } },
      select: { frogId: true },
    }),
  ]);

  const eggSet = new Set(eggProfiles.map((item) => item.frogId));
  const petSet = new Set(petStates.map((item) => item.frogId));
  const soulSet = new Set(soulProfiles.map((item) => item.frogId));

  const missingEgg = frogs.filter((frog) => !eggSet.has(frog.id));
  const missingPet = frogs.filter((frog) => !petSet.has(frog.id));
  const missingSoul = frogs.filter((frog) => !soulSet.has(frog.id));

  const report = {
    totalFrogs,
    eggProfiles: eggProfiles.length,
    petStates: petStates.length,
    soulProfiles: soulProfiles.length,
    missingEggProfiles: missingEgg.length,
    missingPetStates: missingPet.length,
    missingSoulProfiles: missingSoul.length,
  };

  console.log('[Verify] V1 domain backfill verification');
  console.table(report);

  if (missingEgg.length > 0) {
    console.log('[Verify] Missing egg_profiles sample:', missingEgg.slice(0, SAMPLE_LIMIT));
  }
  if (missingPet.length > 0) {
    console.log('[Verify] Missing pet_states sample:', missingPet.slice(0, SAMPLE_LIMIT));
  }
  if (missingSoul.length > 0) {
    console.log('[Verify] Missing soul_profiles sample:', missingSoul.slice(0, SAMPLE_LIMIT));
  }

  if (missingEgg.length > 0 || missingPet.length > 0 || missingSoul.length > 0) {
    process.exitCode = 1;
    return;
  }

  console.log('[Verify] PASS: all frogs have v1 core domain records');
}

main()
  .catch((error) => {
    console.error('[Verify] Failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
