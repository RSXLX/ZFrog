import { useState, useCallback, useEffect } from 'react';
import { GeneRarity } from './useMutation';

export interface FrogSpecies {
  id: string;
  name: string;
  stage: 'egg' | 'tadpole' | 'froglet' | 'adult';
  rarity: GeneRarity | 'starter';
  description: string;
  unlockedAt?: number; // 首次解锁时间戳
  imageUrl?: string;
  traits: string[]; // 包含变异基因
}

export interface CollectionData {
  totalUnlocked: number;
  species: Record<string, FrogSpecies>; // 已解锁物种字典
  achievements: string[]; // 图鉴收集成就
}

export function useCollectionBook() {
  const [collection, setCollection] = useState<CollectionData>({
    totalUnlocked: 0,
    species: {},
    achievements: []
  });

  // 记录新物种
  const unlockSpecies = useCallback((species: FrogSpecies) => {
    setCollection(prev => {
      // 检查是否已解锁
      if (prev.species[species.id]) {
        return prev; // 已存在则不更新
      }

      const newSpecies = {
        ...species,
        unlockedAt: Date.now()
      };

      const newCollection = {
        ...prev,
        totalUnlocked: prev.totalUnlocked + 1,
        species: {
          ...prev.species,
          [species.id]: newSpecies
        }
      };

      // 检查图鉴成就
      if (newCollection.totalUnlocked === 5 && !prev.achievements.includes('初级收集者')) {
        newCollection.achievements.push('初级收集者');
      } else if (newCollection.totalUnlocked === 20 && !prev.achievements.includes('蛙类专家')) {
        newCollection.achievements.push('蛙类专家');
      } else if (newCollection.totalUnlocked === 50 && !prev.achievements.includes('生态大师')) {
        newCollection.achievements.push('生态大师');
      }

      return newCollection;
    });
  }, []);

  // 获取特定物种信息
  const getSpeciesInfo = useCallback((id: string) => {
    return collection.species[id] || null;
  }, [collection]);

  // 获取所有已解锁的图鉴列表
  const getUnlockedList = useCallback(() => {
    return Object.values(collection.species).sort((a, b) => (b.unlockedAt || 0) - (a.unlockedAt || 0));
  }, [collection]);

  // 从本地存储加载图鉴数据（简化，实际应当持久化到文件或区块链）
  useEffect(() => {
    const saved = localStorage.getItem('zfrog_collection_book');
    if (saved) {
      try {
        setCollection(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse collection book data', e);
      }
    }
  }, []);

  // 自动保存图鉴进度
  useEffect(() => {
    localStorage.setItem('zfrog_collection_book', JSON.stringify(collection));
  }, [collection]);

  return {
    collection,
    unlockSpecies,
    getSpeciesInfo,
    getUnlockedList
  };
}
