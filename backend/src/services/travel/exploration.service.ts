// backend/src/services/travel/exploration.service.ts

import { createPublicClient, http, formatEther, formatUnits, parseAbiItem, decodeFunctionData } from 'viem';
import { bscTestnet, sepolia, polygonMumbai, arbitrumGoerli } from 'viem/chains';
import { SUPPORTED_CHAINS, ChainKey, CHAIN_KEYS, getChainConfig } from '../../config/chains';
import { logger } from '../../utils/logger';
import { blockExplorerService, WalletInfo } from '../block-explorer.service';

// Minimal ERC20 ABI for balance checking
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }]
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }]
  }
] as const;

// Common function signatures for decoding
const KNOWN_SELECTORS: Record<string, string> = {
  '0xa9059cbb': 'transfer',
  '0x095ea7b3': 'approve',
  '0x23b872dd': 'transferFrom',
  '0x42842e0e': 'safeTransferFrom',
  '0x38ed1739': 'swapExactTokensForTokens',
  '0x7ff36ab5': 'swapExactETHForTokens',
  '0x18cbafe5': 'swapExactTokensForETH',
  '0xd0e30db0': 'deposit',  // WETH deposit
  '0x2e1a7d4d': 'withdraw', // WETH withdraw
  '0x40c10f19': 'mint',
  '0xa0712d68': 'mint',     // Another mint signature
};

const FOOTPRINT_CONTRACTS: Record<string, string> = {
  BSC_TESTNET: '0x9571ce7FdaBfe3A234dABE3eaa01704A62AF643e',
  ETH_SEPOLIA: '0x319421300114065F601a0103ec1eC3AB2652C5Da',
  ZETACHAIN_ATHENS: '',
  POLYGON_MUMBAI: '',
  ARBITRUM_GOERLI: '',
};

export interface ExplorationResult {
  chain: ChainKey;
  blockNumber: bigint;
  timestamp: Date;
  snapshot: WalletSnapshot;
  discoveries: Discovery[];
  transactionContext?: TransactionContext; // New: Details about the specific tx
  networkStatus?: NetworkStatus;           // New: Gas info etc.
}

export interface WalletSnapshot {
  address: string;
  nativeBalance: string;
  nativeSymbol: string;
  txCount: number;
  isActive: boolean;
  walletAge: string;
  isContract: boolean;
  tokens: TokenBalance[]; // New: ERC20 tokens found
}

export interface TokenBalance {
  symbol: string;
  balance: string;
  address: string;
}

export interface TransactionContext {
  hash: string;
  method: string; // e.g. "transfer", "swap", "unknown"
  value: string;  // Native value sent
  to: string;     // Target address (contract?)
  from: string;
}

export interface NetworkStatus {
  gasPrice: string; // In Gwei
  baseFee?: string;
}

export interface FootprintEvent {
  frogId: number;
  location: string;
  observation: string;
  timestamp: Date;
  txHash: string;
  blockNumber: string;
}

export interface Discovery {
  type: 'balance' | 'activity' | 'timing' | 'fun_fact' | 'cross_chain' | 'token_holding' | 'tx_action' | 'gas_price';
  title: string;
  description: string;
  rarity: number; // 1-5
  metadata?: any;
}

class ExplorationService {
  private clients: Record<ChainKey, any>;
  
  private readonly MAX_RETRY = 3;
  private readonly RETRY_DELAY = 2000;

