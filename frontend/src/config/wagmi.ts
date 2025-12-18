import { http, createConfig } from 'wagmi';
import { defineChain } from 'viem';
import { injected } from 'wagmi/connectors';

// 定义 ZetaChain Athens Testnet
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
      http: ['https://zetachain-athens.g.allthatnode.com/archive/evm'],
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

export const wagmiConfig = createConfig({
  chains: [zetachainAthens],
  connectors: [
    injected(),
  ],
  transports: {
    [zetachainAthens.id]: http(),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
