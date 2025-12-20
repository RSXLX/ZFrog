const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 递归处理 BigInt 序列化问题
function stringifyBigInt(obj) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') return obj.toString();
    if (obj instanceof Date) return obj.toISOString();
    if (Array.isArray(obj)) return obj.map(stringifyBigInt);
    if (typeof obj === 'object') {
        const newObj = {};
        for (const key in obj) {
            newObj[key] = stringifyBigInt(obj[key]);
        }
        return newObj;
    }
    return obj;
}

async function testStringifyBigInt() {
    try {
        console.log('Testing stringifyBigInt function...');
        
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
        
        // 尝试使用stringifyBigInt序列化
        try {
            const processed = stringifyBigInt(frogs);
            const json = JSON.stringify(processed);
            console.log('stringifyBigInt + JSON.stringify succeeded');
            console.log(`JSON length: ${json.length}`);
        } catch (error) {
            console.error('stringifyBigInt + JSON.stringify failed:', error.message);
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testStringifyBigInt();