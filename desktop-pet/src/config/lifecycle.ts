/**
 * ZetaFrog 生命周期配置
 * 修复数值衰减过快的问题
 * 
 * 修改记录:
 * - 2026-03-05: 大幅放缓衰减速度，减轻用户负担
 *   * hunger: 4小时衰减1点 (原来是1小时1点)
 *   * energy: 2小时衰减1点 (原来是1小时2点)
 *   * happiness: 3小时衰减1点 (原来是1小时1点)
 *   * health: 8小时衰减1点 (原来是1小时0.5点)
 */

export interface LifeCycleConfig {
  // 衰减配置
  decay: {
    // 每毫秒衰减值 = value / interval
    hunger: { value: number; interval: number };    // 饥饿值
    energy: { value: number; interval: number };    // 精力值
    happiness: { value: number; interval: number };  // 快乐值
    health: { value: number; interval: number };    // 健康值
  };
  
  // 恢复配置
  recovery: {
    // 各种操作带来的恢复值
    feed: { hunger: number; health: number };
    sleep: { energy: number; health: number };
    play: { happiness: number; energy: number };
    pet: { happiness: number; health: number };
    medicine: { health: number };
  };
  
  // 阈值配置
  thresholds: {
    warning: number;  // 警告阈值 (默认 30)
    critical: number; // 危险阈值 (默认 10)
    death: number;    // 死亡阈值 (默认 0)
  };
  
  // 数值范围
  range: {
    min: number;  // 最小值 (默认 0)
    max: number;  // 最大值 (默认 100)
  };
}

// 生产环境配置 - 修复后的友好数值
export const PRODUCTION_LIFECYCLE_CONFIG: LifeCycleConfig = {
  decay: {
    // 饥饿值: 每4小时衰减1点
    hunger: { value: 1, interval: 4 * 60 * 60 * 1000 },
    
    // 精力值: 每2小时衰减1点
    energy: { value: 1, interval: 2 * 60 * 60 * 1000 },
    
    // 快乐值: 每3小时衰减1点
    happiness: { value: 1, interval: 3 * 60 * 60 * 1000 },
    
    // 健康值: 每8小时衰减1点
    health: { value: 1, interval: 8 * 60 * 60 * 1000 },
  },
  
  recovery: {
    feed: { hunger: 30, health: 5 },        // 喂食: 饥饿+30, 健康+5
    sleep: { energy: 50, health: 10 },     // 睡觉: 精力+50, 健康+10
    play: { happiness: 20, energy: -5 },   // 玩耍: 快乐+20, 精力-5
    pet: { happiness: 10, health: 2 },     // 抚摸: 快乐+10, 健康+2
    medicine: { health: 30 },               // 药物: 健康+30
  },
  
  thresholds: {
    warning: 30,   // 30以下显示警告
    critical: 10,  // 10以下危险状态
    death: 0,      // 0死亡
  },
  
  range: {
    min: 0,
    max: 100,
  },
};

// 测试环境配置 - 加速衰减便于测试
export const TEST_LIFECYCLE_CONFIG: LifeCycleConfig = {
  ...PRODUCTION_LIFECYCLE_CONFIG,
  decay: {
    hunger: { value: 1, interval: 10 * 1000 },    // 10秒衰减1点
    energy: { value: 1, interval: 5 * 1000 },     // 5秒衰减1点
    happiness: { value: 1, interval: 8 * 1000 },    // 8秒衰减1点
    health: { value: 1, interval: 20 * 1000 },    // 20秒衰减1点
  },
};

// 默认导出生产配置
export const LIFECYCLE_CONFIG = PRODUCTION_LIFECYCLE_CONFIG;
