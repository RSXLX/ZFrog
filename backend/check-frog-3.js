const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFrog() {
  try {
    console.log('查询 tokenId = 3 的青蛙...');
    const frog = await prisma.frog.findUnique({
      where: { tokenId: 3 }
    });
    
    if (frog) {
      console.log('找到青蛙:', JSON.stringify(frog, null, 2));
    } else {
      console.log('❌ 未找到 tokenId = 3 的青蛙');
      
      console.log('\n查询所有青蛙的 tokenId:');
      const frogs = await prisma.frog.findMany({
        select: {
          id: true,
          tokenId: true,
          name: true,
          ownerAddress: true
        }
      });
      console.log('数据库中的青蛙:', JSON.stringify(frogs, null, 2));
    }
  } catch (error) {
    console.error('查询错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFrog();
