import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fix() {
  const tokenId = 1;
  
  // 1. 检查当前状态
  const before = await prisma.frog.findFirst({ 
    where: { tokenId },
  });
  
  console.log('=== 修复前 ===');
  console.log(`Frog #${tokenId}: status = ${before?.status}`);
  
  if (!before) {
    console.log('❌ 未找到青蛙');
    await prisma.$disconnect();
    return;
  }
  
  if (before.status === 'Idle') {
    console.log('✅ 青蛙状态已是 Idle，无需修复');
    await prisma.$disconnect();
    return;
  }
  
  // 2. 确认没有活跃旅行
  const activeTravel = await prisma.travel.findFirst({
    where: { 
      frogId: before.id,
      status: { in: ['Active', 'Processing'] }
    }
  });
  
  if (activeTravel) {
    console.log(`⚠️ 发现活跃旅行 #${activeTravel.id}，不执行重置`);
    console.log(`   旅行状态: ${activeTravel.status}`);
    console.log(`   跨链状态: ${activeTravel.crossChainStatus}`);
    await prisma.$disconnect();
    return;
  }
  
  // 3. 执行修复
  await prisma.frog.update({
    where: { id: before.id },
    data: { status: 'Idle' }
  });
  
  // 4. 验证修复结果
  const after = await prisma.frog.findFirst({ 
    where: { tokenId },
  });
  
  console.log('\n=== 修复后 ===');
  console.log(`Frog #${tokenId}: status = ${after?.status}`);
  console.log('✅ 修复完成！');
  
  await prisma.$disconnect();
}

fix().catch(e => {
  console.error('修复失败:', e);
  prisma.$disconnect();
  process.exit(1);
});
