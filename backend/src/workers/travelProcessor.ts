// backend/src/workers/travelProcessor.ts

import { prisma } from '../database';
import { TravelStatus, FrogStatus, ChainType, TravelStage } from '@prisma/client';
import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { observerService } from '../services/observer.service';
import { aiService } from '../services/ai.service';
import { ipfsService } from '../services/ipfs.service';
import { explorationService } from '../services/travel/exploration.service';  // 导入
import { config } from '../config';
import { logger } from '../utils/logger';
import { ZETAFROG_ABI, SOUVENIR_ABI } from '../config/contracts';
import { ChainKey, CHAIN_ID_TO_KEY, getChainConfig } from '../config/chains';  // 导入
import { travelP0Service } from '../services/travel/travel-p0.service';
import { NFTImageOrchestratorService } from '../services/nft-image-orchestrator.service';
import { badgeService } from '../services/badge/badge.service';
import { notifyTravelProgress } from '../websocket';
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

    /**
     * 主处理循环
     */
    async start() {
        logger.info('Travel processor started');

        // 每 30 秒检查一次
        setInterval(() => this.processCompletedTravels(), 30 * 1000);

        // 立即执行一次
        this.processCompletedTravels();
    }

    /**
     * 处理已完成的旅行
     */
    async processCompletedTravels() {
        // 防止并发处理
        if (this.isProcessing) {
            logger.debug('Already processing travels, skipping...');
            return;
        }

        this.isProcessing = true;

        try {
            // 查找到期但未处理的旅行
            const pendingTravels = await prisma.travel.findMany({
                where: {
                    status: TravelStatus.Active,
                    endTime: {
                        lte: new Date(),
                    },
                },
                include: {
                    frog: true,
                },
                orderBy: {
                    endTime: 'asc',
                },
                take: 5, // 每次最多处理 5 个
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
                    // 继续处理其他旅行
                }
            }

        } catch (error) {
            logger.error('Error in processCompletedTravels:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * 公共方法：处理单个旅行
     */
    public async processTravel(travel: any) {
        return this.processSingleTravel(travel);
    }

    /**
     * 处理单个旅行
     */
    private async processSingleTravel(travel: any) {
        const { id: travelId, frog, startTime, endTime, chainId, isRandom } = travel;
        let targetWallet = travel.targetWallet;
        
        logger.info(`Processing travel ${travelId} for frog ${frog.tokenId}`);
        logger.info(`Target chain: ${chainId}, isRandom: ${isRandom}`);

        try {
            // 确定目标链
            const chainKeyMap: Record<number, ChainKey> = {
                97: 'BSC_TESTNET',
                11155111: 'ETH_SEPOLIA',
                7001: 'ZETACHAIN_ATHENS',
                80001: 'POLYGON_MUMBAI',
                421613: 'ARBITRUM_GOERLI',
            };
            const chainKey: ChainKey = chainKeyMap[chainId || 7001] || 'ZETACHAIN_ATHENS';
            
            // 更新状态为处理中
            await this.updateTravelStage(travelId, TravelStage.EXPLORING, 10);
            
            await prisma.travel.update({
                where: { id: travelId },
                data: { status: TravelStatus.Processing },
            });

            // 1. 如果是随机探索且地址为零地址，则现场发现一个“幸运地址”
            if (isRandom && (targetWallet.toLowerCase() === '0x0000000000000000000000000000000000000000')) {
                try {
                    
                    logger.info(`🎲 Discovering lucky address for random travel ${travelId} on ${chainKey}...`);
                    
                    // 发送发现开始通知
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
                    
                    // 更新本地变量和数据库中的目标地址
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
                    
                    // 发送发现完成通知
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
                    
                    // 发送发现失败通知
                    if (this.io) {
                        this.io.to(`frog:${frog.tokenId}`).emit('travel:error', {
                            travelId,
                            error: '地址发现失败，使用备用地址'
                        });
                    }
                    
                    // 使用备用地址
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
                    
                    logger.info(`⚠️ Using fallback address for random travel ${travelId}: ${targetWallet}`);
                }
            }

            // 2. 观察钱包活动
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

            // 保存观察数据（包含链类型）
            await prisma.walletObservation.create({
                data: {
                    travelId,
                    walletAddress: targetWallet,
                    chainId: chainId || 7001,
                    chainType: chainKey as ChainType,  // 新增
                    transactions: observation.transactions as any,
                    totalTxCount: observation.totalTxCount,
                    totalValueWei: observation.totalValueWei.toString(),
                    notableEvents: observation.notableEvents as any,
                    nativeBalance: observation.nativeBalance,  // 新增
                    protocols: observation.protocols || [],     // 新增
                    observedFrom: startTime,
                    observedTo: endTime,
                },
            });

            // 生成 AI 故事（包含链信息）
            notifyTravelProgress(frog.tokenId, {
                phase: 'generating_story',
                message: '✍️ 正在生成旅行日记...',
                percentage: 40
            });
            
            const durationHours = Math.ceil(
                (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
            );
            
            const chainConfig = getChainConfig(chainId);
            
            const journal = await aiService.generateJournal(
                frog.name,
                observation,
                durationHours,
                {
                  chainName: chainConfig.displayName,
                  chainScenery: chainConfig.scenery,
                  chainVibe: chainConfig.vibe,
                  isRandom: isRandom,
                }
            );

            // 计算经验值: 10 XP 每小时 + 50 XP 每个特殊事件
            const xpGained = Math.max(10, (durationHours * 10) + (observation.notableEvents.length * 50));
            logger.info(`Frog ${frog.tokenId} gained ${xpGained} XP`);

            // 计算新等级
            const newXp = frog.xp + xpGained;
            const newLevel = Math.floor(newXp / 100) + 1;

            // 上传到 IPFS
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

            // 如果配置了合约，则在链上完成旅行
            let souvenirId = 0;
            let finalRarity: 'Common' | 'Uncommon' | 'Rare' = 'Common';

            if (this.isInitialized && config.ZETAFROG_NFT_ADDRESS) {
                try {
                    // 1. 先铸造纪念品
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

                        const rarityRoll = finalRarity === 'Common' ? 50 : (finalRarity === 'Uncommon' ? 80 : 98);
                        
                        souvenirId = await this.mintSouvenir(frog.ownerAddress, frog.tokenId, chainKey);
                        logger.info(`Minted ${finalRarity} souvenir ${souvenirId} for frog ${frog.tokenId}`);
                    }

                    // 2. 在链上完成旅行
                    await this.completeOnChain(frog.tokenId, journalHash, souvenirId);

                    // 3. 添加经验值
                    await this.addExperienceOnChain(frog.tokenId, xpGained);

                } catch (error) {
                    logger.error('On-chain completion failed:', error);
                    // 继续更新数据库，即使链上操作失败
                }
            } else {
                // 如果没有合约配置，模拟计算一个稀有度用于数据库
                const roll = Math.random() * 100;
                if (roll < 70) finalRarity = 'Common';
                else if (roll < 95) finalRarity = 'Uncommon';
                else finalRarity = 'Rare';
            }

            // 调试日志：检查即将保存的数据
            logger.info(`[DEBUG] 准备更新旅行记录 ${travelId}:`);
            logger.info(`[DEBUG] journalHash: ${journalHash}`);
            logger.info(`[DEBUG] journal type: ${typeof journal}, is null: ${journal === null}, is undefined: ${journal === undefined}`);
            if (journal) {
                logger.info(`[DEBUG] journal content preview: ${JSON.stringify(journal).substring(0, 100)}...`);
            }
            logger.info(`[DEBUG] observation.totalTxCount: ${observation.totalTxCount}`);
            logger.info(`[DEBUG] observation.totalValueWei: ${observation.totalValueWei}`);

            // 确保 journal 不为空
            let journalContent = null;
            if (journal && typeof journal === 'object') {
                try {
                    journalContent = JSON.stringify(journal);
                } catch (error) {
                    logger.error('Failed to serialize journal:', error);
                    journalContent = JSON.stringify({
                        title: `${frog.name}的旅行日记`,
                        content: '呱！这次旅行真有趣！',
                        mood: 'happy',
                        highlights: []
                    });
                }
            } else {
                logger.warn(`Journal is not an object: ${typeof journal}, value: ${journal}`);
                journalContent = journal ? String(journal) : null;
            }

            // 如果铸造了纪念品，先保存到数据库以获取自增 ID
            let dbSouvenirId: number | null = null;
            if (souvenirId && souvenirId > 0) {
                try {
                    // 先检查是否已存在相同tokenId的纪念品
                    const existingSouvenir = await prisma.souvenir.findUnique({
                        where: { 
                            tokenId_chainType: {
                                tokenId: souvenirId,
                                chainType: chainKey as ChainType
                            }
                        }
                    });
                    
                    if (existingSouvenir) {
                        dbSouvenirId = existingSouvenir.id;
                        logger.info(`Souvenir ${souvenirId} on chain ${chainKey} already exists in database with ID ${dbSouvenirId}`);
                    } else {
                        const dbSouvenir = await prisma.souvenir.create({
                            data: {
                                tokenId: souvenirId,
                                frogId: frog.id,
                                name: this.getSouvenirName(finalRarity),
                                rarity: finalRarity as any,
                                mintedAt: new Date(),
                            },
                        });
                        dbSouvenirId = dbSouvenir.id;
                        logger.info(`Saved souvenir ${souvenirId} to database with ID ${dbSouvenirId}`);
                    }

                    // --- 触发自动生图 ---
                    // 这里我们采用异步方式，不阻塞主流程
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
                    // ------------------
                } catch (error) {
                    logger.error(`Failed to save souvenir ${souvenirId} to database:`, error);
                    // 继续更新旅行记录，即使纪念品保存失败
                }
            }

            await this.updateTravelStage(travelId, TravelStage.RETURNING, 80);

            // 更新数据库
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

            // 更新数据库 - 青蛙状态
            // 注意：totalTravels 由 eventListener 在监听到 TravelCompleted 事件时统一更新
            await prisma.frog.update({
                where: { id: frog.id },
                data: {
                    status: FrogStatus.Idle,
                    xp: newXp,
                    level: newLevel,
                },
            });

            // 更新勋章系统统计
            // 使用函数开头已定义的 chainKey
            if (chainKey) {
                await travelP0Service.updateFrogStats(
                    travelId,
                    chainKey,
                    [], // 链上旅行暂时没有 discoveries，除非后面集成观测
                    BigInt(0),
                    new Date()
                );

                // 检查并解锁徽章
                // 暂时使用空 discoveries，因为 TravelProcessor 中 observation 结构与 Discovery[] 不完全一致
                // 如果需要基于 observation 解锁 RARE_FIND，需要转换 observation.notableEvents
                const discoveries: any[] = []; // TODO: Convert observation to discoveries if needed
                
                await badgeService.checkAndUnlock(frog.id, {
                    chain: chainKey,
                    travelId,
                    discoveries,
                });
            }

            // WebSocket 通知
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

            // 恢复青蛙状态
            await prisma.frog.update({
                where: { id: travel.frog.id },
                data: { status: FrogStatus.Idle },
            });
        }
    }

    // 修改：支持链类型
    private async mintSouvenir(ownerAddress: string, frogId: number, chainKey: string): Promise<number> {
        if (!this.isInitialized || !config.SOUVENIR_NFT_ADDRESS) return 0;

        const rarityRoll = Math.floor(Math.random() * 100);

        try {
            // 使用传入的 rarityRoll

            const { request } = await this.publicClient.simulateContract({
                address: config.SOUVENIR_NFT_ADDRESS as `0x${string}`,
                abi: SOUVENIR_ABI,
                functionName: 'mintSouvenir',
                args: [ownerAddress as `0x${string}`, BigInt(frogId), BigInt(rarityRoll)],
                account: this.account,
            });

            const hash = await this.walletClient.writeContract(request);
            logger.info(`Minting souvenir, tx: ${hash}`);

            const receipt = await this.publicClient.waitForTransactionReceipt({ 
                hash,
                timeout: 60_000, // 60 秒超时
            });

            if (receipt.status !== 'success') {
                throw new Error('Souvenir minting transaction failed');
            }

            // 获取最新的 tokenId
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

    /**
     * 在链上完成旅行
     */
    private async completeOnChain(
        frogId: number,
        journalHash: string,
        souvenirId: number
    ) {
        if (!this.isInitialized || !config.ZETAFROG_NFT_ADDRESS) {
            return;
        }

        try {
            const { request } = await this.publicClient.simulateContract({
                address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
                abi: ZETAFROG_ABI,
                functionName: 'completeTravel',
                args: [BigInt(frogId), journalHash, BigInt(souvenirId)],
                account: this.account,
            });

            const hash = await this.walletClient.writeContract(request);
            logger.info(`Completing travel on-chain, tx: ${hash}`);

            const receipt = await this.publicClient.waitForTransactionReceipt({ 
                hash,
                timeout: 60_000,
            });

            if (receipt.status !== 'success') {
                throw new Error('Complete travel transaction failed');
            }

            logger.info(`Travel completed on-chain: ${hash}`);
            return receipt;

        } catch (error) {
            logger.error('Failed to complete travel on-chain:', error);
            throw error;
        }
    }

    /**
     * 在链上添加经验值
     */
    private async addExperienceOnChain(frogId: number, xpAmount: number) {
        if (!this.isInitialized || !config.ZETAFROG_NFT_ADDRESS) {
            return;
        }

        try {
            const { request } = await this.publicClient.simulateContract({
                address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
                abi: ZETAFROG_ABI,
                functionName: 'addExperience',
                args: [BigInt(frogId), BigInt(xpAmount)],
                account: this.account,
            });

            const hash = await this.walletClient.writeContract(request);
            logger.info(`Adding XP on-chain, tx: ${hash}`);

            await this.publicClient.waitForTransactionReceipt({ 
                hash,
                timeout: 60_000,
            });

            logger.info(`Added ${xpAmount} XP to frog ${frogId} on-chain: ${hash}`);

        } catch (error) {
            logger.error('Failed to add experience on-chain:', error);
            // 不抛出错误，因为这不是关键操作
        }
    }

    /**
     * 计算纪念品稀有度
     */
    private calculateRarity(): 'Common' | 'Uncommon' | 'Rare' {
        const roll = Math.random() * 100;
        if (roll < 70) return 'Common';
        if (roll < 95) return 'Uncommon';
        return 'Rare';
    }

    /**
     * 获取纪念品名称对应的 Prompt 模版 Key
     */
    private mapSouvenirTypeToPromptKey(rarity: string): string {
        const mapping: Record<string, string> = {
            'Common': 'ETHEREUM_POSTCARD',
            'Uncommon': 'GAS_FEE_RECEIPT',
            'Rare': 'BLOCKCHAIN_SNOWGLOBE',
        };
        return mapping[rarity] || 'ETHEREUM_POSTCARD';
    }

    /**
     * 获取纪念品名称
     */
    private getSouvenirName(rarity: string): string {
        const names: Record<string, string> = {
            'Common': 'Ethereum Postcard',
            'Uncommon': 'Gas Fee Receipt',
            'Rare': 'Blockchain Snowglobe',
        };
        return names[rarity] || 'Mysterious Souvenir';
    }

    // 新增：更新旅行阶段
    private async updateTravelStage(travelId: number, stage: TravelStage, progress: number) {
        await prisma.travel.update({
            where: { id: travelId },
            data: { currentStage: stage, progress },
        });
    }

    // 新增：发送状态消息
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