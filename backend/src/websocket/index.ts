// backend/src/websocket/index.ts

import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
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

// 在线状态管理
const onlineFrogs = new Map<number, Set<string>>(); // frogId -> Set of socketIds

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

    // 简化的认证中间件（移除 JWT 依赖）
    io.use((socket: Socket, next) => {
        const token = socket.handshake.auth.token as string | undefined;
        const walletAddress = socket.handshake.auth.walletAddress as string | undefined;

        if (walletAddress) {
            (socket.data as SocketData).walletAddress = walletAddress;
            (socket.data as SocketData).authenticated = true;
        } else {
            (socket.data as SocketData).authenticated = false;
        }
        
        next();
    });

    io.on('connection', (socket: Socket) => {
        logger.info(`Client connected: ${socket.id}`);

        // 订阅青蛙状态更新
        socket.on('subscribe:frog', async (frogId: number) => {
            if (frogId !== undefined && frogId !== null) {
                socket.join(`frog:${frogId}`);
                logger.info(`Socket ${socket.id} subscribed to frog:${frogId}`);
                
                // 检查是否是主人订阅（用于在线状态判定）
                const { prisma } = require('../database');
                const frog = await prisma.frog.findUnique({
                    where: { tokenId: frogId }, // 注意：这里的 frogId 其实传的是 tokenId
                    select: { ownerAddress: true }
                });

                const walletAddress = (socket.data as SocketData).walletAddress;
                const isOwner = frog && walletAddress && frog.ownerAddress.toLowerCase() === walletAddress.toLowerCase();

                if (isOwner) {
                    // 标记青蛙在线
                    if (!onlineFrogs.has(frogId)) {
                        onlineFrogs.set(frogId, new Set());
                    }
                    onlineFrogs.get(frogId)!.add(socket.id);
                    
                    // 通知好友该青蛙上线
                    notifyFriendOnlineStatus(frogId, true);
                    logger.info(`Frog ${frogId} is now online (owner connected)`);
                }
            }
        });

        // 取消订阅
        socket.on('unsubscribe:frog', (frogId: number) => {
            socket.leave(`frog:${frogId}`);
            logger.info(`Socket ${socket.id} unsubscribed from frog:${frogId}`);
            
            // 更新在线状态
            const sockets = onlineFrogs.get(frogId);
            if (sockets) {
                sockets.delete(socket.id);
                if (sockets.size === 0) {
                    onlineFrogs.delete(frogId);
                    // 通知好友该青蛙离线
                    notifyFriendOnlineStatus(frogId, false);
                }
            }
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
            
            // 清理所有该socket订阅的青蛙在线状态
            for (const [frogId, sockets] of onlineFrogs.entries()) {
                if (sockets.has(socket.id)) {
                    sockets.delete(socket.id);
                    if (sockets.size === 0) {
                        onlineFrogs.delete(frogId);
                        // 通知好友该青蛙离线
                        notifyFriendOnlineStatus(frogId, false);
                    }
                }
            }
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

// 好友系统通知函数
export function notifyFriendRequestReceived(frogId: number, friendshipData: any): void {
    if (io) {
        io.to(`frog:${frogId}`).emit('friend:requestReceived', {
            frogId,
            ...friendshipData,
            timestamp: Date.now()
        });
        logger.info(`Notified friend:requestReceived for frog ${frogId}`);
    }
}

export function notifyFriendRequestStatusChanged(requesterId: number, addresseeId: number, status: string): void {
    if (io) {
        const data = {
            requesterId,
            addresseeId,
            status,
            timestamp: Date.now()
        };
        
        io.to(`frog:${requesterId}`).emit('friend:requestStatusChanged', data);
        io.to(`frog:${addresseeId}`).emit('friend:requestStatusChanged', data);
        
        logger.info(`Notified friend:requestStatusChanged for frogs ${requesterId} and ${addresseeId}`);
    }
}

export function notifyFriendInteraction(friendshipId: number, actorId: number, targetId: number, interactionData: any): void {
    if (io) {
        const data = {
            friendshipId,
            actorId,
            targetId,
            ...interactionData,
            timestamp: Date.now()
        };
        
        // 通知好友双方
        io.to(`frog:${actorId}`).emit('friend:interaction', data);
        io.to(`frog:${targetId}`).emit('friend:interaction', data);
        
        logger.info(`Notified friend:interaction for friendship ${friendshipId}`);
    }
}

export function notifyFriendRemoved(frogId: number, removedFriendId: number): void {
    if (io) {
        const data = {
            frogId,
            removedFriendId,
            timestamp: Date.now()
        };
        
        io.to(`frog:${frogId}`).emit('friend:removed', data);
        io.to(`frog:${removedFriendId}`).emit('friend:removed', data);
        
        logger.info(`Notified friend:removed for frogs ${frogId} and ${removedFriendId}`);
    }
}

// 获取青蛙的在线状态
export function isFrogOnline(frogId: number): boolean {
    return onlineFrogs.has(frogId) && onlineFrogs.get(frogId)!.size > 0;
}

// 获取所有在线青蛙的ID列表
export function getOnlineFrogIds(): number[] {
    return Array.from(onlineFrogs.keys());
}

// 通知好友在线状态变化
async function notifyFriendOnlineStatus(frogId: number, isOnline: boolean): Promise<void> {
    if (!io) return;
    
    try {
        const { prisma } = require('../database');
        
        // 获取该青蛙的所有好友
        const friendships = await prisma.friendship.findMany({
            where: {
                status: 'Accepted',
                OR: [
                    { requesterId: frogId },
                    { addresseeId: frogId }
                ]
            }
        });
        
        // 通知每个好友
        for (const friendship of friendships) {
            const friendId = friendship.requesterId === frogId 
                ? friendship.addresseeId 
                : friendship.requesterId;
            
            io.to(`frog:${friendId}`).emit('friend:onlineStatusChanged', {
                frogId,
                isOnline,
                timestamp: Date.now()
            });
        }
        
        logger.info(`Notified online status change for frog ${frogId}: ${isOnline ? 'online' : 'offline'}`);
    } catch (error) {
        logger.error(`Error notifying friend online status for frog ${frogId}:`, error);
    }
}

// 导出在线状态通知函数供外部使用
export function notifyFriendOnlineStatusChange(frogId: number, isOnline: boolean): void {
    notifyFriendOnlineStatus(frogId, isOnline);
}

export function getIO(): Server | null {
    return io;
}

export function setIO(ioInstance: Server): void {
    io = ioInstance;
}