/**
 * @deprecated 此服务未被使用，功能已由 travelProcessor 和 travel-p0.service.ts 接管。
 * 保留仅供参考，计划在下一个版本中删除。
 * 
 * 🐸 旅行服务 - 奖励计算模块
 * 职责: 纪念品稀有度计算、铸造逻辑
 * 拆分自: travelProcessor.ts
 */

import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from '../../config';
import { logger } from '../../utils/logger';

// 纪念品合约 ABI
const SOUVENIR_ABI = parseAbi([
  'function mintSouvenir(address to, uint256 frogId, uint256 rarity) external returns (uint256)',
  'function totalSupply() view returns (uint256)',
]);

// ZetaChain Athens 配置
const zetachainAthens = {
  id: 7001,
  name: 'ZetaChain Athens Testnet',
  nativeCurrency: { name: 'ZETA', symbol: 'ZETA', decimals: 18 },
  rpcUrls: {
    default: { http: [config.ZETACHAIN_RPC_URL || 'https://zetachain-athens.g.allthatnode.com/archive/evm'] },
  },
} as const;

// 稀有度类型
export type SouvenirRarity = 'Common' | 'Uncommon' | 'Rare';

class TravelRewardService {
  private publicClient: any;
  private walletClient: any;
  private account: any;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      this.publicClient = createPublicClient({
        chain: zetachainAthens,
        transport: http(config.ZETACHAIN_RPC_URL),
      });

      if (config.RELAYER_PRIVATE_KEY) {
        this.account = privateKeyToAccount(config.RELAYER_PRIVATE_KEY as `0x${string}`);
        this.walletClient = createWalletClient({
          account: this.account,
          chain: zetachainAthens,
          transport: http(config.ZETACHAIN_RPC_URL),
        });
        this.isInitialized = true;
        logger.info('[RewardService] Initialized with wallet');
      } else {
        logger.warn('[RewardService] No private key, read-only mode');
      }
    } catch (error) {
      logger.error('[RewardService] Initialization failed:', error);
    }
  }

  /**
   * 计算纪念品稀有度
   */
  calculateRarity(): SouvenirRarity {
    const roll = Math.random() * 100;
    if (roll < 70) return 'Common';
    if (roll < 95) return 'Uncommon';
    return 'Rare';
  }

  /**
   * 稀有度转 Prompt Key
   */
  mapSouvenirTypeToPromptKey(rarity: string): string {
    const mapping: Record<string, string> = {
      'Common': 'ETHEREUM_POSTCARD',
      'Uncommon': 'GAS_FEE_RECEIPT',
      'Rare': 'BLOCKCHAIN_SNOWGLOBE',
    };
    return mapping[rarity] || 'ETHEREUM_POSTCARD';
  }

  /**
   * 获取纪念品名称
   */
  getSouvenirName(rarity: string): string {
    const names: Record<string, string> = {
      'Common': 'Ethereum Postcard',
      'Uncommon': 'Gas Fee Receipt',
      'Rare': 'Blockchain Snowglobe',
    };
    return names[rarity] || 'Mysterious Souvenir';
  }

  /**
   * 铸造纪念品 NFT
   */
  async mintSouvenir(ownerAddress: string, frogId: number, chainKey: string): Promise<number> {
    if (!this.isInitialized || !config.SOUVENIR_NFT_ADDRESS) {
      logger.warn('[RewardService] Cannot mint - not initialized');
      return 0;
    }

    const rarityRoll = Math.floor(Math.random() * 100);
    
    try {
      const { request } = await this.publicClient.simulateContract({
        address: config.SOUVENIR_NFT_ADDRESS as `0x${string}`,
        abi: SOUVENIR_ABI,
        functionName: 'mintSouvenir',
        args: [ownerAddress as `0x${string}`, BigInt(frogId), BigInt(rarityRoll)],
        account: this.account,
      });

      const hash = await this.walletClient.writeContract(request);
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });

      if (receipt.status !== 'success') {
        throw new Error('Souvenir minting transaction failed');
      }

      const totalSupply = await this.publicClient.readContract({
        address: config.SOUVENIR_NFT_ADDRESS as `0x${string}`,
        abi: SOUVENIR_ABI,
        functionName: 'totalSupply',
      });

      const souvenirId = Number(totalSupply) - 1;
      logger.info(`[RewardService] Minted souvenir #${souvenirId} for frog #${frogId}`);
      return souvenirId;

    } catch (error) {
      logger.error('[RewardService] Failed to mint souvenir:', error);
      return 0;
    }
  }

  /**
   * 计算旅行 XP 奖励
   */
  calculateTravelXP(duration: number, discoveries: number, chainDifficulty: number = 1): number {
    const baseXP = 50;
    const durationBonus = Math.floor(duration / 3600) * 10; // 每小时 +10
    const discoveryBonus = discoveries * 5;
    const difficultyMultiplier = chainDifficulty;
    
    return Math.floor((baseXP + durationBonus + discoveryBonus) * difficultyMultiplier);
  }

  /**
   * 计算纪念品概率
   */
  calculateSouvenirChance(frogLevel: number, travelDuration: number, chainRarity: number = 1): number {
    const baseChance = 0.3; // 30% 基础
    const levelBonus = Math.min(frogLevel * 0.01, 0.2); // 等级加成，最高 +20%
    const durationBonus = Math.min(travelDuration / 86400 * 0.1, 0.1); // 时长加成，最高 +10%
    
    return Math.min(baseChance + levelBonus + durationBonus, 0.8) * chainRarity;
  }
}

export const travelRewardService = new TravelRewardService();
export default travelRewardService;
