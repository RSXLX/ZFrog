// backend/src/workers/eventListener.ts

import { createPublicClient, http, parseAbiItem, type Log } from 'viem';
import { defineChain } from 'viem';
import { PrismaClient, FrogStatus, TravelStatus } from '@prisma/client';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ZETAFROG_ABI } from '../config/contracts';
import type { Server } from 'socket.io';

const prisma = new PrismaClient();

const zetachainAthens = defineChain({
  id: 7001,
  name: 'ZetaChain Athens Testnet',
  nativeCurrency: { decimals: 18, name: 'ZETA', symbol: 'ZETA' },
  rpcUrls: {
    default: { http: [config.ZETACHAIN_RPC_URL] },
  },
});

// 🔧 修复：定义事件参数类型
interface FrogMintedArgs {
  owner: string;
  tokenId: bigint;
  name: string;
  timestamp: bigint;
}

interface TravelStartedArgs {
  tokenId: bigint;
  targetWallet: string;
  targetChainId: bigint;
  startTime: bigint;
  endTime: bigint;
}

interface TravelCompletedArgs {
  tokenId: bigint;
  journalHash: string;
  souvenirId: bigint;
  timestamp: bigint;
}

class EventListener {
  private publicClient: ReturnType<typeof createPublicClient>;
  private isRunning = false;
  private lastProcessedBlock: bigint;
  private io: Server | null = null;
  // 🔧 修复：添加处理中的事件锁，防止重复处理
  private processingEvents: Set<string> = new Set();

  constructor() {
    this.publicClient = createPublicClient({
      chain: zetachainAthens,
      transport: http(config.ZETACHAIN_RPC_URL),
    });
    this.lastProcessedBlock = BigInt(0);
  }

  setIo(ioInstance: Server) {
    this.io = ioInstance;
  }

  async start() {
    if (this.isRunning) {
      logger.warn('Event listener already running');
      return;
    }

    if (!config.ZETAFROG_NFT_ADDRESS) {
      logger.warn('ZETAFROG_NFT_ADDRESS not configured, event listener disabled');
      return;
    }

    logger.info('Event listener starting...');
    this.isRunning = true;

    try {
      // 获取当前区块
      const currentBlock = await this.publicClient.getBlockNumber();
      // 🔧 修复：从更少的区块开始，避免初始扫描过慢
      this.lastProcessedBlock = currentBlock - BigInt(1000);

      logger.info(`Starting scan from block ${this.lastProcessedBlock} to ${currentBlock}`);

      // 首次扫描历史事件
      await this.scanHistoricalEvents();

      // 开始监听新事件
      this.watchNewEvents();

      // 定期扫描（防止遗漏）
      setInterval(() => this.scanHistoricalEvents(), 60 * 1000);

      logger.info('Event listener started successfully');
    } catch (error) {
      logger.error('Failed to start event listener:', error);
      this.isRunning = false;
    }
  }

  private async scanHistoricalEvents() {
    if (!config.ZETAFROG_NFT_ADDRESS) return;

    try {
      const currentBlock = await this.publicClient.getBlockNumber();
      const fromBlock = this.lastProcessedBlock + BigInt(1);

      if (fromBlock > currentBlock) {
        return;
      }

      // 🔧 修复：限制单次扫描区块数量，避免 RPC 超时
      const maxBlocksPerScan = BigInt(500);
      const toBlock = fromBlock + maxBlocksPerScan > currentBlock 
        ? currentBlock 
        : fromBlock + maxBlocksPerScan;

      logger.info(`Scanning blocks ${fromBlock} to ${toBlock}`);

      const contractAddress = config.ZETAFROG_NFT_ADDRESS as `0x${string}`;

      // 监听 FrogMinted 事件
      const mintLogs = await this.publicClient.getLogs({
        address: contractAddress,
        event: parseAbiItem('event FrogMinted(address indexed owner, uint256 indexed tokenId, string name, uint256 timestamp)'),
        fromBlock,
        toBlock,
      });

      for (const log of mintLogs) {
        await this.handleFrogMinted(log as unknown as Log & { args: FrogMintedArgs });
      }

      // 🔧 修复：事件签名匹配实际合约
      const travelLogs = await this.publicClient.getLogs({
        address: contractAddress,
        event: parseAbiItem('event TravelStarted(uint256 indexed tokenId, address indexed targetWallet, uint256 targetChainId, uint64 startTime, uint64 endTime)'),
        fromBlock,
        toBlock,
      });

      for (const log of travelLogs) {
        await this.handleTravelStarted(log as unknown as Log & { args: TravelStartedArgs });
      }

      // 监听 TravelCompleted 事件
      const completedLogs = await this.publicClient.getLogs({
        address: contractAddress,
        event: parseAbiItem('event TravelCompleted(uint256 indexed tokenId, string journalHash, uint256 souvenirId, uint256 timestamp)'),
        fromBlock,
        toBlock,
      });

      for (const log of completedLogs) {
        await this.handleTravelCompleted(log as unknown as Log & { args: TravelCompletedArgs });
      }

      this.lastProcessedBlock = toBlock;
    } catch (error) {
      logger.error('Error scanning historical events:', error);
    }
  }

