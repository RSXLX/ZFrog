import { Prisma } from '@prisma/client';
import { prisma } from '../../database';
import { relationshipMemoryQueryService } from './relationship-memory.query';

export interface RebuildMemorySummaryInput {
  frogId: number;
  summaryType?: string;
  requestId?: string;
  source?: string;
}

export interface MemorySummaryReadModel {
  id: number;
  frogId: number;
  summaryType: string;
  summaryText: string;
  generatedAt: string;
  updatedAt: string;
}

const DEFAULT_SUMMARY_TYPE = 'RELATIONSHIP_V1';

const toReadModel = (row: {
  id: number;
  frogId: number;
  summaryType: string;
  summaryText: string;
  generatedAt: Date;
  updatedAt: Date;
}): MemorySummaryReadModel => ({
  id: row.id,
  frogId: row.frogId,
  summaryType: row.summaryType,
  summaryText: row.summaryText,
  generatedAt: row.generatedAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const buildSummaryText = (input: {
  frogName: string;
  relatedFrogCount: number;
  confirmedAttestationCount: number;
  queuedAttestationCount: number;
  failedAttestationCount: number;
  relationshipEventCount: number;
  topAttestationTypes: string[];
  relatedFrogNames: string[];
}): string => {
  const topTypes =
    input.topAttestationTypes.length > 0 ? input.topAttestationTypes.join('、') : '暂无主要关系标签';
  const peers =
    input.relatedFrogNames.length > 0 ? input.relatedFrogNames.join('、') : '暂无稳定关系对象';

  return [
    `${input.frogName} 当前关联 ${input.relatedFrogCount} 位伙伴（${peers}）。`,
    `关系事件累计 ${input.relationshipEventCount} 条；证明状态：已确认 ${input.confirmedAttestationCount}、待确认 ${input.queuedAttestationCount}、失败 ${input.failedAttestationCount}。`,
    `主要关系标签：${topTypes}。`,
  ].join(' ');
};

export class MemorySummaryService {
  async rebuildForFrog(input: RebuildMemorySummaryInput): Promise<MemorySummaryReadModel> {
    const summaryType = (input.summaryType || DEFAULT_SUMMARY_TYPE).trim() || DEFAULT_SUMMARY_TYPE;
    const memory = await relationshipMemoryQueryService.getByFrogId({
      frogId: input.frogId,
      timelineLimit: 30,
    });

    const topAttestationTypes = memory.attestationTypeStats.slice(0, 3).map((item) => item.attestationType);
    const relatedFrogNames = memory.relatedFrogs.slice(0, 3).map((frog) => frog.name);
    const summaryText = buildSummaryText({
      frogName: memory.frog.name,
      relatedFrogCount: memory.summary.relatedFrogCount,
      confirmedAttestationCount: memory.summary.confirmedAttestationCount,
      queuedAttestationCount: memory.summary.queuedAttestationCount,
      failedAttestationCount: memory.summary.failedAttestationCount,
      relationshipEventCount: memory.summary.relationshipEventCount,
      topAttestationTypes,
      relatedFrogNames,
    });

    const existing = await prisma.memorySummary.findUnique({
      where: {
        frogId_summaryType: {
          frogId: memory.frog.id,
          summaryType,
        },
      },
      select: { id: true },
    });

    const generatedAt = new Date();
    const persisted = await prisma.memorySummary.upsert({
      where: {
        frogId_summaryType: {
          frogId: memory.frog.id,
          summaryType,
        },
      },
      update: {
        summaryText,
        generatedAt,
        sourceData: {
          generatedAt: memory.generatedAt,
          summary: memory.summary,
          topAttestationTypes,
          relatedFrogIds: memory.relatedFrogs.map((frog) => frog.id),
        } as Prisma.InputJsonValue,
      },
      create: {
        frogId: memory.frog.id,
        summaryType,
        summaryText,
        generatedAt,
        sourceData: {
          generatedAt: memory.generatedAt,
          summary: memory.summary,
          topAttestationTypes,
          relatedFrogIds: memory.relatedFrogs.map((frog) => frog.id),
        } as Prisma.InputJsonValue,
      },
    });

    await prisma.domainEvent.create({
      data: {
        frogId: memory.frog.id,
        aggregateType: 'MemorySummary',
        aggregateId: String(persisted.id),
        eventType: existing ? 'MemorySummaryUpdated' : 'MemorySummaryCreated',
        payload: {
          memorySummaryId: persisted.id,
          frogId: memory.frog.id,
          summaryType,
          generatedAt: generatedAt.toISOString(),
        } as Prisma.InputJsonValue,
        requestId: input.requestId,
        source: input.source || 'memory-summary.service',
      },
    });

    return toReadModel(persisted);
  }
}

export const memorySummaryService = new MemorySummaryService();
