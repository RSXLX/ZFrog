import { wagmiConfig } from './wagmi';
import { zetachainAthens } from './chains';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// 兼容旧调用方的配置，当前前端主要使用 wagmi 直连流程。
export const web3Modal = {
  wagmiConfig,
  projectId,
  themeMode: 'light',
  themeVariables: {
    '--w3m-accent': '#22c55e',
    '--w3m-color-mix': '#22c55e',
    '--w3m-color-mix-strength': 20,
    '--w3m-border-radius-master': '12px',
  },
  featuredWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
    'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa',
  ],
  defaultChain: zetachainAthens,
  termsConditionsUrl: 'https://zetafrog.xyz/terms',
  privacyPolicyUrl: 'https://zetafrog.xyz/privacy',
} as const;
