
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listFrogs() {
  console.log('🐸 Listing all frogs in the database...');
  const frogs = await prisma.frog.findMany({
    orderBy: { tokenId: 'asc' },
    include: {
      travels: {
        where: { status: { in: ['Active', 'Processing'] } },
        take: 1
      }
    }
  });

  if (frogs.length === 0) {
    console.log('No frogs found.');
  } else {
    console.table(frogs.map(f => ({
      ID: f.id,
      TokenID: f.tokenId,
      Name: f.name,
      Status: f.status,
      Owner: f.ownerAddress, // Keep full address to check ownership
      ActiveTravel: f.travels.length > 0 ? f.travels[0].isCrossChain ? 'Cross-Chain' : 'Local' : 'None'
    })));
  }
}

listFrogs()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
