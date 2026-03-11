/**
 * hatchMemoryStorage - 孵化记忆系统存储服务
 * Phase 1 功能：孵化记忆系统
 * 
 * 功能：
 * - 持久化存储孵化期间的互动记录
 * - 影响蝌蚪初始属性的记忆数据
 * - 特殊事件记录
 * - 跨会话数据恢复
 */

import { HatchInteraction, HatchMemory } from '../hooks/useEggHatching';

// ==================== 类型定义 ====================

export interface HatchMemoryRecord {
  eggId: string;
  memory: HatchMemory;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface HatchMemoryStats {
  totalEggsHatched: number;
  averageHatchTime: number;
  totalInteractions: number;
  favoriteInteractionType: HatchInteraction['type'] | null;
  fastestHatchTime: number | null;
  slowestHatchTime: number | null;
}

export interface TadpoleInitialAttributes {
  healthBonus: number; // 0-20
  happinessBonus: number; // 0-20
  intelligenceBonus: number; // 0-20
  socialBonus: number; // 0-20
  specialTraits: string[];
}

// ==================== 存储键常量 ====================

const STORAGE_KEY = 'zfrog_hatch_memory';
const STATS_KEY = 'zfrog_hatch_stats';
const CURRENT_HATCH_KEY = 'zfrog_current_hatch';

// ==================== 存储服务 ====================

class HatchMemoryStorage {
  private memoryCache: Map<string, HatchMemoryRecord> = new Map();
  private statsCache: HatchMemoryStats | null = null;

  constructor() {
    this.loadFromStorage();
  }

  // ==================== 核心存储操作 ====================

  private loadFromStorage(): void {
    try {
      // 加载所有历史记录
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const records: HatchMemoryRecord[] = JSON.parse(data);
        records.forEach(record => {
          this.memoryCache.set(record.eggId, record);
        });
      }

      // 加载统计数据
      const statsData = localStorage.getItem(STATS_KEY);
      if (statsData) {
        this.statsCache = JSON.parse(statsData);
      }
    } catch (error) {
      console.error('[HatchMemoryStorage] 加载存储失败:', error);
    }
  }

