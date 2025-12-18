// backend/src/workers/travelProcessor.ts

import { PrismaClient, TravelStatus, FrogStatus, Travel, Frog } from '@prisma/client';
import { createWalletClient, http, createPublicClient, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { observerService } from '../services/observer.service';
import { aiService, GeneratedJournal } from '../services/ai.service';
import { ipfsService } from '../services/ipfs.service';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ZETAFROG_ABI, SOUVENIR_ABI } from '../config/contracts';
import type { Server } from 'socket.io';

// 定义 ZetaChain Athens Testnet
const zetachainAthens = defineChain({
  id: 7001,
  name: 'ZetaChain Athens Testnet',
  nativeCurrency: { name: 'ZETA', symbol: 'ZETA', decimals: 18 },
  rpcUrls: {
    default: { http: [config.ZETACHAIN_RPC_URL] },
  },
});

const prisma = new PrismaClient();

// 🔧 修复：定义旅行数据类型
interface TravelWithFrog extends Travel {
  frog: Frog;
}

class TravelProcessor {
  private walletClient: ReturnType<typeof createWalletClient> | null = null;
  private publicClient: ReturnType<typeof createPublicClient> | null = null;
  private account: ReturnType<typeof privateKeyToAccount> | null = null;
  private isInitialized = false;
  private io: Server | null = null;
  // 🔧 修复：添加正在处理的旅行锁，防止重复处理
  private processingTravels: Set<number> = new Set();

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
      logger.info('Travel processor initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize travel processor:', error);
    }
  }

  /**
   * 主处理循环
   */
  start() {
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
        // 🔧 修复：检查是否正在处理中
        if (this.processingTravels.has(travel.id)) {
          logger.info(`Travel ${travel.id} is already being processed, skipping`);
          continue;
        }

        await this.processSingleTravel(travel as TravelWithFrog);
      }
    } catch (error) {
      logger.error('Error in processCompletedTravels:', error);
    }
  }

  /**
   * 处理单个旅行
   */
  private async processSingleTravel(travel: TravelWithFrog) {
    const { id: travelId, frog, targetWallet, startTime, endTime, chainId } = travel;

    // 🔧 修复：加锁防止重复处理
    if (this.processingTravels.has(travelId)) {
      return;
    }
    this.processingTravels.add(travelId);

    logger.info(`Processing travel ${travelId} for frog ${frog.tokenId}`);

    try {
      // 🔧 修复：发送处理中状态通知
      this.emitProgress(frog.tokenId, 'observing', '正在观察钱包活动...');

      // 更新状态为处理中
      await prisma.travel.update({
        where: { id: travelId },
        data: { status: TravelStatus.Processing },
      });

      // 🔧 修复：使用正确的 chainId
      const observationChainId = chainId || 1;
      
      // 观察钱包活动
      const observation = await observerService.observeWallet(
        targetWallet,
        startTime,
        endTime,
        observationChainId
      );

      // 保存观察数据
      await prisma.walletObservation.create({
        data: {
          travelId,
          walletAddress: targetWallet,
          chainId: observationChainId,
          transactions: observation.transactions as any,
          totalTxCount: observation.totalTxCount,
          totalValueWei: observation.totalValueWei.toString(),
          notableEvents: observation.notableEvents as any,
          observedFrom: startTime,
          observedTo: endTime,
        },
      });

      // 🔧 修复：发送生成故事通知
      this.emitProgress(frog.tokenId, 'generating_story', '正在生成旅行日记...');

      // 生成 AI 故事
      const durationHours = Math.ceil(
        (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
      );

      const journal = await aiService.generateJournal(
        frog.name,
        observation,
        durationHours
      );

      // 计算 XP: 10 XP/小时 + 50 XP/重要事件
      const xpGained = (durationHours * 10) + (observation.notableEvents.length * 50);
      logger.info(`Frog ${frog.tokenId} gained ${xpGained} XP`);

      // 🔧 修复：发送上传通知
      this.emitProgress(frog.tokenId, 'uploading', '正在保存到 IPFS...');

      // 上传到 IPFS
      const journalHash = await ipfsService.uploadJournal(
        frog.name,
        frog.tokenId,
        journal,
        durationHours
      );

      // 🔧 修复：发送铸造通知
      this.emitProgress(frog.tokenId, 'minting', '正在铸造纪念品...');

      // 如果配置了合约，则在链上完成旅行
      let souvenirId = 0;
      if (this.isInitialized && config.ZETAFROG_NFT_ADDRESS && config.SOUVENIR_NFT_ADDRESS) {
        try {
          souvenirId = await this.mintSouvenir(frog.ownerAddress, frog.tokenId);
          await this.completeOnChain(frog.tokenId, journalHash, souvenirId);
          await this.addExperienceOnChain(frog.tokenId, xpGained);
        } catch (error) {
          logger.error('On-chain completion failed:', error);
          // 🔧 修复：链上失败不应该阻止数据库更新
        }
      }

      // 🔧 修复：计算新等级
      const newXp = frog.xp + xpGained;
      const newLevel = Math.floor(newXp / 100) + 1;

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
          souvenirId: souvenirId > 0 ? souvenirId : null,
        },
      });

      // 更新青蛙状态
      await prisma.frog.update({
        where: { id: frog.id },
        data: {
          status: FrogStatus.Idle,
          totalTravels: { increment: 1 },
          xp: newXp,
          level: newLevel,
        },
      });

      // 🔧 修复：发送完整的完成通知
      if (this.io) {
        this.io.to(`frog:${frog.tokenId}`).emit('travel:completed', {
          frogId: frog.tokenId,
          travelId,
          journalHash,
          souvenirId,
          journal: {
            title: journal.title,
            content: journal.content,
            mood: journal.mood,
            highlights: journal.highlights,
          },
          xpGained,
          newLevel,
          timestamp: Date.now(),
        });
        logger.info(`WebSocket event sent for frog ${frog.tokenId}`);
      }

      logger.info(`Travel ${travelId} completed successfully`);
    } catch (error) {
      logger.error(`Failed to process travel ${travelId}:`, error);

      // 更新状态为失败
      await prisma.travel.update({
        where: { id: travelId },
        data: { status: TravelStatus.Failed },
      });

      // 🔧 修复：恢复青蛙状态为 Idle（避免卡在 Traveling）
      await prisma.frog.update({
        where: { id: frog.id },
        data: { status: FrogStatus.Idle },
      });

      // 发送失败通知
      if (this.io) {
        this.io.to(`frog:${frog.tokenId}`).emit('travel:failed', {
          frogId: frog.tokenId,
          travelId,
          error: 'Travel processing failed',
          timestamp: Date.now(),
        });
      }
    } finally {
      // 🔧 修复：释放锁
      this.processingTravels.delete(travelId);
    }
  }

  /**
   * 🔧 新增：发送进度通知
   */
  private emitProgress(frogId: number, phase: string, message: string) {
    if (this.io) {
      this.io.to(`frog:${frogId}`).emit('travel:progress', {
        frogId,
        phase,
        message,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 铸造纪念品 NFT
   */
  private async mintSouvenir(ownerAddress: string, frogId: number): Promise<number> {
    if (!this.isInitialized || !this.publicClient || !this.walletClient || !config.SOUVENIR_NFT_ADDRESS) {
      return 0;
    }

    try {
      const rarityRoll = Math.floor(Math.random() * 100);

      const { request } = await this.publicClient.simulateContract({
        address: config.SOUVENIR_NFT_ADDRESS as `0x${string}`,
        abi: SOUVENIR_ABI,
        functionName: 'mintSouvenir',
        args: [ownerAddress as `0x${string}`, BigInt(frogId), BigInt(rarityRoll)],
        account: this.account!,
      });

      const hash = await this.walletClient.writeContract(request);
      await this.publicClient.waitForTransactionReceipt({ hash });

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
    if (!this.isInitialized || !this.publicClient || !this.walletClient || !config.ZETAFROG_NFT_ADDRESS) {
      return;
    }

    const { request } = await this.publicClient.simulateContract({
      address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
      abi: ZETAFROG_ABI,
      functionName: 'completeTravel',
      args: [BigInt(frogId), journalHash, BigInt(souvenirId)],
      account: this.account!,
    });

    const hash = await this.walletClient.writeContract(request);
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    logger.info(`Travel completed on-chain: ${hash}`);
    return receipt;
  }

  /**
   * 添加经验值到链上
   */
  private async addExperienceOnChain(frogId: number, xpAmount: number) {
    if (!this.isInitialized || !this.publicClient || !this.walletClient || !config.ZETAFROG_NFT_ADDRESS) {
      return;
    }

    try {
      const { request } = await this.publicClient.simulateContract({
        address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
        abi: ZETAFROG_ABI,
        functionName: 'addExperience',
        args: [BigInt(frogId), BigInt(xpAmount)],
        account: this.account!,
      });

      const hash = await this.walletClient.writeContract(request);
      await this.publicClient.waitForTransactionReceipt({ hash });

      logger.info(`Added ${xpAmount} XP to frog ${frogId} on-chain: ${hash}`);
    } catch (error) {
      logger.error(`Failed to add experience on-chain:`, error);
    }
  }
}

export const travelProcessor = new TravelProcessor();