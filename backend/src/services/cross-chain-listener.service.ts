// backend/src/services/cross-chain-listener.service.ts
// 跨链事件监听服务 - 监听目标链上的到达、探索、返回事件

import { ethers } from 'ethers';
import { prisma } from '../database';
import { logger } from '../utils/logger';
import { config } from '../config';
import { notifyTravelInteraction, notifyTravelStageUpdate, notifyTravelCompleted } from '../websocket';
import { explorationScheduler } from './exploration-scheduler.service';
import { badgeService } from './badge/badge.service';

// FrogConnector ABI (事件部分)
const FROG_CONNECTOR_ABI = [
  // Events
  'event FrogArrived(uint256 indexed tokenId, address indexed owner, string name, bytes32 messageId, uint256 timestamp)',
  'event FrogReturned(uint256 indexed tokenId, bytes32 messageId, uint256 xpEarned, uint256 timestamp)',
  'event RandomExploration(uint256 indexed tokenId, address indexed exploredAddress, bool isContract, uint256 codeSize, string observation, uint256 timestamp)',
  'event ProvisionsUpdated(uint256 indexed tokenId, uint256 remaining, uint256 used)',
  // View functions
  'function shouldReturn(uint256 tokenId) view returns (bool, string)',
  'function autoReturnFrog(uint256 tokenId) external',
  'function visitingFrogs(uint256 tokenId) view returns (uint256 tokenId, address owner, string name, uint256 level, uint64 arrivalTime, uint64 maxStayDuration, uint8 status, bytes32 messageId, uint256 actionsExecuted, uint256 xpEarned)',
  'function frogProvisions(uint256 tokenId) view returns (uint256)'
];

// OmniTravel ABI
const OMNI_TRAVEL_ABI = [
  'function unlockFrogFromCrossChain(uint256 tokenId, bytes32 returnMessageId, uint256 xpEarned) external',
  'function crossChainTravels(uint256 tokenId) view returns (uint256 tokenId, uint256 targetChainId, bytes32 messageId, uint8 status, uint64 startTime, uint64 maxDuration, address owner)',
  'event ProvisionsRefunded(uint256 indexed tokenId, uint256 remaining, uint256 used)'
];

// 链配置
interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  connectorAddress: string;
  footprintAddress?: string;
}

class CrossChainListenerService {
  private chainConfigs: Map<number, ChainConfig> = new Map();
  private providers: Map<number, ethers.JsonRpcProvider> = new Map();
  private isListening: boolean = false;
  private pollIntervals: Map<number, NodeJS.Timeout> = new Map();
  private lastProcessedBlock: Map<number, number> = new Map();
  
  constructor() {
    this.initializeChainConfigs();
  }
  
  private initializeChainConfigs(): void {
    // BSC Testnet
    if (config.BSC_TESTNET_RPC_URL && config.BSC_CONNECTOR_ADDRESS) {
      this.chainConfigs.set(97, {
        chainId: 97,
        name: 'BSC Testnet',
        rpcUrl: config.BSC_TESTNET_RPC_URL,
        connectorAddress: config.BSC_CONNECTOR_ADDRESS,
        footprintAddress: config.BSC_FOOTPRINT_ADDRESS
      });
    }
    
    // Sepolia
    if (config.ETH_SEPOLIA_RPC_URL && config.SEPOLIA_CONNECTOR_ADDRESS) {
      this.chainConfigs.set(11155111, {
        chainId: 11155111,
        name: 'Sepolia',
        rpcUrl: config.ETH_SEPOLIA_RPC_URL,
        connectorAddress: config.SEPOLIA_CONNECTOR_ADDRESS,
        footprintAddress: config.SEPOLIA_FOOTPRINT_ADDRESS
      });
    }
    
    logger.info(`[CrossChainListener] Initialized ${this.chainConfigs.size} chain configs`);
  }
  
  /**
   * 启动跨链事件监听
   */
  async start(): Promise<void> {
    if (this.isListening) {
      logger.warn('[CrossChainListener] Already listening');
      return;
    }
    
    this.isListening = true;
    
    for (const [chainId, chainConfig] of this.chainConfigs) {
      try {
        const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
        
        // Suppress "filter not found" errors (filter expiry is normal)
        provider.on('error', (error: any) => {
          if (error?.code === 'UNKNOWN_ERROR' && error?.error?.message?.includes('filter')) {
            return; // Silently ignore filter expiry
          }
          logger.debug(`[CrossChainListener] Provider error on chain ${chainId}:`, error.message || error);
        });
        
        this.providers.set(chainId, provider);
        
        // 获取当前区块作为起点
        const currentBlock = await provider.getBlockNumber();
        this.lastProcessedBlock.set(chainId, currentBlock);
        
        // 启动轮询
        this.startPolling(chainId, chainConfig, provider);
        
        logger.info(`[CrossChainListener] Started listening on ${chainConfig.name} (chain ${chainId})`);
      } catch (error) {
        logger.error(`[CrossChainListener] Failed to start listener for chain ${chainId}:`, error);
      }
    }
  }
  
