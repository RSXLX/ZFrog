
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Frog #3 Full Status ===\n');

  // Find frog by tokenId
  const frog = await prisma.frog.findFirst({
    where: { tokenId: 3 },
    include: {
      travels: {
        orderBy: { startTime: 'desc' },
        take: 5,
      },
    },
  });

  if (!frog) {
    console.log('Frog #3 not found!');
    return;
  }

  console.log(`Frog ID: ${frog.id}`);
  console.log(`Token ID: ${frog.tokenId}`);
  console.log(`Name: ${frog.name}`);
  console.log(`Status: ${frog.status}`);
  console.log(`XP: ${frog.xp}`);
  console.log('');

  console.log(`Recent Travels (${frog.travels.length}):`);
  for (const travel of frog.travels) {
    console.log(`  [${travel.id}] ${travel.status} | CrossChain: ${travel.isCrossChain} | Stage: ${travel.currentStage} | End: ${travel.endTime}`);
  }

  // Find ALL active travels for this frog
  const allActiveTravels = await prisma.travel.findMany({
    where: {
      frogId: frog.id,
      status: { in: ['Active', 'Processing'] },
    },
  });

  console.log(`\nAll Active Travels: ${allActiveTravels.length}`);
  for (const t of allActiveTravels) {
    console.log(`  ID: ${t.id}, Status: ${t.status}, isCrossChain: ${t.isCrossChain}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
