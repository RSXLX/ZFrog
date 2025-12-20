const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testBigIntSerialization() {
    try {
        console.log('Testing BigInt serialization...');
        
        const frogs = await prisma.frog.findMany({
            where: { ownerAddress: '0x53c1844af058fe3b3195e49fec8f97e0a4f87772'.toLowerCase() },
            include: {
                travels: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
                souvenirs: true,
            },
        });
        
        console.log(`Found ${frogs.length} frogs`);
        
        // 尝试序列化
        try {
            const json = JSON.stringify(frogs);
            console.log('JSON.stringify succeeded');
        } catch (error) {
            console.error('JSON.stringify failed:', error.message);
            
            // 查找包含BigInt的字段
            if (frogs.length > 0 && frogs[0].travels.length > 0) {
                const travel = frogs[0].travels[0];
                console.log('Travel fields:');
                Object.keys(travel).forEach(key => {
                    const value = travel[key];
                    console.log(`  ${key}: ${typeof value} = ${value}`);
                });
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testBigIntSerialization();