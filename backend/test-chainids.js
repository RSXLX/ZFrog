const { prisma } = require('./dist/database.js');

async function checkChainIds() {
  try {
    const travels = await prisma.travel.findMany({
      where: { 
        frog: { ownerAddress: '0x53c1844af058fe3b3195e49fec8f97e0a4f87772' }
      },
      select: { chainId: true, status: true }
    });
    console.log('Chain IDs found:', travels);
    
    // 统计每个 chainId 的数量
    const chainCounts = travels.reduce((acc, travel) => {
      acc[travel.chainId] = (acc[travel.chainId] || 0) + 1;
      return acc;
    }, {});
    console.log('Chain ID counts:', chainCounts);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkChainIds();