const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkFrogStatus() {
    try {
        // 检查青蛙在数据库中的状态
        const frog = await prisma.frog.findUnique({
            where: { tokenId: 1 },
        });
        
        if (frog) {
            console.log(`Frog #1 in database:`);
            console.log(`  ID: ${frog.id}`);
            console.log(`  TokenId: ${frog.tokenId}`);
            console.log(`  Name: ${frog.name}`);
            console.log(`  Status: ${frog.status}`);
            console.log(`  Total travels: ${frog.totalTravels}`);
            console.log(`  P0 travels: ${frog.p0Travels}`);
            console.log(`  XP: ${frog.xp}`);
            console.log(`  Level: ${frog.level}`);
        } else {
            console.log('Frog #1 not found in database');
        }

        // 检查最近的旅行记录
        const travels = await prisma.travel.findMany({
            where: { frogId: frog?.id },
            orderBy: { createdAt: 'desc' },
            take: 5,
        });

        console.log('\nRecent travels:');
        travels.forEach(travel => {
            console.log(`  Travel #${travel.id}:`);
            console.log(`    Status: ${travel.status}`);
            console.log(`    Start: ${travel.startTime}`);
            console.log(`    End: ${travel.endTime}`);
            console.log(`    Completed: ${travel.completedAt}`);
            console.log(`    Target: ${travel.targetWallet}`);
        });

    } catch (error) {
        console.error('Error checking frog status:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkFrogStatus();