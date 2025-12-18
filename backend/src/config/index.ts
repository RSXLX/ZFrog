import dotenv from 'dotenv';
dotenv.config();

export const config = {
    // Server
    PORT: parseInt(process.env.PORT || '3001'),
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // Database
    DATABASE_URL: process.env.DATABASE_URL || '',
    REDIS_URL: process.env.REDIS_URL || '',
    
    // Blockchain
    ZETACHAIN_RPC_URL: process.env.ZETACHAIN_RPC_URL || 'https://zetachain-athens.g.allthatnode.com/archive/evm',
    ALCHEMY_ETH_URL: process.env.ALCHEMY_ETH_URL || '',
    
    // Contracts
    ZETAFROG_NFT_ADDRESS: process.env.ZETAFROG_NFT_ADDRESS || '',
    SOUVENIR_NFT_ADDRESS: process.env.SOUVENIR_NFT_ADDRESS || '',
    
    // Relayer
    RELAYER_PRIVATE_KEY: process.env.RELAYER_PRIVATE_KEY || '',
    
    // AI (Qwen)
    QWEN_API_KEY: process.env.QWEN_API_KEY || '',
    QWEN_BASE_URL: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    
    // IPFS
    PINATA_API_KEY: process.env.PINATA_API_KEY || '',
    PINATA_SECRET_KEY: process.env.PINATA_SECRET_KEY || '',
    
    // Frontend
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
};
