import { randomUUID } from 'crypto';
import { AppError } from '../../middlewares/errorHandler';
import { v3MemoryPalaceTemplatePackService } from '../memory-palace-templates/template-pack.service';

const WORLD_ID_PATTERN = /^mpw_[a-z0-9]+$/;
const VISIT_ID_PATTERN = /^mpv_[a-z0-9]+$/;

export const MEMORY_PALACE_WORLD_STATUSES = ['ACTIVE', 'ARCHIVED'] as const;
export const MEMORY_PALACE_COLLABORATOR_ROLES = ['OWNER', 'CONTRIBUTOR', 'EDITOR'] as const;
export const MEMORY_PALACE_CONTRIBUTION_TYPES = ['WITNESS_NOTE', 'RELIC_PLACEMENT', 'PHOTO', 'MEMORY_FRAGMENT'] as const;
export const MEMORY_PALACE_VISIT_ENTRY_TYPES = ['GUESTBOOK', 'WITNESS'] as const;

type CollaborativeMemoryStorageMode = 'prisma' | 'memory';

export type MemoryPalaceWorldStatus = (typeof MEMORY_PALACE_WORLD_STATUSES)[number];
export type MemoryPalaceCollaboratorRole = (typeof MEMORY_PALACE_COLLABORATOR_ROLES)[number];
export type MemoryPalaceContributionType = (typeof MEMORY_PALACE_CONTRIBUTION_TYPES)[number];
export type MemoryPalaceVisitEntryType = (typeof MEMORY_PALACE_VISIT_ENTRY_TYPES)[number];

interface CollaborativeMemoryPrismaClient {
  memoryPalaceWorld: {
    create: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any | null>;
    update: (args: any) => Promise<any>;
  };
  memoryPalaceCollaborator: {
    upsert: (args: any) => Promise<any>;
  };
  memoryPalaceContribution: {
    create: (args: any) => Promise<any>;
  };
  memoryPalaceVisit: {
    create: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any | null>;
    findMany: (args: any) => Promise<any[]>;
    count: (args: any) => Promise<number>;
  };
  memoryPalaceExhibit: {
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    delete: (args: any) => Promise<any>;
    count: (args: any) => Promise<number>;
  };
  domainEvent: {
    create: (args: any) => Promise<any>;
  };
  $transaction: (args: any) => Promise<any>;
}

export interface MemoryPalaceCollaboratorReadModel {
  appId: string;
  role: MemoryPalaceCollaboratorRole;
  addedByActor: string;
  createdAt: string;
}