  constructor() {
    const zetachainAthens = {
      id: 7001,
      name: 'ZetaChain Athens',
      nativeCurrency: { name: 'ZETA', symbol: 'aZETA', decimals: 18 },
      rpcUrls: { default: { http: [SUPPORTED_CHAINS.ZETACHAIN_ATHENS.rpcUrl] } },
    } as const;

    this.clients = {
      BSC_TESTNET: createPublicClient({ chain: bscTestnet, transport: http(SUPPORTED_CHAINS.BSC_TESTNET.rpcUrl) }),
      ETH_SEPOLIA: createPublicClient({ chain: sepolia, transport: http(SUPPORTED_CHAINS.ETH_SEPOLIA.rpcUrl) }),
      ZETACHAIN_ATHENS: createPublicClient({ chain: zetachainAthens as any, transport: http(SUPPORTED_CHAINS.ZETACHAIN_ATHENS.rpcUrl) }),
      POLYGON_MUMBAI: createPublicClient({ chain: polygonMumbai, transport: http(SUPPORTED_CHAINS.POLYGON_MUMBAI.rpcUrl) }),
      ARBITRUM_GOERLI: createPublicClient({ chain: arbitrumGoerli, transport: http(SUPPORTED_CHAINS.ARBITRUM_GOERLI.rpcUrl) }),
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
      const safeLatest = latestBlock - BigInt(5); // Very close to tip
      const ranges = this.getInterestingRanges(chain, safeLatest);
      const selectedRange = ranges[Math.floor(Math.random() * ranges.length)];
      return selectedRange.start + BigInt(Math.floor(Math.random() * Number(selectedRange.end - selectedRange.start)));
    } catch (error) {
      logger.error(`Failed to pick random block for ${chain}: ${error}`);
      return this.getFallbackBlockNumber(chain);
    }
  }

  private getInterestingRanges(chain: ChainKey, latestBlock: bigint): { start: bigint; end: bigint }[] {
    // Look at very recent blocks (last 50) to avoid archive node errors on free tier
    const depth = BigInt(50); 
    const start = latestBlock > depth ? latestBlock - depth : BigInt(0);
    return [{ start, end: latestBlock }];
  }
  
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
    
    const timestamp = new Date();
    let snapshot: WalletSnapshot;
    let transactionContext: TransactionContext | undefined;
    let networkStatus: NetworkStatus = { gasPrice: 'Unknown' };
    
    // Map chain key to block explorer format
    const explorerChainMap: Record<string, string> = {
      'BSC_TESTNET': 'BSC_TESTNET',
      'ETH_SEPOLIA': 'ETH_SEPOLIA',
    };
    const explorerChain = explorerChainMap[chain];
    
    // Try Block Explorer API first (richer data, less RPC)
    if (explorerChain) {
      try {
        logger.info(`[Exploration] Using Block Explorer API for ${chain}`);
        const walletInfo = await blockExplorerService.getWalletInfo(explorerChain, targetAddress);
        
        // Convert WalletInfo to WalletSnapshot format
        snapshot = {
          address: targetAddress,
          nativeBalance: walletInfo.nativeBalanceFormatted,
          nativeSymbol: config.nativeSymbol,
          txCount: walletInfo.recentTxCount,
          isActive: walletInfo.recentTxCount > 0,
          walletAge: walletInfo.lastActivity ? this.formatTimestamp(walletInfo.lastActivity) : '未知',
          isContract: walletInfo.isContract,
          tokens: walletInfo.tokens.map(t => ({
            symbol: t.symbol,
            balance: t.balance,
            address: '', // Not available from explorer
          })),
        };
        
        // Generate enhanced discoveries from explorer data
        const discoveries = this.generateEnhancedDiscoveries(walletInfo, config, chain);
        
        return { chain, blockNumber, timestamp, snapshot, discoveries, transactionContext, networkStatus };
        
      } catch (explorerError) {
        logger.warn(`[Exploration] Block Explorer API failed, falling back to RPC: ${explorerError}`);
      }
    }
    
