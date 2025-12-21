// 简单测试后端地址发现功能
const { createPublicClient, http } = require('viem');
const { bscTestnet, sepolia } = require('viem/chains');

async function testSimpleAddressDiscovery() {
    console.log('🧪 测试简单的地址发现功能...\n');
    
    // 测试 ZetaChain
    console.log('📍 测试链: ZETACHAIN_ATHENS');
    
    try {
        const client = createPublicClient({
            chain: {
                id: 7001,
                name: 'ZetaChain Athens',
                nativeCurrency: { name: 'ZETA', symbol: 'aZETA', decimals: 18 },
                rpcUrls: { default: { http: ['https://zetachain-athens-evm.blockpi.network/v1/rpc/public'] } },
            },
            transport: http(),
        });
        
        // 获取最新区块
        console.log('🔍 获取最新区块...');
        const latestBlock = await client.getBlock({ includeTransactions: true });
        
        if (!latestBlock || !latestBlock.transactions || latestBlock.transactions.length === 0) {
            console.log('❌ 区块为空或没有交易');
            return;
        }
        
        console.log(`✅ 找到区块 #${latestBlock.number}，包含 ${latestBlock.transactions.length} 笔交易`);
        
        // 收集地址
        const candidates = new Set();
        for (const tx of latestBlock.transactions) {
            if (tx.from) candidates.add(tx.from.toLowerCase());
            if (tx.to) candidates.add(tx.to.toLowerCase());
        }
        
        console.log(`✅ 收集到 ${candidates.size} 个候选地址`);
        
        // 随机选择一个地址
        const candidateList = Array.from(candidates);
        const randomAddress = candidateList[Math.floor(Math.random() * candidateList.length)];
        
        console.log(`✅ 随机选择地址: ${randomAddress.slice(0, 6)}...${randomAddress.slice(-4)}`);
        
        // 验证地址
        const code = await client.getBytecode({ address: randomAddress });
        const balance = await client.getBalance({ address: randomAddress });
        const nonce = await client.getTransactionCount({ address: randomAddress });
        
        console.log(`📊 地址信息:`);
        console.log(`  - 是合约: ${code !== '0x'}`);
        console.log(`  - 余额: ${balance.toString()} wei`);
        console.log(`  - 交易数: ${nonce}`);
        
        if (code === '0x' && balance > 0n && nonce >= 5) {
            console.log('✅ 这是一个有效的目标地址!');
        } else {
            console.log('⚠️ 这个地址可能不太适合作为目标');
        }
        
        console.log('\n✅ ZETACHAIN_ATHENS 测试通过!');
        
    } catch (error) {
        console.error(`❌ ZETACHAIN_ATHENS 测试失败:`, error.message);
    }
    
    console.log('\n✅ 简单地址发现测试完成!');
}

testSimpleAddressDiscovery().catch(console.error);