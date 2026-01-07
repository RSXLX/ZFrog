import { Router } from 'express';
import { prisma } from '../../database';
import { TravelStatus } from '@prisma/client';
import { travelP0Service } from '../../services/travel/travel-p0.service';
import { explorationService } from '../../services/travel/exploration.service';
import { ChainKey, SUPPORTED_CHAINS, getRandomTargetChain, getChainKey } from '../../config/chains';
import { travelProcessor } from '../../workers/travelProcessor';
import { logger } from '../../utils/logger';
import { parsePositiveInt, isValidDuration } from '../../utils/validation';

// 递归处理 BigInt 序列化问题
// ... (原有代码)
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

/**
 * GET /api/travels/history
 * 获取用户所有旅行历史（分页）
 */
router.get('/history', async (req, res) => {
    try {
        const { address, frogId } = req.query;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = parseInt(req.query.offset as string) || 0;

        if (!address) {
            return res.status(400).json({ 
                success: false, 
                error: 'Address is required' 
            });
        }

        // 首先获取该用户的所有青蛙
        const userFrogs = await prisma.frog.findMany({
            where: {
                ownerAddress: (address as string).toLowerCase()
            },
            select: { id: true, tokenId: true }
        });

        if (userFrogs.length === 0) {
            return res.json({
                success: true,
                data: {
                    travels: [],
                    total: 0,
                    hasMore: false
                }
            });
        }

        // 构建查询条件 - 使用青蛙ID列表
        const frogIds = userFrogs.map(f => f.id);
        const whereClause: any = {
            frogId: { in: frogIds }
        };

        // 如果指定了青蛙 ID，增加筛选条件
        if (frogId) {
            const parsedFrogId = parseInt(frogId as string);
            const targetFrog = userFrogs.find(f => f.tokenId === parsedFrogId);
            if (targetFrog) {
                whereClause.frogId = targetFrog.id;
            } else {
                // 如果指定的青蛙不属于该用户，返回空结果
                return res.json({
                    success: true,
                    data: {
                        travels: [],
                        total: 0,
                        hasMore: false
                    }
                });
            }
        }

        // 获取该用户所有青蛙的旅行记录
        const travels = await prisma.travel.findMany({
            where: whereClause,
            include: {
                frog: true,
                souvenir: true,
            },
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: limit,
        });

        // 获取总数
        const total = await prisma.travel.count({
            where: whereClause
        });

        // 解析日记内容同时处理 BigInt
        const travelsParsed = travels.map(travel => {
            let journal = null;
            try {
                if (travel.journalContent) {
                    journal = JSON.parse(travel.journalContent);
                }
            } catch (e) {
                console.warn('Failed to parse journal for travel', travel.id, e);
                journal = { 
                    title: '旅行回顾',
                    content: travel.journalContent,
                    mood: 'happy',
                    highlights: []
                };
            }
            return {
                ...travel,
                exploredBlock: travel.exploredBlock?.toString(),
                journal
            };
        });
        res.json({
            success: true,
            data: stringifyBigInt({
                travels: travelsParsed,
                total,
                hasMore: offset + limit < total
            })
        });
        
    } catch (error: any) {
        console.error('Error fetching travel history:', error);
        if (error.stack) console.error(error.stack);
        console.error('DEBUG: Full error details:', {
            message: error.message,
            code: error.code,
            meta: error.meta,
            cause: error.cause
        });
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error',
            details: error.message 
        });
    }
});

/**
 * GET /api/travels/stats
 * 获取用户旅行统计数据
 */
