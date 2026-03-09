/**
 * 多级缓存系统 (P1优化)
 * L1: 内存缓存 (最热数据)
 * L2: Redis缓存 (温数据)
 * L3: 数据库 (冷数据)
 */

import Redis from 'ioredis';
import { logger } from '../../utils/logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version: number;
}

interface CacheStats {
  l1Hits: number;
  l2Hits: number;
  l3Hits: number;
  misses: number;
  evictions: number;
}

export class MultiLevelCache {
  // L1: 内存缓存
  private l1Cache = new Map<string, CacheEntry<any>>();
  private readonly L1_MAX_SIZE = 1000;
  private readonly L1_CLEANUP_INTERVAL = 60 * 1000; // 1分钟

  // L2: Redis缓存
  private redis: Redis | null = null;
  private readonly L2_DEFAULT_TTL = 300; // 5分钟

  // 统计
  private stats: CacheStats = {
    l1Hits: 0,
    l2Hits: 0,
    l3Hits: 0,
    misses: 0,
    evictions: 0
  };

  // 版本控制（用于缓存失效）
  private keyVersions = new Map<string, number>();

  constructor(redisUrl?: string) {
    this.initL1Cleanup();
    if (redisUrl) {
      this.initRedis(redisUrl);
    }
  }

  private initRedis(redisUrl: string) {
    try {
      this.redis = new Redis(redisUrl, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3
      });

      this.redis.on('connect', () => {
        logger.info('[MultiLevelCache] Redis connected');
      });

      this.redis.on('error', (err) => {
        logger.error('[MultiLevelCache] Redis error:', err);
        this.redis = null;
      });
    } catch (error) {
      logger.error('[MultiLevelCache] Failed to init Redis:', error);
    }
  }

  private initL1Cleanup() {
    setInterval(() => {
      this.cleanupL1();
    }, this.L1_CLEANUP_INTERVAL);
  }

  private cleanupL1() {
    const now = Date.now();
    let evicted = 0;

    for (const [key, entry] of this.l1Cache.entries()) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        this.l1Cache.delete(key);
        evicted++;
      }
    }

    // 如果仍然超过最大大小，LRU淘汰
    if (this.l1Cache.size > this.L1_MAX_SIZE) {
      const sorted = Array.from(this.l1Cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toEvict = sorted.slice(0, sorted.length - this.L1_MAX_SIZE);
      for (const [key] of toEvict) {
        this.l1Cache.delete(key);
        evicted++;
      }
    }

    if (evicted > 0) {
      this.stats.evictions += evicted;
      logger.debug(`[MultiLevelCache] L1 cleaned up ${evicted} entries`);
    }
  }

  /**
   * 获取缓存
   */
  async get<T>(key: string, fetcher: () => Promise<T>, options?: {
    l1Ttl?: number;
    l2Ttl?: number;
    version?: number;
  }): Promise<T> {
    const { l1Ttl = 60, l2Ttl = this.L2_DEFAULT_TTL, version = 1 } = options || {};

    // 检查版本
    const currentVersion = this.keyVersions.get(key) || 1;
    if (version < currentVersion) {
      logger.warn(`[MultiLevelCache] Version mismatch for ${key}: ${version} < ${currentVersion}`);
    }

    // L1 检查
    const l1Entry = this.l1Cache.get(key);
    if (l1Entry && l1Entry.version >= version) {
      const age = (Date.now() - l1Entry.timestamp) / 1000;
      if (age < l1Entry.ttl) {
        this.stats.l1Hits++;
        logger.debug(`[MultiLevelCache] L1 hit for ${key}`);
        return l1Entry.data as T;
      }
    }

    // L2 检查
    if (this.redis) {
      try {
        const l2Data = await this.redis.get(`cache:${key}`);
        if (l2Data) {
          const parsed = JSON.parse(l2Data);
          if (parsed.version >= version) {
            this.stats.l2Hits++;
            logger.debug(`[MultiLevelCache] L2 hit for ${key}`);
            
            // 回填 L1
            this.l1Cache.set(key, {
              data: parsed.data,
              timestamp: Date.now(),
              ttl: l1Ttl,
              version: parsed.version
            });
            
            return parsed.data as T;
          }
        }
      } catch (error) {
        logger.error(`[MultiLevelCache] L2 error for ${key}:`, error);
      }
    }

    // L3: 回源
    this.stats.l3Hits++;
    logger.debug(`[MultiLevelCache] L3 fetch for ${key}`);
    
    const data = await fetcher();
    
    // 写入 L1
    this.l1Cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: l1Ttl,
      version
    });
    
    // 写入 L2
    if (this.redis) {
      try {
        await this.redis.setex(
          `cache:${key}`,
          l2Ttl,
          JSON.stringify({ data, version })
        );
      } catch (error) {
        logger.error(`[MultiLevelCache] Failed to write L2 for ${key}:`, error);
      }
    }
    
    return data;
  }

  /**
   * 使缓存失效
   */
  async invalidate(key: string, cascade: boolean = true): Promise<void> {
    // 删除 L1
    this.l1Cache.delete(key);
    
    // 删除 L2
    if (this.redis) {
      try {
        await this.redis.del(`cache:${key}`);
      } catch (error) {
        logger.error(`[MultiLevelCache] Failed to invalidate L2 for ${key}:`, error);
      }
    }
    
    // 更新版本号（用于乐观锁）
    const currentVersion = this.keyVersions.get(key) || 1;
    this.keyVersions.set(key, currentVersion + 1);
    
    logger.info(`[MultiLevelCache] Invalidated ${key}, new version: ${currentVersion + 1}`);
  }

  /**
   * 批量获取缓存
   */
  async getMany<T>(
    keys: string[],
    fetcher: (missingKeys: string[]) => Promise<Map<string, T>>,
    options?: {
      l1Ttl?: number;
      l2Ttl?: number;
    }
  ): Promise<Map<string, T>> {
    const result = new Map<string, T>();
    const missingKeys: string[] = [];

    // 先查 L1
    for (const key of keys) {
      const entry = this.l1Cache.get(key);
      if (entry && Date.now() - entry.timestamp < entry.ttl * 1000) {
        result.set(key, entry.data as T);
      } else {
        missingKeys.push(key);
      }
    }

    if (missingKeys.length === 0) {
      return result;
    }

    // 再查 L2
    const stillMissing: string[] = [];
    if (this.redis) {
      try {
        const pipeline = this.redis.pipeline();
        for (const key of missingKeys) {
          pipeline.get(`cache:${key}`);
        }
        const results = await pipeline.exec();

        for (let i = 0; i < missingKeys.length; i++) {
          const key = missingKeys[i];
          const [, data] = results?.[i] || [];

          if (data) {
            const parsed = JSON.parse(data);
            result.set(key, parsed.data as T);

            // 回填 L1
            this.l1Cache.set(key, {
              data: parsed.data,
              timestamp: Date.now(),
              ttl: options?.l1Ttl || 60,
              version: parsed.version || 1
            });
          } else {
            stillMissing.push(key);
          }
        }
      } catch (error) {
        logger.error('[MultiLevelCache] getMany L2 error:', error);
        stillMissing.push(...missingKeys);
      }
    } else {
      stillMissing.push(...missingKeys);
    }

    // 最后回源
    if (stillMissing.length > 0) {
      const fetched = await fetcher(stillMissing);

      for (const [key, value] of fetched.entries()) {
        result.set(key, value);

        // 写入 L1
        this.l1Cache.set(key, {
          data: value,
          timestamp: Date.now(),
          ttl: options?.l1Ttl || 60,
          version: 1
        });

        // 写入 L2
        if (this.redis) {
          this.redis.setex(
            `cache:${key}`,
            options?.l2Ttl || 300,
            JSON.stringify({ data: value, version: 1 })
          ).catch(err => {
            logger.error(`[MultiLevelCache] Failed to write L2 for ${key}:`, err);
          });
        }
      }
    }

    return result;
  }

  /**
   * 获取统计信息
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats = {
      l1Hits: 0,
      l2Hits: 0,
      l3Hits: 0,
      misses: 0,
      evictions: 0
    };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details: any }> {
    const details = {
      l1: { size: this.l1Cache.size, maxSize: this.L1_MAX_SIZE },
      l2: { connected: false },
      stats: this.getStats()
    };

    if (this.redis) {
      try {
        await this.redis.ping();
        details.l2.connected = true;
      } catch (error) {
        details.l2.error = String(error);
      }
    }

    const status = details.l2.connected ? 'healthy' : 'degraded';
    return { status, details };
  }
}

// 单例导出
export const multiLevelCache = new MultiLevelCache(process.env.REDIS_URL);
