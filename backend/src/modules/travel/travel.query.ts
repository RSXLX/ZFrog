import { Prisma } from '@prisma/client';
import { prisma } from '../../database';
import { AppError } from '../../middlewares/errorHandler';
import { normalizeWalletAddress } from '../identity/nonce.service';
import { toTravelMachineState } from './travel-state-machine';
import { travelQueryService } from '../../services/travel/travel-query.service';
import { rescueService } from '../../services/travel/rescue.service';
import { travelFeedService } from '../../services/travel/travel-feed.service';
import { omniTravelService } from '../../services/omni-travel.service';

type TravelWithRelations = Prisma.TravelGetPayload<{
  include: {
    frog: {
      select: {
        id: true;
        tokenId: true;
        name: true;
        ownerAddress: true;
      };
    };
    souvenir: {
      select: {
        id: true;
        tokenId: true;
        name: true;
        rarity: true;
      };
    };
    discoveries: {
      orderBy: {
        createdAt: 'desc';
      };
      take: 50;
      select: {
        id: true;
        type: true;
        title: true;
        description: true;
        rarity: true;
        chainType: true;
        blockNumber: true;
        metadata: true;
        createdAt: true;
      };
    };
    statusMessages: {
      orderBy: {
        createdAt: 'desc';
      };
      take: 50;
      select: {
        id: true;
        message: true;
        messageType: true;
        createdAt: true;
      };
    };
    groupTravel: {
      include: {
        companion: {
          select: {
            id: true;
            tokenId: true;
            name: true;
          };
        };
      };
    };
  };
}>;

interface TravelQueryInput {
  travelId: number;
  walletAddress?: string;
}

interface ParsedJournal {
  title: string;
  content: string;
  mood: string;
  highlights: string[];
}

export interface TravelReadModel {
  travelId: number;
  frogId: number;
  tokenId: number;
  frogName: string;
  walletAddress: string;
  status: string;
  currentStage: string;
  progress: number;
  travelType: 'random' | 'specific' | 'cross_chain';
  targetWallet: string;
  targetChain: string;
  chainId: number;
  duration: number;
  startTime: string;
  endTime: string;
  completedAt: string | null;
  updatedAt: string;
  souvenirId: number | null;
  souvenir: {
    id: number;
    tokenId: number;
    name: string;
    rarity: string;
  } | null;
  journal: ParsedJournal | null;
  discoveries: Array<{
    id: number;
    type: string;
    title: string;
    description: string;
    rarity: number;
    chainType: string;
    blockNumber: string | null;
    metadata: unknown;
    createdAt: string;
  }>;
  statusMessages: Array<{
    id: number;
    message: string;
    type: string;
    createdAt: string;
  }>;
  companion: {
    frogId: number;
    tokenId: number;
    name: string;
  } | null;
  errorMessage: string | null;
}

export interface TravelHistoryReadModel {
  travels: unknown[];
  total: number;
  hasMore: boolean;
}

export interface TravelStatsReadModel {
  totalTrips: number;
  bscTrips: number;
  ethTrips: number;
  zetaTrips: number;
  totalDiscoveries: number;
  rareFinds: number;
  totalFrogs: number;
  recentTravel: unknown | null;
}

export interface CrossChainDiscoveriesReadModel {
  discoveries: Array<{
    id: number;
    type: string;
    title: string;
    description: string;
    rarity: number;
    blockNumber: string | null;
    createdAt: string;
  }>;
  onChainStats: {
    exploredBlock: number | null;
    gasUsed: string | null;
    targetChain: string;
    exploredAddress: string;
  };
  summary: {
    total: number;
    byType: Record<string, number>;
    byRarity: Record<string, number>;
  };
}

const parseJournal = (raw: string | null): ParsedJournal | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed && typeof parsed.content === 'string') {
      return {
        title: typeof parsed.title === 'string' ? parsed.title : '旅行回顾',
        content: parsed.content,
        mood: typeof parsed.mood === 'string' ? parsed.mood : 'calm',
        highlights: Array.isArray(parsed.highlights)
          ? parsed.highlights.filter((item: unknown): item is string => typeof item === 'string')
          : [],
      };
    }
  } catch {
    // Keep legacy plain string fallback below.
  }

  return {
    title: '旅行回顾',
    content: raw,
    mood: 'calm',
    highlights: [],
  };
};

const ensureOwner = (travel: TravelWithRelations, walletAddress?: string): void => {
  if (!walletAddress) {
    return;
  }

  const normalized = normalizeWalletAddress(walletAddress);
  if (travel.frog.ownerAddress.toLowerCase() !== normalized) {
    throw new AppError(403, 'You are not the owner of this travel', 'FORBIDDEN');
  }
};

