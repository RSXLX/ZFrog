// backend/src/config/index.ts
import dotenv from 'dotenv';
dotenv.config();

// ZetaChain Athens Testnet RPC endpoints (fallback order when rate limited)
export const ZETACHAIN_RPC_URLS = [
  'https://zetachain-athens.g.allthatnode.com/archive/evm',
  'https://zetachain-athens-evm.blockpi.network/v1/rpc/public',
  'https://zeta-chain-testnet.drpc.org',
  'https://zetachain-testnet-evm.itrocket.net',
];

export const config = {
  // Server
  PORT: parseInt(process.env.PORT || '3001'),
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL || '',
  REDIS_URL: process.env.REDIS_URL || '',
  
  // Blockchain - Primary RPC (can be overridden by env)
  ZETACHAIN_RPC_URL: process.env.ZETACHAIN_RPC_URL || ZETACHAIN_RPC_URLS[0],
  ZETACHAIN_RPC_URLS, // Export all URLs for fallback
  ALCHEMY_ETH_URL: process.env.ALCHEMY_ETH_URL || '',
  
  // Contracts
  ZETAFROG_NFT_ADDRESS: process.env.ZETAFROG_NFT_ADDRESS || '0x0721CDff3291a1Dd2af28633B5dEE5427553F09E',
  SOUVENIR_NFT_ADDRESS: process.env.SOUVENIR_NFT_ADDRESS || '0xCE871f9F009f7Fa49f23f0EEE09977FfB7b4DbF5',
  TRAVEL_CONTRACT_ADDRESS: process.env.TRAVEL_CONTRACT_ADDRESS || '0x4e8884F6a8CEadBCfAaEEa9B888560Ac9570fbB3',
  
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
  
  // JWT (新增)
  JWT_SECRET: process.env.JWT_SECRET || 'zetafrog-default-secret-change-in-production',
  
  // Chain
  CHAIN_ID: parseInt(process.env.CHAIN_ID || '7001'),
  
  // ============ Cross-Chain Contracts ============
  // Cross-chain travel contracts - HARDCODED to ensure correct addresses
  // Cross-chain travel contracts
  OMNI_TRAVEL_ADDRESS: process.env.OMNI_TRAVEL_ADDRESS || '0x7e85A33380f6994e510F884238f37827B25e50d5',
  BSC_CONNECTOR_ADDRESS: '0x8E79969718D2ffFf2a16DA65DE8cE097ceA04aec',
  SEPOLIA_CONNECTOR_ADDRESS: '0xca54986f91129D1AF3de67b331eBB36b330863C9',
  
  // FrogFootprint addresses
  BSC_FOOTPRINT_ADDRESS: process.env.BSC_FOOTPRINT_ADDRESS || '0x9571ce7FdaBfe3A234dABE3eaa01704A62AF643e',
  SEPOLIA_FOOTPRINT_ADDRESS: process.env.SEPOLIA_FOOTPRINT_ADDRESS || '0x319421300114065F601a0103ec1eC3AB2652C5Da',
  
  // Cross-Chain RPC URLs
  BSC_TESTNET_RPC_URL: process.env.BSC_TESTNET_RPC_URL || 'https://bsc-testnet-rpc.publicnode.com',
  ETH_SEPOLIA_RPC_URL: process.env.ETH_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
  
  // Private key for relayer transactions
  PRIVATE_KEY: process.env.PRIVATE_KEY || '',
};
