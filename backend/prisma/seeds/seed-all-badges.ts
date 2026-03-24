/**
 * 完整徽章种子脚本 - 包含所有徽章定义
 * Run: npx ts-node prisma/seeds/seed-all-badges.ts
 */

import { PrismaClient } from '@prisma/client';
import { BADGE_DEFINITIONS } from '../../src/services/badge/badge-definitions';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 开始播种徽章数据...\\n');

  let created = 0;
  let updated = 0;

  for (const badge of BADGE_DEFINITIONS) {
    const existing = await prisma.travelBadge.findUnique({
      where: { code: badge.code },
    });

    if (existing) {
      // 更新已存在的徽章
      await prisma.travelBadge.update({
        where: { code: badge.code },
        data: {
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          unlockType: badge.unlockType,
          unlockCondition: badge.unlockCondition,
          rarity: badge.rarity,
          isHidden: badge.isHidden ?? false,
          airdropEnabled: badge.airdropEnabled ?? false,
          airdropAmount: badge.airdropAmount ?? null,
        },
      });
      const airdrop = badge.airdropAmount ? ` (${Number(BigInt(badge.airdropAmount)) / 1e18} ZETA)` : '';
      console.log(`  [UPDATE] ${badge.icon} ${badge.name}${airdrop}`);
      updated++;
    } else {
      await prisma.travelBadge.create({
        data: {
          code: badge.code,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          unlockType: badge.unlockType,
          unlockCondition: badge.unlockCondition,
          rarity: badge.rarity,
          isHidden: badge.isHidden ?? false,
          airdropEnabled: badge.airdropEnabled ?? false,
          airdropAmount: badge.airdropAmount ?? null,
        },
      });
      const airdrop = badge.airdropAmount ? ` (${Number(BigInt(badge.airdropAmount)) / 1e18} ZETA)` : '';
      console.log(`  [CREATE] ${badge.icon} ${badge.name}${airdrop}`);
      created++;
    }
  }

  console.log(`\\n✅ 完成！创建 ${created} 个，更新 ${updated} 个，共 ${BADGE_DEFINITIONS.length} 个徽章。`);
}

main()
  .catch((e) => {
    console.error('❌ 错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
