import { randomUUID } from 'crypto';
import { AppError } from '../../middlewares/errorHandler';

const TEMPLATE_ID_PATTERN = /^mpt_[a-z0-9]+$/;
const TEMPLATE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const HTTP_URL_PATTERN = /^https?:\/\/[^\s]+$/i;

export const MEMORY_PALACE_TEMPLATE_STATUSES = [
  'DRAFT',
  'IN_REVIEW',
  'PUBLISHED',
  'REJECTED',
  'ARCHIVED',
] as const;

export const MEMORY_PALACE_TEMPLATE_REVIEW_DECISIONS = ['APPROVE', 'REJECT'] as const;

type MemoryPalaceTemplateStorageMode = 'prisma' | 'memory';

export type MemoryPalaceTemplateStatus = (typeof MEMORY_PALACE_TEMPLATE_STATUSES)[number];
export type MemoryPalaceTemplateReviewDecision =
  (typeof MEMORY_PALACE_TEMPLATE_REVIEW_DECISIONS)[number];

export interface MemoryPalaceTemplateTheme {
  palette: {
    background: string;
    surface: string;
    accent: string;
    text: string;
  };
  badgeLabel: string | null;
  coverImageUrl: string | null;
}

export interface MemoryPalaceTemplateReviewInfo {
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedByActor: string | null;
  note: string | null;
}

export interface MemoryPalaceTemplateReadModel {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  status: MemoryPalaceTemplateStatus;
  featureEnabled: boolean;
  createdByAppId: string;
  createdAt: string;
  updatedAt: string;
  theme: MemoryPalaceTemplateTheme;
  review: MemoryPalaceTemplateReviewInfo;
}

export interface MemoryPalaceTemplateListReadModel {
  total: number;
  items: MemoryPalaceTemplateReadModel[];
}

interface MemoryPalaceTemplateState extends MemoryPalaceTemplateReadModel {}

interface MemoryPalaceTemplatePrismaClient {
  memoryPalaceTemplate: {
    create: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any | null>;
    findMany: (args: any) => Promise<any[]>;
    update: (args: any) => Promise<any>;
    count: (args: any) => Promise<number>;
  };
  domainEvent: {
    create: (args: any) => Promise<any>;
  };
  $transaction: (args: any) => Promise<any>;
}

export interface CreateMemoryPalaceTemplateCommand {
  slug: string;
  name: string;
  summary?: string;
  theme: MemoryPalaceTemplateTheme;
  requestedBy: {
    appId: string;
    keyId: string;
    actor: string;
    requestId?: string | null;
  };
}

export interface SubmitMemoryPalaceTemplateReviewCommand {
  templateId: string;
  note?: string;
  requestedBy: {
    appId: string;
    actor: string;
    requestId?: string | null;
  };
}

export interface AdminReviewMemoryPalaceTemplateCommand {
  templateId: string;
  decision: MemoryPalaceTemplateReviewDecision;
  note?: string;
  featureEnabled?: boolean;
  requestedBy: {
    actor: string;
    requestId?: string | null;
  };
}

export interface AdminToggleMemoryPalaceTemplateFeatureCommand {
  templateId: string;
  enabled: boolean;
  reason?: string;
  requestedBy: {
    actor: string;
    requestId?: string | null;
  };
}

const TEMPLATE_STATUS_SET = new Set<string>(MEMORY_PALACE_TEMPLATE_STATUSES);
const TEMPLATE_REVIEW_DECISION_SET = new Set<string>(MEMORY_PALACE_TEMPLATE_REVIEW_DECISIONS);

const DEFAULT_TEMPLATE_THEME: MemoryPalaceTemplateTheme = {
  palette: {
    background: '#ecfeff',
    surface: '#ffffff',
    accent: '#0ea5e9',
    text: '#0f172a',
  },
  badgeLabel: null,
  coverImageUrl: null,
};

const parseBoolean = (raw: string | undefined, fallback: boolean): boolean => {
  if (typeof raw !== 'string') {
    return fallback;
  }

  const normalized = raw.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(normalized);
};

