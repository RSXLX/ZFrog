// backend/src/services/travel/exploration.service.ts

import { createPublicClient, http, formatEther, formatUnits, parseAbiItem, decodeFunctionData } from 'viem';
import { bscTestnet, sepolia, polygonMumbai, arbitrumGoerli } from 'viem/chains';
import { SUPPORTED_CHAINS, ChainKey, CHAIN_KEYS, getChainConfig } from '../../config/chains';
import { logger } from '../../utils/logger';

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
}

export interface NetworkStatus {
  gasPrice: string; // In Gwei
  baseFee?: string;
}

export interface Discovery {
  type: 'balance' | 'activity' | 'timing' | 'fun_fact' | 'cross_chain' | 'token_holding' | 'tx_action' | 'gas_price';
  title: string;
  description: string;
  rarity: number; // 1-5
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

    const block = await client.getBlock({ blockNumber, includeTransactions: true });
    const timestamp = new Date(Number(block.timestamp) * 1000);

    // 1. Snapshot with Tokens
    const snapshot = await this.getWalletSnapshot(client, targetAddress, blockNumber, config);

    // 2. Transaction Analysis
    let transactionContext: TransactionContext | undefined;
    const targetTx = block.transactions.find((tx: any) => 
      tx.from.toLowerCase() === targetAddress.toLowerCase() || 
      (tx.to && tx.to.toLowerCase() === targetAddress.toLowerCase())
    );
    
    if (targetTx) {
      transactionContext = this.analyzeTransaction(targetTx);
    }

    // 3. Network Status
    const networkStatus: NetworkStatus = {
      gasPrice: block.baseFeePerGas ? formatUnits(block.baseFeePerGas, 9) : 'Unknown', // Gwei
    };

    // 4. Generate Discoveries
    const discoveries = this.generateDiscoveries(snapshot, timestamp, config, chain, transactionContext, networkStatus);

    return { chain, blockNumber, timestamp, snapshot, discoveries, transactionContext, networkStatus };
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
      to: tx.to
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

  async getRandomTargetAddress(chain: ChainKey): Promise<string> {
    for (let attempt = 1; attempt <= this.MAX_RETRY; attempt++) {
      try {
        logger.info(`Attempt ${attempt}/${this.MAX_RETRY} to discover address on ${chain}`);
        const address = await this.discoverLuckyAddress(chain);
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

  async discoverLuckyAddress(chain: ChainKey): Promise<string> {
    const client = this.clients[chain];
    const latest = await client.getBlockNumber();
    const randomBlockOffset = BigInt(Math.floor(Math.random() * 50)); // Keep it recent
    const targetBlockNum = latest - randomBlockOffset;

    const block = await client.getBlock({ blockNumber: targetBlockNum, includeTransactions: true });
    if (!block || !block.transactions || block.transactions.length === 0) {
      throw new Error('Empty block');
    }

    const txs = block.transactions; 
    const randomTx = txs[Math.floor(Math.random() * txs.length)];
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
