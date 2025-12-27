// backend/src/services/defi/asset.service.ts

import { PrismaClient } from '@prisma/client';
import { createPublicClient, http, formatEther, formatUnits } from 'viem';
import { sepolia, bscTestnet, polygonAmoy } from 'viem/chains';
import { defineChain } from 'viem';
import { PriceService } from './price.service';
import { getChainConfig } from '../../config/chains';
import { logger } from '../../utils/logger';

// 定义ZetaChain Athens测试网
const zetachainAthens = defineChain({
  id: 7001,
  name: 'ZetaChain Athens Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'ZETA',
    symbol: 'aZETA',
  },
  rpcUrls: {
    default: {
      http: ['https://zetachain-athens-evm.blockpi.network/v1/rpc/public'],
    },
    public: {
      http: ['https://zetachain-athens-evm.blockpi.network/v1/rpc/public'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ZetaScan',
      url: 'https://athens.explorer.zetachain.com',
    },
  },
  testnet: true,
});

// ERC20 ABI（简化版）
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
  }
] as const;

// 测试网常见代币地址
const TOKEN_ADDRESSES: Record<number, Record<string, string>> = {
  97: { // BSC Testnet
    'USDT': '0xaB1a4d4f1D656d2450692D237fdD6C7f9146e814',
    'USDC': '0x269814a64137C7F31b93542138020a5f63D3E5c4',
  },
  11155111: { // Sepolia
    'USDT': '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06',
    'USDC': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  },
  7001: { // ZetaChain Athens
    'aUSDC': '0x5353b4556B447C2c0A0e65e7c6043d2F3ba648C4',
    'aUSDT': '0x07865c6E87B9F70255377e024ace6630C1Eaa37F',
  },
  80002: { // Polygon Amoy
    'USDT': '0xA02f6adc7926efeBBd59Fd43B84E8C9951DacA28',
    'USDC': '0x41e94eb019c0762f9bfcf9f248664db355169cbe',
  }
};

export interface AssetData {
  totalValueUsd: number;
  tokens: TokenBalance[];
  nfts?: NFTBalance[];
}

export interface TokenBalance {
  symbol: string;
  balance: string;
  valueUsd: number;
  chainId: number;
  contractAddress?: string;
}

export interface NFTBalance {
  name: string;
  count: number;
  chainId: number;
  contractAddress: string;
}

export class AssetService {
  private prisma: PrismaClient;
  private priceService: PriceService;
  private clients: Map<number, any>;
  
  constructor() {
    this.prisma = new PrismaClient();
    this.priceService = new PriceService();
    
    // 初始化测试网客户端
    this.clients = new Map();
    this.clients.set(97, createPublicClient({ chain: bscTestnet, transport: http() }));
    this.clients.set(11155111, createPublicClient({ chain: sepolia, transport: http() }));
    this.clients.set(7001, createPublicClient({ chain: zetachainAthens, transport: http() }));
    this.clients.set(80002, createPublicClient({ chain: polygonAmoy, transport: http() }));
  }
  
  /**
   * 获取用户资产（测试网）
   */
  async getAssets(
    ownerAddress: string, 
    chainIds: number[] = [97, 11155111, 7001, 80002]
  ): Promise<AssetData> {
    
    const tokens: TokenBalance[] = [];
    const nfts: NFTBalance[] = [];
    
    for (const chainId of chainIds) {
      try {
        const client = this.clients.get(chainId);
        if (!client) {
          logger.warn(`No client found for chain ${chainId}`);
          continue;
        }
        
        // 查询原生代币余额
        const nativeBalance = await client.getBalance({
          address: ownerAddress as `0x${string}`
        });
        
        const symbol = this.getNativeSymbol(chainId);
        const balanceFormatted = formatEther(nativeBalance);
        
        // 获取价格（对于测试网代币，使用模拟价格）
        const price = await this.getTestnetPrice(symbol, chainId);
        
        tokens.push({
          symbol,
          balance: parseFloat(balanceFormatted).toFixed(4),
          valueUsd: parseFloat(balanceFormatted) * price,
          chainId
        });
        
        // 查询常见代币余额
        const chainTokens = TOKEN_ADDRESSES[chainId];
        if (chainTokens) {
          for (const [tokenSymbol, contractAddress] of Object.entries(chainTokens)) {
            try {
              const tokenBalance = await this.getERC20Balance(
                client,
                contractAddress as `0x${string}`,
                ownerAddress as `0x${string}`
              );
              
              if (tokenBalance && parseFloat(tokenBalance.formatted) > 0) {
                const tokenPrice = await this.getTestnetPrice(tokenSymbol, chainId);
                
                tokens.push({
                  symbol: tokenSymbol,
                  balance: tokenBalance.formatted,
                  valueUsd: parseFloat(tokenBalance.formatted) * tokenPrice,
                  chainId,
                  contractAddress
                });
              }
            } catch (error) {
              logger.warn(`Failed to get ${tokenSymbol} balance on chain ${chainId}:`, error);
            }
          }
        }
        
        // 查询ZetaFrog NFT（如果在对应链上）
        if (chainId === 7001) { // ZetaChain
          try {
            const frogNFTs = await this.getZetaFrogNFTs(client, ownerAddress);
            nfts.push(...frogNFTs);
          } catch (error) {
            logger.warn(`Failed to get ZetaFrog NFTs:`, error);
          }
        }
        
      } catch (error) {
        logger.error(`Error fetching assets from chain ${chainId}:`, error);
      }
    }
    
    // 计算总价值
    const totalValueUsd = tokens.reduce((sum, t) => sum + t.valueUsd, 0);
    
    // 更新资产快照
    await this.updateAssetSnapshot(ownerAddress, chainIds[0], {
      totalValueUsd,
      tokens,
      nfts
    });
    
    return {
      totalValueUsd,
      tokens: tokens.sort((a, b) => b.valueUsd - a.valueUsd), // 按价值排序
      nfts
    };
  }
  
