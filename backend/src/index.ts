import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config';
import { logger } from './utils/logger';
import { travelProcessor } from './workers/travelProcessor';
import { eventListener } from './workers/eventListener';

import frogRoutes from './api/routes/frog.routes';
import travelRoutes from './api/routes/travel.routes';
import healthRoutes from './api/routes/health.routes';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: config.FRONTEND_URL,
        methods: ['GET', 'POST'],
    },
});

// Middleware
app.use(helmet());
app.use(cors({ origin: config.FRONTEND_URL }));
app.use(express.json());

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

// WebSocket
io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    
    socket.on('subscribe:frog', (frogId: number) => {
        socket.join(`frog:${frogId}`);
        logger.info(`Client ${socket.id} subscribed to frog ${frogId}`);
    });
    
    socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
    });
});

// Export io for use in other modules
export { io };

// Start server
httpServer.listen(config.PORT, async () => {
    logger.info(`🐸 ZetaFrog Backend running on port ${config.PORT}`);
    logger.info(`   Environment: ${config.NODE_ENV}`);
    logger.info(`   Frontend URL: ${config.FRONTEND_URL}`);
    
    // Inject io instance into workers
    travelProcessor.setIo(io);
    
    // Start background workers
    try {
        await eventListener.start();
        travelProcessor.start();
        logger.info('All workers started successfully');
    } catch (error) {
        logger.error('Failed to start workers:', error);
    }
});
