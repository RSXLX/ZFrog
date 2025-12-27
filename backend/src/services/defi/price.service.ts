// backend/src/services/defi/price.service.ts

import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { logger } from '../../utils/logger';

// CoinGecko ID 映射
const COINGECKO_IDS: Record<string, string> = {
  'ETH': 'ethereum',
  'BTC': 'bitcoin',
  'ZETA': 'zetachain',
  'USDT': 'tether',
  'USDC': 'usd-coin',
  'ARB': 'arbitrum',
  'OP': 'optimism',
  'SOL': 'solana',
  'BNB': 'binancecoin',
  'MATIC': 'matic-network'
};

export interface PriceData {
  symbol: string;
  priceUsd: number;
  change24h: number;
  marketCap?: number;
  volume24h?: number;
  updatedAt: Date;
}

export class PriceService {
  private prisma: PrismaClient;
  private cacheSeconds = 60; // 缓存 60 秒
  
  constructor() {
    this.prisma = new PrismaClient();
  }
  
  /**
   * 获取单个代币价格
   */
  async getPrice(symbol: string): Promise<PriceData> {
    const upperSymbol = symbol.toUpperCase();
    
    try {
      // 1. 先查缓存
      const cached = await this.getCachedPrice(upperSymbol);
      if (cached) return cached;
      
      // 2. 缓存未命中，调用 API
      const fresh = await this.fetchFromCoinGecko(upperSymbol);
      
      // 3. 更新缓存
      await this.updateCache(fresh);
      
      return fresh;
    } catch (error) {
      logger.error(`Error fetching price for ${symbol}:`, error);
      
      // 返回兜底数据
      return this.getFallbackPrice(upperSymbol);
    }
  }
  
  /**
   * 批量获取价格
   */
  async getBatchPrices(symbols: string[]): Promise<PriceData[]> {
    const upperSymbols = symbols.map(s => s.toUpperCase());
    
    try {
      // CoinGecko 支持批量查询
      const ids = upperSymbols
        .map(s => COINGECKO_IDS[s])
        .filter(Boolean)
        .join(',');
      
      if (!ids) {
        // 如果没有有效的ID，返回兜底数据
        return upperSymbols.map(symbol => this.getFallbackPrice(symbol));
      }
      
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price',
        {
          params: {
            ids,
            vs_currencies: 'usd',
            include_24hr_change: true,
            include_market_cap: true,
            include_24hr_vol: true
          },
          timeout: 10000
        }
      );
      
      const results = upperSymbols.map(symbol => {
        const id = COINGECKO_IDS[symbol];
        const data = response.data[id];
        
        if (data) {
          const priceData: PriceData = {
            symbol,
            priceUsd: data.usd || 0,
            change24h: data.usd_24h_change || 0,
            marketCap: data.usd_market_cap,
            volume24h: data.usd_24h_vol,
            updatedAt: new Date()
          };
          
          // 异步更新缓存
          this.updateCache(priceData).catch(err => 
            logger.warn('Failed to update cache:', err)
          );
          
          return priceData;
        } else {
          return this.getFallbackPrice(symbol);
        }
      });
      
      return results;
    } catch (error) {
      logger.error('Error fetching batch prices:', error);
      
      // 返回兜底数据
      return upperSymbols.map(symbol => this.getFallbackPrice(symbol));
    }
  }
  
  /**
   * 从缓存获取价格
   */
  private async getCachedPrice(symbol: string): Promise<PriceData | null> {
    try {
      const cached = await this.prisma.priceCache.findFirst({
        where: {
          symbol,
          source: 'coingecko',
          updatedAt: {
            gte: new Date(Date.now() - this.cacheSeconds * 1000)
          }
        }
      });
      
      if (!cached) return null;
      
      return {
        symbol: cached.symbol,
        priceUsd: cached.priceUsd,
        change24h: cached.change24h || 0,
        updatedAt: cached.updatedAt
      };
    } catch (error) {
      logger.warn('Error reading from cache:', error);
      return null;
    }
  }
  
  /**
   * 调用 CoinGecko API
   */
  private async fetchFromCoinGecko(symbol: string): Promise<PriceData> {
    const id = COINGECKO_IDS[symbol];
    
    if (!id) {
      throw new Error(`Unsupported token: ${symbol}`);
    }
    
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price`,
      {
        params: {
          ids: id,
          vs_currencies: 'usd',
          include_24hr_change: true,
          include_market_cap: true,
          include_24hr_vol: true
        },
        timeout: 10000
      }
    );
    
    const data = response.data[id];
    
    if (!data || !data.usd) {
      throw new Error(`Invalid price data for ${symbol}`);
    }
    
    return {
      symbol,
      priceUsd: data.usd,
      change24h: data.usd_24h_change || 0,
      marketCap: data.usd_market_cap,
      volume24h: data.usd_24h_vol,
      updatedAt: new Date()
    };
  }
  
  /**
   * 更新缓存
   */
  private async updateCache(price: PriceData): Promise<void> {
    try {
      await this.prisma.priceCache.upsert({
        where: {
          symbol_source: {
            symbol: price.symbol,
            source: 'coingecko'
          }
        },
        update: {
          priceUsd: price.priceUsd,
          change24h: price.change24h
        },
        create: {
          symbol: price.symbol,
          priceUsd: price.priceUsd,
          change24h: price.change24h,
          source: 'coingecko'
        }
      });
    } catch (error) {
      logger.warn('Failed to update price cache:', error);
    }
  }
  
  /**
   * 获取兜底价格数据
   */
  private getFallbackPrice(symbol: string): PriceData {
    // 兜底价格数据（测试用）
    const fallbackPrices: Record<string, number> = {
      'ETH': 3800,
      'BTC': 65000,
      'ZETA': 0.8,
      'USDT': 1.0,
      'USDC': 1.0,
      'ARB': 1.2,
      'OP': 2.5,
      'SOL': 180,
      'BNB': 600,
      'MATIC': 0.9
    };
    
    const price = fallbackPrices[symbol] || 0;
    
    return {
      symbol,
      priceUsd: price,
      change24h: (Math.random() - 0.5) * 10, // 随机涨跌
      updatedAt: new Date()
    };
  }
  
  /**
   * 清理过期缓存
   */
  async cleanupCache(): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24小时前
      
      const result = await this.prisma.priceCache.deleteMany({
        where: {
          updatedAt: {
            lt: cutoffDate
          }
        }
      });
      
      logger.info(`Cleaned up ${result.count} expired price cache entries`);
    } catch (error) {
      logger.error('Error cleaning up price cache:', error);
    }
  }
  
  /**
   * 预热缓存（获取热门代币价格）
   */
  async warmupCache(): Promise<void> {
    try {
      const trendingSymbols = ['ETH', 'BTC', 'ZETA', 'USDT', 'USDC'];
      await this.getBatchPrices(trendingSymbols);
      logger.info('Price cache warmed up successfully');
    } catch (error) {
      logger.error('Error warming up price cache:', error);
    }
  }
}