// backend/src/workers/travelProcessor.ts

import { prisma } from '../database';
import { TravelStatus, FrogStatus } from '@prisma/client';
import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { observerService } from '../services/observer.service';
import { aiService } from '../services/ai.service';
import { ipfsService } from '../services/ipfs.service';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ZETAFROG_ABI, SOUVENIR_ABI } from '../config/contracts';
import { travelP0Service } from '../services/travel/travel-p0.service';
import { NFTImageOrchestratorService } from '../services/nft-image-orchestrator.service';
import { ChainKey } from '../config/chains';
import { explorationService } from '../services/travel/exploration.service';
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
     * 处理单个旅行
     */
    private async processSingleTravel(travel: any) {
        let { id: travelId, frog, targetWallet, startTime, endTime, chainId, isRandom } = travel;
        logger.info(`Processing travel ${travelId} for frog ${frog.tokenId} (chain: ${chainId}, item: ${isRandom ? 'Random' : 'Specific'})`);

        try {
            // 更新状态为处理中
            await prisma.travel.update({
                where: { id: travelId },
                data: { status: TravelStatus.Processing },
            });

            // 1. 如果是随机探索且地址为零地址，则现场发现一个“幸运地址”
            if (isRandom && (targetWallet.toLowerCase() === '0x0000000000000000000000000000000000000000')) {
                try {
                    const chainKeyMap: Record<number, ChainKey> = {
                        97: 'BSC_TESTNET',
                        11155111: 'ETH_SEPOLIA',
                        7001: 'ZETACHAIN_ATHENS',
                    };
                    const chainKey = chainKeyMap[chainId || 7001];
                    
                    logger.info(`Discovering lucky address for random travel ${travelId} on ${chainKey}...`);
                    const discoveredAddress = await explorationService.getRandomTargetAddress(chainKey);
                    
                    // 更新本地变量和数据库中的目标地址
                    targetWallet = discoveredAddress;
                    await prisma.travel.update({
                        where: { id: travelId },
                        data: { targetWallet: targetWallet.toLowerCase() },
                    });
                    logger.info(`Random exploration ${travelId} discovered address: ${targetWallet}`);
                } catch (discoveryError) {
                    logger.error(`Failed to discover address for random travel ${travelId}:`, discoveryError);
                    // 如果发现失败，保持零地址，后续观察可能会报错或返回空
                }
            }

            // 2. 观察钱包活动
            const observation = await observerService.observeWallet(
                targetWallet,
                startTime,
                endTime,
                chainId || 1
            );

            // 保存观察数据
            await prisma.walletObservation.create({
                data: {
                    travelId,
                    walletAddress: targetWallet,
                    chainId: chainId || 1,
                    transactions: observation.transactions as any,
                    totalTxCount: observation.totalTxCount,
                    totalValueWei: observation.totalValueWei.toString(),
                    notableEvents: observation.notableEvents as any,
                    observedFrom: startTime,
                    observedTo: endTime,
                },
            });

            // 生成 AI 故事
            const durationHours = Math.ceil(
                (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
            );

            const journal = await aiService.generateJournal(
                frog.name,
                observation,
                durationHours,
                isRandom
            );

            // 计算经验值: 10 XP 每小时 + 50 XP 每个特殊事件
            const xpGained = Math.max(10, (durationHours * 10) + (observation.notableEvents.length * 50));
            logger.info(`Frog ${frog.tokenId} gained ${xpGained} XP`);

            // 计算新等级
            const newXp = frog.xp + xpGained;
            const newLevel = Math.floor(newXp / 100) + 1;

            // 上传到 IPFS
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
                        const roll = Math.random() * 100;
                        if (roll < 70) finalRarity = 'Common';
                        else if (roll < 95) finalRarity = 'Uncommon';
                        else finalRarity = 'Rare';

                        const rarityRoll = finalRarity === 'Common' ? 50 : (finalRarity === 'Uncommon' ? 80 : 98);
                        
                        souvenirId = await this.mintSouvenir(frog.ownerAddress, frog.tokenId, rarityRoll);
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
                        where: { tokenId: souvenirId }
                    });
                    
                    if (existingSouvenir) {
                        dbSouvenirId = existingSouvenir.id;
                        logger.info(`Souvenir ${souvenirId} already exists in database with ID ${dbSouvenirId}`);
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

            // 更新数据库 - 旅行记录
            // 只有当dbSouvenirId有值时才设置souvenirId字段
            const updateData: any = {
                status: TravelStatus.Completed,
                journalHash,
                journalContent,
                observedTxCount: observation.totalTxCount,
                observedTotalValue: observation.totalValueWei.toString(),
                completedAt: new Date(),
            };
            
            if (dbSouvenirId !== null) {
                updateData.souvenirId = dbSouvenirId;
            }
            
            await prisma.travel.update({
                where: { id: travelId },
                data: updateData,
            });

            // 更新数据库 - 青蛙状态
            await prisma.frog.update({
                where: { id: frog.id },
                data: {
                    status: FrogStatus.Idle,
                    totalTravels: { increment: 1 },
                    xp: newXp,
                    level: newLevel,
                },
            });

            // 更新勋章系统统计
            const chainKeyMap: Record<number, ChainKey> = {
                97: 'BSC_TESTNET',
                11155111: 'ETH_SEPOLIA',
                7001: 'ZETACHAIN_ATHENS',
            };
            const chainKey = chainKeyMap[chainId || 1];
            if (chainKey) {
                await travelP0Service.updateFrogStats(
                    travelId,
                    chainKey,
                    [], // 链上旅行暂时没有 discoveries，除非后面集成观测
                    BigInt(0),
                    new Date()
                );
            }

            // 发送 WebSocket 通知
            if (this.io) {
                this.io.to(`frog:${frog.tokenId}`).emit('travel:completed', {
                    frogId: frog.tokenId,
                    travelId,
                    journalHash,
                    journal,
                    souvenirId,
                    xpGained,
                    newLevel,
                });
                logger.info(`WebSocket event sent for frog ${frog.tokenId}`);
            } else {
                logger.warn('WebSocket not available, event not sent');
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

    /**
     * 铸造纪念品 NFT
     */
    private async mintSouvenir(ownerAddress: string, frogId: number, rarityRoll: number): Promise<number> {
        if (!this.isInitialized || !config.SOUVENIR_NFT_ADDRESS) {
            return 0;
        }

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
}

export const travelProcessor = new TravelProcessor();