const toReadModel = (travel: TravelWithRelations): TravelReadModel => {
  const state = toTravelMachineState({
    status: travel.status,
    currentStage: travel.currentStage,
    progress: travel.progress,
  });

  return {
    travelId: travel.id,
    frogId: travel.frogId,
    tokenId: travel.frog.tokenId,
    frogName: travel.frog.name,
    walletAddress: travel.frog.ownerAddress.toLowerCase(),
    status: state.status,
    currentStage: state.currentStage,
    progress: state.progress,
    travelType: travel.isCrossChain ? 'cross_chain' : travel.isRandom ? 'random' : 'specific',
    targetWallet: travel.targetWallet,
    targetChain: travel.targetChain,
    chainId: travel.chainId,
    duration: travel.duration,
    startTime: travel.startTime.toISOString(),
    endTime: travel.endTime.toISOString(),
    completedAt: travel.completedAt?.toISOString() || null,
    updatedAt: travel.updatedAt.toISOString(),
    souvenirId: travel.souvenirId ?? null,
    souvenir: travel.souvenir
      ? {
          id: travel.souvenir.id,
          tokenId: travel.souvenir.tokenId,
          name: travel.souvenir.name,
          rarity: travel.souvenir.rarity,
        }
      : null,
    journal: parseJournal(travel.journalContent),
    discoveries: travel.discoveries.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
      rarity: item.rarity,
      chainType: item.chainType,
      blockNumber: item.blockNumber?.toString() || null,
      metadata: item.metadata,
      createdAt: item.createdAt.toISOString(),
    })),
    statusMessages: travel.statusMessages.map((item) => ({
      id: item.id,
      message: item.message,
      type: item.messageType,
      createdAt: item.createdAt.toISOString(),
    })),
    companion: travel.groupTravel
      ? {
          frogId: travel.groupTravel.companion.id,
          tokenId: travel.groupTravel.companion.tokenId,
          name: travel.groupTravel.companion.name,
        }
      : null,
    errorMessage: travel.errorMessage || null,
  };
};

export class TravelQueryServiceV1 {
  getSupportedCrossChains(): { chainId: number; name: string; chainType: string }[] {
    return omniTravelService.getSupportedChains();
  }

  async canStartCrossChainTravel(tokenId: number, targetChainId: number): Promise<unknown> {
    return omniTravelService.canStartCrossChainTravel(tokenId, targetChainId);
  }

  async getCrossChainStatus(tokenId: number): Promise<{
    onChain: unknown;
    database: {
      id: number;
      status: string;
      crossChainStatus: string | null;
      progress: number;
      targetChain: string;
    } | null;
  }> {
    const onChain = await omniTravelService.getCrossChainTravelStatus(tokenId);
    const database = await prisma.travel.findFirst({
      where: {
        frog: { tokenId },
        isCrossChain: true,
        status: { in: ['Active', 'Processing'] },
      },
      select: {
        id: true,
        status: true,
        crossChainStatus: true,
        progress: true,
        targetChain: true,
      },
    });

    return {
      onChain,
      database: database
        ? {
            id: database.id,
            status: database.status,
            crossChainStatus: database.crossChainStatus,
            progress: database.progress,
            targetChain: database.targetChain,
          }
        : null,
    };
  }

  async getCrossChainVisitingStatus(tokenId: number, targetChainId: number): Promise<unknown> {
    return omniTravelService.checkVisitingFrogOnChain(tokenId, targetChainId);
  }

  async getActiveCrossChainTravels(): Promise<
    Array<{
      id: number;
      frogTokenId: number;
      frogName: string;
      targetChain: string;
      crossChainStatus: string | null;
      progress: number;
      startTime: Date;
      endTime: Date;
    }>
  > {
    const travels = await omniTravelService.getActiveCrossChainTravels();
    return travels.map((t) => ({
      id: t.id,
      frogTokenId: t.frog.tokenId,
      frogName: t.frog.name,
      targetChain: t.targetChain,
      crossChainStatus: t.crossChainStatus,
      progress: t.progress,
      startTime: t.startTime,
      endTime: t.endTime,
    }));
  }

  async getCrossChainDiscoveries(travelId: number): Promise<CrossChainDiscoveriesReadModel> {
    const travel = await prisma.travel.findUnique({
      where: { id: travelId },
      include: {
        discoveries: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!travel) {
      throw new AppError(404, 'Travel not found', 'NOT_FOUND');
    }

    let gasUsed: string | null = null;
    let exploredBlock = travel.exploredBlock ? Number(travel.exploredBlock) : null;

    if (travel.crossChainMessageId) {
      const crossChainMessage = await prisma.crossChainMessage.findUnique({
        where: { messageId: travel.crossChainMessageId },
      });
      if (crossChainMessage?.gasUsed) {
        gasUsed = crossChainMessage.gasUsed;
      }
    }

    if (!exploredBlock) {
      const latestInteraction = await prisma.travelInteraction.findFirst({
        where: { travelId: travel.id },
        orderBy: { createdAt: 'desc' },
      });
      if (latestInteraction?.blockNumber) {
        exploredBlock = Number(latestInteraction.blockNumber);
      }
    }

    const discoveries = travel.discoveries.map((d) => ({
      id: d.id,
      type: d.type,
      title: d.title,
      description: d.description,
      rarity: d.rarity,
      blockNumber: d.blockNumber?.toString() || null,
      createdAt: d.createdAt.toISOString(),
    }));

    return {
      discoveries,
      onChainStats: {
        exploredBlock,
        gasUsed: gasUsed || null,
        targetChain: travel.targetChain,
        exploredAddress: ((travel.exploredSnapshot as any)?.address as string) || travel.targetWallet,
      },
      summary: {
        total: discoveries.length,
        byType: discoveries.reduce((acc, d) => {
          acc[d.type] = (acc[d.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byRarity: discoveries.reduce((acc, d) => {
          const key = String(d.rarity);
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
    };
  }

  async getLegacyHistory(params: {
    walletAddress: string;
    frogTokenId?: number;
    limit?: number;
    offset?: number;
  }): Promise<TravelHistoryReadModel> {
    const result = await travelQueryService.getTravelHistory({
      address: normalizeWalletAddress(params.walletAddress),
      frogId: params.frogTokenId,
      limit: params.limit,
      offset: params.offset,
    });
    return {
      travels: result.travels,
      total: result.total,
      hasMore: result.hasMore,
    };
  }

  async getLegacyStats(params: {
    walletAddress: string;
    frogTokenId?: number;
  }): Promise<TravelStatsReadModel> {
    const stats = await travelQueryService.getTravelStats(
      normalizeWalletAddress(params.walletAddress),
      params.frogTokenId
    );
    return {
      totalTrips: stats.totalTrips,
      bscTrips: stats.bscTrips,
      ethTrips: stats.ethTrips,
      zetaTrips: stats.zetaTrips,
      totalDiscoveries: stats.totalDiscoveries,
      rareFinds: stats.rareFinds,
      totalFrogs: stats.totalFrogs,
      recentTravel: stats.recentTravel,
    };
  }

  async getLegacyTravelsByTokenId(frogTokenId: number): Promise<unknown[]> {
    const frog = await prisma.frog.findUnique({
      where: { tokenId: frogTokenId },
      select: { ownerAddress: true },
    });

    if (!frog) {
      throw new AppError(404, 'Frog not found', 'NOT_FOUND');
    }

    const history = await travelQueryService.getTravelHistory({
      address: frog.ownerAddress,
      frogId: frogTokenId,
      limit: 200,
      offset: 0,
    });
    return history.travels;
  }

  async getLegacyActiveTravel(frogTokenId: number): Promise<unknown | null> {
    return travelQueryService.getActiveTravel(frogTokenId);
  }

  async getGroupTravelByTravelId(travelId: number): Promise<unknown> {
    const groupTravel = await prisma.groupTravel.findUnique({
      where: { travelId },
      include: {
        leader: true,
        companion: true,
        travel: true,
      },
    });

    if (!groupTravel) {
      throw new AppError(404, 'Group travel not found', 'NOT_FOUND');
    }
    return groupTravel;
  }

  async getPublicRescueRequests(limit = 20): Promise<unknown[]> {
    return rescueService.getPublicRequests(limit);
  }

  async getFriendRescueRequests(frogId: number): Promise<unknown[]> {
    return rescueService.getFriendRequests(frogId);
  }

  async getTravelFeeds(travelId: number): Promise<unknown[]> {
    return travelFeedService.getFeedHistory(travelId);
  }

  async getTravel(input: TravelQueryInput): Promise<TravelReadModel> {
    const travel = await prisma.travel.findUnique({
      where: { id: input.travelId },
      include: {
        frog: {
          select: {
            id: true,
            tokenId: true,
            name: true,
            ownerAddress: true,
          },
        },
        souvenir: {
          select: {
            id: true,
            tokenId: true,
            name: true,
            rarity: true,
          },
        },
        discoveries: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 50,
          select: {
            id: true,
            type: true,
            title: true,
            description: true,
            rarity: true,
            chainType: true,
            blockNumber: true,
            metadata: true,
            createdAt: true,
          },
        },
        statusMessages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 50,
          select: {
            id: true,
            message: true,
            messageType: true,
            createdAt: true,
          },
        },
        groupTravel: {
          include: {
            companion: {
              select: {
                id: true,
                tokenId: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!travel) {
      throw new AppError(404, 'Travel not found', 'NOT_FOUND');
    }

    ensureOwner(travel, input.walletAddress);
    return toReadModel(travel);
  }
}

export const travelQueryServiceV1 = new TravelQueryServiceV1();
