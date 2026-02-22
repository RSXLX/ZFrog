/**
 * 链上青蛙全量同步脚本
 * 
 * 功能：
 * 1. 扫描链上所有已铸造的青蛙 (tokenId 0 到 totalSupply)
 * 2. 同步每只青蛙的数据到数据库
 * 3. 标记数据库中链上不存在的记录
 * 
 * 使用方法:
 *   npx ts-node scripts/sync-all-frogs.ts
 *   
 * 可选参数:
 *   DRY_RUN=true  - 只检测不修改
 *   FORCE=true   - 强制覆盖所有数据
 */

import { PrismaClient, FrogStatus } from '@prisma/client';
import { createPublicClient, http, parseAbi } from 'viem';
import { config } from '../src/config';

const prisma = new PrismaClient();

// 合约 ABI
const ZETAFROG_ABI = parseAbi([
  'function totalSupply() view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function getFrog(uint256 tokenId) view returns (string name, uint64 birthday, uint32 totalTravels, uint8 status, uint256 xp, uint256 level)',
  'function hasMinted(address) view returns (bool)',
]);

// 创建客户端
const publicClient = createPublicClient({
  transport: http(config.ZETACHAIN_RPC_URL),
});

const CONTRACT_ADDRESS = config.ZETAFROG_NFT_ADDRESS as `0x${string}`;

interface SyncResult {
  tokenId: number;
  action: 'created' | 'updated' | 'unchanged' | 'error' | 'not_exist';
  details?: string;
}

interface SyncSummary {
  totalOnChain: number;
  totalInDb: number;
  created: number;
  updated: number;
  unchanged: number;
  errors: number;
  orphaned: number;
}

async function getFrogFromChain(tokenId: number): Promise<{
  owner: string;
  name: string;
  birthday: Date;
  totalTravels: number;
  status: FrogStatus;
  xp: number;
  level: number;
} | null> {
  try {
    // 先检查是否存在（通过 ownerOf）
    const owner = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ZETAFROG_ABI,
      functionName: 'ownerOf',
      args: [BigInt(tokenId)],
    }) as string;

    // 获取青蛙数据
    const frogData = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ZETAFROG_ABI,
      functionName: 'getFrog',
      args: [BigInt(tokenId)],
    }) as [string, bigint, number, number, bigint, bigint];

    const statusMap: FrogStatus[] = ['Idle', 'Traveling', 'CrossChainLocked'];

    return {
      owner: owner.toLowerCase(),
      name: frogData[0],
      birthday: new Date(Number(frogData[1]) * 1000),
      totalTravels: Number(frogData[2]),
      status: statusMap[Number(frogData[3])] || 'Idle',
      xp: Number(frogData[4]),
      level: Number(frogData[5]),
    };
  } catch (error: any) {
    // Token 不存在
    if (error?.message?.includes('ownerOf') || 
        error?.shortMessage?.includes('0x7e273289')) {
      return null;
    }
    throw error;
  }
}

async function syncFrog(tokenId: number, dryRun: boolean, force: boolean): Promise<SyncResult> {
  try {
    const chainData = await getFrogFromChain(tokenId);

    if (!chainData) {
      return { tokenId, action: 'not_exist', details: 'Token does not exist on chain' };
    }

    // 查找数据库记录
    const dbFrog = await prisma.frog.findUnique({
      where: { tokenId },
    });

    if (!dbFrog) {
      // 创建新记录
      if (!dryRun) {
        // 检查该 owner 是否已有其他青蛙
        const existingByOwner = await prisma.frog.findUnique({
          where: { ownerAddress: chainData.owner },
        });

        if (existingByOwner && existingByOwner.tokenId !== tokenId) {
          // 清理旧记录
          await prisma.frog.update({
            where: { id: existingByOwner.id },
            data: { ownerAddress: `orphaned_${existingByOwner.tokenId}_${Date.now()}` },
          });
        }

        await prisma.frog.create({
          data: {
            tokenId,
            name: chainData.name,
            ownerAddress: chainData.owner,
            birthday: chainData.birthday,
            totalTravels: chainData.totalTravels,
            status: chainData.status,
            xp: chainData.xp,
            level: chainData.level,
          },
        });
      }
      return { tokenId, action: 'created', details: `Owner: ${chainData.owner}` };
    }

    // 检查是否需要更新
    const needsUpdate = force ||
      dbFrog.ownerAddress !== chainData.owner ||
      dbFrog.name !== chainData.name ||
      dbFrog.status !== chainData.status ||
      dbFrog.xp !== chainData.xp ||
      dbFrog.level !== chainData.level;

    if (needsUpdate) {
      if (!dryRun) {
        await prisma.frog.update({
          where: { tokenId },
          data: {
            name: chainData.name,
            ownerAddress: chainData.owner,
            status: chainData.status,
            xp: chainData.xp,
            level: chainData.level,
            // 保留本地的 totalTravels（可能包含 P0 旅行）
            totalTravels: Math.max(dbFrog.totalTravels, chainData.totalTravels),
          },
        });
      }
      return { 
        tokenId, 
        action: 'updated', 
        details: `Owner: ${dbFrog.ownerAddress} → ${chainData.owner}, Status: ${dbFrog.status} → ${chainData.status}` 
      };
    }

    return { tokenId, action: 'unchanged' };
  } catch (error: any) {
    return { tokenId, action: 'error', details: error.message };
  }
}

