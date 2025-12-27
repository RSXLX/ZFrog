
import { prisma } from './database';
import { badgeService } from './services/badge/badge.service';
import { ChainKey } from './config/chains';

async function testUnlock() {
  console.log('Testing manual badge unlock...');

  // 1. Get a random frog
  const frog = await prisma.frog.findFirst();
  if (!frog) {
    console.log('No frogs found');
    return;
  }
  console.log(`Using frog: ${frog.name} (#${frog.tokenId})`);

  // 2. Manually add stats to ensure it meets condition for "First Steps" (1 trip)
  // Check current stats
  let stats = await prisma.frogTravelStats.findUnique({ where: { frogId: frog.id } });
  if (!stats) {
    stats = await prisma.frogTravelStats.create({
      data: { frogId: frog.id, totalTrips: 0 }
    });
  }
  
  // Make sure it has at least 1 trip
  if (stats.totalTrips < 1) {
    await prisma.frogTravelStats.update({
      where: { frogId: frog.id },
      data: { totalTrips: 1 }
    });
    console.log('Updated stats to have 1 trip');
  }

  // 3. Mock correct context
  // Context requires travelId, but checkAndUnlock logic for TRIP_COUNT doesn't strictly depend on it for the condition itself,
  // just for recording who unlocked it. We can use a dummy travelId '0' or find a real one.
  const travel = await prisma.travel.findFirst({ where: { frogId: frog.id } });
  const travelId = travel ? travel.id : 0;

  // 4. Call checkAndUnlock
  console.log('Calling checkAndUnlock...');
  const unlocked = await badgeService.checkAndUnlock(frog.id, {
    chain: 'ZETACHAIN_ATHENS' as ChainKey,
    travelId: travelId,
    discoveries: []
  });

  console.log('Unlocked badges:', unlocked);

  // 5. Verify in DB
  const userBadges = await prisma.userBadge.findMany({ where: { frogId: frog.id } });
  console.log('All user badges:', userBadges.map(ub => ub.badgeId));
}

testUnlock()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());
