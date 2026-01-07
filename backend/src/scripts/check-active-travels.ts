
import { PrismaClient } from '@prisma/client';
import { omniTravelService } from '../services/omni-travel.service';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Checking Active Cross-Chain Travels ===\n');

  // Find all active cross-chain travels
  const activeTravels = await prisma.travel.findMany({
    where: {
      isCrossChain: true,
      status: { in: ['Active', 'Processing'] },
    },
    include: {
      frog: true,
    },
  });

  console.log(`Found ${activeTravels.length} active cross-chain travel(s):\n`);

  for (const travel of activeTravels) {
    const now = new Date();
    const endTime = new Date(travel.endTime);
    const expired = now > endTime;
    
    console.log(`Travel ID: ${travel.id}`);
    console.log(`  Frog: ${travel.frog?.name} (Token ID: ${travel.frog?.tokenId})`);
    console.log(`  Status: ${travel.status}`);
    console.log(`  CrossChain Status: ${travel.crossChainStatus}`);
    console.log(`  Start: ${travel.startTime}`);
    console.log(`  End: ${travel.endTime}`);
    console.log(`  Duration: ${travel.duration}s`);
    console.log(`  EXPIRED: ${expired ? 'YES ⚠️' : 'NO'}`);
    if (expired) {
      const minutesOverdue = Math.floor((now.getTime() - endTime.getTime()) / 60000);
      console.log(`  Overdue by: ${minutesOverdue} minutes`);
    }
    console.log('');
  }

  if (activeTravels.length > 0) {
    console.log('=== Force Completing Expired Travels ===\n');
    const count = await omniTravelService.checkAndCompleteExpiredTravels();
    console.log(`Completed ${count} travel(s)`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