async function markOrphanedFrogs(validTokenIds: Set<number>, dryRun: boolean): Promise<number> {
  const allDbFrogs = await prisma.frog.findMany({
    where: {
      ownerAddress: { not: { startsWith: 'orphaned_' } }
    },
    select: { tokenId: true, ownerAddress: true },
  });

  let orphanedCount = 0;

  for (const frog of allDbFrogs) {
    if (!validTokenIds.has(frog.tokenId)) {
      console.log(`  ⚠️ Orphaned frog in DB: tokenId=${frog.tokenId}, owner=${frog.ownerAddress}`);
      if (!dryRun) {
        await prisma.frog.update({
          where: { tokenId: frog.tokenId },
          data: { ownerAddress: `orphaned_${frog.tokenId}_${Date.now()}` },
        });
      }
      orphanedCount++;
    }
  }

  return orphanedCount;
}

async function main() {
  const dryRun = process.env.DRY_RUN === 'true';
  const force = process.env.FORCE === 'true';

  console.log('╔══════════════════════════════════════════╗');
  console.log('║   ZetaFrog 链上数据全量同步工具         ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log(`合约地址: ${CONTRACT_ADDRESS}`);
  console.log(`RPC URL: ${config.ZETACHAIN_RPC_URL}`);
  console.log(`模式: ${dryRun ? '🔍 DRY RUN (只检测不修改)' : '📝 LIVE (将修改数据库)'}`);
  console.log(`强制更新: ${force ? '是' : '否'}`);
  console.log('');

  // 获取链上总供应量
  const totalSupply = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: ZETAFROG_ABI,
    functionName: 'totalSupply',
  }) as bigint;

  console.log(`链上总供应量: ${totalSupply}`);

  // 获取数据库记录数
  const dbCount = await prisma.frog.count({
    where: { ownerAddress: { not: { startsWith: 'orphaned_' } } }
  });
  console.log(`数据库记录数: ${dbCount}`);
  console.log('');

  const summary: SyncSummary = {
    totalOnChain: Number(totalSupply),
    totalInDb: dbCount,
    created: 0,
    updated: 0,
    unchanged: 0,
    errors: 0,
    orphaned: 0,
  };

  const validTokenIds = new Set<number>();

  console.log('开始扫描链上青蛙...\n');

  // 扫描所有 tokenId
  for (let tokenId = 0; tokenId < Number(totalSupply); tokenId++) {
    process.stdout.write(`\r扫描进度: ${tokenId + 1}/${totalSupply}`);

    const result = await syncFrog(tokenId, dryRun, force);

    if (result.action !== 'not_exist') {
      validTokenIds.add(tokenId);
    }

    switch (result.action) {
      case 'created':
        summary.created++;
        console.log(`\n  ✅ Created: tokenId=${tokenId} - ${result.details}`);
        break;
      case 'updated':
        summary.updated++;
        console.log(`\n  🔄 Updated: tokenId=${tokenId} - ${result.details}`);
        break;
      case 'error':
        summary.errors++;
        console.log(`\n  ❌ Error: tokenId=${tokenId} - ${result.details}`);
        break;
      case 'unchanged':
        summary.unchanged++;
        break;
    }

    // 避免 RPC 限流
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n\n检查数据库中的孤儿记录...');
  summary.orphaned = await markOrphanedFrogs(validTokenIds, dryRun);

  // 打印摘要
  console.log('\n');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║               同步摘要                  ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║ 链上总数:     ${String(summary.totalOnChain).padStart(6)}                   ║`);
  console.log(`║ 数据库原数:   ${String(summary.totalInDb).padStart(6)}                   ║`);
  console.log('╠──────────────────────────────────────────╣');
  console.log(`║ ✅ 新创建:    ${String(summary.created).padStart(6)}                   ║`);
  console.log(`║ 🔄 已更新:    ${String(summary.updated).padStart(6)}                   ║`);
  console.log(`║ ✓ 无变化:     ${String(summary.unchanged).padStart(6)}                   ║`);
  console.log(`║ ⚠️ 孤儿记录:  ${String(summary.orphaned).padStart(6)}                   ║`);
  console.log(`║ ❌ 错误:      ${String(summary.errors).padStart(6)}                   ║`);
  console.log('╚══════════════════════════════════════════╝');

  if (dryRun) {
    console.log('\n💡 这是 DRY RUN 模式，没有实际修改数据库。');
    console.log('   要执行实际同步，请运行: npx ts-node scripts/sync-all-frogs.ts');
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('同步失败:', error);
  await prisma.$disconnect();
  process.exit(1);
});
