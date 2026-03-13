import { useState, useCallback, useEffect } from 'react';

export type EnvironmentType = 'pond' | 'forest' | 'desert' | 'snow' | 'indoor';

export interface EnvironmentEffects {
  growthRateModifier: number; // 孵化/生长速度倍率 (默认 1.0)
  moodModifier: number;       // 每小时心情变化
  healthModifier: number;     // 每小时健康变化
  energyModifier: number;     // 能量消耗/恢复倍率
  specialEffect?: string;     // 特殊效果描述
}

export interface EnvironmentState {
  currentType: EnvironmentType;
  temperature: number; // 0-100
  humidity: number;    // 0-100
  effects: EnvironmentEffects;
}

const ENVIRONMENT_CONFIGS: Record<EnvironmentType, EnvironmentState> = {
  pond: {
    currentType: 'pond',
    temperature: 60,
    humidity: 90,
    effects: {
      growthRateModifier: 1.2,
      moodModifier: +2,
      healthModifier: +1,
      energyModifier: 1.0,
      specialEffect: '水生形态(如蝌蚪)在此环境成长极快'
    }
  },
  forest: {
    currentType: 'forest',
    temperature: 70,
    humidity: 60,
    effects: {
      growthRateModifier: 1.0,
      moodModifier: +5,
      healthModifier: +2,
      energyModifier: 0.9, // 能量消耗慢
      specialEffect: '成蛙最喜欢的自然环境，心情自然变好'
    }
  },
  desert: {
    currentType: 'desert',
    temperature: 95,
    humidity: 10,
    effects: {
      growthRateModifier: 0.8,
      moodModifier: -5,
      healthModifier: -3,
      energyModifier: 1.5, // 能量消耗快
      specialEffect: '极度缺水，需要频繁清洁和喂水，容易触发稀有变异'
    }
  },
  snow: {
    currentType: 'snow',
    temperature: 10,
    humidity: 30,
    effects: {
      growthRateModifier: 0.5,
      moodModifier: -2,
      healthModifier: -1,
      energyModifier: 1.2,
      specialEffect: '生长极为缓慢，但有概率获得冰雪系稀有基因'
    }
  },
  indoor: {
    currentType: 'indoor',
    temperature: 75,
    humidity: 50,
    effects: {
      growthRateModifier: 1.0,
      moodModifier: 0,
      healthModifier: +1,
      energyModifier: 1.0,
      specialEffect: '稳定的室内环境，属性变化最为平缓'
    }
  }
};

export function useEnvironment() {
  const [environment, setEnvironment] = useState<EnvironmentState>(ENVIRONMENT_CONFIGS.indoor);

  // 更改环境场景
  const changeEnvironment = useCallback((type: EnvironmentType) => {
    setEnvironment(ENVIRONMENT_CONFIGS[type]);
    // TODO: 在这里可以触发切换动画或声音
  }, []);

  // 获取当前环境对属性的影响倍率/增量
  const getEffects = useCallback(() => {
    return environment.effects;
  }, [environment]);

  // 从本地存储恢复环境设置
  useEffect(() => {
    const saved = localStorage.getItem('zfrog_environment');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as EnvironmentType;
        if (ENVIRONMENT_CONFIGS[parsed]) {
          setEnvironment(ENVIRONMENT_CONFIGS[parsed]);
        }
      } catch (e) {
        console.error('Failed to parse environment data', e);
      }
    }
  }, []);

  // 自动保存环境设置
  useEffect(() => {
    localStorage.setItem('zfrog_environment', JSON.stringify(environment.currentType));
  }, [environment.currentType]);

  return {
    environment,
    changeEnvironment,
    getEffects,
    availableEnvironments: Object.keys(ENVIRONMENT_CONFIGS) as EnvironmentType[]
  };
}
