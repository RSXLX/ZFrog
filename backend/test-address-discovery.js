// 测试后端地址发现功能
const { explorationService } = require('./dist/services/travel/exploration.service');

async function testAddressDiscovery() {
    console.log('🧪 测试后端地址发现功能...\n');
    
    const chains = ['ZETACHAIN_ATHENS', 'BSC_TESTNET', 'ETH_SEPOLIA'];
    
    for (const chain of chains) {
        console.log(`\n📍 测试链: ${chain}`);
        
        try {
            console.log(`🔍 正在发现随机地址...`);
            const address = await explorationService.getRandomTargetAddress(chain);
            
            console.log(`✅ 发现地址: ${address}`);
            console.log(`📍 地址前6位: ${address.slice(0, 6)}...${address.slice(-4)}`);
            
            // 验证地址格式
            const isValidFormat = /^0x[a-fA-F0-9]{40}$/.test(address);
            console.log(`✅ 地址格式有效: ${isValidFormat}`);
            
            // 验证不是零地址
            const isNotZero = address !== '0x0000000000000000000000000000000000000000';
            console.log(`✅ 不是零地址: ${isNotZero}`);
            
            console.log(`\n✅ ${chain} 测试通过!`);
            
        } catch (error) {
            console.error(`❌ ${chain} 测试失败:`, error.message);
        }
    }
    
    console.log('\n✅ 地址发现测试完成!');
}

// 编译并运行
const { execSync } = require('child_process');

try {
    console.log('📦 编译TypeScript代码...');
    execSync('npx tsc', { stdio: 'inherit' });
    
    testAddressDiscovery().catch(console.error);
} catch (error) {
    console.error('编译失败:', error.message);
}