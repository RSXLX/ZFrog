/**
 * 完整徽章种子脚本 - 包含所有 38 个徽章定义
 * Run: npx tsx prisma/seeds/seed-all-badges.ts
 */

import { PrismaClient, BadgeUnlockType } from '@prisma/client';

const prisma = new PrismaClient();

const BADGES = [
  // ========== 🗺️ 旅行探险类 ==========
  {
    code: 'FIRST_STEPS',
    name: '初次启程',
    description: '完成第一次旅行',
    icon: '🏃',
    unlockType: BadgeUnlockType.TRIP_COUNT,
    unlockCondition: { threshold: 1 },
    rarity: 1,
    airdropEnabled: true,
    airdropAmount: '100000000000000000', // 0.1 ZETA
  },
  {
    code: 'FREQUENT_TRAVELER',
    name: '常旅客',
    description: '完成 5 次旅行',
    icon: '🎫',
    unlockType: BadgeUnlockType.TRIP_COUNT,
    unlockCondition: { threshold: 5 },
    rarity: 2,
    airdropEnabled: true,
    airdropAmount: '200000000000000000', // 0.2 ZETA
  },
  {
    code: 'SEASONED_TRAVELER',
    name: '经验丰富的旅行者',
    description: '完成 10 次旅行',
    icon: '🎒',
    unlockType: BadgeUnlockType.TRIP_COUNT,
    unlockCondition: { threshold: 10 },
    rarity: 2,
    airdropEnabled: true,
    airdropAmount: '300000000000000000', // 0.3 ZETA
  },
  {
    code: 'WORLD_EXPLORER',
    name: '世界探险家',
    description: '完成 50 次旅行',
    icon: '🌎',
    unlockType: BadgeUnlockType.TRIP_COUNT,
    unlockCondition: { threshold: 50 },
    rarity: 4,
    airdropEnabled: true,
    airdropAmount: '1000000000000000000', // 1 ZETA
  },
  {
    code: 'LEGENDARY_WANDERER',
    name: '传奇流浪者',
    description: '完成 100 次旅行',
    icon: '🏔️',
    unlockType: BadgeUnlockType.TRIP_COUNT,
    unlockCondition: { threshold: 100 },
    rarity: 5,
    airdropEnabled: true,
    airdropAmount: '2000000000000000000', // 2 ZETA
  },
  {
    code: 'NIGHT_OWL',
    name: '夜猫子',
    description: '在午夜时分出发旅行',
    icon: '🦉',
    unlockType: BadgeUnlockType.SPECIAL,
    unlockCondition: { type: 'departure_hour', hour: 0 },
    rarity: 3,
    isHidden: true,
    airdropEnabled: true,
    airdropAmount: '500000000000000000', // 0.5 ZETA
  },
  {
    code: 'EARLY_BIRD',
    name: '早起的蛙',
    description: '在凌晨 5 点前出发',
    icon: '🌅',
    unlockType: BadgeUnlockType.SPECIAL,
    unlockCondition: { type: 'departure_hour', before: 5 },
    rarity: 3,
    isHidden: true,
    airdropEnabled: true,
    airdropAmount: '500000000000000000', // 0.5 ZETA
  },

  // ========== ⛓️ 跨链探索类 ==========
  {
    code: 'ZETA_PIONEER',
    name: 'Zeta 先锋',
    description: '造访 ZetaChain 5 次',
    icon: '🟩',
    unlockType: BadgeUnlockType.CHAIN_VISIT,
    unlockCondition: { chain: 'ZETACHAIN_ATHENS', threshold: 5 },
    rarity: 2,
    airdropEnabled: true,
    airdropAmount: '200000000000000000', // 0.2 ZETA
  },
  {
    code: 'ZETA_MASTER',
    name: 'Zeta 大师',
    description: '造访 ZetaChain 20 次',
    icon: '🔰',
    unlockType: BadgeUnlockType.CHAIN_VISIT,
    unlockCondition: { chain: 'ZETACHAIN_ATHENS', threshold: 20 },
    rarity: 4,
    airdropEnabled: true,
    airdropAmount: '1000000000000000000', // 1 ZETA
  },
  {
    code: 'ETH_NATIVE',
    name: '以太坊原住民',
    description: '造访 Sepolia 5 次',
    icon: '💎',
    unlockType: BadgeUnlockType.CHAIN_VISIT,
    unlockCondition: { chain: 'ETH_SEPOLIA', threshold: 5 },
    rarity: 2,
    airdropEnabled: true,
    airdropAmount: '200000000000000000', // 0.2 ZETA
  },
  {
    code: 'ETH_WHISPERER',
    name: '以太低语者',
    description: '造访 Sepolia 20 次',
    icon: '🔮',
    unlockType: BadgeUnlockType.CHAIN_VISIT,
    unlockCondition: { chain: 'ETH_SEPOLIA', threshold: 20 },
    rarity: 4,
    airdropEnabled: true,
    airdropAmount: '1000000000000000000', // 1 ZETA
  },
  {
    code: 'BSC_EXPLORER',
    name: '币安链探索者',
    description: '造访 BSC Testnet 5 次',
    icon: '🟡',
    unlockType: BadgeUnlockType.CHAIN_VISIT,
    unlockCondition: { chain: 'BSC_TESTNET', threshold: 5 },
    rarity: 2,
    airdropEnabled: true,
    airdropAmount: '200000000000000000', // 0.2 ZETA
  },
  {
    code: 'BSC_VETERAN',
    name: '币安链老兵',
    description: '造访 BSC Testnet 20 次',
    icon: '🏅',
    unlockType: BadgeUnlockType.CHAIN_VISIT,
    unlockCondition: { chain: 'BSC_TESTNET', threshold: 20 },
    rarity: 4,
    airdropEnabled: true,
    airdropAmount: '1000000000000000000', // 1 ZETA
  },
  {
    code: 'DUAL_CHAIN_TRAVELER',
    name: '双链旅行者',
    description: '造访过 2 条不同的链',
    icon: '⛓️',
    unlockType: BadgeUnlockType.MULTI_CHAIN,
    unlockCondition: { threshold: 2 },
    rarity: 3,
    airdropEnabled: true,
    airdropAmount: '500000000000000000', // 0.5 ZETA
  },
  {
    code: 'CROSS_CHAIN_MASTER',
    name: '跨链大师',
    description: '造访过 3 条不同的链',
    icon: '🔗',
    unlockType: BadgeUnlockType.MULTI_CHAIN,
    unlockCondition: { threshold: 3 },
    rarity: 5,
    airdropEnabled: true,
    airdropAmount: '2000000000000000000', // 2 ZETA
  },
  {
    code: 'BRIDGE_BUILDER',
    name: '桥梁建造者',
    description: '完成首次真正跨链旅行',
    icon: '🌉',
    unlockType: BadgeUnlockType.SPECIAL,
    unlockCondition: { type: 'first_real_crosschain' },
    rarity: 3,
    airdropEnabled: true,
    airdropAmount: '500000000000000000', // 0.5 ZETA
  },

  // ========== 🔍 探索发现类 ==========
  {
    code: 'LUCKY_FINDER',
    name: '幸运发现者',
    description: '发现一个稀有度 ≥ 3 的物品',
    icon: '🍀',
    unlockType: BadgeUnlockType.RARE_FIND,
    unlockCondition: { minRarity: 3 },
    rarity: 2,
    airdropEnabled: true,
    airdropAmount: '200000000000000000', // 0.2 ZETA
  },
  {
    code: 'TREASURE_HUNTER',
    name: '寻宝猎人',
    description: '发现一个 Epic (4) 或更高稀有度物品',
    icon: '👑',
    unlockType: BadgeUnlockType.RARE_FIND,
    unlockCondition: { minRarity: 4 },
    rarity: 3,
    airdropEnabled: true,
    airdropAmount: '500000000000000000', // 0.5 ZETA
  },
  {
    code: 'LEGENDARY_SEEKER',
    name: '传奇探索者',
    description: '发现一个 Legendary (5) 稀有度物品',
    icon: '⚜️',
    unlockType: BadgeUnlockType.RARE_FIND,
    unlockCondition: { minRarity: 5 },
    rarity: 5,
    airdropEnabled: true,
    airdropAmount: '2000000000000000000', // 2 ZETA
  },
  {
    code: 'WHALE_WATCHER',
    name: '鲸鱼观察者',
    description: '访问过持有 > 100 ETH 的巨鲸钱包',
    icon: '🐋',
    unlockType: BadgeUnlockType.SPECIAL,
    unlockCondition: { type: 'whale_wallet_visited', minBalance: '100' },
    rarity: 4,
    isHidden: true,
    airdropEnabled: true,
    airdropAmount: '1000000000000000000', // 1 ZETA
  },
  {
    code: 'CONTRACT_DETECTIVE',
    name: '合约侦探',
    description: '探索过 10 个智能合约地址',
    icon: '🔍',
    unlockType: BadgeUnlockType.SPECIAL,
    unlockCondition: { type: 'contract_count', threshold: 10 },
    rarity: 3,
    airdropEnabled: true,
    airdropAmount: '500000000000000000', // 0.5 ZETA
  },
  {
    code: 'GENESIS_HUNTER',
    name: '创世猎人',
    description: '探索过区块号 < 1000 的古老区块',
    icon: '📜',
    unlockType: BadgeUnlockType.SPECIAL,
    unlockCondition: { type: 'oldest_block', maxBlock: 1000 },
    rarity: 5,
    isHidden: true,
    airdropEnabled: true,
    airdropAmount: '2000000000000000000', // 2 ZETA
  },

  // ========== 🤝 社交互动类 ==========
  {
    code: 'FIRST_FRIEND',
    name: '第一个朋友',
    description: '添加第一个好友',
    icon: '🤝',
    unlockType: BadgeUnlockType.SOCIAL,
    unlockCondition: { metric: 'friend_count', threshold: 1 },
    rarity: 1,
    airdropEnabled: true,
    airdropAmount: '100000000000000000', // 0.1 ZETA
  },
  {
    code: 'SOCIAL_BUTTERFLY',
    name: '社交蝴蝶',
    description: '拥有 10 个好友',
    icon: '🦋',
    unlockType: BadgeUnlockType.SOCIAL,
    unlockCondition: { metric: 'friend_count', threshold: 10 },
    rarity: 3,
    airdropEnabled: true,
    airdropAmount: '500000000000000000', // 0.5 ZETA
  },
  {
    code: 'POPULAR_FROG',
    name: '人气蛙王',
    description: '拥有 50 个好友',
    icon: '👑',
    unlockType: BadgeUnlockType.SOCIAL,
    unlockCondition: { metric: 'friend_count', threshold: 50 },
    rarity: 5,
    airdropEnabled: true,
    airdropAmount: '2000000000000000000', // 2 ZETA
  },
  {
    code: 'FIRST_MESSAGE',
    name: '初次问候',
    description: '发送第一条留言',
    icon: '💬',
    unlockType: BadgeUnlockType.SOCIAL,
    unlockCondition: { metric: 'message_count', threshold: 1 },
    rarity: 1,
    airdropEnabled: true,
    airdropAmount: '100000000000000000', // 0.1 ZETA
  },
  {
    code: 'CHATTERBOX',
    name: '话痨青蛙',
    description: '发送 50 条留言',
    icon: '🗣️',
    unlockType: BadgeUnlockType.SOCIAL,
    unlockCondition: { metric: 'message_count', threshold: 50 },
    rarity: 3,
    airdropEnabled: true,
    airdropAmount: '500000000000000000', // 0.5 ZETA
  },
  {
    code: 'GIFT_GIVER',
    name: '慷慨使者',
    description: '送出第一份礼物',
    icon: '🎁',
    unlockType: BadgeUnlockType.SOCIAL,
    unlockCondition: { metric: 'gift_sent', threshold: 1 },
    rarity: 2,
    airdropEnabled: true,
    airdropAmount: '200000000000000000', // 0.2 ZETA
  },
  {
    code: 'SANTA_FROG',
    name: '圣诞蛙',
    description: '送出 20 份礼物',
    icon: '🎅',
    unlockType: BadgeUnlockType.SOCIAL,
    unlockCondition: { metric: 'gift_sent', threshold: 20 },
    rarity: 4,
    airdropEnabled: true,
    airdropAmount: '1000000000000000000', // 1 ZETA
  },

  // ========== 🏠 家园收藏类 ==========
  {
    code: 'FIRST_SOUVENIR',
    name: '第一件纪念品',
    description: '获得第一个纪念品 NFT',
    icon: '🏷️',
    unlockType: BadgeUnlockType.COLLECTION,
    unlockCondition: { metric: 'souvenir_count', threshold: 1 },
    rarity: 1,
    airdropEnabled: true,
    airdropAmount: '100000000000000000', // 0.1 ZETA
  },
  {
    code: 'SOUVENIR_COLLECTOR',
    name: '纪念品收藏家',
    description: '收集 10 个纪念品',
    icon: '🗃️',
    unlockType: BadgeUnlockType.COLLECTION,
    unlockCondition: { metric: 'souvenir_count', threshold: 10 },
    rarity: 3,
    airdropEnabled: true,
    airdropAmount: '500000000000000000', // 0.5 ZETA
  },
  {
    code: 'MEMORY_KEEPER',
    name: '回忆守护者',
    description: '收集 50 个纪念品',
    icon: '💎',
    unlockType: BadgeUnlockType.COLLECTION,
    unlockCondition: { metric: 'souvenir_count', threshold: 50 },
    rarity: 5,
    airdropEnabled: true,
    airdropAmount: '2000000000000000000', // 2 ZETA
  },
  {
    code: 'PHOTOGRAPHER',
    name: '摄影师',
    description: '拍摄 5 张旅行照片',
    icon: '📷',
    unlockType: BadgeUnlockType.COLLECTION,
    unlockCondition: { metric: 'photo_count', threshold: 5 },
    rarity: 2,
    airdropEnabled: true,
    airdropAmount: '200000000000000000', // 0.2 ZETA
  },
  {
    code: 'PRO_PHOTOGRAPHER',
    name: '专业摄影师',
    description: '拍摄 20 张照片',
    icon: '📸',
    unlockType: BadgeUnlockType.COLLECTION,
    unlockCondition: { metric: 'photo_count', threshold: 20 },
    rarity: 3,
    airdropEnabled: true,
    airdropAmount: '500000000000000000', // 0.5 ZETA
  },
  {
    code: 'INTERIOR_DESIGNER',
    name: '室内设计师',
    description: '放置 10 个家园装饰品',
    icon: '🪴',
    unlockType: BadgeUnlockType.COLLECTION,
    unlockCondition: { metric: 'decoration_placed', threshold: 10 },
    rarity: 3,
    airdropEnabled: true,
    airdropAmount: '500000000000000000', // 0.5 ZETA
  },

  // ========== 🎭 隐藏/特殊类 ==========
  {
    code: 'OG_FROG',
    name: '元祖青蛙',
    description: 'Token ID ≤ 100 的早期支持者',
    icon: '🌟',
    unlockType: BadgeUnlockType.SPECIAL,
    unlockCondition: { type: 'tokenId_lte', value: 100 },
    rarity: 5,
    isHidden: true,
    airdropEnabled: true,
    airdropAmount: '2000000000000000000', // 2 ZETA
  },
  {
    code: 'SEVEN_SEVEN_SEVEN',
    name: '幸运数字',
    description: 'Token ID 包含连续三个 7',
    icon: '🎰',
    unlockType: BadgeUnlockType.SPECIAL,
    unlockCondition: { type: 'tokenId_contains', pattern: '777' },
    rarity: 4,
    isHidden: true,
    airdropEnabled: true,
    airdropAmount: '1000000000000000000', // 1 ZETA
  },
  {
    code: 'MARATHON_FROG',
    name: '马拉松青蛙',
    description: '单次旅行超过 24 小时',
    icon: '🏃‍♂️',
    unlockType: BadgeUnlockType.SPECIAL,
    unlockCondition: { type: 'travel_duration', minSeconds: 86400 },
    rarity: 4,
    isHidden: true,
    airdropEnabled: true,
    airdropAmount: '1000000000000000000', // 1 ZETA
  },
  {
    code: 'COMPLETIONIST',
    name: '完美主义者',
    description: '解锁所有非隐藏徽章',
    icon: '🏆',
    unlockType: BadgeUnlockType.SPECIAL,
    unlockCondition: { type: 'all_visible_badges' },
    rarity: 5,
    isHidden: true,
    airdropEnabled: true,
    airdropAmount: '5000000000000000000', // 5 ZETA
  },
];

async function main() {
  console.log('🚀 开始播种徽章数据...\\n');

  let created = 0;
  let updated = 0;

  for (const badge of BADGES) {
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

  console.log(`\\n✅ 完成！创建 ${created} 个，更新 ${updated} 个，共 ${BADGES.length} 个徽章。`);
}

main()
  .catch((e) => {
    console.error('❌ 错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

