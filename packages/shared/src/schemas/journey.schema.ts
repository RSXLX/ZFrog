import { z } from 'zod';
import {
  V3_JOURNEY_INCIDENT_DECISIONS,
  V3_JOURNEY_INCIDENT_MEMORY_IMPORTANCE,
  V3_JOURNEY_INCIDENT_OUTCOMES,
  V3_JOURNEY_INCIDENT_STATUSES,
  V3_JOURNEY_INCIDENT_TEMPLATES,
  V3_JOURNEY_MILESTONE_CANDIDATE_TYPES,
  V3_JOURNEY_MEMBER_ROLES,
  V3_JOURNEY_REWARD_PREVIEW_STATUSES,
  V3_JOURNEY_RELIC_RARITIES,
  V3_JOURNEY_RELIC_STATUSES,
  V3_JOURNEY_RISK_LEVELS,
  V3_JOURNEY_STATUSES,
  V3_JOURNEY_STEP_SETTLE_RESULTS,
  V3_JOURNEY_STEP_STATUSES,
  V3_JOURNEY_WORLD_NODE_STATUSES,
} from '../types/journey';

export const v3JourneyStatusSchema = z.enum(V3_JOURNEY_STATUSES);
export const v3JourneyStepStatusSchema = z.enum(V3_JOURNEY_STEP_STATUSES);
export const v3JourneyStepSettleResultSchema = z.enum(V3_JOURNEY_STEP_SETTLE_RESULTS);
export const v3JourneyRiskLevelSchema = z.enum(V3_JOURNEY_RISK_LEVELS);
export const v3JourneyMemberRoleSchema = z.enum(V3_JOURNEY_MEMBER_ROLES);
export const v3JourneyRewardPreviewStatusSchema = z.enum(V3_JOURNEY_REWARD_PREVIEW_STATUSES);
export const v3JourneyWorldNodeStatusSchema = z.enum(V3_JOURNEY_WORLD_NODE_STATUSES);
export const v3JourneyRelicStatusSchema = z.enum(V3_JOURNEY_RELIC_STATUSES);
export const v3JourneyRelicRaritySchema = z.enum(V3_JOURNEY_RELIC_RARITIES);
export const v3JourneyMilestoneCandidateTypeSchema = z.enum(V3_JOURNEY_MILESTONE_CANDIDATE_TYPES);
export const v3JourneyIncidentTemplateSchema = z.enum(V3_JOURNEY_INCIDENT_TEMPLATES);
export const v3JourneyIncidentStatusSchema = z.enum(V3_JOURNEY_INCIDENT_STATUSES);
export const v3JourneyIncidentDecisionSchema = z.enum(V3_JOURNEY_INCIDENT_DECISIONS);
export const v3JourneyIncidentOutcomeSchema = z.enum(V3_JOURNEY_INCIDENT_OUTCOMES);
export const v3JourneyIncidentMemoryImportanceSchema = z.enum(V3_JOURNEY_INCIDENT_MEMORY_IMPORTANCE);

export const v3JourneyStepReadModelSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable(),
  riskLevel: v3JourneyRiskLevelSchema,
  order: z.number().int().positive(),
  status: v3JourneyStepStatusSchema,
  completedAt: z.string().datetime().nullable(),
  settledByActor: z.string().nullable(),
  resultNote: z.string().nullable(),
});

export const v3JourneyPartyMemberSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-f0-9]{40}$/i),
  role: v3JourneyMemberRoleSchema,
  joinedAt: z.string().datetime(),
});

export const v3JourneyAuditSchema = z.object({
  createdByAppId: z.string().min(1),
  createdByKeyId: z.string().min(1),
  createdByActor: z.string().min(1),
  requestId: z.string().min(1).nullable(),
  updatedByActor: z.string().min(1),
});

export const v3JourneyReadModelSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  narrativeSeed: z.string().nullable(),
  status: v3JourneyStatusSchema,
  currentStepId: z.string().min(1).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  steps: z.array(v3JourneyStepReadModelSchema).min(1),
  partyMembers: z.array(v3JourneyPartyMemberSchema).min(1),
  audit: v3JourneyAuditSchema,
});

export const v3JourneyViewerProgressSchema = z.object({
  totalChapters: z.number().int().nonnegative(),
  completedChapters: z.number().int().nonnegative(),
  failedChapters: z.number().int().nonnegative(),
  skippedChapters: z.number().int().nonnegative(),
  pendingChapters: z.number().int().nonnegative(),
  activeChapters: z.number().int().nonnegative(),
  completionPercent: z.number().int().min(0).max(100),
});

export const v3JourneyViewerChapterSchema = v3JourneyStepReadModelSchema.extend({
  isCurrent: z.boolean(),
});

export const v3JourneyRewardPreviewSchema = z.object({
  status: v3JourneyRewardPreviewStatusSchema,
  hint: z.string().min(1),
});

export const v3JourneyViewerReadModelSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  narrativeSeed: z.string().nullable(),
  status: v3JourneyStatusSchema,
  currentStepId: z.string().min(1).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  progress: v3JourneyViewerProgressSchema,
  chapters: z.array(v3JourneyViewerChapterSchema).min(1),
  party: z.object({
    leadWalletAddress: z.string().regex(/^0x[a-f0-9]{40}$/i).nullable(),
    memberCount: z.number().int().positive(),
    members: z.array(v3JourneyPartyMemberSchema).min(1),
  }),
  rewards: v3JourneyRewardPreviewSchema,
  audit: v3JourneyAuditSchema,
});

