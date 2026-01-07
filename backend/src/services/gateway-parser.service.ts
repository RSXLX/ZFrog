/**
 * Gateway Parser Service
 * 
 * 解析 ZetaChain Gateway 跨链消息，追踪青蛙的跨链旅行轨迹
 */

import { createPublicClient, http, parseAbi, Log } from 'viem';
import { zetachainAthensTestnet } from 'viem/chains';
import { config } from '../config';
import { logger } from '../utils/logger';

// Gateway 事件 ABI
const GATEWAY_ABI = parseAbi([
  'event MessageSent(bytes32 indexed messageId, uint256 indexed destChainId, address sender, bytes payload)',
  'event MessageReceived(bytes32 indexed messageId, uint256 indexed srcChainId, address sender, bytes payload)',
]);

// OmniTravel 事件 ABI
const OMNI_TRAVEL_ABI = parseAbi([
  'event TravelStarted(uint256 indexed tokenId, uint256 indexed targetChainId, address owner, uint256 duration)',
  'event TravelCompleted(uint256 indexed tokenId, uint256 indexed sourceChainId, string journalHash)',
  'event ExplorationTriggered(uint256 indexed tokenId, uint256 targetChainId, string observation, uint256 timestamp)',
]);

export interface CrossChainRoute {
  messageId: string;
  tokenId: number;
  sourceChain: number;
  targetChain: number;
  direction: 'OUT' | 'BACK';
  timestamp: Date;
  txHash: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
}

export interface TravelTrajectory {
  tokenId: number;
  routes: CrossChainRoute[];
  currentChain: number;
  totalHops: number;
}

class GatewayParserService {
  private client: ReturnType<typeof createPublicClient>;
  private omniTravelAddress: string;
  
  constructor() {
    this.client = createPublicClient({
      chain: zetachainAthensTestnet,
      transport: http(config.ZETACHAIN_RPC_URL),
    });
    
    this.omniTravelAddress = config.OMNI_TRAVEL_ADDRESS || '';
  }
  
  /**
   * 获取青蛙的跨链旅行轨迹
   */
  async getFrogTrajectory(tokenId: number, fromBlock?: bigint): Promise<TravelTrajectory> {
    logger.info(`[GatewayParser] Fetching trajectory for frog ${tokenId}`);
    
    const routes: CrossChainRoute[] = [];
    
    try {
      // 获取 TravelStarted 事件
      const startEvents = await this.getTravelStartedEvents(tokenId, fromBlock);
      for (const event of startEvents) {
        routes.push({
          messageId: event.txHash.slice(0, 66),
          tokenId,
          sourceChain: 7001, // ZetaChain
          targetChain: Number(event.targetChainId),
          direction: 'OUT',
          timestamp: new Date(Number(event.timestamp) * 1000),
          txHash: event.txHash,
          status: 'CONFIRMED',
        });
      }
      
      // 获取 TravelCompleted 事件
      const completeEvents = await this.getTravelCompletedEvents(tokenId, fromBlock);
      for (const event of completeEvents) {
        routes.push({
          messageId: event.txHash.slice(0, 66),
          tokenId,
          sourceChain: Number(event.sourceChainId),
          targetChain: 7001, // 返回 ZetaChain
          direction: 'BACK',
          timestamp: new Date(),
          txHash: event.txHash,
          status: 'CONFIRMED',
        });
      }
      
      // 按时间排序
      routes.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      // 推断当前所在链
      const currentChain = this.inferCurrentChain(routes);
      
      return {
        tokenId,
        routes,
        currentChain,
        totalHops: routes.length,
      };
      
    } catch (error) {
      logger.error(`[GatewayParser] Error fetching trajectory for frog ${tokenId}:`, error);
      return {
        tokenId,
        routes: [],
        currentChain: 7001,
        totalHops: 0,
      };
    }
  }
  
  /**
   * 获取 TravelStarted 事件
   */
  private async getTravelStartedEvents(tokenId: number, fromBlock?: bigint) {
    if (!this.omniTravelAddress) {
      logger.warn('[GatewayParser] OMNI_TRAVEL_ADDRESS not configured');
      return [];
    }
    
    try {
      const logs = await this.client.getLogs({
        address: this.omniTravelAddress as `0x${string}`,
        event: OMNI_TRAVEL_ABI[0],
        args: {
          tokenId: BigInt(tokenId),
        },
        fromBlock: fromBlock || 'earliest',
        toBlock: 'latest',
      });
      
      return logs.map(log => ({
        tokenId: Number(log.args.tokenId),
        targetChainId: log.args.targetChainId,
        owner: log.args.owner,
        duration: log.args.duration,
        txHash: log.transactionHash,
        timestamp: log.blockNumber,
      }));
    } catch (error) {
      logger.error('[GatewayParser] Error fetching TravelStarted events:', error);
      return [];
    }
  }
  
