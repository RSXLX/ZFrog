const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTravels() {
  try {
    // 查看所有旅行记录
    const travels = await prisma.travel.findMany({
      include: {
        frog: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    
    console.log('=== 最近的旅行记录 ===');
    travels.forEach(travel => {
      console.log(`\n旅行ID: ${travel.id}`);
      console.log(`青蛙ID: ${travel.frogId} (${travel.frog?.name})`);
      console.log(`目标钱包: ${travel.targetWallet}`);
      console.log(`链ID: ${travel.chainId}`);
      console.log(`是否随机: ${travel.isRandom}`);
      console.log(`状态: ${travel.status}`);
      console.log(`开始时间: ${travel.startTime}`);
      console.log(`结束时间: ${travel.endTime}`);
      console.log(`当前阶段: ${travel.currentStage}`);
      console.log(`进度: ${travel.progress}%`);
    });
    
    // 查看青蛙状态
    const frogs = await prisma.frog.findMany({
      take: 5
    });
    
    console.log('\n=== 青蛙状态 ===');
    frogs.forEach(frog => {
      console.log(`青蛙ID: ${frog.tokenId} (${frog.name})`);
      console.log(`状态: ${frog.status}`);
      console.log(`总旅行次数: ${frog.totalTravels}`);
    });
    
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTravels();