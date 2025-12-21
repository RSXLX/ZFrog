import { Router } from 'express';
import { prisma } from '../../database';
import { TravelStatus } from '@prisma/client';
import { travelP0Service } from '../../services/travel/travel-p0.service';
import { explorationService } from '../../services/travel/exploration.service';
import { ChainKey, SUPPORTED_CHAINS } from '../../config/chains';
import { travelProcessor } from '../../workers/travelProcessor';
import { logger } from '../../utils/logger';

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

        const frogIds = frogs.map(f => f.id);

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
                endTime: {
                    gt: now  // 只返回还未结束的旅行
                }
            },
        });
        
        if (!activeTravel) {
            return res.status(404).json({ error: 'No active travel' });
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
        console.error('Error fetching active travel:', error);
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

        res.json({
            success: true,
            data: stringifyBigInt({
                frogName: travel.frog.name,
                journalHash: travel.journalHash,
                journal,
                souvenir: travel.souvenir,
                completedAt: travel.completedAt,
                exploredBlock: travel.exploredBlock?.toString(),
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
        const { frogId, travelType = 'RANDOM', targetChain, targetAddress, duration } = req.body;
        
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
        
        // 创建旅行记录
        const travel = await prisma.travel.create({
            data: {
                frogId: frog.id,
                targetWallet: finalTargetAddress,
                chainId: SUPPORTED_CHAINS[targetChain as ChainKey]?.chainId || 7001,
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
            },
            message: '🐸 青蛙背上小书包出发啦！',
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
        const { frogId, travelType = 'RANDOM', targetChain, targetAddress, duration } = req.body;
        
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
        
        res.json({
            success: true,
            data: result,
            message: '🐸 青蛙背上小书包出发啦！',
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
        
        // 解析 P0 数据
        const snapshot = travel.exploredSnapshot as any;
        const discoveries = snapshot?.discoveries || [];
        const souvenir = travel.souvenirData as any;
        
        // 解析日记内容
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
                discoveries,
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

export default router;
