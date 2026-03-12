import { useState, useCallback } from 'react';

// 定义基因类型和稀有度
export type GeneRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface MutationResult {
  mutated: boolean;
  newGene?: string;
  rarity?: GeneRarity;
  description?: string;
}

// 基础变异概率配置
const MUTATION_RATES: Record<GeneRarity, number> = {
  common: 0.8,
  uncommon: 0.15,
  rare: 0.04,
  epic: 0.009,
  legendary: 0.001
};

// 触发变异的环境和条件因素
export interface EnvironmentalFactors {
  temperature: number; // 0-100
  humidity: number;    // 0-100
  careQuality: number; // 0-100 照护质量（基于FeedingMonitor, HygieneSystem等）
  stress: number;      // 0-100 压力值
}

export function useMutation() {
  const [mutationHistory, setMutationHistory] = useState<MutationResult[]>([]);

  // 计算本次变异是否发生及结果
  const triggerMutationCheck = useCallback((factors: EnvironmentalFactors): MutationResult => {
    // 基础突变率为 5%
    let baseChance = 0.05;

    // 极端环境增加突变率，但也有可能导致不良突变（这里简化为增加稀有度概率）
    if (factors.temperature > 80 || factors.temperature < 20) baseChance += 0.02;
    if (factors.stress > 70) baseChance += 0.03;
    // 高质量照护可以略微提高良性高级突变概率
    if (factors.careQuality > 90) baseChance += 0.01;

    const roll = Math.random();

    if (roll > baseChance) {
      return { mutated: false };
    }

    // 确定稀有度
    const rarityRoll = Math.random();
    let rarity: GeneRarity = 'common';
    let cumulative = 0;
    
    // 调整概率分布：照护越好，越容易获得高稀有度
    let rates = { ...MUTATION_RATES };
    if (factors.careQuality > 80) {
        rates.rare += 0.01;
        rates.epic += 0.005;
        rates.legendary += 0.002;
        rates.common -= 0.017;
    }

    for (const [r, rate] of Object.entries(rates)) {
      cumulative += rate;
      if (rarityRoll <= cumulative) {
        rarity = r as GeneRarity;
        break;
      }
    }

    // 根据稀有度生成变异特征（此处可扩展基因库字典）
    const traits: Record<GeneRarity, string[]> = {
      common: ['微光斑点', '稍长后腿', '深色纹理'],
      uncommon: ['发光触须', '水波纹皮', '双色眼睛'],
      rare: ['水晶背甲', '毒液腺体', '隐身皮肤'],
      epic: ['虚空幻影', '龙之鳞片', '时空之环'],
      legendary: ['星神之眼', '永恒火焰', '量子交织']
    };

    const possibleTraits = traits[rarity];
    const newGene = possibleTraits[Math.floor(Math.random() * possibleTraits.length)];

    const result: MutationResult = {
      mutated: true,
      newGene,
      rarity,
      description: `因为环境因素(${factors.temperature}°C, 压力${factors.stress})，基因发生突变，获得了【${rarity}】级特性：${newGene}！`
    };

    setMutationHistory(prev => [...prev, result]);
    return result;

  }, []);

  return {
    mutationHistory,
    triggerMutationCheck
  };
}
