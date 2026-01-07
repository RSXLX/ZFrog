
import { PrismaClient, BadgeUnlockType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Travel Badges...');

  const badges = [
    // Trip Count Badges
    {
      code: 'FIRST_STEP',
      name: '第一步',
      description: '完成你的第一次旅行',
      icon: '👣',
      unlockType: 'TRIP_COUNT' as BadgeUnlockType,
      unlockCondition: { threshold: 1 },
      rarity: 1,
    },
    {
      code: 'SEASONED_TRAVELER',
      name: '老练的旅行者',
      description: '完成 10 次旅行',
      icon: '🎒',
      unlockType: 'TRIP_COUNT' as BadgeUnlockType,
      unlockCondition: { threshold: 10 },
      rarity: 2,
    },
    {
      code: 'WORLD_CLASS',
      name: '世界级旅行家',
      description: '完成 50 次旅行',
      icon: '🌏',
      unlockType: 'TRIP_COUNT' as BadgeUnlockType,
      unlockCondition: { threshold: 50 },
      rarity: 4,
    },

    // Chain Visit Badges
    {
      code: 'ZETA_EXPLORER',
      name: 'Zeta 探索者',
      description: '访问 ZetaChain 5 次',
      icon: '🟢',
      unlockType: 'CHAIN_VISIT' as BadgeUnlockType,
      unlockCondition: { chain: 'ZETACHAIN_ATHENS', threshold: 5 },
      rarity: 2,
    },
    {
      code: 'ETH_VETERAN',
      name: '以太老兵',
      description: '访问 Ethereum Sepolia 5 次',
      icon: '🔷',
      unlockType: 'CHAIN_VISIT' as BadgeUnlockType,
      unlockCondition: { chain: 'ETH_SEPOLIA', threshold: 5 },
      rarity: 2,
    },
    {
      code: 'BSC_PIONEER',
      name: 'BSC 先锋',
      description: '访问 BSC Testnet 5 次',
      icon: '🟡',
      unlockType: 'CHAIN_VISIT' as BadgeUnlockType,
      unlockCondition: { chain: 'BSC_TESTNET', threshold: 5 },
      rarity: 2,
    },

    // Multi Chain Badges
    {
      code: 'DIMENSION_HOPPER',
      name: '维度跳跃者',
      description: '访问 2 个不同的链',
      icon: '🌌',
      unlockType: 'MULTI_CHAIN' as BadgeUnlockType,
      unlockCondition: { threshold: 2 },
      rarity: 3,
    },
    {
      code: 'OMNI_TRAVELER',
      name: '全域旅行者',
      description: '访问所有支持的链',
      icon: '👑',
      unlockType: 'MULTI_CHAIN' as BadgeUnlockType,
      unlockCondition: { threshold: 3 }, // Assuming 3 chains currently
      rarity: 5,
    },

    // Rare Find Badges
    {
      code: 'TREASURE_HUNTER',
      name: '宝藏猎人',
      description: '发现一个稀有度 3 或以上的物品',
      icon: '💎',
      unlockType: 'RARE_FIND' as BadgeUnlockType,
      unlockCondition: { minRarity: 3 },
      rarity: 3,
    },
    {
      code: 'LEGENDARY_FINDER',
      name: '传说发现者',
      description: '发现一个传说级物品 (稀有度 5)',
      icon: '🏆',
      unlockType: 'RARE_FIND' as BadgeUnlockType,
      unlockCondition: { minRarity: 5 },
      rarity: 5,
    },
  ];

  for (const badge of badges) {
    const existing = await prisma.travelBadge.findUnique({
      where: { code: badge.code },
    });

    if (!existing) {
      await prisma.travelBadge.create({
        data: badge,
      });
      console.log(`✅ Created badge: ${badge.name} (${badge.code})`);
    } else {
      console.log(`ℹ️ Badge already exists: ${badge.name} (${badge.code})`);
      // Optional: Update if needed
      await prisma.travelBadge.update({
        where: { code: badge.code },
        data: badge,
      });
    }
  }

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
