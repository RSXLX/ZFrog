/**
 * usePetEgg - 宠物蛋核心Hook
 * 基于ZFrog桌面宠物框架，与青蛙进化系统深度整合
 * 
 * B+C方案实现：
 * B - 进化模式：蛋 → 蝌蚪 → 幼蛙 → 成蛙
 * C - 繁殖模式：成蛙繁殖产生新蛋
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { calculatePunnettOffspring, PetGenotype, toLegacyGene } from './genetics';
import { applyRareMutation, isMutationTrait } from './mutationRules';
import { useCollectionBook } from './useCollectionBook';

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
  const [isLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const frogSyncRef = useRef<any>(null);
  const { collectPet } = useCollectionBook();

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
    collectPet({
      id: newPet.id,
      name: newPet.name,
      stage: newPet.stage,
      generation: newPet.generation,
      collectedAt: now,
      color: newPet.gene.color,
      pattern: newPet.gene.pattern,
      size: newPet.gene.size,
      temperament: newPet.gene.temperament,
      specialTraits: newPet.gene.specialTraits,
      mutationTraits: newPet.gene.specialTraits.filter(isMutationTrait),
    });

    return newPet;
  }, [generateGene, collectPet]);

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
        if (growth >= 300 && attributes.energy >= 60) {
          shouldEvolve = true;
          newStage = 'adult_frog';
        }
        break;
      case 'adult_frog':
        break;
    }

    if (shouldEvolve && newStage !== stage) {
      petData.stage = newStage;
      evolutionHistory.push({
        fromStage: stage,
        toStage: newStage,
        timestamp: now,
        triggeredBy: 'time',
        attributesAtEvolution: { ...attributes },
      });
      petData.attributes.happiness = Math.min(100, petData.attributes.happiness + 10);
      petData.achievements = Array.from(new Set([...petData.achievements, `evolved_${newStage}`]));
    }
  };

  const updateMood = (petData: Pet) => {
    const { hunger, happiness, health, energy } = petData.attributes;

    if (health < 20) petData.mood = 'sick';
    else if (happiness > 85 && energy > 50) petData.mood = 'ecstatic';
    else if (happiness > 65) petData.mood = 'happy';
    else if (happiness > 45) petData.mood = 'content';
    else if (hunger > 80 || energy < 20) petData.mood = 'sad';
    else if (hunger > 90 && happiness < 20) petData.mood = 'angry';
    else petData.mood = 'neutral';

    petData.isSick = health < 30 || petData.attributes.cleanliness < 20;
  };

  const feed = useCallback((foodType: FoodType) => {
    if (!pet) return { success: false, message: '暂无宠物' };

    const effect = FOOD_EFFECTS[foodType];
    const updatedPet = { ...pet, attributes: { ...pet.attributes } };
    updatedPet.lastFed = Date.now();
    updatedPet.attributes.hunger = Math.max(0, updatedPet.attributes.hunger + effect.hunger);
    updatedPet.attributes.growth = Math.min(500, updatedPet.attributes.growth + effect.growth);
    updatedPet.attributes.happiness = Math.min(100, updatedPet.attributes.happiness + effect.happiness);
    updatedPet.attributes.health = Math.min(100, updatedPet.attributes.health + effect.health);
    updateMood(updatedPet);
    setPet(updatedPet);
    saveToStorage(updatedPet);
    return { success: true, message: `${pet.name} 吃了 ${foodType}` };
  }, [pet, saveToStorage]);

  const play = useCallback((_gameType?: string) => {
    if (!pet) return { success: false, message: '暂无宠物' };
    const score = Math.floor(Math.random() * 100);
    const updatedPet = { ...pet, attributes: { ...pet.attributes } };
    updatedPet.lastPlayed = Date.now();
    updatedPet.attributes.happiness = Math.min(100, updatedPet.attributes.happiness + 12);
    updatedPet.attributes.energy = Math.max(0, updatedPet.attributes.energy - 8);
    updatedPet.attributes.intelligence = Math.min(100, updatedPet.attributes.intelligence + 2);
    updateMood(updatedPet);
    setPet(updatedPet);
    saveToStorage(updatedPet);
    return { success: true, message: `${pet.name} 玩得很开心`, score };
  }, [pet, saveToStorage]);

  const clean = useCallback(() => {
    if (!pet) return { success: false, message: '暂无宠物' };
    const updatedPet = { ...pet, attributes: { ...pet.attributes } };
    updatedPet.lastCleaned = Date.now();
    updatedPet.attributes.cleanliness = 100;
    updatedPet.attributes.health = Math.min(100, updatedPet.attributes.health + 5);
    updatedPet.attributes.happiness = Math.min(100, updatedPet.attributes.happiness + 4);
    updateMood(updatedPet);
    setPet(updatedPet);
    saveToStorage(updatedPet);
    return { success: true, message: `${pet.name} 变干净了` };
  }, [pet, saveToStorage]);

  const toggleSleep = useCallback(() => {
    if (!pet) return { success: false, message: '暂无宠物' };
    const updatedPet = { ...pet, isSleeping: !pet.isSleeping };
    setPet(updatedPet);
    saveToStorage(updatedPet);
    return { success: true, message: updatedPet.isSleeping ? '进入睡眠' : '醒来了' };
  }, [pet, saveToStorage]);

  const canEvolve = useCallback(() => {
    if (!pet) return false;
    const { stage, attributes } = pet;
    if (stage === 'egg') return attributes.growth >= 100 && attributes.happiness >= 60;
    if (stage === 'tadpole') return attributes.growth >= 200 && attributes.health >= 70;
    if (stage === 'young_frog') return attributes.growth >= 300 && attributes.energy >= 60;
    return false;
  }, [pet]);

  const forceEvolve = useCallback(() => {
    if (!pet) return { success: false, message: '暂无宠物' };
    if (!canEvolve()) return { success: false, message: '进化条件未满足' };
    const updatedPet = { ...pet, attributes: { ...pet.attributes }, evolutionHistory: [...pet.evolutionHistory], achievements: [...pet.achievements] };
    checkEvolution(updatedPet, Date.now());
    setPet(updatedPet);
    saveToStorage(updatedPet);
    return { success: true, message: `${pet.name} 完成进化` };
  }, [pet, canEvolve, saveToStorage]);

  const getEvolutionProgress = useCallback(() => {
    if (!pet) return 0;
    const config = STAGE_CONFIG[pet.stage];
    const current = pet.attributes.growth;
    if (config.maxGrowth === Infinity) return 100;
    return Math.max(0, Math.min(100, ((current - config.minGrowth) / (config.maxGrowth - config.minGrowth)) * 100));
  }, [pet]);

  const canBreed = useCallback(() => {
    return !!pet && pet.stage === 'adult_frog' && pet.attributes.health >= 60 && pet.attributes.happiness >= 50;
  }, [pet]);

  const toGenotype = useCallback((gene: PetGene): PetGenotype => ({
    color: { dominant: gene.color, recessive: gene.color.toLowerCase() },
    pattern: { dominant: gene.pattern, recessive: gene.pattern.toLowerCase() },
    size: { dominant: gene.size, recessive: gene.size.toLowerCase() },
    temperament: { dominant: gene.temperament, recessive: gene.temperament.toLowerCase() },
    specialTraits: gene.specialTraits,
  }), []);

  const breed = useCallback((partnerGene: PetGene) => {
    if (!pet || !canBreed()) return null;

    const ownGenotype = toGenotype(pet.gene);
    const partnerGenotype = toGenotype(partnerGene);
    const offspring = calculatePunnettOffspring(ownGenotype, partnerGenotype);
    const mutation = applyRareMutation(offspring.genotype, {
      careQuality: Math.round((pet.attributes.health + pet.attributes.happiness + pet.attributes.cleanliness) / 3),
      environment: 'indoor',
      generation: pet.generation + 1,
    });
    const offspringGene = toLegacyGene(
      mutation.mutated
        ? {
            ...offspring.phenotype,
            specialTraits: mutation.genotype.specialTraits,
          }
        : offspring.phenotype
    );

    return createPet(`${pet.name}的后代`, pet.ownerId, offspringGene);
  }, [pet, canBreed, toGenotype, createPet]);

  const syncWithFrog = useCallback((frogState: any) => {
    frogSyncRef.current = frogState;
  }, []);

  const getFrogBonus = useCallback(() => {
    if (!pet) return { type: 'none', value: 0 };
    if (pet.stage === 'egg') return { type: 'hatch_speed', value: 5 };
    if (pet.stage === 'tadpole') return { type: 'swim_bonus', value: 8 };
    if (pet.stage === 'young_frog') return { type: 'growth_bonus', value: 10 };
    return { type: 'breed_bonus', value: 12 };
  }, [pet]);

  useEffect(() => {
    return () => {
      if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);
    };
  }, []);

  return {
    pet,
    isLoading,
    error,
    createPet,
    loadPet,
    savePet,
    feed,
    play,
    clean,
    toggleSleep,
    canEvolve,
    forceEvolve,
    getEvolutionProgress,
    canBreed,
    breed,
    syncWithFrog,
    getFrogBonus,
  };
}
