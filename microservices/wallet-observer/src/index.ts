/**
 * Wallet Observer 微服务 (P2 微服务拆分)
 * 职责：观察区块链钱包活动、数据采集、行为分析
 */

import express from 'express';
import { createClient } from '@redis/client';
import { logger } from './utils/logger';
import { WalletObserver } from './services/WalletObserver';
import { AnalysisEngine } from './services/AnalysisEngine';
import { config } from './config';

const app = express();
const PORT = process.env.PORT || 3002;

// Redis 连接
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.on('error', (err) => logger.error('Redis error:', err));
redis.on('connect', () => logger.info('Redis connected'));

// 中间件
app.use(express.json());

// 健康检查
app.get('/health', async (req, res) => {
  const walletObserver = new WalletObserver(redis);
  const health = await walletObserver.healthCheck();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    redis: redis.isReady,
    services: {
      walletObserver: health
    }
  });
});

// 观察单个钱包
app.post('/observe', async (req, res) => {
  try {
    const { address, chainId, startTime, endTime, options = {} } = req.body;
    
    if (!address || !chainId) {
      return res.status(400).json({ error: 'Missing required fields: address, chainId' });
    }
    
    const walletObserver = new WalletObserver(redis);
    const observation = await walletObserver.observe({
      address,
      chainId,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      options
    });
    
    res.json({
      success: true,
      data: observation
    });
  } catch (error) {
    logger.error('Observe error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Observation failed'
    });
  }
});

// 批量观察
app.post('/observe/batch', async (req, res) => {
  try {
    const { requests } = req.body;
    
    if (!Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({ error: 'Missing or empty requests array' });
    }
    
    if (requests.length > 100) {
      return res.status(400).json({ error: 'Too many requests (max 100)' });
    }
    
    const walletObserver = new WalletObserver(redis);
    const results = await walletObserver.observeBatch(requests);
    
    res.json({
      success: true,
      data: {
        total: requests.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      }
    });
  } catch (error) {
    logger.error('Batch observe error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Batch observation failed'
    });
  }
});

// 分析钱包画像
app.post('/analyze', async (req, res) => {
  try {
    const { address, chainId } = req.body;
    
    if (!address || !chainId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const analysisEngine = new AnalysisEngine(redis);
    const profile = await analysisEngine.generateProfile(address, chainId);
    
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    logger.error('Analysis error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Analysis failed'
    });
  }
});

// 获取支持的链
app.get('/chains', (req, res) => {
  res.json({
    chains: [
      { id: 1, name: 'Ethereum', rpc: 'https://eth-mainnet' },
      { id: 56, name: 'BSC', rpc: 'https://bsc-dataseed' },
      { id: 137, name: 'Polygon', rpc: 'https://polygon-rpc' },
      { id: 42161, name: 'Arbitrum', rpc: 'https://arb1.arbitrum.io/rpc' },
      { id: 10, name: 'Optimism', rpc: 'https://mainnet.optimism.io' },
      { id: 7001, name: 'ZetaChain Athens', rpc: 'https://zetachain-athens.g.allthatnode.com' },
    ]
  });
});

// 启动服务器
async function start() {
  try {
    await redis.connect();
    
    app.listen(PORT, () => {
      logger.info(`[Wallet Observer] Running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start:', error);
    process.exit(1);
  }
}

start();
