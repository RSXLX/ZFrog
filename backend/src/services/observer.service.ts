import { createPublicClient, http, parseAbiItem, formatEther, defineChain } from 'viem';
import { mainnet, polygon, bsc } from 'viem/chains';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface ObservationResult {
  walletAddress: string;
  chainId: number;
  transactions: TransactionSummary[];
  totalTxCount: number;
  totalValueWei: bigint;
  notableEvents: NotableEvent[];
  observedFrom: Date;
  observedTo: Date;
  nativeBalance?: string;  // 新增
  protocols?: string[];   // 新增
}

export interface TransactionSummary {
  hash: string;
  timestamp: number;
  type: 'send' | 'receive' | 'contract';
  value: string;
  to?: string;
  from?: string;
  method?: string;
}

export interface NotableEvent {
  type: 'large_transfer' | 'nft_activity' | 'defi_swap' | 'contract_deploy';
  description: string;
  txHash: string;
  timestamp: number;
}

class ObserverService {
  private ethClient;
  private polygonClient;
  private bscClient;
  private zetaClient;
  
  constructor() {
    this.ethClient = createPublicClient({
      chain: mainnet,
      transport: http(config.ALCHEMY_ETH_URL),
    });
    this.polygonClient = createPublicClient({
      chain: polygon,
      transport: http('https://polygon-rpc.com'), // Public RPC
    });
    this.bscClient = createPublicClient({
      chain: bsc,
      transport: http('https://binance.web3api.com'), // Public RPC
    });
    
    // Define ZetaChain Athens
    const zetachainAthens = defineChain({
        id: 7001,
        name: 'ZetaChain Athens Testnet',
        nativeCurrency: { name: 'ZETA', symbol: 'ZETA', decimals: 18 },
        rpcUrls: { default: { http: [config.ZETACHAIN_RPC_URL] } },
    });
    
    this.zetaClient = createPublicClient({
        chain: zetachainAthens,
        transport: http(config.ZETACHAIN_RPC_URL),
    });
  }
  
  private getClient(chainId: number) {
    switch (chainId) {
      case 1: return this.ethClient;
      case 137: return this.polygonClient;
      case 56: return this.bscClient;
      case 7001: return this.zetaClient;
      default: return this.ethClient;
    }
  }

  /**
   * 观察指定钱包在时间段内的活动
   */
  async observeWallet(
    walletAddress: string,
    fromTime: Date,
    toTime: Date,
    chainId: number = 1
  ): Promise<ObservationResult> {
    logger.info(`Observing wallet ${walletAddress} on chain ${chainId} from ${fromTime} to ${toTime}`);
    
    const client = this.getClient(chainId);
    const address = walletAddress as `0x${string}`;
    const transactions: TransactionSummary[] = [];
    const notableEvents: NotableEvent[] = [];
    let totalValueWei = BigInt(0);
    
    try {
      // 1. 获取时间范围内的区块
      const fromBlock = await this.getBlockNumberByTimestamp(client, fromTime);
      const toBlock = await this.getBlockNumberByTimestamp(client, toTime);
      
      // 2. 查询转账事件 (ERC-20 Transfer)
      // 注意: 不同链转账事件可能不同，但 ERC20 是标准的
      const transferLogs = await client.getLogs({
        event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
        args: {
            from: address,
        },
        fromBlock: BigInt(fromBlock),
        toBlock: BigInt(toBlock),
      });
      
      // 3. 处理发送交易 (逻辑简化，仅处理 ERC20 logs)
      for (const log of transferLogs.slice(0, 20)) {
        const value = (log as any).args.value || BigInt(0);
        totalValueWei += value;
        
        transactions.push({
          hash: log.transactionHash,
          timestamp: Date.now(), 
          type: 'send',
          value: formatEther(value),
          to: (log as any).args.to,
        });
        
        // 检查大额转账 (Threshold varies by chain, simple default > 100 tokens)
        if (value > BigInt(100) * BigInt(10 ** 18)) { 
          notableEvents.push({
            type: 'large_transfer',
            description: `Sent ${formatEther(value)} tokens`,
            txHash: log.transactionHash,
            timestamp: Date.now(),
          });
        }
      }
      
      logger.info(`Observation complete: ${transactions.length} transactions found`);
      
      return {
        walletAddress,
        chainId,
        transactions,
        totalTxCount: transactions.length,
        totalValueWei,
        notableEvents,
        observedFrom: fromTime,
        observedTo: toTime,
      };
      
    } catch (error) {
      logger.error('Observation failed:', error);
      
      return {
        walletAddress,
        chainId,
        transactions: [],
        totalTxCount: 0,
        totalValueWei: BigInt(0),
        notableEvents: [],
        observedFrom: fromTime,
        observedTo: toTime,
      };
    }
  }
  
  private async getBlockNumberByTimestamp(client: any, timestamp: Date): Promise<number> {
    const currentBlock = await client.getBlockNumber();
    const currentTime = Date.now() / 1000;
    const targetTime = timestamp.getTime() / 1000;
    
    // Avg block times: Eth ~12s, Poly ~2s, BSC ~3s
    // Use conservative 12s for all for MVP safety
    const blockDiff = Math.floor((currentTime - targetTime) / 5); 
    
    return Math.max(0, Number(currentBlock) - blockDiff);
  }
}

export const observerService = new ObserverService();
