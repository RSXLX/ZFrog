// backend/scripts/test-mint.js
// 使用 ethers.js 测试铸造

const { ethers } = require('ethers');

const PRIVATE_KEY = '3cdf8ed8657b4dbb0cb06b231a90f2caa272a936e26dfacf93df5024d5d857fc';
const CONTRACT_ADDRESS = '0x76e7baA23fce77DA7Edbea58D8B888128D47A1Ff';
const RPC_URLS = [
    'https://zetachain-athens-evm.blockpi.network/v1/rpc/public',
    'https://zetachain-athens.g.allthatnode.com/archive/evm'
];

async function main() {
    console.log('=== 铸造测试开始 ===');
    
    let provider;
    for (const url of RPC_URLS) {
        try {
            console.log(`尝试连接 RPC: ${url}`);
            provider = new ethers.JsonRpcProvider(url);
            await provider.getNetwork();
            console.log('连接成功');
            break;
        } catch (e) {
            console.log('连接失败');
        }
    }

    if (!provider) {
        console.error('所有 RPC 连接失败');
        return;
    }

    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    console.log(`钱包地址: ${wallet.address}`);
    
    // 检查地址是否为合约
    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (code === '0x') {
        console.error('❌ 错误：该地址不是合约地址！(代码为空)');
        return;
    }
    console.log('✅ 目标地址是有效的合约');
    
    const balance = await provider.getBalance(wallet.address);
    console.log(`ZETA 余额: ${ethers.formatEther(balance)} ZETA`);
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, MINT_ABI, wallet);
    
    // 获取当前 totalSupply
    try {
        const currentSupply = await contract.totalSupply();
        console.log(`当前 NFT 总量: ${currentSupply}`);
    } catch (e) {
        console.error('❌ 如果是合约，但调用 totalSupply 失败，可能是 ABI 不匹配或合约未初始化');
        console.error(e.shortMessage || e.message);
        return;
    }

    
    // 铸造青蛙
    const frogName = `TestFrog_${Date.now()}`;
    console.log(`\n正在铸造青蛙: ${frogName}...`);
    
    try {
        const tx = await contract.mintFrog(frogName);
        console.log(`交易已发送: ${tx.hash}`);
        console.log('等待交易确认...');
        
        const receipt = await tx.wait();
        console.log(`交易已确认!`);
        console.log(`  区块号: ${receipt.blockNumber}`);
        console.log(`  Gas 使用: ${receipt.gasUsed}`);
        console.log(`  状态: ${receipt.status === 1 ? '✅ 成功' : '❌ 失败'}`);
        
        // 解析事件
        for (const log of receipt.logs) {
            try {
                const parsed = contract.interface.parseLog(log);
                if (parsed && parsed.name === 'FrogMinted') {
                    console.log(`\n🎉 FrogMinted 事件:`);
                    console.log(`  TokenId: ${parsed.args.tokenId}`);
                    console.log(`  Owner: ${parsed.args.owner}`);
                    console.log(`  Name: ${parsed.args.name}`);
                }
            } catch (e) {}
        }
        
        console.log('\n=== 铸造完成 ===');
        console.log(`请检查后端日志是否出现: FrogMinted: tokenId=${expectedTokenId}`);
        
    } catch (error) {
        console.error('铸造失败:', error.message);
    }
}

main().catch(console.error);
