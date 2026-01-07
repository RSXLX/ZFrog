
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const userAddress = '0x53C1844Af058fE3B3195e49fEC8f97E0a4F87772'.toLowerCase();
    
    console.log('--- Debug Info ---');
    console.log('Checking for user:', userAddress);

    // 1. Check Frog 2 owner
    const frog2 = await prisma.frog.findUnique({ where: { tokenId: 2 } });
    if (frog2) {
        console.log(`Frog 2 owner: ${frog2.ownerAddress}`);
        console.log(`Is Match? ${frog2.ownerAddress.toLowerCase() === userAddress}`);
    } else {
        console.log('Frog 2 not found');
    }

    // 2. Check User's frog
    const userFrogs = await prisma.frog.findMany({ where: { ownerAddress: userAddress } });
    console.log(`User owns ${userFrogs.length} frogs:`, userFrogs.map(f => f.tokenId));
    
    // 3. List all frogs
    const allFrogs = await prisma.frog.findMany();
    console.log('All Frogs:', allFrogs.map(f => ({ 
        tokenId: f.tokenId, 
        name: f.name, 
        owner: f.ownerAddress 
    })));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
