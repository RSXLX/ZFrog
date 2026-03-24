import { Prisma, TravelStatus } from '@prisma/client';
import { prisma } from '../../database';
import { logger } from '../../utils/logger';
import { recapService } from '../../services/ai/journal/recap.service';
import { milestoneMemoryService } from '../../services/ai/memory/milestone-memory.service';

type Tx = Prisma.TransactionClient;

export interface UpsertMemoryPalaceInput {
  travelId: number;
  requestId?: string;
  source?: string;
}

export interface MemoryPalaceWriteModel {
  id: number;
  frogId: number;
  recapText: string | null;
  updatedAt: string;
}

const toWriteModel = (row: { id: number; frogId: number; recapText: string | null; updatedAt: Date }): MemoryPalaceWriteModel => ({
  id: row.id,
  frogId: row.frogId,
  recapText: row.recapText,
  updatedAt: row.updatedAt.toISOString(),
});

const parseJournal = (journalContent?: string | null, diary?: string | null): { title: string; content: string; mood: string } => {
  if (journalContent) {
    try {
      const parsed = JSON.parse(journalContent);
      if (parsed && typeof parsed === 'object' && typeof parsed.content === 'string') {
        return {
          title: typeof parsed.title === 'string' ? parsed.title : '旅行日志',
          content: parsed.content,
          mood: typeof parsed.mood === 'string' ? parsed.mood : 'PEACEFUL',
        };
      }
    } catch {
      // Legacy plain string fallback.
    }

    return {
      title: '旅行日志',
      content: journalContent,
      mood: 'PEACEFUL',
    };
  }

  if (diary) {
    return {
      title: '旅行日志',
      content: diary,
      mood: 'PEACEFUL',
    };
  }

  return {
    title: '旅行日志',
    content: '',
    mood: 'PEACEFUL',
  };
};

export class MemoryPalaceService {
  async upsertFromTravel(
    input: UpsertMemoryPalaceInput,
    options?: { tx?: Tx }
  ): Promise<MemoryPalaceWriteModel | null> {
    const db = options?.tx || prisma;
    const travel = await db.travel.findUnique({
      where: { id: input.travelId },
      include: {
        frog: {
          select: {
            id: true,
            name: true,
            tokenId: true,
            ownerAddress: true,
          },
        },
        souvenir: {
          select: {
            id: true,
            name: true,
          },
        },
        discoveries: {
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: {
            title: true,
            description: true,
          },
        },
      },
    });

    if (!travel) {
      logger.warn('[MemoryPalaceService] Skip upsert, travel not found', { travelId: input.travelId });
      return null;
    }

    if (travel.status !== TravelStatus.Completed) {
      return null;
    }

    const journal = parseJournal(travel.journalContent, travel.diary);
    const recap = recapService.generateRecap({
      frogName: travel.frog.name,
      targetChain: travel.targetChain,
      chainId: travel.chainId,
      journalTitle: journal.title,
      journalContent: JSON.stringify(journal),
      mood: journal.mood,
      discoveries: travel.discoveries,
      souvenirName: travel.souvenir?.name || null,
      completedAt: travel.completedAt || null,
    });

    const timeline = await milestoneMemoryService.listTimelineByFrogId(travel.frog.id, 20, { tx: db });
    const existing = await db.memoryPalace.findUnique({
      where: { frogId: travel.frog.id },
      select: { id: true },
    });

    const metadata: Prisma.InputJsonValue = {
      frogName: travel.frog.name,
      tokenId: travel.frog.tokenId,
      walletAddress: travel.frog.ownerAddress.toLowerCase(),
      lastTravelId: travel.id,
      generatedAt: new Date().toISOString(),
      title: recap.title,
      mood: recap.mood,
      journal: recap.journal,
      souvenir: travel.souvenir
        ? {
            id: travel.souvenir.id,
            name: travel.souvenir.name,
          }
        : null,
      highlights: recap.highlights,
    };

    const palace = await db.memoryPalace.upsert({
      where: { frogId: travel.frog.id },
      update: {
        recapText: recap.summary,
        timeline: timeline as unknown as Prisma.InputJsonValue,
        highlights: recap.highlights as unknown as Prisma.InputJsonValue,
        metadata,
      },
      create: {
        frogId: travel.frog.id,
        recapText: recap.summary,
        timeline: timeline as unknown as Prisma.InputJsonValue,
        highlights: recap.highlights as unknown as Prisma.InputJsonValue,
        metadata,
      },
    });

    await db.domainEvent.create({
      data: {
        frogId: travel.frog.id,
        travelId: travel.id,
        aggregateType: 'MemoryPalace',
        aggregateId: String(palace.id),
        eventType: 'TravelRecapGenerated',
        payload: {
          memoryPalaceId: palace.id,
          title: recap.title,
          summary: recap.summary,
          highlights: recap.highlights,
        },
        requestId: input.requestId,
        source: input.source || 'memory-palace.service',
      },
    });

    await db.domainEvent.create({
      data: {
        frogId: travel.frog.id,
        travelId: travel.id,
        aggregateType: 'MemoryPalace',
        aggregateId: String(palace.id),
        eventType: existing ? 'MemoryPalaceUpdated' : 'MemoryPalaceCreated',
        payload: {
          memoryPalaceId: palace.id,
          frogId: travel.frog.id,
          lastTravelId: travel.id,
        },
        requestId: input.requestId,
        source: input.source || 'memory-palace.service',
      },
    });

    return toWriteModel(palace);
  }
}

export const memoryPalaceService = new MemoryPalaceService();
