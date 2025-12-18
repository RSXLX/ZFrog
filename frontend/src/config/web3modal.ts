import { createWeb3Modal } from '@web3modal/wagmi/react';
import { wagmiConfig } from './wagmi';
import { zetachainAthens } from './chains';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// 创建 Web3Modal 实例
export const web3Modal = createWeb3Modal({
  wagmiConfig,
  projectId,
  // 主题配置
  themeMode: 'light',
  themeVariables: {
    '--w3m-accent': '#22c55e',           // ZetaFrog 绿色
    '--w3m-color-mix': '#22c55e',
    '--w3m-color-mix-strength': 20,
    '--w3m-border-radius-master': '12px',
  },
  // 特性标志
  featuredWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
    'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase
  ],
  // 链配置
  defaultChain: zetachainAthens,
  // 条款和隐私
  termsConditionsUrl: 'https://zetafrog.xyz/terms',
  privacyPolicyUrl: 'https://zetafrog.xyz/privacy',
});