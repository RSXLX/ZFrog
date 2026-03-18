/**
 * 旅行批量处理器 (P1优化)
 * 支持批量完成旅行、批量铸造NFT、批量处理徽章
 * 大幅减少Gas成本和API调用次数
 */

import { prisma } from '../../database';
import { TravelStatus, TravelStage, FrogStatus } from '@prisma/client';
import { createWalletClient, http, createPublicClient, type Account, type Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { observerService } from '../observer.service';
import { aiService } from '../ai.service';
import { ipfsService } from '../ipfs.service';
import { multiLevelCache } from '../cache/MultiLevelCache';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { SOUVENIR_ABI, TRAVEL_ABI } from '../../config/contracts';
import { ChainKey, CHAIN_ID_TO_KEY, getChainConfig } from '../../config/chains';
import { travelP0Service } from './travel-p0.service';
import { NFTImageOrchestratorService } from '../nft-image-orchestrator.service';
import { badgeService } from '../badge/badge.service';

// 批量处理配置
const BATCH_CONFIG = {
  MAX_BATCH_SIZE: 10,           // 每批最大处理数量
  MAX_GAS_PER_BATCH: 5000000, // 每批最大Gas限制
  BATCH_TIMEOUT: 30000,         // 批量处理超时时间
  RETRY_ATTEMPTS: 3,            // 重试次数
  RETRY_DELAY: 1000,            // 重试延迟
};

interface BatchTravel {
  travelId: number;
  frogId: number;
  frogName: string;
  frogTokenId: number;
  ownerAddress: string;
  targetWallet: string;
  chainId: number;
  startTime: Date;
  endTime: Date;
  isRandom: boolean;
}

interface BatchResult {
  success: boolean;
  travelId: number;
  gasUsed?: bigint;
  journalHash?: string;
  souvenirId?: number;
  error?: string;
}

export class BatchProcessor {
  private walletClient: any;
  private publicClient: any;
  private account: any;
  private isInitialized = false;
  private orchestrator: NFTImageOrchestratorService;

  // 批量处理队列
  private processingQueue: Map<number, BatchTravel[]> = new Map();
  private isProcessing = false;

  constructor() {
    this.orchestrator = new NFTImageOrchestratorService();
    this.initialize();
  }

  private initialize() {
    if (!config.RELAYER_PRIVATE_KEY) {
      logger.warn('[BatchProcessor] No private key, running in mock mode');
      return;
    }

    try {
      let privateKey = config.RELAYER_PRIVATE_KEY;
      if (!privateKey.startsWith('0x')) {
        privateKey = `0x${privateKey}`;
      }

      this.account = privateKeyToAccount(privateKey as `0x${string}`);

      const zetachainAthens = {
        id: 7001,
        name: 'ZetaChain Athens Testnet',
        nativeCurrency: { name: 'ZETA', symbol: 'ZETA', decimals: 18 },
        rpcUrls: { default: { http: [config.ZETACHAIN_RPC_URL] } },
      } as const;

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
      logger.info(`[BatchProcessor] Initialized with account: ${this.account.address}`);
    } catch (error) {
      logger.error('[BatchProcessor] Initialization failed:', error);
    }
  }

  /**
   * 添加旅行到批量处理队列
   */
  async addToBatch(travel: BatchTravel): Promise<void> {
    const chainId = travel.chainId;
    
    if (!this.processingQueue.has(chainId)) {
      this.processingQueue.set(chainId, []);
    }
    
    this.processingQueue.get(chainId)!.push(travel);
    
    logger.info(`[BatchProcessor] Added travel ${travel.travelId} to batch for chain ${chainId}`);
    
    // 触发批量处理
    this.triggerBatchProcessing();
  }

  /**
   * 触发批量处理
   */
  private async triggerBatchProcessing(): Promise<void> {
    if (this.isProcessing) {
      logger.debug('[BatchProcessor] Already processing, skipping...');
      return;
    }

    this.isProcessing = true;

    try {
      for (const [chainId, travels] of this.processingQueue.entries()) {
        if (travels.length === 0) continue;

        // 分批处理
        const batches = this.splitIntoBatches(travels, BATCH_CONFIG.MAX_BATCH_SIZE);
        
        for (const batch of batches) {
          await this.processBatch(chainId, batch);
        }

        // 清空已处理的旅行
        this.processingQueue.set(chainId, []);
      }
    } catch (error) {
      logger.error('[BatchProcessor] Batch processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 将旅行列表分批
   */
  private splitIntoBatches(travels: BatchTravel[], maxSize: number): BatchTravel[][] {
    const batches: BatchTravel[][] = [];
    
    for (let i = 0; i < travels.length; i += maxSize) {
      batches.push(travels.slice(i, i + maxSize));
    }
    
    return batches;
  }

  /**
   * 处理一批旅行
   */
  private async processBatch(chainId: number, batch: BatchTravel[]): Promise<void> {
    logger.info(`[BatchProcessor] Processing batch of ${batch.length} travels on chain ${chainId}`);

    const results: BatchResult[] = [];

    // 并行处理观察阶段
    const observationPromises = batch.map(travel => 
      this.processObservation(travel)
    );
    
    const observations = await Promise.allSettled(observationPromises);

    // 并行处理AI生成
    const aiPromises = observations.map((result, index) => {
      if (result.status === 'fulfilled') {
        return this.processAIGeneration(batch[index], result.value);
      }
      return Promise.reject(result.reason);
    });

    const aiResults = await Promise.allSettled(aiPromises);

    // 批量铸造NFT
    const souvenirPromises = aiResults.map((result, index) => {
      if (result.status === 'fulfilled') {
        return this.processSouvenirMinting(batch[index], result.value);
      }
      return Promise.reject(result.reason);
    });

    const souvenirResults = await Promise.allSettled(souvenirPromises);

    // 批量完成链上交易
    const completionData = souvenirResults
      .map((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          return {
            frogId: batch[index].frogTokenId,
            journalHash: result.value.journalHash,
            souvenirId: result.value.souvenirId
          };
        }
        return null;
      })
      .filter(Boolean);

    if (completionData.length > 0 && this.isInitialized) {
      await this.batchCompleteOnChain(completionData as any);
    }

    // 更新数据库状态
    await this.batchUpdateDatabase(batch, souvenirResults);

    logger.info(`[BatchProcessor] Batch completed: ${batch.length} travels processed`);
  }

  /**
   * 处理观察阶段
   */
  private async processObservation(travel: BatchTravel): Promise<any> {
    const cacheKey = `observation:${travel.travelId}`;
    
    return multiLevelCache.get(
      cacheKey,
      async () => {
        return observerService.observeWallet(
          travel.targetWallet,
          travel.startTime,
          travel.endTime,
          travel.chainId
        );
      },
      { l1Ttl: 300, l2Ttl: 3600 }
    );
  }

  /**
   * 处理AI生成阶段
   */
  private async processAIGeneration(travel: BatchTravel, observation: any): Promise<any> {
    const durationHours = Math.ceil(
      (travel.endTime.getTime() - travel.startTime.getTime()) / (1000 * 60 * 60)
    );

    const chainConfig = getChainConfig(travel.chainId);

    const journal = await aiService.generateJournal(
      travel.frogName,
      observation,
      durationHours,
      {
        chainName: chainConfig.displayName,
        chainScenery: chainConfig.scenery,
        chainVibe: chainConfig.vibe,
        isRandom: travel.isRandom
      }
    );

    const journalHash = await ipfsService.uploadJournal(
      travel.frogName,
      travel.frogTokenId,
      journal,
      durationHours
    );

    return { journal, journalHash };
  }

  /**
   * 处理纪念品铸造
   */
  private async processSouvenirMinting(
    travel: BatchTravel,
    aiResult: any
  ): Promise<{ journalHash: string; souvenirId: number } | null> {
    if (!this.isInitialized) {
      return { journalHash: aiResult.journalHash, souvenirId: 0 };
    }

    const rarityRoll = Math.floor(Math.random() * 100);

    try {
      const { request } = await this.publicClient.simulateContract({
        address: config.SOUVENIR_NFT_ADDRESS as `0x${string}`,
        abi: SOUVENIR_ABI,
        functionName: 'mintSouvenir',
        args: [
          travel.targetWallet as `0x${string}`,
          BigInt(travel.frogTokenId),
          BigInt(rarityRoll)
        ],
        account: this.account,
      });

      const hash = await this.walletClient.writeContract(request);
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash,
        timeout: 60_000
      });

      if (receipt.status !== 'success') {
        throw new Error('Souvenir minting failed');
      }

      const totalSupply = await this.publicClient.readContract({
        address: config.SOUVENIR_NFT_ADDRESS as `0x${string}`,
        abi: SOUVENIR_ABI,
        functionName: 'totalSupply',
      });

      const souvenirId = Number(totalSupply) - 1;

      return { journalHash: aiResult.journalHash, souvenirId };
    } catch (error) {
      logger.error('[BatchProcessor] Failed to mint souvenir:', error);
      return { journalHash: aiResult.journalHash, souvenirId: 0 };
    }
  }

  /**
   * 批量完成链上交易
   */
  private async batchCompleteOnChain(
    completions: Array<{
      frogId: number;
      journalHash: string;
      souvenirId: number;
    }>
  ): Promise<void> {
    if (!this.isInitialized || !config.TRAVEL_CONTRACT_ADDRESS) {
      return;
    }

    try {
      for (const completion of completions) {
        await this.individualCompleteOnChain(completion);
      }
      logger.info(`[BatchProcessor] Completed ${completions.length} travels sequentially on-chain`);
    } catch (error) {
      logger.error('[BatchProcessor] Batch completion failed:', error);
      // 批量失败时，回退到逐个处理
      logger.info('[BatchProcessor] Falling back to individual processing...');
      for (const completion of completions) {
        await this.individualCompleteOnChain(completion);
      }
    }
  }

  /**
   * 单个完成链上交易（回退方案）
   */
  private async individualCompleteOnChain(
    completion: {
      frogId: number;
      journalHash: string;
      souvenirId: number;
    }
  ): Promise<void> {
    if (!this.isInitialized || !config.TRAVEL_CONTRACT_ADDRESS) {
      return;
    }

    try {
      const { request } = await this.publicClient.simulateContract({
        address: config.TRAVEL_CONTRACT_ADDRESS as `0x${string}`,
        abi: TRAVEL_ABI,
        functionName: 'completeTravel',
        args: [
          BigInt(completion.frogId),
          completion.journalHash,
          BigInt(completion.souvenirId),
          true
        ],
        account: this.account,
      });

      const hash = await this.walletClient.writeContract(request);
      await this.publicClient.waitForTransactionReceipt({
        hash,
        timeout: 60_000
      });

      logger.info(`[BatchProcessor] Individual completion for frog ${completion.frogId}: ${hash}`);
    } catch (error) {
      logger.error(`[BatchProcessor] Individual completion failed for frog ${completion.frogId}:`, error);
      throw error;
    }
  }

  /**
   * 批量更新数据库
   */
  private async batchUpdateDatabase(
    travels: BatchTravel[],
    results: PromiseSettledResult<any>[]
  ): Promise<void> {
    const updates = travels.map((travel, index) => {
      const result = results[index];
      
      if (result.status === 'fulfilled') {
        return prisma.travel.update({
          where: { id: travel.travelId },
          data: {
            status: TravelStatus.Completed,
            currentStage: TravelStage.RETURNING,
            progress: 100,
            completedAt: new Date(),
            journalHash: result.value?.journalHash,
            souvenirId: result.value?.souvenirId,
          },
        });
      } else {
        return prisma.travel.update({
          where: { id: travel.travelId },
          data: {
            status: TravelStatus.Failed,
            errorMessage: result.reason?.message || 'Unknown error',
          },
        });
      }
    });

    await prisma.$transaction(updates);
    logger.info(`[BatchProcessor] Batch database update completed for ${travels.length} travels`);
  }

  /**
   * 获取队列状态
   */
  getQueueStatus(): { chainId: number; pendingCount: number }[] {
    return Array.from(this.processingQueue.entries()).map(([chainId, travels]) => ({
      chainId,
      pendingCount: travels.length,
    }));
  }

  /**
   * 清空队列
   */
  clearQueue(chainId?: number): void {
    if (chainId) {
      this.processingQueue.delete(chainId);
      logger.info(`[BatchProcessor] Cleared queue for chain ${chainId}`);
    } else {
      this.processingQueue.clear();
      logger.info('[BatchProcessor] Cleared all queues');
    }
  }
}

// 单例导出
export const batchProcessor = new BatchProcessor();