  /**
   * 停止监听
   */
  stop(): void {
    this.isListening = false;
    
    for (const [chainId, interval] of this.pollIntervals) {
      clearInterval(interval);
      logger.info(`[CrossChainListener] Stopped listener for chain ${chainId}`);
    }
    
    this.pollIntervals.clear();
  }
  
  /**
   * 启动区块轮询 (替代 WebSocket 事件监听以提高稳定性)
   */
  private startPolling(chainId: number, chainConfig: ChainConfig, provider: ethers.JsonRpcProvider): void {
    const pollInterval = 15000; // 15秒轮询一次
    
    const poll = async () => {
      try {
        const currentBlock = await provider.getBlockNumber();
        const lastBlock = this.lastProcessedBlock.get(chainId) || currentBlock;
        
        if (currentBlock <= lastBlock) return;
        
        const connector = new ethers.Contract(chainConfig.connectorAddress, FROG_CONNECTOR_ABI, provider);
        
        // 查询事件
        const fromBlock = lastBlock + 1;
        const toBlock = Math.min(currentBlock, fromBlock + 100); // 每次最多处理100个区块
        
        // FrogArrived 事件
        const arrivedEvents = await connector.queryFilter(
          connector.filters.FrogArrived(),
          fromBlock,
          toBlock
        );
        
        for (const event of arrivedEvents) {
          await this.handleFrogArrived(event, chainId);
        }
        
        // RandomExploration 事件
        const explorationEvents = await connector.queryFilter(
          connector.filters.RandomExploration(),
          fromBlock,
          toBlock
        );
        
        for (const event of explorationEvents) {
          await this.handleRandomExploration(event, chainId);
        }
        
        // FrogReturned 事件
        const returnedEvents = await connector.queryFilter(
          connector.filters.FrogReturned(),
          fromBlock,
          toBlock
        );
        
        for (const event of returnedEvents) {
          await this.handleFrogReturned(event, chainId);
        }
        
        // 更新已处理区块
        this.lastProcessedBlock.set(chainId, toBlock);
        
      } catch (error) {
        logger.error(`[CrossChainListener] Poll error on chain ${chainId}:`, error);
      }
    };
    
    // 立即执行一次
    poll();
    
    // 设置轮询间隔
    const interval = setInterval(poll, pollInterval);
    this.pollIntervals.set(chainId, interval);
  }
  
  /**
   * 处理 FrogArrived 事件
   */
  private async handleFrogArrived(event: ethers.EventLog | ethers.Log, chainId: number): Promise<void> {
    try {
      const iface = new ethers.Interface(FROG_CONNECTOR_ABI);
      const parsed = iface.parseLog({ topics: event.topics as string[], data: event.data });
      if (!parsed) return;
      
      const tokenId = Number(parsed.args.tokenId);
      const owner = parsed.args.owner;
      const name = parsed.args.name;
      const messageId = parsed.args.messageId;
      const timestamp = Number(parsed.args.timestamp);
      
      logger.info(`[CrossChainListener] FrogArrived: tokenId=${tokenId}, chain=${chainId}, messageId=${messageId}`);
      
      // 查找 travel 记录
      const travel = await prisma.travel.findFirst({
        where: {
          crossChainMessageId: messageId,
          isCrossChain: true,
          crossChainStatus: 'CROSSING_OUT'
        }
      });
      
      if (!travel) {
        logger.warn(`[CrossChainListener] FrogArrived: No travel found for messageId ${messageId}`);
        return;
      }
      
      // 边界检查: 防止重复处理
      if (travel.crossChainStatus !== 'CROSSING_OUT') {
        logger.warn(`[CrossChainListener] FrogArrived: Duplicate event for travel ${travel.id}`);
        return;
      }
      
      // 更新状态
      await prisma.travel.update({
        where: { id: travel.id },
        data: {
          crossChainStatus: 'ON_TARGET_CHAIN',
          targetChainArrivalTime: new Date(timestamp * 1000),
          currentStage: 'EXPLORING',
          progress: 30
        }
      });
      
      // 更新 Frog 状态
      await prisma.frog.updateMany({
        where: { tokenId },
        data: { status: 'CrossChainLocked' }
      });
      
      // WebSocket 通知到达
      notifyTravelInteraction(tokenId, {
        travelId: travel.id,
        message: `🌍 ${name} 抵达 ${this.getChainName(chainId)}，开始探索冒险！`,
        exploredAddress: owner,
        blockNumber: String(event.blockNumber || 0),
        timestamp: new Date().toISOString(),
        isContract: false
      });
      
      // 实时推送阶段变化
      notifyTravelStageUpdate(tokenId, {
        travelId: travel.id,
        stage: 'ON_TARGET_CHAIN',
        progress: 30,
        message: '抵达目标链，开始探索'
      });
      
      // 启动探索调度器
      await explorationScheduler.addExploringFrog({
        tokenId,
        travelId: travel.id,
        targetChainId: chainId,
        duration: travel.duration,
        startTime: new Date(timestamp * 1000)
      });
      
    } catch (error) {
      logger.error(`[CrossChainListener] handleFrogArrived error:`, error);
    }
  }
  
