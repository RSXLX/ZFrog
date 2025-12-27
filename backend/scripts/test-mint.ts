// backend/scripts/test-mint.ts
// 测试铸造青蛙并验证数据库写入

import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';

const zetachainAthens = defineChain({
    id: 7001,
    name: 'ZetaChain Athens Testnet',
    nativeCurrency: { decimals: 18, name: 'ZETA', symbol: 'ZETA' },
    rpcUrls: { default: { http: ['https://zetachain-athens-evm.blockpi.network/v1/rpc/public'] } },
});

const PRIVATE_KEY = '0x3cdf8ed8657b4dbb0cb06b231a90f2caa272a936e26dfacf93df5024d5d857fc';
const CONTRACT_ADDRESS = '0x2A3F43376dFC0e4f4B87edC2B3e66d23a4E1c3a8' as const;

const MINT_ABI = [
    {
        inputs: [{ internalType: 'string', name: 'name', type: 'string' }],
        name: 'mintFrog',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'totalSupply',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

async function main() {
    console.log('=== 铸造测试开始 ===');
    
    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
    console.log(`钱包地址: ${account.address}`);

    const publicClient = createPublicClient({
        chain: zetachainAthens,
        transport: http(),
    });

    const walletClient = createWalletClient({
        account,
        chain: zetachainAthens,
        transport: http(),
    });

    // 检查余额
    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`ZETA 余额: ${Number(balance) / 1e18} ZETA`);

    if (balance < parseEther('0.01')) {
        console.error('余额不足，需要至少 0.01 ZETA');
        return;
    }

    // 获取当前 totalSupply
    const currentSupply = await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: MINT_ABI,
        functionName: 'totalSupply',
    });
    console.log(`当前 NFT 总量: ${currentSupply}`);
    const expectedTokenId = Number(currentSupply) + 1;
    console.log(`预期新 TokenId: ${expectedTokenId}`);

    // 铸造青蛙
    const frogName = `TestFrog_${Date.now()}`;
    console.log(`\n正在铸造青蛙: ${frogName}...`);

    try {
        const hash = await walletClient.writeContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: MINT_ABI,
            functionName: 'mintFrog',
            args: [frogName],
        });

        console.log(`交易已发送: ${hash}`);
        console.log('等待交易确认...');

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log(`交易已确认!`);
        console.log(`  区块号: ${receipt.blockNumber}`);
        console.log(`  Gas 使用: ${receipt.gasUsed}`);
        console.log(`  状态: ${receipt.status === 'success' ? '✅ 成功' : '❌ 失败'}`);

        // 验证新的 totalSupply
        const newSupply = await publicClient.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: MINT_ABI,
            functionName: 'totalSupply',
        });
        console.log(`\n新 NFT 总量: ${newSupply}`);

        console.log('\n=== 铸造完成 ===');
        console.log(`请检查后端日志是否出现: FrogMinted: tokenId=${expectedTokenId}`);
        console.log('如果出现该日志，说明事件监听正常工作！');

    } catch (error: any) {
        console.error('铸造失败:', error.message);
    }
}

main().catch(console.error);
