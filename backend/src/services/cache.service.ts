// backend/src/services/cache.service.ts
/**
 * Redis 缓存服务
 * 用于缓存热点数据，减少数据库压力
 * 
 * 注意：如果 Redis 不可用，服务会降级为内存缓存
 */

import { logger } from '../utils/logger';

// 缓存配置
const CACHE_CONFIG = {
  // 旅行历史列表缓存时间（秒）
  TRAVEL_HISTORY_TTL: 60,
  // 旅行统计缓存时间（秒）
  TRAVEL_STATS_TTL: 300,
  // 青蛙详情缓存时间（秒）
  FROG_DETAIL_TTL: 120,
  // 活跃旅行缓存时间（秒）
  ACTIVE_TRAVEL_TTL: 10,
};

// 缓存键前缀
const CACHE_KEYS = {
  TRAVEL_HISTORY: 'travel:history:',
  TRAVEL_STATS: 'travel:stats:',
  FROG_DETAIL: 'frog:detail:',
  ACTIVE_TRAVEL: 'travel:active:',
};

/**
 * 简单的内存缓存实现
 * 作为 Redis 不可用时的降级方案
 */
class MemoryCache {
  private cache: Map<string, { value: any; expireAt: number }> = new Map();
  
  async get(key: string): Promise<string | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expireAt) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }
  
  async set(key: string, value: string, ttl: number): Promise<void> {
    this.cache.set(key, {
      value,
      expireAt: Date.now() + ttl * 1000,
    });
  }
  
  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }
  
  async delByPattern(pattern: string): Promise<void> {
    const prefix = pattern.replace('*', '');
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * 缓存服务类
 */
export class CacheService {
  private memoryCache: MemoryCache;
  private redisClient: any = null;
  private useRedis = false;
  
  constructor() {
    this.memoryCache = new MemoryCache();
    this.initRedis();
  }
  
  /**
   * 初始化 Redis 连接
   */
  private async initRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      logger.info('[CacheService] Redis URL not configured, using memory cache');
      return;
    }
    
    try {
      // 动态导入 Redis 客户端
      const { createClient } = await import('redis');
      this.redisClient = createClient({ url: redisUrl });
      
      this.redisClient.on('error', (err: Error) => {
        logger.error('[CacheService] Redis error:', err);
        this.useRedis = false;
      });
      
      this.redisClient.on('connect', () => {
        logger.info('[CacheService] Redis connected');
        this.useRedis = true;
      });
      
      await this.redisClient.connect();
    } catch (error) {
      logger.warn('[CacheService] Failed to connect to Redis, using memory cache:', error);
      this.useRedis = false;
    }
  }
  
  /**
   * 获取缓存值
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = this.useRedis && this.redisClient
        ? await this.redisClient.get(key)
        : await this.memoryCache.get(key);
      
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('[CacheService] Get error:', error);
      return null;
    }
  }
  
  /**
   * 设置缓存值
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      
      if (this.useRedis && this.redisClient) {
        await this.redisClient.setEx(key, ttlSeconds, serialized);
      } else {
        await this.memoryCache.set(key, serialized, ttlSeconds);
      }
    } catch (error) {
      logger.error('[CacheService] Set error:', error);
    }
  }
  
  /**
   * 删除缓存
   */
  async del(key: string): Promise<void> {
    try {
      if (this.useRedis && this.redisClient) {
        await this.redisClient.del(key);
      } else {
        await this.memoryCache.del(key);
      }
    } catch (error) {
      logger.error('[CacheService] Del error:', error);
    }
  }
  
  /**
   * 按模式删除缓存
   */
  async delByPattern(pattern: string): Promise<void> {
    try {
      if (this.useRedis && this.redisClient) {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
      } else {
        await this.memoryCache.delByPattern(pattern);
      }
    } catch (error) {
      logger.error('[CacheService] DelByPattern error:', error);
    }
  }
  
  // ============ 业务缓存方法 ============
  
  /**
   * 缓存旅行历史
   */
  async cacheTravelHistory(address: string, frogId: number | null, data: any): Promise<void> {
    const key = `${CACHE_KEYS.TRAVEL_HISTORY}${address}:${frogId ?? 'all'}`;
    await this.set(key, data, CACHE_CONFIG.TRAVEL_HISTORY_TTL);
  }
  
  /**
   * 获取缓存的旅行历史
   */
  async getCachedTravelHistory(address: string, frogId: number | null): Promise<any | null> {
    const key = `${CACHE_KEYS.TRAVEL_HISTORY}${address}:${frogId ?? 'all'}`;
    return this.get(key);
  }
  
  /**
   * 缓存旅行统计
   */
  async cacheTravelStats(address: string, frogId: number | null, data: any): Promise<void> {
    const key = `${CACHE_KEYS.TRAVEL_STATS}${address}:${frogId ?? 'all'}`;
    await this.set(key, data, CACHE_CONFIG.TRAVEL_STATS_TTL);
  }
  
  /**
   * 获取缓存的旅行统计
   */
  async getCachedTravelStats(address: string, frogId: number | null): Promise<any | null> {
    const key = `${CACHE_KEYS.TRAVEL_STATS}${address}:${frogId ?? 'all'}`;
    return this.get(key);
  }
  
  /**
   * 使旅行相关缓存失效
   */
  async invalidateTravelCache(address: string): Promise<void> {
    await this.delByPattern(`${CACHE_KEYS.TRAVEL_HISTORY}${address}:*`);
    await this.delByPattern(`${CACHE_KEYS.TRAVEL_STATS}${address}:*`);
  }
  
  /**
   * 缓存活跃旅行
   */
  async cacheActiveTravel(frogId: number, data: any): Promise<void> {
    const key = `${CACHE_KEYS.ACTIVE_TRAVEL}${frogId}`;
    await this.set(key, data, CACHE_CONFIG.ACTIVE_TRAVEL_TTL);
  }
  
  /**
   * 获取缓存的活跃旅行
   */
  async getCachedActiveTravel(frogId: number): Promise<any | null> {
    const key = `${CACHE_KEYS.ACTIVE_TRAVEL}${frogId}`;
    return this.get(key);
  }
  
  /**
   * 使活跃旅行缓存失效
   */
  async invalidateActiveTravel(frogId: number): Promise<void> {
    const key = `${CACHE_KEYS.ACTIVE_TRAVEL}${frogId}`;
    await this.del(key);
  }
}

// 导出单例
export const cacheService = new CacheService();
export { CACHE_CONFIG, CACHE_KEYS };
