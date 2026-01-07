
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking Travel Status for Frog Token 0...');
  
  const frog = await prisma.frog.findUnique({
    where: { tokenId: 0 },
    include: {
        travels: {
            where: {
                status: { in: ['Active', 'Processing'] }
            }
        }
    }
  });

  if (!frog) {
    console.log('Frog 0 not found in DB!');
    return;
  }

  console.log(`Frog Status: ${frog.status}`);
  console.log(`Active Travels: ${frog.travels.length}`);

  for (const travel of frog.travels) {
      console.log('--------------------------------');
      console.log(`Travel ID: ${travel.id}`);
      console.log(`Current Stage: ${travel.currentStage}`);
      console.log(`Status: ${travel.status}`);
      console.log(`Is CrossChain: ${travel.isCrossChain}`);
      console.log(`startTime: ${travel.startTime}`);
      console.log(`Outbound Msg: ${travel.crossChainMessageId || 'None'}`);
      console.log(`Lock Tx: ${travel.lockTxHash || 'None'}`);
      console.log('--------------------------------');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
