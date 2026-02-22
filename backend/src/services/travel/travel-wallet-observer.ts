/**
 * @deprecated 此服务未被使用，功能已由 observer.service.ts 接管。
 * 保留仅供参考，计划在下一个版本中删除。
 * 
 * 🐸 旅行服务 - 钱包观察模块
 * 职责: 链上钱包活动观察和数据采集
 * 拆分自: travel.service.ts
 */

import { ethers, JsonRpcProvider } from 'ethers';
import axios from 'axios';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { addSafeErrorHandler } from '../../utils/provider';

// 类型定义
export interface WalletObservation {
  transactions: any[];
  totalTxCount: number;
  totalValueWei: string;
  notableEvents: NotableEvent[];
  balance?: string;
  source: 'API' | 'RPC' | 'CHAIN_EXPLORATION' | 'MOCK';
  isRandomExploration?: boolean;
}

export interface NotableEvent {
  type: string;
  hash?: string;
  value?: string;
  chainName?: string;
  latestBlock?: number;
  blockTxCount?: number;
  timestamp?: number;
}

// 链浏览器 API 映射
const EXPLORER_API_URLS: Record<number, string> = {
  1: 'https://api.etherscan.io',
  5: 'https://api-goerli.etherscan.io',
  11155111: 'https://api-sepolia.etherscan.io',
  137: 'https://api.polygonscan.com',
  56: 'https://api.bscscan.com',
  7001: 'https://zetachain-athens.blockscout.com'
};

const CHAIN_NAMES: Record<number, string> = {
  7001: 'ZetaChain Athens',
  11155111: 'Ethereum Sepolia',
  97: 'BSC Testnet',
  80002: 'Polygon Amoy'
};

class WalletObserverService {
  private provider: JsonRpcProvider;

  constructor() {
    const rpcUrl = config.ZETACHAIN_RPC_URL || 'https://zetachain-athens.g.allthatnode.com/archive/tendermint';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    addSafeErrorHandler(this.provider, 'ZetaChain');
  }

  /**
   * 观察钱包活动 (主入口)
   */
  async observeWallet(
    walletAddress: string,
    chainId: number,
    startTime: Date,
    endTime: Date
  ): Promise<WalletObservation> {
    logger.info(`[WalletObserver] Observing wallet ${walletAddress} on chain ${chainId}`);

    // 零地址 = 随机探索
    if (walletAddress.toLowerCase() === '0x0000000000000000000000000000000000000000') {
      logger.info('[WalletObserver] Zero address detected - observing chain activity');
      return this.observeChainActivity(chainId);
    }

    // 优先使用 API
    const apiResult = await this.observeWalletViaAPI(walletAddress, chainId, startTime, endTime);
    if (apiResult) {
      logger.info('[WalletObserver] Successfully fetched data via API');
      return apiResult;
    }

    // 回退到 RPC
    logger.info('[WalletObserver] API failed, falling back to RPC observation');
    return this.observeWalletViaRPC(walletAddress, chainId);
  }

  /**
   * 通过区块链浏览器 API 观察钱包
   */
  async observeWalletViaAPI(
    walletAddress: string,
    chainId: number,
    startTime: Date,
    endTime: Date
  ): Promise<WalletObservation | null> {
    const apiKey = process.env.ETHERSCAN_API_KEY;
    const baseUrl = this.getExplorerApiUrl(chainId);

    try {
      const response = await axios.get(`${baseUrl}/api`, {
        params: {
          module: 'account',
          action: 'txlist',
          address: walletAddress,
          startblock: 0,
          endblock: 99999999,
          sort: 'desc',
          apikey: apiKey
        },
        timeout: 8000
      });

      if (response.data.status !== '1') {
        logger.warn('[WalletObserver] API returned error status');
        return null;
      }

      const transactions = response.data.result;
      const startTimestamp = Math.floor(startTime.getTime() / 1000);
      const endTimestamp = Math.floor(endTime.getTime() / 1000);

      const filteredTxs = transactions.filter((tx: any) => {
        const txTime = parseInt(tx.timeStamp);
        return txTime >= startTimestamp && txTime <= endTimestamp;
      });

      let totalValueWei = BigInt(0);
      const notableEvents: NotableEvent[] = [];

      for (const tx of filteredTxs.slice(0, 50)) {
        totalValueWei += BigInt(tx.value || 0);

        if (BigInt(tx.value) > ethers.parseEther('0.1')) {
          notableEvents.push({
            type: 'large_transfer',
            hash: tx.hash,
            value: tx.value
          });
        }
      }

      return {
        transactions: filteredTxs.slice(0, 50),
        totalTxCount: filteredTxs.length,
        totalValueWei: totalValueWei.toString(),
        notableEvents,
        source: 'API'
      };

    } catch (error: any) {
      logger.error('[WalletObserver] API call failed:', error.message);
      return null;
    }
  }