  /**
   * 处理 RandomExploration 事件
   */
  private async handleRandomExploration(event: ethers.EventLog | ethers.Log, chainId: number): Promise<void> {
    try {
      const iface = new ethers.Interface(FROG_CONNECTOR_ABI);
      const parsed = iface.parseLog({ topics: event.topics as string[], data: event.data });
      if (!parsed) return;
      
      const tokenId = Number(parsed.args.tokenId);
      const exploredAddress = parsed.args.exploredAddress;
      const isContract = parsed.args.isContract;
      const observation = parsed.args.observation;
      const timestamp = Number(parsed.args.timestamp);
      
      logger.info(`[CrossChainListener] RandomExploration: tokenId=${tokenId}, address=${exploredAddress}`);
      
      // 查找活跃的 travel
      const travel = await prisma.travel.findFirst({
        where: {
          frog: { tokenId },
          isCrossChain: true,
          crossChainStatus: 'ON_TARGET_CHAIN'
        }
      });
      
      if (!travel) {
        logger.warn(`[CrossChainListener] RandomExploration: No active travel for tokenId ${tokenId}`);
        return;
      }
      
      // 保存探索记录
      await prisma.travelInteraction.create({
        data: {
          travelId: travel.id,
          chainId,
          blockNumber: BigInt(event.blockNumber || 0),
          message: observation,
          exploredAddress,
          isContract,
          txHash: event.transactionHash || ''
        }
      });
      
      // WebSocket 通知
      notifyTravelInteraction(tokenId, {
        travelId: travel.id,
        message: observation,
        exploredAddress,
        blockNumber: String(event.blockNumber || 0),
        timestamp: new Date().toISOString(),
        isContract
      });
      
    } catch (error) {
      logger.error(`[CrossChainListener] handleRandomExploration error:`, error);
    }
  }
  
  /**
   * 处理 FrogReturned 事件
   */
  private async handleFrogReturned(event: ethers.EventLog | ethers.Log, chainId: number): Promise<void> {
    try {
      const iface = new ethers.Interface(FROG_CONNECTOR_ABI);
      const parsed = iface.parseLog({ topics: event.topics as string[], data: event.data });
      if (!parsed) return;
      
      const tokenId = Number(parsed.args.tokenId);
      const returnMessageId = parsed.args.messageId;
      const xpEarned = Number(parsed.args.xpEarned);
      const timestamp = Number(parsed.args.timestamp);
      
      logger.info(`[CrossChainListener] FrogReturned: tokenId=${tokenId}, xp=${xpEarned}`);
      
      // 查找 travel 记录
      const travel = await prisma.travel.findFirst({
        where: {
          frog: { tokenId },
          isCrossChain: true,
          crossChainStatus: 'ON_TARGET_CHAIN'
        },
        include: { frog: true }
      });
      
      if (!travel) {
        logger.warn(`[CrossChainListener] FrogReturned: No travel found for tokenId ${tokenId}`);
        return;
      }
      
      // 更新 travel 状态为返程中
      await prisma.travel.update({
        where: { id: travel.id },
        data: {
          crossChainStatus: 'CROSSING_BACK',
          returnMessageId,
          currentStage: 'RETURNING',
          progress: 80
        }
      });
      
      // 停止探索调度器
      explorationScheduler.removeExploringFrog(tokenId);
      
      // 实时推送阶段变化
      notifyTravelStageUpdate(tokenId, {
        travelId: travel.id,
        stage: 'CROSSING_BACK',
        progress: 80,
        message: '正在返回家园'
      });
      
      // 尝试解锁 NFT (在 ZetaChain 上)
      await this.unlockFrogOnZetaChain(tokenId, returnMessageId, xpEarned, travel);
      
    } catch (error) {
      logger.error(`[CrossChainListener] handleFrogReturned error:`, error);
    }
  }
  
