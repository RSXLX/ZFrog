/**
 * usePetEgg - 宠物蛋核心Hook
 * 基于ZFrog桌面宠物框架，与青蛙进化系统深度整合
 * 
 * B+C方案实现：
 * B - 进化模式：蛋 → 蝌蚪 → 幼蛙 → 成蛙
 * C - 繁殖模式：成蛙繁殖产生新蛋
 */

import { useState, useCallback, useEffect, useRef } from 'react';

// ==================== 类型定义 ====================

export type PetStage = 'egg' | 'tadpole' | 'young_frog' | 'adult_frog';
export type PetMood = 'ecstatic' | 'happy' | 'content' | 'neutral' | 'sad' | 'angry' | 'depressed' | 'sick';
export type FoodType = 'algae' | 'plankton' | 'insect' | 'worm' | 'fly' | 'cricket';

export interface PetAttributes {
  hunger: number;
  happiness: number;
  health: number;
  energy: number;
  cleanliness: number;
  growth: number;
  intelligence: number;
  social: number;
}

export interface PetGene {
  color: string;
  pattern: string;
  size: 'small' | 'medium' | 'large';
  temperament: 'calm' | 'active' | 'curious';
  specialTraits: string[];
}

export interface Pet {
  id: string;
  name: string;
  ownerId: string;
  stage: PetStage;
  mood: PetMood;
  attributes: PetAttributes;
  gene: PetGene;
  parentId?: string;
  generation: number;
  birthTime: number;
  lastFed: number;
  lastPlayed: number;
  lastCleaned: number;
  evolutionHistory: EvolutionRecord[];
  isSleeping: boolean;
  isSick: boolean;
  achievements: string[];
}

export interface EvolutionRecord {
  fromStage: PetStage;
  toStage: PetStage;
  timestamp: number;
  triggeredBy: 'time' | 'interaction' | 'event';
  attributesAtEvolution: PetAttributes;
}

export interface UsePetEggReturn {
  pet: Pet | null;
  isLoading: boolean;
  error: string | null;
  
  // 核心操作
  createPet: (name: string, ownerId: string, parentGene?: PetGene) => Pet;
  loadPet: (petId: string) => Promise<Pet | null>;
  savePet: () => void;
  
  // 基础互动
  feed: (foodType: FoodType) => { success: boolean; message: string };
  play: (gameType?: string) => { success: boolean; message: string; score?: number };
  clean: () => { success: boolean; message: string };
  toggleSleep: () => { success: boolean; message: string };
  
  // 进化相关
  canEvolve: () => boolean;
  forceEvolve: () => { success: boolean; message: string };
  getEvolutionProgress: () => number;
  
  // 繁殖相关
  canBreed: () => boolean;
  breed: (partnerGene: PetGene) => Pet | null;
  
  // 青蛙系统联动
  syncWithFrog: (frogState: any) => void;
  getFrogBonus: () => { type: string; value: number };
}

// ==================== 常量定义 ====================

const STAGE_CONFIG: Record<PetStage, {
  duration: number;
  minGrowth: number;
  maxGrowth: number;
  requiredInteractions: number;
  canBreed: boolean;
}> = {
  egg: {
    duration: 5 * 60 * 1000, // 5分钟
    minGrowth: 0,
    maxGrowth: 100,
    requiredInteractions: 3,
    canBreed: false,
  },
  tadpole: {
    duration: 10 * 60 * 1000, // 10分钟
    minGrowth: 100,
    maxGrowth: 200,
    requiredInteractions: 5,
    canBreed: false,
  },
  young_frog: {
    duration: 15 * 60 * 1000, // 15分钟
    minGrowth: 200,
    maxGrowth: 300,
    requiredInteractions: 8,
    canBreed: false,
  },
  adult_frog: {
    duration: Infinity, // 永久
    minGrowth: 300,
    maxGrowth: 500,
    requiredInteractions: 0,
    canBreed: true,
  },
};

const FOOD_EFFECTS: Record<FoodType, {
  hunger: number;
  growth: number;
  happiness: number;
  health: number;
}> = {
  algae: { hunger: -10, growth: 5, happiness: 2, health: 3 },
  plankton: { hunger: -8, growth: 3, happiness: 1, health: 2 },
  insect: { hunger: -15, growth: 8, happiness: 5, health: 1 },
  worm: { hunger: -20, growth: 10, happiness: 3, health: 2 },
  fly: { hunger: -12, growth: 6, happiness: 8, health: 0 },
  cricket: { hunger: -18, growth: 9, happiness: 6, health: 1 },
};

// ==================== Hook实现 ====================