const toStorageMode = (raw: string | undefined): MemoryPalaceTemplateStorageMode => {
  if (raw?.trim().toLowerCase() === 'memory') {
    return 'memory';
  }
  return 'prisma';
};

const isTemplatePackWriteEnabled = (): boolean =>
  parseBoolean(process.env.V3_MEMORY_PALACE_TEMPLATE_PACK_ENABLED, true);

const isTemplatePublicReadEnabled = (): boolean =>
  parseBoolean(process.env.V3_MEMORY_PALACE_TEMPLATE_PUBLIC_ENABLED, true);

const normalizeTemplateId = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  if (!TEMPLATE_ID_PATTERN.test(normalized)) {
    throw new AppError(400, 'templateId is invalid', 'INVALID_INPUT', {
      templateId: value,
    });
  }
  return normalized;
};

const normalizeTemplateSlug = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized.length > 64 || !TEMPLATE_SLUG_PATTERN.test(normalized)) {
    throw new AppError(400, 'template slug is invalid', 'INVALID_INPUT', {
      slug: value,
    });
  }
  return normalized;
};

const normalizeNonEmpty = (value: string, field: string, maxLength: number): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new AppError(400, `${field} is required`, 'INVALID_INPUT', {
      field,
    });
  }
  if (normalized.length > maxLength) {
    throw new AppError(400, `${field} must be <= ${maxLength} characters`, 'INVALID_INPUT', {
      field,
      maxLength,
    });
  }
  return normalized;
};

const normalizeOptionalText = (
  value: string | undefined,
  field: string,
  maxLength: number
): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  if (normalized.length > maxLength) {
    throw new AppError(400, `${field} must be <= ${maxLength} characters`, 'INVALID_INPUT', {
      field,
      maxLength,
    });
  }
  return normalized;
};

const normalizeHexColor = (value: unknown, field: string): string => {
  if (typeof value !== 'string') {
    throw new AppError(400, `${field} is required`, 'INVALID_INPUT', {
      field,
    });
  }

  const normalized = value.trim().toLowerCase();
  if (!HEX_COLOR_PATTERN.test(normalized)) {
    throw new AppError(400, `${field} must be a 6-digit hex color`, 'INVALID_INPUT', {
      field,
      value,
    });
  }

  return normalized;
};

const normalizeStatus = (value: unknown): MemoryPalaceTemplateStatus => {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (!TEMPLATE_STATUS_SET.has(normalized)) {
    return 'DRAFT';
  }
  return normalized as MemoryPalaceTemplateStatus;
};

const toIso = (value: Date | string | undefined | null): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
};

const toTemplateId = (): string => `mpt_${randomUUID().replace(/-/g, '').slice(0, 24)}`;

const cloneTemplate = (value: MemoryPalaceTemplateState): MemoryPalaceTemplateReadModel => ({
  ...value,
  theme: {
    palette: {
      ...value.theme.palette,
    },
    badgeLabel: value.theme.badgeLabel,
    coverImageUrl: value.theme.coverImageUrl,
  },
  review: {
    ...value.review,
  },
});

const clampLimit = (value: number | undefined, fallback: number, max: number): number => {
  if (!Number.isInteger(value) || !value || value <= 0) {
    return fallback;
  }
  return Math.min(value, max);
};

const parseConfigObject = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
};

const normalizeTemplateTheme = (value: unknown): MemoryPalaceTemplateTheme => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError(400, 'theme is required', 'INVALID_INPUT', {
      field: 'theme',
    });
  }

  const theme = value as Record<string, unknown>;
  const palette = parseConfigObject(theme.palette);

  const badgeLabel = normalizeOptionalText(
    typeof theme.badgeLabel === 'string' ? theme.badgeLabel : undefined,
    'theme.badgeLabel',
    40
  );

  const coverImageUrlRaw =
    typeof theme.coverImageUrl === 'string' ? theme.coverImageUrl.trim() : '';
  const coverImageUrl = coverImageUrlRaw
    ? (() => {
        if (coverImageUrlRaw.length > 320 || !HTTP_URL_PATTERN.test(coverImageUrlRaw)) {
          throw new AppError(400, 'theme.coverImageUrl must be a valid http/https URL', 'INVALID_INPUT', {
            field: 'theme.coverImageUrl',
          });
        }
        return coverImageUrlRaw;
      })()
    : null;

  return {
    palette: {
      background: normalizeHexColor(palette.background, 'theme.palette.background'),
      surface: normalizeHexColor(palette.surface, 'theme.palette.surface'),
      accent: normalizeHexColor(palette.accent, 'theme.palette.accent'),
      text: normalizeHexColor(palette.text, 'theme.palette.text'),
    },
    badgeLabel,
    coverImageUrl,
  };
};

