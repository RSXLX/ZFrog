const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteDuplicateTravels() {
  try {
    console.log('=== 清理重复的旅行记录 ===\n');
    
    // 查找所有重复的旅行
    const duplicates = await prisma.$queryRaw`
      SELECT 
        "frogId", 
        "startTime"::text,
        array_agg("id" ORDER BY "id") as ids,
        COUNT(*) as count
      FROM "Travel"
      GROUP BY "frogId", "startTime"
      HAVING COUNT(*) > 1
    `;
    
    if (duplicates.length === 0) {
      console.log('✅ 没有发现重复记录，无需清理');
      return;
    }
    
    console.log(`发现 ${duplicates.length} 组重复记录:\n`);
    
    let totalDeleted = 0;
    
    for (const dup of duplicates) {
      const ids = dup.ids; // 所有重复记录的ID数组
      const keepId = ids[0]; // 保留第一条
      const deleteIds = ids.slice(1); // 删除其他
      
      console.log(`青蛙ID ${dup.frogId}, 开始时间 ${dup.startTime}`);
      console.log(`  总共 ${dup.count} 条记录: ${ids.join(', ')}`);
      console.log(`  保留 ID ${keepId}, 删除 ${deleteIds.length} 条: ${deleteIds.join(', ')}`);
      
      if (deleteIds.length > 0) {
        await prisma.travel.deleteMany({
          where: {
            id: { in: deleteIds.map(Number) }
          }
        });
        
        totalDeleted += deleteIds.length;
      }
      
      console.log('');
    }
    
    console.log(`✅ 清理完成，共删除 ${totalDeleted} 条重复记录\n`);
    
    // 显示清理后的结果
    const remaining = await prisma.travel.count();
    console.log(`当前旅行记录总数: ${remaining}`);
    
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteDuplicateTravels();