export function usePetEgg(): UsePetEggReturn {
  const [pet, setPet] = useState<Pet | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const frogSyncRef = useRef<any>(null);

  // 生成随机基因
  const generateGene = useCallback((): PetGene => {
    const colors = ['green', 'blue', 'yellow', 'red', 'purple', 'orange'];
    const patterns = ['spotted', 'striped', 'solid', 'mottled', 'gradient'];
    const sizes: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large'];
    const temperaments: ('calm' | 'active' | 'curious')[] = ['calm', 'active', 'curious'];
    const traits = ['jumper', 'swimmer', 'singer', 'dancer', 'thinker', 'leader'];
    
    return {
      color: colors[Math.floor(Math.random() * colors.length)],
      pattern: patterns[Math.floor(Math.random() * patterns.length)],
      size: sizes[Math.floor(Math.random() * sizes.length)],
      temperament: temperaments[Math.floor(Math.random() * temperaments.length)],
      specialTraits: traits.filter(() => Math.random() > 0.7),
    };
  }, []);

  // 创建新宠物
  const createPet = useCallback((
    name: string,
    ownerId: string,
    parentGene?: PetGene
  ): Pet => {
    const now = Date.now();
    const gene = parentGene ? {
      ...parentGene,
      // 基因突变
      specialTraits: [...parentGene.specialTraits, ...generateGene().specialTraits].slice(0, 3),
    } : generateGene();
    
    const newPet: Pet = {
      id: `pet_${now}_${Math.random().toString(36).substr(2, 9)}`,
      name: name || '小蛋',
      ownerId,
      stage: 'egg',
      mood: 'neutral',
      attributes: {
        hunger: 50,
        happiness: 50,
        health: 100,
        energy: 100,
        cleanliness: 100,
        growth: 0,
        intelligence: 10,
        social: 10,
      },
      gene,
      generation: parentGene ? 1 : 0,
      birthTime: now,
      lastFed: now,
      lastPlayed: now,
      lastCleaned: now,
      evolutionHistory: [],
      isSleeping: false,
      isSick: false,
      achievements: [],
    };
    
    setPet(newPet);
    saveToStorage(newPet);
    startUpdateInterval();
    
    return newPet;
  }, [generateGene]);

  // 保存到存储
  const saveToStorage = useCallback((petData: Pet) => {
    try {
      localStorage.setItem(`zfrog_pet_${petData.id}`, JSON.stringify(petData));
    } catch (err) {
      console.error('Failed to save pet:', err);
    }
  }, []);

  // 从存储加载
  const loadPet = useCallback(async (petId: string): Promise<Pet | null> => {
    try {
      const data = localStorage.getItem(`zfrog_pet_${petId}`);
      if (data) {
        const loadedPet = JSON.parse(data) as Pet;
        setPet(loadedPet);
        startUpdateInterval();
        return loadedPet;
      }
    } catch (err) {
      console.error('Failed to load pet:', err);
      setError('Failed to load pet data');
    }
    return null;
  }, []);

  // 保存当前宠物
  const savePet = useCallback(() => {
    if (pet) {
      saveToStorage(pet);
    }
  }, [pet, saveToStorage]);

  // 启动更新定时器
  const startUpdateInterval = useCallback(() => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
    }
    updateIntervalRef.current = setInterval(() => {
      updatePetStatus();
    }, 10000);
  }, []);

  // 更新宠物状态
  const updatePetStatus = useCallback(() => {
    if (!pet) return;
    
    const now = Date.now();
    const updatedPet = { ...pet };
    
    // 计算时间差
    const hoursSinceLastUpdate = (now - updatedPet.lastFed) / 3600000;
    
    // 属性衰减
    updatedPet.attributes.hunger = Math.min(100, updatedPet.attributes.hunger + hoursSinceLastUpdate * 5);
    updatedPet.attributes.happiness = Math.max(0, updatedPet.attributes.happiness - hoursSinceLastUpdate * 3);
    updatedPet.attributes.energy = Math.max(0, updatedPet.attributes.energy - hoursSinceLastUpdate * 4);
    updatedPet.attributes.cleanliness = Math.max(0, updatedPet.attributes.cleanliness - hoursSinceLastUpdate * 2);
    
    // 睡眠恢复
    if (updatedPet.isSleeping) {
      updatedPet.attributes.energy = Math.min(100, updatedPet.attributes.energy + hoursSinceLastUpdate * 10);
      updatedPet.attributes.health = Math.min(100, updatedPet.attributes.health + hoursSinceLastUpdate * 2);
    }
    
    // 成长计算
    const growthGain = hoursSinceLastUpdate * (updatedPet.attributes.happiness / 100) * 2;
    updatedPet.attributes.growth = Math.min(500, updatedPet.attributes.growth + growthGain);
    
    // 检查进化
    checkEvolution(updatedPet, now);
    
    // 更新心情
    updateMood(updatedPet);
    
    setPet(updatedPet);
    saveToStorage(updatedPet);
  }, [pet, saveToStorage]);

  // 检查进化
  const checkEvolution = (petData: Pet, now: number) => {
    const { stage, attributes, evolutionHistory } = petData;
    const growth = attributes.growth;
    
    let shouldEvolve = false;
    let newStage: PetStage = stage;
    
    switch (stage) {
      case 'egg':
        if (growth >= 100 && attributes.happiness >= 60) {
          shouldEvolve = true;
          newStage = 'tadpole';
        }
        break;
      case 'tadpole':
        if (growth >= 200 && attributes.health >= 70) {
          shouldEvolve = true;
          newStage = 'young_frog';
        }
        break;
      case 'young_frog':
        if (growth >= 300 &&