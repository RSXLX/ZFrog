// backend/src/workers/travelProcessor.ts

import { prisma } from '../database';
import { TravelStatus, FrogStatus, ChainType, TravelStage } from '@prisma/client';
import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { observerService } from '../services/observer.service';
import { aiService } from '../services/ai.service';
import { ipfsService } from '../services/ipfs.service';
import { explorationService } from '../services/travel/exploration.service';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ZETAFROG_ABI, SOUVENIR_ABI } from '../config/contracts';
import { ChainKey, CHAIN_ID_TO_KEY, getChainConfig } from '../config/chains';
import { travelP0Service } from '../services/travel/travel-p0.service';
import { NFTImageOrchestratorService } from '../services/nft-image-orchestrator.service';
import { badgeService } from '../services/badge/badge.service';
import { notifyTravelProgress, notifyFriendInteraction } from '../websocket';
// 🆕 V2.0 服务
import { addressAnalysisService } from '../services/travel/address-analysis.service';
import { affinityService } from '../services/friend/affinity.service';
import { chainMaterialService } from '../services/travel/chain-material.service';
import { rescueService } from '../services/travel/rescue.service';
import type { Server } from 'socket.io';

// 定义 ZetaChain Athens Testnet
const zetachainAthens = {
    id: 7001,
    name: 'ZetaChain Athens Testnet',
    nativeCurrency: {
        name: 'ZETA',
        symbol: 'ZETA',
        decimals: 18
    },
    rpcUrls: {
        default: { http: [config.ZETACHAIN_RPC_URL] },
    },
} as const;

// 根据旅行时长计算扫描间隔（已降低3倍频率）
function calculateScanInterval(startTime: Date, endTime: Date): number {
    const duration = endTime.getTime() - startTime.getTime();
    const durationMinutes = duration / (60 * 1000);
    
    if (durationMinutes <= 5) {
        return 9000;   // 5分钟内: 每9秒扫描
    } else if (durationMinutes <= 30) {
        return 30000;  // 30分钟内: 每30秒扫描
    } else if (durationMinutes <= 120) {
        return 90000;  // 2小时内: 每90秒扫描
    } else {
        return 180000; // 超长旅行: 每180秒扫描
    }
}

// 跟踪每个旅行的上次扫描时间
const lastScanTime = new Map<number, number>();

class TravelProcessor {
    private walletClient: any;
    private publicClient: any;
    private account: any;
    private isInitialized = false;
    private io: Server | null = null;
    private isProcessing = false;
    private orchestrator: NFTImageOrchestratorService;

    constructor() {
        this.orchestrator = new NFTImageOrchestratorService();
        this.initialize();
    }

    setIo(ioInstance: Server) {
        this.io = ioInstance;
    }

    private initialize() {
        if (!config.RELAYER_PRIVATE_KEY) {
            logger.warn('RELAYER_PRIVATE_KEY not configured, travel processor will run in mock mode');
            return;
        }

        try {
            let privateKey = config.RELAYER_PRIVATE_KEY;
            if (!privateKey.startsWith('0x')) {
                privateKey = `0x${privateKey}`;
            }

            this.account = privateKeyToAccount(privateKey as `0x${string}`);

            this.publicClient = createPublicClient({
                chain: zetachainAthens,
                transport: http(config.ZETACHAIN_RPC_URL),
            });

            this.walletClient = createWalletClient({
                account: this.account,
                chain: zetachainAthens,
                transport: http(config.ZETACHAIN_RPC_URL),
            });

            this.isInitialized = true;
            logger.info(`Travel processor initialized with account: ${this.account.address}`);

        } catch (error) {
            logger.error('Failed to initialize travel processor:', error);
        }
    }

    async start() {
        logger.info('Travel processor started');
        // Process completed travels every 30 seconds
        setInterval(() => this.processCompletedTravels(), 30 * 1000);
        // Active travel monitoring every 5 seconds (auto based on travel duration)
        setInterval(() => this.processActiveTravels(), 5 * 1000);
        // Immediate run to catch any pending completed travels
        this.processCompletedTravels();
    }


