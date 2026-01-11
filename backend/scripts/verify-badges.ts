// 验证徽章数量
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  const total = await prisma.travelBadge.count();
  const byType = await prisma.travelBadge.groupBy({
    by: ['unlockType'],
    _count: true,
  });

  console.log('📊 徽章统计:');
  console.log(`  总数: ${total}`);
  console.log('\n按类型分布:');
  byType.forEach(t => console.log(`  ${t.unlockType}: ${t._count}`));
}

verify()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
