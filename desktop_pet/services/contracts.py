# -*- coding: utf-8 -*-
"""
合约配置和交互模块
"""

# ZetaFrog NFT 合约地址 (ZetaChain Athens 测试网)
ZETAFROG_ADDRESS = "0x76e7baA23fce77DA7Edbea58D8B888128D47A1Ff"
SOUVENIR_ADDRESS = "0x9eC88079939357EC5Efe59d1687AC8b85f65857b"

# ZetaChain Athens 测试网配置
CHAIN_CONFIG = {
    "chain_id": 7001,
    "name": "ZetaChain Athens",
    "rpc_url": "https://zetachain-athens-evm.blockpi.network/v1/rpc/public",
    "symbol": "ZETA",
    "explorer": "https://athens.explorer.zetachain.com"
}

# ZetaFrogNFT ABI (仅包含需要的函数)
ZETAFROG_ABI = [
    # mintFrog - 铸造青蛙
    {
        "inputs": [{"internalType": "string", "name": "name", "type": "string"}],
        "name": "mintFrog",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    # startTravel - 开始旅行
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
    # getFrog - 获取青蛙信息
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
    # balanceOf - 获取余额
    {
        "inputs": [{"internalType": "address", "name": "owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    # totalSupply - 获取总量
    {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    # FrogMinted 事件
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "owner", "type": "address"},
            {"indexed": True, "name": "tokenId", "type": "uint256"},
            {"indexed": False, "name": "name", "type": "string"},
            {"indexed": False, "name": "timestamp", "type": "uint256"}
        ],
        "name": "FrogMinted",
        "type": "event"
    }
]