    // Fallback to RPC (original logic)
    try {
      const block = await client.getBlock({ blockNumber, includeTransactions: true });
      const blockTimestamp = new Date(Number(block.timestamp) * 1000);

      // 1. Snapshot with Tokens
      snapshot = await this.getWalletSnapshot(client, targetAddress, blockNumber, config);

      // 2. Transaction Analysis
      const targetTx = block.transactions.find((tx: any) => 
        tx.from.toLowerCase() === targetAddress.toLowerCase() || 
        (tx.to && tx.to.toLowerCase() === targetAddress.toLowerCase())
      );
      
      if (targetTx) {
        transactionContext = this.analyzeTransaction(targetTx);
      }

      // 3. Network Status
      networkStatus = {
        gasPrice: block.baseFeePerGas ? formatUnits(block.baseFeePerGas, 9) : 'Unknown',
      };

      // 4. Generate Discoveries
      const discoveries = this.generateDiscoveries(snapshot, blockTimestamp, config, chain, transactionContext, networkStatus);

      return { chain, blockNumber, timestamp: blockTimestamp, snapshot, discoveries, transactionContext, networkStatus };
    } catch (rpcError) {
      logger.error(`[Exploration] RPC also failed: ${rpcError}`);
      // Return minimal result
      return {
        chain,
        blockNumber,
        timestamp,
        snapshot: {
          address: targetAddress,
          nativeBalance: '0',
          nativeSymbol: config.nativeSymbol,
          txCount: 0,
          isActive: false,
          walletAge: '未知',
          isContract: false,
          tokens: [],
        },
        discoveries: [{
          type: 'fun_fact',
          title: '探索失败',
          description: '这片区域被迷雾笼罩，什么也看不清...',
          rarity: 1,
        }],
      };
    }
  }

  /**
   * Generate enhanced discoveries from Block Explorer API data
   */
  private generateEnhancedDiscoveries(walletInfo: WalletInfo, config: any, chain: ChainKey): Discovery[] {
    const discoveries: Discovery[] = [];
    
    // 1. Balance discovery
    const balanceNum = parseFloat(walletInfo.nativeBalanceFormatted);
    if (balanceNum > 0) {
      let rarity = 1;
      if (balanceNum > 10) rarity = 3;
      if (balanceNum > 100) rarity = 5;
      
      discoveries.push({
        type: 'balance',
        title: '💰 发现财富',
        description: `这个钱包有 ${walletInfo.nativeBalanceFormatted}！`,
        rarity,
      });
    } else {
      discoveries.push({
        type: 'balance',
        title: '💸 空钱包',
        description: '这个钱包空空如也，主人可能把钱都转走了...',
        rarity: 1,
      });
    }
    
    // 2. Token discoveries
    if (walletInfo.tokens.length > 0) {
      const tokenNames = walletInfo.tokens.map(t => t.symbol).join(', ');
      discoveries.push({
        type: 'token_holding',
        title: '🪙 代币收藏',
        description: `发现持有代币: ${tokenNames}`,
        rarity: Math.min(walletInfo.tokens.length + 1, 4),
      });
    }
    
    // 3. NFT discoveries
    if (walletInfo.nfts.length > 0) {
      const nftList = walletInfo.nfts.slice(0, 3).map(n => `${n.name}#${n.tokenId}`).join(', ');
      discoveries.push({
        type: 'fun_fact',
        title: '🖼️ NFT 收藏家',
        description: `拥有 ${walletInfo.nfts.length} 个 NFT！包括: ${nftList}`,
        rarity: Math.min(walletInfo.nfts.length + 2, 5),
      });
    }
    
    // 4. Activity discovery
    if (walletInfo.lastActivity) {
      const lastDate = new Date(walletInfo.lastActivity);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 0) {
        discoveries.push({
          type: 'activity',
          title: '⚡ 活跃用户',
          description: '今天刚有过活动，是个活跃的链上居民！',
          rarity: 3,
        });
      } else if (daysDiff < 7) {
        discoveries.push({
          type: 'activity',
          title: '🔥 近期活跃',
          description: `${daysDiff} 天前有过活动`,
          rarity: 2,
        });
      } else {
        discoveries.push({
          type: 'activity',
          title: '😴 沉睡账户',
          description: `已经 ${daysDiff} 天没有动静了...`,
          rarity: 1,
        });
      }
    }
    
    // 5. Contract discovery
    if (walletInfo.isContract) {
      discoveries.push({
        type: 'fun_fact',
        title: '🤖 智能合约',
        description: '这不是普通钱包，而是一个智能合约！',
        rarity: 4,
      });
    }
    
    return discoveries;
  }
  
  private formatTimestamp(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
    return `${Math.floor(diffDays / 30)}个月前`;
  }

  private async getWalletSnapshot(
    client: any,
    address: string,
    blockNumber: bigint,
    config: any
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
      
      // Retrieve tokens
      const tokens = await this.scanTokenBalances(client, address, config);

      return {
        address,
        nativeBalance: formatEther(balance),
        nativeSymbol: config.nativeSymbol,
        txCount,
        isActive,
        walletAge,
        isContract,
        tokens,
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
        tokens: [],
      };
    }
  }

  private async scanTokenBalances(client: any, address: string, config: any): Promise<TokenBalance[]> {
    const tokens: TokenBalance[] = [];
    if (!config.commonTokens) return tokens;

    for (const [symbol, tokenAddr] of Object.entries(config.commonTokens)) {
      try {
        const balance = await client.readContract({
          address: tokenAddr as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address as `0x${string}`]
        });

        if (balance > BigInt(0)) {
           const decimals = await client.readContract({
             address: tokenAddr as `0x${string}`,
             abi: ERC20_ABI,
             functionName: 'decimals',
           });
           
           const formatted = formatUnits(balance, decimals);
           if (parseFloat(formatted) > 0.0001) {
             tokens.push({
               symbol,
               balance: parseFloat(formatted).toFixed(4),
               address: tokenAddr as string
             });
           }
        }
      } catch (err) {
        // Ignore failures
      }
    }
    return tokens;
  }

  private analyzeTransaction(tx: any): TransactionContext {
    let method = 'unknown';
    const input = tx.input;

    if (input && input.length >= 10) {
      const selector = input.slice(0, 10);
      method = KNOWN_SELECTORS[selector] || 'contract_interaction';
    } else if (input === '0x') {
      method = 'native_transfer';
    }

    return {
      hash: tx.hash,
      method,
      value: formatEther(tx.value),
      to: tx.to,
      from: tx.from
    };
  }

  private estimateWalletAge(txCount: number, blockNumber: bigint, config: any): string {
    if (txCount === 0) return '可能是新钱包';
    if (txCount < 10) return '新手钱包';
    if (txCount < 50) return '有点经验的钱包';
    if (txCount < 200) return '老练的钱包';
    return '资深老钱包';
  }

  private generateDiscoveries(
    snapshot: WalletSnapshot,
    timestamp: Date,
    config: any,
    chain: ChainKey,
    txContext?: TransactionContext,
    netStatus?: NetworkStatus
  ): Discovery[] {
    const discoveries: Discovery[] = [];
    const balance = parseFloat(snapshot.nativeBalance);

    // Cross-chain
    if (chain !== 'ZETACHAIN_ATHENS') {
      discoveries.push({
        type: 'cross_chain',
        title: `跨链到${config.displayName}！`,
        description: `青蛙穿越了 ZetaChain 的彩虹桥，来到了${config.scenery}`,
        rarity: 3,
      });
    }

    // Balance
    if (balance === 0) {
      discoveries.push({ type: 'balance', title: '空空的口袋', description: '这个钱包当时是空的', rarity: 1 });
    } else if (balance > 100) {
      discoveries.push({ type: 'balance', title: '发现巨鲸！', description: `天呐！余额有 ${balance.toFixed(2)} ${config.nativeSymbol}！`, rarity: 5 });
    } else if (balance > 10) {
      discoveries.push({ type: 'balance', title: '发现大户！', description: `有 ${balance.toFixed(2)} ${config.nativeSymbol}！`, rarity: 4 });
    } else {
      discoveries.push({ type: 'balance', title: '普通积蓄', description: `持有 ${balance.toFixed(4)} ${config.nativeSymbol}`, rarity: 2 });
    }

    // Token Holdings
    if (snapshot.tokens.length > 0) {
      const tokenNames = snapshot.tokens.map(t => `${t.balance} ${t.symbol}`).join(', ');
      discoveries.push({
        type: 'token_holding',
        title: '发现代币藏匿点',
        description: `竟然还藏着 ${tokenNames}`,
        rarity: 4
      });
    }

    // Transaction Action
    if (txContext) {
      if (txContext.method === 'swap' || txContext.method.includes('swap')) {
        discoveries.push({ type: 'tx_action', title: '正在交易', description: '正好撞见他在去中心化交易所换币！', rarity: 4 });
      } else if (txContext.method === 'mint') {
        discoveries.push({ type: 'tx_action', title: '正在铸造', description: '他在铸造什么新奇的 NFT 吗？', rarity: 4 });
      } else if (txContext.method === 'transfer') {
        discoveries.push({ type: 'tx_action', title: '正在转账', description: '看到一笔转账飞过~', rarity: 2 });
      } else if (parseFloat(txContext.value) > 1.0) {
        discoveries.push({ type: 'tx_action', title: '大额交易', description: `哇！一笔 ${parseFloat(txContext.value).toFixed(2)} ${config.nativeSymbol} 的交易！`, rarity: 5 });
      }
    }

    // Gas Price
    if (netStatus && netStatus.gasPrice !== 'Unknown') {
      const gas = parseFloat(netStatus.gasPrice);
      if (gas > 50) {
        discoveries.push({ type: 'gas_price', title: '网络拥堵', description: `这里好挤啊，Gas费高达 ${gas} Gwei！`, rarity: 2 });
      } else if (gas < 5) {
        discoveries.push({ type: 'gas_price', title: '畅通无阻', description: '网络很顺畅，Gas费好便宜！', rarity: 1 });
      }
    }

    // Activity
    if (snapshot.txCount > 100) {
      discoveries.push({ type: 'activity', title: '活跃老手', description: `已有 ${snapshot.txCount} 笔交易！`, rarity: 3 });
    }

    // Fun facts
    if (Math.random() < 0.2) {
      const funFacts: Discovery[] = [
        { title: '幸运数字', description: '这个区块号看起来很吉利呢！', rarity: 2, type: 'fun_fact' },
        { title: '路边小花', description: '青蛙在路边发现了一朵小花', rarity: 1, type: 'fun_fact' },
        { title: `${config.vibe}的气息`, description: `这里的空气充满了${config.vibe}的气息`, rarity: 2, type: 'fun_fact' },
      ];
      discoveries.push(funFacts[Math.floor(Math.random() * funFacts.length)]);
    }

    return discoveries;
  }

  /**
   * Scan the latest block for ambient network activity (contracts, active wallets, behaviors)
   */
  async scanLatestBlock(chain: ChainKey): Promise<Discovery[]> {
    try {
      const client = this.clients[chain];
      const latest = await client.getBlockNumber();
      const block = await client.getBlock({ blockNumber: latest, includeTransactions: true });
      
      if (!block || !block.transactions || block.transactions.length === 0) {
        return [];
      }

      const discoveries: Discovery[] = [];
      const txs = block.transactions;
      
      // Analyze up to 2 random transactions to find interesting activity
      const sampleSize = Math.min(2, txs.length);
      const indices = new Set<number>();
      while (indices.size < sampleSize) {
        indices.add(Math.floor(Math.random() * txs.length));
      }

      for (const idx of indices) {
        const tx = txs[idx];
        const context = this.analyzeTransaction(tx); // Reuse existing analyzer
        // 1. Transaction Activity
        const config = getChainConfig(chain);
        const isContractInteraction = context.method !== 'unknown' && context.method !== 'native_transfer';
        
        let discovery: Discovery = {
             type: 'tx_action',
             title: '网络活动',
             description: `观察到地址 ${tx.from.slice(0, 6)}... 的行为`,
             rarity: 1,
             metadata: { 
                 txHash: context.hash, 
                 from: context.from, 
                 to: context.to,
                 address: context.to || context.from, // Primary focus address
                 isContract: false 
             }
        };

        if (isContractInteraction) {
            discovery.title = '智能合约交互';
            discovery.description = `正在调用合约 ${context.method} 方法`;
            discovery.rarity = 3;
            // Explicitly mark as contract
            discovery.metadata = {
                ...discovery.metadata,
                isContract: true,
                address: context.to, // The contract address
                method: context.method
            };
        } else if (context.method === 'native_transfer') {
            discovery.title = '资产流动';
            discovery.description = `监测到 ${parseFloat(context.value).toFixed(4)} ${config.nativeSymbol} 的转账`;
            discovery.rarity = 2;
        }

        discoveries.push(discovery);
      }

      return discoveries;
    } catch (error) {
      logger.error(`Scan latest block failed for ${chain}:`, error);
      return [];
    }
  }

  async scanFootprints(chain: ChainKey, frogId: number, fromBlock: bigint): Promise<FootprintEvent[]> {
    const footprintAddress = FOOTPRINT_CONTRACTS[chain];
    if (!footprintAddress) return [];

    try {
      const client = this.clients[chain];
      const latestBlock = await client.getBlockNumber();
      // Ensure fromBlock is within reasonable range (e.g. last 1000 blocks to avoid RPC errors)
      let startBlock = fromBlock;
      if (latestBlock - startBlock > BigInt(1000) || startBlock === BigInt(0)) {
          startBlock = latestBlock - BigInt(1000);
          if (startBlock < BigInt(0)) startBlock = BigInt(0);
      }
      
      const logs = await client.getLogs({
        address: footprintAddress as `0x${string}`,
        event: parseAbiItem('event FootprintLeft(uint256 indexed frogId, address indexed location, string observation, uint256 timestamp)'),
        args: { frogId: BigInt(frogId) },
        fromBlock: startBlock,
        toBlock: latestBlock
      });

      return logs.map((log: any) => ({
        frogId: Number(log.args.frogId),
        location: log.args.location,
        observation: log.args.observation,
        timestamp: new Date(Number(log.args.timestamp) * 1000),
        txHash: log.transactionHash,
        blockNumber: log.blockNumber.toString()
      }));
    } catch (error) {
      logger.warn(`Failed to scan footprints on ${chain}: ${error}`);
      return [];
    }
  }

  async getRandomTargetAddress(chain: ChainKey, excludeAddresses: string[] = []): Promise<string> {
    const excludeSet = new Set(excludeAddresses.map(a => a.toLowerCase()));
    
    for (let attempt = 1; attempt <= this.MAX_RETRY; attempt++) {
      try {
        logger.info(`Attempt ${attempt}/${this.MAX_RETRY} to discover address on ${chain}`);
        const address = await this.discoverLuckyAddress(chain, excludeSet);
        if (address && address !== '0x0000000000000000000000000000000000000000') {
          return address;
        }
      } catch (error) {
        // Silent retry
      }
    }
    logger.warn(`All attempts failed for ${chain}, using fallback address`);
    return this.getFallbackAddress(chain);
  }

  async discoverLuckyAddress(chain: ChainKey, excludeSet: Set<string> = new Set()): Promise<string> {
    const client = this.clients[chain];
    const latest = await client.getBlockNumber();
    const randomBlockOffset = BigInt(Math.floor(Math.random() * 50)); // Keep it recent
    const targetBlockNum = latest - randomBlockOffset;

    const block = await client.getBlock({ blockNumber: targetBlockNum, includeTransactions: true });
    if (!block || !block.transactions || block.transactions.length === 0) {
      throw new Error('Empty block');
    }

    const txs = block.transactions;
    
    // Filter out excluded addresses
    const validTxs = txs.filter((tx: any) => !excludeSet.has(tx.from.toLowerCase()));
    
    if (validTxs.length === 0) {
      // If all addresses are excluded, just pick from all txs
      logger.warn(`[Exploration] All addresses in block excluded, using any address`);
      const randomTx = txs[Math.floor(Math.random() * txs.length)];
      return randomTx.from;
    }
    
    const randomTx = validTxs[Math.floor(Math.random() * validTxs.length)];
    return randomTx.from;
  }

  async validateAddress(address: string, chain: ChainKey): Promise<boolean> {
     return true;
  }

  public getFallbackAddress(chain: ChainKey): string {
    const fallbackAddresses: Record<ChainKey, string[]> = {
      BSC_TESTNET: ['0xCe2CC46682E9C6D5f174aF598fb4931a9c0bE68e'],
      ETH_SEPOLIA: ['0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9'],
      ZETACHAIN_ATHENS: ['0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf'],
      POLYGON_MUMBAI: ['0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889'],
      ARBITRUM_GOERLI: ['0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3'],
    };
    const addresses = fallbackAddresses[chain];
    return addresses[Math.floor(Math.random() * addresses.length)];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const explorationService = new ExplorationService();
