import { createConfig, http } from 'wagmi';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';
import { zetachainAthens, supportedChains } from './chains';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  throw new Error('VITE_WALLETCONNECT_PROJECT_ID is required');
}

// 应用元数据
const metadata = {
  name: import.meta.env.VITE_APP_NAME || 'ZetaFrog',
  description: import.meta.env.VITE_APP_DESCRIPTION || 'Your Cross-chain Desktop Pet',
  url: import.meta.env.VITE_APP_URL || 'https://zetafrog.xyz',
  icons: [import.meta.env.VITE_APP_ICON || 'https://zetafrog.xyz/icon.png'],
};

// 创建 Wagmi 配置
export const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors: [
    // 浏览器插件钱包 (MetaMask, etc.)
    injected({
      shimDisconnect: true,
    }),
    
    // WalletConnect (移动端钱包、桌面钱包)
    walletConnect({
      projectId,
      metadata,
      showQrModal: false, // 我们自己控制二维码显示
    }),
    
    // Coinbase Wallet
    coinbaseWallet({
      appName: metadata.name,
      appLogoUrl: metadata.icons[0],
    }),
  ],
  transports: {
    [zetachainAthens.id]: http(),
  },
});

// 导出类型
export type WagmiConfig = typeof wagmiConfig;