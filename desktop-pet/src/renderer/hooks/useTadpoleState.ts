/**
 * useTadpoleState - 蝌蚪阶段状态管理 Hook
 * Phase 2: 蝌蚪阶段
 * 
 * 功能：
 * - 管理蝌蚪发育阶段
 * - 水生环境参数管理
 * - 变态发育逻辑
 * - 与 usePetEgg 整合
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Pet, PetAttributes, PetGene } from '../usePetEgg';
import { TadpoleStage, TadpoleFeatures, WaterEnvironment } from '../../components/Tadpole/Tadpole';

// ==================== 类型定义 ====================

export interface UseTadpoleStateReturn {
  // 蝌蚪状态
  tadpoleStage: TadpoleStage;
  features: TadpoleFeatures;
  environment: WaterEnvironment;
  
  // 发育进度
  metamorphosisProgress: number;
  canEvolveToFrog: boolean;
  
  // 操作方法
  updateEnvironment: (updates: Partial<WaterEnvironment>) => void;
  feedTadpole: (foodType: 'algae' | 'plankton') => void;
  interact: (type: 'poke' | 'stroke' | 'observe') => void;
  
  // 状态监控
  getHealthStatus: () => 'healthy' | 'stressed' | 'critical';
  getGrowthRate: () => number;
  
  // 与宠物系统整合
  syncFromPet: (pet: Pet) => void;
  exportToPet: () => Partial<Pet>;
}

// ==================== 常量定义 ====================

const STAGE_THRESHOLDS: Record<TadpoleStage, number> = {
  newly_hatched: 0,
  early: 20,
  mid: 45,
  late: 70,
  pre_frog: 90,
};

const DEFAULT_ENVIRONMENT: WaterEnvironment = {
  temperature: 23,
  oxygen: 80,
  cleanliness: 85,
  flowSpeed: 2,
  depth: 50,
};

// ==================== 辅助函数 ====================

const getStageFromGrowth = (growth: number): TadpoleStage => {
  if (growth >= 90) return 'pre_frog';
  if (growth >= 70) return 'late';
  if (growth >= 45) return 'mid';
  if (growth >= 20) return 'early';
  return 'newly_hatched';
};

const calculateFeatures = (
  growth: number,
  gene: PetGene,
  stage: TadpoleStage
): TadpoleFeatures => {
  // 尾巴长度随发育逐渐缩短
  let tailLength = 1;
  if (growth >= 45) tailLength = 0.8;
  if (growth >= 70) tailLength = 0.5;
  if (growth >= 90) tailLength = 0.2;
  
  // 身体尺寸
  const bodySize = 0.5 + (growth / 200);
  
  // 颜色从基因继承
  const colorMap: Record<string, string> = {
    green: '#4a7c59',
    blue: '#3b6b8c',
    yellow: '#8c8a3b',
    red: '#8c3b3b',
    purple: '#6b3b88',
    orange: '#8c6a3b',
  };
  const color = colorMap[gene.color] || '#4a7c59';
  
  return {
    hasHindLegs: growth >= 20,
    hasFrontLegs: growth >= 70,
    tailLength,
    bodySize,
    color,
  };
};

// ==================== Hook 实现 ====================

export function useTadpoleState(initialPet?: Pet): UseTadpoleStateReturn {
  const [tadpoleStage, setTadpoleStage] = useState<TadpoleStage>('newly_hatched');
  const [features, setFeatures] = useState<TadpoleFeatures>({
    hasHindLegs: false,
    hasFrontLegs: false,
    tailLength: 1,
    bodySize: 0.5,
    color: '#4a7c59',
  });
  const [environment, setEnvironment] = useState<WaterEnvironment>(DEFAULT_ENVIRONMENT);
  
  const petRef = useRef<Pet | null>(null);
  const growthRef = useRef(0);
  const interactionCount = useRef(0);
  
  // 初始化
  useEffect(() => {
    if (initialPet) {
      syncFromPet(initialPet);
    }
  }, []);
  
  // 从宠物数据同步
  const syncFromPet = useCallback((pet: Pet) => {
    petRef.current = pet;
    const growth = pet.attributes.growth;
    growthRef.current = growth;
    
    // 更新阶段
    const newStage = getStageFromGrowth(growth);
    setTadpoleStage(newStage);
    
    // 更新特征
    setFeatures(calculateFeatures(growth, pet.gene, newStage));
    
    // 环境可以从宠物属性恢复（如果有存储）
    const storedEnv = localStorage.getItem(`zfrog_tadpole_env_${pet.id}`);
    if (storedEnv) {
      try {
        setEnvironment(JSON.parse(storedEnv));
      } catch (e) {
        console.warn('Failed to parse stored environment:', e);
      }
    }
  }, []);
  
  // 导出为宠物数据
  const exportToPet = useCallback((): Partial<Pet> => {
    if (!petRef.current) return {};
    
    const newAttributes: PetAttributes = {
      ...petRef.current.attributes,
      growth: growthRef.current,
    };
    
    // 环境影响健康
    const healthStatus = getHealthStatus();
    if (healthStatus === 'stressed') {
      newAttributes.health = Math.max(0, newAttributes.health - 1);
    } else if (healthStatus === 'critical') {
      newAttributes.health = Math.max(0, newAttributes.health - 3);
    } else {
      newAttributes.health = Math.min(100, newAttributes.health + 0.5);
    }
    
    return {
      attributes: newAttributes,
      stage: canEvolveToFrog ? 'young_frog' as any : 'tadpole' as any,
    };
  }, []);
  
  // 更新环境
  const updateEnvironment = useCallback((updates: Partial<WaterEnvironment>) => {
    setEnvironment(prev => {
      const newEnv = { ...prev, ...updates };
      
      // 验证范围
      if (updates.temperature !== undefined) {
        newEnv.temperature = Math.max(15, Math.min(30, updates.temperature));
      }
      if (updates.oxygen !== undefined) {
        newEnv.oxygen = Math.max(0, Math.min(100, updates.oxygen));
      }
      if (updates.cleanliness !== undefined) {
        newEnv.cleanliness = Math.max(0, Math.min(100, updates.cleanliness));
      }
      if (updates.flowSpeed !== undefined) {
        newEnv.flowSpeed = Math.max(0, Math.min(10, updates.flowSpeed));
      }
      
      // 保存到存储
      if (petRef.current) {
        localStorage.setItem(`zfrog_tadpole_env_${petRef.current.id}`, JSON.stringify(newEnv));
      }
      
      return newEnv;
    });
  }, []);
  
  // 喂食
  const feedTadpole = useCallback((foodType: 'algae' | 'plankton') => {
    if (!petRef.current) return;
    
    const effect = foodType === 'algae' 
      ? { growth: 3, happiness: 2, health: 1 }
      : { growth: 2, happiness: 3, health: 2 };
    
    growthRef.current = Math.min(100, growthRef.current + effect.growth);
    interactionCount.current += 1;
    
    // 更新阶段
    const newStage = getStageFromGrowth(growthRef.current);
    if (newStage !== tadpoleStage) {
      setTadpoleStage(newStage);
    }
    
    // 更新特征
    setFeatures(calculateFeatures(growthRef.current, petRef.current.gene, newStage));
    
    // 环境变化（喂食略微降低水质）
    updateEnvironment({
      cleanliness: Math.max(0, environment.cleanliness - 2),
    });
  }, [tadpoleStage, environment, updateEnvironment]);
  
  // 互动
  const interact = useCallback((type: 'poke' | 'stroke' | 'observe') => {
    interactionCount.current += 1;
    
    if (!petRef.current) return;
    
    // 互动可以加速成长
    const boost = type === 'stroke' ? 0.5 : type === 'poke' ? 0.3 : 0.1;
    growthRef.current = Math.min(100, growthRef.current + boost);
    
    // 更新阶段
    const newStage = getStageFromGrowth(growthRef.current);
    if (newStage !== tadpoleStage) {
      setTadpoleStage(newStage);
    }
    
    // 更新特征
    setFeatures(calculateFeatures(growthRef.current, petRef.current.gene, newStage));
  }, [tadpoleStage]);
  
  // 获取健康状态
  const getHealthStatus = useCallback((): 'healthy' | 'stressed' | 'critical' => {
    let issues = 0;
    
    // 温度问题
    if (environment.temperature < 18 || environment.temperature > 28) issues++;
    
    // 氧气问题
    if (environment.oxygen < 40) issues++;
    else if (environment.oxygen < 60) issues += 0.5;
    
    // 水质问题
    if (environment.cleanliness < 40) issues++;
    else if (environment.cleanliness < 60) issues += 0.5;
    
    if (issues >= 2) return 'critical';
    if (issues >= 1) return 'stressed';
    return 'healthy';
  }, [environment]);
  
  // 获取成长速率
  const getGrowthRate = useCallback((): number => {
    const healthStatus = getHealthStatus();
    
    let baseRate = 1.0;
    
    // 健康状态影响
    if (healthStatus === 'stressed') baseRate *= 0.5;
    if (healthStatus === 'critical') baseRate *= 0.1;
    
    // 环境质量影响
    const envQuality = (
      (environment.oxygen / 100) * 0.4 +
      (environment.cleanliness / 100) * 0.3 +
      (1 - Math.abs(environment.temperature - 23) / 15) * 0.3
    );
    baseRate *= (0.5 + envQuality * 1.5);
    
    // 互动阶段加速
    if (interactionCount.current > 5) baseRate *= 1.2;
    if (interactionCount.current > 10) baseRate *= 1.3;
    
    return baseRate;
  }, [environment, getHealthStatus]);
  
  // 变态发育进度
  const metamorphosisProgress = useMemo(() => {
    const stages: TadpoleStage[] = ['newly_hatched', 'early', 'mid', 'late', 'pre_frog'];
    const currentIndex = stages.indexOf(tadpoleStage);
    const stageConfig = STAGE_THRESHOLDS[tadpoleStage];
    const nextStageIndex = currentIndex + 1;
    
    if (nextStageIndex >= stages.length) return 100;
    
    const nextStage = stages[nextStageIndex];
    const nextThreshold = STAGE_THRESHOLDS[nextStage];
    const currentGrowth = growthRef.current;
    
    const stageProgress = ((currentGrowth - stageConfig) / (nextThreshold - stageConfig)) * 20;
    
    return currentIndex * 20 + Math.max(0, Math.min(20, stageProgress));
  }, [tadpoleStage]);
  
  // 是否可以进化为青蛙
  const canEvolveToFrog = useMemo(() => {
    return growthRef.current >= 95 && getHealthStatus() !== 'critical';
  }, [getHealthStatus]);
  
  return {
    tadpoleStage,
    features,
    environment,
    metamorphosisProgress,
    canEvolveToFrog,
    updateEnvironment,
    feedTadpole,
    interact,
    getHealthStatus,
    getGrowthRate,
    syncFromPet,
    exportToPet,
  };
}

export default useTadpoleState;
