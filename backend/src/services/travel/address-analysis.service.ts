// backend/src/services/travel/address-analysis.service.ts
// V2.0 地址类型分析服务

import { createPublicClient, http, getAddress, isAddress } from 'viem';
import { mainnet, bsc } from 'viem/chains';
import { logger } from '../../utils/logger';

// 已知 DeFi 协议地址映射
const KNOWN_DEFI_PROTOCOLS: Record<string, { name: string; type: string }> = {
  // BSC
  '0x10ed43c718714eb63d5aa57b78b54704e256024e': { name: 'PancakeSwap Router', type: 'dex' },
  '0x13f4ea83d0bd40e75c8222255bc855a974568dd4': { name: 'PancakeSwap V3 Router', type: 'dex' },
  '0x58f876857a02d6762e0101bb5c46a8c1ed44dc16': { name: 'PancakeSwap Factory', type: 'dex' },
  // ETH
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': { name: 'Uniswap V2 Router', type: 'dex' },
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': { name: 'Uniswap V3 Router', type: 'dex' },
  '0x1111111254eeb25477b68fb85ed929f73a960582': { name: '1inch', type: 'aggregator' },
  // ZetaChain
  '0xb47c126d0c0d0a0de1b2c2a04f06bfc64571b59d': { name: 'ZetaSwap', type: 'dex' },
};

// 巨鲸阈值 (ETH)
const WHALE_THRESHOLDS: Record<number, bigint> = {
  1: BigInt('100000000000000000000'),      // 100 ETH
  97: BigInt('1000000000000000000000'),    // 1000 BNB
  7001: BigInt('10000000000000000000000'), // 10000 ZETA
};

export interface AddressInfo {
  type: 'normal' | 'contract' | 'defi' | 'whale';
  bonus: number;
  name?: string;
  protocolType?: string;
  balance?: string;
}

class AddressAnalysisService {
  private clients: Map<number, any> = new Map();

  constructor() {
    // 初始化默认客户端
  }

  private getClient(chainId: number): any {
    if (this.clients.has(chainId)) {
      return this.clients.get(chainId);
    }

    let client;
    switch (chainId) {
      case 1:
        client = createPublicClient({ chain: mainnet, transport: http() });
        break;
      case 97:
        client = createPublicClient({
          chain: bsc,
          transport: http('https://bsc-testnet.public.blastapi.io'),
        });
        break;
      default:
        client = createPublicClient({
          chain: {
            id: chainId,
            name: 'Custom',
            nativeCurrency: { name: 'Native', symbol: 'Native', decimals: 18 },
            rpcUrls: { default: { http: [process.env.ZETACHAIN_RPC_URL || 'https://zetachain-athens.blockpi.network/v1/rpc/public'] } },
          },
          transport: http(),
        });
    }
    this.clients.set(chainId, client);
    return client;
  }

  /**
   * 分析地址类型
   */
  async analyzeAddress(address: string, chainId: number): Promise<AddressInfo> {
    try {
      if (!isAddress(address)) {
        return { type: 'normal', bonus: 1.0 };
      }

      const normalizedAddress = getAddress(address).toLowerCase();

      // 1. 检查已知 DeFi 协议
      const knownProtocol = KNOWN_DEFI_PROTOCOLS[normalizedAddress];
      if (knownProtocol) {
        logger.info(`[AddressAnalysis] Identified DeFi protocol: ${knownProtocol.name}`);
        return {
          type: 'defi',
          bonus: 1.5,
          name: knownProtocol.name,
          protocolType: knownProtocol.type,
        };
      }

      const client = this.getClient(chainId);

      // 2. 检查是否为合约
      const code = await client.getBytecode({ address: normalizedAddress });
      const isContract = code && code !== '0x';

      if (isContract) {
        // 合约地址，但不是已知 DeFi
        logger.info(`[AddressAnalysis] Contract address detected: ${address}`);
        return { type: 'contract', bonus: 1.2 };
      }

      // 3. 检查是否为巨鲸
      const balance = await client.getBalance({ address: normalizedAddress });
      const whaleThreshold = WHALE_THRESHOLDS[chainId] || BigInt('100000000000000000000');

      if (balance >= whaleThreshold) {
        logger.info(`[AddressAnalysis] Whale address detected: ${address} with balance ${balance}`);
        return {
          type: 'whale',
          bonus: 2.0,
          balance: balance.toString(),
        };
      }

      // 普通地址
      return { type: 'normal', bonus: 1.0 };
    } catch (error) {
      logger.warn(`[AddressAnalysis] Error analyzing address ${address}:`, error);
      // 降级为普通地址
      return { type: 'normal', bonus: 1.0 };
    }
  }

  /**
   * 获取探索加成系数
   */
  getExplorationBonus(addressType: string): number {
    const bonusMap: Record<string, number> = {
      normal: 1.0,
      contract: 1.2,
      defi: 1.5,
      whale: 2.0,
    };
    return bonusMap[addressType] || 1.0;
  }

  /**
   * 检查是否为已知 DeFi 协议
   */
  isKnownDefiProtocol(address: string): boolean {
    const normalized = address.toLowerCase();
    return !!KNOWN_DEFI_PROTOCOLS[normalized];
  }

  /**
   * 获取 DeFi 协议信息
   */
  getProtocolInfo(address: string): { name: string; type: string } | null {
    const normalized = address.toLowerCase();
    return KNOWN_DEFI_PROTOCOLS[normalized] || null;
  }
}

export const addressAnalysisService = new AddressAnalysisService();
