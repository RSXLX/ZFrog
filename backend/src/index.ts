// backend/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config';
import { logger } from './utils/logger';
import { travelProcessor } from './workers/travelProcessor';
import { eventListener } from './workers/eventListener';
import { crossChainListener } from './services/cross-chain-listener.service';
import { explorationScheduler } from './services/exploration-scheduler.service';
import { initializeWebSocket, setIO } from './websocket';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

import frogRoutes from './api/routes/frog.routes';
import travelRoutes from './api/routes/travel.routes';
import healthRoutes from './api/routes/health.routes';
import friendsRoutes from './api/routes/friends.routes';
import gardenRoutes from './api/routes/garden.routes';
import nftImageRoutes from './api/routes/nft-image.routes';
import badgeRoutes from './api/routes/badge.routes';
import souvenirRoutes from './api/routes/souvenir.routes';
import chatRoutes from './api/routes/chat.routes';
import priceRoutes from './api/routes/price.routes';
import crossChainRoutes from './api/routes/cross-chain.routes';
import messageRoutes from './api/routes/message.routes';
import homesteadRoutes from './api/routes/homestead.routes';
import crossChainTransferRoutes from './api/routes/crosschain-transfer.routes'; // 🆕 跨链转账
import communityRoutes from './api/routes/community.routes'; // 🆕 社区系统


const app = express();
const httpServer = createServer(app);

// 初始化 WebSocket
const io = initializeWebSocket(httpServer);

// Middleware
app.use(helmet());
app.use(cors({ 
  origin: [config.FRONTEND_URL, 'http://localhost:5174'],
  credentials: true 
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/frogs', frogRoutes);
app.use('/api/travels', travelRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/garden', gardenRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/nft-image', nftImageRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/souvenirs', souvenirRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/price', priceRoutes);
app.use('/api/cross-chain', crossChainRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/homestead', homesteadRoutes); // 🆕 家园系统
app.use('/api/crosschain-transfer', crossChainTransferRoutes); // 🆕 跨链转账
app.use('/api/communities', communityRoutes); // 🆕 社区系统



// Root route
app.get('/', (req, res) => {
  res.json({
    message: '🐸 ZetaFrog Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      frogs: '/api/frogs/:tokenId',
      travels: '/api/travels/:frogId',
    },
  });
});

// 404 handler (必须在路由之后，错误处理之前)
app.use(notFoundHandler);

// 统一错误处理中间件 (必须在所有中间件和路由之后)
app.use(errorHandler);

// Export io for use in other modules
export { io };

// Start server
httpServer.listen(config.PORT, async () => {
  logger.info(`🐸 ZetaFrog Backend running on port ${config.PORT}`);
  logger.info(`   Environment: ${config.NODE_ENV}`);
  logger.info(`   Frontend URL: ${config.FRONTEND_URL}`);
  logger.info(`   WebSocket: Ready`);
  
  // Inject io instance into workers
  travelProcessor.setIo(io);
  
  // Start background workers
  try {
    await eventListener.start();
    travelProcessor.start();
    
    // Start cross-chain listener and exploration scheduler
    await crossChainListener.start();
    await explorationScheduler.start();
    
    logger.info('✅ All workers started successfully');
  } catch (error) {
    logger.error('❌ Failed to start workers:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});