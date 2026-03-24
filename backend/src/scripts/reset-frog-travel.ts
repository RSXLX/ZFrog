
import { prisma } from '../database';

async function main() {
  const tokenId = 3; // Target Frog #3
  console.log(`🔍 Checking active travels for Frog #${tokenId}...`);

  const activeTravel = await prisma.travel.findFirst({
    where: {
      frog: { tokenId },
      status: { in: ['Active', 'Processing'] },
      isCrossChain: true
    },
  });

  if (!activeTravel) {
    console.log('✅ No active cross-chain travel found for this frog.');
    return;
  }

  console.log(`⚠️ Found active travel ID: ${activeTravel.id}`);
  console.log(`   Status: ${activeTravel.status}`);
  console.log(`   CrossChainStatus: ${activeTravel.crossChainStatus}`);
  console.log(`   TxHash: ${activeTravel.lockTxHash}`);

  // Force update to Completed
  console.log('🛠️ Force completing travel...');
  
  await prisma.travel.update({
    where: { id: activeTravel.id },
    data: {
      status: 'Completed',
      crossChainStatus: 'COMPLETED',
      completedAt: new Date(),
      errorMessage: 'Manually reset via script'
    }
  });

  console.log('✅ Travel marked as Completed.');
  console.log('👉 PLEASE RESTART YOUR BACKEND SERVER NOW to pick up new contract config!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