    // New: Monitor active travels for real-time visualization
    async processActiveTravels() {
        try {
             const activeTravels = await prisma.travel.findMany({
                where: { 
                    status: TravelStatus.Active,
                    endTime: { gt: new Date() } // Only currently running
                },
                include: { frog: true }
            });

            for (const travel of activeTravels) {
                // 动态扫描频率检查：根据旅行时长决定是否该扫描
                const now = Date.now();
                const interval = calculateScanInterval(travel.startTime, travel.endTime);
                const lastScan = lastScanTime.get(travel.id) || 0;
                
                if (now - lastScan < interval) {
                    continue; // 未到扫描时间，跳过
                }
                lastScanTime.set(travel.id, now);
                
                // 🆕 V2.0: 检查是否触发救援事件 (Stranded)
                try {
                    const isStranded = await rescueService.checkAndTriggerStranded(travel.id);
                    if (isStranded.isStranded) {
                        logger.info(`🚨 Travel ${travel.id} is now STRANDED! Stopping normal processing.`);
                        // 如果被困住，通知前端并跳过后续常规扫描
                        if (this.io) {
                            this.io.to(`frog:${travel.frog.tokenId}`).emit('travel:update', {
                                travelId: travel.id,
                                stage: 'STRANDED',
                                message: {
                                    text: '🆘 你的青蛙被困住了！请求救援！',
                                    type: 'WARNING'
                                }
                            });
                        }
                        continue;
                    }
                } catch (rescueError) {
                    logger.error(`Error checking stranded status for travel ${travel.id}:`, rescueError);
                }

                logger.debug(`🔄 Scanning travel ${travel.id} (interval: ${interval/1000}s)`);
                
                // Throttle updates: check last update time
                // We use addressDiscoveredAt as a proxy for "last major update" or just rely on random chance
                // Better: Check if we need to discover address
                
                // 1. Random Travel Address Discovery
                if (travel.isRandom && travel.targetWallet === '0x0000000000000000000000000000000000000000') {
                    logger.info(`🔍 Discovering lucky address for active travel ${travel.id}...`);
                    try {
                        const chainKey = CHAIN_ID_TO_KEY[travel.chainId] || 'ZETACHAIN_ATHENS';
                        const discoveredAddress = await explorationService.getRandomTargetAddress(chainKey);
                        
                        if (discoveredAddress && discoveredAddress !== '0x0000000000000000000000000000000000000000') {
                            await prisma.travel.update({
                                where: { id: travel.id },
                                data: { 
                                    targetWallet: discoveredAddress.toLowerCase(),
                                    addressDiscoveredAt: new Date(),
                                    originalTargetAddress: '0x0000000000000000000000000000000000000000'
                                },
                            });
                            
                            this.io?.to(`frog:${travel.frog.tokenId}`).emit('travel:update', {
                                travelId: travel.id,
                                stage: 'DISCOVERING',
                                message: {
                                    text: `✅ 发现目标地址：${discoveredAddress.slice(0, 6)}...${discoveredAddress.slice(-4)}`,
                                    type: 'DISCOVERY',
                                    address: discoveredAddress
                                }
                            });
                            
                            // Send a discovery message log
                            await this.sendStatusMessage(travel.id, travel.frog.tokenId, `Found active wallet ${discoveredAddress.slice(0,6)}...`, 'DISCOVERY');
                        }
                    } catch (e) {
                        logger.error(`Discovery failed for travel ${travel.id}`, e);
                    }
                    continue; // Skip monitoring in the same tick
                }

                // 2. Monitoring / Simulation (now controlled by dynamic interval above)
                const msgs = [
                    `Scanning block activity...`,
                    `Analyzing transaction history...`,
                    `Observing wallet interactions...`,
                    `Checking token transfers...`
                ];
                const msg = msgs[Math.floor(Math.random() * msgs.length)];
                await this.sendStatusMessage(travel.id, travel.frog.tokenId, msg, 'INFO');
                
                // Real RPC Scanning for Ambient Activity
                const chainKey = CHAIN_ID_TO_KEY[travel.chainId] || 'ZETACHAIN_ATHENS';

                // ============ FOOTPRINT SCANNING ============
                try {
                    const fromBlock = travel.exploredBlock || BigInt(0);
                    const footprintEvents = await explorationService.scanFootprints(chainKey, travel.frog.tokenId, fromBlock);
                    
                    let maxBlock = fromBlock;
                    for (const fp of footprintEvents) {
                         // Check deduplication
                         const existing = await prisma.travelFootprint.findFirst({
                              where: { txHash: fp.txHash }
                         });
                         if (existing) continue;

                         await prisma.travelFootprint.create({
                             data: {
                                 travelId: travel.id,
                                 frogId: travel.frog.tokenId,
                                 chainId: travel.chainId,
                                 chainType: chainKey,
                                 txHash: fp.txHash,
                                 walletAddress: fp.location,
                                 message: fp.observation,
                                 timestamp: fp.timestamp
                             }
                         });

                         // Add to Discovery Feed via TravelDiscovery
                         await prisma.travelDiscovery.create({
                             data: {
                                 travelId: travel.id,
                                 type: 'fun_fact', 
                                 title: '👣 留下了足迹',
                                 description: `在 ${fp.location.slice(0,6)}...${fp.location.slice(-4)} 留下了: "${fp.observation}"`,
                                 rarity: 5,
                                 chainType: chainKey,
                                 metadata: { txHash: fp.txHash, wallet: fp.location, message: fp.observation, isFootprint: true }
                             }
                         });
                         
                         this.io?.to(`frog:${travel.frog.tokenId}`).emit('travel:update', {
                             travelId: travel.id,
                             stage: 'EXPLORING',
                             message: { 
                                 text: `👣 留下了足迹: "${fp.observation}"`, 
                                 type: 'DISCOVERY',
                                 extra: { txHash: fp.txHash }
                             }
                         });

                         // Update max block
                         const fpBlock = BigInt(fp.blockNumber);
                         if (fpBlock > maxBlock) {
                             maxBlock = fpBlock;
                         }
                    }
                    
                    // Update progress
                    if (maxBlock > fromBlock) {
                        await prisma.travel.update({
                            where: { id: travel.id },
                            data: { exploredBlock: maxBlock }
                        });
                    }
                } catch (fpError) {
                    logger.warn(`Footprint scan failed for travel ${travel.id}: ${fpError}`);
                }

                const ambientDiscoveries = await explorationService.scanLatestBlock(chainKey);
                
                for (const d of ambientDiscoveries) {
                    const metadata = d.metadata || { method: 'rpc_scan', simulated: false };
                    const txHash = metadata.txHash || metadata.hash;
                    
                    // Deduplication check: Do not insert if this txHash already recorded for this travel
                    if (txHash) {
                        const exists = await prisma.travelDiscovery.findFirst({
                            where: {
                                travelId: travel.id,
                                metadata: {
                                    path: ['txHash'],
                                    equals: txHash
                                }
                            }
                        });
                        if (exists) continue;
                    }
                    
                    await prisma.travelDiscovery.create({
                        data: {
                            travelId: travel.id,
                            type: d.type,
                            title: d.title,
                            description: d.description,
                            rarity: d.rarity,
                            chainType: chainKey,
                            metadata: metadata
                        }
                    });
                    
                    this.io?.to(`frog:${travel.frog.tokenId}`).emit('travel:update', {
                        travelId: travel.id,
                        stage: 'EXPLORING',
                        message: { text: `🔭 ${d.title}: ${d.description}`, type: 'DISCOVERY' }
                    });
                }
            }
        } catch (error) {
            logger.error('Error in processActiveTravels:', error);
        }
    }

