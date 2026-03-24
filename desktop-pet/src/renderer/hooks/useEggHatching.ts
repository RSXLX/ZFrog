/**
 * useEggHatching - 孵化增强 Hook
 * Phase 1 功能：孵化互动丰富化、蛋壳裂纹可视化、孵化记忆系统
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import storage from '../services/storage';

// ==================== 类型定义 ====================

export type HatchInteractionType = 'tap' | 'shake' | 'heat' | 'rub';

export interface HatchInteraction {
  type: HatchInteractionType;
  timestamp: number;
  effectiveness: number; // 0-1，影响孵化速度
  temperature?: number; // heat 类型的温度
}

export interface EggCrackPattern {
  id: string;
  position: { x: number; y: number }; // 裂纹中心位置 (0-1)
  size: number; // 裂纹大小 (0-1)
  depth: number; // 裂纹深度 (0-1)
  branches: number; // 分支数量
}

export interface HatchMemory {
  interactions: HatchInteraction[];
  totalInteractions: number;
  crackPatterns: EggCrackPattern[];
  startTime: number;
  estimatedHatchTime: number;
  accelerationFactor: number; // 加速倍数 (1.0 = 正常速度)
  temperatureHistory: { timestamp: number; temp: number }[];
}

export interface HatchProgress {
  percentage: number; // 0-100
  stage: 'intact' | 'hairline' | 'cracked' | 'breaking' | 'hatching';
  timeRemaining: number; // 毫秒
  accelerationActive: boolean;
}

export interface UseEggHatchingReturn {
  // 状态
  memory: HatchMemory;
  progress: HatchProgress;
  isHatching: boolean;
  
  // 互动操作
  tap: () => void;
  shake: () => void;
  heat: (temperature: number) => void;
  rub: () => void;
  
  // 查询
  getInteractionStats: () => {
    totalTaps: number;
    totalShakes: number;
    totalHeats: number;
    totalRubs: number;
    averageEffectiveness: number;
  };
  
  // 裂纹可视化
  getCrackPatterns: () => EggCrackPattern[];
  getCrackIntensity: () => number; // 0-1
  
  // 重置
  resetHatching: () => void;
}

// ==================== 常量定义 ====================

const DEFAULT_HATCH_TIME = 5 * 60 * 1000; // 5分钟基础孵化时间

const INTERACTION_EFFECTS: Record<HatchInteractionType, {
  baseEffectiveness: number;
  cooldown: number;
  temperatureBonus?: number;
}> = {
  tap: {
    baseEffectiveness: 0.02, // 每次减少 2% 时间
    cooldown: 500, // 500ms 冷却
  },
  shake: {
    baseEffectiveness: 0.05, // 每次减少 5% 时间
    cooldown: 2000, // 2s 冷却
  },
  heat: {
    baseEffectiveness: 0.03,
    cooldown: 1000,
    temperatureBonus: 0.01, // 每度温度额外效果
  },
  rub: {
    baseEffectiveness: 0.015,
    cooldown: 300,
  },
};

// ==================== Hook 实现 ====================

export function useEggHatching(
  eggId: string,
  initialHatchTime: number = DEFAULT_HATCH_TIME
): UseEggHatchingReturn {
  const memoryKey = `zfrog_hatch_memory_${eggId}`;
  const restoreMemory = (): HatchMemory | null => {
    try {
      const raw = localStorage.getItem(memoryKey);
      if (!raw) return null;
      return JSON.parse(raw) as HatchMemory;
    } catch {
      return null;
    }
  };
  const cachedMemory = restoreMemory();

  // 内存状态
  const [memory, setMemory] = useState<HatchMemory>({
    interactions: cachedMemory?.interactions || [],
    totalInteractions: cachedMemory?.totalInteractions || 0,
    crackPatterns: cachedMemory?.crackPatterns || [],
    startTime: cachedMemory?.startTime || Date.now(),
    estimatedHatchTime: cachedMemory?.estimatedHatchTime || initialHatchTime,
    accelerationFactor: cachedMemory?.accelerationFactor || 1.0,
    temperatureHistory: cachedMemory?.temperatureHistory || [],
  });

  // 进度状态
  const [progress, setProgress] = useState<HatchProgress>({
    percentage: 0,
    stage: 'intact',
    timeRemaining: initialHatchTime,
    accelerationActive: false,
  });

  const [isHatching, setIsHatching] = useState(true);

  // 冷却追踪
  const cooldowns = useRef<Record<HatchInteractionType, number>>({
    tap: 0,
    shake: 0,
    heat: 0,
    rub: 0,
  });

  // 更新进度
  useEffect(() => {
    if (!isHatching) return;

    const interval = setInterval(() => {
      setProgress(_prev => {
        const elapsed = Date.now() - memory.startTime;
        const adjustedTime = memory.estimatedHatchTime / memory.accelerationFactor;
        const newPercentage = Math.min(100, (elapsed / adjustedTime) * 100);
        
        // 计算阶段
        let stage: HatchProgress['stage'] = 'intact';
        if (newPercentage >= 95) stage = 'hatching';
        else if (newPercentage >= 75) stage = 'breaking';
        else if (newPercentage >= 50) stage = 'cracked';
        else if (newPercentage >= 25) stage = 'hairline';

        // 计算剩余时间
        const timeRemaining = Math.max(0, adjustedTime - elapsed);

        // 检查是否孵化完成
        if (newPercentage >= 100) {
          setIsHatching(false);
          window.dispatchEvent(
            new CustomEvent('desktop:frog-status-changed', {
              detail: {
                eggId,
                stage: 'hatched',
              },
            })
          );
        }

        return {
          percentage: newPercentage,
          stage,
          timeRemaining,
          accelerationActive: memory.accelerationFactor > 1,
        };
      });

      // 更新冷却
      Object.keys(cooldowns.current).forEach(key => {
        if (cooldowns.current[key as HatchInteractionType] > 0) {
          cooldowns.current[key as HatchInteractionType] -= 100;
        }
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isHatching, memory]);

  useEffect(() => {
    localStorage.setItem(memoryKey, JSON.stringify(memory));
    storage.setFrogStats({
      hatchInteractions: memory.totalInteractions,
      hatchAcceleration: memory.accelerationFactor,
    });
  }, [memory, memoryKey]);

  // 执行互动
  const executeInteraction = useCallback((
    type: HatchInteractionType,
    extraParams?: Record<string, any>
  ) => {
    if (!isHatching) return { success: false, message: '已经孵化完成' };
    
    // 检查冷却
    if (cooldowns.current[type] > 0) {
      return { success: false, message: '操作太频繁，请稍后再试' };
    }

    const config = INTERACTION_EFFECTS[type];
    let effectiveness = config.baseEffectiveness;

    // 计算效果
    if (type === 'heat' && extraParams?.temperature) {
      const tempBonus = Math.min(10, Math.max(0, extraParams.temperature - 20)) * 
        (config.temperatureBonus || 0);
      effectiveness += tempBonus;
    }

    // 设置冷却
    cooldowns.current[type] = config.cooldown;

    // 更新内存
    const interaction: HatchInteraction = {
      type,
      timestamp: Date.now(),
      effectiveness,
      temperature: extraParams?.temperature,
    };

    setMemory(prev => {
      const newInteractions = [...prev.interactions, interaction];
      const newAcceleration = Math.min(5, prev.accelerationFactor + effectiveness);
      
      // 生成裂纹图案
      let newCrackPatterns = [...prev.crackPatterns];
      if (Math.random() < effectiveness) {
        newCrackPatterns.push(generateCrackPattern(newCrackPatterns.length));
      }

      return {
        ...prev,
        interactions: newInteractions,
        totalInteractions: newInteractions.length,
        crackPatterns: newCrackPatterns,
        accelerationFactor: newAcceleration,
      };
    });

    return {
      success: true,
      message: getInteractionMessage(type, effectiveness),
      effectiveness,
    };
  }, [isHatching]);

  // 生成裂纹图案
  const generateCrackPattern = (index: number): EggCrackPattern => {
    const angle = (index * 137.5 * Math.PI) / 180; // 黄金角度
    const radius = 0.3 + Math.random() * 0.4;
    
    return {
      id: `crack-${index}-${Date.now()}`,
      position: {
        x: 0.5 + radius * Math.cos(angle),
        y: 0.5 + radius * Math.sin(angle),
      },
      size: 0.1 + Math.random() * 0.2,
      depth: Math.random(),
      branches: Math.floor(Math.random() * 5) + 2,
    };
  };

  // 获取互动消息
  const getInteractionMessage = (type: HatchInteractionType, _effectiveness: number): string => {
    const messages: Record<HatchInteractionType, string[]> = {
      tap: ['戳了一下蛋壳', '轻轻敲击蛋壳', '蛋壳发出清脆声响'],
      shake: ['轻轻摇晃蛋', '蛋在手中滚动', '感受到生命的律动'],
      heat: ['温暖的光芒照在蛋上', '蛋变得温暖', '热量传递到蛋内部'],
      rub: ['轻轻抚摸蛋壳', '蛋壳表面变得光滑', '感受到蛋壳的纹理'],
    };
    
    const typeMessages = messages[type];
    return typeMessages[Math.floor(Math.random() * typeMessages.length)];
  };

  // 公开方法
  const tap = useCallback(() => executeInteraction('tap'), [executeInteraction]);
  const shake = useCallback(() => executeInteraction('shake'), [executeInteraction]);
  const heat = useCallback((temperature: number) => executeInteraction('heat', { temperature }), [executeInteraction]);
  const rub = useCallback(() => executeInteraction('rub'), [executeInteraction]);

  const getInteractionStats = useCallback(() => {
    const stats = {
      totalTaps: 0,
      totalShakes: 0,
      totalHeats: 0,
      totalRubs: 0,
      averageEffectiveness: 0,
    };

    let totalEffectiveness = 0;

    memory.interactions.forEach(interaction => {
      switch (interaction.type) {
        case 'tap': stats.totalTaps++; break;
        case 'shake': stats.totalShakes++; break;
        case 'heat': stats.totalHeats++; break;
        case 'rub': stats.totalRubs++; break;
      }
      totalEffectiveness += interaction.effectiveness;
    });

    stats.averageEffectiveness = memory.interactions.length > 0
      ? totalEffectiveness / memory.interactions.length
      : 0;

    return stats;
  }, [memory.interactions]);

  const getCrackPatterns = useCallback(() => memory.crackPatterns, [memory.crackPatterns]);
  
  const getCrackIntensity = useCallback(() => {
    if (memory.crackPatterns.length === 0) return 0;
    const totalIntensity = memory.crackPatterns.reduce((sum, pattern) => 
      sum + pattern.depth * pattern.size, 0
    );
    return Math.min(1, totalIntensity / memory.crackPatterns.length);
  }, [memory.crackPatterns]);

  const resetHatching = useCallback(() => {
    setMemory({
      interactions: [],
      totalInteractions: 0,
      crackPatterns: [],
      startTime: Date.now(),
      estimatedHatchTime: initialHatchTime,
      accelerationFactor: 1.0,
      temperatureHistory: [],
    });
    setProgress({
      percentage: 0,
      stage: 'intact',
      timeRemaining: initialHatchTime,
      accelerationActive: false,
    });
    setIsHatching(true);
  }, [initialHatchTime]);

  return {
    memory,
    progress,
    isHatching,
    tap,
    shake,
    heat,
    rub,
    getInteractionStats,
    getCrackPatterns,
    getCrackIntensity,
    resetHatching,
  };
}

export default useEggHatching;
