import { z } from 'zod';
import {
  V3_COUNCIL_BRIEF_CHANNELS,
  V3_COUNCIL_BRIEF_DELIVERY_STATUSES,
  V3_COUNCIL_SUGGESTION_DECISIONS,
  V3_COUNCIL_SUGGESTION_RISK_LEVELS,
  V3_COUNCIL_SUGGESTION_STATUSES,
} from '../types/council';

export const v3CouncilSuggestionStatusSchema = z.enum(V3_COUNCIL_SUGGESTION_STATUSES);
export const v3CouncilSuggestionDecisionSchema = z.enum(V3_COUNCIL_SUGGESTION_DECISIONS);
export const v3CouncilSuggestionRiskLevelSchema = z.enum(V3_COUNCIL_SUGGESTION_RISK_LEVELS);
export const v3CouncilBriefChannelSchema = z.enum(V3_COUNCIL_BRIEF_CHANNELS);
export const v3CouncilBriefDeliveryStatusSchema = z.enum(V3_COUNCIL_BRIEF_DELIVERY_STATUSES);

export const v3CouncilSuggestionDataSourceSchema = z.object({
  source: z.string().min(1),
  referenceId: z.string().nullable(),
  freshness: z.string().nullable(),
});

export const v3CouncilSuggestionActionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  detail: z.string().min(1),
});

export const v3CouncilSuggestionReadModelSchema = z.object({
  id: z.string().min(1),
  runId: z.string().min(1),
  title: z.string().min(1),
  focus: z.string().min(1),
  objective: z.string().nullable(),
  rationale: z.string().min(1),
  risk: z.object({
    level: v3CouncilSuggestionRiskLevelSchema,
    reason: z.string().min(1),
  }),
  dataSources: z.array(v3CouncilSuggestionDataSourceSchema).min(1),
  suggestedActions: z.array(v3CouncilSuggestionActionSchema).min(1),
  status: v3CouncilSuggestionStatusSchema,
  trace: z.object({
    traceId: z.string().min(1),
    promptKitVersion: z.string().min(1),
    model: z.string().min(1),
    fingerprint: z.string().min(1),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  response: z.object({
    decision: v3CouncilSuggestionDecisionSchema.nullable(),
    note: z.string().nullable(),
    respondedAt: z.string().datetime().nullable(),
    respondedByActor: z.string().nullable(),
  }),
  audit: z.object({
    createdByAppId: z.string().min(1),
    createdByKeyId: z.string().min(1),
    createdByActor: z.string().min(1),
    requestId: z.string().nullable(),
    updatedByActor: z.string().min(1),
  }),
});

export const v3CouncilSuggestionListReadModelSchema = z.object({
  total: z.number().int().nonnegative(),
  items: z.array(v3CouncilSuggestionReadModelSchema),
});

export const v3CouncilBriefHighlightSchema = z.object({
  suggestionId: z.string().min(1),
  title: z.string().min(1),
  focus: z.string().min(1),
  status: v3CouncilSuggestionStatusSchema,
  riskLevel: v3CouncilSuggestionRiskLevelSchema,
  decision: v3CouncilSuggestionDecisionSchema.nullable(),
  updatedAt: z.string().datetime(),
});

export const v3CouncilBriefPreferencesReadModelSchema = z.object({
  enabled: z.boolean(),
  throttleMs: z.number().int().min(60_000).max(86_400_000),
  channels: z.object({
    desktop: z.boolean(),
    mobileLite: z.boolean(),
  }),
  updatedAt: z.string().datetime(),
  updatedByActor: z.string().min(1),
  requestId: z.string().nullable(),
});

export const v3CouncilBriefReadModelSchema = z.object({
  id: z.string().min(1),
  generatedAt: z.string().datetime(),
  window: z.object({
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
  }),
  summary: z.string().min(1),
  metrics: z.object({
    total: z.number().int().nonnegative(),
    open: z.number().int().nonnegative(),
    accepted: z.number().int().nonnegative(),
    rejected: z.number().int().nonnegative(),
    deferred: z.number().int().nonnegative(),
    resolved: z.number().int().nonnegative(),
  }),
  highlights: z.array(v3CouncilBriefHighlightSchema),
  delivery: z.object({
    channel: v3CouncilBriefChannelSchema,
    status: v3CouncilBriefDeliveryStatusSchema,
    shouldNotify: z.boolean(),
    notificationsEnabled: z.boolean(),
    throttleMs: z.number().int().min(60_000).max(86_400_000),
    lastDeliveredAt: z.string().datetime().nullable(),
    nextAllowedAt: z.string().datetime().nullable(),
  }),
});

export const v3CouncilCreateSuggestionPayloadSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    focus: z.string().trim().min(1).max(160),
    objective: z.string().trim().max(280).optional(),
    rationale: z.string().trim().max(500).optional(),
    riskLevel: v3CouncilSuggestionRiskLevelSchema.optional(),
    dataSources: z
      .array(
        z
          .object({
            source: z.string().trim().min(1).max(80),
            referenceId: z.string().trim().max(120).optional(),
            freshness: z.string().trim().max(80).optional(),
          })
          .strict()
      )
      .min(1)
      .max(8)
      .optional(),
    suggestedActions: z
      .array(
        z
          .object({
            label: z.string().trim().min(1).max(80),
            detail: z.string().trim().max(240).optional(),
          })
          .strict()
      )
      .min(1)
      .max(5)
      .optional(),
  })
  .strict();

export const v3CouncilRespondSuggestionPayloadSchema = z
  .object({
    decision: v3CouncilSuggestionDecisionSchema,
    note: z.string().trim().max(280).optional(),
  })
  .strict();

export const v3CouncilUpdateBriefPreferencesPayloadSchema = z
  .object({
    enabled: z.boolean().optional(),
    throttleMs: z.number().int().min(60_000).max(86_400_000).optional(),
    channels: z
      .object({
        desktop: z.boolean().optional(),
        mobileLite: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine(
    (payload) =>
      typeof payload.enabled === 'boolean' ||
      typeof payload.throttleMs === 'number' ||
      typeof payload.channels === 'object',
    {
      message: 'at least one preference field must be provided',
      path: [],
    }
  );