  /**
   * 获取ERC20代币余额
   */
  private async getERC20Balance(
    client: any,
    contractAddress: `0x${string}`,
    ownerAddress: `0x${string}`
  ) {
    try {
      const [balance, decimals] = await Promise.all([
        client.readContract({
          address: contractAddress,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [ownerAddress]
        }),
        client.readContract({
          address: contractAddress,
          abi: ERC20_ABI,
          functionName: 'decimals'
        })
      ]);
      
      return {
        value: balance,
        formatted: formatUnits(balance, decimals)
      };
    } catch (error) {
      logger.warn(`ERC20 balance query failed for ${contractAddress}:`, error);
      return null;
    }
  }
  
  /**
   * 获取ZetaFrog NFT
   */
  private async getZetaFrogNFTs(
    client: any,
    ownerAddress: string
  ): Promise<NFTBalance[]> {
    // 这里简化实现，实际需要调用NFT合约
    // 暂时返回空数组
    return [];
  }
  
  /**
   * 获取链的原生代币符号
   */
  private getNativeSymbol(chainId: number): string {
    const symbols: Record<number, string> = {
      97: 'tBNB',        // BSC Testnet
      11155111: 'ETH',   // Sepolia
      7001: 'aZETA',     // ZetaChain Athens
      80002: 'MATIC',    // Polygon Amoy
    };
    return symbols[chainId] || 'ETH';
  }
  
  /**
   * 获取测试网代币价格（模拟）
   */
  private async getTestnetPrice(symbol: string, chainId: number): Promise<number> {
    // 测试网代币没有真实价格，使用模拟价格
    const testnetPrices: Record<string, number> = {
      'ETH': 3800,      // Sepolia ETH 跟随主网
      'tBNB': 600,      // BSC Testnet BNB 跟随主网
      'aZETA': 0.8,     // ZetaChain Athens ZETA
      'MATIC': 0.9,     // Polygon Amoy MATIC
      'USDT': 1.0,      // 稳定币
      'USDC': 1.0,      // 稳定币
      'aUSDT': 1.0,     // ZetaChain 上的 USDT
      'aUSDC': 1.0,     // ZetaChain 上的 USDC
    };
    
    return testnetPrices[symbol] || 1.0;
  }
  
  /**
   * 更新资产快照
   */
  private async updateAssetSnapshot(
    ownerAddress: string,
    chainId: number,
    assetData: AssetData
  ): Promise<void> {
    try {
      await this.prisma.assetSnapshot.upsert({
        where: {
          ownerAddress_chainId: {
            ownerAddress,
            chainId
          }
        },
        update: {
          assets: assetData as unknown as any
        },
        create: {
          ownerAddress,
          chainId,
          assets: assetData as any
        }
      });
    } catch (error) {
      logger.warn('Failed to update asset snapshot:', error);
    }
  }
  
  /**
   * 获取资产快照（快速查询）
   */
  async getAssetSnapshot(
    ownerAddress: string,
    chainId: number
  ): Promise<AssetData | null> {
    try {
      const snapshot = await this.prisma.assetSnapshot.findUnique({
        where: {
          ownerAddress_chainId: {
            ownerAddress,
            chainId
          }
        }
      });
      
      if (!snapshot) return null;
      
      // 检查快照是否过期（5分钟）
      const now = new Date();
      const snapshotAge = now.getTime() - snapshot.updatedAt.getTime();
      const maxAge = 5 * 60 * 1000; // 5分钟
      
      if (snapshotAge > maxAge) {
        return null; // 快照过期
      }
      
      return snapshot.assets as unknown as AssetData;
    } catch (error) {
      logger.warn('Failed to get asset snapshot:', error);
      return null;
    }
  }
  
  /**
   * 清理过期快照
   */
  async cleanupSnapshots(): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24小时前
      
      const result = await this.prisma.assetSnapshot.deleteMany({
        where: {
          updatedAt: {
            lt: cutoffDate
          }
        }
      });
      
      logger.info(`Cleaned up ${result.count} expired asset snapshots`);
    } catch (error) {
      logger.error('Error cleaning up asset snapshots:', error);
    }
  }
}