export const V3_MEMORY_PALACE_WORLD_STATUSES = ['ACTIVE', 'ARCHIVED'] as const;
export const V3_MEMORY_PALACE_COLLABORATOR_ROLES = ['OWNER', 'CONTRIBUTOR', 'EDITOR'] as const;
export const V3_MEMORY_PALACE_CONTRIBUTION_TYPES = [
  'WITNESS_NOTE',
  'RELIC_PLACEMENT',
  'PHOTO',
  'MEMORY_FRAGMENT',
] as const;
export const V3_MEMORY_PALACE_VISIT_ENTRY_TYPES = ['GUESTBOOK', 'WITNESS'] as const;
export const V3_MEMORY_PALACE_TEMPLATE_STATUSES = [
  'DRAFT',
  'IN_REVIEW',
  'PUBLISHED',
  'REJECTED',
  'ARCHIVED',
] as const;
export const V3_MEMORY_PALACE_TEMPLATE_REVIEW_DECISIONS = ['APPROVE', 'REJECT'] as const;

export type V3MemoryPalaceWorldStatus = (typeof V3_MEMORY_PALACE_WORLD_STATUSES)[number];
export type V3MemoryPalaceCollaboratorRole = (typeof V3_MEMORY_PALACE_COLLABORATOR_ROLES)[number];
export type V3MemoryPalaceContributionType = (typeof V3_MEMORY_PALACE_CONTRIBUTION_TYPES)[number];
export type V3MemoryPalaceVisitEntryType = (typeof V3_MEMORY_PALACE_VISIT_ENTRY_TYPES)[number];
export type V3MemoryPalaceTemplateStatus = (typeof V3_MEMORY_PALACE_TEMPLATE_STATUSES)[number];
export type V3MemoryPalaceTemplateReviewDecision =
  (typeof V3_MEMORY_PALACE_TEMPLATE_REVIEW_DECISIONS)[number];

export interface V3MemoryPalaceCollaboratorReadModel {
  appId: string;
  role: V3MemoryPalaceCollaboratorRole;
  addedByActor: string;
  createdAt: string;
}

export interface V3MemoryPalaceContributionReadModel {
  id: string;
  appId: string;
  actor: string;
  type: V3MemoryPalaceContributionType;
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface V3MemoryPalaceVisitReadModel {
  id: string;
  worldId: string;
  visitorAppId: string;
  visitorActor: string;
  entryType: V3MemoryPalaceVisitEntryType;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  featured: {
    isFeatured: boolean;
    exhibitId: string | null;
    featuredAt: string | null;
    featuredByActor: string | null;
    reason: string | null;
  };
}

export interface V3MemoryPalaceVisitListReadModel {
  worldId: string;
  total: number;
  featuredCount: number;
  items: V3MemoryPalaceVisitReadModel[];
}

export interface V3MemoryPalaceTemplateTheme {
  palette: {
    background: string;
    surface: string;
    accent: string;
    text: string;
  };
  badgeLabel: string | null;
  coverImageUrl: string | null;
}

export interface V3MemoryPalaceTemplateReviewInfo {
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedByActor: string | null;
  note: string | null;
}

export interface V3MemoryPalaceTemplateReadModel {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  status: V3MemoryPalaceTemplateStatus;
  featureEnabled: boolean;
  createdByAppId: string;
  createdAt: string;
  updatedAt: string;
  theme: V3MemoryPalaceTemplateTheme;
  review: V3MemoryPalaceTemplateReviewInfo;
}

export interface V3MemoryPalaceTemplateListReadModel {
  total: number;
  items: V3MemoryPalaceTemplateReadModel[];
}

export interface V3MemoryPalaceWorldReadModel {
  id: string;
  journeyId: string;
  title: string;
  summary: string | null;
  templateSlug: string | null;
  status: V3MemoryPalaceWorldStatus;
  ownerAppId: string;
  createdAt: string;
  updatedAt: string;
  collaborators: V3MemoryPalaceCollaboratorReadModel[];
  contributions: V3MemoryPalaceContributionReadModel[];
  metrics: {
    collaboratorCount: number;
    contributionCount: number;
  };
}

export interface V3MemoryPalaceCreateWorldPayload {
  journeyId: string;
  title?: string;
  summary?: string;
  templateSlug?: string;
}

export interface V3MemoryPalaceAddCollaboratorPayload {
  appId: string;
  role?: Exclude<V3MemoryPalaceCollaboratorRole, 'OWNER'>;
}

export interface V3MemoryPalaceAddContributionPayload {
  type: V3MemoryPalaceContributionType;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface V3MemoryPalaceAddVisitPayload {
  entryType?: V3MemoryPalaceVisitEntryType;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface V3MemoryPalaceCreateTemplatePayload {
  slug: string;
  name: string;
  summary?: string;
  theme: {
    palette: {
      background: string;
      surface: string;
      accent: string;
      text: string;
    };
    badgeLabel?: string;
    coverImageUrl?: string;
  };
}

export interface V3MemoryPalaceSubmitTemplateReviewPayload {
  note?: string;
}

export interface V3MemoryPalaceReviewTemplatePayload {
  decision: V3MemoryPalaceTemplateReviewDecision;
  note?: string;
  featureEnabled?: boolean;
}

export interface V3MemoryPalaceToggleTemplateFeaturePayload {
  enabled: boolean;
  reason?: string;
}
