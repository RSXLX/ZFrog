/**
 * Block Explorer Service (RPC Mode)
 * 
 * 使用 RPC 调用获取钱包数据（替代区块浏览器 API）
 * 适用于测试链不支持浏览器 API 的场景
 */

import { createPublicClient, http, formatEther, formatUnits, parseAbi } from 'viem';
import { bscTestnet, sepolia } from 'viem/chains';
import { config } from '../config';
import { logger } from '../utils/logger';

// 链配置
const CHAIN_CONFIGS: Record<string, {
  chain: any;
  rpcUrl: string;
  nativeSymbol: string;
}> = {
  'BSC_TESTNET': {
    chain: bscTestnet,
    rpcUrl: config.BSC_TESTNET_RPC_URL,
    nativeSymbol: 'tBNB',
  },
  'ETH_SEPOLIA': {
    chain: sepolia,
    rpcUrl: config.ETH_SEPOLIA_RPC_URL,
    nativeSymbol: 'SepoliaETH',
  },
  'ZETACHAIN_ATHENS': {
    chain: {
      id: 7001,
      name: 'ZetaChain Athens',
      nativeCurrency: { name: 'ZETA', symbol: 'aZETA', decimals: 18 },
      rpcUrls: { default: { http: [config.ZETACHAIN_RPC_URL] } },
    },
    rpcUrl: config.ZETACHAIN_RPC_URL,
    nativeSymbol: 'aZETA',
  },
};

// 创建客户端缓存
const clientCache: Record<string, any> = {};

function getClient(chain: string): any {
  if (!clientCache[chain]) {
    const chainConfig = CHAIN_CONFIGS[chain];
    if (!chainConfig) {
      throw new Error(`Unsupported chain: ${chain}`);
    }
    
    clientCache[chain] = createPublicClient({
      chain: chainConfig.chain as any,
      transport: http(chainConfig.rpcUrl),
    });
  }
  return clientCache[chain];
}


// ERC20 ABI
const ERC20_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
]);

// 常见代币地址（测试网）
const COMMON_TOKENS: Record<string, Record<string, string>> = {
  'BSC_TESTNET': {
    'USDT': '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
    'BUSD': '0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee',
  },
  'ETH_SEPOLIA': {
    'USDC': '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
    'LINK': '0x779877A7B0D9E8603169DdbD7836e478b4624789',
  },
  'ZETACHAIN_ATHENS': {},
};

export interface WalletInfo {
  address: string;
  chain: string;
  nativeBalance: string;
  nativeBalanceFormatted: string;
  tokens: TokenBalance[];
  nfts: NFTInfo[];
  recentTxCount: number;
  lastActivity: string | null;
  isContract: boolean;
}

export interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
}

export interface NFTInfo {
  name: string;
  symbol: string;
  tokenId: string;
}

/**
 * 获取钱包原生币余额
 */
async function getNativeBalance(chain: string, address: string): Promise<bigint> {
  try {
    const client = getClient(chain);
    const balance = await client.getBalance({ address: address as `0x${string}` });
    return balance;
  } catch (error) {
    logger.warn(`[BlockExplorer] Failed to get balance for ${address}:`, error);
    return BigInt(0);
  }
}

/**
 * 获取交易计数（作为活跃度指标）
 */
async function getTransactionCount(chain: string, address: string): Promise<number> {
  try {
    const client = getClient(chain);
    const count = await client.getTransactionCount({ address: address as `0x${string}` });
    return count;
  } catch (error) {
    logger.warn(`[BlockExplorer] Failed to get tx count for ${address}:`, error);
    return 0;
  }
}

/**
 * 检查是否是合约地址
 */
async function checkIsContract(chain: string, address: string): Promise<boolean> {
  try {
    const client = getClient(chain);
    const code = await client.getBytecode({ address: address as `0x${string}` });
    return code !== undefined && code !== '0x' && code.length > 2;
  } catch (error) {
    return false;
  }
}

/**
 * 获取 ERC20 代币余额
 */
async function getTokenBalances(chain: string, address: string): Promise<TokenBalance[]> {
  const tokens: TokenBalance[] = [];
  const chainTokens = COMMON_TOKENS[chain] || {};
  const client = getClient(chain);
  
  for (const [symbol, tokenAddress] of Object.entries(chainTokens)) {
    try {
      const [balance, decimals, name] = await Promise.all([
        client.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address as `0x${string}`],
        }),
        client.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }),
        client.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'name',
        }).catch(() => symbol),
      ]);
      
      if (balance > BigInt(0)) {
        const formatted = formatUnits(balance as bigint, decimals as number);
        if (parseFloat(formatted) > 0.0001) {
          tokens.push({
            symbol,
            name: name as string,
            balance: parseFloat(formatted).toFixed(4),
            decimals: decimals as number,
          });
        }
      }
    } catch (err) {
      // 忽略单个代币查询失败
    }
  }
  
  return tokens;
}

