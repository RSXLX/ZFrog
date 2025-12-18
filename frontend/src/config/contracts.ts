// 合约地址
export const ZETAFROG_ADDRESS = (import.meta.env.VITE_ZETAFROG_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
export const SOUVENIR_ADDRESS = (import.meta.env.VITE_SOUVENIR_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;

// ZetaFrogNFT ABI
export const ZETAFROG_ABI = [
    {
        "inputs": [{"internalType": "string", "name": "name", "type": "string"}],
        "name": "mintFrog",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
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
        "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "cancelTravel",
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
    },
    {
        "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "canTravel",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "ownerOf",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    }
] as const;
