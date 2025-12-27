// backend/src/api/routes/price.routes.ts

import { Router } from 'express';
import { PriceService } from '../../services/defi/price.service';

const router = Router();
const priceService = new PriceService();

/**
 * GET /api/price/:symbol
 * 获取单个代币价格
 */
router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol parameter is required'
      });
    }
    
    const priceData = await priceService.getPrice(symbol);
    
    res.json({
      success: true,
      data: {
        symbol: priceData.symbol,
        priceUsd: priceData.priceUsd,
        change24h: priceData.change24h,
        change24hPercent: priceData.change24h >= 0 
          ? `+${priceData.change24h.toFixed(2)}%` 
          : `${priceData.change24h.toFixed(2)}%`,
        updatedAt: priceData.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching price:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch price data'
    });
  }
});

/**
 * GET /api/price/batch?symbols=ETH,BTC,ZETA
 * 批量获取价格
 */
router.get('/batch', async (req, res) => {
  try {
    const { symbols } = req.query;
    
    if (!symbols || typeof symbols !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Symbols query parameter is required'
      });
    }
    
    const symbolList = symbols.split(',').map(s => s.trim());
    const prices = await priceService.getBatchPrices(symbolList);
    
    res.json({
      success: true,
      data: {
        prices: prices.map(p => ({
          symbol: p.symbol,
          priceUsd: p.priceUsd,
          change24h: p.change24h
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching batch prices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch batch price data'
    });
  }
});

/**
 * GET /api/price/trending
 * 获取热门代币价格
 */
router.get('/trending', async (req, res) => {
  try {
    // 返回热门代币
    const trendingSymbols = ['ETH', 'BTC', 'ZETA', 'USDT', 'USDC', 'BNB'];
    const prices = await priceService.getBatchPrices(trendingSymbols);
    
    res.json({
      success: true,
      data: {
        prices: prices.map(p => ({
          symbol: p.symbol,
          priceUsd: p.priceUsd,
          change24h: p.change24h,
          change24hPercent: p.change24h >= 0 
            ? `+${p.change24h.toFixed(2)}%` 
            : `${p.change24h.toFixed(2)}%`
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching trending prices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending price data'
    });
  }
});

/**
 * GET /api/price/search/:query
 * 搜索代币价格
 */
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }
    
    // 简单的搜索实现，可以根据需要扩展
    const supportedTokens = ['ETH', 'BTC', 'ZETA', 'USDT', 'USDC', 'BNB', 'MATIC', 'ARB', 'OP'];
    const matchedTokens = supportedTokens.filter(token => 
      token.toLowerCase().includes(query.toLowerCase())
    );
    
    if (matchedTokens.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No matching tokens found'
      });
    }
    
    const prices = await priceService.getBatchPrices(matchedTokens);
    
    res.json({
      success: true,
      data: {
        query,
        results: prices.map(p => ({
          symbol: p.symbol,
          priceUsd: p.priceUsd,
          change24h: p.change24h
        }))
      }
    });
  } catch (error) {
    console.error('Error searching prices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search price data'
    });
  }
});

export default router;