export interface MemoryPalaceContributionReadModel {
  id: string;
  appId: string;
  actor: string;
  type: MemoryPalaceContributionType;
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface MemoryPalaceVisitReadModel {
  id: string;
  worldId: string;
  visitorAppId: string;
  visitorActor: string;
  entryType: MemoryPalaceVisitEntryType;
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

export interface MemoryPalaceVisitListReadModel {
  worldId: string;
  total: number;
  featuredCount: number;
  items: MemoryPalaceVisitReadModel[];
}

export interface MemoryPalaceFeatureVisitResult {
  worldId: string;
  visitId: string;
  featured: boolean;
  exhibitId: string | null;
  featuredAt: string | null;
  featuredByActor: string | null;
  reason: string | null;
}

export interface MemoryPalaceWorldReadModel {
  id: string;
  journeyId: string;
  title: string;
  summary: string | null;
  templateSlug: string | null;
  status: MemoryPalaceWorldStatus;
  ownerAppId: string;
  createdAt: string;
  updatedAt: string;
  collaborators: MemoryPalaceCollaboratorReadModel[];
  contributions: MemoryPalaceContributionReadModel[];
  metrics: {
    collaboratorCount: number;
    contributionCount: number;
  };
}

interface MemoryPalaceWorldState extends MemoryPalaceWorldReadModel {}
interface MemoryPalaceVisitState extends MemoryPalaceVisitReadModel {}

interface MemoryPalaceExhibitState {
  id: string;
  worldId: string;
  visitId: string;
  featuredByActor: string;
  featureReason: string | null;
  featuredAt: string;
  metadata: Record<string, unknown> | null;
  requestId: string | null;
}

export interface CreateMemoryPalaceWorldCommand {
  journeyId: string;
  title?: string;
  summary?: string;
  templateSlug?: string;
  requestedBy: {
    appId: string;
    keyId: string;
    actor: string;
    requestId?: string | null;
  };
}

export interface AddMemoryPalaceCollaboratorCommand {
  worldId: string;
  collaboratorAppId: string;
  role?: Exclude<MemoryPalaceCollaboratorRole, 'OWNER'>;
  requestedBy: {
    appId: string;
    actor: string;
    requestId?: string | null;
  };
}

export interface AddMemoryPalaceContributionCommand {
  worldId: string;
  type: MemoryPalaceContributionType;
  content: string;
  metadata?: Record<string, unknown>;
  requestedBy: {
    appId: string;
    actor: string;
    requestId?: string | null;
  };
}

export interface AddMemoryPalaceVisitCommand {
  worldId: string;
  entryType?: MemoryPalaceVisitEntryType;
  message: string;
  metadata?: Record<string, unknown>;
  requestedBy: {
    appId: string;
    keyId: string;
    actor: string;
    requestId?: string | null;
  };
}

export interface FeatureMemoryPalaceVisitCommand {
  worldId: string;
  visitId: string;
  featured: boolean;
  reason?: string;
  metadata?: Record<string, unknown>;
  requestedBy: {
    actor: string;
    requestId?: string | null;
  };
}

const WORLD_STATUS_SET = new Set<string>(MEMORY_PALACE_WORLD_STATUSES);
const COLLABORATOR_ROLE_SET = new Set<string>(MEMORY_PALACE_COLLABORATOR_ROLES);
const CONTRIBUTION_TYPE_SET = new Set<string>(MEMORY_PALACE_CONTRIBUTION_TYPES);
const VISIT_ENTRY_TYPE_SET = new Set<string>(MEMORY_PALACE_VISIT_ENTRY_TYPES);

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

const toStorageMode = (raw: string | undefined): CollaborativeMemoryStorageMode => {
  if (raw?.trim().toLowerCase() === 'memory') {
    return 'memory';
  }
  return 'prisma';
};

const isCollaborativeMemoryWriteEnabled = (): boolean =>
  parseBoolean(process.env.V3_MEMORY_PALACE_COLLAB_ENABLED, true);

const isVisitWriteEnabled = (): boolean =>
  parseBoolean(process.env.V3_MEMORY_PALACE_VISIT_WRITE_ENABLED, true);

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

const normalizeWorldId = (worldId: string): string => {
  const normalized = worldId.trim().toLowerCase();
  if (!WORLD_ID_PATTERN.test(normalized)) {
    throw new AppError(400, 'worldId is invalid', 'INVALID_INPUT', {
      worldId,
    });
  }
  return normalized;
};

const normalizeVisitId = (visitId: string): string => {
  const normalized = visitId.trim().toLowerCase();
  if (!VISIT_ID_PATTERN.test(normalized)) {
    throw new AppError(400, 'visitId is invalid', 'INVALID_INPUT', {
      visitId,
    });
  }
  return normalized;
};

const clampLimit = (value: number | undefined, fallback: number, max: number): number => {
  if (!Number.isInteger(value) || !value || value <= 0) {
    return fallback;
  }
  return Math.min(value, max);
};

const toWorldId = (): string => `mpw_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
const toContributionId = (): string => `mpc_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
const toVisitId = (): string => `mpv_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
const toExhibitId = (): string => `mpe_${randomUUID().replace(/-/g, '').slice(0, 24)}`;

const cloneWorld = (world: MemoryPalaceWorldState): MemoryPalaceWorldReadModel => ({
  ...world,
  collaborators: world.collaborators.map((item) => ({ ...item })),
  contributions: world.contributions.map((item) => ({
    ...item,
    metadata: item.metadata ? { ...item.metadata } : null,
  })),
  metrics: {
    ...world.metrics,
  },
});

const cloneVisit = (visit: MemoryPalaceVisitState): MemoryPalaceVisitReadModel => ({
  ...visit,
  metadata: visit.metadata ? { ...visit.metadata } : null,
  featured: {
    ...visit.featured,
  },
});

const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

export class CollaborativeMemoryService {
  private readonly worlds = new Map<string, MemoryPalaceWorldState>();
  private readonly visitsByWorld = new Map<string, MemoryPalaceVisitState[]>();
  private readonly exhibitsByVisitId = new Map<string, MemoryPalaceExhibitState>();
  private prismaClient?: CollaborativeMemoryPrismaClient;

  constructor(deps?: { prismaClient?: CollaborativeMemoryPrismaClient }) {
    this.prismaClient = deps?.prismaClient;
  }

  async createWorld(input: CreateMemoryPalaceWorldCommand): Promise<MemoryPalaceWorldReadModel> {
    this.assertCollaborativeWriteEnabled();

    const journeyId = normalizeNonEmpty(input.journeyId, 'journeyId', 80);
    const title = input.title?.trim()
      ? normalizeNonEmpty(input.title, 'title', 120)
      : 'Collaborative Memory World';
    const summary = input.summary?.trim() ? normalizeNonEmpty(input.summary, 'summary', 500) : null;
    const templateSlug = input.templateSlug?.trim()
      ? this.normalizeTemplateSlug(input.templateSlug)
      : null;

    if (templateSlug) {
      await v3MemoryPalaceTemplatePackService.assertTemplateAvailableForWorld({
        templateSlug,
      });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const worldId = toWorldId();
    const ownerCollaborator: MemoryPalaceCollaboratorReadModel = {
      appId: input.requestedBy.appId,
      role: 'OWNER',
      addedByActor: input.requestedBy.actor,
      createdAt: nowIso,
    };

    const state: MemoryPalaceWorldState = {
      id: worldId,
      journeyId,
      title,
      summary,
      templateSlug,
      status: 'ACTIVE',
      ownerAppId: input.requestedBy.appId,
      createdAt: nowIso,
      updatedAt: nowIso,
      collaborators: [ownerCollaborator],
      contributions: [],
      metrics: {
        collaboratorCount: 1,
        contributionCount: 0,
      },
    };

    if (this.getStorageMode() === 'memory') {
      this.worlds.set(state.id, state);
      this.visitsByWorld.set(state.id, []);
      return cloneWorld(state);
    }

    const prisma = await this.getPrismaClient();
    const persisted = await prisma.$transaction(async (tx: CollaborativeMemoryPrismaClient) => {
      const created = await tx.memoryPalaceWorld.create({
        data: {
          id: state.id,
          journeyId: state.journeyId,
          title: state.title,
          summary: state.summary,
          templateSlug: state.templateSlug,
          status: state.status,
          ownerAppId: input.requestedBy.appId,
          ownerKeyId: input.requestedBy.keyId,
          createdByActor: input.requestedBy.actor,
          requestId: input.requestedBy.requestId?.trim() || null,
          createdAt: now,
          updatedAt: now,
          collaborators: {
            create: [
              {
                appId: ownerCollaborator.appId,
                role: ownerCollaborator.role,
                addedByActor: ownerCollaborator.addedByActor,
                createdAt: now,
              },
            ],
          },
        },
        include: {
          collaborators: true,
          contributions: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 50,
          },
        },
      });

      await tx.domainEvent.create({
        data: {
          aggregateType: 'MemoryPalaceWorld',
          aggregateId: state.id,
          eventType: 'MemoryPalaceWorldCreated',
          payload: {
            worldId: state.id,
            journeyId: state.journeyId,
            ownerAppId: input.requestedBy.appId,
            templateSlug: state.templateSlug,
            title: state.title,
          },
          requestId: input.requestedBy.requestId?.trim() || null,
          source: 'api.v3.memory-palaces.create',
        },
      });

      return created;
    });

    return this.mapRecordToReadModel(persisted);
  }

  async getWorldById(input: { worldId: string; scopeAppId: string }): Promise<MemoryPalaceWorldReadModel> {
    const worldId = normalizeWorldId(input.worldId);

    if (this.getStorageMode() === 'memory') {
      const world = this.getWorldByIdOrThrow({
        worldId,
        scopeAppId: input.scopeAppId,
      });
      return cloneWorld(world);
    }

    const prisma = await this.getPrismaClient();
    const record = await prisma.memoryPalaceWorld.findFirst({
      where: {
        id: worldId,
        collaborators: {
          some: {
            appId: input.scopeAppId,
          },
        },
      },
      include: {
        collaborators: true,
        contributions: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 50,
        },
      },
    });

    if (!record) {
      throw new AppError(404, 'memory palace world not found', 'NOT_FOUND', {
        worldId,
      });
    }

    return this.mapRecordToReadModel(record);
  }

  async addCollaborator(input: AddMemoryPalaceCollaboratorCommand): Promise<MemoryPalaceWorldReadModel> {
    this.assertCollaborativeWriteEnabled();

    const worldId = normalizeWorldId(input.worldId);
    const collaboratorAppId = normalizeNonEmpty(input.collaboratorAppId, 'collaboratorAppId', 64);
    const collaboratorRole = this.normalizeCollaboratorRole(input.role || 'CONTRIBUTOR');
    const now = new Date();
    const nowIso = now.toISOString();

    if (collaboratorRole === 'OWNER') {
      throw new AppError(400, 'collaborator role cannot be OWNER', 'INVALID_INPUT', {
        role: input.role,
      });
    }

    if (this.getStorageMode() === 'memory') {
      const world = this.getWorldByIdOrThrow({
        worldId,
        scopeAppId: input.requestedBy.appId,
      });

      this.assertOwner(world, input.requestedBy.appId);

      const existing = world.collaborators.find((item) => item.appId === collaboratorAppId);
      if (existing) {
        existing.role = collaboratorRole;
      } else {
        world.collaborators.push({
          appId: collaboratorAppId,
          role: collaboratorRole,
          addedByActor: input.requestedBy.actor,
          createdAt: nowIso,
        });
      }
      world.updatedAt = nowIso;
      world.metrics.collaboratorCount = world.collaborators.length;
      return cloneWorld(world);
    }

    const prisma = await this.getPrismaClient();
    const persisted = await prisma.$transaction(async (tx: CollaborativeMemoryPrismaClient) => {
      const existingWorld = await tx.memoryPalaceWorld.findFirst({
        where: {
          id: worldId,
          collaborators: {
            some: {
              appId: input.requestedBy.appId,
            },
          },
        },
      });

      if (!existingWorld) {
        throw new AppError(404, 'memory palace world not found', 'NOT_FOUND', {
          worldId,
        });
      }

      if (existingWorld.ownerAppId !== input.requestedBy.appId) {
        throw new AppError(403, 'only owner can manage collaborators', 'FORBIDDEN', {
          worldId,
          appId: input.requestedBy.appId,
        });
      }

      await tx.memoryPalaceCollaborator.upsert({
        where: {
          worldId_appId: {
            worldId,
            appId: collaboratorAppId,
          },
        },
        create: {
          worldId,
          appId: collaboratorAppId,
          role: collaboratorRole,
          addedByActor: input.requestedBy.actor,
          createdAt: now,
        },
        update: {
          role: collaboratorRole,
          addedByActor: input.requestedBy.actor,
        },
      });

      await tx.memoryPalaceWorld.update({
        where: {
          id: worldId,
        },
        data: {
          updatedAt: now,
        },
      });

      await tx.domainEvent.create({
        data: {
          aggregateType: 'MemoryPalaceWorld',
          aggregateId: worldId,
          eventType: 'MemoryPalaceCollaboratorUpserted',
          payload: {
            worldId,
            collaboratorAppId,
            role: collaboratorRole,
            updatedByActor: input.requestedBy.actor,
          },
          requestId: input.requestedBy.requestId?.trim() || null,
          source: 'api.v3.memory-palaces.collaborators.upsert',
        },
      });

      return tx.memoryPalaceWorld.findFirst({
        where: {
          id: worldId,
        },
        include: {
          collaborators: true,
          contributions: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 50,
          },
        },
      });
    });

    if (!persisted) {
      throw new AppError(404, 'memory palace world not found', 'NOT_FOUND', {
        worldId,
      });
    }

    return this.mapRecordToReadModel(persisted);
  }

  async addContribution(input: AddMemoryPalaceContributionCommand): Promise<MemoryPalaceWorldReadModel> {
    this.assertCollaborativeWriteEnabled();

    const worldId = normalizeWorldId(input.worldId);
    const type = this.normalizeContributionType(input.type);
    const content = normalizeNonEmpty(input.content, 'content', 800);
    const metadata = input.metadata ? this.normalizeMetadata(input.metadata) : null;
    const now = new Date();
    const nowIso = now.toISOString();

    if (this.getStorageMode() === 'memory') {
      const world = this.getWorldByIdOrThrow({
        worldId,
        scopeAppId: input.requestedBy.appId,
      });
      const isCollaborator = world.collaborators.some((item) => item.appId === input.requestedBy.appId);
      if (!isCollaborator) {
        throw new AppError(404, 'memory palace world not found', 'NOT_FOUND', {
          worldId,
        });
      }

      world.contributions.unshift({
        id: toContributionId(),
        appId: input.requestedBy.appId,
        actor: input.requestedBy.actor,
        type,
        content,
        metadata,
        createdAt: nowIso,
      });
      world.updatedAt = nowIso;
      world.metrics.contributionCount = world.contributions.length;
      return cloneWorld(world);
    }

    const prisma = await this.getPrismaClient();
    const persisted = await prisma.$transaction(async (tx: CollaborativeMemoryPrismaClient) => {
      const existingWorld = await tx.memoryPalaceWorld.findFirst({
        where: {
          id: worldId,
          collaborators: {
            some: {
              appId: input.requestedBy.appId,
            },
          },
        },
      });

      if (!existingWorld) {
        throw new AppError(404, 'memory palace world not found', 'NOT_FOUND', {
          worldId,
        });
      }

      const contributionId = toContributionId();
      await tx.memoryPalaceContribution.create({
        data: {
          id: contributionId,
          worldId,
          appId: input.requestedBy.appId,
          actor: input.requestedBy.actor,
          type,
          content,
          metadata,
          requestId: input.requestedBy.requestId?.trim() || null,
          createdAt: now,
        },
      });

      await tx.memoryPalaceWorld.update({
        where: {
          id: worldId,
        },
        data: {
          updatedAt: now,
        },
      });

      await tx.domainEvent.create({
        data: {
          aggregateType: 'MemoryPalaceWorld',
          aggregateId: worldId,
          eventType: 'MemoryPalaceContributionAdded',
          payload: {
            worldId,
            type,
            appId: input.requestedBy.appId,
            actor: input.requestedBy.actor,
            contentPreview: content.slice(0, 80),
          },
          requestId: input.requestedBy.requestId?.trim() || null,
          source: 'api.v3.memory-palaces.contributions.create',
        },
      });

      return tx.memoryPalaceWorld.findFirst({
        where: {
          id: worldId,
        },
        include: {
          collaborators: true,
          contributions: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 50,
          },
        },
      });
    });

    if (!persisted) {
      throw new AppError(404, 'memory palace world not found', 'NOT_FOUND', {
        worldId,
      });
    }

    return this.mapRecordToReadModel(persisted);
  }

  async addVisit(input: AddMemoryPalaceVisitCommand): Promise<MemoryPalaceVisitReadModel> {
    this.assertVisitWriteEnabled();

    const worldId = normalizeWorldId(input.worldId);
    const entryType = this.normalizeVisitEntryType(input.entryType || 'GUESTBOOK');
    const message = normalizeNonEmpty(input.message, 'message', 280);
    const metadata = input.metadata ? this.normalizeMetadata(input.metadata) : null;
    const now = new Date();
    const nowIso = now.toISOString();

    if (this.getStorageMode() === 'memory') {
      const world = this.getWorldForVisitOrThrow(worldId);
      this.assertWorldIsActive(world);

      const visit: MemoryPalaceVisitState = {
        id: toVisitId(),
        worldId,
        visitorAppId: input.requestedBy.appId,
        visitorActor: input.requestedBy.actor,
        entryType,
        message,
        metadata,
        createdAt: nowIso,
        featured: {
          isFeatured: false,
          exhibitId: null,
          featuredAt: null,
          featuredByActor: null,
          reason: null,
        },
      };

      const visits = this.visitsByWorld.get(worldId) || [];
      visits.unshift(visit);
      this.visitsByWorld.set(worldId, visits);
      world.updatedAt = nowIso;
      return cloneVisit(visit);
    }

    const prisma = await this.getPrismaClient();
    const visitRecord = await prisma.$transaction(async (tx: CollaborativeMemoryPrismaClient) => {
      const world = await tx.memoryPalaceWorld.findFirst({
        where: {
          id: worldId,
        },
      });

      if (!world || String(world.status || '').toUpperCase() !== 'ACTIVE') {
        throw new AppError(404, 'memory palace world not found', 'NOT_FOUND', {
          worldId,
        });
      }

      const created = await tx.memoryPalaceVisit.create({
        data: {
          id: toVisitId(),
          worldId,
          visitorAppId: input.requestedBy.appId,
          visitorKeyId: input.requestedBy.keyId,
          visitorActor: input.requestedBy.actor,
          entryType,
          message,
          metadata,
          requestId: input.requestedBy.requestId?.trim() || null,
          createdAt: now,
        },
        include: {
          featuredExhibit: true,
        },
      });

      await tx.memoryPalaceWorld.update({
        where: {
          id: worldId,
        },
        data: {
          updatedAt: now,
        },
      });

      await tx.domainEvent.create({
        data: {
          aggregateType: 'MemoryPalaceWorld',
          aggregateId: worldId,
          eventType: 'MemoryPalaceVisitLogged',
          payload: {
            worldId,
            visitId: created.id,
            entryType,
            visitorAppId: input.requestedBy.appId,
            visitorActor: input.requestedBy.actor,
            messagePreview: message.slice(0, 80),
          },
          requestId: input.requestedBy.requestId?.trim() || null,
          source: 'api.v3.memory-palaces.visits.create',
        },
      });

      return created;
    });

    return this.mapVisitRecordToReadModel(visitRecord);
  }

  async listVisits(input: {
    worldId: string;
    scopeAppId: string;
    limit?: number;
  }): Promise<MemoryPalaceVisitListReadModel> {
    const worldId = normalizeWorldId(input.worldId);
    const limit = clampLimit(input.limit, 20, 100);

    if (this.getStorageMode() === 'memory') {
      this.getWorldByIdOrThrow({
        worldId,
        scopeAppId: input.scopeAppId,
      });

      const visits = (this.visitsByWorld.get(worldId) || [])
        .slice()
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

      const featuredCount = visits.filter((item) => item.featured.isFeatured).length;
      return {
        worldId,
        total: visits.length,
        featuredCount,
        items: visits.slice(0, limit).map((item) => cloneVisit(item)),
      };
    }

    const prisma = await this.getPrismaClient();

    const world = await prisma.memoryPalaceWorld.findFirst({
      where: {
        id: worldId,
        collaborators: {
          some: {
            appId: input.scopeAppId,
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (!world) {
      throw new AppError(404, 'memory palace world not found', 'NOT_FOUND', {
        worldId,
      });
    }

    const [visits, total, featuredCount] = await Promise.all([
      prisma.memoryPalaceVisit.findMany({
        where: {
          worldId,
        },
        include: {
          featuredExhibit: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      }),
      prisma.memoryPalaceVisit.count({
        where: {
          worldId,
        },
      }),
      prisma.memoryPalaceExhibit.count({
        where: {
          worldId,
        },
      }),
    ]);

    return {
      worldId,
      total,
      featuredCount,
      items: visits.map((item) => this.mapVisitRecordToReadModel(item)),
    };
  }

  async featureVisitByAdmin(input: FeatureMemoryPalaceVisitCommand): Promise<MemoryPalaceFeatureVisitResult> {
    const worldId = normalizeWorldId(input.worldId);
    const visitId = normalizeVisitId(input.visitId);
    const featured = Boolean(input.featured);
    const reason = input.reason?.trim() ? normalizeNonEmpty(input.reason, 'reason', 240) : null;
    const metadata = input.metadata ? this.normalizeMetadata(input.metadata) : null;
    const actor = normalizeNonEmpty(input.requestedBy.actor, 'actor', 120).toLowerCase();
    const now = new Date();
    const nowIso = now.toISOString();

    if (this.getStorageMode() === 'memory') {
      const world = this.getWorldForVisitOrThrow(worldId);
      this.assertWorldIsActive(world);

      const visits = this.visitsByWorld.get(worldId) || [];
      const visit = visits.find((item) => item.id === visitId);

      if (!visit) {
        throw new AppError(404, 'memory palace visit not found', 'NOT_FOUND', {
          worldId,
          visitId,
        });
      }

      if (featured) {
        const existing = this.exhibitsByVisitId.get(visitId);
        const exhibit: MemoryPalaceExhibitState = {
          id: existing?.id || toExhibitId(),
          worldId,
          visitId,
          featuredByActor: actor,
          featureReason: reason,
          featuredAt: nowIso,
          metadata,
          requestId: input.requestedBy.requestId?.trim() || null,
        };

        this.exhibitsByVisitId.set(visitId, exhibit);
        visit.featured = {
          isFeatured: true,
          exhibitId: exhibit.id,
          featuredAt: exhibit.featuredAt,
          featuredByActor: exhibit.featuredByActor,
          reason: exhibit.featureReason,
        };
      } else {
        this.exhibitsByVisitId.delete(visitId);
        visit.featured = {
          isFeatured: false,
          exhibitId: null,
          featuredAt: null,
          featuredByActor: null,
          reason: null,
        };
      }

      world.updatedAt = nowIso;
      return {
        worldId,
        visitId,
        featured: visit.featured.isFeatured,
        exhibitId: visit.featured.exhibitId,
        featuredAt: visit.featured.featuredAt,
        featuredByActor: visit.featured.featuredByActor,
        reason: visit.featured.reason,
      };
    }

    const prisma = await this.getPrismaClient();
    const result = await prisma.$transaction(async (tx: CollaborativeMemoryPrismaClient) => {
      const visit = await tx.memoryPalaceVisit.findFirst({
        where: {
          id: visitId,
          worldId,
        },
        include: {
          featuredExhibit: true,
        },
      });

      if (!visit) {
        throw new AppError(404, 'memory palace visit not found', 'NOT_FOUND', {
          worldId,
          visitId,
        });
      }

      let exhibit = visit.featuredExhibit || null;

      if (featured) {
        if (visit.featuredExhibit) {
          exhibit = await tx.memoryPalaceExhibit.update({
            where: {
              id: visit.featuredExhibit.id,
            },
            data: {
              featuredByActor: actor,
              featureReason: reason,
              metadata,
              requestId: input.requestedBy.requestId?.trim() || null,
              featuredAt: now,
            },
          });
        } else {
          exhibit = await tx.memoryPalaceExhibit.create({
            data: {
              id: toExhibitId(),
              worldId,
              visitId,
              featuredByActor: actor,
              featureReason: reason,
              metadata,
              requestId: input.requestedBy.requestId?.trim() || null,
              featuredAt: now,
            },
          });
        }
      } else if (visit.featuredExhibit) {
        await tx.memoryPalaceExhibit.delete({
          where: {
            id: visit.featuredExhibit.id,
          },
        });
        exhibit = null;
      }

      await tx.memoryPalaceWorld.update({
        where: {
          id: worldId,
        },
        data: {
          updatedAt: now,
        },
      });

      await tx.domainEvent.create({
        data: {
          aggregateType: 'MemoryPalaceWorld',
          aggregateId: worldId,
          eventType: featured ? 'MemoryPalaceVisitFeatured' : 'MemoryPalaceVisitUnfeatured',
          payload: {
            worldId,
            visitId,
            featured,
            featuredByActor: actor,
            reason,
          },
          requestId: input.requestedBy.requestId?.trim() || null,
          source: 'admin.v3.memory-palaces.feature',
        },
      });

      return {
        visit,
        exhibit,
      };
    });

    return {
      worldId,
      visitId,
      featured: Boolean(result.exhibit),
      exhibitId: result.exhibit?.id || null,
      featuredAt: result.exhibit ? toIso(result.exhibit.featuredAt) : null,
      featuredByActor: result.exhibit?.featuredByActor || null,
      reason:
        typeof result.exhibit?.featureReason === 'string' && result.exhibit.featureReason.trim().length > 0
          ? result.exhibit.featureReason.trim()
          : null,
    };
  }

  resetForTest(): void {
    this.worlds.clear();
    this.visitsByWorld.clear();
    this.exhibitsByVisitId.clear();
  }

  private assertCollaborativeWriteEnabled(): void {
    if (isCollaborativeMemoryWriteEnabled()) {
      return;
    }

    throw new AppError(503, 'collaborative memory writes are disabled', 'MEMORY_COLLAB_DISABLED', {
      envFlag: 'V3_MEMORY_PALACE_COLLAB_ENABLED',
    });
  }

  private assertVisitWriteEnabled(): void {
    if (isVisitWriteEnabled()) {
      return;
    }

    throw new AppError(503, 'memory palace visit writes are disabled', 'MEMORY_VISIT_WRITE_DISABLED', {
      envFlag: 'V3_MEMORY_PALACE_VISIT_WRITE_ENABLED',
    });
  }

  private getStorageMode(): CollaborativeMemoryStorageMode {
    return toStorageMode(process.env.V3_MEMORY_PALACE_STORAGE_MODE);
  }

  private async getPrismaClient(): Promise<CollaborativeMemoryPrismaClient> {
    if (this.prismaClient) {
      return this.prismaClient;
    }

    const dbModule = await import('../../database');
    this.prismaClient = dbModule.prisma as unknown as CollaborativeMemoryPrismaClient;
    return this.prismaClient;
  }

  private getWorldByIdOrThrow(input: { worldId: string; scopeAppId: string }): MemoryPalaceWorldState {
    const world = this.worlds.get(input.worldId);
    if (!world) {
      throw new AppError(404, 'memory palace world not found', 'NOT_FOUND', {
        worldId: input.worldId,
      });
    }

    const canAccess = world.collaborators.some((item) => item.appId === input.scopeAppId);
    if (!canAccess) {
      throw new AppError(404, 'memory palace world not found', 'NOT_FOUND', {
        worldId: input.worldId,
      });
    }

    return world;
  }

  private getWorldForVisitOrThrow(worldId: string): MemoryPalaceWorldState {
    const world = this.worlds.get(worldId);
    if (!world) {
      throw new AppError(404, 'memory palace world not found', 'NOT_FOUND', {
        worldId,
      });
    }
    return world;
  }

  private assertWorldIsActive(world: MemoryPalaceWorldState): void {
    if (world.status === 'ACTIVE') {
      return;
    }

    throw new AppError(409, 'memory palace world is not active', 'INVALID_STATE', {
      worldId: world.id,
      status: world.status,
    });
  }

  private assertOwner(world: MemoryPalaceWorldState, appId: string): void {
    if (world.ownerAppId === appId) {
      return;
    }

    throw new AppError(403, 'only owner can manage collaborators', 'FORBIDDEN', {
      worldId: world.id,
      appId,
    });
  }

  private normalizeTemplateSlug(value: string): string {
    const normalized = value.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized) || normalized.length > 64) {
      throw new AppError(400, 'templateSlug is invalid', 'INVALID_INPUT', {
        templateSlug: value,
      });
    }
    return normalized;
  }

  private normalizeCollaboratorRole(value: string): MemoryPalaceCollaboratorRole {
    const normalized = value.trim().toUpperCase();
    if (!COLLABORATOR_ROLE_SET.has(normalized)) {
      throw new AppError(400, 'collaborator role is invalid', 'INVALID_INPUT', {
        role: value,
      });
    }
    return normalized as MemoryPalaceCollaboratorRole;
  }

  private normalizeContributionType(value: string): MemoryPalaceContributionType {
    const normalized = value.trim().toUpperCase();
    if (!CONTRIBUTION_TYPE_SET.has(normalized)) {
      throw new AppError(400, 'contribution type is invalid', 'INVALID_INPUT', {
        type: value,
      });
    }
    return normalized as MemoryPalaceContributionType;
  }

  private normalizeVisitEntryType(value: string): MemoryPalaceVisitEntryType {
    const normalized = value.trim().toUpperCase();
    if (!VISIT_ENTRY_TYPE_SET.has(normalized)) {
      throw new AppError(400, 'visit entry type is invalid', 'INVALID_INPUT', {
        entryType: value,
      });
    }
    return normalized as MemoryPalaceVisitEntryType;
  }

  private normalizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    if (Array.isArray(metadata) || typeof metadata !== 'object' || metadata === null) {
      throw new AppError(400, 'metadata must be an object', 'INVALID_INPUT', {
        field: 'metadata',
      });
    }

    return metadata;
  }

  private mapVisitRecordToReadModel(record: any): MemoryPalaceVisitReadModel {
    const featured = record?.featuredExhibit;
    const exhibitId =
      typeof featured?.id === 'string' && featured.id.trim().length > 0
        ? featured.id.trim().toLowerCase()
        : null;

    const entryTypeRaw = typeof record?.entryType === 'string' ? record.entryType.toUpperCase() : 'GUESTBOOK';
    const entryType = VISIT_ENTRY_TYPE_SET.has(entryTypeRaw)
      ? (entryTypeRaw as MemoryPalaceVisitEntryType)
      : 'GUESTBOOK';

    return {
      id: normalizeVisitId(String(record?.id || '')),
      worldId: normalizeWorldId(String(record?.worldId || '')),
      visitorAppId:
        typeof record?.visitorAppId === 'string' && record.visitorAppId.trim().length > 0
          ? record.visitorAppId.trim()
          : 'unknown',
      visitorActor:
        typeof record?.visitorActor === 'string' && record.visitorActor.trim().length > 0
          ? record.visitorActor.trim()
          : 'unknown',
      entryType,
      message:
        typeof record?.message === 'string' && record.message.trim().length > 0
          ? record.message.trim()
          : '',
      metadata:
        record?.metadata && typeof record.metadata === 'object' && !Array.isArray(record.metadata)
          ? (record.metadata as Record<string, unknown>)
          : null,
      createdAt: toIso(record?.createdAt || new Date()),
      featured: {
        isFeatured: Boolean(exhibitId),
        exhibitId,
        featuredAt: featured?.featuredAt ? toIso(featured.featuredAt) : null,
        featuredByActor:
          typeof featured?.featuredByActor === 'string' && featured.featuredByActor.trim().length > 0
            ? featured.featuredByActor.trim()
            : null,
        reason:
          typeof featured?.featureReason === 'string' && featured.featureReason.trim().length > 0
            ? featured.featureReason.trim()
            : null,
      },
    };
  }

  private mapRecordToReadModel(record: any): MemoryPalaceWorldReadModel {
    const collaborators: MemoryPalaceCollaboratorReadModel[] = Array.isArray(record?.collaborators)
      ? record.collaborators
          .map((item: any) => {
            const appId = typeof item?.appId === 'string' ? item.appId.trim() : '';
            if (!appId) {
              return null;
            }
            const roleRaw = typeof item?.role === 'string' ? item.role.toUpperCase() : 'CONTRIBUTOR';
            const role = COLLABORATOR_ROLE_SET.has(roleRaw)
              ? (roleRaw as MemoryPalaceCollaboratorRole)
              : 'CONTRIBUTOR';
            return {
              appId,
              role,
              addedByActor:
                typeof item?.addedByActor === 'string' && item.addedByActor.trim().length > 0
                  ? item.addedByActor.trim()
                  : 'system',
              createdAt: toIso(item?.createdAt || new Date()),
            } as MemoryPalaceCollaboratorReadModel;
          })
          .filter((item: MemoryPalaceCollaboratorReadModel | null): item is MemoryPalaceCollaboratorReadModel =>
            Boolean(item)
          )
      : [];

    const contributions: MemoryPalaceContributionReadModel[] = Array.isArray(record?.contributions)
      ? record.contributions
          .map((item: any) => {
            const id =
              typeof item?.id === 'string' && item.id.trim().length > 0 ? item.id.trim().toLowerCase() : null;
            if (!id) {
              return null;
            }

            const typeRaw = typeof item?.type === 'string' ? item.type.toUpperCase() : 'WITNESS_NOTE';
            const type = CONTRIBUTION_TYPE_SET.has(typeRaw)
              ? (typeRaw as MemoryPalaceContributionType)
              : 'WITNESS_NOTE';

            return {
              id,
              appId:
                typeof item?.appId === 'string' && item.appId.trim().length > 0
                  ? item.appId.trim()
                  : 'unknown',
              actor:
                typeof item?.actor === 'string' && item.actor.trim().length > 0
                  ? item.actor.trim()
                  : 'unknown',
              type,
              content:
                typeof item?.content === 'string' && item.content.trim().length > 0
                  ? item.content.trim()
                  : '',
              metadata:
                item?.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata)
                  ? (item.metadata as Record<string, unknown>)
                  : null,
              createdAt: toIso(item?.createdAt || new Date()),
            } as MemoryPalaceContributionReadModel;
          })
          .filter((item: MemoryPalaceContributionReadModel | null): item is MemoryPalaceContributionReadModel =>
            Boolean(item && item.content.length > 0)
          )
      : [];

    const statusRaw = typeof record?.status === 'string' ? record.status.toUpperCase() : 'ACTIVE';
    const status = WORLD_STATUS_SET.has(statusRaw) ? (statusRaw as MemoryPalaceWorldStatus) : 'ACTIVE';

    return {
      id: normalizeWorldId(String(record?.id || '')),
      journeyId: typeof record?.journeyId === 'string' ? record.journeyId : 'unknown',
      title: typeof record?.title === 'string' && record.title.trim().length > 0 ? record.title.trim() : 'Untitled',
      summary:
        typeof record?.summary === 'string' && record.summary.trim().length > 0 ? record.summary.trim() : null,
      templateSlug:
        typeof record?.templateSlug === 'string' && record.templateSlug.trim().length > 0
          ? record.templateSlug.trim().toLowerCase()
          : null,
      status,
      ownerAppId:
        typeof record?.ownerAppId === 'string' && record.ownerAppId.trim().length > 0
          ? record.ownerAppId.trim()
          : 'unknown',
      createdAt: toIso(record?.createdAt || new Date()),
      updatedAt: toIso(record?.updatedAt || new Date()),
      collaborators: collaborators.sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
      contributions: contributions.sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
      metrics: {
        collaboratorCount: collaborators.length,
        contributionCount: contributions.length,
      },
    };
  }
}

export const v3CollaborativeMemoryService = new CollaborativeMemoryService();

export const resetV3CollaborativeMemoryStoreForTest = (): void => {
  v3CollaborativeMemoryService.resetForTest();
};
