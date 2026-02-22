import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  // 检查青蛙 1 状态
  const frog = await prisma.frog.findFirst({ 
    where: { tokenId: 1 },
    include: {
      travels: {
        where: { status: { in: ['Active', 'Processing'] } }
      }
    }
  });
  
  console.log('=== Frog 1 ===');
  console.log('id:', frog?.id);
  console.log('tokenId:', frog?.tokenId);
  console.log('status:', frog?.status);
  console.log('active travels count:', frog?.travels?.length || 0);

  // 检查是否有活跃的旅行
  const activeTravel = await prisma.travel.findFirst({ 
    where: { 
      frog: { tokenId: 1 }, 
      status: { in: ['Active', 'Processing'] } 
    } 
  });
  
  console.log('\n=== Active Travel ===');
  if (activeTravel) {
    console.log('id:', activeTravel.id);
    console.log('status:', activeTravel.status);
    console.log('crossChainStatus:', activeTravel.crossChainStatus);
    console.log('isCrossChain:', activeTravel.isCrossChain);
    console.log('startTime:', activeTravel.startTime);
    console.log('endTime:', activeTravel.endTime);
  } else {
    console.log('No active travel found');
  }

  // 检查所有旅行记录（不限制状态）
  const allTravels = await prisma.travel.findMany({
    where: { frog: { tokenId: 1 } },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log('\n=== Last 5 Travels (ANY status) ===');
  for (const t of allTravels) {
    console.log(`Travel #${t.id}: status=${t.status}, crossChainStatus=${t.crossChainStatus}, isCrossChain=${t.isCrossChain}, endTime=${t.endTime}`);
  }

  await prisma.$disconnect();
}

check().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
