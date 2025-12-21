import { Router } from 'express';
import { prisma } from '../../database';
import { createPublicClient, http } from 'viem';
import { config } from '../../config';
import { ZETAFROG_ABI } from '../../config/contracts';

// 递归处理 BigInt 序列化问题
function stringifyBigInt(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') return obj.toString();
    if (obj instanceof Date) return obj.toISOString();
    if (Array.isArray(obj)) return obj.map(stringifyBigInt);
    if (typeof obj === 'object') {
        const newObj: any = {};
        for (const key in obj) {
            newObj[key] = stringifyBigInt(obj[key]);
        }
        return newObj;
    }
    return obj;
}

const router = Router();

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
 * GET /api/frogs/world-online
 * 获取世界在线青蛙列表
 */
router.get('/world-online', async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;
        const maxLimit = Math.min(parseInt(limit as string), 50);
        const skipOffset = Math.max(parseInt(offset as string), 0);

        // 获取所有青蛙，按最后活动时间排序
        const frogs = await prisma.frog.findMany({
            where: {
                // 可以添加过滤条件，比如最近一段时间内有活动的青蛙
                updatedAt: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 最近7天内有活动
                }
            },
            include: {
                travels: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: [
                { updatedAt: 'desc' },
                { level: 'desc' },
                { xp: 'desc' }
            ],
            take: maxLimit,
            skip: skipOffset
        });

        // 获取在线状态
        const { isFrogOnline } = await import('../../websocket');
        const frogsWithOnlineStatus = frogs.map(frog => ({
            ...frog,
            isOnline: isFrogOnline(frog.id)
        }));

        res.json({
            success: true,
            data: stringifyBigInt(frogsWithOnlineStatus),
            total: frogs.length
        });
    } catch (error) {
        console.error('Error fetching world online frogs:', error);
        res.status(500).json({ error: 'Failed to fetch world online frogs' });
    }
});

/**
 * GET /api/frogs/search
 * 搜索青蛙（支持按地址、名称或tokenId搜索）
 */
router.get('/search', async (req, res) => {
    try {
        const { query, limit = 10 } = req.query;

        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const searchTerm = query.trim();
        const maxLimit = Math.min(parseInt(limit as string), 50);

        let frogs: any[] = [];

        // 优先处理钱包地址搜索 - 更精确的匹配
        if (searchTerm.startsWith('0x') && searchTerm.length >= 10) {
            frogs = await prisma.frog.findMany({
                where: {
                    ownerAddress: {
                        equals: searchTerm.toLowerCase(),
                        mode: 'insensitive'
                    }
                },
                include: {
                    travels: {
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    }
                },
                take: maxLimit
            });
        } 
        // 如果是纯数字，按tokenId搜索
        else if (/^\d+$/.test(searchTerm)) {
            const tokenId = parseInt(searchTerm);
            const frog = await prisma.frog.findUnique({
                where: { tokenId },
                include: {
                    travels: {
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    }
                }
            });
            if (frog) {
                frogs = [frog];
            }
        }
        // 否则按名称模糊搜索
        else {
            frogs = await prisma.frog.findMany({
                where: {
                    name: {
                        contains: searchTerm,
                        mode: 'insensitive'
                    }
                },
                include: {
                    travels: {
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    }
                },
                take: maxLimit
            });
        }

        res.json(frogs);
    } catch (error) {
        console.error('Error searching frogs:', error);
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

        res.json({
            success: true,
            data: stringifyBigInt(frogs)
        });
    } catch (error) {
        console.error('Error fetching frogs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/frogs/:tokenId
 * 获取青蛙详情
 */
router.get('/:tokenId', async (req, res) => {
    try {
        const tokenId = parseInt(req.params.tokenId);

        // 如果 tokenId 不是数字，直接返回 404
        if (isNaN(tokenId)) {
            return res.status(404).json({ error: 'Invalid tokenId' });
        }

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
                    // 获取所有者
                    const owner = await publicClient.readContract({
                        address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
                        abi: ZETAFROG_ABI,
                        functionName: 'ownerOf',
                        args: [BigInt(tokenId)],
                    }) as string;

                    // 解构 6 元素元组
                    const [name, birthday, totalTravels, status] = onChainData;
                    
                    const statusIndex = Number(status);
                    const statusEnum = ['Idle', 'Traveling', 'Returning'][statusIndex] || 'Idle';

                    try {
                        frog = await prisma.frog.create({
                            data: {
                                tokenId,
                                name: name,
                                ownerAddress: (owner as string).toLowerCase(),
                                birthday: new Date(Number(birthday) * 1000),
                                totalTravels: Number(totalTravels),
                                status: statusEnum as any,
                            },
                            include: {
                                travels: true,
                                souvenirs: true,
                            },
                        });
                        console.log(`Synced frog ${tokenId} from chain`);
                    } catch (dbError) {
                        // 如果并发导致已存在，再次尝试查询
                        console.log(`Failed to create frog ${tokenId}, trying to fetch again:`, dbError);
                        frog = await prisma.frog.findUnique({
                            where: { tokenId },
                            include: {
                                travels: true,
                                souvenirs: true,
                            },
                        });
                    }
                }
            } catch (error) {
                console.error('Error fetching from chain:', error);
            }
        }

        if (!frog) {
            return res.status(404).json({ error: 'Frog not found' });
        }

        // 解析嵌套的旅行日记内容
        const travelsWithJournal = frog.travels.map(travel => {
            let journal = null;
            try {
                if (travel.journalContent) {
                    journal = JSON.parse(travel.journalContent);
                }
            } catch (e) {
                journal = { 
                    title: '旅行回顾',
                    content: travel.journalContent,
                    mood: 'happy',
                    highlights: []
                };
            }
            return {
                ...travel,
                journal
            };
        });

        // 社交关系判定
        let friendshipStatus = 'None';
        let friendshipId = undefined;
        const viewerAddress = req.query.viewerAddress as string;

        if (viewerAddress && viewerAddress.toLowerCase() !== frog.ownerAddress.toLowerCase()) {
            // 查找访客拥有的青蛙与当前青蛙之间是否有好友关系
            const friendship = await prisma.friendship.findFirst({
                where: {
                    OR: [
                        {
                            requester: { ownerAddress: viewerAddress.toLowerCase() },
                            addresseeId: frog.id
                        },
                        {
                            addressee: { ownerAddress: viewerAddress.toLowerCase() },
                            requesterId: frog.id
                        }
                    ]
                },
                orderBy: { updatedAt: 'desc' },
                select: {
                  id: true,
                  status: true
                }
            });

            if (friendship) {
                friendshipStatus = friendship.status;
                friendshipId = friendship.id;
            }
        }

        res.json({
            success: true,
            data: {
                ...frog,
                travels: travelsWithJournal,
                friendshipStatus,
                friendshipId
            }
        });
    } catch (error) {
        console.error('Error fetching frog:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 路由已移动到上方以处理匹配顺序问题

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