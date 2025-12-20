// backend/src/services/travel/souvenir.generator.ts

import { ChainKey, SUPPORTED_CHAINS } from '../../config/chains';
import { Discovery } from './exploration.service';

export interface Souvenir {
  type: SouvenirType;
  name: string;
  description: string;
  rarity: number;
  chainOrigin: ChainKey;
  blockOrigin: string;
  emoji: string;
}

export type SouvenirType = 'postcard' | 'leaf' | 'stone' | 'photo' | 'story' | 'feather' | 'shell';

const SOUVENIR_TEMPLATES: Record<SouvenirType, { names: string[]; descriptions: string[]; emoji: string }> = {
  postcard: {
    names: ['旧明信片', '褪色的明信片', '手绘明信片'],
    descriptions: ['上面画着 {chain} 的风景', '写着来自 {year} 年的祝福'],
    emoji: '📮',
  },
  leaf: {
    names: ['金色落叶', '幸运四叶草', '银杏叶'],
    descriptions: ['从 {chain} 的大树上飘落', '沾着 {year} 年的露水'],
    emoji: '🍂',
  },
  stone: {
    names: ['光滑的石头', '奇特的小石子', '闪亮的鹅卵石'],
    descriptions: ['在 {chain} 的小溪里捡到的', '上面有奇怪的纹路'],
    emoji: '🪨',
  },
  photo: {
    names: ['模糊的照片', '珍贵的留影', '偷拍的照片'],
    descriptions: ['拍下了 {chain} 的街景', '记录了 {year} 年的某个瞬间'],
    emoji: '📷',
  },
  story: {
    names: ['听来的故事', '神秘的传说', '老钱包的回忆'],
    descriptions: ['关于 {chain} 的传说', '{year} 年发生的趣事'],
    emoji: '📖',
  },
  feather: {
    names: ['彩色羽毛', '轻飘飘的羽毛', '神奇的羽毛'],
    descriptions: ['不知道是什么鸟留下的', '在 {chain} 的风中飘来'],
    emoji: '🪶',
  },
  shell: {
    names: ['漂亮的贝壳', '螺旋贝壳', '珍珠贝壳'],
    descriptions: ['能听到区块链的声音', '从 {chain} 的海边带回'],
    emoji: '🐚',
  },
};

class SouvenirGenerator {
  generate(chain: ChainKey, blockNumber: bigint, timestamp: Date, discoveries: Discovery[]): Souvenir {
    const maxRarity = Math.max(...discoveries.map(d => d.rarity), 1);
    const souvenirRarity = Math.min(5, Math.max(1, maxRarity + Math.floor(Math.random() * 2) - 1));

    const types: SouvenirType[] = ['postcard', 'leaf', 'stone', 'photo', 'story', 'feather', 'shell'];
    const type = types[Math.floor(Math.random() * types.length)];

    const template = SOUVENIR_TEMPLATES[type];
    const config = SUPPORTED_CHAINS[chain];
    const year = timestamp.getFullYear();

    const name = template.names[Math.floor(Math.random() * template.names.length)];
    let description = template.descriptions[Math.floor(Math.random() * template.descriptions.length)];

    description = description
      .replace('{chain}', config.displayName)
      .replace('{year}', year.toString())
      .replace('{block}', blockNumber.toString());

    return {
      type,
      name,
      description,
      rarity: souvenirRarity,
      chainOrigin: chain,
      blockOrigin: blockNumber.toString(),
      emoji: template.emoji,
    };
  }
}

export const souvenirGenerator = new SouvenirGenerator();
