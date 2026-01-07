/**
 * 有趣钱包地址配置
 * 
 * 这些地址是经过精选的「热门」或「有趣」的链上地址
 * 青蛙会优先探访这些地址，以获得更丰富的探索体验
 * 
 * 分类说明:
 * - defi: DeFi 协议地址（如 Uniswap、PancakeSwap）
 * - whale: 知名巨鲸地址
 * - nft: NFT 项目/收藏家地址
 * - dao: DAO 金库地址
 * - bridge: 跨链桥地址
 * - famous: 名人/知名项目地址
 * - exchange: 交易所热钱包
 */

export interface InterestingAddress {
  address: string;
  name: string;           // 友好名称
  category: 'defi' | 'whale' | 'nft' | 'dao' | 'bridge' | 'famous' | 'exchange' | 'other';
  description?: string;   // 简短描述
  rarity?: number;        // 稀有度 1-5（遇到这个地址有多特别）
  mainnetOnly?: boolean;  // 是否仅主网有效
}

// ============ 以太坊主网 (chainId: 1) ============
export const ETH_MAINNET_ADDRESSES: InterestingAddress[] = [
  // DeFi
  { address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', name: 'Uniswap V2 Router', category: 'defi', rarity: 3 },
  { address: '0xE592427A0AEce92De3Edee1F18E0157C05861564', name: 'Uniswap V3 Router', category: 'defi', rarity: 3 },
  { address: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F', name: 'SushiSwap Router', category: 'defi', rarity: 3 },
  { address: '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9', name: 'Aave V2 LendingPool', category: 'defi', rarity: 4 },
  { address: '0x1111111254fb6c44bAC0beD2854e76F90643097d', name: '1inch Router', category: 'defi', rarity: 3 },
  
  // 巨鲸/名人
  { address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B', name: 'Vitalik Buterin', category: 'famous', rarity: 5 },
  { address: '0x00000000219ab540356cBB839Cbe05303d7705Fa', name: 'ETH 2.0 Deposit', category: 'famous', rarity: 4 },
  { address: '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8', name: 'Binance Hot Wallet', category: 'exchange', rarity: 4 },
  
  // NFT
  { address: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D', name: 'BAYC Contract', category: 'nft', rarity: 5 },
  { address: '0x60E4d786628Fea6478F785A6d7e704777c86a7c6', name: 'MAYC Contract', category: 'nft', rarity: 4 },
  { address: '0xED5AF388653567Af2F388E6224dC7C4b3241C544', name: 'Azuki Contract', category: 'nft', rarity: 4 },
  
  // DAO
  { address: '0x0BC3807Ec262cB779b38D65b38158acC3bfedE10', name: 'ENS DAO Treasury', category: 'dao', rarity: 4 },
  
  // 跨链桥
  { address: '0x8EB8a3b98659Cce290402893d0123abb75E3ab28', name: 'Avalanche Bridge', category: 'bridge', rarity: 3 },
];

// ============ BSC 主网 (chainId: 56) ============
export const BSC_MAINNET_ADDRESSES: InterestingAddress[] = [
  { address: '0x10ED43C718714eb63d5aA57B78B54704E256024E', name: 'PancakeSwap Router', category: 'defi', rarity: 4 },
  { address: '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4', name: 'PancakeSwap V3 Router', category: 'defi', rarity: 4 },
  { address: '0x8894E0a0c962CB723c1976a4421c95949bE2D4E3', name: 'Binance Hot Wallet 2', category: 'exchange', rarity: 4 },
  { address: '0xF68a4b64162906efF0fF6aE34E2bB1Cd42FEf62d', name: 'Venus Protocol', category: 'defi', rarity: 3 },
];

// ============ Polygon 主网 (chainId: 137) ============
export const POLYGON_MAINNET_ADDRESSES: InterestingAddress[] = [
  { address: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', name: 'QuickSwap Router', category: 'defi', rarity: 3 },
  { address: '0x1a1ec25DC08e98e5E93F1104B5e5cdD298707d31', name: 'Polygon Bridge', category: 'bridge', rarity: 4 },
];

// ============ 测试网地址（用于开发测试）============

// BSC Testnet (chainId: 97)
export const BSC_TESTNET_ADDRESSES: InterestingAddress[] = [
  { address: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1', name: 'PancakeSwap Testnet Router', category: 'defi', rarity: 3 },
  { address: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', name: 'WBNB Testnet', category: 'defi', rarity: 2 },
  { address: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd', name: 'USDT Testnet', category: 'defi', rarity: 2 },
];

// ETH Sepolia (chainId: 11155111)
export const ETH_SEPOLIA_ADDRESSES: InterestingAddress[] = [
  { address: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', name: 'WETH Sepolia', category: 'defi', rarity: 2 },
  { address: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8', name: 'USDC Sepolia', category: 'defi', rarity: 2 },
  { address: '0x779877A7B0D9E8603169DdbD7836e478b4624789', name: 'LINK Sepolia', category: 'defi', rarity: 2 },
  { address: '0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008', name: 'Sepolia Faucet', category: 'other', rarity: 1 },
];

// ZetaChain Athens (chainId: 7001)
export const ZETACHAIN_ATHENS_ADDRESSES: InterestingAddress[] = [
  { address: '0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf', name: 'ZetaChain Sample', category: 'other', rarity: 2 },
  { address: '0x239e96c8f17C85c30100aC26F635Ea15f23E9c67', name: 'ZetaChain Core', category: 'bridge', rarity: 3 },
];

// ============ 按 chainId 索引 ============
export const INTERESTING_ADDRESSES_BY_CHAIN: Record<number, InterestingAddress[]> = {
  // 主网
  1: ETH_MAINNET_ADDRESSES,
  56: BSC_MAINNET_ADDRESSES,
  137: POLYGON_MAINNET_ADDRESSES,
  // 测试网
  97: BSC_TESTNET_ADDRESSES,
  11155111: ETH_SEPOLIA_ADDRESSES,
  7001: ZETACHAIN_ATHENS_ADDRESSES,
};

/**
 * 获取指定链的有趣地址列表
 */
export function getInterestingAddresses(chainId: number): InterestingAddress[] {
  return INTERESTING_ADDRESSES_BY_CHAIN[chainId] || [];
}

/**
 * 随机获取一个有趣地址
 * @param chainId 链 ID
 * @param excludeAddresses 要排除的地址列表
 * @returns 随机选中的有趣地址，如果没有则返回 null
 */
export function getRandomInterestingAddress(
  chainId: number,
  excludeAddresses: string[] = []
): InterestingAddress | null {
  const addresses = getInterestingAddresses(chainId);
  if (addresses.length === 0) return null;
  
  const excludeSet = new Set(excludeAddresses.map(a => a.toLowerCase()));
  const available = addresses.filter(a => !excludeSet.has(a.address.toLowerCase()));
  
  if (available.length === 0) return null;
  
  // 加权随机：稀有度越高，被选中概率越低（更珍贵）
  // 但我们希望偶尔能遇到稀有地址，所以用稀有度的倒数作为权重
  const weights = available.map(a => 6 - (a.rarity || 3)); // rarity 5 -> weight 1, rarity 1 -> weight 5
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  
  let random = Math.random() * totalWeight;
  for (let i = 0; i < available.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return available[i];
    }
  }
  
  return available[available.length - 1];
}

/**
 * 根据稀有度获取发现描述
 */
export function getDiscoveryDescription(addr: InterestingAddress): string {
  const categoryDescriptions: Record<string, string> = {
    defi: '🏦 这是一个 DeFi 协议！',
    whale: '🐋 发现巨鲸出没！',
    nft: '🖼️ 这是一个著名的 NFT 项目！',
    dao: '🏛️ 发现 DAO 金库！',
    bridge: '🌉 这是一座跨链桥！',
    famous: '⭐ 这是一个名人地址！',
    exchange: '🏪 发现交易所热钱包！',
    other: '🔍 发现一个有趣的地址！',
  };
  
  const rarityEmoji = ['', '✨', '⭐', '🌟', '💫', '🌈'];
  const emoji = rarityEmoji[addr.rarity || 1];
  
  return `${emoji} ${categoryDescriptions[addr.category]} ${addr.name}${addr.description ? `: ${addr.description}` : ''}`;
}
