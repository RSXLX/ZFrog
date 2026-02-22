
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Checking ALL active cross-chain travels in DB...');

  const activeTravels = await prisma.travel.findMany({
    where: {
      status: 'Active',
      isCrossChain: true
    },
    include: {
      frog: true
    }
  });

  console.log(`Found ${activeTravels.length} active cross-chain travels.`);

  for (const travel of activeTravels) {
    console.log(`- Travel ID: ${travel.id}`);
    console.log(`  Frog TokenID: ${travel.frog ? travel.frog.tokenId : 'Unknown'}`);
    console.log(`  Frog DB Status: ${travel.frog ? travel.frog.status : 'Unknown'}`);
    console.log(`  Travel Status: ${travel.status}`);
    console.log(`  CC Status: ${travel.crossChainStatus}`);
    
    // Explicitly check for Frog 0
    if (travel.frog && travel.frog.tokenId === 0) {
        console.log(`  >>> FOUND STUCK FROG 0! Clearing...`);
        await prisma.travel.update({
            where: { id: travel.id },
            data: {
                status: 'Failed',
                errorMessage: 'Manual fix: On-chain state cleared (Global Scan)',
                completedAt: new Date(),
                crossChainStatus: 'FAILED'
            }
        });
        
        await prisma.frog.update({
            where: { id: travel.frog.id },
            data: { status: 'Idle' }
        });
        console.log(`  >>> Cleared Frog 0.`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
