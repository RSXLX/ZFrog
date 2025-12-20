import { createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// 合约地址
const ZETAFROG_ADDRESS = "0x691A531469e70300ebb09A9323bdcea18BA00E25" as `0x${string}`;
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
        "inputs": [],
        "name": "travelManager",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "souvenirNFT",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "ownerOf",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
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
        "name": "canTravel",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    }
];

async function checkContract() {
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

        const account = privateKeyToAccount(privateKey as `0x${string}`);
        console.log(`Relayer account: ${account.address}`);

        // 检查合约配置
        const travelManager = await publicClient.readContract({
            address: ZETAFROG_ADDRESS,
            abi: ZETAFROG_ABI,
            functionName: 'travelManager',
        });

        const souvenirNFT = await publicClient.readContract({
            address: ZETAFROG_ADDRESS,
            abi: ZETAFROG_ABI,
            functionName: 'souvenirNFT',
        });

        console.log(`Current travelManager: ${travelManager as string}`);
        console.log(`Current souvenirNFT: ${souvenirNFT as string}`);
        console.log(`Relayer account: ${account.address}`);
        console.log(`Is relayer the travel manager? ${(travelManager as string).toLowerCase() === account.address.toLowerCase()}`);

        // 检查一个青蛙的状态
        try {
            const owner = await publicClient.readContract({
                address: ZETAFROG_ADDRESS,
                abi: ZETAFROG_ABI,
                functionName: 'ownerOf',
                args: [1n],
            });
            console.log(`Frog #1 owner: ${owner}`);

            const frog = await publicClient.readContract({
                address: ZETAFROG_ADDRESS,
                abi: ZETAFROG_ABI,
                functionName: 'getFrog',
                args: [1n],
            });
            console.log(`Frog #1 status: ${(frog as any)[3]}`); // status is at index 3

            const canTravel = await publicClient.readContract({
                address: ZETAFROG_ADDRESS,
                abi: ZETAFROG_ABI,
                functionName: 'canTravel',
                args: [1n],
            });
            console.log(`Frog #1 can travel: ${canTravel}`);
        } catch (error: any) {
            console.log(`Failed to check frog #1: ${error.message}`);
        }

    } catch (error) {
        console.error('Error checking contract:', error);
    }
}

checkContract();