import { Prisma } from '@prisma/client';
import { prisma } from '../../../database';

type Tx = Prisma.TransactionClient;

export interface MilestoneTimelineItem {
  id: string;
  type: string;
  chainId: number | null;
  txHash: string | null;
  blockNumber: string | null;
  createdAt: string;
  travelId: number | null;
}

export class MilestoneMemoryService {
  async listTimelineByFrogId(
    frogId: number,
    limit = 20,
    options?: { tx?: Tx }
  ): Promise<MilestoneTimelineItem[]> {
    const db = options?.tx || prisma;
    const rows = await db.onchainMilestone.findMany({
      where: { frogId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        milestoneType: true,
        chainId: true,
        txHash: true,
        blockNumber: true,
        createdAt: true,
        travelId: true,
      },
    });

    return rows.map((row) => ({
      id: row.id.toString(),
      type: row.milestoneType,
      chainId: row.chainId,
      txHash: row.txHash,
      blockNumber: row.blockNumber?.toString() || null,
      createdAt: row.createdAt.toISOString(),
      travelId: row.travelId ?? null,
    }));
  }
}

export const milestoneMemoryService = new MilestoneMemoryService();
