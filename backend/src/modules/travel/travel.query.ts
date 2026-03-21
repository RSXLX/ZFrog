import { Prisma } from '@prisma/client';
import { prisma } from '../../database';
import { AppError } from '../../middlewares/errorHandler';
import { normalizeWalletAddress } from '../identity/nonce.service';
import { toTravelMachineState } from './travel-state-machine';

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
