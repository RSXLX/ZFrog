import { Prisma } from '@prisma/client';
import { prisma } from '../../database';

export interface OnchainMilestoneReadModel {
  id: string;
  frogId: number;
  travelId: number | null;
  type: string;
  milestoneType: string;
  chainId: number | null;
  txHash: string | null;
  blockNumber: string | null;
  payload: unknown;
  createdAt: string;
}

export interface OnchainMilestoneSummary {
  total: number;
  latestAt: string | null;
}

export interface RecordOnchainMilestoneInput {
  frogId: number;
  travelId?: number | null;
  milestoneType: string;
  chainId?: number | null;
  txHash?: string | null;
  blockNumber?: bigint | number | null;
  payload?: Prisma.InputJsonValue | null;
}

const toReadModel = (row: {
  id: bigint;
  frogId: number;
  travelId: number | null;
  milestoneType: string;
  chainId: number | null;
  txHash: string | null;
  blockNumber: bigint | null;
  payload: Prisma.JsonValue | null;
  createdAt: Date;
}): OnchainMilestoneReadModel => ({
  id: row.id.toString(),
  frogId: row.frogId,
  travelId: row.travelId,
  type: row.milestoneType.toLowerCase(),
  milestoneType: row.milestoneType,
  chainId: row.chainId,
  txHash: row.txHash,
  blockNumber: row.blockNumber?.toString() || null,
  payload: row.payload,
  createdAt: row.createdAt.toISOString(),
});

export class OnchainMilestoneService {
  async record(input: RecordOnchainMilestoneInput): Promise<OnchainMilestoneReadModel> {
    const created = await prisma.onchainMilestone.create({
      data: {
        frogId: input.frogId,
        travelId: input.travelId ?? null,
        milestoneType: input.milestoneType,
        chainId: input.chainId ?? null,
        txHash: input.txHash ?? null,
        blockNumber:
          typeof input.blockNumber === 'number'
            ? BigInt(input.blockNumber)
            : input.blockNumber ?? null,
        payload: input.payload ?? Prisma.JsonNull,
      },
    });

    return toReadModel(created);
  }

  async listByFrogId(frogId: number, limit = 100): Promise<OnchainMilestoneReadModel[]> {
    const milestones = await prisma.onchainMilestone.findMany({
      where: { frogId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return milestones.map(toReadModel);
  }

  async getSummaryByFrogId(frogId: number): Promise<OnchainMilestoneSummary> {
    const [total, latest] = await Promise.all([
      prisma.onchainMilestone.count({ where: { frogId } }),
      prisma.onchainMilestone.findFirst({
        where: { frogId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    return {
      total,
      latestAt: latest?.createdAt.toISOString() || null,
    };
  }
}

export const onchainMilestoneService = new OnchainMilestoneService();