  /**
   * 在 ZetaChain 上解锁 NFT
   */
  private async unlockFrogOnZetaChain(
    tokenId: number,
    returnMessageId: string,
    xpEarned: number,
    travel: any
  ): Promise<void> {
    try {
      if (!config.OMNI_TRAVEL_ADDRESS || !config.PRIVATE_KEY || !config.ZETACHAIN_RPC_URL) {
        logger.warn('[CrossChainListener] Missing ZetaChain config, skipping unlock');
        return;
      }
      
      const provider = new ethers.JsonRpcProvider(config.ZETACHAIN_RPC_URL);
      const wallet = new ethers.Wallet(config.PRIVATE_KEY, provider);
      const omniTravel = new ethers.Contract(config.OMNI_TRAVEL_ADDRESS, OMNI_TRAVEL_ABI, wallet);
      
      // 调用解锁
      const tx = await omniTravel.unlockFrogFromCrossChain(tokenId, returnMessageId, xpEarned);
      const receipt = await tx.wait();
      
      logger.info(`[CrossChainListener] NFT unlocked: tokenId=${tokenId}, tx=${receipt.hash}`);

      // 解析 ProvisionsRefunded 事件获取退款金额
      let refundAmount = '0';
      try {
        const iface = new ethers.Interface(OMNI_TRAVEL_ABI);
        for (const log of receipt.logs) {
           try {
              const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
              // 注意：ethers v6 log parsing name check
              if (parsed && parsed.name === 'ProvisionsRefunded') {
                 refundAmount = parsed.args.remaining.toString();
                 logger.info(`[CrossChainListener] Found refund: ${refundAmount} wei for token ${tokenId}`);
                 break;
              }
           } catch {
              // ignore unrelated logs
           }
        }
      } catch (parseErr) {
        logger.warn(`[CrossChainListener] Failed to parse refund event:`, parseErr);
      }
      
      // 更新数据库
      await prisma.travel.update({
        where: { id: travel.id },
        data: {
          crossChainStatus: 'COMPLETED',  // 使用 prisma enum 正确值
          status: 'Completed',
          currentStage: 'RETURNING',      // TravelStage 没有 COMPLETED
          progress: 100,
          unlockTxHash: receipt.hash,
          crossChainXpEarned: xpEarned,
          refundAmount: refundAmount,
          completedAt: new Date()
        }
      });
      
      // 更新 Frog 状态
      await prisma.frog.update({
        where: { id: travel.frogId },
        data: { 
          status: 'Idle',
          xp: { increment: xpEarned }
        }
      });
      
      // WebSocket 通知完成
      notifyTravelInteraction(tokenId, {
        travelId: travel.id,
        message: `🏠 ${travel.frog?.name || '青蛙'} 安全返回家园！获得 ${xpEarned} XP (退还干粮: ${ethers.formatEther(refundAmount)} ZETA)`,
        exploredAddress: travel.frog?.ownerAddress || '',
        blockNumber: String(receipt.blockNumber || 0),
        timestamp: new Date().toISOString(),
        isContract: false
      });
      
      // 检查并授予徽章 (使用统一的 badgeService)
      let badges: string[] = [];
      try {
        const chainKey = travel.targetChain as any;
        badges = await badgeService.checkAndUnlock(travel.frogId, {
          chain: chainKey || 'BSC_TESTNET',
          travelId: travel.id,
          discoveries: [],
          ownerAddress: travel.frog?.ownerAddress
        });
        if (badges.length > 0) {
          logger.info(`[CrossChainListener] Awarded badges to frog ${travel.frogId}: ${badges.join(', ')}`);
        }
      } catch (badgeError) {
        logger.error(`[CrossChainListener] Failed to check badges:`, badgeError);
      }
      
      // 生成旅行日记 (P0 修复)
      try {
        const interactions = await prisma.travelInteraction.findMany({
          where: { travelId: travel.id },
          orderBy: { createdAt: 'asc' },
          take: 10
        });
        
        // 简单日记生成 (无需AI服务)
        const diaryContent = this.generateSimpleDiary(travel, interactions, xpEarned, badges);
        
        await prisma.travel.update({
          where: { id: travel.id },
          data: {
            journalContent: diaryContent,
            diary: diaryContent
          }
        });
        
        logger.info(`[CrossChainListener] Generated diary for travel ${travel.id}`);
      } catch (diaryError) {
        logger.error(`[CrossChainListener] Failed to generate diary:`, diaryError);
      }
      
      // 发送完成通知 (stageUpdate + completed)
      notifyTravelStageUpdate(tokenId, {
        travelId: travel.id,
        stage: 'UNLOCKED',
        progress: 100,
        message: '旅行完成！'
      });
      
      const totalDiscoveries = await prisma.travelInteraction.count({ where: { travelId: travel.id } });
      notifyTravelCompleted(tokenId, {
        travelId: travel.id,
        xpEarned,
        badges,
        totalDiscoveries
      });
      
    } catch (error) {
      logger.error(`[CrossChainListener] unlockFrogOnZetaChain error:`, error);
      
      // 标记失败
      await prisma.travel.update({
        where: { id: travel.id },
        data: {
          crossChainStatus: 'FAILED',
          status: 'Failed',
          errorMessage: `Unlock failed: ${(error as Error).message}`
        }
      });
    }
  }
  
