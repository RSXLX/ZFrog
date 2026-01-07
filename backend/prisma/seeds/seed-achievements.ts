/**
 * Seed script for cross-chain achievements
 * Run: npx tsx prisma/seeds/seed-achievements.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CROSSCHAIN_ACHIEVEMENTS = [
  {
    code: 'CROSS_CHAIN_PIONEER',
    name: 'Cross-Chain Pioneer',
    description: 'Complete first cross-chain transfer',
    icon: 'Z',
    category: 'CROSSCHAIN' as const,
    rarity: 2,
    condition: { type: 'cross_chain_transfer_count', count: 1 },
    isSbt: true,
    isHidden: false,
  },
  {
    code: 'CROSS_CHAIN_FRIENDSHIP',
    name: 'Cross-Chain Friendship',
    description: 'Send cross-chain transfer to friend',
    icon: 'H',
    category: 'CROSSCHAIN' as const,
    rarity: 3,
    condition: { type: 'friend_cross_chain_transfer', count: 1 },
    isSbt: true,
    isHidden: false,
  },
  {
    code: 'CROSS_CHAIN_AMBASSADOR',
    name: 'Cross-Chain Ambassador',
    description: 'Complete 10 cross-chain transfers',
    icon: 'G',
    category: 'CROSSCHAIN' as const,
    rarity: 4,
    condition: { type: 'cross_chain_transfer_count', count: 10 },
    isSbt: true,
    isHidden: false,
  },
  {
    code: 'MULTI_CHAIN_EXPLORER',
    name: 'Multi-Chain Explorer',
    description: 'Transfer to 3 different chains',
    icon: 'M',
    category: 'CROSSCHAIN' as const,
    rarity: 4,
    condition: { type: 'unique_target_chains', count: 3 },
    isSbt: true,
    isHidden: false,
  },
  {
    code: 'ZETA_WHALE',
    name: 'ZETA Whale',
    description: 'Total cross-chain volume over 100 ZETA',
    icon: 'W',
    category: 'CROSSCHAIN' as const,
    rarity: 5,
    condition: { type: 'total_volume', amount: '100' },
    isSbt: true,
    isHidden: false,
  },
];

async function main() {
  console.log('Seeding cross-chain achievements...');

  for (const achievement of CROSSCHAIN_ACHIEVEMENTS) {
    const existing = await prisma.achievement.findUnique({
      where: { code: achievement.code },
    });

    if (existing) {
      console.log(`  [SKIP] ${achievement.code} already exists`);
    } else {
      await prisma.achievement.create({
        data: achievement,
      });
      console.log(`  [OK] Created ${achievement.code}`);
    }
  }

  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
