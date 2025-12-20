// backend/scripts/seed-badges.ts

import { PrismaClient, BadgeUnlockType } from '@prisma/client';

const prisma = new PrismaClient();

const badges = [
  // 旅行次数
  {
    code: 'FIRST_TRIP',
    name: '第一次出门',
    description: '完成第一次旅行',
    icon: '🎒',
    unlockType: BadgeUnlockType.TRIP_COUNT,
    unlockCondition: { threshold: 1 },
    rarity: 1,
  },
  {
    code: 'FREQUENT_TRAVELER',
    name: '常旅客',
    description: '完成 5 次旅行',
    icon: '✈️',
    unlockType: BadgeUnlockType.TRIP_COUNT,
    unlockCondition: { threshold: 5 },
    rarity: 2,
  },
  {
    code: 'TRAVEL_ADDICT',
    name: '旅行上瘾',
    description: '完成 20 次旅行',
    icon: '🌍',
    unlockType: BadgeUnlockType.TRIP_COUNT,
    unlockCondition: { threshold: 20 },
    rarity: 3,
  },

  // 链专属
  {
    code: 'BSC_VISITOR',
    name: 'BSC 游客',
    description: '去 BSC 旅行 3 次',
    icon: '🟡',
    unlockType: BadgeUnlockType.CHAIN_VISIT,
    unlockCondition: { chain: 'BSC_TESTNET', threshold: 3 },
    rarity: 2,
  },
  {
    code: 'ETH_VISITOR',
    name: '以太坊游客',
    description: '去以太坊旅行 3 次',
    icon: '💎',
    unlockType: BadgeUnlockType.CHAIN_VISIT,
    unlockCondition: { chain: 'ETH_SEPOLIA', threshold: 3 },
    rarity: 2,
  },
  {
    code: 'ZETA_VISITOR',
    name: 'ZetaChain 游客',
    description: '去 ZetaChain 旅行 3 次',
    icon: '⚡',
    unlockType: BadgeUnlockType.CHAIN_VISIT,
    unlockCondition: { chain: 'ZETACHAIN_ATHENS', threshold: 3 },
    rarity: 2,
  },

  // 多链
  {
    code: 'CHAIN_HOPPER',
    name: '链间旅行者',
    description: '去过 2 条不同的链',
    icon: '🌉',
    unlockType: BadgeUnlockType.MULTI_CHAIN,
    unlockCondition: { threshold: 2 },
    rarity: 2,
  },
  {
    code: 'OMNI_TRAVELER',
    name: '全链旅行家',
    description: '去过所有 3 条链',
    icon: '🌈',
    unlockType: BadgeUnlockType.MULTI_CHAIN,
    unlockCondition: { threshold: 3 },
    rarity: 3,
  },

  // 稀有发现
  {
    code: 'LUCKY_FINDER',
    name: '幸运儿',
    description: '发现稀有度 4 星以上的东西',
    icon: '🍀',
    unlockType: BadgeUnlockType.RARE_FIND,
    unlockCondition: { minRarity: 4 },
    rarity: 3,
  },
  {
    code: 'WHALE_WATCHER',
    name: '观鲸者',
    description: '发现一个巨鲸钱包',
    icon: '🐋',
    unlockType: BadgeUnlockType.RARE_FIND,
    unlockCondition: { minRarity: 5 },
    rarity: 4,
  },
];

async function main() {
  console.log('开始种子徽章数据...');

  for (const badge of badges) {
    await prisma.travelBadge.upsert({
      where: { code: badge.code },
      update: badge,
      create: badge,
    });
    console.log(`✓ ${badge.name}`);
  }

  console.log('徽章数据种子完成！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