const buildTemplateConfig = (state: MemoryPalaceTemplateState): Record<string, unknown> => ({
  summary: state.summary,
  theme: {
    palette: {
      ...state.theme.palette,
    },
    badgeLabel: state.theme.badgeLabel,
    coverImageUrl: state.theme.coverImageUrl,
  },
  review: {
    submittedAt: state.review.submittedAt,
    reviewedAt: state.review.reviewedAt,
    reviewedByActor: state.review.reviewedByActor,
    note: state.review.note,
  },
  flags: {
    featureEnabled: state.featureEnabled,
  },
});

const mapThemeFromConfig = (config: Record<string, unknown>): MemoryPalaceTemplateTheme => {
  const theme = parseConfigObject(config.theme);
  const palette = parseConfigObject(theme.palette);

  const safeColor = (value: unknown, fallback: string): string => {
    if (typeof value !== 'string') {
      return fallback;
    }
    const normalized = value.trim().toLowerCase();
    return HEX_COLOR_PATTERN.test(normalized) ? normalized : fallback;
  };

  const badgeLabel = normalizeOptionalText(
    typeof theme.badgeLabel === 'string' ? theme.badgeLabel : undefined,
    'theme.badgeLabel',
    40
  );

  const coverImageUrl =
    typeof theme.coverImageUrl === 'string' &&
    theme.coverImageUrl.trim().length > 0 &&
    HTTP_URL_PATTERN.test(theme.coverImageUrl.trim())
      ? theme.coverImageUrl.trim()
      : null;

  return {
    palette: {
      background: safeColor(palette.background, DEFAULT_TEMPLATE_THEME.palette.background),
      surface: safeColor(palette.surface, DEFAULT_TEMPLATE_THEME.palette.surface),
      accent: safeColor(palette.accent, DEFAULT_TEMPLATE_THEME.palette.accent),
      text: safeColor(palette.text, DEFAULT_TEMPLATE_THEME.palette.text),
    },
    badgeLabel,
    coverImageUrl,
  };
};

export class MemoryPalaceTemplatePackService {
  private readonly templates = new Map<string, MemoryPalaceTemplateState>();
  private prismaClient?: MemoryPalaceTemplatePrismaClient;

  constructor(deps?: { prismaClient?: MemoryPalaceTemplatePrismaClient }) {
    this.prismaClient = deps?.prismaClient;
  }

