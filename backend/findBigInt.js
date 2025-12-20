const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findBigIntInTravels() {
    try {
        console.log('Looking for BigInt in travels...');
        
        // 查找所有有exploredBlock的旅行
        const travelsWithBlock = await prisma.travel.findMany({
            where: {
                exploredBlock: {
                    not: null
                }
            },
            take: 5
        });
        
        console.log(`Found ${travelsWithBlock.length} travels with exploredBlock`);
        
        if (travelsWithBlock.length > 0) {
            const travel = travelsWithBlock[0];
            console.log('Travel with exploredBlock:');
            console.log(`  exploredBlock: ${typeof travel.exploredBlock} = ${travel.exploredBlock}`);
            
            // 尝试序列化这个旅行
            try {
                const json = JSON.stringify(travel);
                console.log('Single travel JSON.stringify succeeded');
            } catch (error) {
                console.error('Single travel JSON.stringify failed:', error.message);
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

findBigIntInTravels();