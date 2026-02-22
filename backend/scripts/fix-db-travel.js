
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tokenId = 0;
  console.log(`Checking DB active travels for Frog ${tokenId}...`);

  // Find frog
  const frog = await prisma.frog.findUnique({
    where: { tokenId },
  });

  if (!frog) {
    console.log('Frog not found');
    return;
  }
  console.log(`Frog DB Status: ${frog.status}`);

  // Find active travels
  const activeTravels = await prisma.travel.findMany({
    where: {
      frogId: frog.id,
      status: { in: ['Active', 'Processing'] },
    },
  });

  console.log(`Found ${activeTravels.length} active travels in DB.`);

  for (const travel of activeTravels) {
    console.log(`- Travel ID: ${travel.id}, Status: ${travel.status}, CrossChainStatus: ${travel.crossChainStatus}`);
    
    // Force complete/fail it since on-chain it's gone
    console.log(`  -> Marking as Failed/Cancelled due to sync mismatch...`);
    await prisma.travel.update({
      where: { id: travel.id },
      data: {
        status: 'Failed',
        errorMessage: 'Manual fix: On-chain state cleared',
        completedAt: new Date(),
        crossChainStatus: 'FAILED'
      }
    });
  }

  // Also reset frog status in DB if needed
  if (frog.status !== 'Idle') {
    console.log(`Resetting Frog DB status to Idle...`);
    await prisma.frog.update({
      where: { id: frog.id },
      data: { status: 'Idle' }
    });
  }

  console.log('Done syncing DB.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
