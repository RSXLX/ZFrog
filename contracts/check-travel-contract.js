const { ethers } = require('ethers');

// Travel 合约地址
const TRAVEL_ADDRESS = '0xa2B8FE6dF99C86eE577fD69E27DC8AdA7e619eB0';

// 最小化的 ABI - 只包含 startTravel
const TRAVEL_ABI = [
  {
    inputs: [
      {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
      {"internalType": "address", "name": "targetWallet", "type": "address"},
      {"internalType": "uint256", "name": "duration", "type": "uint256"},
      {"internalType": "uint256", "name": "targetChainId", "type": "uint256"}
    ],
    name: 'startTravel',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
];

async function checkContract() {
  try {
    // 连接到 ZetaChain Athens 测试网
    const provider = new ethers.JsonRpcProvider('https://zetachain-athens.g.allthatnode.com/archive/evm');
    
    console.log('连接到网络...');
    const network = await provider.getNetwork();
    console.log(`网络 Chain ID: ${network.chainId}`);
    
    // 检查合约代码
    console.log(`\n检查合约地址: ${TRAVEL_ADDRESS}`);
    const code = await provider.getCode(TRAVEL_ADDRESS);
    
    if (code === '0x') {
      console.log('❌ 合约未部署或地址错误！');
      return;
    }
    
    console.log(`✅ 合约已部署 (代码长度: ${code.length} bytes)`);
    
    // 尝试创建合约实例
    const travelContract = new ethers.Contract(TRAVEL_ADDRESS, TRAVEL_ABI, provider);
    
    // 检查函数是否存在
    console.log('\n检查 startTravel 函数...');
    if (typeof travelContract.startTravel === 'function') {
      console.log('✅ startTravel 函数存在！');
      
      // 获取函数签名
      const fragment = travelContract.interface.getFunction('startTravel');
      console.log(`函数签名: ${fragment.format()}`);
      console.log(`函数选择器: ${fragment.selector}`);
    } else {
      console.log('❌ startTravel 函数不存在！');
    }
    
  } catch (error) {
    console.error('错误:', error.message);
  }
}

checkContract();