  private watchNewEvents() {
    if (!config.ZETAFROG_NFT_ADDRESS) return;

    const contractAddress = config.ZETAFROG_NFT_ADDRESS as `0x${string}`;

    // 监听 FrogMinted
    this.publicClient.watchEvent({
      address: contractAddress,
      event: parseAbiItem('event FrogMinted(address indexed owner, uint256 indexed tokenId, string name, uint256 timestamp)'),
      onLogs: async (logs) => {
        for (const log of logs) {
          await this.handleFrogMinted(log as unknown as Log & { args: FrogMintedArgs });
        }
      },
    });

    // 🔧 修复：监听 TravelStarted（匹配正确的事件签名）
    this.publicClient.watchEvent({
      address: contractAddress,
      event: parseAbiItem('event TravelStarted(uint256 indexed tokenId, address indexed targetWallet, uint256 targetChainId, uint64 startTime, uint64 endTime)'),
      onLogs: async (logs) => {
        for (const log of logs) {
          await this.handleTravelStarted(log as unknown as Log & { args: TravelStartedArgs });
        }
      },
    });

    // 监听 TravelCompleted
    this.publicClient.watchEvent({
      address: contractAddress,
      event: parseAbiItem('event TravelCompleted(uint256 indexed tokenId, string journalHash, uint256 souvenirId, uint256 timestamp)'),
      onLogs: async (logs) => {
        for (const log of logs) {
          await this.handleTravelCompleted(log as unknown as Log & { args: TravelCompletedArgs });
        }
      },
    });

    logger.info('Watching for new events...');
  }

