// ZetaFrogNFT ABI (简化版，包含主要功能)
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
            {"internalType": "uint256", "name": "duration", "type": "uint256"}
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
            {"internalType": "uint8", "name": "status", "type": "uint8"}
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
        "anonymous": false,
        "inputs": [
            {"indexed": true, "name": "owner", "type": "address"},
            {"indexed": true, "name": "tokenId", "type": "uint256"},
            {"indexed": false, "name": "name", "type": "string"},
            {"indexed": false, "name": "timestamp", "type": "uint256"}
        ],
        "name": "FrogMinted",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "name": "tokenId", "type": "uint256"},
            {"indexed": true, "name": "targetWallet", "type": "address"},
            {"indexed": false, "name": "startTime", "type": "uint64"},
            {"indexed": false, "name": "endTime", "type": "uint64"}
        ],
        "name": "TravelStarted",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "name": "tokenId", "type": "uint256"},
            {"indexed": false, "name": "journalHash", "type": "string"},
            {"indexed": false, "name": "souvenirId", "type": "uint256"},
            {"indexed": false, "name": "timestamp", "type": "uint256"}
        ],
        "name": "TravelCompleted",
        "type": "event"
    }
] as const;

// SouvenirNFT ABI
export const SOUVENIR_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "uint256", "name": "frogId", "type": "uint256"},
            {"internalType": "uint256", "name": "rarityRoll", "type": "uint256"}
        ],
        "name": "mintSouvenir",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "souvenirId", "type": "uint256"},
            {"internalType": "string", "name": "uri_", "type": "string"}
        ],
        "name": "setMetadataURI",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "souvenirId", "type": "uint256"}],
        "name": "getSouvenir",
        "outputs": [
            {"internalType": "string", "name": "name", "type": "string"},
            {"internalType": "uint8", "name": "rarity", "type": "uint8"},
            {"internalType": "uint256", "name": "frogId", "type": "uint256"},
            {"internalType": "uint64", "name": "mintTime", "type": "uint64"},
            {"internalType": "string", "name": "metadataURI", "type": "string"}
        ],
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
        "anonymous": false,
        "inputs": [
            {"indexed": true, "name": "souvenirId", "type": "uint256"},
            {"indexed": true, "name": "frogId", "type": "uint256"},
            {"indexed": true, "name": "owner", "type": "address"},
            {"indexed": false, "name": "rarity", "type": "uint8"},
            {"indexed": false, "name": "name", "type": "string"}
        ],
        "name": "SouvenirMinted",
        "type": "event"
    }
] as const;