    async processCompletedTravels() {
        if (this.isProcessing) {
            logger.debug('Already processing travels, skipping...');
            return;
        }

        this.isProcessing = true;

        try {
            const pendingTravels = await prisma.travel.findMany({
                where: {
                    status: TravelStatus.Active,
                    endTime: {
                        lte: new Date(),
                    },
                },
                include: {
                    frog: true,
                    footprints: true,
                    groupTravel: {
                        include: {
                            companion: true,
                        }
                    },
                },
                orderBy: {
                    endTime: 'asc',
                },
                take: 5,
            });

            if (pendingTravels.length === 0) {
                this.isProcessing = false;
                return;
            }

            logger.info(`Processing ${pendingTravels.length} completed travels`);

            for (const travel of pendingTravels) {
                try {
                    await this.processSingleTravel(travel);
                } catch (error) {
                    logger.error(`Error processing travel ${travel.id}:`, error);
                }
            }

        } catch (error) {
            logger.error('Error in processCompletedTravels:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    public async processTravel(travel: any) {
        return this.processSingleTravel(travel);
    }

    private async processSingleTravel(travel: any) {
        const { id: travelId, frog, startTime, endTime, chainId, isRandom } = travel;
        let targetWallet = travel.targetWallet;
        
        if (travel.status === 'Completed' || travel.status === 'Failed') {
            logger.warn(`[TravelProcessor] Travel ${travelId} already processed (${travel.status}), skipping`);
            return;
        }
        
        logger.info(`Processing travel ${travelId} for frog ${frog.tokenId}`);
        logger.info(`Target chain: ${chainId}, isRandom: ${isRandom}`);

        try {
            const chainKeyMap: Record<number, ChainKey> = {
                97: 'BSC_TESTNET',
                11155111: 'ETH_SEPOLIA',
                7001: 'ZETACHAIN_ATHENS',
                80001: 'POLYGON_MUMBAI',
                421613: 'ARBITRUM_GOERLI',
            };
            const chainKey: ChainKey = chainKeyMap[chainId || 7001] || 'ZETACHAIN_ATHENS';
            
            await this.updateTravelStage(travelId, TravelStage.EXPLORING, 10);
            
            await prisma.travel.update({
                where: { id: travelId },
                data: { status: TravelStatus.Processing },
            });

            if (isRandom && (targetWallet.toLowerCase() === '0x0000000000000000000000000000000000000000')) {
                try {
                    logger.info(`🎲 Discovering lucky address for random travel ${travelId} on ${chainKey}...`);
                    if (this.io) {
                        this.io.to(`frog:${frog.tokenId}`).emit('travel:update', {
                            travelId,
                            stage: 'DISCOVERING',
                            message: {
                                text: '🎲 正在发现目标地址...',
                                type: 'DISCOVERY'
                            }
                        });
                    }
                    
                    const discoveredAddress = await explorationService.getRandomTargetAddress(chainKey);
                    
                    if (!discoveredAddress || discoveredAddress === '0x0000000000000000000000000000000000000000') {
                        throw new Error('Discovered address is invalid');
                    }
                    
                    targetWallet = discoveredAddress;
                    await prisma.travel.update({
                        where: { id: travelId },
                        data: { 
                            targetWallet: targetWallet.toLowerCase(),
                            addressDiscoveredAt: new Date(),
                            originalTargetAddress: '0x0000000000000000000000000000000000000000'
                        },
                    });
                    
                    logger.info(`✅ Random exploration ${travelId} discovered address: ${targetWallet}`);
                    
                    if (this.io) {
                        this.io.to(`frog:${frog.tokenId}`).emit('travel:update', {
                            travelId,
                            stage: 'DISCOVERING',
                            message: {
                                text: `✅ 发现目标地址：${targetWallet.slice(0, 6)}...${targetWallet.slice(-4)}`,
                                type: 'DISCOVERY',
                                address: targetWallet
                            }
                        });
                    }
                } catch (discoveryError) {
                    logger.error(`❌ Failed to discover address for random travel ${travelId}:`, discoveryError);
                    
                    if (this.io) {
                        this.io.to(`frog:${frog.tokenId}`).emit('travel:error', {
                            travelId,
                            error: '地址发现失败，使用备用地址'
                        });
                    }
                    
                    const fallbackChainKey: ChainKey = chainKeyMap[chainId || 7001] || 'ZETACHAIN_ATHENS';
                    const fallbackAddress = await explorationService.getFallbackAddress(fallbackChainKey);
                    targetWallet = fallbackAddress;
                    
                    await prisma.travel.update({
                        where: { id: travelId },
                        data: { 
                            targetWallet: targetWallet.toLowerCase(),
                            addressDiscoveredAt: new Date(),
                            originalTargetAddress: '0x0000000000000000000000000000000000000000'
                        },
                    });
                }
            }

            logger.info(`[TravelProcessor] Step 2: Starting wallet observation for travel ${travelId}`);
            
            notifyTravelProgress(frog.tokenId, {
                phase: 'observing',
                message: '🔍 正在观察目标钱包活动...',
                percentage: 20
            });
            
            const observation = await observerService.observeWallet(
                targetWallet,
                startTime,
                endTime,
                chainId || 1
            );
            
            await prisma.walletObservation.create({
                data: {
                    travelId,
                    walletAddress: targetWallet,
                    chainId: chainId || 7001,
                    chainType: chainKey as ChainType,
                    transactions: observation.transactions as any,
                    totalTxCount: observation.totalTxCount,
                    totalValueWei: observation.totalValueWei.toString(),
                    notableEvents: observation.notableEvents as any,
                    nativeBalance: observation.nativeBalance,
                    protocols: observation.protocols || [],
                    observedFrom: startTime,
                    observedTo: endTime,
                },
            });

            notifyTravelProgress(frog.tokenId, {
                phase: 'generating_story',
                message: '✍️ 正在生成旅行日记...',
                percentage: 40
            });
            
            const durationHours = Math.ceil(
                (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
            );
            
            const chainConfig = getChainConfig(chainId);
            
            logger.info(`[TravelProcessor] Step 3: Generating AI journal for ${frog.name}`);
            
            const journal = await aiService.generateJournal(
                frog.name,
                observation,
                durationHours,
                {
                  chainName: chainConfig.displayName,
                  chainScenery: chainConfig.scenery,
                  chainVibe: chainConfig.vibe,
                  isRandom: isRandom,
                  footprints: travel.footprints?.map((fp: any) => ({
                      message: fp.message,
                      location: fp.walletAddress
                  })) || []
                }
            );
            
            // 🆕 V2.0: 地址类型分析和探索加成
            let addressBonus = 1.0;
            let addressType = 'normal';
            try {
                const addressInfo = await addressAnalysisService.analyzeAddress(targetWallet, chainId || 7001);
                addressBonus = addressInfo.bonus;
                addressType = addressInfo.type;
                if (addressInfo.type !== 'normal') {
                    logger.info(`[V2.0] Address ${targetWallet} analyzed as ${addressInfo.type}, bonus: ${addressBonus}x`);
                }
            } catch (addressError) {
                logger.warn('[V2.0] Address analysis failed, using default bonus:', addressError);
            }
            
            // 应用地址加成到 XP 计算
            const baseXp = Math.max(10, (durationHours * 10) + (observation.notableEvents.length * 50));
            const xpGained = Math.floor(baseXp * addressBonus);
            logger.info(`Frog ${frog.tokenId} gained ${xpGained} XP (base: ${baseXp}, bonus: ${addressBonus}x, type: ${addressType})`);

            const newXp = frog.xp + xpGained;
            const newLevel = Math.floor(newXp / 100) + 1;

            notifyTravelProgress(frog.tokenId, {
                phase: 'uploading',
                message: '📤 正在上传日记到 IPFS...',
                percentage: 60
            });
            
            const journalHash = await ipfsService.uploadJournal(
                frog.name,
                frog.tokenId,
                journal,
                durationHours
            );

            let souvenirId = 0;
            let finalRarity: 'Common' | 'Uncommon' | 'Rare' = 'Common';
            const isLocalTravel = chainId === config.CHAIN_ID;

            if (this.isInitialized && config.TRAVEL_CONTRACT_ADDRESS) {
                 if (config.SOUVENIR_NFT_ADDRESS) {
                        notifyTravelProgress(frog.tokenId, {
                            phase: 'minting',
                            message: '🎁 正在铸造纪念品...',
                            percentage: 80
                        });
                        
                        const roll = Math.random() * 100;
                        if (roll < 70) finalRarity = 'Common';
                        else if (roll < 95) finalRarity = 'Uncommon';
                        else finalRarity = 'Rare';

                        souvenirId = await this.mintSouvenir(frog.ownerAddress, frog.tokenId, chainKey);
                        logger.info(`Minted ${finalRarity} souvenir ${souvenirId} for frog ${frog.tokenId}`);
                    }

                    if (isLocalTravel) {
                         try {
                                await this.completeOnChain(frog.tokenId, journalHash, souvenirId);
                         } catch (error) {
                                logger.error('On-chain completion failed, ABORTING DB UPDATE:', error);
                                throw error;
                         }
                    } else {
                        logger.info(`Cross-chain travel ${travelId} (Chain ${chainId}): Skipping local completion calls. Waiting for listener/relayer.`);
                    }
            } else {
                const roll = Math.random() * 100;
                if (roll < 70) finalRarity = 'Common';
                else if (roll < 95) finalRarity = 'Uncommon';
                else finalRarity = 'Rare';
            }

            logger.info(`[DEBUG] 准备更新旅行记录 ${travelId}, journalHash: ${journalHash}`);

            let dbSouvenirId: number | null = null;
            if (souvenirId && souvenirId > 0) {
                try {
                    // 🆕 V2.0: 获取链专属材料类型
                    const materialType = chainMaterialService.getSouvenirMaterialType(chainKey);
                    
                    const dbSouvenir = await prisma.souvenir.upsert({
                        where: { 
                            tokenId_chainType: {
                                tokenId: souvenirId,
                                chainType: chainKey as ChainType
                            }
                        },
                        update: {},
                        create: {
                            tokenId: souvenirId,
                            frogId: frog.id,
                            name: this.getSouvenirName(finalRarity),
                            rarity: finalRarity as any,
                            chainType: chainKey as ChainType,
                            mintedAt: new Date(),
                            materialType, // 🆕 V2.0: 链专属材料
                        },
                    });
                    dbSouvenirId = dbSouvenir.id;
                    logger.info(`[V2.0] Souvenir ${souvenirId} created with materialType: ${materialType}`);

                    const souvenirType = this.mapSouvenirTypeToPromptKey(finalRarity);
                    this.orchestrator.generateSouvenirImage({
                        odosId: frog.tokenId.toString(),
                        travelId: travelId.toString(),
                        souvenirId: souvenirId.toString(),
                        souvenirType,
                        rarity: finalRarity.toUpperCase(),
                        chainId: chainId || 1
                    }).catch(err => {
                        logger.error(`Auto image generation failed for souvenir ${souvenirId}:`, err);
                    });
                } catch (error) {
                    logger.error(`Failed to save souvenir ${souvenirId} to database:`, error);
                }
            }

            await this.updateTravelStage(travelId, TravelStage.RETURNING, 80);

            await prisma.travel.update({
                where: { id: travelId },
                data: {
                  status: TravelStatus.Completed,
                  currentStage: TravelStage.RETURNING,
                  progress: 100,
                  journalHash,
                  journalContent: JSON.stringify(journal),
                  observedTxCount: observation.totalTxCount,
                  observedTotalValue: observation.totalValueWei.toString(),
                  completedAt: new Date(),
                  souvenirId: dbSouvenirId || undefined,
                },
            });
            
            logger.info(`[TravelProcessor] Updating frog ${frog.tokenId}: status=Idle, xp=${newXp}, level=${newLevel}`);
            
            await prisma.frog.update({
                where: { id: frog.id },
                data: {
                    status: FrogStatus.Idle,
                    xp: newXp,
                    level: newLevel,
                },
            });

            if (travel.groupTravel) {
                if (travel.groupTravel.companion) {
                    const companionFrog = travel.groupTravel.companion;
                    let companionNewXp = (companionFrog?.xp || 0) + xpGained;
                    let companionNewLevel = Math.floor(companionNewXp / 100) + 1;
                    
                    await prisma.frog.update({
                        where: { id: travel.groupTravel.companionId },
                        data: { 
                            status: FrogStatus.Idle,
                            xp: companionNewXp,
                            level: companionNewLevel,
                            totalTravels: { increment: 1 },
                        },
                    });
                }
                
                await prisma.groupTravel.update({
                    where: { id: travel.groupTravel.id },
                    data: { status: 'COMPLETED' },
                });
                
                // === 创建旅行完成互动记录并通知好友 ===
                try {
                    const friendship = await prisma.friendship.findFirst({
                        where: {
                            OR: [
                                { requesterId: frog.id, addresseeId: travel.groupTravel.companionId },
                                { requesterId: travel.groupTravel.companionId, addresseeId: frog.id }
                            ],
                            status: 'Accepted'
                        }
                    });
                    
                    if (friendship) {
                        // 🆕 V2.0: 更新友情值
                        try {
                            const affinityResult = await affinityService.incrementAffinityByTravel(frog.id, travel.groupTravel.companionId);
                            logger.info(`[V2.0] Affinity updated for friendship ${friendship.id}: level=${affinityResult.newLevel}, leveledUp=${affinityResult.leveledUp}`);
                        } catch (affinityError) {
                            logger.warn('[V2.0] Failed to update affinity:', affinityError);
                        }
                        
                        const companionName = travel.groupTravel.companion?.name || '好友';
                        const interaction = await prisma.friendInteraction.create({
                            data: {
                                friendshipId: friendship.id,
                                actorId: frog.id,
                                type: 'Travel',
                                message: `${frog.name} 和 ${companionName} 完成了前往 ${chainConfig.displayName} 的冒险！`,
                                metadata: {
                                    travelId,
                                    chainId,
                                    chainName: chainConfig.displayName,
                                    completedAt: new Date().toISOString(),
                                    journalHash,
                                    souvenirId: dbSouvenirId || null
                                }
                            }
                        });
                        
                        // 通知好友旅行完成
                        notifyFriendInteraction(
                            friendship.id,
                            frog.id,
                            travel.groupTravel.companionId,
                            interaction
                        );
                        
                        logger.info(`[GroupTravel] Created completion interaction and notified companion for travel ${travelId}`);
                    }
                } catch (interactionError) {
                    logger.warn(`[GroupTravel] Failed to create completion interaction:`, interactionError);
                }
                
                if (chainKey) {
                    try {
                        await travelP0Service.updateFrogStats(
                            travelId,
                            chainKey,
                            [], 
                            BigInt(0),
                            new Date()
                        );
                        await badgeService.checkAndUnlock(travel.groupTravel.companionId, {
                            chain: chainKey,
                            travelId,
                            discoveries: [],
                        });
                    } catch (companionError) {
                        logger.warn(`[GroupTravel] Failed to update companion stats:`, companionError);
                    }
                }
                
                if (this.io && travel.groupTravel.companion) {
                    this.io.to(`frog:${travel.groupTravel.companion.tokenId}`).emit('travel:completed', {
                        frogId: travel.groupTravel.companion.tokenId,
                        travelId,
                        isGroupTravel: true,
                        leaderFrog: frog.name,
                        journalHash,
                        souvenirId,
                    });
                }
            }

            if (chainKey) {
                await travelP0Service.updateFrogStats(
                    travelId,
                    chainKey,
                    [], 
                    BigInt(0),
                    new Date()
                );

                const discoveries = observation?.notableEvents?.map((event: any, index: number) => ({
                    id: index,
                    travelId,
                    type: 'tx_action' as const,
                    title: event.type || 'Transaction',
                    description: event.description || `Discovered on ${chainKey}`,
                    content: event.description || event.type,
                    rarity: event.value && BigInt(event.value) > BigInt('1000000000000000000') ? 2 : 1, 
                    timestamp: new Date(),
                    metadata: { txHash: event.txHash, value: event.value }
                })) || [];
                
                await badgeService.checkAndUnlock(frog.id, {
                    chain: chainKey,
                    travelId,
                    discoveries,
                });
            }

            if (this.io) {
                this.io.to(`frog:${frog.tokenId}`).emit('travel:completed', {
                  frogId: frog.tokenId,
                  travelId,
                  journalHash,
                  souvenirId,
                  chainId,
                  chainName: chainConfig.displayName,
                  discoveredAddress: isRandom ? targetWallet : null,
                });
            }

            logger.info(`Travel ${travelId} completed successfully`);

        } catch (error) {
            logger.error(`Failed to process travel ${travelId}:`, error);

            await prisma.travel.update({
                where: { id: travelId },
                data: { status: TravelStatus.Failed },
            });

            await prisma.frog.update({
                where: { id: travel.frog.id },
                data: { status: FrogStatus.Idle },
            });
        }
    }

    private async mintSouvenir(ownerAddress: string, frogId: number, chainKey: string): Promise<number> {
        if (!this.isInitialized || !config.SOUVENIR_NFT_ADDRESS) return 0;
        const rarityRoll = Math.floor(Math.random() * 100);
        try {
            const { request } = await this.publicClient.simulateContract({
                address: config.SOUVENIR_NFT_ADDRESS as `0x${string}`,
                abi: SOUVENIR_ABI,
                functionName: 'mintSouvenir',
                args: [ownerAddress as `0x${string}`, BigInt(frogId), BigInt(rarityRoll)],
                account: this.account,
            });
            const hash = await this.walletClient.writeContract(request);
            const receipt = await this.publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
            if (receipt.status !== 'success') throw new Error('Souvenir minting transaction failed');
            const totalSupply = await this.publicClient.readContract({
                address: config.SOUVENIR_NFT_ADDRESS as `0x${string}`,
                abi: SOUVENIR_ABI,
                functionName: 'totalSupply',
            });
            return Number(totalSupply) - 1;
        } catch (error) {
            logger.error('Failed to mint souvenir:', error);
            return 0;
        }
    }

    private async completeOnChain(frogId: number, journalHash: string, souvenirId: number) {
        if (!this.isInitialized || !config.TRAVEL_CONTRACT_ADDRESS) return;
        try {
            const { request } = await this.publicClient.simulateContract({
                address: config.TRAVEL_CONTRACT_ADDRESS as `0x${string}`,
                abi: ZETAFROG_ABI,
                functionName: 'completeTravel',
                args: [BigInt(frogId), journalHash, BigInt(souvenirId), true], // Corrected args
                account: this.account,
            });
            const hash = await this.walletClient.writeContract(request);
            logger.info(`Completing travel on-chain, tx: ${hash}`);
            const receipt = await this.publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
            if (receipt.status !== 'success') throw new Error('Complete travel transaction failed');
            logger.info(`Travel completed on-chain: ${hash}`);
            return receipt;
        } catch (error) {
            logger.error('Failed to complete travel on-chain:', error);
            throw error;
        }
    }

    // Removed addExperienceOnChain as it is handled internally by Travel contract

    private calculateRarity(): 'Common' | 'Uncommon' | 'Rare' {
        const roll = Math.random() * 100;
        if (roll < 70) return 'Common';
        if (roll < 95) return 'Uncommon';
        return 'Rare';
    }

    private mapSouvenirTypeToPromptKey(rarity: string): string {
        const mapping: Record<string, string> = {
            'Common': 'ETHEREUM_POSTCARD',
            'Uncommon': 'GAS_FEE_RECEIPT',
            'Rare': 'BLOCKCHAIN_SNOWGLOBE',
        };
        return mapping[rarity] || 'ETHEREUM_POSTCARD';
    }

    private getSouvenirName(rarity: string): string {
        const names: Record<string, string> = {
            'Common': 'Ethereum Postcard',
            'Uncommon': 'Gas Fee Receipt',
            'Rare': 'Blockchain Snowglobe',
        };
        return names[rarity] || 'Mysterious Souvenir';
    }

    private async updateTravelStage(travelId: number, stage: TravelStage, progress: number) {
        await prisma.travel.update({
            where: { id: travelId },
            data: { currentStage: stage, progress },
        });
    }

    private async sendStatusMessage(
        travelId: number,
        frogTokenId: number,
        message: string,
        type: 'INFO' | 'DISCOVERY' | 'JOKE' | 'WARNING' | 'ERROR'
    ) {
        await prisma.travelStatusMessage.create({
            data: { travelId, message, messageType: type as any },
        });

        if (this.io) {
            this.io.to(`frog:${frogTokenId}`).emit('travel:message', {
                travelId,
                message,
                type,
            });
        }
    }
}

export const travelProcessor = new TravelProcessor();