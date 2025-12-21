const { explorationService } = require('./dist/services/travel/exploration.service');

async function testSepoliaAddress() {
  console.log('🧪 测试Sepolia地址发现功能...\n');
  
  try {
    const luckyAddress = await explorationService.getRandomTargetAddress('ETH_SEPOLIA');
    console.log('✅ 成功发现Sepolia幸运地址:', luckyAddress);
  } catch (error) {
    console.log('❌ Sepolia地址发现失败:', error.message);
  }
}

testSepoliaAddress();