router.get('/stats', async (req, res) => {
    try {
        const { address } = req.query;

        if (!address) {
            return res.status(400).json({ 
                success: false, 
                error: 'Address is required' 
            });
        }

        // 获取该用户所有青蛙
        const frogs = await prisma.frog.findMany({
            where: {
                ownerAddress: (address as string).toLowerCase()
            }
        });

        // 如果指定了具体青蛙，则只统计该青蛙的数据
        let frogIds = frogs.map(f => f.id);
        const requestFrogId = req.query.frogId;
        
        if (requestFrogId && requestFrogId !== 'all') {
            const targetFrog = frogs.find(f => f.tokenId === parseInt(requestFrogId as string));
            if (targetFrog) {
                frogIds = [targetFrog.id];
            } else {
                // 如果请求的青蛙不在用户列表中，返回空数据
                return res.json({
                    success: true,
                    data: {
                        totalTrips: 0,
                        bscTrips: 0,
                        ethTrips: 0,
                        zetaTrips: 0,
                        totalDiscoveries: 0,
                        rareFinds: 0,
                        totalFrogs: frogs.length,
                        recentTravel: null
                    }
                });
            }
        }

        // 统计数据 - 按链分类统计
        const [totalTravels, bscTravels, ethTravels, zetaTravels] = await Promise.all([
            prisma.travel.count({
                where: { frogId: { in: frogIds } }
            }),
            prisma.travel.count({
                where: { 
                    frogId: { in: frogIds },
                    chainId: 97 // BSC Testnet
                }
            }),
            prisma.travel.count({
                where: { 
                    frogId: { in: frogIds },
                    chainId: 11155111 // Ethereum Sepolia
                }
            }),
            prisma.travel.count({
                where: { 
                    frogId: { in: frogIds },
                    chainId: 7001 // ZetaChain Athens
                }
            })
        ]);

        // 获取所有已完成的旅行，用于计算发现数据
        const completedTravels = await prisma.travel.findMany({
            where: { 
                frogId: { in: frogIds },
                status: 'Completed'
            },
            include: {
                souvenir: true
            }
        });

        // 计算总发现和稀有发现
        let totalDiscoveries = 0;
        let rareFinds = 0;
        
        completedTravels.forEach(travel => {
            // 从 exploredSnapshot 中获取发现数据
            const snapshot = travel.exploredSnapshot as any;
            if (snapshot?.discoveries) {
                totalDiscoveries += snapshot.discoveries.length;
                rareFinds += snapshot.discoveries.filter((d: any) => d.rarity >= 3).length;
            }
            
            // 从纪念品中计算稀有发现
            if (travel.souvenir) {
                const rarity = travel.souvenir.rarity as string;
                if (['Rare', 'Epic', 'Legendary'].includes(rarity)) {
                    rareFinds++;
                }
            }
        });

        // 获取最近的旅行
        const recentTravel = await prisma.travel.findFirst({
            where: { 
                frogId: { in: frogIds },
                status: 'Completed'
            },
            include: {
                frog: true
            },
            orderBy: { completedAt: 'desc' }
        });

        res.json({
            success: true,
            data: stringifyBigInt({
                totalTrips: totalTravels,
                bscTrips: bscTravels,
                ethTrips: ethTravels,
                zetaTrips: zetaTravels,
                totalDiscoveries,
                rareFinds,
                totalFrogs: frogs.length,
                recentTravel: recentTravel ? {
                    id: recentTravel.id,
                    frogName: recentTravel.frog.name,
                    completedAt: recentTravel.completedAt
                } : null
            })
        });
        
    } catch (error) {
        console.error('Error fetching travel stats:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

/**
 * GET /api/travels/:frogId
 * 获取青蛙的旅行历史
 */
router.get('/:frogId', async (req, res) => {
    try {
        const frogId = parseInt(req.params.frogId);
        
        const travels = await prisma.travel.findMany({
            where: { 
                frog: {
                    tokenId: frogId
                }
            },
            orderBy: { createdAt: 'desc' },
            include: {
                souvenir: true,
            },
        });
        
        const travelsParsed = travels.map(travel => {
            let journal = null;
            try {
                if (travel.journalContent) {
                    journal = JSON.parse(travel.journalContent);
                }
            } catch (e) {
                // 如果解析失败，说明可能是旧格式的纯文本
                journal = { 
                    title: '旅行回顾',
                    content: travel.journalContent,
                    mood: 'happy',
                    highlights: []
                };
            }
            return {
                ...travel,
                exploredBlock: travel.exploredBlock?.toString(),
                journal
            };
        });
        
        res.json(stringifyBigInt(travelsParsed));
        
    } catch (error) {
        console.error('Error fetching travels:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/travels/:frogId/active
 * 获取青蛙当前进行中的旅行
 */
router.get('/:frogId/active', async (req, res) => {
    try {
        const frogId = parseInt(req.params.frogId);
        const now = new Date();
        
        const activeTravel = await prisma.travel.findFirst({
            where: {
                frog: {
                    tokenId: frogId
                },
                status: {
                    in: [TravelStatus.Active, TravelStatus.Processing],
                },
                // endTime: { gt: now }  // 移除时间限制
            },
        });
        
        if (!activeTravel) {
            logger.info(`[TravelAPI] No active travel found for frog tokenId=${frogId}`);
            return res.json({ success: true, data: null });
        }
        
        // 计算剩余时间
        const remainingMs = activeTravel.endTime.getTime() - Date.now();
        const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
        
        res.json({
            success: true,
            data: stringifyBigInt({
                ...activeTravel,
                exploredBlock: activeTravel.exploredBlock?.toString(),
                remainingSeconds,
                progress: Math.min(100, Math.floor(
                    (Date.now() - activeTravel.startTime.getTime()) /
                    (activeTravel.endTime.getTime() - activeTravel.startTime.getTime()) * 100
                )),
            })
        });
        
    } catch (error) {
        logger.error('[TravelAPI] Error fetching active travel:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/travels/:travelId/interactions
 * 获取旅行探索互动记录
 */
router.get('/:travelId/interactions', async (req, res) => {
    try {
        const travelId = parseInt(req.params.travelId);
        
        if (isNaN(travelId)) {
            return res.status(400).json({ error: 'Invalid travel ID' });
        }
        
        const interactions = await prisma.travelInteraction.findMany({
            where: { travelId },
            orderBy: { createdAt: 'desc' },
            take: 50, // 最多返回50条
        });
        
        // 转换 BigInt 为字符串
        const data = interactions.map(i => ({
            ...i,
            blockNumber: i.blockNumber.toString(),
            timestamp: i.createdAt.toISOString()
        }));
        
        res.json({ success: true, data });
    } catch (error) {
        logger.error('[TravelAPI] Error fetching travel interactions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/travels/:travelId/explorations
 * 获取分类链上探索记录 (合约 vs 钱包)
 */
router.get('/:travelId/explorations', async (req, res) => {
    try {
        const travelId = parseInt(req.params.travelId);
        const category = req.query.category as string; // 'contract' | 'wallet' | 'all'
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        
        if (isNaN(travelId)) {
            return res.status(400).json({ error: 'Invalid travel ID' });
        }
        
        // 构建查询条件
        const whereClause: any = { travelId };
        if (category === 'contract') {
            whereClause.isContract = true;
        } else if (category === 'wallet') {
            whereClause.isContract = false;
        }
        
        // 获取分类统计 (Unified)
        const [
            interactionTotal, interactionContract, interactionWallet,
            discoveryTotal, discoveryContract, discoveryWallet
        ] = await Promise.all([
            prisma.travelInteraction.count({ where: { travelId } }),
            prisma.travelInteraction.count({ where: { travelId, isContract: true } }),
            prisma.travelInteraction.count({ where: { travelId, isContract: false } }),
            prisma.travelDiscovery.count({ where: { travelId } }),
            prisma.travelDiscovery.count({ where: { travelId, metadata: { path: ['isContract'], equals: true } } }), // JSON filtering logic might be tricky, simplifying for now
            prisma.travelDiscovery.count({ where: { travelId, metadata: { path: ['isContract'], equals: false } } })
        ]);

        // 获取 TravelInteraction 记录
        const interactions = await prisma.travelInteraction.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: limit, // Fetching limit from both is not perfect pagination, but acceptable for now
        });

        // 获取 TravelDiscovery 记录
        const discoveries = await prisma.travelDiscovery.findMany({
            where: { travelId }, 
            orderBy: { createdAt: 'desc' },
            take: limit
        });

        // 映射助手函数
        const mapChainTypeToId = (type: string) => {
            switch(type) {
                case 'ZETACHAIN_ATHENS': return 7001;
                case 'BSC_TESTNET': return 97;
                case 'ETH_SEPOLIA': return 11155111;
                default: return 7001;
            }
        };

        // 转换 Interaction -> Exploration
        const interactionData = interactions.map(e => {
            const chainKey = getChainKey(e.chainId);
            const chainConfig = SUPPORTED_CHAINS[chainKey];
            const explorerBase = chainConfig?.explorerUrl || 'https://zetachain.blockscout.com';
            
            return {
                id: e.id,
                chainId: e.chainId,
                chainName: chainConfig?.displayName || 'Unknown Chain',
                chainSymbol: chainConfig?.nativeSymbol || 'ETH',
                blockNumber: e.blockNumber.toString(),
                blockUrl: `${explorerBase}/block/${e.blockNumber}`,
                message: e.message,
                aiAnalysis: e.message, // Interaction message IS the analysis usually
                exploredAddress: e.exploredAddress,
                exploredUrl: e.exploredAddress ? `${explorerBase}/address/${e.exploredAddress}` : null,
                isContract: e.isContract,
                txHash: e.txHash,
                txUrl: e.txHash ? `${explorerBase}/tx/${e.txHash}` : null,
                timestamp: e.createdAt.toISOString(),
                source: 'interaction'
            };
        });

        // 转换 Discovery -> Exploration
        const discoveryData = discoveries.map(d => {
            const meta = d.metadata as any || {};
            const chainId = d.chainType ? mapChainTypeToId(d.chainType) : 7001;
            const chainKey = getChainKey(chainId);
            const chainConfig = SUPPORTED_CHAINS[chainKey];
            const explorerBase = chainConfig?.explorerUrl || 'https://zetachain.blockscout.com';
            
            return {
                id: d.id + 1000000,
                chainId: chainId,
                chainName: chainConfig?.displayName || 'Unknown Chain',
                chainSymbol: chainConfig?.nativeSymbol || 'ETH',
                blockNumber: d.blockNumber?.toString() || '0',
                blockUrl: d.blockNumber ? `${explorerBase}/block/${d.blockNumber}` : null,
                message: `${d.title}: ${d.description}`,
                aiAnalysis: `${d.title} - ${d.description}`, // Discovery IS AI generated
                exploredAddress: meta.address || meta.from || null,
                exploredUrl: (meta.address || meta.from) ? `${explorerBase}/address/${meta.address || meta.from}` : null,
                isContract: meta.isContract || false,
                txHash: meta.txHash || meta.hash || null,
                txUrl: (meta.txHash || meta.hash) ? `${explorerBase}/tx/${meta.txHash || meta.hash}` : null,
                timestamp: d.createdAt.toISOString(),
                source: 'discovery'
            };
        });

        // 合并并排序
        let allData = [...interactionData, ...discoveryData];
        
        // 排序 (前端做筛选，后端返回全部)
        allData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // P2: Calculate unique addresses for summary
        const uniqueAddresses = new Set(
            allData
                .map(d => d.exploredAddress?.toLowerCase())
                .filter(Boolean)
        );

        res.json({
            success: true,
            data: {
                summary: {
                    total: allData.length,
                    uniqueAddresses: uniqueAddresses.size,  // P2: Unique address count
                    contracts: allData.filter(d => d.isContract).length,
                    wallets: allData.filter(d => !d.isContract).length,
                },
                explorations: allData, // 返回全部数据，前端做筛选
            }
        });
    } catch (error) {
        logger.error('[TravelAPI] Error fetching travel explorations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/travels/:travelId/trajectory
 * 获取旅行轨迹点列表 (用于轨迹地图)
 */
router.get('/:travelId/trajectory', async (req, res) => {
    try {
        const travelId = parseInt(req.params.travelId);
        
        if (isNaN(travelId)) {
            return res.status(400).json({ error: 'Invalid travel ID' });
        }
        
        // 获取旅行详情和互动记录
        const travel = await prisma.travel.findUnique({
            where: { id: travelId },
            include: {
                frog: { select: { tokenId: true, ownerAddress: true, name: true } },
                interactions: { orderBy: { createdAt: 'asc' } }
            }
        });
        
        if (!travel) {
            return res.status(404).json({ error: 'Travel not found' });
        }
        
        // 构建轨迹点列表
        const points = [];
        
        // 起点
        points.push({
            type: 'start' as const,
            chainId: 7001, // ZetaChain
            address: travel.frog?.ownerAddress || '',
            message: `${travel.frog?.name || '青蛙'} 开始跨链冒险！`,
            timestamp: travel.startTime.toISOString(),
            isContract: false
        });
        
        // 探索点
        for (const interaction of travel.interactions) {
            points.push({
                id: interaction.id,
                type: 'explore' as const,
                chainId: interaction.chainId,
                address: interaction.exploredAddress || '',
                message: interaction.message,
                timestamp: interaction.createdAt.toISOString(),
                isContract: interaction.isContract
            });
        }
        
        // 终点 (如果旅行已完成)
        if (travel.status === 'Completed') {
            points.push({
                type: 'end' as const,
                chainId: 7001,
                address: travel.frog?.ownerAddress || '',
                message: `${travel.frog?.name || '青蛙'} 安全返回家园~`,
                timestamp: travel.completeTxHash ? (travel.updatedAt || travel.endTime).toISOString() : travel.endTime.toISOString(),
                isContract: false
            });
        }
        
        res.json({ success: true, points });
    } catch (error) {
        logger.error('[TravelAPI] Error fetching travel trajectory:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/travels/journal/:travelId
 * 获取旅行日记详情
 */
router.get('/journal/:travelId', async (req, res) => {
    try {
        const travelId = parseInt(req.params.travelId);
        
        const travel = await prisma.travel.findUnique({
            where: { id: travelId },
            include: {
                frog: true,
                souvenir: true,
            },
        });
        
        if (!travel || !travel.journalContent) {
            return res.status(404).json({ error: 'Journal not found' });
        }
        
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

        // Fetch discoveries from DB
        let discoveries = await prisma.travelDiscovery.findMany({
            where: { travelId },
            orderBy: { createdAt: 'desc' }
        });

        // Fallback: If DB is empty, try to use the JSON snapshot (Legacy or Cross-Chain fallback)
        if (discoveries.length === 0 && travel.exploredSnapshot) {
            const snapshot = travel.exploredSnapshot as any;
            if (snapshot && Array.isArray(snapshot.discoveries) && snapshot.discoveries.length > 0) {
                discoveries = snapshot.discoveries;
                // Ensure dates are stringified if needed, but usually JSON is parsed as objects
            }
        }

        res.json({
            success: true,
            data: stringifyBigInt({
                id: travel.id,
                frogName: travel.frog.name,
                journalHash: travel.journalHash,
                journal,
                souvenir: travel.souvenir,
                completedAt: travel.completedAt,
                exploredBlock: travel.exploredBlock?.toString(),
                exploredSnapshot: {
                    discoveries: discoveries
                },
                // Include other travel fields
                status: travel.status,
                chainId: travel.chainId,
                targetWallet: travel.targetWallet
            })
        });
        
    } catch (error) {
        console.error('Error fetching journal:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/travels/start
 * 开始链上随机探索旅行
 */
router.post('/start', async (req, res) => {
    try {
        const { frogId, travelType = 'RANDOM', targetChain: inputChain, targetAddress, duration } = req.body;
        
        // 如果未传入目标链，随机选择一个
        const targetChain = inputChain || getRandomTargetChain();
        
        logger.info(`[TravelAPI] POST /start: frogId=${frogId}, type=${travelType}, chain=${targetChain}${!inputChain ? ' (random)' : ''}, duration=${duration}`);
        
        if (!frogId) {
            return res.status(400).json({ 
                success: false, 
                error: 'frogId is required' 
            });
        }
        
        // 根据tokenId查找青蛙的数据库id
        const frog = await prisma.frog.findUnique({
            where: { tokenId: parseInt(frogId) },
        });
        
        if (!frog) {
            return res.status(404).json({ 
                success: false, 
                error: 'Frog not found' 
            });
        }
        
        // 如果是随机探索且没有提供目标地址，使用零地址
        const finalTargetAddress = travelType === 'RANDOM' && !targetAddress 
            ? '0x0000000000000000000000000000000000000000' 
            : targetAddress;
        
        const chainConfig = SUPPORTED_CHAINS[targetChain as ChainKey];
        
        // 创建旅行记录
        const travel = await prisma.travel.create({
            data: {
                frogId: frog.id,
                targetWallet: finalTargetAddress,
                chainId: chainConfig?.chainId || 7001,
                status: TravelStatus.Active,
                startTime: new Date(),
                endTime: new Date(Date.now() + (duration || 60) * 1000), // 默认60秒
                isRandom: travelType === 'RANDOM',
            },
            include: {
                frog: true,
            },
        });
        
        // 启动后台处理
        travelProcessor.processTravel(travel).catch((error: any) => {
            logger.error(`Failed to process travel ${travel.id}:`, error);
        });
        
        res.json({
            success: true,
            data: {
                travelId: travel.id,
                txHash: '0x' + Math.random().toString(16).slice(2, 66), // 临时模拟hash
                targetChain: targetChain,
                chainName: chainConfig?.displayName || targetChain,
            },
            message: `🐸 青蛙背上小书包出发去${chainConfig?.displayName || targetChain}啦！`,
        });
        
    } catch (error: any) {
        console.error('Error starting travel:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Internal server error' 
        });
    }
});

/**
 * POST /api/travels/start-p0
 * 开始 P0 随机旅行
 */
router.post('/start-p0', async (req, res) => {
    try {
        const { frogId, travelType = 'RANDOM', targetChain: inputChain, targetAddress, duration } = req.body;
        
        // 如果未传入目标链，随机选择一个
        const targetChain = inputChain || getRandomTargetChain();
        
        logger.info(`[TravelAPI] POST /start-p0: frogId=${frogId}, type=${travelType}, chain=${targetChain}${!inputChain ? ' (random)' : ''}, duration=${duration}`);
        
        if (!frogId) {
            return res.status(400).json({ 
                success: false, 
                error: 'frogId is required' 
            });
        }
        
        // 根据tokenId查找青蛙的数据库id
        const frog = await prisma.frog.findUnique({
            where: { tokenId: parseInt(frogId) },
        });
        
        if (!frog) {
            return res.status(404).json({ 
                success: false, 
                error: 'Frog not found' 
            });
        }
        
        const result = await travelP0Service.startTravel({
            frogId: frog.id, // 使用数据库id
            travelType: travelType as 'RANDOM' | 'SPECIFIC',
            targetChain: targetChain as ChainKey,
            targetAddress,
            duration: duration ? parseInt(duration) : undefined,
        });
        
        const chainConfig = SUPPORTED_CHAINS[targetChain as ChainKey];
        
        res.json({
            success: true,
            data: {
                ...result,
                targetChain: targetChain,
                chainName: chainConfig?.displayName || targetChain,
            },
            message: `🐸 青蛙背上小书包出发去${chainConfig?.displayName || targetChain}啦！`,
        });
        
    } catch (error: any) {
        console.error('Error starting P0 travel:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Internal server error' 
        });
    }
});

/**
 * GET /api/travels/p0/:travelId
 * 获取 P0 旅行详情（包含日记、纪念品、发现）
 */
router.get('/p0/:travelId', async (req, res) => {
    try {
        const travelId = parseInt(req.params.travelId);
        
        const travel = await prisma.travel.findUnique({
            where: { id: travelId },
        });
        
        if (!travel) {
            return res.status(404).json({
                success: false,
                error: '找不到这次旅行',
            });
        }
        
        // 解析 P0 数据 (Improved Logic)
        // Fetch discoveries from DB
        let discoveries = await prisma.travelDiscovery.findMany({
            where: { travelId },
            orderBy: { createdAt: 'desc' }
        });

        // Fallback: If DB is empty, try to use the JSON snapshot (Legacy or Cross-Chain fallback)
        if (discoveries.length === 0 && travel.exploredSnapshot) {
            const snapshot = travel.exploredSnapshot as any;
            if (snapshot && Array.isArray(snapshot.discoveries) && snapshot.discoveries.length > 0) {
                discoveries = snapshot.discoveries;
            }
        }
        
        const souvenir = travel.souvenirData as any;
        
        // 解析日记内容
        let journal = null;
        const rawContent = travel.journalContent || '';
        
        // Try to parse if it looks like JSON
        if (rawContent.trim().startsWith('{')) {
            try {
                journal = JSON.parse(rawContent);
            } catch (e) {
                // If parsing fails despite looking like JSON, treat as text
                journal = { 
                    title: '旅行回顾',
                    content: rawContent,
                    mood: 'happy',
                    highlights: []
                };
            }
        } else {
            // It's a plain string (legacy or cross-chain AI text)
            journal = { 
                title: '旅行回顾',
                content: rawContent,
                mood: 'happy',
                highlights: []
            };
        }
        
        // 获取纪念品详细信息
        let souvenirDetail = null;
        if (travel.souvenirId) {
            souvenirDetail = await prisma.souvenir.findUnique({
                where: { id: travel.souvenirId }
            });
        }
        
        res.json(stringifyBigInt({
            success: true,
            data: {
                ...travel,
                journal,
                exploredSnapshot: {
                   discoveries
                },
                souvenir: souvenirDetail,
                exploredBlock: travel.exploredBlock?.toString(),
            },
        }));
        
    } catch (error) {
        console.error('Error fetching P0 travel:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

/**
 * GET /api/travels/lucky-address
 * 发现一个链上的“幸运”活跃地址
 */
router.get('/lucky-address', async (req, res) => {
    try {
        const { chain } = req.query;
        if (!chain) {
            return res.status(400).json({ success: false, error: 'Chain is required' });
        }

        const address = await explorationService.getRandomTargetAddress(chain as ChainKey);
        res.json({ success: true, data: { address } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/travels/group
 * 发起结伴旅行（两只青蛙一起）
 */
router.post('/group', async (req, res) => {
    try {
        const { leaderId, companionId, targetChain, duration } = req.body;
        
        logger.info(`[TravelAPI] POST /group: leader=${leaderId}, companion=${companionId}, chain=${targetChain}, duration=${duration}`);
        
        // [P2] Enhanced input validation
        const parsedLeaderId = parsePositiveInt(leaderId);
        const parsedCompanionId = parsePositiveInt(companionId);
        
        if (!parsedLeaderId || !parsedCompanionId) {
            return res.status(400).json({ 
                success: false, 
                error: 'leaderId and companionId must be valid positive integers' 
            });
        }
        
        if (parsedLeaderId === parsedCompanionId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Leader and companion must be different frogs' 
            });
        }
        
        // Validate duration if provided
        const travelDuration = duration ? parsePositiveInt(duration) || 3600 : 3600;
        if (!isValidDuration(travelDuration, 60, 86400)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Duration must be between 1 minute and 24 hours' 
            });
        }
        
        // 根据 tokenId 查找两只青蛙
        const [leaderFrog, companionFrog] = await Promise.all([
            prisma.frog.findUnique({ where: { tokenId: parsedLeaderId } }),
            prisma.frog.findUnique({ where: { tokenId: parsedCompanionId } })
        ]);
        
        if (!leaderFrog || !companionFrog) {
            return res.status(404).json({ 
                success: false, 
                error: 'One or both frogs not found' 
            });
        }
        
        // 验证两只青蛙都处于 Idle 状态
        if (leaderFrog.status !== 'Idle') {
            return res.status(400).json({ 
                success: false, 
                error: `${leaderFrog.name} 正在旅行中，无法再次出发` 
            });
        }
        
        if (companionFrog.status !== 'Idle') {
            return res.status(400).json({ 
                success: false, 
                error: `${companionFrog.name} 正在旅行中，无法一起出发` 
            });
        }
        
        // 验证两只青蛙是好友
        const friendship = await prisma.friendship.findFirst({
            where: {
                OR: [
                    { requesterId: leaderFrog.id, addresseeId: companionFrog.id },
                    { requesterId: companionFrog.id, addresseeId: leaderFrog.id }
                ],
                status: 'Accepted'
            }
        });
        
        if (!friendship) {
            return res.status(403).json({ 
                success: false, 
                error: '只有好友才能一起结伴旅行' 
            });
        }
        
        // travelDuration already validated above
        const chainId = SUPPORTED_CHAINS[targetChain as ChainKey]?.chainId || 7001;
        
        // 使用事务创建旅行和结伴旅行记录
        const result = await prisma.$transaction(async (tx) => {
            // 1. 创建主旅行记录
            const travel = await tx.travel.create({
                data: {
                    frogId: leaderFrog.id,
                    targetWallet: '0x0000000000000000000000000000000000000000',
                    chainId,
                    status: TravelStatus.Active,
                    startTime: new Date(),
                    endTime: new Date(Date.now() + travelDuration * 1000),
                    isRandom: true,
                }
            });
            
            // 2. 创建结伴旅行记录
            const groupTravel = await tx.groupTravel.create({
                data: {
                    leaderId: leaderFrog.id,
                    companionId: companionFrog.id,
                    travelId: travel.id,
                    status: 'ACTIVE'
                }
            });
            
            // 3. 更新两只青蛙状态为旅行中
            await tx.frog.updateMany({
                where: { id: { in: [leaderFrog.id, companionFrog.id] } },
                data: { status: 'Traveling' }
            });
            
            // 4. 创建好友互动记录
            await tx.friendInteraction.create({
                data: {
                    friendshipId: friendship.id,
                    actorId: leaderFrog.id,
                    type: 'Travel',
                    message: `${leaderFrog.name} 和 ${companionFrog.name} 一起踏上了冒险之旅！`,
                    metadata: { 
                        groupTravelId: groupTravel.id,
                        travelId: travel.id,
                        chainId 
                    }
                }
            });
            
            return { travel, groupTravel };
        });
        
        // 启动后台处理
        travelProcessor.processTravel(result.travel).catch((error: any) => {
            logger.error(`Failed to process group travel ${result.travel.id}:`, error);
        });
        
        res.json({
            success: true,
            data: {
                travelId: result.travel.id,
                groupTravelId: result.groupTravel.id,
                leader: { id: leaderFrog.tokenId, name: leaderFrog.name },
                companion: { id: companionFrog.tokenId, name: companionFrog.name },
            },
            message: `🐸🐸 ${leaderFrog.name} 和 ${companionFrog.name} 一起出发啦！`,
        });
        
    } catch (error: any) {
        console.error('Error starting group travel:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Internal server error' 
        });
    }
});

/**
 * GET /api/travels/:travelId/group
 * 获取结伴旅行详情
 */
router.get('/:travelId/group', async (req, res) => {
    try {
        const travelId = parseInt(req.params.travelId);
        
        const groupTravel = await prisma.groupTravel.findUnique({
            where: { travelId },
            include: {
                leader: true,
                companion: true,
                travel: true
            }
        });
        
        if (!groupTravel) {
            return res.status(404).json({ 
                success: false, 
                error: 'Group travel not found' 
            });
        }
        
        res.json({
            success: true,
            data: stringifyBigInt(groupTravel)
        });
        
    } catch (error: any) {
        console.error('Error fetching group travel:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Internal server error' 
        });
    }
});

export default router;
