// backend/src/services/contract.service.ts
import { createWalletClient, createPublicClient, http, parseEther, Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bscTestnet, sepolia } from 'viem/chains';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ZETAFROG_ABI } from '../config/contracts';

// 自定义ZetaChain测试网配置
const zetaChainTestnet = {
  id: 7001,
  name: 'ZetaChain Athens Testnet',
  nativeCurrency: {
    name: 'ZETA',
    symbol: 'ZETA',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [config.ZETACHAIN_RPC_URL] },
  },
  blockExplorers: {
    default: { name: 'ZetaChain Explorer', url: 'https://athens.explorer.zetachain.com' },
  },
  testnet: true,
} as const;

// 支持的链配置
const CHAIN_CONFIG = {
  BSC_TESTNET: {
    chain: bscTestnet,
    client: createPublicClient({
      chain: bscTestnet,
      transport: http(process.env.BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545'),
    }),
  },
  ETH_SEPOLIA: {
    chain: sepolia,
    client: createPublicClient({
      chain: sepolia,
      transport: http(process.env.ALCHEMY_ETH_URL || 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'),
    }),
  },
  ZETACHAIN_ATHENS: {
    chain: zetaChainTestnet,
    client: createPublicClient({
      chain: zetaChainTestnet,
      transport: http(config.ZETACHAIN_RPC_URL),
    }),
  },
};

export class ContractService {
  private walletClients: Record<string, any> = {};

  constructor() {
    // 初始化每个链的钱包客户端
    if (config.RELAYER_PRIVATE_KEY) {
      const account = privateKeyToAccount(config.RELAYER_PRIVATE_KEY as Hex);
      
      Object.entries(CHAIN_CONFIG).forEach(([chainKey, config]) => {
        this.walletClients[chainKey] = createWalletClient({
          account,
          chain: config.chain,
          transport: http(),
        });
      });
    } else {
      logger.warn('RELAYER_PRIVATE_KEY not configured, contract interactions will fail');
    }
  }

  /**
   * 发起随机探索旅行
   */
  async startRandomTravel(
    frogTokenId: number,
    targetChain: string,
    duration: number
  ): Promise<{ txHash: string; travelId: number }> {
    try {
      if (!config.RELAYER_PRIVATE_KEY) {
        throw new Error('Relayer private key not configured');
      }

      if (!config.ZETAFROG_NFT_ADDRESS) {
        throw new Error('ZetaFrog NFT contract address not configured');
      }

      const chainConfig = CHAIN_CONFIG[targetChain as keyof typeof CHAIN_CONFIG];
      if (!chainConfig) {
        throw new Error(`Unsupported chain: ${targetChain}`);
      }

      const walletClient = this.walletClients[targetChain];
      const publicClient = chainConfig.client;

      // 获取目标链的chain ID
      const targetChainId = chainConfig.chain.id;

      // 使用零地址作为随机探索的目标
      const targetWallet = '0x0000000000000000000000000000000000000000';

      logger.info(`Starting random travel for frog #${frogTokenId} to ${targetChain}`);

      // 构建交易数据
      const { request } = await publicClient.simulateContract({
        address: config.ZETAFROG_NFT_ADDRESS as Hex,
        abi: ZETAFROG_ABI,
        functionName: 'startTravel',
        args: [BigInt(frogTokenId), targetWallet as Hex, BigInt(duration), BigInt(targetChainId)],
        account: walletClient.account,
      });

      // 发送交易
      const txHash = await walletClient.writeContract(request);

      // 等待交易确认
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash: txHash,
        confirmations: 1,
      });

      // 从事件日志中解析travelId（如果合约事件包含的话）
      let travelId = 0;
      try {
        // 尝试解析TravelStarted事件
        const travelStartedEvent = receipt.logs.find((log: any) => {
          // 这里需要根据实际的事件签名来匹配
          return log.topics[0] === '0x...'; // TravelStarted事件的keccak256哈希
        });
        
        if (travelStartedEvent) {
          // 解析事件数据获取travelId
          // travelId = parseInt(travelStartedEvent.data, 16);
        }
      } catch (error) {
        logger.warn('Failed to parse travelId from event, using default value');
      }

      logger.info(`Random travel started successfully: txHash=${txHash}, travelId=${travelId}`);

      return {
        txHash: txHash,
        travelId: travelId || Date.now(), // 临时使用时间戳作为travelId
      };
    } catch (error) {
      logger.error('Failed to start random travel:', error);
      throw new Error(`Contract interaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 完成旅行
   */
  async completeTravel(
    frogTokenId: number,
    journalHash: string,
    souvenirId: number,
    chain: string
  ): Promise<{ txHash: string }> {
    try {
      if (!config.RELAYER_PRIVATE_KEY) {
        throw new Error('Relayer private key not configured');
      }

      const chainConfig = CHAIN_CONFIG[chain as keyof typeof CHAIN_CONFIG];
      if (!chainConfig) {
        throw new Error(`Unsupported chain: ${chain}`);
      }

      const walletClient = this.walletClients[chain];
      const publicClient = chainConfig.client;

      logger.info(`Completing travel for frog #${frogTokenId} on ${chain}`);

      // 构建交易数据
      const { request } = await publicClient.simulateContract({
        address: config.ZETAFROG_NFT_ADDRESS as Hex,
        abi: ZETAFROG_ABI,
        functionName: 'completeTravel',
        args: [BigInt(frogTokenId), journalHash, BigInt(souvenirId), true],  // Added success flag
        account: walletClient.account,
      });

      // 发送交易
      const txHash = await walletClient.writeContract(request);

      // 等待交易确认
      await publicClient.waitForTransactionReceipt({ 
        hash: txHash,
        confirmations: 1,
      });

      logger.info(`Travel completed successfully: txHash=${txHash}`);

      return { txHash };
    } catch (error) {
      logger.error('Failed to complete travel:', error);
      throw new Error(`Contract interaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 铸造青蛙
   */
  async mintFrog(name: string, chain: string = 'ZETACHAIN_ATHENS'): Promise<{ txHash: string; tokenId: number }> {
    try {
      if (!config.RELAYER_PRIVATE_KEY) {
        throw new Error('Relayer private key not configured');
      }

      const chainConfig = CHAIN_CONFIG[chain as keyof typeof CHAIN_CONFIG];
      if (!chainConfig) {
        throw new Error(`Unsupported chain: ${chain}`);
      }

      const walletClient = this.walletClients[chain];
      const publicClient = chainConfig.client;

      logger.info(`Minting frog: ${name} on ${chain}`);

      // 构建交易数据
      const { request } = await publicClient.simulateContract({
        address: config.ZETAFROG_NFT_ADDRESS as Hex,
        abi: ZETAFROG_ABI,
        functionName: 'mintFrog',
        args: [name],
        account: walletClient.account,
      });

      // 发送交易
      const txHash = await walletClient.writeContract(request);

      // 等待交易确认
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash: txHash,
        confirmations: 1,
      });

      // 从交易日志中解析tokenId
      let tokenId = 0;
      try {
        // 解析Transfer事件或其他相关事件获取tokenId
        const transferEvent = receipt.logs.find((log: any) => {
          // ERC721 Transfer事件的topic[0]是固定的
          return log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
        });

        if (transferEvent && transferEvent.topics[3]) {
          tokenId = parseInt(transferEvent.topics[3], 16);
        }
      } catch (error) {
        logger.warn('Failed to parse tokenId from event, using default value');
      }

      logger.info(`Frog minted successfully: txHash=${txHash}, tokenId=${tokenId}`);

      return {
        txHash,
        tokenId: tokenId || Math.floor(Math.random() * 1000000), // 临时随机数
      };
    } catch (error) {
      logger.error('Failed to mint frog:', error);
      throw new Error(`Contract interaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 获取青蛙信息
   */
  async getFrogInfo(tokenId: number, chain: string = 'ZETACHAIN_ATHENS') {
    try {
      const chainConfig = CHAIN_CONFIG[chain as keyof typeof CHAIN_CONFIG];
      if (!chainConfig) {
        throw new Error(`Unsupported chain: ${chain}`);
      }

      const publicClient = chainConfig.client;

      const frogData = await publicClient.readContract({
        address: config.ZETAFROG_NFT_ADDRESS as Hex,
        abi: ZETAFROG_ABI,
        functionName: 'getFrog',
        args: [BigInt(tokenId)],
      });

      return frogData;
    } catch (error) {
      logger.error(`Failed to get frog info for token ${tokenId}:`, error);
      return null;
    }
  }
}

export const contractService = new ContractService();