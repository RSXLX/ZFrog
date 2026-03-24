import { Router } from 'express';
import { prisma } from '../../database';
import { explorationService } from '../../services/travel/exploration.service';
import { ChainKey, SUPPORTED_CHAINS, getRandomTargetChain, getChainKey } from '../../config/chains';
import { travelProcessor } from '../../workers/travelProcessor';
import { logger } from '../../utils/logger';
import { parsePositiveInt, parseNonNegativeInt, isValidDuration } from '../../utils/validation';
import { travelCommandServiceV1 } from '../../modules/travel/travel.command';
import { travelQueryServiceV1 } from '../../modules/travel/travel.query';
import { markLegacyDeprecated } from './legacy-deprecation';

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

const router: Router = Router();

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
        
        const parsedFrogId = frogId ? parseInt(frogId as string, 10) : undefined;
        const data = await travelQueryServiceV1.getLegacyHistory({
            walletAddress: address as string,
            frogTokenId: Number.isNaN(parsedFrogId as number) ? undefined : parsedFrogId,
            limit,
            offset,
        });

        res.json({
            success: true,
            data: stringifyBigInt({
                travels: data.travels,
                total: data.total,
                hasMore: data.hasMore,
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
        
        const requestFrogId = req.query.frogId as string | undefined;
        const parsedFrogId =
            requestFrogId && requestFrogId !== 'all' ? parseInt(requestFrogId, 10) : undefined;
        const data = await travelQueryServiceV1.getLegacyStats({
            walletAddress: address as string,
            frogTokenId: Number.isNaN(parsedFrogId as number) ? undefined : parsedFrogId,
        });

        res.json({
            success: true,
            data: stringifyBigInt(data),
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
        if (isNaN(frogId)) {
            return res.status(400).json({ error: 'Invalid frog ID' });
        }

        const travels = await travelQueryServiceV1.getLegacyTravelsByTokenId(frogId);
        res.json(stringifyBigInt(travels));
        
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
        if (isNaN(frogId)) {
            return res.status(400).json({ success: false, error: 'Invalid frog ID' });
        }

        const activeTravel = await travelQueryServiceV1.getLegacyActiveTravel(frogId);
        
        if (!activeTravel) {
            logger.info(`[TravelAPI] No active travel found for frog tokenId=${frogId}`);
            return res.json({ success: true, data: null });
        }

        res.json({
            success: true,
            data: stringifyBigInt({
                ...activeTravel,
                exploredBlock: (activeTravel as any).exploredBlock?.toString?.() || (activeTravel as any).exploredBlock,
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
        const category = req.query.category as string; // 'contract' | 'wallet' | 'all' | undefined
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        
        if (isNaN(travelId)) {
            return res.status(400).json({ error: 'Invalid travel ID' });
        }

        // 获取所有 TravelInteraction 记录
        const interactions = await prisma.travelInteraction.findMany({
            where: { travelId },
            orderBy: { createdAt: 'desc' },
        });

        // 获取所有 TravelDiscovery 记录
        const discoveries = await prisma.travelDiscovery.findMany({
            where: { travelId }, 
            orderBy: { createdAt: 'desc' },
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
                aiAnalysis: e.message,
                exploredAddress: e.exploredAddress,
                exploredUrl: e.exploredAddress ? `${explorerBase}/address/${e.exploredAddress}` : null,
                isContract: e.isContract,
                txHash: e.txHash,
                txUrl: e.txHash ? `${explorerBase}/tx/${e.txHash}` : null,
                timestamp: e.createdAt.toISOString(),
                source: 'interaction' as const
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
                aiAnalysis: `${d.title} - ${d.description}`,
                exploredAddress: meta.address || meta.from || null,
                exploredUrl: (meta.address || meta.from) ? `${explorerBase}/address/${meta.address || meta.from}` : null,
                isContract: meta.isContract === true,  // 严格布尔值
                txHash: meta.txHash || meta.hash || null,
                txUrl: (meta.txHash || meta.hash) ? `${explorerBase}/tx/${meta.txHash || meta.hash}` : null,
                timestamp: d.createdAt.toISOString(),
                source: 'discovery' as const
            };
        });

        // 合并所有数据
        let allData = [...interactionData, ...discoveryData];
        
        // 按时间排序
        allData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // 先计算全量统计（用于 summary 显示）
        const totalContracts = allData.filter(d => d.isContract === true).length;
        const totalWallets = allData.filter(d => d.isContract === false).length;
        const totalAll = allData.length;

        // 根据 category 筛选数据
        if (category === 'contract') {
            allData = allData.filter(d => d.isContract === true);
        } else if (category === 'wallet') {
            allData = allData.filter(d => d.isContract === false);
        }
        // category === 'all' 或 undefined 时不筛选

        // 应用分页
        const paginatedData = allData.slice(offset, offset + limit);

        // 计算筛选后的唯一地址
        const uniqueAddresses = new Set(
            allData
                .map(d => d.exploredAddress?.toLowerCase())
                .filter(Boolean)
        );

        res.json({
            success: true,
            data: {
                summary: {
                    // 全量统计（不受筛选影响）
                    totalAll,
                    totalContracts,
                    totalWallets,
                    // 当前筛选结果
                    filtered: allData.length,
                    uniqueAddresses: uniqueAddresses.size,
                },
                explorations: paginatedData,
                pagination: {
                    offset,
                    limit,
                    total: allData.length,
                    hasMore: offset + limit < allData.length
                }
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
        markLegacyDeprecated(res, '/api/v1/travels/:travelId');
        const travelId = parseInt(req.params.travelId);
        if (isNaN(travelId)) {
            return res.status(400).json({ error: 'Invalid travel ID' });
        }

        const detail = await travelQueryServiceV1.getTravel({ travelId });
        if (!detail.journal) {
            return res.status(404).json({ error: 'Journal not found' });
        }

        res.json(
            stringifyBigInt({
                success: true,
                data: {
                    id: detail.travelId,
                    frogName: detail.frogName,
                    journalHash: null,
                    journal: detail.journal,
                    souvenir: detail.souvenir,
                    completedAt: detail.completedAt,
                    exploredBlock: null,
                    exploredSnapshot: {
                        discoveries: detail.discoveries,
                    },
                    status: detail.status,
                    chainId: detail.chainId,
                    targetWallet: detail.targetWallet,
                },
            })
        );
        
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
        const targetChain = inputChain || getRandomTargetChain();

        logger.info(
            `[TravelAPI] POST /start: frogId=${frogId}, type=${travelType}, chain=${targetChain}${!inputChain ? ' (random)' : ''}, duration=${duration}`
        );

        if (!frogId) {
            return res.status(400).json({
                success: false,
                error: 'frogId is required',
            });
        }

        const tokenId = parseInt(String(frogId), 10);
        if (Number.isNaN(tokenId) || tokenId < 0) {
            return res.status(400).json({
                success: false,
                error: 'frogId must be a valid tokenId',
            });
        }

        const frog = await prisma.frog.findUnique({
            where: { tokenId },
            select: {
                id: true,
                tokenId: true,
                ownerAddress: true,
            },
        });

        if (!frog) {
            return res.status(404).json({
                success: false,
                error: 'Frog not found',
            });
        }

        const parsedDuration = duration ? parseInt(String(duration), 10) : undefined;
        const normalizedType = String(travelType).toLowerCase() === 'specific' ? 'specific' : 'random';

        const startResult = await travelCommandServiceV1.startTravel({
            frogId: frog.id,
            walletAddress: frog.ownerAddress,
            travelType: normalizedType,
            targetChain,
            targetAddress,
            duration:
                Number.isNaN(parsedDuration as number) || parsedDuration === undefined
                    ? 60
                    : parsedDuration,
            source: 'legacy_travel_start',
        });

        const chainConfig =
            SUPPORTED_CHAINS[(startResult.targetChain as ChainKey) || getChainKey(startResult.chainId)] || null;
        const chainName = chainConfig?.displayName || String(startResult.targetChain);

        const createdTravel = await prisma.travel.findUnique({
            where: { id: startResult.travelId },
            include: { frog: true },
        });

        if (createdTravel) {
            travelProcessor.processTravel(createdTravel).catch((error: any) => {
                logger.error(`Failed to process travel ${createdTravel.id}:`, error);
            });
        }

        res.json({
            success: true,
            data: {
                travelId: startResult.travelId,
                targetChain: startResult.targetChain,
                chainName,
                status: startResult.status,
                currentStage: startResult.currentStage,
            },
            message: `🐸 青蛙背上小书包出发去${chainName}啦！`,
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
        const targetChain = inputChain || getRandomTargetChain();

        logger.info(
            `[TravelAPI] POST /start-p0: frogId=${frogId}, type=${travelType}, chain=${targetChain}${!inputChain ? ' (random)' : ''}, duration=${duration}`
        );

        if (!frogId) {
            return res.status(400).json({
                success: false,
                error: 'frogId is required',
            });
        }

        const tokenId = parseInt(String(frogId), 10);
        if (Number.isNaN(tokenId) || tokenId < 0) {
            return res.status(400).json({
                success: false,
                error: 'frogId must be a valid tokenId',
            });
        }

        const frog = await prisma.frog.findUnique({
            where: { tokenId },
            select: {
                id: true,
                ownerAddress: true,
            },
        });

        if (!frog) {
            return res.status(404).json({
                success: false,
                error: 'Frog not found',
            });
        }

        const parsedDuration = duration ? parseInt(String(duration), 10) : 120;
        const normalizedType = String(travelType).toLowerCase() === 'specific' ? 'specific' : 'random';

        const result = await travelCommandServiceV1.startTravel({
            frogId: frog.id,
            walletAddress: frog.ownerAddress,
            travelType: normalizedType,
            targetChain,
            targetAddress,
            duration: Number.isNaN(parsedDuration) ? 120 : parsedDuration,
            source: 'legacy_travel_start_p0',
        });

        const chainConfig =
            SUPPORTED_CHAINS[(result.targetChain as ChainKey) || getChainKey(result.chainId)] || null;
        const chainName = chainConfig?.displayName || String(result.targetChain);

        const delay = Number.isNaN(parsedDuration) ? 120 : parsedDuration;
        setTimeout(() => {
            prisma.travel
                .findUnique({
                    where: { id: result.travelId },
                    include: { frog: true },
                })
                .then((travel) => {
                    if (!travel) {
                        return;
                    }
                    return travelProcessor.processTravel(travel);
                })
                .catch((error) => {
                    logger.error(`Failed to process delayed P0 travel ${result.travelId}:`, error);
                });
        }, delay * 1000);

        res.json({
            success: true,
            data: {
                travelId: result.travelId,
                estimatedDuration: delay,
                targetChain: result.targetChain,
                chainName,
                status: result.status,
                currentStage: result.currentStage,
            },
            message: `🐸 青蛙背上小书包出发去${chainName}啦！`,
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
        markLegacyDeprecated(res, '/api/v1/travels/:travelId');
        const travelId = parseInt(req.params.travelId);
        if (isNaN(travelId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid travel ID',
            });
        }

        const detail = await travelQueryServiceV1.getTravel({ travelId });
        res.json(
            stringifyBigInt({
                success: true,
                data: {
                    id: detail.travelId,
                    travelId: detail.travelId,
                    frogId: detail.frogId,
                    tokenId: detail.tokenId,
                    status: detail.status,
                    currentStage: detail.currentStage,
                    progress: detail.progress,
                    chainId: detail.chainId,
                    targetWallet: detail.targetWallet,
                    startTime: detail.startTime,
                    endTime: detail.endTime,
                    completedAt: detail.completedAt,
                    journal: detail.journal,
                    exploredSnapshot: {
                        discoveries: detail.discoveries,
                    },
                    souvenir: detail.souvenir,
                    exploredBlock: null,
                },
            })
        );
        
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
        
        // [P2] Enhanced input validation - use parseNonNegativeInt for tokenId (0 is valid)
        const parsedLeaderId = parseNonNegativeInt(leaderId);
        const parsedCompanionId = parseNonNegativeInt(companionId);
        
        if (parsedLeaderId === null || parsedCompanionId === null) {
            return res.status(400).json({ 
                success: false, 
                error: 'leaderId and companionId must be valid non-negative integers' 
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
        
        const result = await travelCommandServiceV1.startGroupTravel({
            leaderTokenId: parsedLeaderId,
            companionTokenId: parsedCompanionId,
            targetChain: targetChain || 7001,
            duration: travelDuration,
            source: 'legacy_travel_group_start',
        });

        const createdTravel = await prisma.travel.findUnique({
            where: { id: result.travelId },
            include: { frog: true },
        });
        if (createdTravel) {
            travelProcessor.processTravel(createdTravel).catch((error: any) => {
                logger.error(`Failed to process group travel ${createdTravel.id}:`, error);
            });
        }
        
        res.json({
            success: true,
            data: {
                travelId: result.travelId,
                groupTravelId: result.groupTravelId,
                leader: result.leader,
                companion: result.companion,
            },
            message: `🐸🐸 ${result.leader.name} 和 ${result.companion.name} 一起出发啦！`,
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
        if (isNaN(travelId)) {
            return res.status(400).json({ success: false, error: 'Invalid travel ID' });
        }

        const groupTravel = await travelQueryServiceV1.getGroupTravelByTravelId(travelId);
        
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

// ============ 🆕 V2.0 投喂系统 API ============


/**
 * POST /api/travels/:travelId/feed
 * 投喂旅行中的青蛙
 */
router.post('/:travelId/feed', async (req, res) => {
    try {
        const travelId = parseInt(req.params.travelId);
        const { feederId, feedType = 'energy' } = req.body;

        if (isNaN(travelId)) {
            return res.status(400).json({ success: false, error: 'Invalid travel ID' });
        }

        if (!feederId) {
            return res.status(400).json({ success: false, error: 'feederId is required' });
        }

        logger.info(`[TravelAPI] Feed request: travelId=${travelId}, feederId=${feederId}, type=${feedType}`);

        const result = await travelCommandServiceV1.feedTravel({
            travelId,
            feederId,
            feedType,
        });

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.message,
            });
        }

        res.json({
            success: true,
            data: {
                timeReduced: result.timeReduced,
                newEndTime: result.newEndTime.toISOString(),
            },
            message: result.message,
        });
    } catch (error: any) {
        logger.error('[TravelAPI] Error feeding travel:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
        });
    }
});

/**
 * GET /api/travels/:travelId/feeds
 * 获取旅行的投喂记录
 */
router.get('/:travelId/feeds', async (req, res) => {
    try {
        const travelId = parseInt(req.params.travelId);

        if (isNaN(travelId)) {
            return res.status(400).json({ success: false, error: 'Invalid travel ID' });
        }

        const feeds = await travelQueryServiceV1.getTravelFeeds(travelId);

        res.json({
            success: true,
            data: feeds,
        });
    } catch (error: any) {
        logger.error('[TravelAPI] Error fetching feed history:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
        });
    }
});

// ============ 🆕 V2.0 P1 偏好和探索脚印 API ============

import { snackPreferenceService } from '../../services/travel/snack-preference.service';
import { explorationFootprintService } from '../../services/travel/exploration-footprint.service';

/**
 * GET /api/travels/:travelId/share
 * 生成旅行分享卡片
 */
router.get('/:travelId/share', async (req, res) => {
    try {
        const travelId = parseInt(req.params.travelId);

        if (isNaN(travelId)) {
            return res.status(400).json({ success: false, error: 'Invalid travel ID' });
        }

        const travel = await prisma.travel.findUnique({
            where: { id: travelId },
            include: { frog: true },
        });

        if (!travel) {
            return res.status(404).json({ success: false, error: 'Travel not found' });
        }

        // 生成分享卡片
        const shareCard = await explorationFootprintService.generateShareCard(
            travelId,
            travel.frog.name
        );

        res.json({
            success: true,
            data: shareCard,
        });
    } catch (error: any) {
        logger.error('[TravelAPI] Error generating share card:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
        });
    }
});

/**
 * GET /api/travels/frog/:frogId/preference
 * 获取青蛙的零食偏好
 */
router.get('/frog/:frogId/preference', async (req, res) => {
    try {
        const frogId = parseInt(req.params.frogId);
        const chainKey = req.query.chainKey as string;

        if (isNaN(frogId)) {
            return res.status(400).json({ success: false, error: 'Invalid frog ID' });
        }

        const preference = await snackPreferenceService.getPreference(frogId, chainKey);
        const snackTypes = snackPreferenceService.getAllSnackTypes();

        res.json({
            success: true,
            data: {
                preference,
                allSnacks: snackTypes,
            },
        });
    } catch (error: any) {
        logger.error('[TravelAPI] Error getting frog preference:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
        });
    }
});

/**
 * GET /api/travels/frog/:frogId/discoveries
 * 获取青蛙的地址发现记录
 */
router.get('/frog/:frogId/discoveries', async (req, res) => {
    try {
        const frogId = parseInt(req.params.frogId);

        if (isNaN(frogId)) {
            return res.status(400).json({ success: false, error: 'Invalid frog ID' });
        }

        const discoveries = await explorationFootprintService.getFrogDiscoveries(frogId);

        res.json({
            success: true,
            data: discoveries,
        });
    } catch (error: any) {
        logger.error('[TravelAPI] Error getting frog discoveries:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
        });
    }
});

/**
 * GET /api/travels/leaderboard/gold-label
 * 获取 Gold Label 排行榜
 */
router.get('/leaderboard/gold-label', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;
        const leaderboard = await explorationFootprintService.getGoldLabelLeaderboard(limit);

        res.json({
            success: true,
            data: leaderboard,
        });
    } catch (error: any) {
        logger.error('[TravelAPI] Error getting gold label leaderboard:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
        });
    }
});

// ============ 🆕 V2.0 P2 救援系统 API ============


/**
 * GET /api/travels/rescue/public
 * 获取公共救援请求列表
 */
router.get('/rescue/public', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 20;
        const requests = await travelQueryServiceV1.getPublicRescueRequests(limit);

        res.json({
            success: true,
            data: requests,
        });
    } catch (error: any) {
        logger.error('[TravelAPI] Error getting public rescue requests:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
        });
    }
});

/**
 * GET /api/travels/rescue/friends/:frogId
 * 获取好友的待救援请求
 */
router.get('/rescue/friends/:frogId', async (req, res) => {
    try {
        const frogId = parseInt(req.params.frogId);

        if (isNaN(frogId)) {
            return res.status(400).json({ success: false, error: 'Invalid frog ID' });
        }

        const requests = await travelQueryServiceV1.getFriendRescueRequests(frogId);

        res.json({
            success: true,
            data: requests,
        });
    } catch (error: any) {
        logger.error('[TravelAPI] Error getting friend rescue requests:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
        });
    }
});

/**
 * POST /api/travels/rescue/:requestId
 * 执行救援
 */
router.post('/rescue/:requestId', async (req, res) => {
    try {
        const requestId = parseInt(req.params.requestId);
        const { rescuerId } = req.body;

        if (isNaN(requestId)) {
            return res.status(400).json({ success: false, error: 'Invalid request ID' });
        }

        if (!rescuerId) {
            return res.status(400).json({ success: false, error: 'rescuerId is required' });
        }

        logger.info(`[TravelAPI] Rescue request: requestId=${requestId}, rescuerId=${rescuerId}`);

        const result = await travelCommandServiceV1.performRescue({
            requestId,
            rescuerId,
        });

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.message,
            });
        }

        res.json({
            success: true,
            data: {
                xpEarned: result.xpEarned,
                reputationEarned: result.reputationEarned,
            },
            message: result.message,
        });
    } catch (error: any) {
        logger.error('[TravelAPI] Error performing rescue:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
        });
    }
});

export default router;
