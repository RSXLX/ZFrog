/**
 * 迁移脚本：将 EarnedTravelBadge 数据迁移至 UserBadge
 * Run: npx tsx prisma/seeds/migrate-earned-badges.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 开始迁移 EarnedTravelBadge 到 UserBadge...\n');

  // 1. 获取所有 EarnedTravelBadge 记录
  const earnedBadges = await prisma.earnedTravelBadge.findMany();
  console.log(`  找到 ${earnedBadges.length} 条 EarnedTravelBadge 记录`);

  if (earnedBadges.length === 0) {
    console.log('\n✅ 没有需要迁移的数据。');
    return;
  }

  let migrated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const earned of earnedBadges) {
    // 2. 根据 badgeType 查找对应的 TravelBadge
    const badge = await prisma.travelBadge.findFirst({
      where: { code: earned.badgeType },
    });

    if (!badge) {
      console.log(`  ⚠️ 未找到徽章定义: ${earned.badgeType}`);
      notFound++;
      continue;
    }

    // 3. 检查是否已存在于 UserBadge
    const existing = await prisma.userBadge.findUnique({
      where: {
        frogId_badgeId: {
          frogId: earned.frogId,
          badgeId: badge.id,
        },
      },
    });

    if (existing) {
      console.log(`  ⏭️ 已存在: ${badge.name} (frogId=${earned.frogId})`);
      skipped++;
      continue;
    }

    // 4. 创建 UserBadge 记录
    await prisma.userBadge.create({
      data: {
        frogId: earned.frogId,
        badgeId: badge.id,
        unlockedAt: earned.earnedAt,
        // 可选：从 metadata 提取 travelId
        unlockedByTravelId: (earned.metadata as any)?.travelId || null,
      },
    });

    console.log(`  ✅ 迁移: ${badge.name} (frogId=${earned.frogId})`);
    migrated++;
  }

  console.log(`\n📊 迁移统计：`);
  console.log(`  - 成功迁移: ${migrated} 条`);
  console.log(`  - 已存在跳过: ${skipped} 条`);
  console.log(`  - 徽章未定义: ${notFound} 条`);
  console.log(`\n✅ 迁移完成！`);
}

main()
  .catch((e) => {
    console.error('❌ 迁移错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
