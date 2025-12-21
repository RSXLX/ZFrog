// backend/src/services/travel/exploration.service.ts

import { createPublicClient, http, formatEther } from 'viem';
import { bscTestnet, sepolia, polygonMumbai, arbitrumGoerli } from 'viem/chains';
import { SUPPORTED_CHAINS, ChainKey, CHAIN_KEYS, getChainConfig } from '../../config/chains';
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
  isContract: boolean;  // 新增
}

export interface Discovery {
  type: 'balance' | 'activity' | 'timing' | 'fun_fact' | 'cross_chain';
  title: string;
  description: string;
  rarity: number; // 1-5
}

class ExplorationService {
  private clients: Record<ChainKey, any>;
  
  // 新增：重试配置
  private readonly MAX_RETRY = 3;
  private readonly RETRY_DELAY = 2000;

  constructor() {
    // 定义 ZetaChain Athens 链对象
    const zetachainAthens = {
      id: 7001,
      name: 'ZetaChain Athens',
      nativeCurrency: { name: 'ZETA', symbol: 'aZETA', decimals: 18 },
      rpcUrls: { default: { http: [SUPPORTED_CHAINS.ZETACHAIN_ATHENS.rpcUrl] } },
    } as const;

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
        chain: zetachainAthens as any,
        transport: http(SUPPORTED_CHAINS.ZETACHAIN_ATHENS.rpcUrl),
      }),
      // 新增链的客户端
      POLYGON_MUMBAI: createPublicClient({
        chain: polygonMumbai,
        transport: http(SUPPORTED_CHAINS.POLYGON_MUMBAI.rpcUrl),
      }),
      ARBITRUM_GOERLI: createPublicClient({
        chain: arbitrumGoerli,
        transport: http(SUPPORTED_CHAINS.ARBITRUM_GOERLI.rpcUrl),
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
        POLYGON_MUMBAI: BigInt(40000000),
        ARBITRUM_GOERLI: BigInt(30000000),
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
  
  // 新增：备用区块号
  private getFallbackBlockNumber(chain: ChainKey): bigint {
    const fallbacks: Record<ChainKey, bigint> = {
      BSC_TESTNET: BigInt(35000000),
      ETH_SEPOLIA: BigInt(5000000),
      ZETACHAIN_ATHENS: BigInt(4000000),
      POLYGON_MUMBAI: BigInt(40000000),
      ARBITRUM_GOERLI: BigInt(30000000),
    };
    return fallbacks[chain] || BigInt(0);
  }

  async explore(chain: ChainKey, blockNumber: bigint, targetAddress: string): Promise<ExplorationResult> {
    logger.info(`Exploring ${chain} block ${blockNumber} for wallet ${targetAddress}`);
    const client = this.clients[chain];
    const config = SUPPORTED_CHAINS[chain];

    const block = await client.getBlock({ blockNumber });
    const timestamp = new Date(Number(block.timestamp) * 1000);

    const snapshot = await this.getWalletSnapshot(client, targetAddress, blockNumber, config);
    const discoveries = this.generateDiscoveries(snapshot, timestamp, config, chain);

    return { chain, blockNumber, timestamp, snapshot, discoveries };
  }

  private async getWalletSnapshot(
    client: any,
    address: string,
    blockNumber: bigint,
    config: typeof SUPPORTED_CHAINS[ChainKey]
  ): Promise<WalletSnapshot> {
    try {
      const [balance, txCount, code] = await Promise.all([
        client.getBalance({ address: address as `0x${string}`, blockNumber }),
        client.getTransactionCount({ address: address as `0x${string}`, blockNumber }),
        client.getBytecode({ address: address as `0x${string}` }),
      ]);

      const isContract = code !== undefined && code !== '0x';
      const isActive = txCount > 0;
      const walletAge = this.estimateWalletAge(txCount, blockNumber, config);

      return {
        address,
        nativeBalance: formatEther(balance),
        nativeSymbol: config.nativeSymbol,
        txCount,
        isActive,
        walletAge,
        isContract,
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
        isContract: false,
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
    config: typeof SUPPORTED_CHAINS[ChainKey],
    chain: ChainKey
  ): Discovery[] {
    const discoveries: Discovery[] = [];
    const balance = parseFloat(snapshot.nativeBalance);

    // 新增：跨链发现
    if (chain !== 'ZETACHAIN_ATHENS') {
      discoveries.push({
        type: 'cross_chain',
        title: `跨链到${config.displayName}！`,
        description: `青蛙穿越了 ZetaChain 的彩虹桥，来到了${config.scenery}`,
        rarity: 3,
      });
    }

    // 余额发现
    if (balance === 0) {
      discoveries.push({ type: 'balance', title: '空空的口袋', description: '这个钱包当时是空的', rarity: 1 });
    } else if (balance > 100) {
      discoveries.push({ type: 'balance', title: '发现巨鲸！', description: `天呐！余额有 ${balance.toFixed(2)} ${config.nativeSymbol}！`, rarity: 5 });
    } else if (balance > 10) {
      discoveries.push({ type: 'balance', title: '发现大户！', description: `有 ${balance.toFixed(2)} ${config.nativeSymbol}！`, rarity: 4 });
    } else {
      discoveries.push({ type: 'balance', title: '普通积蓄', description: `持有 ${balance.toFixed(4)} ${config.nativeSymbol}`, rarity: 2 });
    }

    // 活跃度发现
    if (snapshot.txCount > 100) {
      discoveries.push({ type: 'activity', title: '活跃老手', description: `已有 ${snapshot.txCount} 笔交易！`, rarity: 3 });
    }

    // 趣味发现
    if (Math.random() < 0.2) {
      const funFacts = [
        { title: '幸运数字', description: '这个区块号看起来很吉利呢！', rarity: 2 },
        { title: '路边小花', description: '青蛙在路边发现了一朵小花', rarity: 1 },
        { title: `${config.vibe}的气息`, description: `这里的空气充满了${config.vibe}的气息`, rarity: 2 },
      ];
      discoveries.push({ type: 'fun_fact', ...funFacts[Math.floor(Math.random() * funFacts.length)] });
    }

    return discoveries;
  }

  /**
   * 核心方法：获取随机目标地址（带重试）
   */
  async getRandomTargetAddress(chain: ChainKey): Promise<string> {
    for (let attempt = 1; attempt <= this.MAX_RETRY; attempt++) {
      try {
        logger.info(`Attempt ${attempt}/${this.MAX_RETRY} to discover address on ${chain}`);
        const address = await this.discoverLuckyAddress(chain);
        
        // 验证地址不是零地址
        if (address && address !== '0x0000000000000000000000000000000000000000') {
          return address;
        }
      } catch (error) {
        logger.warn(`Attempt ${attempt} failed for ${chain}: ${error}`);
        if (attempt < this.MAX_RETRY) {
          await this.delay(this.RETRY_DELAY * attempt);
        }
      }
    }
    
    // 使用备用地址而不是零地址
    logger.warn(`All attempts failed for ${chain}, using fallback address`);
    return this.getFallbackAddress(chain);
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

  /**
   * 验证地址是否有效（有足够的交易历史）
   */
  async validateAddress(address: string, chain: ChainKey): Promise<boolean> {
    try {
      const client = this.clients[chain];
      
      // 检查1：不是合约地址
      const code = await client.getBytecode({ address: address as `0x${string}` });
      if (code && code !== '0x') {
        logger.warn(`⚠️ ${address} is a contract, skipping`);
        return false;
      }
      
      // 检查2：有余额
      const balance = await client.getBalance({ address: address as `0x${string}` });
      if (balance <= BigInt(0)) {
        logger.warn(`⚠️ ${address} has zero balance, skipping`);
        return false;
      }
      
      // 检查3：有交易历史（通过 nonce）
      const nonce = await client.getTransactionCount({ address: address as `0x${string}` });
      if (nonce < 5) {
        logger.warn(`⚠️ ${address} has only ${nonce} transactions, skipping`);
        return false;
      }
      
      logger.info(`✅ ${address} validation passed (nonce: ${nonce})`);
      return true;
      
    } catch (error) {
      logger.error(`Validation error for ${address}: ${error}`);
      return false;
    }
  }

  /**
   * 获取备用地址
   */
  public getFallbackAddress(chain: ChainKey): string {
    // 使用每条链上的知名测试地址
    const fallbackAddresses: Record<ChainKey, string[]> = {
      BSC_TESTNET: [
        '0xCe2CC46682E9C6D5f174aF598fb4931a9c0bE68e', // PancakeSwap Router
        '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', // WBNB
      ],
      ETH_SEPOLIA: [
        '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', // WETH
        '0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008', // Uniswap
      ],
      ZETACHAIN_ATHENS: [
        '0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf', // zETH
        '0xd97B1de3619ed2c6BEb3860147E30cA8a7dC9891', // zBTC
      ],
      POLYGON_MUMBAI: [
        '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889', // WMATIC
        '0xE097d6B3100777DC31B34dC2c58fB524C2e76921', // Uniswap
      ],
      ARBITRUM_GOERLI: [
        '0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3', // WETH
        '0x4A2ba922052bA54e29c5417bC979Daaf7D5Fe4f4', // Uniswap
      ],
    };

    const addresses = fallbackAddresses[chain];
    return addresses[Math.floor(Math.random() * addresses.length)];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const explorationService = new ExplorationService();
