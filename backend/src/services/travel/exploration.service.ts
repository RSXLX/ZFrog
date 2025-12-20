// backend/src/services/travel/exploration.service.ts

import { createPublicClient, http, formatEther } from 'viem';
import { bscTestnet, sepolia } from 'viem/chains';
import { SUPPORTED_CHAINS, ChainKey, CHAIN_KEYS } from '../../config/chains';
import { logger } from '../../utils/logger';

export interface ExplorationResult {
  chain: ChainKey;
  blockNumber: bigint;
  timestamp: Date;
  snapshot: WalletSnapshot;
  discoveries: Discovery[];
}

export interface WalletSnapshot {
  address: string;
  nativeBalance: string;
  nativeSymbol: string;
  txCount: number;
  isActive: boolean;
  walletAge: string;
}

export interface Discovery {
  type: 'balance' | 'activity' | 'timing' | 'fun_fact';
  title: string;
  description: string;
  rarity: number; // 1-5
}

class ExplorationService {
  private clients: Record<ChainKey, any>;

  constructor() {
    this.clients = {
      BSC_TESTNET: createPublicClient({
        chain: bscTestnet,
        transport: http(SUPPORTED_CHAINS.BSC_TESTNET.rpcUrl),
      }),
      ETH_SEPOLIA: createPublicClient({
        chain: sepolia,
        transport: http(SUPPORTED_CHAINS.ETH_SEPOLIA.rpcUrl),
      }),
      ZETACHAIN_ATHENS: createPublicClient({
        chain: {
          id: 7001,
          name: 'ZetaChain Athens',
          nativeCurrency: { name: 'ZETA', symbol: 'aZETA', decimals: 18 },
          rpcUrls: { default: { http: [SUPPORTED_CHAINS.ZETACHAIN_ATHENS.rpcUrl] } },
        } as any,
        transport: http(SUPPORTED_CHAINS.ZETACHAIN_ATHENS.rpcUrl),
      }),
    };
  }

  async pickRandomDestination(): Promise<{ chain: ChainKey; blockNumber: bigint }> {
    const chain = CHAIN_KEYS[Math.floor(Math.random() * CHAIN_KEYS.length)];
    const blockNumber = await this.pickRandomBlock(chain);
    logger.info(`Frog decided to visit ${chain} at block ${blockNumber}`);
    return { chain, blockNumber };
  }

  async pickRandomBlock(chain: ChainKey): Promise<bigint> {
    const client = this.clients[chain];
    try {
      const latestBlock = await client.getBlockNumber();
      const safeLatest = latestBlock - BigInt(100); // 预留一点缓冲
      const ranges = this.getInterestingRanges(chain, safeLatest);
      const selectedRange = ranges[Math.floor(Math.random() * ranges.length)];
      const rangeSize = selectedRange.end - selectedRange.start;
      const randomOffset = BigInt(Math.floor(Math.random() * Number(rangeSize)));
      return selectedRange.start + randomOffset;
    } catch (error) {
      logger.error(`Failed to pick random block for ${chain}: ${error}`);
      // 回退逻辑：返回一个根据链的历史估算的“安全”块号，确保旅行不中断
      const fallbacks: Record<ChainKey, bigint> = {
        BSC_TESTNET: BigInt(35000000),
        ETH_SEPOLIA: BigInt(5000000),
        ZETACHAIN_ATHENS: BigInt(4000000),
      };
      return fallbacks[chain] || BigInt(0);
    }
  }

  private getInterestingRanges(chain: ChainKey, latestBlock: bigint): { start: bigint; end: bigint }[] {
    const ranges = [];
    const step = latestBlock / BigInt(5);
    for (let i = 0; i < 5; i++) {
      ranges.push({
        start: step * BigInt(i),
        end: step * BigInt(i + 1),
      });
    }
    return ranges;
  }

  async explore(chain: ChainKey, blockNumber: bigint, targetAddress: string): Promise<ExplorationResult> {
    logger.info(`Exploring ${chain} block ${blockNumber} for wallet ${targetAddress}`);
    const client = this.clients[chain];
    const config = SUPPORTED_CHAINS[chain];

    const block = await client.getBlock({ blockNumber });
    const timestamp = new Date(Number(block.timestamp) * 1000);

    const snapshot = await this.getWalletSnapshot(client, targetAddress, blockNumber, config);
    const discoveries = this.generateDiscoveries(snapshot, timestamp, config);

    return { chain, blockNumber, timestamp, snapshot, discoveries };
  }

  private async getWalletSnapshot(
    client: any,
    address: string,
    blockNumber: bigint,
    config: typeof SUPPORTED_CHAINS[ChainKey]
  ): Promise<WalletSnapshot> {
    try {
      const balance = await client.getBalance({
        address: address as `0x${string}`,
        blockNumber,
      });

      const txCount = await client.getTransactionCount({
        address: address as `0x${string}`,
        blockNumber,
      });

      const isActive = txCount > 0;
      const walletAge = this.estimateWalletAge(txCount, blockNumber, config);

      return {
        address,
        nativeBalance: formatEther(balance),
        nativeSymbol: config.nativeSymbol,
        txCount,
        isActive,
        walletAge,
      };
    } catch (error) {
      logger.warn(`Failed to get wallet snapshot: ${error}`);
      return {
        address,
        nativeBalance: '0',
        nativeSymbol: config.nativeSymbol,
        txCount: 0,
        isActive: false,
        walletAge: '未知',
      };
    }
  }

