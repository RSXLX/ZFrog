import { Prisma } from '@prisma/client';
import { prisma } from '../../database';

type Tx = Prisma.TransactionClient;

export type TravelDomainEventType =
  | 'TravelStarted'
  | 'TravelProgressed'
  | 'TravelCompleted'
  | 'TravelFailed'
  | 'SouvenirMintRequested'
  | 'SouvenirMinted';

export interface TravelDomainEventInput {
  frogId: number;
  travelId: number;
  eventType: TravelDomainEventType;
  payload: Prisma.InputJsonValue;
  requestId?: string;
  source?: string;
}

const createDomainEvent = async (tx: Tx, input: TravelDomainEventInput): Promise<void> => {
  await tx.domainEvent.create({
    data: {
      frogId: input.frogId,
      travelId: input.travelId,
      aggregateType: 'Travel',
      aggregateId: String(input.travelId),
      eventType: input.eventType,
      payload: input.payload,
      requestId: input.requestId,
      source: input.source,
    },
  });
};

class TravelEventService {
  async append(tx: Tx, input: TravelDomainEventInput): Promise<void> {
    await createDomainEvent(tx, input);
  }

  async appendStandalone(input: TravelDomainEventInput): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await createDomainEvent(tx, input);
    });
  }
}

export const travelEventService = new TravelEventService();
