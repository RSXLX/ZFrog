/**
 * Travel 微服务 (P2 微服务拆分)
 * 职责：旅行生命周期管理、状态流转、协调其他服务
 */

import { EventEmitter } from 'events';
import { prisma } from '../../database';
import { TravelStatus, TravelStage, FrogStatus } from '@prisma/client';
import { multiLevelCache } from '../cache/MultiLevelCache';
import { logger } from '../../utils/logger';

// 事件类型
interface TravelEvents {
  'travel:started': { travelId: number; frogId: number };
  'travel:completed': { travelId: number; frogId: number; journalHash: string };
  'travel:failed': { travelId: number; frogId: number; error: string };
  'travel:stage:changed': { travelId: number; stage: TravelStage; progress: number };
}

interface StartTravelInput {
  frogId: number;
  targetWallet: string;
  chainId: number;
  durationMinutes: number;
  isRandom?: boolean;
}

interface TravelResult {
  success: boolean;
  travelId?: number;
  error?: string;
}

export class TravelService extends EventEmitter {
  private static instance: TravelService;
  private isRunning = false;
  private processingInterval: NodeJS.Timeout | null = null;

  // 常量配置
  private readonly PROCESSING_INTERVAL = 5000; // 5秒检查一次
  private readonly BATCH_SIZE = 5; // 每批处理5个

  private constructor() {
    super();
    this.setupEventHandlers();
  }

  static getInstance(): TravelService {
    if (!TravelService.instance) {
      TravelService.instance = new TravelService();
    }
    return TravelService.instance;
  }

  /**
   * 启动服务
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('[TravelService] Already running');
      return;
    }

    this.isRunning = true;
    logger.info('[TravelService] Started');

    // 启动定时处理
    this.processingInterval = setInterval(
      () => this.processPendingTravels(),
      this.PROCESSING_INTERVAL
    );

    // 立即执行一次
    this.processPendingTravels();
  }

  /**
   * 停止服务
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    logger.info('[TravelService] Stopped');
  }

  /**
   * 开始新旅行
   */
  async startTravel(input: StartTravelInput): Promise<TravelResult> {
    try {
      // 检查青蛙状态
      const frog = await prisma.frog.findUnique({
        where: { id: input.frogId },
      });

      if (!frog) {
        return { success: false, error: 'Frog not found' };
      }

      if (frog.status !== 'Idle') {
        return { success: false, error: `Frog is ${frog.status.toLowerCase()}` };
      }

      // 计算结束时间
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + input.durationMinutes * 60 * 1000);

      // 创建旅行记录
      const travel = await prisma.travel.create({
        data: {
          frogId: input.frogId,
          targetWallet: input.targetWallet.toLowerCase(),
          chainId: input.chainId,
          status: TravelStatus.Active,
          startTime,
          endTime,
          currentStage: TravelStage.EXPLORING,
          progress: 0,
          isRandom: input.isRandom ?? false,
        },
        include: {
          frog: true,
        },
      });

      // 更新青蛙状态
      await prisma.frog.update({
        where: { id: input.frogId },
        data: { status: FrogStatus.Traveling },
      });

      // 清除相关缓存
      await multiLevelCache.invalidate(`frog:${input.frogId}:travels`);

      // 触发事件
      this.emit('travel:started', {
        travelId: travel.id,
        frogId: input.frogId,
      });

      logger.info(`[TravelService] Started travel ${travel.id} for frog ${input.frogId}`);

      return {
        success: true,
        travelId: travel.id,
      };
    } catch (error) {
      logger.error('[TravelService] Failed to start travel:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 获取旅行详情（带缓存）
   */
  async getTravel(travelId: number, useCache = true): Promise<any> {
    const cacheKey = `travel:${travelId}`;

    if (useCache) {
      const cached = await multiLevelCache.get(
        cacheKey,
        async () => this.fetchTravelFromDB(travelId),
        { l1Ttl: 60, l2Ttl: 300 }
      );
      return cached;
    }

    return this.fetchTravelFromDB(travelId);
  }

  /**
   * 从数据库获取旅行
   */
  private async fetchTravelFromDB(travelId: number): Promise<any> {
    return prisma.travel.findUnique({
      where: { id: travelId },
      include: {
        frog: true,
        souvenir: true,
        discoveries: {
          orderBy: { createdAt: 'desc' },
        },
        statusMessages: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  /**
   * 处理待完成的旅行
   */
  private async processPendingTravels(): Promise<void> {
    try {
      // 获取待处理的旅行
      const pendingTravels = await prisma.travel.findMany({
        where: {
          status: TravelStatus.Active,
          endTime: { lte: new Date() },
        },
        include: { frog: true },
        orderBy: { endTime: 'asc' },
        take: this.BATCH_SIZE,
      });

      if (pendingTravels.length === 0) {
        return;
      }

      logger.info(`[TravelService] Processing ${pendingTravels.length} pending travels`);

      // 并行处理
      await Promise.all(
        pendingTravels.map(travel => this.completeTravel(travel))
      );
    } catch (error) {
      logger.error('[TravelService] Failed to process pending travels:', error);
    }
  }

  /**
   * 完成旅行
   */
  private async completeTravel(travel: any): Promise<void> {
    try {
      // 更新旅行状态
      await prisma.travel.update({
        where: { id: travel.id },
        data: {
          status: TravelStatus.Completed,
          currentStage: TravelStage.RETURNING,
          progress: 100,
          completedAt: new Date(),
        },
      });

      // 更新青蛙状态
      await prisma.frog.update({
        where: { id: travel.frogId },
        data: { status: FrogStatus.Idle },
      });

      // 清除缓存
      await multiLevelCache.invalidate(`frog:${travel.frogId}:travels`);
      await multiLevelCache.invalidate(`travel:${travel.id}`);

      // 触发事件
      this.emit('travel:completed', {
        travelId: travel.id,
        frogId: travel.frogId,
        journalHash: travel.journalHash || '',
      });

      logger.info(`[TravelService] Completed travel ${travel.id}`);
    } catch (error) {
      logger.error(`[TravelService] Failed to complete travel ${travel.id}:`, error);
      
      // 标记为失败
      await prisma.travel.update({
        where: { id: travel.id },
        data: { status: TravelStatus.Failed },
      });

      this.emit('travel:failed', {
        travelId: travel.id,
        frogId: travel.frogId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    this.on('travel:started', (data) => {
      logger.debug('[TravelService] Event: travel:started', data);
    });

    this.on('travel:completed', (data) => {
      logger.debug('[TravelService] Event: travel:completed', data);
    });

    this.on('travel:failed', (data) => {
      logger.warn('[TravelService] Event: travel:failed', data);
    });
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    isRunning: boolean;
    queueSize: number;
    l1CacheSize: number;
  } {
    return {
      isRunning: this.isRunning,
      queueSize: 0,
      l1CacheSize: 0, // TODO: expose from multiLevelCache
    };
  }
}

// 导出单例
export const travelService = TravelService.getInstance();

// 类型导出
export type { StartTravelInput, TravelResult };
