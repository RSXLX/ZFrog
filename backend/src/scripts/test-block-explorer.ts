/**
 * 测试脚本：验证 Block Explorer RPC 功能
 * 运行: npx ts-node src/scripts/test-block-explorer.ts
 */

import { blockExplorerService } from '../services/block-explorer.service';

async function main() {
  console.log('=== Block Explorer RPC 测试 ===\n');

  // 测试地址（测试网水龙头地址，通常有余额）
  const testAddresses: Record<string, string> = {
    'BSC_TESTNET': '0xCe2CC46682E9C6D5f174aF598fb4931a9c0bE68e', // BSC Testnet faucet
    'ETH_SEPOLIA': '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', // Sepolia WETH
    'ZETACHAIN_ATHENS': '0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf', // ZetaChain sample
  };

  for (const [chain, address] of Object.entries(testAddresses)) {
    console.log(`\n--- 测试 ${chain} ---`);
    console.log(`地址: ${address}`);
    
    try {
      // 测试获取钱包信息
      console.log('\n1. 获取钱包信息...');
      const walletInfo = await blockExplorerService.getWalletInfo(chain, address);
      console.log(`   余额: ${walletInfo.nativeBalanceFormatted}`);
      console.log(`   交易计数: ${walletInfo.recentTxCount}`);
      console.log(`   是否合约: ${walletInfo.isContract}`);
      console.log(`   活跃状态: ${walletInfo.lastActivity || '未知'}`);
      if (walletInfo.tokens.length > 0) {
        console.log(`   代币: ${walletInfo.tokens.map(t => `${t.balance} ${t.symbol}`).join(', ')}`);
      }
      
      // 测试生成探索描述
      console.log('\n2. 生成探索描述...');
      const description = blockExplorerService.generateExplorationDescription(walletInfo);
      console.log(description);

      // 测试获取 Gas 价格
      console.log('\n3. 获取 Gas 价格...');
      const gasPrice = await blockExplorerService.getGasPrice(chain);
      console.log(`   Gas: ${gasPrice.formatted}`);

      // 测试获取最新区块
      console.log('\n4. 获取最新区块号...');
      const blockNumber = await blockExplorerService.getLatestBlockNumber(chain);
      console.log(`   区块: ${blockNumber}`);

      console.log(`\n✅ ${chain} 测试通过!`);
      
    } catch (error) {
      console.error(`\n❌ ${chain} 测试失败:`, error);
    }
  }

  console.log('\n=== 测试完成 ===');
}

main().catch(console.error);
