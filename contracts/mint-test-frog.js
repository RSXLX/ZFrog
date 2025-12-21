const { createWalletClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { zetachainAthens } = require('viem/chains');

// 合约地址和 ABI
const ZETAFROG_ADDRESS = "0x8460344d5435D08CaBAE2f1157D355209cb9E7cF";
const ZETAFROG_ABI = [
  {
    "inputs": [{"internalType": "string", "name": "name", "type": "string"}],
    "name": "mintFrog",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

async function mintTestFrog() {
  // 创建钱包客户端
  const account = privateKeyToAccount('0x3cdf8ed8657b4dbb0cb06b231a90f2caa272a936e26dfacf93df5024d5d857fc');
  
  const client = createWalletClient({
    account,
    chain: zetachainAthens,
    transport: http('https://zetachain-athens-evm.blockpi.network/v1/rpc/public'),
  });

  try {
    console.log('正在创建青蛙...');
    
    // 调用 mintFrog 函数
    const hash = await client.writeContract({
      address: ZETAFROG_ADDRESS,
      abi: ZETAFROG_ABI,
      functionName: 'mintFrog',
      args: ['测试青蛙'],
    });
    console.log('交易哈希:', hash);
    
    // 等待交易确认
    const receipt = await client.waitForTransactionReceipt({ hash });
    console.log('交易已确认!');
    console.log('青蛙创建成功!');
    
    // 解析日志获取 tokenId
    if (receipt.logs && receipt.logs.length > 0) {
      // 这里需要根据实际的事件日志解析 tokenId
      // 暂时使用一个示例值
      console.log('请检查合约日志获取实际的 tokenId');
    }
    
  } catch (error) {
    console.error('创建青蛙失败:', error);
  }
}

mintTestFrog();