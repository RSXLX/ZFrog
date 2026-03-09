/**
 * API Gateway (微服务入口)
 * 职责：路由、认证、限流、熔断、日志
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { logger } from './utils/logger';
import { authMiddleware } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { circuitBreaker } from './middleware/circuitBreaker';
import { requestLogger } from './middleware/requestLogger';

const app = express();
const PORT = process.env.PORT || 3000;

// 全局中间件
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json());
app.use(requestLogger);

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      travel: checkServiceHealth('travel'),
      wallet: checkServiceHealth('wallet'),
      ai: checkServiceHealth('ai'),
      nft: checkServiceHealth('nft'),
      badge: checkServiceHealth('badge'),
    }
  });
});

// API 路由

// Travel 服务路由
app.use('/api/v1/travels',
  rateLimitMiddleware({ windowMs: 60000, maxRequests: 100 }),
  authMiddleware,
  circuitBreaker({
    failureThreshold: 5,
    resetTimeout: 30000,
    monitorInterval: 10000
  }),
  createProxyMiddleware({
    target: process.env.TRAVEL_SERVICE_URL || 'http://travel-service:3001',
    changeOrigin: true,
    pathRewrite: { '^/api/v1/travels': '' },
    onError: (err, req, res) => {
      logger.error('[API Gateway] Travel service error:', err);
      res.status(503).json({ error: 'Travel service unavailable' });
    }
  })
);

// Wallet 服务路由
app.use('/api/v1/wallets',
  rateLimitMiddleware({ windowMs: 60000, maxRequests: 200 }),
  authMiddleware,
  circuitBreaker({
    failureThreshold: 5,
    resetTimeout: 30000,
    monitorInterval: 10000
  }),
  createProxyMiddleware({
    target: process.env.WALLET_SERVICE_URL || 'http://wallet-service:3002',
    changeOrigin: true,
    pathRewrite: { '^/api/v1/wallets': '' },
    onError: (err, req, res) => {
      logger.error('[API Gateway] Wallet service error:', err);
      res.status(503).json({ error: 'Wallet service unavailable' });
    }
  })
);

// AI 服务路由
app.use('/api/v1/ai',
  rateLimitMiddleware({ windowMs: 60000, maxRequests: 50 }),
  authMiddleware,
  circuitBreaker({
    failureThreshold: 3,
    resetTimeout: 60000,
    monitorInterval: 10000
  }),
  createProxyMiddleware({
    target: process.env.AI_SERVICE_URL || 'http://ai-service:3003',
    changeOrigin: true,
    pathRewrite: { '^/api/v1/ai': '' },
    onError: (err, req, res) => {
      logger.error('[API Gateway] AI service error:', err);
      res.status(503).json({ error: 'AI service unavailable' });
    }
  })
);

// NFT 服务路由
app.use('/api/v1/nfts',
  rateLimitMiddleware({ windowMs: 60000, maxRequests: 100 }),
  authMiddleware,
  circuitBreaker({
    failureThreshold: 5,
    resetTimeout: 30000,
    monitorInterval: 10000
  }),
  createProxyMiddleware({
    target: process.env.NFT_SERVICE_URL || 'http://nft-service:3004',
    changeOrigin: true,
    pathRewrite: { '^/api/v1/nfts': '' },
    onError: (err, req, res) => {
      logger.error('[API Gateway] NFT service error:', err);
      res.status(503).json({ error: 'NFT service unavailable' });
    }
  })
);

// Badge 服务路由
app.use('/api/v1/badges',
  rateLimitMiddleware({ windowMs: 60000, maxRequests: 150 }),
  authMiddleware,
  circuitBreaker({
    failureThreshold: 5,
    resetTimeout: 30000,
    monitorInterval: 10000
  }),
  createProxyMiddleware({
    target: process.env.BADGE_SERVICE_URL || 'http://badge-service:3005',
    changeOrigin: true,
    pathRewrite: { '^/api/v1/badges': '' },
    onError: (err, req, res) => {
      logger.error('[API Gateway] Badge service error:', err);
      res.status(503).json({ error: 'Badge service unavailable' });
    }
  })
);

// WebSocket 代理（用于实时推送）
app.use('/ws',
  createProxyMiddleware({
    target: process.env.WS_SERVICE_URL || 'http://ws-service:3006',
    changeOrigin: true,
    ws: true,
  })
);

// 全局错误处理
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('[API Gateway] Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    requestId: req.headers['x-request-id'] || 'unknown'
  });
});

// 启动服务器
app.listen(PORT, () => {
  logger.info(`[API Gateway] Running on port ${PORT}`);
  logger.info(`[API Gateway] Environment: ${process.env.NODE_ENV || 'development'}`);
});

// 服务健康检查函数
function checkServiceHealth(serviceName: string