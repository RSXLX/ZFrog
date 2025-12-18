import { defineChain } from 'viem';

// ZetaChain Athens 测试网
export const zetachainAthens = defineChain({
  id: 7001,
  name: 'ZetaChain Athens Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'ZETA',
    symbol: 'ZETA',
  },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_ZETACHAIN_RPC_URL || 'https://zetachain-athens-evm.blockpi.network/v1/rpc/public'],
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

// 支持的链列表
export const supportedChains = [zetachainAthens] as const;

// 链 ID 映射
export const chainIdToChain = {
  7001: zetachainAthens,
} as const;