import { z } from 'zod';

export const domainEventSchema = z.object({
  id: z.string().min(1).optional(),
  eventName: z.string().min(1),
  eventVersion: z.number().int().positive(),
  source: z.string().min(1),
  requestId: z.string().min(1).optional(),
  correlationId: z.string().min(1).optional(),
  occurredAt: z.string().datetime(),
  payload: z.unknown(),
});
