import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { createPublicClient, http } from 'viem';
import { config } from '../../config';
import { ZETAFROG_ABI } from '../../config/contracts';

const router = Router();
const prisma = new PrismaClient();

// 定义 ZetaChain
const zetachainAthens = {
    id: 7001,
    name: 'ZetaChain Athens Testnet',
    nativeCurrency: { name: 'ZETA', symbol: 'ZETA', decimals: 18 },
    rpcUrls: { default: { http: [config.ZETACHAIN_RPC_URL] } },
} as const;

const publicClient = createPublicClient({
    chain: zetachainAthens,
    transport: http(config.ZETACHAIN_RPC_URL),
});

// 定义合约返回类型 (与 Solidity Frog struct 对应)
type FrogData = readonly [
    name: string,      // name
    bigint,            // birthday
    number,            // totalTravels
    status: number,    // status (enum)
    bigint,            // experience
    level: bigint      // level
];

/**
 * GET /api/frogs/:tokenId
 * 获取青蛙详情
 */
router.get('/:tokenId', async (req, res) => {
    try {
        const tokenId = parseInt(req.params.tokenId);

        // 从数据库获取
        let frog = await prisma.frog.findUnique({
            where: { tokenId },
            include: {
                travels: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
                souvenirs: true,
            },
        });

        // 如果数据库没有且合约已配置，尝试从链上获取
        if (!frog && config.ZETAFROG_NFT_ADDRESS) {
            try {
                const onChainData = await publicClient.readContract({
                    address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
                    abi: ZETAFROG_ABI,
                    functionName: 'getFrog',
                    args: [BigInt(tokenId)],
                }) as unknown as FrogData;

                if (onChainData && onChainData[0]) {
                    // 解构 6 元素元组: [name, birthday, totalTravels, status, experience, level]
                    const [name, birthday, totalTravels, status] = onChainData;
                    
                    frog = await prisma.frog.create({
                        data: {
                            tokenId,
                            name: name,
                            ownerAddress: '',
                            birthday: new Date(Number(birthday) * 1000),
                            totalTravels: Number(totalTravels),
                            status: ['Idle', 'Traveling', 'Returning'][status] as any,
                        },
                        include: {
                            travels: true,
                            souvenirs: true,
                        },
                    });
                }
            } catch (error) {
                console.error('Error fetching from chain:', error);
            }
        }

        if (!frog) {
            return res.status(404).json({ error: 'Frog not found' });
        }

        res.json(frog);
    } catch (error) {
        console.error('Error fetching frog:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/frogs/owner/:address
 * 获取某地址拥有的所有青蛙
 */
router.get('/owner/:address', async (req, res) => {
    try {
        const { address } = req.params;

        const frogs = await prisma.frog.findMany({
            where: { ownerAddress: address.toLowerCase() },
            include: {
                travels: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
                souvenirs: true,
            },
        });

        res.json(frogs);
    } catch (error) {
        console.error('Error fetching frogs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/frogs/sync
 * Manually sync frog data from chain
 */
router.post('/sync', async (req, res) => {
    try {
        const { tokenId } = req.body;

        if (tokenId === undefined) {
            return res.status(400).json({ error: 'Token ID required' });
        }

        const { eventListener } = require('../../workers/eventListener');
        const success = await eventListener.syncFrog(Number(tokenId));

        if (success) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Frog not found on chain or sync failed' });
        }
    } catch (error) {
        console.error('Error syncing frog:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;  