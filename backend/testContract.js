const { createPublicClient, http, createWalletClient } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

// 合约地址
const ZETAFROG_ADDRESS = "0x691A531469e70300ebb09A9323bdcea18BA00E25";
const RELAYER_PRIVATE_KEY = "3cdf8ed8657b4dbb0cb06b231a90f2caa272a936e26dfacf93df5024d5d857fc";

// ZetaChain Athens Testnet
const zetachainAthens = {
    id: 7001,
    name: 'ZetaChain Athens Testnet',
    nativeCurrency: {
        name: 'ZETA',
        symbol: 'ZETA',
        decimals: 18
    },
    rpcUrls: {
        default: { http: ['https://zetachain-athens-evm.blockpi.network/v1/rpc/public'] },
    },
};

// ZetaFrog ABI (简化版)
const ZETAFROG_ABI = [
    {
        "inputs": [
            {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
            {"internalType": "address", "name": "targetWallet", "type": "address"},
            {"internalType": "uint256", "name": "duration", "type": "uint256"},
            {"internalType": "uint256", "name": "targetChainId", "type": "uint256"}
        ],
        "name": "startTravel",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
            {"internalType": "string", "name": "journalHash", "type": "string"},
            {"internalType": "uint256", "name": "souvenirId", "type": "uint256"}
        ],
        "name": "completeTravel",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "getFrog",
        "outputs": [
            {"internalType": "string", "name": "name", "type": "string"},
            {"internalType": "uint64", "name": "birthday", "type": "uint64"},
            {"internalType": "uint32", "name": "totalTravels", "type": "uint32"},
            {"internalType": "uint8", "name": "status", "type": "uint8"},
            {"internalType": "uint256", "name": "xp", "type": "uint256"},
            {"internalType": "uint256", "name": "level", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "getActiveTravel",
        "outputs": [
            {"internalType": "uint64", "name": "startTime", "type": "uint64"},
            {"internalType": "uint64", "name": "endTime", "type": "uint64"},
            {"internalType": "address", "name": "targetWallet", "type": "address"},
            {"internalType": "uint256", "name": "targetChainId", "type": "uint256"},
            {"internalType": "bool", "name": "completed", "type": "bool"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

async function testContractInteraction() {
    try {
        // 创建客户端
        const publicClient = createPublicClient({
            chain: zetachainAthens,
            transport: http(),
        });

        let privateKey = RELAYER_PRIVATE_KEY;
        if (!privateKey.startsWith('0x')) {
            privateKey = `0x${privateKey}`;
        }

        const account = privateKeyToAccount(privateKey);
        console.log(`Relayer account: ${account.address}`);

        const walletClient = createWalletClient({
            account,
            chain: zetachainAthens,
            transport: http(),
        });

        // 检查青蛙当前状态
        const frog = await publicClient.readContract({
            address: ZETAFROG_ADDRESS,
            abi: ZETAFROG_ABI,
            functionName: 'getFrog',
            args: [1n],
        });
        console.log(`Frog #1 status before: ${frog[3]}`);

        try {
            const activeTravel = await publicClient.readContract({
                address: ZETAFROG_ADDRESS,
                abi: ZETAFROG_ABI,
                functionName: 'getActiveTravel',
                args: [1n],
            });
            console.log(`Active travel: ${JSON.stringify(activeTravel)}`);
        } catch (error) {
            console.log(`No active travel: ${error.message}`);
        }

        // 测试完成旅行（模拟后端操作）
        console.log('Testing completeTravel...');
        try {
            const { request } = await publicClient.simulateContract({
                address: ZETAFROG_ADDRESS,
                abi: ZETAFROG_ABI,
                functionName: 'completeTravel',
                args: [1n, "ipfs://test", 0n],
                account,
            });

            const hash = await walletClient.writeContract(request);
            console.log(`Transaction hash: ${hash}`);

            const receipt = await publicClient.waitForTransactionReceipt({ 
                hash,
                timeout: 60_000,
            });

            console.log(`Transaction status: ${receipt.status}`);

            // 再次检查青蛙状态
            const frogAfter = await publicClient.readContract({
                address: ZETAFROG_ADDRESS,
                abi: ZETAFROG_ABI,
                functionName: 'getFrog',
                args: [1n],
            });
            console.log(`Frog #1 status after: ${frogAfter[3]}`);

        } catch (error) {
            console.error(`completeTravel failed: ${error.message}`);
            console.error(`Full error:`, error);
        }

    } catch (error) {
        console.error('Error testing contract:', error);
    }
}

testContractInteraction();