  async createTemplateDraft(
    input: CreateMemoryPalaceTemplateCommand
  ): Promise<MemoryPalaceTemplateReadModel> {
    this.assertTemplateWriteEnabled();

    const slug = normalizeTemplateSlug(input.slug);
    const name = normalizeNonEmpty(input.name, 'name', 80);
    const summary = normalizeOptionalText(input.summary, 'summary', 280);
    normalizeNonEmpty(input.requestedBy.actor, 'actor', 120);
    const theme = normalizeTemplateTheme(input.theme);
    const now = new Date();
    const nowIso = now.toISOString();

    if (this.getStorageMode() === 'memory') {
      const duplicate = Array.from(this.templates.values()).find((item) => item.slug === slug);
      if (duplicate) {
        throw new AppError(409, 'template slug already exists', 'CONFLICT', {
          slug,
        });
      }

      const state: MemoryPalaceTemplateState = {
        id: toTemplateId(),
        slug,
        name,
        summary,
        status: 'DRAFT',
        featureEnabled: false,
        createdByAppId: input.requestedBy.appId,
        createdAt: nowIso,
        updatedAt: nowIso,
        theme,
        review: {
          submittedAt: null,
          reviewedAt: null,
          reviewedByActor: null,
          note: null,
        },
      };

      this.templates.set(state.id, state);
      return cloneTemplate(state);
    }

    const prisma = await this.getPrismaClient();
    const created = await prisma.$transaction(async (tx: MemoryPalaceTemplatePrismaClient) => {
      const duplicate = await tx.memoryPalaceTemplate.findFirst({
        where: {
          slug,
        },
      });

      if (duplicate) {
        throw new AppError(409, 'template slug already exists', 'CONFLICT', {
          slug,
        });
      }

      const state: MemoryPalaceTemplateState = {
        id: toTemplateId(),
        slug,
        name,
        summary,
        status: 'DRAFT',
        featureEnabled: false,
        createdByAppId: input.requestedBy.appId,
        createdAt: nowIso,
        updatedAt: nowIso,
        theme,
        review: {
          submittedAt: null,
          reviewedAt: null,
          reviewedByActor: null,
          note: null,
        },
      };

      const record = await tx.memoryPalaceTemplate.create({
        data: {
          id: state.id,
          slug: state.slug,
          name: state.name,
          status: state.status,
          config: buildTemplateConfig(state),
          createdByAppId: state.createdByAppId,
          createdAt: now,
          updatedAt: now,
        },
      });

      await tx.domainEvent.create({
        data: {
          aggregateType: 'MemoryPalaceTemplate',
          aggregateId: state.id,
          eventType: 'MemoryPalaceTemplateCreated',
          payload: {
            templateId: state.id,
            slug: state.slug,
            status: state.status,
            createdByAppId: state.createdByAppId,
            featureEnabled: state.featureEnabled,
          },
          requestId: input.requestedBy.requestId?.trim() || null,
          source: 'api.v3.memory-palaces.templates.create',
        },
      });

      return record;
    });

    return this.mapRecordToReadModel(created);
  }

  async submitTemplateForReview(
    input: SubmitMemoryPalaceTemplateReviewCommand
  ): Promise<MemoryPalaceTemplateReadModel> {
    this.assertTemplateWriteEnabled();

    const templateId = normalizeTemplateId(input.templateId);
    const note = normalizeOptionalText(input.note, 'note', 240);
    const actor = normalizeNonEmpty(input.requestedBy.actor, 'actor', 120).toLowerCase();
    const now = new Date();
    const nowIso = now.toISOString();

    if (this.getStorageMode() === 'memory') {
      const template = this.templates.get(templateId);
      if (!template || template.createdByAppId !== input.requestedBy.appId) {
        throw new AppError(404, 'template not found', 'NOT_FOUND', {
          templateId,
        });
      }

      if (!['DRAFT', 'REJECTED'].includes(template.status)) {
        throw new AppError(409, 'template cannot be submitted in current status', 'INVALID_STATE', {
          templateId,
          status: template.status,
        });
      }

      template.status = 'IN_REVIEW';
      template.featureEnabled = false;
      template.updatedAt = nowIso;
      template.review = {
        submittedAt: nowIso,
        reviewedAt: null,
        reviewedByActor: null,
        note,
      };

      return cloneTemplate(template);
    }

    const prisma = await this.getPrismaClient();
    const updated = await prisma.$transaction(async (tx: MemoryPalaceTemplatePrismaClient) => {
      const record = await tx.memoryPalaceTemplate.findFirst({
        where: {
          id: templateId,
          createdByAppId: input.requestedBy.appId,
        },
      });

      if (!record) {
        throw new AppError(404, 'template not found', 'NOT_FOUND', {
          templateId,
        });
      }

      const current = this.mapRecordToReadModel(record);
      if (!['DRAFT', 'REJECTED'].includes(current.status)) {
        throw new AppError(409, 'template cannot be submitted in current status', 'INVALID_STATE', {
          templateId,
          status: current.status,
        });
      }

      const nextState: MemoryPalaceTemplateState = {
        ...current,
        status: 'IN_REVIEW',
        featureEnabled: false,
        updatedAt: nowIso,
        review: {
          submittedAt: nowIso,
          reviewedAt: null,
          reviewedByActor: null,
          note,
        },
      };

      const next = await tx.memoryPalaceTemplate.update({
        where: {
          id: templateId,
        },
        data: {
          status: nextState.status,
          config: buildTemplateConfig(nextState),
          updatedAt: now,
        },
      });

      await tx.domainEvent.create({
        data: {
          aggregateType: 'MemoryPalaceTemplate',
          aggregateId: templateId,
          eventType: 'MemoryPalaceTemplateReviewSubmitted',
          payload: {
            templateId,
            status: nextState.status,
            submittedByActor: actor,
            note,
          },
          requestId: input.requestedBy.requestId?.trim() || null,
          source: 'api.v3.memory-palaces.templates.submit-review',
        },
      });

      return next;
    });

    return this.mapRecordToReadModel(updated);
  }

