import { PrismaClient } from '@prisma/client';
import { createPublicClient, http } from 'viem';
import { config } from '../src/config';
import { ZETAFROG_ABI } from '../src/config/contracts';

const prisma = new PrismaClient();

const zetachainAthens = {
  id: 7001,
  name: 'ZetaChain Athens Testnet',
  nativeCurrency: { name: 'ZETA', symbol: 'ZETA', decimals: 18 },
  rpcUrls: { default: { http: [config.ZETACHAIN_RPC_URL] } },
} as const;

async function main() {
  const publicClient = createPublicClient({
    chain: zetachainAthens,
    transport: http(config.ZETACHAIN_RPC_URL),
  });

  const nftAddress = config.ZETAFROG_NFT_ADDRESS;
  console.log(`Checking frogs at contract: ${nftAddress}`);

  try {
    const minDuration = await publicClient.readContract({
      address: nftAddress as `0x${string}`,
      abi: ZETAFROG_ABI,
      functionName: 'MIN_TRAVEL_DURATION',
    });
    const cooldown = await publicClient.readContract({
      address: nftAddress as `0x${string}`,
      abi: ZETAFROG_ABI,
      functionName: 'COOLDOWN_PERIOD',
    });
    console.log(`Contract Config: MIN_DURATION=${minDuration}s, COOLDOWN=${cooldown}s`);
  } catch (err) {
    console.warn('Could not read contract constants');
  }

  // 获取数据库中的所有青蛙
  const dbFrogs = await prisma.frog.findMany();
  console.log(`Found ${dbFrogs.length} frogs in database.`);

  for (const frog of dbFrogs) {
    console.log(`\n--- Frog ${frog.tokenId} (ID: ${frog.id}) ---`);
    console.log(`DB Status: ${frog.status}`);
    console.log(`DB Owner: ${frog.ownerAddress}`);

    try {
      // 链上状态
      const frogData = await publicClient.readContract({
        address: nftAddress as `0x${string}`,
        abi: ZETAFROG_ABI,
        functionName: 'getFrog',
        args: [BigInt(frog.tokenId)],
      }) as any;

      const owner = await publicClient.readContract({
        address: nftAddress as `0x${string}`,
        abi: ZETAFROG_ABI,
        functionName: 'ownerOf',
        args: [BigInt(frog.tokenId)],
      }) as string;
      console.log(`Chain Owner: ${owner}`);

      // status: 0: Idle, 1: Traveling, 2: Returning (根据合约定义)
      const onChainStatus = frogData[3];
      const statusMap = ['Idle', 'Traveling', 'Returning'];
      console.log(`Chain Status: ${statusMap[onChainStatus] || onChainStatus}`);

      // 检查是否可以旅行
      const canTravel = await publicClient.readContract({
        address: nftAddress as `0x${string}`,
        abi: ZETAFROG_ABI,
        functionName: 'canTravel',
        args: [BigInt(frog.tokenId)],
      });
      console.log(`Can Travel: ${canTravel}`);

      if (frog.status === 'Idle' && onChainStatus !== 0) {
        console.warn(`[CONFLICT] Frog is Idle in DB but ${statusMap[onChainStatus]} on Chain!`);
      }
    } catch (err) {
      console.error(`Failed to get chain status for frog ${frog.tokenId}:`, err);
    }
  }

  process.exit(0);
}

main();
