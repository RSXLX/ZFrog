// backend/src/services/travel/chain-material.service.ts
// V2.0 链专属特产服务

import { ChainType } from '@prisma/client';
import { logger } from '../../utils/logger';

// 链专属材料定义
const CHAIN_MATERIALS: Record<string, { type: string; name: string; emoji: string }> = {
  ETH_SEPOLIA: { type: 'ether_dust', name: '以太粉末', emoji: '✨' },
  BSC_TESTNET: { type: 'bnb_crumb', name: '饼干碎屑', emoji: '🍪' },
  ZETACHAIN_ATHENS: { type: 'zeta_spark', name: '泽塔火花', emoji: '⚡' },
  POLYGON_MUMBAI: { type: 'matic_shard', name: '紫晶碎片', emoji: '💎' },
  ARBITRUM_GOERLI: { type: 'arb_fragment', name: '仲裁残片', emoji: '🔷' },
};

// 材料稀有度权重
const MATERIAL_RARITY_WEIGHTS = {
  common: 60,
  uncommon: 25,
  rare: 10,
  epic: 4,
  legendary: 1,
};

class ChainMaterialService {
  /**
   * 获取链专属材料类型
   */
  getMaterial(chainKey: string): { type: string; name: string; emoji: string } {
    return CHAIN_MATERIALS[chainKey] || CHAIN_MATERIALS['ZETACHAIN_ATHENS'];
  }

  /**
   * 获取纪念品材料类型
   */
  getSouvenirMaterialType(chainKey: string): string {
    const material = this.getMaterial(chainKey);
    return material.type;
  }

  /**
   * 生成链特产描述
   */
  getMaterialDescription(chainKey: string): string {
    const material = this.getMaterial(chainKey);
    return `${material.emoji} 来自 ${this.getChainDisplayName(chainKey)} 的 ${material.name}`;
  }

  /**
   * 获取链显示名称
   */
  private getChainDisplayName(chainKey: string): string {
    const names: Record<string, string> = {
      ETH_SEPOLIA: 'Ethereum (Sepolia)',
      BSC_TESTNET: 'BSC (Testnet)',
      ZETACHAIN_ATHENS: 'ZetaChain (Athens)',
      POLYGON_MUMBAI: 'Polygon (Mumbai)',
      ARBITRUM_GOERLI: 'Arbitrum (Goerli)',
    };
    return names[chainKey] || chainKey;
  }

  /**
   * 获取所有链材料列表（用于合成系统）
   */
  getAllMaterials(): Array<{ chainKey: string; type: string; name: string; emoji: string }> {
    return Object.entries(CHAIN_MATERIALS).map(([chainKey, material]) => ({
      chainKey,
      ...material,
    }));
  }

  /**
   * 检查是否收集齐所有链材料（用于合成全链大师勋章）
   */
  async checkAllMaterialsCollected(frogId: number, prisma: any): Promise<boolean> {
    const requiredChains = Object.keys(CHAIN_MATERIALS);
    
    const souvenirs = await prisma.souvenir.findMany({
      where: {
        frogId,
        materialType: { not: null },
      },
      select: { materialType: true },
    });

    const collectedTypes = new Set(souvenirs.map((s: any) => s.materialType));
    
    for (const chainKey of requiredChains) {
      const material = CHAIN_MATERIALS[chainKey];
      if (!collectedTypes.has(material.type)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 计算材料稀有度
   */
  rollMaterialRarity(): string {
    const roll = Math.random() * 100;
    let cumulative = 0;

    for (const [rarity, weight] of Object.entries(MATERIAL_RARITY_WEIGHTS)) {
      cumulative += weight;
      if (roll < cumulative) {
        return rarity;
      }
    }

    return 'common';
  }
}

export const chainMaterialService = new ChainMaterialService();
