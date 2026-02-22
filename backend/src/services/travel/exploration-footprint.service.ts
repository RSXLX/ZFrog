// backend/src/services/travel/exploration-footprint.service.ts
// V2.0 P1 探索脚印服务 - 首位发现者和社交分享

import { prisma } from '../../database';
import { logger } from '../../utils/logger';
import { addressAnalysisService } from './address-analysis.service';

interface ShareCard {
  title: string;
  description: string;
  imageUrl?: string;
  shareText: string;
  twitterUrl: string;
  discordUrl?: string;
}

class ExplorationFootprintService {
  /**
   * 检查并记录地址发现（首位发现者）
   */
  async checkAndRecordDiscovery(
    address: string,
    chainId: number,
    frogId: number
  ): Promise<{
    isFirstDiscoverer: boolean;
    isGoldLabel: boolean;
    discovery?: any;
  }> {
    try {
      // 检查是否已被发现
      const existing = await prisma.addressDiscovery.findUnique({
        where: {
          address_chainId: { address: address.toLowerCase(), chainId },
        },
      });

      if (existing) {
        return { isFirstDiscoverer: false, isGoldLabel: false };
      }

      // 分析地址类型
      const addressInfo = await addressAnalysisService.analyzeAddress(address, chainId);
      
      // 只有 DeFi/巨鲸地址才有资格获得 Gold Label
      const isGoldLabel = addressInfo.type === 'defi' || addressInfo.type === 'whale';

      // 创建首位发现记录
      const discovery = await prisma.addressDiscovery.create({
        data: {
          address: address.toLowerCase(),
          chainId,
          discovererFrogId: frogId,
          isGoldLabel,
          addressType: addressInfo.type,
          protocolName: addressInfo.name,
        },
      });

      logger.info(`[ExplorationFootprint] First discovery! Frog ${frogId} discovered ${address} (${addressInfo.type}), goldLabel=${isGoldLabel}`);

      return { isFirstDiscoverer: true, isGoldLabel, discovery };
    } catch (error) {
      logger.error('[ExplorationFootprint] Error recording discovery:', error);
      return { isFirstDiscoverer: false, isGoldLabel: false };
    }
  }

  /**
   * 获取地址的发现者信息
   */
  async getDiscoveryInfo(address: string, chainId: number): Promise<{
    discoverer?: {
      frogId: number;
      frogName: string;
      discoveredAt: Date;
    };
    isGoldLabel: boolean;
    protocolName?: string;
  } | null> {
    const discovery = await prisma.addressDiscovery.findUnique({
      where: {
        address_chainId: { address: address.toLowerCase(), chainId },
      },
      include: {
        discoverer: {
          select: { id: true, name: true },
        },
      },
    });

    if (!discovery) {
      return null;
    }

    return {
      discoverer: {
        frogId: discovery.discovererFrogId,
        frogName: discovery.discoverer?.name || 'Unknown',
        discoveredAt: discovery.discoveredAt,
      },
      isGoldLabel: discovery.isGoldLabel,
      protocolName: discovery.protocolName || undefined,
    };
  }

  /**
   * 生成探索脚印分享卡片
   */
  async generateShareCard(
    travelId: number,
    frogName: string,
    protocolName?: string
  ): Promise<ShareCard> {
    const travel = await prisma.travel.findUnique({
      where: { id: travelId },
      include: { frog: true },
    });

    if (!travel) {
      throw new Error('Travel not found');
    }

    const displayProtocol = protocolName || travel.targetWallet?.slice(0, 10) + '...';
    
    const title = protocolName 
      ? `🐸 ${frogName} 探索了 ${protocolName}！`
      : `🐸 ${frogName} 完成了链上冒险！`;

    const description = protocolName
      ? `我的青蛙在 ${protocolName} 捡到了神秘碎片！快来看看你的青蛙能发现什么？`
      : `一场精彩的链上探索之旅已完成！`;

    const shareText = encodeURIComponent(
      `${title}\n\n${description}\n\n#ZetaFrog #Web3Gaming #NFT`
    );

    return {
      title,
      description,
      shareText: decodeURIComponent(shareText),
      twitterUrl: `https://twitter.com/intent/tweet?text=${shareText}`,
      discordUrl: undefined, // TODO: 添加 Discord webhook
    };
  }

  /**
   * 获取青蛙的所有发现记录
   */
  async getFrogDiscoveries(frogId: number): Promise<any[]> {
    return prisma.addressDiscovery.findMany({
      where: { discovererFrogId: frogId },
      orderBy: { discoveredAt: 'desc' },
    });
  }

  /**
   * 获取 Gold Label 排行榜
   */
  async getGoldLabelLeaderboard(limit: number = 10): Promise<any[]> {
    const discoveries = await prisma.addressDiscovery.groupBy({
      by: ['discovererFrogId'],
      where: { isGoldLabel: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    // 获取青蛙信息
    const frogIds = discoveries.map((d) => d.discovererFrogId);
    const frogs = await prisma.frog.findMany({
      where: { id: { in: frogIds } },
      select: { id: true, name: true, tokenId: true },
    });

    const frogMap = new Map(frogs.map((f) => [f.id, f]));

    return discoveries.map((d) => ({
      frog: frogMap.get(d.discovererFrogId),
      goldLabelCount: d._count.id,
    }));
  }
}

export const explorationFootprintService = new ExplorationFootprintService();
