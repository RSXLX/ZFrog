const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTravelDetails() {
    try {
        // 检查旅行#81的详细信息
        const travel = await prisma.travel.findUnique({
            where: { id: 81 },
            include: {
                frog: true,
            },
        });
        
        if (travel) {
            console.log(`Travel #81 details:`);
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
            console.log('Travel #81 not found');
        }

    } catch (error) {
        console.error('Error checking travel details:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkTravelDetails();