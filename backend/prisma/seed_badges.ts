
import { PrismaClient, BadgeUnlockType } from '@prisma/client';

const prisma = new PrismaClient();

const badges = [
  // Trip Count Badges
  {
    code: 'FIRST_STEPS',
    name: '初次启程',
    description: '完成你的第一次旅行',
    icon: '🏃',
    unlockType: BadgeUnlockType.TRIP_COUNT,
    unlockCondition: { threshold: 1 },
    rarity: 1,
  },
  {
    code: 'SEASONED_TRAVELER',
    name: '经验丰富的旅行者',
    description: '完成 10 次旅行',
    icon: '🎒',
    unlockType: BadgeUnlockType.TRIP_COUNT,
    unlockCondition: { threshold: 10 },
    rarity: 2,
  },
  {
    code: 'WORLD_EXPLORER',
    name: '世界探险家',
    description: '完成 50 次旅行',
    icon: '🌎',
    unlockType: BadgeUnlockType.TRIP_COUNT,
    unlockCondition: { threshold: 50 },
    rarity: 4,
  },

  // Chain Visit Badges
  {
    code: 'ZETA_PIONEER',
    name: 'Zeta 先锋',
    description: '造访 ZetaChain 5 次',
    icon: '🟩',
    unlockType: BadgeUnlockType.CHAIN_VISIT,
    unlockCondition: { chain: 'ZETACHAIN_ATHENS', threshold: 5 },
    rarity: 2,
  },
  {
    code: 'ETH_NATIVE',
    name: '以太坊原住民',
    description: '造访 Sepolia 5 次',
    icon: '💎',
    unlockType: BadgeUnlockType.CHAIN_VISIT,
    unlockCondition: { chain: 'ETH_SEPOLIA', threshold: 5 },
    rarity: 2,
  },

  // Multi-Chain Badges
  {
    code: 'CROSS_CHAIN_MASTER',
    name: '跨链大师',
    description: '造访过 3 条不同的链',
    icon: '🔗',
    unlockType: BadgeUnlockType.MULTI_CHAIN,
    unlockCondition: { threshold: 3 },
    rarity: 5,
  },

  // Discovery Badges
  {
    code: 'TREASURE_HUNTER',
    name: '寻宝猎人',
    description: '发现一个稀有度为 Epic (4) 或更高的物品',
    icon: '👑',
    unlockType: BadgeUnlockType.RARE_FIND,
    unlockCondition: { minRarity: 4 },
    rarity: 3,
  },
];

async function main() {
  console.log('Start seeding badges...');

  for (const badge of badges) {
    const existing = await prisma.travelBadge.findUnique({
      where: { code: badge.code },
    });

    if (!existing) {
      await prisma.travelBadge.create({
        data: badge,
      });
      console.log(`Created badge: ${badge.name}`);
    } else {
      console.log(`Badge already exists: ${badge.name}`);
    }
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