  private saveToStorage(): void {
    try {
      // 保存所有记录
      const records = Array.from(this.memoryCache.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));

      // 保存统计数据
      if (this.statsCache) {
        localStorage.setItem(STATS_KEY, JSON.stringify(this.statsCache));
      }
    } catch (error) {
      console.error('[HatchMemoryStorage] 保存存储失败:', error);
    }
  }

  // ==================== 公开 API ====================

  /**
   * 开始新的孵化记录
   */
  startHatching(eggId: string, estimatedHatchTime: number): void {
    const record: HatchMemoryRecord = {
      eggId,
      memory: {
        interactions: [],
        totalInteractions: 0,
        crackPatterns: [],
        startTime: Date.now(),
        estimatedHatchTime,
        accelerationFactor: 1.0,
        temperatureHistory: [],
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    };

    this.memoryCache.set(eggId, record);
    this.saveToStorage();

    // 保存当前孵化记录
    localStorage.setItem(CURRENT_HATCH_KEY, eggId);
  }

  /**
   * 更新孵化记忆
   */
  updateHatching(eggId: string, memory: HatchMemory): void {
    const existing = this.memoryCache.get(eggId);
    if (!existing) return;

    existing.memory = memory;
    existing.updatedAt = Date.now();
    existing.version += 1;

    this.saveToStorage();
  }

  /**
   * 完成孵化
   */
  completeHatching(eggId: string, actualHatchTime: number): TadpoleInitialAttributes {
    const record = this.memoryCache.get(eggId);
    if (!record) {
      return this.generateDefaultAttributes();
    }

    // 计算蝌蚪初始属性
    const attributes = this.calculateTadpoleAttributes(record, actualHatchTime);

    // 更新统计数据
    this.updateStats(record, actualHatchTime);

    // 清理当前孵化记录
    localStorage.removeItem(CURRENT_HATCH_KEY);

    return attributes;
  }

  /**
   * 获取当前孵化记录
   */
  getCurrentHatching(): HatchMemoryRecord | null {
    const eggId = localStorage.getItem(CURRENT_HATCH_KEY);
    if (!eggId) return null;
    return this.memoryCache.get(eggId) || null;
  }

  /**
   * 获取历史记录
   */
  getHatchingHistory(limit: number = 10): HatchMemoryRecord[] {
    return Array.from(this.memoryCache.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  /**
   * 获取统计数据
   */
  getStats(): HatchMemoryStats {
    if (this.statsCache) {
      return this.statsCache;
    }

    // 计算统计数据
    const records = Array.from(this.memoryCache.values());
    const completedRecords = records.filter(r => r.memory.totalInteractions > 0);

    const stats: HatchMemoryStats = {
      totalEggsHatched: completedRecords.length,
      averageHatchTime: 0,
      totalInteractions: 0,
      favoriteInteractionType: null,
      fastestHatchTime: null,
      slowestHatchTime: null,
    };

    if (completedRecords.length > 0) {
      // 计算平均孵化时间
      const totalTime = completedRecords.reduce((sum, r) => {
        return sum + (r.updatedAt - r.createdAt);
      }, 0);
      stats.averageHatchTime = totalTime / completedRecords.length;

      // 计算总互动数
      stats.totalInteractions = completedRecords.reduce(
        (sum, r) => sum + r.memory.totalInteractions,
        0
      );

      // 找出最喜欢的互动类型
      const typeCounts: Record<string, number> = {};
      completedRecords.forEach(r => {
        r.memory.interactions.forEach(interaction => {
          typeCounts[interaction.type] = (typeCounts[interaction.type] || 0) + 1;
        });
      });

      const favoriteType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
      if (favoriteType) {
        stats.favoriteInteractionType = favoriteType[0] as HatchInteraction['type'];
      }

      // 计算最快/最慢孵化时间
      const hatchTimes = completedRecords.map(r => r.updatedAt - r.createdAt);
      stats.fastestHatchTime = Math.min(...hatchTimes);
      stats.slowestHatchTime = Math.max(...hatchTimes);
    }

    this.statsCache = stats;
    return stats;
  }

  // ==================== 私有方法 ====================

  private generateDefaultAttributes(): TadpoleInitialAttributes {
    return {
      healthBonus: 0,
      happinessBonus: 0,
      intelligenceBonus: 0,
      socialBonus: 0,
      specialTraits: [],
    };
  }

  private calculateTadpoleAttributes(
    record: HatchMemoryRecord,
    actualHatchTime: number
  ): TadpoleInitialAttributes {
    const { memory } = record;
    const attributes: TadpoleInitialAttributes = {
      healthBonus: 0,
      happinessBonus: 0,
      intelligenceBonus: 0,
      socialBonus: 0,
      specialTraits: [],
    };

    // 根据互动类型计算属性加成
    memory.interactions.forEach(interaction => {
      switch (interaction.type) {
        case 'tap':
          attributes.healthBonus += 0.5;
          attributes.socialBonus += 0.3;
          break;
        case 'shake':
          attributes.intelligenceBonus += 0.5;
          attributes.socialBonus += 0.5;
          break;
        case 'heat':
          attributes.healthBonus += 0.8;
          attributes.happinessBonus += 0.5;
          break;
        case 'rub':
          attributes.happinessBonus += 0.8;
          attributes.socialBonus += 0.3;
          break;
      }
    });

    // 根据孵化时间计算特殊特质
    const hatchDuration = actualHatchTime - record.createdAt;
    const expectedDuration = memory.estimatedHatchTime;
    const efficiency = expectedDuration / hatchDuration;

    if (efficiency >= 2) {
      attributes.specialTraits.push('precocious'); // 早熟
    }
    if (memory.interactions.length > 50) {
      attributes.specialTraits.push('social'); // 社交型
    }
    if (attributes.intelligenceBonus > 10) {
      attributes.specialTraits.push('intelligent'); // 聪明
    }
    if (attributes.healthBonus > 15) {
      attributes.specialTraits.push('vigorous'); // 健壮
    }

    // 限制属性上限
    attributes.healthBonus = Math.min(20, attributes.healthBonus);
    attributes.happinessBonus = Math.min(20, attributes.happinessBonus);
    attributes.intelligenceBonus = Math.min(20, attributes.intelligenceBonus);
    attributes.socialBonus = Math.min(20, attributes.socialBonus);

    return attributes;
  }

  private updateStats(record: HatchMemoryRecord, actualHatchTime: number): void {
    // 重置缓存，下次获取时重新计算
    this.statsCache = null;
    this.saveToStorage();
  }
}

// 单例实例
export const hatchMemoryStorage = new HatchMemoryStorage();

// 默认导出
export default hatchMemoryStorage;
