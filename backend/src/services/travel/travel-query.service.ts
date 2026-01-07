// backend/src/services/travel/travel-query.service.ts
/**
 * 旅行查询服务 - 抽象的 Service 层
 * 将业务逻辑从 Controller 中抽离，提升可测试性和可维护性
 */

import { prisma } from '../../database';
import { TravelStatus, Prisma } from '@prisma/client';
import { logger } from '../../utils/logger';

// 类型定义
export interface TravelQueryParams {
  frogId?: number;
  address?: string;
  status?: TravelStatus | TravelStatus[];
  limit?: number;
  offset?: number;
}

export interface TravelHistoryResult {
  travels: any[];
  total: number;
  hasMore: boolean;
}

export interface TravelStats {
  totalTrips: number;
  bscTrips: number;
  ethTrips: number;
  zetaTrips: number;
  totalDiscoveries: number;
  rareFinds: number;
  totalFrogs: number;
  recentTravel: any | null;
}

/**
 * 旅行查询服务类
 */
export class TravelQueryService {
  /**
   * 获取用户的旅行历史
   * 使用 Prisma.select 只返回必要字段，减少数据传输
   */
  async getTravelHistory(params: TravelQueryParams): Promise<TravelHistoryResult> {
    const { address, frogId, limit = 10, offset = 0 } = params;
    
    if (!address) {
      throw new Error('Address is required');
    }
    
    // 获取用户的青蛙列表
    const userFrogs = await prisma.frog.findMany({
      where: { ownerAddress: address.toLowerCase() },
      select: { id: true, tokenId: true },
    });
    
    if (userFrogs.length === 0) {
      return { travels: [], total: 0, hasMore: false };
    }
    
    // 构建查询条件
    const frogIds = userFrogs.map(f => f.id);
    const whereClause: Prisma.TravelWhereInput = {
      frogId: { in: frogIds },
    };
    
    // 如果指定了青蛙 ID
    if (frogId) {
      const targetFrog = userFrogs.find(f => f.tokenId === frogId);
      if (!targetFrog) {
        return { travels: [], total: 0, hasMore: false };
      }
      whereClause.frogId = targetFrog.id;
    }
    
    // 并行获取数据和总数
    const [travels, total] = await Promise.all([
      prisma.travel.findMany({
        where: whereClause,
        select: {
          id: true,
          frogId: true,
          targetWallet: true,
          chainId: true,
          status: true,
          startTime: true,
          endTime: true,
          completedAt: true,
          journalContent: true,
          exploredBlock: true,
          isRandom: true,
          frog: {
            select: {
              name: true,
              tokenId: true,
            },
          },
          souvenir: {
            select: {
              id: true,
              name: true,
              rarity: true,
              // imageUrl: true, // Removed: field does not exist in schema
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.travel.count({ where: whereClause }),
    ]);
    
    // 解析日记内容
    const travelsParsed = travels.map(travel => {
      let journal = null;
      try {
        if (travel.journalContent) {
          journal = JSON.parse(travel.journalContent);
        }
      } catch (e) {
        journal = {
          title: '旅行回顾',
          content: travel.journalContent,
          mood: 'happy',
          highlights: [],
        };
      }
      return {
        ...travel,
        exploredBlock: travel.exploredBlock?.toString(),
        journal,
      };
    });
    
    return {
      travels: travelsParsed,
      total,
      hasMore: offset + limit < total,
    };
  }
  
  /**
   * 获取旅行统计数据
   */
  async getTravelStats(address: string, frogId?: number): Promise<TravelStats> {
    // 获取用户的青蛙列表
    const frogs = await prisma.frog.findMany({
      where: { ownerAddress: address.toLowerCase() },
      select: { id: true, tokenId: true },
    });
    
    let frogIds = frogs.map(f => f.id);
    
    // 如果指定了青蛙
    if (frogId && frogId !== -1) {
      const targetFrog = frogs.find(f => f.tokenId === frogId);
      if (targetFrog) {
        frogIds = [targetFrog.id];
      } else {
        return {
          totalTrips: 0,
          bscTrips: 0,
          ethTrips: 0,
          zetaTrips: 0,
          totalDiscoveries: 0,
          rareFinds: 0,
          totalFrogs: frogs.length,
          recentTravel: null,
        };
      }
    }
    
    // 并行统计各链的旅行数量
    const [totalTravels, bscTravels, ethTravels, zetaTravels, completedTravels, recentTravel] = 
      await Promise.all([
        prisma.travel.count({ where: { frogId: { in: frogIds } } }),
        prisma.travel.count({ where: { frogId: { in: frogIds }, chainId: 97 } }),
        prisma.travel.count({ where: { frogId: { in: frogIds }, chainId: 11155111 } }),
        prisma.travel.count({ where: { frogId: { in: frogIds }, chainId: 7001 } }),
        prisma.travel.findMany({
          where: { frogId: { in: frogIds }, status: 'Completed' },
          select: {
            exploredSnapshot: true,
            souvenir: { select: { rarity: true } },
          },
        }),
        prisma.travel.findFirst({
          where: { frogId: { in: frogIds }, status: 'Completed' },
          select: {
            id: true,
            completedAt: true,
            frog: { select: { name: true } },
          },
          orderBy: { completedAt: 'desc' },
        }),
      ]);
    
    // 计算发现数据
    let totalDiscoveries = 0;
    let rareFinds = 0;
    
    completedTravels.forEach(travel => {
      const snapshot = travel.exploredSnapshot as any;
      if (snapshot?.discoveries) {
        totalDiscoveries += snapshot.discoveries.length;
        rareFinds += snapshot.discoveries.filter((d: any) => d.rarity >= 3).length;
      }
      if (travel.souvenir) {
        const rarity = travel.souvenir.rarity as string;
        if (['Rare', 'Epic', 'Legendary'].includes(rarity)) {
          rareFinds++;
        }
      }
    });
    
    return {
      totalTrips: totalTravels,
      bscTrips: bscTravels,
      ethTrips: ethTravels,
      zetaTrips: zetaTravels,
      totalDiscoveries,
      rareFinds,
      totalFrogs: frogs.length,
      recentTravel: recentTravel
        ? {
            id: recentTravel.id,
            frogName: recentTravel.frog.name,
            completedAt: recentTravel.completedAt,
          }
        : null,
    };
  }
  
  /**
   * 获取青蛙当前活跃的旅行
   */
  async getActiveTravel(frogTokenId: number) {
    const activeTravel = await prisma.travel.findFirst({
      where: {
        frog: { tokenId: frogTokenId },
        status: { in: [TravelStatus.Active, TravelStatus.Processing] },
      },
      select: {
        id: true,
        frogId: true,
        targetWallet: true,
        chainId: true,
        status: true,
        startTime: true,
        endTime: true,
        isRandom: true,
        exploredBlock: true,
      },
    });
    
    if (!activeTravel) {
      return null;
    }
    
    // 计算进度
    const remainingMs = activeTravel.endTime.getTime() - Date.now();
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    const progress = Math.min(
      100,
      Math.floor(
        ((Date.now() - activeTravel.startTime.getTime()) /
          (activeTravel.endTime.getTime() - activeTravel.startTime.getTime())) *
          100
      )
    );
    
    return {
      ...activeTravel,
      exploredBlock: activeTravel.exploredBlock?.toString(),
      remainingSeconds,
      progress,
    };
  }
  
  /**
   * 获取旅行详情
   */
  async getTravelDetail(travelId: number) {
    const travel = await prisma.travel.findUnique({
      where: { id: travelId },
      include: {
        frog: true,
        souvenir: true,
      },
    });
    
    if (!travel) {
      return null;
    }
    
    // 解析日记
    let journal = null;
    try {
      if (travel.journalContent) {
        journal = JSON.parse(travel.journalContent);
      }
    } catch (e) {
      journal = {
        title: '旅行回顾',
        content: travel.journalContent,
        mood: 'happy',
        highlights: [],
      };
    }
    
    return {
      ...travel,
      journal,
      exploredBlock: travel.exploredBlock?.toString(),
    };
  }
}

// 导出单例
export const travelQueryService = new TravelQueryService();