  private async handleFrogMinted(log: Log & { args: FrogMintedArgs }) {
    const { owner, tokenId, name, timestamp } = log.args;
    const eventKey = `mint-${tokenId.toString()}`;

    // 🔧 修复：防止重复处理
    if (this.processingEvents.has(eventKey)) {
      return;
    }
    this.processingEvents.add(eventKey);

    logger.info(`FrogMinted: tokenId=${tokenId}, owner=${owner}, name=${name}`);

    try {
      // 检查是否已存在
      const existing = await prisma.frog.findUnique({
        where: { tokenId: Number(tokenId) },
      });

      if (existing) {
        logger.info(`Frog ${tokenId} already exists in database`);
        this.processingEvents.delete(eventKey);
        return;
      }

      // 创建青蛙记录
      await prisma.frog.create({
        data: {
          tokenId: Number(tokenId),
          name: name,
          ownerAddress: owner.toLowerCase(),
          birthday: new Date(Number(timestamp) * 1000),
          totalTravels: 0,
          status: FrogStatus.Idle,
          xp: 0,
          level: 1,
        },
      });

      logger.info(`Frog ${tokenId} saved to database`);

      // 🔧 修复：发送 WebSocket 通知
      if (this.io) {
        this.io.to(`wallet:${owner.toLowerCase()}`).emit('frog:minted', {
          tokenId: Number(tokenId),
          name,
          owner: owner.toLowerCase(),
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      logger.error(`Error handling FrogMinted event:`, error);
    } finally {
      this.processingEvents.delete(eventKey);
    }
  }

  private async handleTravelStarted(log: Log & { args: TravelStartedArgs }) {
    const { tokenId, targetWallet, targetChainId, startTime, endTime } = log.args;
    const eventKey = `travel-start-${tokenId.toString()}-${startTime.toString()}`;

    // 🔧 修复：防止重复处理
    if (this.processingEvents.has(eventKey)) {
      return;
    }
    this.processingEvents.add(eventKey);

    logger.info(`TravelStarted: tokenId=${tokenId}, target=${targetWallet}, chainId=${targetChainId}`);

    try {
      // 查找青蛙
      let frog = await prisma.frog.findUnique({
        where: { tokenId: Number(tokenId) },
      });

      // 🔧 修复：如果青蛙不存在，尝试同步
      if (!frog) {
        logger.warn(`Frog ${tokenId} not found, attempting to sync...`);
        const synced = await this.syncFrog(Number(tokenId));
        if (!synced) {
          logger.error(`Failed to sync frog ${tokenId}`);
          this.processingEvents.delete(eventKey);
          return;
        }
        frog = await prisma.frog.findUnique({
          where: { tokenId: Number(tokenId) },
        });
      }

      if (!frog) {
        this.processingEvents.delete(eventKey);
        return;
      }

      // 🔧 修复：检查是否已有相同的旅行记录
      const existingTravel = await prisma.travel.findFirst({
        where: {
          frogId: frog.id,
          startTime: new Date(Number(startTime) * 1000),
          status: { in: [TravelStatus.Active, TravelStatus.Processing] },
        },
      });

      if (existingTravel) {
        logger.info(`Travel already exists for frog ${tokenId}`);
        this.processingEvents.delete(eventKey);
        return;
      }

      // 更新青蛙状态
      await prisma.frog.update({
        where: { id: frog.id },
        data: { status: FrogStatus.Traveling },
      });

      // 创建旅行记录
      const travel = await prisma.travel.create({
        data: {
          frogId: frog.id,
          targetWallet: targetWallet.toLowerCase(),
          chainId: Number(targetChainId),
          startTime: new Date(Number(startTime) * 1000),
          endTime: new Date(Number(endTime) * 1000),
          status: TravelStatus.Active,
        },
      });

      logger.info(`Travel started for frog ${tokenId}, travelId=${travel.id}`);

      // 🔧 修复：发送 WebSocket 通知
      if (this.io) {
        this.io.to(`frog:${tokenId}`).emit('travel:started', {
          frogId: Number(tokenId),
          travelId: travel.id,
          targetWallet: targetWallet.toLowerCase(),
          chainId: Number(targetChainId),
          startTime: new Date(Number(startTime) * 1000).toISOString(),
          endTime: new Date(Number(endTime) * 1000).toISOString(),
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      logger.error(`Error handling TravelStarted event:`, error);
    } finally {
      this.processingEvents.delete(eventKey);
    }
  }

  private async handleTravelCompleted(log: Log & { args: TravelCompletedArgs }) {
    const { tokenId, journalHash, souvenirId } = log.args;
    const eventKey = `travel-complete-${tokenId.toString()}-${journalHash}`;

    if (this.processingEvents.has(eventKey)) {
      return;
    }
    this.processingEvents.add(eventKey);

    logger.info(`TravelCompleted: tokenId=${tokenId}, journalHash=${journalHash}`);

    try {
      const frog = await prisma.frog.findUnique({
        where: { tokenId: Number(tokenId) },
      });

      if (!frog) {
        this.processingEvents.delete(eventKey);
        return;
      }

      // 更新青蛙状态
      await prisma.frog.update({
        where: { id: frog.id },
        data: {
          status: FrogStatus.Idle,
          totalTravels: { increment: 1 },
        },
      });

      // 🔧 修复：更新对应的旅行记录（如果后端没处理完）
      const activeTravel = await prisma.travel.findFirst({
        where: {
          frogId: frog.id,
          status: { in: [TravelStatus.Active, TravelStatus.Processing] },
        },
        orderBy: { startTime: 'desc' },
      });

      if (activeTravel && activeTravel.status !== TravelStatus.Completed) {
        await prisma.travel.update({
          where: { id: activeTravel.id },
          data: {
            status: TravelStatus.Completed,
            journalHash,
            completedAt: new Date(),
          },
        });
      }

      logger.info(`Travel completed for frog ${tokenId}`);

      // 🔧 修复：不需要在这里再发 WebSocket，travelProcessor 会发
    } catch (error) {
      logger.error(`Error handling TravelCompleted event:`, error);
    } finally {
      this.processingEvents.delete(eventKey);
    }
  }

  async syncFrog(tokenId: number): Promise<boolean> {
    if (!config.ZETAFROG_NFT_ADDRESS) {
      return false;
    }

    try {
      const onChainData = await this.publicClient.readContract({
        address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
        abi: ZETAFROG_ABI,
        functionName: 'getFrog',
        args: [BigInt(tokenId)],
      }) as [string, bigint, number, number, bigint, bigint];

      const owner = await this.publicClient.readContract({
        address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
        abi: ZETAFROG_ABI,
        functionName: 'ownerOf',
        args: [BigInt(tokenId)],
      }) as string;

      if (onChainData && onChainData[0]) {
        const statusMap: FrogStatus[] = [FrogStatus.Idle, FrogStatus.Traveling, FrogStatus.Returning];

        await prisma.frog.upsert({
          where: { tokenId },
          update: {
            name: onChainData[0],
            ownerAddress: owner.toLowerCase(),
            totalTravels: Number(onChainData[2]),
            status: statusMap[Number(onChainData[3])] || FrogStatus.Idle,
            xp: Number(onChainData[4]),
            level: Number(onChainData[5]),
          },
          create: {
            tokenId,
            name: onChainData[0],
            ownerAddress: owner.toLowerCase(),
            birthday: new Date(Number(onChainData[1]) * 1000),
            totalTravels: Number(onChainData[2]),
            status: statusMap[Number(onChainData[3])] || FrogStatus.Idle,
            xp: Number(onChainData[4]),
            level: Number(onChainData[5]),
          },
        });

        logger.info(`Synced frog ${tokenId} from chain`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Error syncing frog ${tokenId}:`, error);
      return false;
    }
  }
}

export const eventListener = new EventListener();