  /**
   * 获取链名称
   */
  private getChainName(chainId: number): string {
    const names: Record<number, string> = {
      7001: 'ZetaChain',
      97: 'BSC Testnet',
      11155111: 'Sepolia'
    };
    return names[chainId] || `Chain ${chainId}`;
  }
  
  /**
   * 生成简单旅行日记 (无需AI服务)
   */
  private generateSimpleDiary(
    travel: any,
    interactions: any[],
    xpEarned: number,
    badges: string[]
  ): string {
    const frogName = travel.frog?.name || '小青蛙';
    const chainName = this.getChainName(travel.chainId);
    const duration = Math.floor(travel.duration / 60);
    
    let diary = `# ${frogName}的跨链冒险日记\n\n`;
    diary += `## 🗓️ 旅行概况\n`;
    diary += `- 目标链: ${chainName}\n`;
    diary += `- 旅行时长: ${duration} 分钟\n`;
    diary += `- 获得经验: ${xpEarned} XP\n`;
    if (badges.length > 0) {
      diary += `- 获得徽章: ${badges.join(', ')}\n`;
    }
    diary += `\n`;
    
    diary += `## 🔍 探索足迹\n`;
    if (interactions.length === 0) {
      diary += `本次旅行静悄悄的，没有留下特别的足迹~\n`;
    } else {
      for (let i = 0; i < interactions.length && i < 5; i++) {
        const inter = interactions[i];
        const addr = inter.exploredAddress?.slice(0, 10) + '...';
        diary += `${i + 1}. ${inter.message?.slice(0, 50) || `访问了 ${addr}`}\n`;
      }
      if (interactions.length > 5) {
        diary += `...还有 ${interactions.length - 5} 个足迹\n`;
      }
    }
    diary += `\n`;
    
    diary += `## 💭 旅行感想\n`;
    diary += `${frogName}成功完成了跨链探险，安全返回家园！这次旅行收获满满~\n`;
    
    return diary;
  }
  
  /**
   * 检查并触发返程 (由调度器定期调用)
   */
  async checkAndTriggerReturn(tokenId: number, chainId: number): Promise<boolean> {
    const chainConfig = this.chainConfigs.get(chainId);
    if (!chainConfig) return false;
    
    try {
      const provider = this.providers.get(chainId);
      if (!provider) return false;
      
      const wallet = new ethers.Wallet(config.PRIVATE_KEY || '', provider);
      const connector = new ethers.Contract(chainConfig.connectorAddress, FROG_CONNECTOR_ABI, wallet);
      
      // 检查是否应该返回
      const [should, reason] = await connector.shouldReturn(tokenId);
      
      if (should) {
        logger.info(`[CrossChainListener] Triggering return for frog ${tokenId}: ${reason}`);
        
        // 调用 autoReturnFrog
        const tx = await connector.autoReturnFrog(tokenId);
        await tx.wait();
        
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`[CrossChainListener] checkAndTriggerReturn error for frog ${tokenId}:`, error);
      return false;
    }
  }
}

// 导出单例
export const crossChainListener = new CrossChainListenerService();
