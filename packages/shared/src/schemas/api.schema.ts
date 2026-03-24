import { z } from 'zod';

export const apiMetaSchema = z
  .object({
    requestId: z.string().min(1).optional(),
    timestamp: z.string().datetime().optional(),
  })
  .catchall(z.unknown());

export const apiErrorBodySchema = z.object({
  code: z.string().min(1).optional(),
  message: z.string().min(1),
  details: z.unknown().optional(),
});

export const createApiSuccessEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
    meta: apiMetaSchema.optional(),
  });

export const apiFailureEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.union([apiErrorBodySchema, z.string().min(1)]),
  message: z.string().optional(),
  meta: apiMetaSchema.optional(),
});

export const createApiEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.union([createApiSuccessEnvelopeSchema(dataSchema), apiFailureEnvelopeSchema]);
