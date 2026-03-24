import { z } from 'zod';
import {
  V3_MEMORY_PALACE_COLLABORATOR_ROLES,
  V3_MEMORY_PALACE_CONTRIBUTION_TYPES,
  V3_MEMORY_PALACE_TEMPLATE_REVIEW_DECISIONS,
  V3_MEMORY_PALACE_TEMPLATE_STATUSES,
  V3_MEMORY_PALACE_VISIT_ENTRY_TYPES,
  V3_MEMORY_PALACE_WORLD_STATUSES,
} from '../types/memory-palace';

const memoryPalaceAppIdSchema = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9_:-]{3,64}$/i);

export const v3MemoryPalaceWorldStatusSchema = z.enum(V3_MEMORY_PALACE_WORLD_STATUSES);
export const v3MemoryPalaceCollaboratorRoleSchema = z.enum(V3_MEMORY_PALACE_COLLABORATOR_ROLES);
export const v3MemoryPalaceContributionTypeSchema = z.enum(V3_MEMORY_PALACE_CONTRIBUTION_TYPES);
export const v3MemoryPalaceVisitEntryTypeSchema = z.enum(V3_MEMORY_PALACE_VISIT_ENTRY_TYPES);
export const v3MemoryPalaceTemplateStatusSchema = z.enum(V3_MEMORY_PALACE_TEMPLATE_STATUSES);
export const v3MemoryPalaceTemplateReviewDecisionSchema = z.enum(
  V3_MEMORY_PALACE_TEMPLATE_REVIEW_DECISIONS
);

const hexColorSchema = z.string().trim().regex(/^#[0-9a-f]{6}$/i);

export const v3MemoryPalaceCollaboratorReadModelSchema = z.object({
  appId: memoryPalaceAppIdSchema,
  role: v3MemoryPalaceCollaboratorRoleSchema,
  addedByActor: z.string().min(1),
  createdAt: z.string().datetime(),
});

export const v3MemoryPalaceContributionReadModelSchema = z.object({
  id: z.string().min(1),
  appId: memoryPalaceAppIdSchema,
  actor: z.string().min(1),
  type: v3MemoryPalaceContributionTypeSchema,
  content: z.string().min(1),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string().datetime(),
});

export const v3MemoryPalaceVisitReadModelSchema = z.object({
  id: z.string().min(1),
  worldId: z.string().min(1),
  visitorAppId: memoryPalaceAppIdSchema,
  visitorActor: z.string().min(1),
  entryType: v3MemoryPalaceVisitEntryTypeSchema,
  message: z.string().min(1),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string().datetime(),
  featured: z.object({
    isFeatured: z.boolean(),
    exhibitId: z.string().nullable(),
    featuredAt: z.string().datetime().nullable(),
    featuredByActor: z.string().nullable(),
    reason: z.string().nullable(),
  }),
});

export const v3MemoryPalaceVisitListReadModelSchema = z.object({
  worldId: z.string().min(1),
  total: z.number().int().nonnegative(),
  featuredCount: z.number().int().nonnegative(),
  items: z.array(v3MemoryPalaceVisitReadModelSchema),
});

export const v3MemoryPalaceTemplateThemeSchema = z.object({
  palette: z
    .object({
      background: hexColorSchema,
      surface: hexColorSchema,
      accent: hexColorSchema,
      text: hexColorSchema,
    })
    .strict(),
  badgeLabel: z.string().nullable(),
  coverImageUrl: z.string().url().nullable(),
});

export const v3MemoryPalaceTemplateReviewInfoSchema = z.object({
  submittedAt: z.string().datetime().nullable(),
  reviewedAt: z.string().datetime().nullable(),
  reviewedByActor: z.string().nullable(),
  note: z.string().nullable(),
});

export const v3MemoryPalaceTemplateReadModelSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().nullable(),
  status: v3MemoryPalaceTemplateStatusSchema,
  featureEnabled: z.boolean(),
  createdByAppId: memoryPalaceAppIdSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  theme: v3MemoryPalaceTemplateThemeSchema,
  review: v3MemoryPalaceTemplateReviewInfoSchema,
});

export const v3MemoryPalaceTemplateListReadModelSchema = z.object({
  total: z.number().int().nonnegative(),
  items: z.array(v3MemoryPalaceTemplateReadModelSchema),
});

export const v3MemoryPalaceWorldReadModelSchema = z.object({
  id: z.string().min(1),
  journeyId: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().nullable(),
  templateSlug: z.string().nullable(),
  status: v3MemoryPalaceWorldStatusSchema,
  ownerAppId: memoryPalaceAppIdSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  collaborators: z.array(v3MemoryPalaceCollaboratorReadModelSchema),
  contributions: z.array(v3MemoryPalaceContributionReadModelSchema),
  metrics: z.object({
    collaboratorCount: z.number().int().nonnegative(),
    contributionCount: z.number().int().nonnegative(),
  }),
});

export const v3MemoryPalaceCreateWorldPayloadSchema = z
  .object({
    journeyId: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(120).optional(),
    summary: z.string().trim().max(500).optional(),
    templateSlug: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
  })
  .strict();

export const v3MemoryPalaceAddCollaboratorPayloadSchema = z
  .object({
    appId: memoryPalaceAppIdSchema,
    role: z.enum(['CONTRIBUTOR', 'EDITOR']).optional(),
  })
  .strict();

export const v3MemoryPalaceAddContributionPayloadSchema = z
  .object({
    type: v3MemoryPalaceContributionTypeSchema,
    content: z.string().trim().min(1).max(800),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict();

export const v3MemoryPalaceAddVisitPayloadSchema = z
  .object({
    entryType: v3MemoryPalaceVisitEntryTypeSchema.optional(),
    message: z.string().trim().min(1).max(280),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict();

export const v3MemoryPalaceCreateTemplatePayloadSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: z.string().trim().min(1).max(80),
    summary: z.string().trim().min(1).max(280).optional(),
    theme: z
      .object({
        palette: z
          .object({
            background: hexColorSchema,
            surface: hexColorSchema,
            accent: hexColorSchema,
            text: hexColorSchema,
          })
          .strict(),
        badgeLabel: z.string().trim().min(1).max(40).optional(),
        coverImageUrl: z.string().trim().url().max(320).optional(),
      })
      .strict(),
  })
  .strict();

export const v3MemoryPalaceSubmitTemplateReviewPayloadSchema = z
  .object({
    note: z.string().trim().max(240).optional(),
  })
  .strict();

export const v3MemoryPalaceReviewTemplatePayloadSchema = z
  .object({
    decision: v3MemoryPalaceTemplateReviewDecisionSchema,
    note: z.string().trim().max(240).optional(),
    featureEnabled: z.boolean().optional(),
  })
  .strict();

export const v3MemoryPalaceToggleTemplateFeaturePayloadSchema = z
  .object({
    enabled: z.boolean(),
    reason: z.string().trim().max(240).optional(),
  })
  .strict();
