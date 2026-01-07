import { Router } from 'express';
import { prisma } from '../../database';
import { createPublicClient, http } from 'viem';
import { config } from '../../config';
import { ZETAFROG_ABI } from '../../config/contracts';
import { omniTravelService } from '../../services/omni-travel.service';
import { logger } from '../../utils/logger';

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
 * GET /api/frogs/my/:address
 * 获取某地址的唯一青蛙（单钱包单青蛙模式）
 */
router.get('/my/:address', async (req, res) => {
    try {
        const { address } = req.params;

        // 获取该地址的青蛙（应该只有一个）
        const frog = await prisma.frog.findFirst({
            where: { ownerAddress: address.toLowerCase() },
            include: {
                travels: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
                souvenirs: true,
            },
        });

        if (!frog) {
            return res.status(404).json({ 
                success: false, 
                error: 'No frog found for this address' 
            });
        }

        // 执行状态健康检查
        try {
            if (frog.status !== 'Idle') {
                await omniTravelService.reconcileFrogStatus(frog.tokenId);
            }
        } catch (err) {
            logger.warn(`[HealthCheck] Failed on-demand check for frog ${frog.tokenId}:`, err);
        }

        // 重新获取更新后的数据
        const updatedFrog = await prisma.frog.findUnique({
            where: { tokenId: frog.tokenId },
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
            data: stringifyBigInt(updatedFrog)
        });
    } catch (error) {
        console.error('Error fetching user frog:', error);
        res.status(500).json({ error: 'Internal server error' });
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

        // [ON-DEMAND HEALTH CHECK]
        // Check only active frogs for this user to save resources
        try {
            const activeFrogs = await prisma.frog.findMany({
                where: { 
                    ownerAddress: address.toLowerCase(),
                    // Only check frogs that are not Idle
                    status: { not: 'Idle' }
                },
                select: { tokenId: true }
            });
            
            if (activeFrogs.length > 0) {
                await Promise.all(activeFrogs.map(f => omniTravelService.reconcileFrogStatus(f.tokenId)));
                // Also check for any expired cross-chain travels
                await omniTravelService.checkAndCompleteExpiredTravels();
            }
        } catch (err) {
            logger.warn(`[HealthCheck] Failed on-demand check for user ${address}:`, err);
        }

        let frogs = await prisma.frog.findMany({
            where: { ownerAddress: address.toLowerCase() },
            include: {
                travels: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
                souvenirs: true,
            },
        });

        // 如果数据库没有找到青蛙，尝试从链上同步
        if (frogs.length === 0 && config.ZETAFROG_NFT_ADDRESS) {
            try {
                const balance = await publicClient.readContract({
                    address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
                    abi: ZETAFROG_ABI,
                    functionName: 'balanceOf',
                    args: [address as `0x${string}`]
                }) as bigint;

                if (balance > BigInt(0)) {
                    console.log(`Found ${balance} frogs on chain (via limit check) for ${address}, syncing via logs...`);
                    const { eventListener } = require('../../workers/eventListener');
                    const { parseAbiItem } = require('viem');

                    // 既然合约不支持 Enumerable，我们查询 FrogMinted 事件来找回 Token ID
                    // 注意：这假设青蛙没有被转走。如果是完整的 ERC721，应该监听 Transfer。
                    // 但对于演示版，查找 Mint 记录足够找回丢失的数据。
                    // Implement backward pagination to respect RPC limit (10,000 blocks)
                    // and efficiently find recent mints.
                    const currentBlock = await publicClient.getBlockNumber();
                    const chunkSize = BigInt(2000); // Conservative chunk size
                    let logs: any[] = [];
                    const targetCount = Number(balance);
                    let scannedBlocks = BigInt(0);
                    const MAX_SCAN = BigInt(200000); // ~3-4 days of history, usually enough for testnet

                    let toBlock = currentBlock;
                    console.log(`Starting backward scan from ${currentBlock}, target: ${targetCount} frogs`);

                    while (logs.length < targetCount && scannedBlocks < MAX_SCAN) {
                        let fromBlock = toBlock - chunkSize;
                        if (fromBlock < BigInt(0)) fromBlock = BigInt(0);

                        try {
                            const chunkLogs = await publicClient.getLogs({
                                address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
                                event: parseAbiItem('event FrogMinted(address indexed owner, uint256 indexed tokenId, string name, uint256 timestamp)'),
                                args: { owner: address as `0x${string}` },
                                fromBlock: fromBlock,
                                toBlock: toBlock
                            });
                            logs = [...logs, ...chunkLogs];
                        } catch (e) {
                             console.error(`Scan failed for ${fromBlock}-${toBlock}`, e);
                             // If error is strictly block range, maybe reduce chunk size? 
                             // But 2000 should be safe given 10000 limit.
                        }

                        if (fromBlock === BigInt(0)) break;
                        toBlock = fromBlock - BigInt(1);
                        scannedBlocks += chunkSize;
                    }

                    console.log(`Found ${logs.length} mint events for user`);
                    
                    for (const log of logs) {
                        try {
                            const tokenId = (log as any).args.tokenId;
                            if (tokenId !== undefined) {
                                await eventListener.syncFrog(Number(tokenId));
                            }
                        } catch (e) {
                            console.error(`Failed to sync frog from log:`, e);
                        }
                    }

                    // 重新从数据库获取
                    frogs = await prisma.frog.findMany({
                        where: { ownerAddress: address.toLowerCase() },
                        include: {
                            travels: {
                                orderBy: { createdAt: 'desc' },
                                take: 5,
                            },
                            souvenirs: true,
                        },
                    });
                }
            } catch (err) {
                console.error("Auto-sync failed:", err);
            }
        }

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

        // [ON-DEMAND HEALTH CHECK]
        // Trigger status reconciliation for this specific frog
        try {
            await omniTravelService.reconcileFrogStatus(tokenId);
            // Also check for any expired cross-chain travels (lightweight check)
            await omniTravelService.checkAndCompleteExpiredTravels();
        } catch (err) {
            logger.warn(`[HealthCheck] Failed on-demand check for frog ${tokenId}:`, err);
        }

        // 从数据库获取 (now status should be synced)
        let frog = await prisma.frog.findUnique({
            where: { tokenId },
            include: {
                travels: {
                    where: { status: 'Completed' }, // Only return completed travels
                    orderBy: { createdAt: 'desc' },
                    take: 50, // Return more history
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
                    // 0=Idle, 1=Traveling, 2=CrossChainLocked
                    const statusEnum = ['Idle', 'Traveling', 'CrossChainLocked'][statusIndex] || 'Idle';

                    try {
                        const ownerLower = (owner as string).toLowerCase();
                        
                        // 检查该 owner 是否已有其他蛙（单钱包单蛙规则）
                        const existingByOwner = await prisma.frog.findUnique({
                            where: { ownerAddress: ownerLower },
                        });
                        
                        if (existingByOwner && existingByOwner.tokenId !== tokenId) {
                            // 该 owner 已有别的蛙，将旧蛙标记为孤立
                            await prisma.frog.update({
                                where: { id: existingByOwner.id },
                                data: { ownerAddress: `orphaned_${existingByOwner.tokenId}_${Date.now()}` },
                            });
                            console.log(`Orphaned frog ${existingByOwner.tokenId} due to owner ${ownerLower} acquiring frog ${tokenId}`);
                        }
                        
                        // 使用 upsert 处理可能的并发情况
                        await prisma.frog.upsert({
                            where: { tokenId },
                            update: {
                                name: name,
                                ownerAddress: ownerLower,
                                totalTravels: Number(totalTravels),
                                status: statusEnum as any,
                            },
                            create: {
                                tokenId,
                                name: name,
                                ownerAddress: ownerLower,
                                birthday: new Date(Number(birthday) * 1000),
                                totalTravels: Number(totalTravels),
                                status: statusEnum as any,
                            },
                        });
                        
                        // 重新获取包含关联的完整数据
                        frog = await prisma.frog.findUnique({
                            where: { tokenId },
                            include: {
                                travels: true,
                                souvenirs: true,
                            },
                        });
                        console.log(`Synced frog ${tokenId} from chain`);
                    } catch (dbError) {
                        // 如果仍失败，再次尝试查询
                        console.log(`Failed to sync frog ${tokenId}, trying to fetch again:`, dbError);
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
        
        // [Sync-on-Read] 同步链上状态到数据库，确保状态最新
        try {
            await omniTravelService.syncFrogStatusFromChain(tokenId);
            // 重新获取更新后的 frog 数据
            frog = await prisma.frog.findUnique({
                where: { tokenId },
                include: {
                    travels: {
                        where: { status: 'Completed' },
                        orderBy: { createdAt: 'desc' },
                        take: 50,
                    },
                    souvenirs: true,
                },
            });
        } catch (syncErr) {
            logger.warn(`[FrogAPI] Failed to sync frog ${tokenId} status:`, syncErr);
            // 继续使用数据库中的数据
        }
        
        // 再次检查 frog 是否存在 (sync 后重新获取可能返回 null)
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
            } catch {
                // journalContent is plain text or Markdown, not JSON - this is normal
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
            data: stringifyBigInt({
                ...frog,
                travels: travelsWithJournal,
                friendshipStatus,
                friendshipId
            })
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