  async listPublishedTemplates(input?: { limit?: number }): Promise<MemoryPalaceTemplateListReadModel> {
    this.assertTemplatePublicReadEnabled();

    const limit = clampLimit(input?.limit, 20, 100);

    if (this.getStorageMode() === 'memory') {
      const items = Array.from(this.templates.values())
        .filter((item) => item.status === 'PUBLISHED' && item.featureEnabled)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .slice(0, limit)
        .map((item) => cloneTemplate(item));

      return {
        total: items.length,
        items,
      };
    }

    const prisma = await this.getPrismaClient();
    const records = await prisma.memoryPalaceTemplate.findMany({
      where: {
        status: 'PUBLISHED',
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: limit,
    });

    const mapped = records
      .map((item) => this.mapRecordToReadModel(item))
      .filter((item) => item.featureEnabled);

    return {
      total: mapped.length,
      items: mapped,
    };
  }

  async listTemplatesForApp(input: {
    scopeAppId: string;
    status?: MemoryPalaceTemplateStatus;
    limit?: number;
  }): Promise<MemoryPalaceTemplateListReadModel> {
    const limit = clampLimit(input.limit, 20, 100);
    const status = input.status ? this.normalizeStatusOrThrow(input.status) : undefined;

    if (this.getStorageMode() === 'memory') {
      const allItems = Array.from(this.templates.values()).filter(
        (item) => item.createdByAppId === input.scopeAppId
      );

      const filtered = status ? allItems.filter((item) => item.status === status) : allItems;
      const items = filtered
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .slice(0, limit)
        .map((item) => cloneTemplate(item));

      return {
        total: filtered.length,
        items,
      };
    }

    const prisma = await this.getPrismaClient();
    const where = {
      createdByAppId: input.scopeAppId,
      ...(status ? { status } : {}),
    };

    const [records, total] = await Promise.all([
      prisma.memoryPalaceTemplate.findMany({
        where,
        orderBy: {
          updatedAt: 'desc',
        },
        take: limit,
      }),
      prisma.memoryPalaceTemplate.count({
        where,
      }),
    ]);

    return {
      total,
      items: records.map((item) => this.mapRecordToReadModel(item)),
    };
  }

  async listTemplatesForAdmin(input?: {
    status?: MemoryPalaceTemplateStatus;
    createdByAppId?: string;
    limit?: number;
  }): Promise<MemoryPalaceTemplateListReadModel> {
    const limit = clampLimit(input?.limit, 20, 100);
    const status = input?.status ? this.normalizeStatusOrThrow(input.status) : undefined;
    const createdByAppId =
      typeof input?.createdByAppId === 'string' && input.createdByAppId.trim().length > 0
        ? input.createdByAppId.trim()
        : undefined;

    if (this.getStorageMode() === 'memory') {
      const filtered = Array.from(this.templates.values()).filter((item) => {
        if (status && item.status !== status) {
          return false;
        }
        if (createdByAppId && item.createdByAppId !== createdByAppId) {
          return false;
        }
        return true;
      });

      return {
        total: filtered.length,
        items: filtered
          .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
          .slice(0, limit)
          .map((item) => cloneTemplate(item)),
      };
    }

    const prisma = await this.getPrismaClient();
    const where = {
      ...(status ? { status } : {}),
      ...(createdByAppId ? { createdByAppId } : {}),
    };

    const [records, total] = await Promise.all([
      prisma.memoryPalaceTemplate.findMany({
        where,
        orderBy: {
          updatedAt: 'desc',
        },
        take: limit,
      }),
      prisma.memoryPalaceTemplate.count({
        where,
      }),
    ]);

    return {
      total,
      items: records.map((item) => this.mapRecordToReadModel(item)),
    };
  }

  async adminReviewTemplate(
    input: AdminReviewMemoryPalaceTemplateCommand
  ): Promise<MemoryPalaceTemplateReadModel> {
    this.assertTemplateWriteEnabled();

    const templateId = normalizeTemplateId(input.templateId);
    const decision = this.normalizeReviewDecisionOrThrow(input.decision);
    const note = normalizeOptionalText(input.note, 'note', 240);
    const actor = normalizeNonEmpty(input.requestedBy.actor, 'actor', 120).toLowerCase();
    const now = new Date();
    const nowIso = now.toISOString();

    if (this.getStorageMode() === 'memory') {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new AppError(404, 'template not found', 'NOT_FOUND', {
          templateId,
        });
      }

      if (template.status !== 'IN_REVIEW') {
        throw new AppError(409, 'template is not pending review', 'INVALID_STATE', {
          templateId,
          status: template.status,
        });
      }

      template.status = decision === 'APPROVE' ? 'PUBLISHED' : 'REJECTED';
      template.featureEnabled = decision === 'APPROVE' ? Boolean(input.featureEnabled ?? true) : false;
      template.updatedAt = nowIso;
      template.review = {
        submittedAt: template.review.submittedAt || nowIso,
        reviewedAt: nowIso,
        reviewedByActor: actor,
        note,
      };

      return cloneTemplate(template);
    }

    const prisma = await this.getPrismaClient();
    const updated = await prisma.$transaction(async (tx: MemoryPalaceTemplatePrismaClient) => {
      const record = await tx.memoryPalaceTemplate.findFirst({
        where: {
          id: templateId,
        },
      });

      if (!record) {
        throw new AppError(404, 'template not found', 'NOT_FOUND', {
          templateId,
        });
      }

      const current = this.mapRecordToReadModel(record);
      if (current.status !== 'IN_REVIEW') {
        throw new AppError(409, 'template is not pending review', 'INVALID_STATE', {
          templateId,
          status: current.status,
        });
      }

      const nextStatus: MemoryPalaceTemplateStatus =
        decision === 'APPROVE' ? 'PUBLISHED' : 'REJECTED';
      const nextFeatureEnabled = decision === 'APPROVE' ? Boolean(input.featureEnabled ?? true) : false;

      const nextState: MemoryPalaceTemplateState = {
        ...current,
        status: nextStatus,
        featureEnabled: nextFeatureEnabled,
        updatedAt: nowIso,
        review: {
          submittedAt: current.review.submittedAt || nowIso,
          reviewedAt: nowIso,
          reviewedByActor: actor,
          note,
        },
      };

      const next = await tx.memoryPalaceTemplate.update({
        where: {
          id: templateId,
        },
        data: {
          status: nextState.status,
          config: buildTemplateConfig(nextState),
          updatedAt: now,
        },
      });

      await tx.domainEvent.create({
        data: {
          aggregateType: 'MemoryPalaceTemplate',
          aggregateId: templateId,
          eventType: 'MemoryPalaceTemplateReviewed',
          payload: {
            templateId,
            decision,
            status: nextState.status,
            featureEnabled: nextState.featureEnabled,
            reviewedByActor: actor,
            note,
          },
          requestId: input.requestedBy.requestId?.trim() || null,
          source: 'admin.v3.memory-palaces.templates.review',
        },
      });

      return next;
    });

    return this.mapRecordToReadModel(updated);
  }