  /**
   * 通过 RPC 观察钱包 (备用方案)
   */
  async observeWalletViaRPC(
    walletAddress: string,
    chainId: number
  ): Promise<WalletObservation> {
    try {
      logger.info('[WalletObserver] Querying wallet via RPC...');

      const balance = await this.provider.getBalance(walletAddress);
      const txCount = await this.provider.getTransactionCount(walletAddress);
      const latestBlock = await this.provider.getBlockNumber();
      const blocksToCheck = Math.min(100, latestBlock);

      let foundTxCount = 0;
      let totalValue = BigInt(0);
      const notableEvents: NotableEvent[] = [];

      for (let i = 0; i < blocksToCheck && i < 10; i += 10) {
        try {
          const blockNum = latestBlock - i;
          const block = await this.provider.getBlock(blockNum, true);

          if (block && block.transactions) {
            for (const txHash of block.transactions) {
              if (typeof txHash === 'string') {
                const tx = await this.provider.getTransaction(txHash);
                if (tx && (
                  tx.from?.toLowerCase() === walletAddress.toLowerCase() ||
                  tx.to?.toLowerCase() === walletAddress.toLowerCase()
                )) {
                  foundTxCount++;
                  totalValue += tx.value || BigInt(0);

                  if (tx.value > ethers.parseEther('0.1')) {
                    notableEvents.push({
                      type: 'large_transfer',
                      hash: tx.hash,
                      value: tx.value.toString()
                    });
                  }
                }
              }
            }
          }
        } catch {
          continue;
        }
      }

      return {
        transactions: [],
        totalTxCount: Math.max(txCount, foundTxCount),
        totalValueWei: totalValue.toString(),
        balance: balance.toString(),
        notableEvents,
        source: 'RPC'
      };

    } catch (error: any) {
      logger.error('[WalletObserver] RPC observation failed:', error.message);
      return this.getMockWalletData();
    }
  }

  /**
   * 观察通用链活动 (随机探索模式)
   */
  async observeChainActivity(chainId: number): Promise<WalletObservation> {
    try {
      logger.info('[WalletObserver] Observing chain activity for random exploration');

      const latestBlock = await this.provider.getBlockNumber();
      const block = await this.provider.getBlock(latestBlock, true);

      let txCount = 0;
      if (block && block.transactions) {
        txCount = block.transactions.length;
      }

      return {
        transactions: [],
        totalTxCount: txCount,
        totalValueWei: '0',
        notableEvents: [{
          type: 'chain_exploration',
          chainName: CHAIN_NAMES[chainId] || `Chain ${chainId}`,
          latestBlock: latestBlock,
          blockTxCount: txCount,
          timestamp: block?.timestamp || Math.floor(Date.now() / 1000)
        }],
        source: 'CHAIN_EXPLORATION',
        isRandomExploration: true
      };

    } catch (error: any) {
      logger.error('[WalletObserver] Chain observation failed:', error.message);
      return this.getMockWalletData();
    }
  }

  /**
   * Mock 数据 (最终备用)
   */
  getMockWalletData(): WalletObservation {
    return {
      transactions: [],
      totalTxCount: Math.floor(Math.random() * 20) + 5,
      totalValueWei: ethers.parseEther((Math.random() * 10).toFixed(4)).toString(),
      notableEvents: [],
      source: 'MOCK'
    };
  }

  /**
   * 获取链浏览器 API URL
   */
  getExplorerApiUrl(chainId: number): string {
    return EXPLORER_API_URLS[chainId] || EXPLORER_API_URLS[1];
  }

  /**
   * 获取链名称
   */
  getChainName(chainId: number): string {
    return CHAIN_NAMES[chainId] || `Chain ${chainId}`;
  }
}

export const walletObserverService = new WalletObserverService();
export default walletObserverService;
