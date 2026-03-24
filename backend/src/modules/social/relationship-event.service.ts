import { Prisma } from '@prisma/client';
import { prisma } from '../../database';


type Tx = Prisma.TransactionClient;

export interface RecordRelationshipEventInput {
  frogId: number;
  actorFrogId?: number | null;
  counterpartyFrogId?: number | null;
  eventType: string;
  payload?: Prisma.InputJsonValue;
  requestId?: string;
  source?: string;
}

export class RelationshipEventService {
  async record(tx: Tx, input: RecordRelationshipEventInput): Promise<void> {
    await tx.relationshipEvent.create({
      data: {
        frogId: input.frogId,
        actorFrogId: input.actorFrogId ?? null,
        counterpartyFrogId: input.counterpartyFrogId ?? null,
        eventType: input.eventType,
        payload: input.payload ?? Prisma.JsonNull,
      },
    });

    await tx.domainEvent.create({
      data: {
        frogId: input.frogId,
        aggregateType: 'Social',
        aggregateId: String(input.frogId),
        eventType: 'RelationshipMilestoneRecorded',
        payload: {
          relationshipEventType: input.eventType,
          actorFrogId: input.actorFrogId ?? null,
          counterpartyFrogId: input.counterpartyFrogId ?? null,
          payload: input.payload ?? null,
        },
        requestId: input.requestId,
        source: input.source || 'relationship-event.service',
      },
    });
  }

  async recordStandalone(input: RecordRelationshipEventInput): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await this.record(tx, input);
    });
  }
}

export const relationshipEventService = new RelationshipEventService();
