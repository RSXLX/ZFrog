
import { prisma } from '../src/database';
import { createPublicClient, http, parseAbi } from 'viem';
import { config } from '../src/config';
import { logger } from '../src/utils/logger';

// 定义简单的 ABI 用于获取旅行信息
const ABI = parseAbi([
    'function getActiveTravel(uint256 tokenId) view returns (uint64 startTime, uint64 endTime, address targetWallet, uint256 targetChainId, bool completed)',
    'function ownerOf(uint256 tokenId) view returns (address)'
]);

const zetachainAthens = {
    id: 7001,
    name: 'ZetaChain Athens Testnet',
    nativeCurrency: { name: 'ZETA', symbol: 'ZETA', decimals: 18 },
    rpcUrls: { default: { http: [config.ZETACHAIN_RPC_URL] } },
} as const;

async function restoreTravel(tokenId: number) {
    console.log(`Checking frog ${tokenId} on-chain...`);

    const client = createPublicClient({
        chain: zetachainAthens,
        transport: http(),
    });

    try {
        // 1. 获取链上旅行数据
        const [startTime, endTime, targetWallet, targetChainId, completed] = await client.readContract({
            address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
            abi: ABI,
            functionName: 'getActiveTravel',
            args: [BigInt(tokenId)],
        });

        console.log('On-chain data:', {
            startTime: new Date(Number(startTime) * 1000),
            endTime: new Date(Number(endTime) * 1000),
            targetWallet,
            targetChainId: Number(targetChainId),
            completed
        });

        if (completed) {
            console.log('Travel is already completed on-chain.');
            return;
        }

        if (Number(startTime) === 0) {
            console.log('No active travel found on-chain (startTime is 0).');
            return;
        }

        // 2. 检查数据库是否存在
        const existingTravel = await prisma.travel.findFirst({
            where: {
                frogId: tokenId, // 注意：这里假设 frog.id == tokenId，但在我们的schema里通常 frog.id 是自增主键，frog.tokenId 是 NFT ID
                // 需要先查 Frog
                status: 'Active'
            }
        });

        // 先找到 Frog 实体
        const frog = await prisma.frog.findUnique({
            where: { tokenId: tokenId }
        });

        if (!frog) {
            console.error(`Frog ${tokenId} not found in DB!`);
            return;
        }

        // 检查数据库记录
        const dbTravel = await prisma.travel.findFirst({
            where: {
                frogId: frog.id,
                startTime: new Date(Number(startTime) * 1000),
            }
        });

        if (dbTravel) {
            console.log(`Travel already exists in DB with ID ${dbTravel.id}, status: ${dbTravel.status}`);
            if (dbTravel.status !== 'Active' && dbTravel.status !== 'Processing') {
                console.log('Updating status to Active to force processing...');
                await prisma.travel.update({
                    where: { id: dbTravel.id },
                    data: { status: 'Active' }
                });
            }
        } else {
            console.log('Creating missing travel record...');
            const isRandom = targetWallet.toLowerCase() === '0x0000000000000000000000000000000000000000';
            
            const newTravel = await prisma.travel.create({
                data: {
                    frogId: frog.id,
                    targetWallet: targetWallet.toLowerCase(),
                    chainId: Number(targetChainId),
                    startTime: new Date(Number(startTime) * 1000),
                    endTime: new Date(Number(endTime) * 1000),
                    status: 'Active',
                    isRandom: isRandom,
                    observedTxCount: 0,
                    observedTotalValue: "0",
                }
            });
            console.log(`✅ Restored travel record ID: ${newTravel.id}`);
            
            // 同时更新青蛙状态
            await prisma.frog.update({
                where: { id: frog.id },
                data: { status: 'Traveling' }
            });
            console.log('Updated Frog status to Traveling.');
        }

    } catch (error) {
        console.error('Error restoring travel:', error);
    }
}

// 获取命令行参数
const tokenId = process.argv[2] ? parseInt(process.argv[2]) : 4;
restoreTravel(tokenId)
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