  private estimateWalletAge(txCount: number, blockNumber: bigint, config: typeof SUPPORTED_CHAINS[ChainKey]): string {
    if (txCount === 0) return '可能是新钱包';
    if (txCount < 10) return '新手钱包';
    if (txCount < 50) return '有点经验的钱包';
    if (txCount < 200) return '老练的钱包';
    return '资深老钱包';
  }

  private generateDiscoveries(
    snapshot: WalletSnapshot,
    timestamp: Date,
    config: typeof SUPPORTED_CHAINS[ChainKey]
  ): Discovery[] {
    const discoveries: Discovery[] = [];
    const balance = parseFloat(snapshot.nativeBalance);
    const year = timestamp.getFullYear();

    // 余额相关发现
    if (balance === 0) {
      discoveries.push({
        type: 'balance',
        title: '空空的口袋',
        description: `这个钱包当时是空的，也许主人还没开始冒险呢`,
        rarity: 1,
      });
    } else if (balance < 0.1) {
      discoveries.push({
        type: 'balance',
        title: '小小的积蓄',
        description: `只有 ${balance.toFixed(4)} ${config.nativeSymbol}，是个节俭的小钱包`,
        rarity: 1,
      });
    } else if (balance > 100) {
      discoveries.push({
        type: 'balance',
        title: '发现巨鲸！',
        description: `天呐！余额竟然有 ${balance.toFixed(2)} ${config.nativeSymbol}！这是一个超级巨鲸！`,
        rarity: 5,
      });
    } else if (balance > 10) {
      discoveries.push({
        type: 'balance',
        title: '发现大户！',
        description: `哇！有 ${balance.toFixed(2)} ${config.nativeSymbol}！这是个富有的钱包`,
        rarity: 4,
      });
    } else {
      discoveries.push({
        type: 'balance',
        title: '普通的积蓄',
        description: `持有 ${balance.toFixed(4)} ${config.nativeSymbol}`,
        rarity: 2,
      });
    }

    // 活跃度发现
    if (snapshot.txCount === 0) {
      discoveries.push({
        type: 'activity',
        title: '安静的角落',
        description: '这个钱包还没发送过任何交易，像是在沉睡',
        rarity: 2,
      });
    } else if (snapshot.txCount > 100) {
      discoveries.push({
        type: 'activity',
        title: '活跃的老手',
        description: `已经有 ${snapshot.txCount} 笔交易了！这是个经验丰富的钱包`,
        rarity: 3,
      });
    }

    // 随机趣味发现
    if (Math.random() < 0.2) {
      const funFacts = [
        { title: '幸运数字', description: '这个区块号看起来很吉利呢！', rarity: 2 },
        { title: '路边的小花', description: '青蛙在路边发现了一朵小花', rarity: 1 },
      ];
      const randomFact = funFacts[Math.floor(Math.random() * funFacts.length)];
      discoveries.push({ type: 'fun_fact', ...randomFact });
    }

    return discoveries;
  }

  async getRandomTargetAddress(chain: ChainKey): Promise<string> {
    try {
      return await this.discoverLuckyAddress(chain);
    } catch (error) {
      logger.warn(`Lucky address discovery failed for ${chain}, fallback to default: ${error}`);
      const knownAddresses: Record<ChainKey, string[]> = {
        BSC_TESTNET: ['0x0000000000000000000000000000000000000000'],
        ETH_SEPOLIA: ['0x0000000000000000000000000000000000000000'],
        ZETACHAIN_ATHENS: ['0x0000000000000000000000000000000000000000'],
      };
      const addresses = knownAddresses[chain];
      return addresses[Math.floor(Math.random() * addresses.length)];
    }
  }

  /**
   * 核心逻辑：从链上实时抓取活跃钱包
   */
  async discoverLuckyAddress(chain: ChainKey): Promise<string> {
    logger.info(`Discovering lucky address on ${chain}...`);
    const client = this.clients[chain];
    
    // 1. 获取最新区块（带交易详情）
    const latestBlock = await client.getBlock({ includeTransactions: true });
    if (!latestBlock || !latestBlock.transactions || latestBlock.transactions.length === 0) {
      throw new Error('Empty block or no transactions');
    }

    // 2. 收集地址库
    const candidates = new Set<string>();
    for (const tx of latestBlock.transactions) {
      if (tx.from) candidates.add(tx.from.toLowerCase());
      if (tx.to) candidates.add(tx.to.toLowerCase());
    }

    const candidateList = Array.from(candidates);
    // 随机乱序
    candidateList.sort(() => Math.random() - 0.5);

    // 3. 验证并选择第一个合格的
    for (const addr of candidateList) {
      // 排除全零地址
      if (addr === '0x0000000000000000000000000000000000000000') continue;

      try {
        // 排除合约地址
        const code = await client.getBytecode({ address: addr as `0x${string}` });
        if (code && code !== '0x') continue;

        // 检查余额是否大于 0
        const balance = await client.getBalance({ address: addr as `0x${string}` });
        if (balance > BigInt(0)) {
          logger.info(`Found lucky address: ${addr} on ${chain}`);
          return addr;
        }
      } catch (e) {
        // 忽略检查失败的地址
        continue;
      }
    }

    throw new Error('No valid lucky address found in this block');
  }
}

export const explorationService = new ExplorationService();