/**
 * 估算钱包活跃度
 */
function estimateActivity(txCount: number): { recentTxCount: number; lastActivity: string | null } {
  // 由于 RPC 无法直接获取最近交易时间，使用交易计数估算
  if (txCount === 0) {
    return { recentTxCount: 0, lastActivity: null };
  }
  
  // 假设交易计数越高，越可能是活跃用户
  // 这是一个粗略估算
  const activityLevel = txCount > 100 ? '活跃' : txCount > 10 ? '偶尔活跃' : '较少活动';
  
  return {
    recentTxCount: Math.min(txCount, 10), // 返回一个相对值
    lastActivity: activityLevel,
  };
}

/**
 * 主函数：获取完整钱包信息
 */
export async function getWalletInfo(chain: string, address: string): Promise<WalletInfo> {
  logger.info(`[BlockExplorer] Fetching wallet info via RPC for ${address} on ${chain}`);
  
  const chainConfig = CHAIN_CONFIGS[chain];
  if (!chainConfig) {
    throw new Error(`Unsupported chain: ${chain}`);
  }
  
  // 并行获取数据
  const [nativeBalance, txCount, isContract, tokens] = await Promise.all([
    getNativeBalance(chain, address),
    getTransactionCount(chain, address),
    checkIsContract(chain, address),
    getTokenBalances(chain, address),
  ]);
  
  const activity = estimateActivity(txCount);
  const formattedBalance = formatEther(nativeBalance);
  
  return {
    address,
    chain,
    nativeBalance: nativeBalance.toString(),
    nativeBalanceFormatted: `${parseFloat(formattedBalance).toFixed(4)} ${chainConfig.nativeSymbol}`,
    tokens,
    nfts: [], // RPC 模式下跳过 NFT 查询（需要索引服务）
    recentTxCount: activity.recentTxCount,
    lastActivity: activity.lastActivity,
    isContract,
  };
}

/**
 * 生成探索描述
 */
export function generateExplorationDescription(walletInfo: WalletInfo): string {
  const parts: string[] = [];
  
  // 余额描述
  const balance = parseFloat(formatEther(BigInt(walletInfo.nativeBalance)));
  if (balance > 0) {
    if (balance > 10) {
      parts.push(`🐋 发现大户！这个钱包有 ${walletInfo.nativeBalanceFormatted}！`);
    } else if (balance > 1) {
      parts.push(`💰 发现这个钱包有 ${walletInfo.nativeBalanceFormatted}！`);
    } else {
      parts.push(`💵 钱包余额: ${walletInfo.nativeBalanceFormatted}`);
    }
  } else {
    parts.push(`💸 这个钱包看起来空空如也...`);
  }
  
  // 代币描述
  if (walletInfo.tokens.length > 0) {
    const tokenNames = walletInfo.tokens.map(t => `${t.balance} ${t.symbol}`).join(', ');
    parts.push(`🪙 持有代币: ${tokenNames}`);
  }
  
  // 活跃度描述
  if (walletInfo.lastActivity) {
    parts.push(`📊 活跃状态: ${walletInfo.lastActivity}`);
  }
  
  // 合约描述
  if (walletInfo.isContract) {
    parts.push(`🤖 这是一个智能合约地址！`);
  }
  
  return parts.join('\n');
}

/**
 * 获取 Gas 价格
 */
export async function getGasPrice(chain: string): Promise<{ gasPrice: string; formatted: string }> {
  try {
    const client = getClient(chain);
    const gasPrice = await client.getGasPrice();
    const gwei = formatUnits(gasPrice, 9);
    
    return {
      gasPrice: gasPrice.toString(),
      formatted: `${parseFloat(gwei).toFixed(2)} Gwei`,
    };
  } catch (error) {
    logger.warn(`[BlockExplorer] Failed to get gas price for ${chain}:`, error);
    return { gasPrice: '0', formatted: 'Unknown' };
  }
}

/**
 * 获取最新区块号
 */
export async function getLatestBlockNumber(chain: string): Promise<bigint> {
  try {
    const client = getClient(chain);
    return await client.getBlockNumber();
  } catch (error) {
    logger.warn(`[BlockExplorer] Failed to get block number for ${chain}:`, error);
    return BigInt(0);
  }
}

/**
 * 获取区块信息
 */
export async function getBlock(chain: string, blockNumber?: bigint): Promise<any> {
  try {
    const client = getClient(chain);
    if (blockNumber) {
      return await client.getBlock({ blockNumber });
    } else {
      return await client.getBlock({ blockTag: 'latest' });
    }
  } catch (error) {
    logger.warn(`[BlockExplorer] Failed to get block for ${chain}:`, error);
    return null;
  }
}

export const blockExplorerService = {
  getWalletInfo,
  generateExplorationDescription,
  getGasPrice,
  getLatestBlockNumber,
  getBlock,
};