  async adminToggleTemplateFeature(
    input: AdminToggleMemoryPalaceTemplateFeatureCommand
  ): Promise<MemoryPalaceTemplateReadModel> {
    const templateId = normalizeTemplateId(input.templateId);
    const actor = normalizeNonEmpty(input.requestedBy.actor, 'actor', 120).toLowerCase();
    const reason = normalizeOptionalText(input.reason, 'reason', 240);
    const now = new Date();
    const nowIso = now.toISOString();

    if (this.getStorageMode() === 'memory') {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new AppError(404, 'template not found', 'NOT_FOUND', {
          templateId,
        });
      }

      if (template.status !== 'PUBLISHED') {
        throw new AppError(409, 'template feature can only be toggled for published templates', 'INVALID_STATE', {
          templateId,
          status: template.status,
        });
      }

      template.featureEnabled = Boolean(input.enabled);
      template.updatedAt = nowIso;
      template.review = {
        ...template.review,
        note: reason || template.review.note,
      };

      return cloneTemplate(template);
    }

    const prisma = await this.getPrismaClient();
    const updated = await prisma.$transaction(async (tx: MemoryPalaceTemplatePrismaClient) => {
      const record = await tx.memoryPalaceTemplate.findFirst({
        where: {
          id: templateId,
        },
      });

      if (!record) {
        throw new AppError(404, 'template not found', 'NOT_FOUND', {
          templateId,
        });
      }

      const current = this.mapRecordToReadModel(record);
      if (current.status !== 'PUBLISHED') {
        throw new AppError(409, 'template feature can only be toggled for published templates', 'INVALID_STATE', {
          templateId,
          status: current.status,
        });
      }

      const nextState: MemoryPalaceTemplateState = {
        ...current,
        featureEnabled: Boolean(input.enabled),
        updatedAt: nowIso,
        review: {
          ...current.review,
          note: reason || current.review.note,
        },
      };

      const next = await tx.memoryPalaceTemplate.update({
        where: {
          id: templateId,
        },
        data: {
          config: buildTemplateConfig(nextState),
          updatedAt: now,
        },
      });

      await tx.domainEvent.create({
        data: {
          aggregateType: 'MemoryPalaceTemplate',
          aggregateId: templateId,
          eventType: 'MemoryPalaceTemplateFeatureToggled',
          payload: {
            templateId,
            enabled: nextState.featureEnabled,
            actor,
            reason,
          },
          requestId: input.requestedBy.requestId?.trim() || null,
          source: 'admin.v3.memory-palaces.templates.feature',
        },
      });

      return next;
    });

