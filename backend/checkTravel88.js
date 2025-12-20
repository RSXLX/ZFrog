const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTravel88() {
    try {
        // 检查旅行#88的详细信息
        const travel = await prisma.travel.findUnique({
            where: { id: 88 },
            include: {
                frog: true,
            },
        });
        
        if (travel) {
            console.log(`Travel #88 details:`);
            console.log(`  Frog: ${travel.frog.name} (TokenId: ${travel.frog.tokenId})`);
            console.log(`  Status: ${travel.status}`);
            console.log(`  Start: ${travel.startTime}`);
            console.log(`  End: ${travel.endTime}`);
            console.log(`  Completed: ${travel.completedAt}`);
            console.log(`  Target: ${travel.targetWallet}`);
            console.log(`  ChainId: ${travel.chainId}`);
            console.log(`  JournalHash: ${travel.journalHash}`);
            console.log(`  SouvenirId: ${travel.souvenirId}`);
            console.log(`  IsRandom: ${travel.isRandom}`);
        } else {
            console.log('Travel #88 not found');
        }

    } catch (error) {
        console.error('Error checking travel details:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkTravel88();