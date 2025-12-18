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
import { initializeWebSocket, setIO } from './websocket';

import frogRoutes from './api/routes/frog.routes';
import travelRoutes from './api/routes/travel.routes';
import healthRoutes from './api/routes/health.routes';

const app = express();
const httpServer = createServer(app);

// 初始化 WebSocket
const io = initializeWebSocket(httpServer);

// Middleware
app.use(helmet());
app.use(cors({ 
  origin: config.FRONTEND_URL,
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
app.use('/api/health', healthRoutes);

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

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      message: err.message || 'Internal server error',
      code: 'INTERNAL_ERROR'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Not found',
      code: 'NOT_FOUND'
    }
  });
});

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