    return this.mapRecordToReadModel(updated);
  }

  async assertTemplateAvailableForWorld(input: {
    templateSlug: string;
  }): Promise<MemoryPalaceTemplateReadModel> {
    this.assertTemplatePublicReadEnabled();

    const templateSlug = normalizeTemplateSlug(input.templateSlug);

    if (this.getStorageMode() === 'memory') {
      const template = Array.from(this.templates.values()).find((item) => item.slug === templateSlug);
      if (!template || template.status !== 'PUBLISHED' || !template.featureEnabled) {
        throw new AppError(403, 'template is not available for world creation', 'MEMORY_TEMPLATE_UNAVAILABLE', {
          templateSlug,
        });
      }
      return cloneTemplate(template);
    }

    const prisma = await this.getPrismaClient();
    const record = await prisma.memoryPalaceTemplate.findFirst({
      where: {
        slug: templateSlug,
      },
    });

    if (!record) {
      throw new AppError(403, 'template is not available for world creation', 'MEMORY_TEMPLATE_UNAVAILABLE', {
        templateSlug,
      });
    }

    const template = this.mapRecordToReadModel(record);
    if (template.status !== 'PUBLISHED' || !template.featureEnabled) {
      throw new AppError(403, 'template is not available for world creation', 'MEMORY_TEMPLATE_UNAVAILABLE', {
        templateSlug,
      });
    }

    return template;
  }

  resetForTest(): void {
    this.templates.clear();
  }

  private assertTemplateWriteEnabled(): void {
    if (isTemplatePackWriteEnabled()) {
      return;
    }

    throw new AppError(503, 'memory template pack writes are disabled', 'MEMORY_TEMPLATE_PACK_DISABLED', {
      envFlag: 'V3_MEMORY_PALACE_TEMPLATE_PACK_ENABLED',
    });
  }

  private assertTemplatePublicReadEnabled(): void {
    if (isTemplatePublicReadEnabled()) {
      return;
    }

    throw new AppError(503, 'memory template public catalog is disabled', 'MEMORY_TEMPLATE_PUBLIC_DISABLED', {
      envFlag: 'V3_MEMORY_PALACE_TEMPLATE_PUBLIC_ENABLED',
    });
  }

  private getStorageMode(): MemoryPalaceTemplateStorageMode {
    return toStorageMode(
      process.env.V3_MEMORY_PALACE_TEMPLATE_STORAGE_MODE || process.env.V3_MEMORY_PALACE_STORAGE_MODE
    );
  }

  private async getPrismaClient(): Promise<MemoryPalaceTemplatePrismaClient> {
    if (this.prismaClient) {
      return this.prismaClient;
    }

    const dbModule = await import('../../database');
    this.prismaClient = dbModule.prisma as unknown as MemoryPalaceTemplatePrismaClient;
    return this.prismaClient;
  }

  private normalizeStatusOrThrow(value: string): MemoryPalaceTemplateStatus {
    const normalized = value.trim().toUpperCase();
    if (!TEMPLATE_STATUS_SET.has(normalized)) {
      throw new AppError(400, 'template status is invalid', 'INVALID_INPUT', {
        status: value,
      });
    }
    return normalized as MemoryPalaceTemplateStatus;
  }

  private normalizeReviewDecisionOrThrow(value: string): MemoryPalaceTemplateReviewDecision {
    const normalized = value.trim().toUpperCase();
    if (!TEMPLATE_REVIEW_DECISION_SET.has(normalized)) {
      throw new AppError(400, 'review decision is invalid', 'INVALID_INPUT', {
        decision: value,
      });
    }
    return normalized as MemoryPalaceTemplateReviewDecision;
  }

  private mapRecordToReadModel(record: any): MemoryPalaceTemplateReadModel {
    const config = parseConfigObject(record?.config);
    const flags = parseConfigObject(config.flags);
    const review = parseConfigObject(config.review);

    const model: MemoryPalaceTemplateState = {
      id: normalizeTemplateId(String(record?.id || '')),
      slug: normalizeTemplateSlug(String(record?.slug || '')),
      name:
        typeof record?.name === 'string' && record.name.trim().length > 0
          ? record.name.trim()
          : 'Untitled Template',
      summary:
        typeof config.summary === 'string' && config.summary.trim().length > 0
          ? config.summary.trim()
          : null,
      status: normalizeStatus(record?.status),
      featureEnabled: Boolean(flags.featureEnabled),
      createdByAppId:
        typeof record?.createdByAppId === 'string' && record.createdByAppId.trim().length > 0
          ? record.createdByAppId.trim()
          : 'unknown',
      createdAt: toIso(record?.createdAt),
      updatedAt: toIso(record?.updatedAt),
      theme: mapThemeFromConfig(config),
      review: {
        submittedAt:
          typeof review.submittedAt === 'string' && review.submittedAt.trim().length > 0
            ? toIso(review.submittedAt)
            : null,
        reviewedAt:
          typeof review.reviewedAt === 'string' && review.reviewedAt.trim().length > 0
            ? toIso(review.reviewedAt)
            : null,
        reviewedByActor:
          typeof review.reviewedByActor === 'string' && review.reviewedByActor.trim().length > 0
            ? review.reviewedByActor.trim()
            : null,
        note:
          typeof review.note === 'string' && review.note.trim().length > 0
            ? review.note.trim()
            : null,
      },
    };

    return cloneTemplate(model);
  }
}

export const v3MemoryPalaceTemplatePackService = new MemoryPalaceTemplatePackService();

export const resetV3MemoryPalaceTemplatePackStoreForTest = (): void => {
  v3MemoryPalaceTemplatePackService.resetForTest();
};
