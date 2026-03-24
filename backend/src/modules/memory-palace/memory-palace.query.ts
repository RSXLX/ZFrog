import { DiaryMood, Prisma, TravelStatus } from '@prisma/client';
import { prisma } from '../../database';
import { AppError } from '../../middlewares/errorHandler';
import { normalizeWalletAddress } from '../identity/nonce.service';

type Tx = Prisma.TransactionClient;

type JsonRecord = Record<string, Prisma.JsonValue>;

interface FrogOwnershipRow {
  id: number;
  tokenId: number;
  name: string;
  ownerAddress: string;
  birthday: Date;
  totalTravels: number;
  status: string;
  xp: number;
  level: number;
}

interface TravelJournal {
  title: string;
  content: string;
  mood: string;
}

export interface MemoryPalaceTimelineItem {
  id: string;
  type: string;
  chainId: number | null;
  txHash: string | null;
  blockNumber: string | null;
  createdAt: string;
  travelId: number | null;
}

export interface MemoryPalaceReadModel {
  id: string;
  frogId: number;
  frog: {
    id: number;
    tokenId: number;
    name: string;
    ownerAddress: string;
    birthday: string;
    totalTravels: number;
    status: string;
    xp: number;
    level: number;
  };
  title: string;
  summary: string;
  journal: TravelJournal;
  souvenir: {
    id: number;
    name: string;
  } | null;
  highlights: string[];
  comments: unknown[];
  timeline: MemoryPalaceTimelineItem[];
  updatedAt: string;
}

const allowedMoods = new Set(['HAPPY', 'CURIOUS', 'SURPRISED', 'PEACEFUL', 'EXCITED', 'SLEEPY']);

const toObject = (value: Prisma.JsonValue | null | undefined): JsonRecord | null => {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return null;
  }
  return value as JsonRecord;
};

const toStringValue = (value: Prisma.JsonValue | null | undefined): string | null => {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
};

const toNumberValue = (value: Prisma.JsonValue | null | undefined): number | null => {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const toStringArray = (value: Prisma.JsonValue | null | undefined): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

const normalizeMood = (mood?: string | DiaryMood | null): string => {
  const upper = mood ? mood.toString().toUpperCase() : 'PEACEFUL';
  return allowedMoods.has(upper) ? upper : 'PEACEFUL';
};

const parseJournalFromTravel = (
  journalContent: string | null,
  diary: string | null,
  diaryMood: DiaryMood | null,
  fallbackTitle: string
): TravelJournal => {
  if (journalContent) {
    try {
      const parsed = JSON.parse(journalContent);
      if (parsed && typeof parsed === 'object' && typeof parsed.content === 'string') {
        return {
          title:
            typeof parsed.title === 'string' && parsed.title.trim()
              ? parsed.title
              : fallbackTitle,
          content: parsed.content,
          mood: normalizeMood(typeof parsed.mood === 'string' ? parsed.mood : diaryMood),
        };
      }
    } catch {
      // keep plain-string fallback.
    }

    return {
      title: fallbackTitle,
      content: journalContent,
      mood: normalizeMood(diaryMood),
    };
  }

  if (diary && diary.trim()) {
    return {
      title: fallbackTitle,
      content: diary,
      mood: normalizeMood(diaryMood),
    };
  }

  return {
    title: fallbackTitle,
    content: '',
    mood: normalizeMood(diaryMood),
  };
};

const parseTimeline = (value: Prisma.JsonValue | null | undefined): MemoryPalaceTimelineItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): MemoryPalaceTimelineItem | null => {
      const row = toObject(item as Prisma.JsonValue);
      if (!row) {
        return null;
      }

      const id = toStringValue(row.id) || '';
      const type = toStringValue(row.type) || '';
      const createdAt = toStringValue(row.createdAt) || '';
      if (!id || !type || !createdAt) {
        return null;
      }

      const chainId = toNumberValue(row.chainId);
      const travelId = toNumberValue(row.travelId);

      return {
        id,
        type,
        chainId,
        txHash: toStringValue(row.txHash),
        blockNumber: toStringValue(row.blockNumber),
        createdAt,
        travelId,
      };
    })
    .filter((item): item is MemoryPalaceTimelineItem => Boolean(item));
};

