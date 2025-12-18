// backend/src/websocket/index.ts
import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';

interface SocketData {
  walletAddress?: string;
  authenticated: boolean;
}

interface TravelData {
  travelId: number;
  targetWallet: string;
  startTime: Date;
  endTime: Date;
}

interface TravelProgress {
  phase: 'observing' | 'generating_story' | 'uploading' | 'minting';
  message: string;
  percentage?: number;
}

interface TravelResult {
  journalHash: string;
  souvenirId: number;
  story: {
    title: string;
    content: string;
    mood: string;
    highlights: string[];
  };
}

let io: Server | null = null;

export function initializeWebSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: config.FRONTEND_URL,
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // 认证中间件
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    
    if (!token) {
      // 允许匿名连接，但功能受限
      (socket.data as SocketData).authenticated = false;
      return next();
    }
    
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET || 'default-secret') as { address: string };
      (socket.data as SocketData).walletAddress = decoded.address;
      (socket.data as SocketData).authenticated = true;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`Client connected: ${socket.id}`);
    
    // 订阅青蛙状态更新
    socket.on('subscribe:frog', (frogId: number) => {
      if (frogId !== undefined && frogId !== null) {
        socket.join(`frog:${frogId}`);
        logger.info(`Socket ${socket.id} subscribed to frog:${frogId}`);
      }
    });

    // 取消订阅
    socket.on('unsubscribe:frog', (frogId: number) => {
      socket.leave(`frog:${frogId}`);
      logger.info(`Socket ${socket.id} unsubscribed from frog:${frogId}`);
    });

    // 订阅钱包相关的所有青蛙
    socket.on('subscribe:wallet', (walletAddress: string) => {
      if (walletAddress) {
        socket.join(`wallet:${walletAddress.toLowerCase()}`);
        logger.info(`Socket ${socket.id} subscribed to wallet:${walletAddress}`);
      }
    });

    // 取消钱包订阅
    socket.on('unsubscribe:wallet', (walletAddress: string) => {
      if (walletAddress) {
        socket.leave(`wallet:${walletAddress.toLowerCase()}`);
      }
    });

    socket.on('disconnect', (reason: string) => {
      logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    socket.on('error', (error: Error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });
  });

  logger.info('WebSocket server initialized');
  return io;
}

// 通知函数
export function notifyTravelStarted(frogId: number, travelData: TravelData): void {
  if (io) {
    io.to(`frog:${frogId}`).emit('travel:started', {
      frogId,
      ...travelData,
      timestamp: Date.now()
    });
    logger.info(`Notified travel:started for frog ${frogId}`);
  }
}

export function notifyTravelProgress(frogId: number, progress: TravelProgress): void {
  if (io) {
    io.to(`frog:${frogId}`).emit('travel:progress', {
      frogId,
      ...progress,
      timestamp: Date.now()
    });
  }
}

export function notifyTravelCompleted(frogId: number, result: TravelResult): void {
  if (io) {
    io.to(`frog:${frogId}`).emit('travel:completed', {
      frogId,
      ...result,
      timestamp: Date.now()
    });
    logger.info(`Notified travel:completed for frog ${frogId}`);
  }
}

export function notifyFrogStatusChanged(frogId: number, status: string): void {
  if (io) {
    io.to(`frog:${frogId}`).emit('frog:statusChanged', {
      frogId,
      status,
      timestamp: Date.now()
    });
  }
}

export function notifyWallet(walletAddress: string, event: string, data: unknown): void {
  if (io) {
    io.to(`wallet:${walletAddress.toLowerCase()}`).emit(event, data);
  }
}

export function getIO(): Server | null {
  return io;
}

export function setIO(ioInstance: Server): void {
  io = ioInstance;
}