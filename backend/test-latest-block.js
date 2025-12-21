const { createPublicClient, http } = require('viem');
const { bscTestnet, sepolia, polygonMumbai, arbitrumGoerli } = require('viem/chains');

// 链配置（从chains.ts复制）
const SUPPORTED_CHAINS = {
  BSC_TESTNET: {
    rpcUrl: 'https://bsc-testnet.publicnode.com',
    name: 'BSC Testnet'
  },
  ETH_SEPOLIA: {
    rpcUrl: 'https://ethereum-sepolia.core.chainstack.com/957f76502df7cde9b0b45870eb2fda46',
    name: 'Ethereum Sepolia'
  },
  ZETACHAIN_ATHENS: {
    rpcUrl: 'https://zetachain-athens-evm.blockpi.network/v1/rpc/public',
    name: 'ZetaChain Athens'
  },
  POLYGON_MUMBAI: {
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    name: 'Polygon Mumbai'
  },
  ARBITRUM_GOERLI: {
    rpcUrl: 'https://goerli-rollup.arbitrum.io/rpc',
    name: 'Arbitrum Goerli'
  }
};

// 定义 ZetaChain Athens 链对象
const zetachainAthens = {
  id: 7001,
  name: 'ZetaChain Athens',
  nativeCurrency: { name: 'ZETA', symbol: 'aZETA', decimals: 18 },
  rpcUrls: { default: { http: [SUPPORTED_CHAINS.ZETACHAIN_ATHENS.rpcUrl] } },
};

// 创建客户端
const clients = {
  BSC_TESTNET: createPublicClient({
    chain: bscTestnet,
    transport: http(SUPPORTED_CHAINS.BSC_TESTNET.rpcUrl),
  }),
  ETH_SEPOLIA: createPublicClient({
    chain: sepolia,
    transport: http(SUPPORTED_CHAINS.ETH_SEPOLIA.rpcUrl),
  }),
  ZETACHAIN_ATHENS: createPublicClient({
    chain: zetachainAthens,
    transport: http(SUPPORTED_CHAINS.ZETACHAIN_ATHENS.rpcUrl),
  }),
  POLYGON_MUMBAI: createPublicClient({
    chain: polygonMumbai,
    transport: http(SUPPORTED_CHAINS.POLYGON_MUMBAI.rpcUrl),
  }),
  ARBITRUM_GOERLI: createPublicClient({
    chain: arbitrumGoerli,
    transport: http(SUPPORTED_CHAINS.ARBITRUM_GOERLI.rpcUrl),
  }),
};

async function testLatestBlockData() {
  console.log('🧪 测试最新区块数据获取...\n');

  for (const [chainKey, client] of Object.entries(clients)) {
    try {
      console.log(`\n📍 测试链: ${SUPPORTED_CHAINS[chainKey].name}`);
      
      // 1. 获取最新区块号
      const latestBlockNumber = await client.getBlockNumber();
      console.log(`   最新区块号: ${latestBlockNumber}`);
      
      // 2. 获取最新区块详情（包含交易）
      const latestBlock = await client.getBlock({ 
        blockNumber: latestBlockNumber,
        includeTransactions: true 
      });
      
      console.log(`   区块哈希: ${latestBlock.hash}`);
      console.log(`   时间戳: ${new Date(Number(latestBlock.timestamp) * 1000).toISOString()}`);
      console.log(`   交易数量: ${latestBlock.transactions.length}`);
      
      // 3. 分析交易中的地址
      const addresses = new Set();
      let gasUsed = BigInt(0);
      
      for (const tx of latestBlock.transactions) {
        if (tx.from) addresses.add(tx.from.toLowerCase());
        if (tx.to) addresses.add(tx.to.toLowerCase());
      }
      
      console.log(`   发现地址数: ${addresses.size}`);
      
      // 4. 显示前几个地址
      const addressList = Array.from(addresses).slice(0, 5);
      addressList.forEach((addr, index) => {
        console.log(`     地址${index + 1}: ${addr}`);
      });
      
      // 5. 验证地址有效性
      if (addressList.length > 0) {
        const testAddress = addressList[0];
        try {
          const balance = await client.getBalance({ 
            address: testAddress 
          });
          const txCount = await client.getTransactionCount({ 
            address: testAddress 
          });
          const code = await client.getBytecode({ 
            address: testAddress 
          });
          
          console.log(`   验证地址 ${testAddress.slice(0, 8)}...:`);
          console.log(`     余额: ${balance} wei`);
          console.log(`     交易数: ${txCount}`);
          console.log(`     是否合约: ${code !== '0x'}`);
          
          // 判断是否为活跃地址
          const isActive = txCount > 0 && balance > 0 && code === '0x';
          console.log(`     是否活跃: ${isActive ? '✅ 是' : '❌ 否'}`);
          
        } catch (error) {
          console.log(`     验证失败: ${error.message}`);
        }
      }
      
      console.log(`   ✅ ${chainKey} 测试完成`);
      
    } catch (error) {
      console.log(`   ❌ ${chainKey} 测试失败: ${error.message}`);
    }
  }
  
  console.log('\n🎉 所有测试完成！');
}

async function testLuckyAddressDiscovery() {
  console.log('\n🎲 测试幸运地址发现功能...\n');
  
  for (const [chainKey, client] of Object.entries(clients)) {
    try {
      console.log(`\n📍 在 ${SUPPORTED_CHAINS[chainKey].name} 发现幸运地址:`);
      
      // 获取最新区块
      const latestBlock = await client.getBlock({ 
        includeTransactions: true 
      });
      
      if (!latestBlock || !latestBlock.transactions || latestBlock.transactions.length === 0) {
        console.log('   ❌ 区块为空或无交易');
        continue;
      }
      
      // 收集地址
      const candidates = new Set();
      for (const tx of latestBlock.transactions) {
        if (tx.from) candidates.add(tx.from.toLowerCase());
        if (tx.to) candidates.add(tx.to.toLowerCase());
      }
      
      const candidateList = Array.from(candidates);
      candidateList.sort(() => Math.random() - 0.5);
      
      let luckyAddress = null;
      
      // 寻找符合条件的地址
      for (const addr of candidateList) {
        if (addr === '0x0000000000000000000000000000000000000000') continue;
        
        try {
          const code = await client.getBytecode({ address: addr });
          if (code && code !== '0x') continue;
          
          const balance = await client.getBalance({ address: addr });
          if (balance > BigInt(0)) {
            luckyAddress = addr;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (luckyAddress) {
        console.log(`   ✅ 发现幸运地址: ${luckyAddress}`);
        
        // 获取地址详情
        const balance = await client.getBalance({ address: luckyAddress });
        const txCount = await client.getTransactionCount({ address: luckyAddress });
        
        console.log(`     余额: ${balance} wei`);
        console.log(`     交易数: ${txCount}`);
      } else {
        console.log('   ❌ 未找到符合条件的幸运地址');
      }
      
    } catch (error) {
      console.log(`   ❌ 发现失败: ${error.message}`);
    }
  }
}

// 运行测试
async function runTests() {
  await testLatestBlockData();
  await testLuckyAddressDiscovery();
}

runTests().catch(console.error);