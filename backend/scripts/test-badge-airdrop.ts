/**
 * 徽章空投测试脚本
 * 用于验证完整的空投发放流程
 * 
 * 使用方法: npx ts-node scripts/test-badge-airdrop.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 开始徽章空投系统测试\n');

  // 1. 检查数据库结构
  console.log('1️⃣ 检查数据库结构...');
  try {
    const badges = await prisma.travelBadge.findMany({ take: 1 });
    if (badges.length > 0) {
      const badge = badges[0];
      console.log(`   ✅ TravelBadge 表存在，字段: airdropAmount=${badge.airdropAmount}, airdropEnabled=${badge.airdropEnabled}`);
    } else {
      console.log('   ⚠️ TravelBadge 表为空');
    }
  } catch (error: any) {
    console.log('   ❌ 数据库结构错误:', error.message);
    return;
  }

  // 2. 检查 BadgeReward 表
  console.log('\n2️⃣ 检查 BadgeReward 表...');
  try {
    const rewardCount = await prisma.badgeReward.count();
    console.log(`   ✅ BadgeReward 表存在，当前记录数: ${rewardCount}`);
  } catch (error: any) {
    console.log('   ❌ BadgeReward 表不存在:', error.message);
    return;
  }

  // 3. 检查空投配置
  console.log('\n3️⃣ 检查空投配置...');
  const privateKey = process.env.AIRDROP_PRIVATE_KEY;
  if (privateKey) {
    console.log(`   ✅ AIRDROP_PRIVATE_KEY 已配置 (长度: ${privateKey.length})`);
  } else {
    console.log('   ⚠️ AIRDROP_PRIVATE_KEY 未配置，空投发放将无法工作');
    console.log('   请在 .env 文件中添加: AIRDROP_PRIVATE_KEY=your_private_key_here');
  }

  // 4. 创建测试徽章（带空投配置）
  console.log('\n4️⃣ 创建测试徽章...');
  let testBadge;
  try {
    testBadge = await prisma.travelBadge.upsert({
      where: { code: 'TEST_AIRDROP_BADGE' },
      create: {
        code: 'TEST_AIRDROP_BADGE',
        name: '空投测试徽章',
        description: '用于测试空投发放功能',
        icon: '🧪',
        unlockType: 'SPECIAL',
        unlockCondition: {},
        rarity: 1,
        airdropEnabled: true,
        airdropAmount: '1000000000000000', // 0.001 ZETA
      },
      update: {
        airdropEnabled: true,
        airdropAmount: '1000000000000000',
      },
    });
    console.log(`   ✅ 测试徽章已创建/更新: ${testBadge.name}`);
    console.log(`   空投金额: ${Number(BigInt(testBadge.airdropAmount || '0')) / 1e18} ZETA`);
  } catch (error: any) {
    console.log('   ❌ 创建测试徽章失败:', error.message);
    return;
  }

  // 5. 统计信息
  console.log('\n5️⃣ 统计信息...');
  const [badgeCount, enabledCount, rewardStats] = await Promise.all([
    prisma.travelBadge.count(),
    prisma.travelBadge.count({ where: { airdropEnabled: true } }),
    prisma.badgeReward.groupBy({
      by: ['status'],
      _count: true,
    }),
  ]);

  console.log(`   徽章总数: ${badgeCount}`);
  console.log(`   启用空投的徽章: ${enabledCount}`);
  console.log(`   奖励记录统计:`);
  rewardStats.forEach((stat) => {
    console.log(`     - ${stat.status}: ${stat._count}`);
  });

  console.log('\n✅ 测试完成！\n');

  // 清理提示
  console.log('📋 下一步操作:');
  console.log('1. 在 .env 中配置 AIRDROP_PRIVATE_KEY（用于发放的钱包私钥）');
  console.log('2. 重启后端服务: npm run dev');
  console.log('3. 在管理后台为徽章设置空投金额');
  console.log('4. 解锁徽章后，在徽章页面领取奖励');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
