// frontend/src/services/price.api.ts

import { api } from './api';

export interface PriceData {
  symbol: string;
  priceUsd: number;
  change24h: number;
  change24hPercent: string;
  updatedAt: string;
}

export interface PriceResponse {
  success: boolean;
  data: PriceData;
}

export interface BatchPriceResponse {
  success: boolean;
  data: {
    prices: Array<{
      symbol: string;
      priceUsd: number;
      change24h: number;
    }>;
  };
}

export interface TrendingResponse {
  success: boolean;
  data: {
    prices: Array<{
      symbol: string;
      priceUsd: number;
      change24h: number;
      change24hPercent: string;
    }>;
  };
}

export interface SearchResponse {
  success: boolean;
  data: {
    query: string;
    results: Array<{
      symbol: string;
      priceUsd: number;
      change24h: number;
    }>;
  };
}

export const priceApi = {
  /**
   * 获取单个代币价格
   */
  async getPrice(symbol: string): Promise<PriceResponse> {
    const response = await api.get<PriceResponse>(`/price/${symbol}`);
    return response;
  },

  /**
   * 批量获取价格
   */
  async getBatchPrices(symbols: string[]): Promise<BatchPriceResponse> {
    const symbolsParam = symbols.join(',');
    const response = await api.get<BatchPriceResponse>('/price/batch', {
      params: { symbols: symbolsParam }
    });
    return response;
  },

  /**
   * 获取热门代币价格
   */
  async getTrendingPrices(): Promise<TrendingResponse> {
    const response = await api.get<TrendingResponse>('/price/trending');
    return response;
  },

  /**
   * 搜索代币价格
   */
  async searchPrices(query: string): Promise<SearchResponse> {
    const response = await api.get<SearchResponse>(`/price/search/${query}`);
    return response;
  }
};