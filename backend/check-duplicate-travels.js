const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDuplicateTravels() {
  try {
    console.log('=== 检查重复的旅行记录 ===\n');
    
    // 查询最近的旅行记录
    const travels = await prisma.travel.findMany({
      orderBy: { startTime: 'desc' },
      take: 10,
      include: {
        frog: {
          select: { tokenId: true, name: true }
        }
      }
    });
    
    console.log(`最近的 ${travels.length} 条旅行记录:\n`);
    
    travels.forEach((t, idx) => {
      console.log(`${idx + 1}. Travel ID: ${t.id}`);
      console.log(`   青蛙: ${t.frog.name} (tokenId: ${t.frog.tokenId})`);
      console.log(`   状态: ${t.status}`);
      console.log(`   开始时间: ${t.startTime.toISOString()}`);
      console.log(`   结束时间: ${t.endTime.toISOString()}`);
      console.log(`   目标钱包: ${t.targetWallet}`);
      console.log(`   链ID: ${t.chainId}`);
      console.log('');
    });
    
    // 查找时间完全相同的旅行
    console.log('=== 查找潜在的重复记录 ===\n');
    
    const duplicates = await prisma.$queryRaw`
      SELECT 
        "frogId", 
        "startTime"::text,
        COUNT(*) as count
      FROM "Travel"
      GROUP BY "frogId", "startTime"
      HAVING COUNT(*) > 1
    `;
    
    if (duplicates.length > 0) {
      console.log(`发现 ${duplicates.length} 组重复记录：`);
      for (const dup of duplicates) {
        console.log(`  青蛙ID ${dup.frogId}, 开始时间 ${dup.startTime}, 重复次数: ${dup.count}`);
        
        // 查询具体的重复记录
        const records = await prisma.travel.findMany({
          where: {
            frogId: dup.frogId,
            startTime: new Date(dup.startTime)
          },
          include: {
            frog: { select: { name: true, tokenId: true } }
          }
        });
        
        records.forEach(r => {
          console.log(`    - Travel ID: ${r.id}, 状态: ${r.status}`);
        });
      }
    } else {
      console.log('✅ 没有发现重复记录');
    }
    
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicateTravels();