const getFrogOrThrow = async (db: Prisma.TransactionClient | typeof prisma, frogId: number): Promise<FrogOwnershipRow> => {
  const frog = await db.frog.findUnique({
    where: { id: frogId },
    select: {
      id: true,
      tokenId: true,
      name: true,
      ownerAddress: true,
      birthday: true,
      totalTravels: true,
      status: true,
      xp: true,
      level: true,
    },
  });

  if (!frog) {
    throw new AppError(404, 'Frog not found', 'NOT_FOUND');
  }

  return frog;
};

export class MemoryPalaceQueryService {
  async getByFrogId(frogId: number, walletAddress?: string, options?: { tx?: Tx }): Promise<MemoryPalaceReadModel> {
    const db = options?.tx || prisma;
    const frog = await getFrogOrThrow(db, frogId);
    if (walletAddress) {
      normalizeWalletAddress(walletAddress);
    }

    const [palace, latestTravel] = await Promise.all([
      db.memoryPalace.findUnique({
        where: { frogId },
        select: {
          id: true,
          frogId: true,
          recapText: true,
          timeline: true,
          highlights: true,
          metadata: true,
          updatedAt: true,
        },
      }),
      db.travel.findFirst({
        where: {
          frogId,
          status: TravelStatus.Completed,
        },
        orderBy: {
          completedAt: 'desc',
        },
        select: {
          journalContent: true,
          diary: true,
          diaryMood: true,
          souvenir: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    if (!palace) {
      throw new AppError(404, 'Memory palace not found', 'NOT_FOUND');
    }

    const metadata = toObject(palace.metadata);
    const metadataJournal = toObject(metadata?.journal);
    const metadataSouvenir = toObject(metadata?.souvenir);

    const travelJournal = parseJournalFromTravel(
      latestTravel?.journalContent || null,
      latestTravel?.diary || null,
      latestTravel?.diaryMood || null,
      `${frog.name} 的旅行日志`
    );

    const journal: TravelJournal = {
      title: toStringValue(metadataJournal?.title) || travelJournal.title,
      content: toStringValue(metadataJournal?.content) || travelJournal.content,
      mood: normalizeMood(toStringValue(metadataJournal?.mood) || travelJournal.mood),
    };

    const highlights = toStringArray(palace.highlights);
    const metadataHighlights = toStringArray(metadata?.highlights);

    const souvenirId = toNumberValue(metadataSouvenir?.id) ?? latestTravel?.souvenir?.id ?? null;
    const souvenirName =
      toStringValue(metadataSouvenir?.name) ||
      latestTravel?.souvenir?.name ||
      null;

    return {
      id: palace.id.toString(),
      frogId: palace.frogId,
      frog: {
        id: frog.id,
        tokenId: frog.tokenId,
        name: frog.name,
        ownerAddress: frog.ownerAddress,
        birthday: frog.birthday.toISOString(),
        totalTravels: frog.totalTravels,
        status: frog.status,
        xp: frog.xp,
        level: frog.level,
      },
      title: toStringValue(metadata?.title) || `${frog.name} 的记忆空间`,
      summary:
        palace.recapText ||
        toStringValue(metadata?.summary) ||
        toStringValue(metadataJournal?.content) ||
        `${frog.name} 完成了一次旅行。`,
      journal,
      souvenir:
        souvenirId !== null && souvenirName
          ? {
              id: souvenirId,
              name: souvenirName,
            }
          : null,
      highlights: highlights.length > 0 ? highlights : metadataHighlights,
      comments: [],
      timeline: parseTimeline(palace.timeline),
      updatedAt: palace.updatedAt.toISOString(),
    };
  }
}

export const memoryPalaceQueryService = new MemoryPalaceQueryService();