export const v3JourneyWorldNodeSchema = z.object({
  id: z.string().min(1),
  stepId: z.string().min(1),
  title: z.string().min(1),
  order: z.number().int().positive(),
  riskLevel: v3JourneyRiskLevelSchema,
  status: v3JourneyWorldNodeStatusSchema,
  unlockedAt: z.string().datetime().nullable(),
  clearedAt: z.string().datetime().nullable(),
  footprintCount: z.number().int().nonnegative(),
});

export const v3JourneyRelicSchema = z.object({
  id: z.string().min(1),
  stepId: z.string().min(1),
  nodeId: z.string().min(1),
  name: z.string().min(1),
  rarity: v3JourneyRelicRaritySchema,
  status: v3JourneyRelicStatusSchema,
  discoveredAt: z.string().datetime().nullable(),
  milestoneEligible: z.boolean(),
});

export const v3JourneyFootprintSchema = z.object({
  id: z.string().min(1),
  stepId: z.string().min(1),
  actor: z.string().min(1),
  outcome: z.enum(['COMPLETED', 'FAILED', 'SKIPPED']),
  createdAt: z.string().datetime(),
});

export const v3JourneyMilestoneCandidateSchema = z.object({
  type: v3JourneyMilestoneCandidateTypeSchema,
  stepId: z.string().min(1).nullable(),
  reason: z.string().min(1),
  occurredAt: z.string().datetime(),
});

export const v3JourneyWorldGraphReadModelSchema = z.object({
  journeyId: z.string().min(1),
  generatedAt: z.string().datetime(),
  nodes: z.array(v3JourneyWorldNodeSchema).min(1),
  relics: z.array(v3JourneyRelicSchema).min(1),
  footprints: z.array(v3JourneyFootprintSchema),
  milestones: z.object({
    eligible: z.boolean(),
    candidates: z.array(v3JourneyMilestoneCandidateSchema),
  }),
});

export const v3JourneyIncidentPromptTraceSchema = z.object({
  traceId: z.string().min(1),
  promptKitVersion: z.string().min(1),
  systemPromptVersion: z.string().min(1),
  responsePromptVersion: z.string().min(1),
  fingerprint: z.string().min(1),
  variables: z.record(z.unknown()),
});

export const v3JourneyIncidentRelationshipSignalSchema = z.object({
  sourceWallet: z.string().regex(/^0x[a-f0-9]{40}$/i),
  targetWallet: z.string().regex(/^0x[a-f0-9]{40}$/i),
  trustDelta: z.number().int(),
  reason: z.string().min(1),
});

export const v3JourneyIncidentMemoryFragmentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  text: z.string().min(1),
  importance: v3JourneyIncidentMemoryImportanceSchema,
  tags: z.array(z.string().min(1)).min(1),
});

export const v3JourneyIncidentReadModelSchema = z.object({
  id: z.string().min(1),
  journeyId: z.string().min(1),
  stepId: z.string().min(1),
  template: v3JourneyIncidentTemplateSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  status: v3JourneyIncidentStatusSchema,
  options: z.array(v3JourneyIncidentDecisionSchema).min(1),
  promptTrace: v3JourneyIncidentPromptTraceSchema,
  triggeredAt: z.string().datetime(),
  resolvedAt: z.string().datetime().nullable(),
  resolution: z.object({
    decision: v3JourneyIncidentDecisionSchema.nullable(),
    outcome: v3JourneyIncidentOutcomeSchema.nullable(),
    note: z.string().nullable(),
    respondedByActor: z.string().nullable(),
  }),
  effects: z.object({
    relationshipSignals: z.array(v3JourneyIncidentRelationshipSignalSchema),
    memoryFragments: z.array(v3JourneyIncidentMemoryFragmentSchema),
  }),
  audit: v3JourneyAuditSchema,
});

export const v3JourneyIncidentListReadModelSchema = z.object({
  journeyId: z.string().min(1),
  items: z.array(v3JourneyIncidentReadModelSchema),
});

export const v3JourneyIncidentTriggerResultSchema = z.object({
  incident: v3JourneyIncidentReadModelSchema,
  journey: v3JourneyReadModelSchema,
});

export const v3JourneyIncidentRespondResultSchema = z.object({
  incident: v3JourneyIncidentReadModelSchema,
  journey: v3JourneyReadModelSchema,
});

export const v3JourneyStepInputSchema = z.object({
  id: z.string().trim().min(1).max(64).optional(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(280).optional(),
  riskLevel: v3JourneyRiskLevelSchema.optional(),
});

export const v3JourneyCreatePayloadSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(3)
      .max(64)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    title: z.string().trim().min(1).max(120),
    narrativeSeed: z.string().trim().max(500).optional(),
    partyMembers: z.array(z.string().trim().regex(/^0x[a-f0-9]{40}$/i)).max(8).optional(),
    steps: z.array(v3JourneyStepInputSchema).min(1).max(12).optional(),
  })
  .strict();

export const v3JourneySettleStepPayloadSchema = z
  .object({
    result: v3JourneyStepSettleResultSchema,
    reason: z.string().trim().max(280).optional(),
  })
  .strict();

export const v3JourneyAdvanceStepPayloadSchema = z
  .object({
    reason: z.string().trim().max(280).optional(),
  })
  .strict();

export const v3JourneyIncidentTriggerPayloadSchema = z
  .object({
    stepId: z.string().trim().min(1).max(64).optional(),
    template: v3JourneyIncidentTemplateSchema.optional(),
    contextNote: z.string().trim().max(280).optional(),
  })
  .strict();

export const v3JourneyIncidentRespondPayloadSchema = z
  .object({
    decision: v3JourneyIncidentDecisionSchema,
    note: z.string().trim().max(280).optional(),
  })
  .strict();
