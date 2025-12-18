// WalletConnectService handles the lifecycle of the wallet connection logic.

export class WalletConnectService {
  private static instance: WalletConnectService;
  
  static getInstance(): WalletConnectService {
    if (!WalletConnectService.instance) {
      WalletConnectService.instance = new WalletConnectService();
    }
    return WalletConnectService.instance;
  }
  
  // 初始化 WalletConnect
  async initialize(): Promise<void> {
    try {
      console.log('🔗 Initializing WalletConnect...');
      // WalletConnect 通过 wagmi 配置自动初始化
    } catch (error) {
      console.error('❌ Failed to initialize WalletConnect:', error);
      throw error;
    }
  }
  
  // 清理连接
  async cleanup(): Promise<void> {
    try {
      console.log('🧹 Cleaning up WalletConnect...');
      // 清理逻辑主要由 wagmi 管理，这里可以进行额外的本地清理
    } catch (error) {
      console.error('❌ Failed to cleanup WalletConnect:', error);
    }
  }
}

// 导出单例实例
export const walletConnectService = WalletConnectService.getInstance();