/**
 * 单个青蛙同步脚本
 * 
 * 功能：同步指定 tokenId 的青蛙数据从链上到数据库
 * 
 * 使用方法:
 *   npx ts-node scripts/sync-frog.ts <tokenId>
 * 
 * 示例:
 *   npx ts-node scripts/sync-frog.ts 1
 */

import { PrismaClient, FrogStatus } from '@prisma/client';
import { createPublicClient, http, parseAbi } from 'viem';
import { config } from '../src/config';

const prisma = new PrismaClient();

const ZETAFROG_ABI = parseAbi([
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function getFrog(uint256 tokenId) view returns (string name, uint64 birthday, uint32 totalTravels, uint8 status, uint256 xp, uint256 level)',
  'function hasMinted(address) view returns (bool)',
]);

const publicClient = createPublicClient({
  transport: http(config.ZETACHAIN_RPC_URL),
});

const CONTRACT_ADDRESS = config.ZETAFROG_NFT_ADDRESS as `0x${string}`;

async function syncSingleFrog(tokenId: number) {
  console.log(`\n=== 同步青蛙 #${tokenId} ===`);
  console.log(`合约地址: ${CONTRACT_ADDRESS}`);
  console.log('');

  try {
    // 获取链上数据
    console.log('正在读取链上数据...');
    
    const owner = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ZETAFROG_ABI,
      functionName: 'ownerOf',
      args: [BigInt(tokenId)],
    }) as string;

    const frogData = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ZETAFROG_ABI,
      functionName: 'getFrog',
      args: [BigInt(tokenId)],
    }) as [string, bigint, number, number, bigint, bigint];

    const statusMap: FrogStatus[] = ['Idle', 'Traveling', 'CrossChainLocked'];

    console.log('\n--- 链上数据 ---');
    console.log(`  Owner: ${owner}`);
    console.log(`  Name: ${frogData[0]}`);
    console.log(`  Birthday: ${new Date(Number(frogData[1]) * 1000).toISOString()}`);
    console.log(`  TotalTravels: ${frogData[2]}`);
    console.log(`  Status: ${statusMap[Number(frogData[3])]}`);
    console.log(`  XP: ${frogData[4]}`);
    console.log(`  Level: ${frogData[5]}`);

    // 检查 hasMinted
    const hasMinted = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ZETAFROG_ABI,
      functionName: 'hasMinted',
      args: [owner as `0x${string}`],
    }) as boolean;
    console.log(`  hasMinted: ${hasMinted}`);

    // 查找数据库记录
    console.log('\n--- 数据库数据 ---');
    const dbFrog = await prisma.frog.findUnique({
      where: { tokenId },
    });

    if (dbFrog) {
      console.log(`  ID: ${dbFrog.id}`);
      console.log(`  Owner: ${dbFrog.ownerAddress}`);
      console.log(`  Name: ${dbFrog.name}`);
      console.log(`  Status: ${dbFrog.status}`);
      console.log(`  XP: ${dbFrog.xp}`);
      console.log(`  Level: ${dbFrog.level}`);
    } else {
      console.log('  (不存在)');
    }

    // 执行同步
    console.log('\n--- 执行同步 ---');

    const chainData = {
      tokenId,
      name: frogData[0],
      ownerAddress: owner.toLowerCase(),
      birthday: new Date(Number(frogData[1]) * 1000),
      totalTravels: Number(frogData[2]),
      status: statusMap[Number(frogData[3])] || 'Idle',
      xp: Number(frogData[4]),
      level: Number(frogData[5]),
    };

    if (!dbFrog) {
      // 检查 owner 是否已有其他青蛙
      const existingByOwner = await prisma.frog.findUnique({
        where: { ownerAddress: chainData.ownerAddress },
      });

      if (existingByOwner && existingByOwner.tokenId !== tokenId) {
        console.log(`  ⚠️ Owner ${chainData.ownerAddress} 已拥有青蛙 #${existingByOwner.tokenId}`);
        console.log(`  正在清理旧记录...`);
        await prisma.frog.update({
          where: { id: existingByOwner.id },
          data: { ownerAddress: `orphaned_${existingByOwner.tokenId}_${Date.now()}` },
        });
      }

      await prisma.frog.create({ data: chainData });
      console.log(`  ✅ 创建新记录成功`);
    } else {
      await prisma.frog.update({
        where: { tokenId },
        data: {
          name: chainData.name,
          ownerAddress: chainData.ownerAddress,
          status: chainData.status,
          xp: chainData.xp,
          level: chainData.level,
          totalTravels: Math.max(dbFrog.totalTravels, chainData.totalTravels),
        },
      });
      console.log(`  ✅ 更新记录成功`);
    }

    // 最终验证
    const finalFrog = await prisma.frog.findUnique({ where: { tokenId } });
    console.log('\n--- 同步后数据 ---');
    console.log(`  Owner: ${finalFrog?.ownerAddress}`);
    console.log(`  Status: ${finalFrog?.status}`);
    console.log(`  XP: ${finalFrog?.xp}`);
    console.log(`  Level: ${finalFrog?.level}`);

  } catch (error: any) {
    if (error?.message?.includes('ownerOf') || error?.shortMessage?.includes('0x7e273289')) {
      console.log(`\n❌ 青蛙 #${tokenId} 不存在于链上`);
    } else {
      console.error('\n❌ 同步失败:', error);
    }
  }

  await prisma.$disconnect();
}

// 主入口
const tokenId = parseInt(process.argv[2]);
if (isNaN(tokenId)) {
  console.log('用法: npx ts-node scripts/sync-frog.ts <tokenId>');
  console.log('示例: npx ts-node scripts/sync-frog.ts 1');
  process.exit(1);
}

syncSingleFrog(tokenId);