  /**
   * 获取 TravelCompleted 事件
   */
  private async getTravelCompletedEvents(tokenId: number, fromBlock?: bigint) {
    if (!this.omniTravelAddress) {
      return [];
    }
    
    try {
      const logs = await this.client.getLogs({
        address: this.omniTravelAddress as `0x${string}`,
        event: OMNI_TRAVEL_ABI[1],
        args: {
          tokenId: BigInt(tokenId),
        },
        fromBlock: fromBlock || 'earliest',
        toBlock: 'latest',
      });
      
      return logs.map(log => ({
        tokenId: Number(log.args.tokenId),
        sourceChainId: log.args.sourceChainId,
        journalHash: log.args.journalHash,
        txHash: log.transactionHash,
      }));
    } catch (error) {
      logger.error('[GatewayParser] Error fetching TravelCompleted events:', error);
      return [];
    }
  }
  
  /**
   * 获取 Exploration 事件
   */
  async getExplorationEvents(tokenId: number, fromBlock?: bigint) {
    if (!this.omniTravelAddress) {
      return [];
    }
    
    try {
      const logs = await this.client.getLogs({
        address: this.omniTravelAddress as `0x${string}`,
        event: OMNI_TRAVEL_ABI[2],
        args: {
          tokenId: BigInt(tokenId),
        },
        fromBlock: fromBlock || 'earliest',
        toBlock: 'latest',
      });
      
      return logs.map(log => ({
        tokenId: Number(log.args.tokenId),
        targetChainId: log.args.targetChainId,
        observation: log.args.observation,
        timestamp: new Date(Number(log.args.timestamp) * 1000),
        txHash: log.transactionHash,
      }));
    } catch (error) {
      logger.error('[GatewayParser] Error fetching Exploration events:', error);
      return [];
    }
  }
  
  /**
   * 根据路由推断当前所在链
   */
  private inferCurrentChain(routes: CrossChainRoute[]): number {
    if (routes.length === 0) {
      return 7001; // 默认在 ZetaChain
    }
    
    const lastRoute = routes[routes.length - 1];
    return lastRoute.direction === 'OUT' ? lastRoute.targetChain : 7001;
  }
  
  /**
   * 监听实时跨链事件
   */
  async watchCrossChainEvents(
    tokenId: number,
    onEvent: (route: CrossChainRoute) => void
  ): Promise<() => void> {
    if (!this.omniTravelAddress) {
      logger.warn('[GatewayParser] Cannot watch events: OMNI_TRAVEL_ADDRESS not configured');
      return () => {};
    }
    
    const unwatch = this.client.watchContractEvent({
      address: this.omniTravelAddress as `0x${string}`,
      abi: OMNI_TRAVEL_ABI,
      onLogs: (logs) => {
        for (const log of logs) {
          if ('tokenId' in log.args && Number(log.args.tokenId) === tokenId) {
            const route: CrossChainRoute = {
              messageId: log.transactionHash.slice(0, 66),
              tokenId,
              sourceChain: 7001,
              targetChain: 'targetChainId' in log.args ? Number(log.args.targetChainId) : 7001,
              direction: log.eventName === 'TravelStarted' ? 'OUT' : 'BACK',
              timestamp: new Date(),
              txHash: log.transactionHash,
              status: 'CONFIRMED',
            };
            onEvent(route);
          }
        }
      },
    });
    
    return unwatch;
  }
  
  /**
   * 获取链名称
   */
  getChainName(chainId: number): string {
    const chainNames: Record<number, string> = {
      7001: 'ZetaChain Athens',
      97: 'BSC Testnet',
      11155111: 'Sepolia',
      80001: 'Polygon Mumbai',
    };
    return chainNames[chainId] || `Chain ${chainId}`;
  }
  
  /**
   * 生成轨迹描述
   */
  generateTrajectoryDescription(trajectory: TravelTrajectory): string {
    if (trajectory.routes.length === 0) {
      return '🏠 青蛙还没有开始跨链冒险';
    }
    
    const lines: string[] = [];
    lines.push(`🐸 青蛙 #${trajectory.tokenId} 的跨链轨迹：`);
    
    for (let i = 0; i < trajectory.routes.length; i++) {
      const route = trajectory.routes[i];
      const arrow = route.direction === 'OUT' ? '→' : '←';
      const fromChain = this.getChainName(route.sourceChain);
      const toChain = this.getChainName(route.targetChain);
      lines.push(`  ${i + 1}. ${fromChain} ${arrow} ${toChain}`);
    }
    
    lines.push(`📍 当前位置: ${this.getChainName(trajectory.currentChain)}`);
    lines.push(`🔢 总跳数: ${trajectory.totalHops}`);
    
    return lines.join('\n');
  }
}

export const gatewayParserService = new GatewayParserService();
