import { PrismaClient, TravelStatus, FrogStatus } from '@prisma/client';
import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { observerService } from '../services/observer.service';
import { aiService } from '../services/ai.service';
import { ipfsService } from '../services/ipfs.service';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ZETAFROG_ABI, SOUVENIR_ABI } from '../config/contracts';
import type { Server } from 'socket.io';

// 定义 ZetaChain Athens Testnet
const zetachainAthens = {
    id: 7001,
    name: 'ZetaChain Athens Testnet',
    nativeCurrency: { name: 'ZETA', symbol: 'ZETA', decimals: 18 },
    rpcUrls: {
        default: { http: [config.ZETACHAIN_RPC_URL] },
    },
} as const;

const prisma = new PrismaClient();

class TravelProcessor {
    private walletClient: any;
    private publicClient: any;
    private account: any;
    private isInitialized = false;
    private io: Server | null = null;
    
    constructor() {
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
                take: 10,
            });
            
            if (pendingTravels.length === 0) {
                return;
            }
            
            logger.info(`Processing ${pendingTravels.length} completed travels`);
            
            for (const travel of pendingTravels) {
                await this.processSingleTravel(travel);
            }
            
        } catch (error) {
            logger.error('Error in processCompletedTravels:', error);
        }
    }
    
    /**
     * 处理单个旅行
     */
    private async processSingleTravel(travel: any) {
        const { id: travelId, frog, targetWallet, startTime, endTime } = travel;
        
        logger.info(`Processing travel ${travelId} for frog ${frog.tokenId}`);
        
        try {
            // 更新状态为处理中
            await prisma.travel.update({
                where: { id: travelId },
                data: { status: TravelStatus.Processing },
            });
            
            // 观察钱包活动
            const observation = await observerService.observeWallet(
                targetWallet,
                startTime,
                endTime,
                (travel as any).chainId || 1
            );
            
            // 保存观察数据
            await prisma.walletObservation.create({
                data: {
                    travelId,
                    walletAddress: targetWallet,
                    chainId: 1,
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
                durationHours
            );
            
            // Calculate XP: 10 XP per hour + 50 XP per notable event
            const xpGained = (durationHours * 10) + (observation.notableEvents.length * 50);
            logger.info(`Frog ${frog.tokenId} gained ${xpGained} XP`);
            
            // 上传到 IPFS
            const journalHash = await ipfsService.uploadJournal(
                frog.name,
                frog.tokenId,
                journal,
                durationHours
            );
            
            // 如果配置了合约，则在链上完成旅行
            let souvenirId = 0;
            if (this.isInitialized && config.ZETAFROG_NFT_ADDRESS) {
                try {
                    souvenirId = await this.mintSouvenir(frog.ownerAddress, frog.tokenId);
                    await this.completeOnChain(frog.tokenId, journalHash, souvenirId);
                    await this.addExperienceOnChain(frog.tokenId, xpGained);
                } catch (error) {
                    logger.error('On-chain completion failed:', error);
                }
            }
            
            // 更新数据库
            await prisma.travel.update({
                where: { id: travelId },
                data: {
                    status: TravelStatus.Completed,
                    journalHash,
                    journalContent: JSON.stringify(journal),
                    observedTxCount: observation.totalTxCount,
                    observedTotalValue: observation.totalValueWei.toString(),
                    completedAt: new Date(),
                },
            });
            
            // 更新青蛙状态
            await prisma.frog.update({
                where: { id: frog.id },
                data: {
                    status: FrogStatus.Idle,
                    totalTravels: { increment: 1 },
                    xp: { increment: xpGained },
                    // Level update is handled by on-chain event or separate sync, 
                    // but we can estimate it here or sync later. 
                    // For now simple local update:
                    level: { set: Math.floor((frog.xp + xpGained) / 100) + 1 }
                },
            });
            
            if (this.io) {
                this.io.to(`frog:${frog.tokenId}`).emit('travel:completed', {
                    frogId: frog.tokenId,
                    travelId,
                    journalHash,
                    souvenirId,
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
        }
    }
    
    /**
     * 铸造纪念品 NFT
     */
    private async mintSouvenir(ownerAddress: string, frogId: number): Promise<number> {
        if (!this.isInitialized || !config.SOUVENIR_NFT_ADDRESS) {
            return 0;
        }
        
        const rarityRoll = Math.floor(Math.random() * 100);
        
        const { request } = await this.publicClient.simulateContract({
            address: config.SOUVENIR_NFT_ADDRESS as `0x${string}`,
            abi: SOUVENIR_ABI,
            functionName: 'mintSouvenir',
            args: [ownerAddress, BigInt(frogId), BigInt(rarityRoll)],
            account: this.account,
        });
        
        const hash = await this.walletClient.writeContract(request);
        await this.publicClient.waitForTransactionReceipt({ hash });
        
        const totalSupply = await this.publicClient.readContract({
            address: config.SOUVENIR_NFT_ADDRESS as `0x${string}`,
            abi: SOUVENIR_ABI,
            functionName: 'totalSupply',
        });
        
        return Number(totalSupply) - 1;
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
        
        const { request } = await this.publicClient.simulateContract({
            address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
            abi: ZETAFROG_ABI,
            functionName: 'completeTravel',
            args: [BigInt(frogId), journalHash, BigInt(souvenirId)],
            account: this.account,
        });
        
        const hash = await this.walletClient.writeContract(request);
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
        
        logger.info(`Travel completed on-chain: ${hash}`);
        return receipt;
    }

    /**
     * Add experience on-chain
     */
    private async addExperienceOnChain(frogId: number, xpAmount: number) {
        if (!this.isInitialized || !config.ZETAFROG_NFT_ADDRESS) {
            return;
        }

        const { request } = await this.publicClient.simulateContract({
            address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
            abi: ZETAFROG_ABI,
            functionName: 'addExperience',
            args: [BigInt(frogId), BigInt(xpAmount)],
            account: this.account,
        });

        const hash = await this.walletClient.writeContract(request);
        await this.publicClient.waitForTransactionReceipt({ hash });
        
        logger.info(`Added ${xpAmount} XP to frog ${frogId} on-chain: ${hash}`);
    }
}

export const travelProcessor = new TravelProcessor();
