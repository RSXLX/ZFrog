import { createHash, randomUUID } from 'crypto';
import { AppError } from '../../middlewares/errorHandler';
import { assertCouncilRiskLevelEnabled } from './council-policy.service';

export const COUNCIL_SUGGESTION_STATUSES = ['OPEN', 'ACCEPTED', 'REJECTED', 'DEFERRED'] as const;
export const COUNCIL_SUGGESTION_DECISIONS = ['ACCEPT', 'REJECT', 'DEFER'] as const;
export const COUNCIL_SUGGESTION_RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH'] as const;

export type CouncilSuggestionStatus = (typeof COUNCIL_SUGGESTION_STATUSES)[number];
export type CouncilSuggestionDecision = (typeof COUNCIL_SUGGESTION_DECISIONS)[number];
export type CouncilSuggestionRiskLevel = (typeof COUNCIL_SUGGESTION_RISK_LEVELS)[number];

type CouncilSuggestionStorageMode = 'prisma' | 'memory';

export interface CouncilSuggestionDataSource {
  source: string;
  referenceId: string | null;
  freshness: string | null;
}

export interface CouncilSuggestionAction {
  id: string;
  label: string;
  detail: string;
}

export interface CouncilSuggestionReadModel {
  id: string;
  runId: string;
  title: string;
  focus: string;
  objective: string | null;
  rationale: string;
  risk: {
    level: CouncilSuggestionRiskLevel;
    reason: string;
  };
  dataSources: CouncilSuggestionDataSource[];
  suggestedActions: CouncilSuggestionAction[];
  status: CouncilSuggestionStatus;
  trace: {
    traceId: string;
    promptKitVersion: string;
    model: string;
    fingerprint: string;
  };
  createdAt: string;
  updatedAt: string;
  response: {
    decision: CouncilSuggestionDecision | null;
    note: string | null;
    respondedAt: string | null;
    respondedByActor: string | null;
  };
  audit: {
    createdByAppId: string;
    createdByKeyId: string;
    createdByActor: string;
    requestId: string | null;
    updatedByActor: string;
  };
}

interface CouncilSuggestionState extends CouncilSuggestionReadModel {}

export interface CreateCouncilSuggestionCommand {
  title?: string;
  focus: string;
  objective?: string;
  rationale?: string;
  riskLevel?: CouncilSuggestionRiskLevel;
  dataSources?: Array<{
    source: string;
    referenceId?: string;
    freshness?: string;
  }>;
  suggestedActions?: Array<{
    label: string;
    detail?: string;
  }>;
  requestedBy: {
    appId: string;
    keyId: string;
    actor: string;
    requestId?: string | null;
  };
}

export interface RespondCouncilSuggestionCommand {
  suggestionId: string;
  decision: CouncilSuggestionDecision;
  note?: string;
  requestedBy: {
    appId: string;
    actor: string;
  };
}

interface CouncilSuggestionPrismaClient {
  councilRun: {
    create: (args: any) => Promise<any>;
  };
  councilSuggestion: {
    create: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any | null>;
    findMany: (args: any) => Promise<any[]>;
    count: (args: any) => Promise<number>;
    update: (args: any) => Promise<any>;
  };
  councilResponse: {
    create: (args: any) => Promise<any>;
  };
  domainEvent: {
    create: (args: any) => Promise<any>;
  };
  $transaction: (args: any) => Promise<any>;
}

const SUGGESTION_ID_PATTERN = /^csg_[a-z0-9]+$/;
const SUGGESTION_STATUS_SET = new Set<string>(COUNCIL_SUGGESTION_STATUSES);
const SUGGESTION_DECISION_SET = new Set<string>(COUNCIL_SUGGESTION_DECISIONS);
const SUGGESTION_RISK_SET = new Set<string>(COUNCIL_SUGGESTION_RISK_LEVELS);

const parseBoolean = (raw: string | undefined, fallback: boolean): boolean => {
  if (raw === undefined) {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
};

const isCouncilActionsEnabled = (): boolean => parseBoolean(process.env.V3_COUNCIL_ACTIONS_ENABLED, true);

const toSuggestionId = (): string => `csg_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
const toRunId = (): string => `crn_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
const toTraceId = (): string => `trace_${randomUUID().replace(/-/g, '').slice(0, 20)}`;

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

const toIsoString = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const toStorageMode = (raw: string | undefined): CouncilSuggestionStorageMode => {
  if (raw?.trim().toLowerCase() === 'memory') {
    return 'memory';
  }
  return 'prisma';
};

const cloneSuggestion = (suggestion: CouncilSuggestionState): CouncilSuggestionReadModel => ({
  ...suggestion,
  risk: {
    ...suggestion.risk,
  },
  dataSources: suggestion.dataSources.map((item) => ({ ...item })),
  suggestedActions: suggestion.suggestedActions.map((item) => ({ ...item })),
  trace: {
    ...suggestion.trace,
  },
  response: {
    ...suggestion.response,
  },
  audit: {
    ...suggestion.audit,
  },
});

export class CouncilSuggestionService {
  private readonly suggestions = new Map<string, CouncilSuggestionState>();
  private readonly suggestionIdsByApp = new Map<string, string[]>();
  private prismaClient?: CouncilSuggestionPrismaClient;

  constructor(deps?: { prismaClient?: CouncilSuggestionPrismaClient }) {
    this.prismaClient = deps?.prismaClient;
  }

  async createSuggestion(input: CreateCouncilSuggestionCommand): Promise<CouncilSuggestionReadModel> {
    this.assertCouncilActionsEnabled();

    const focus = normalizeNonEmpty(input.focus, 'focus', 160);
    const title = input.title?.trim()
      ? normalizeNonEmpty(input.title, 'title', 120)
      : `Council Plan: ${focus}`.slice(0, 120);
    const objective = input.objective?.trim() || null;
    const dataSources = this.buildDataSources(input.dataSources, focus);
    const rationale = this.buildRationale(input.rationale, {
      focus,
      objective,
      dataSources,
    });
    const suggestedActions = this.buildSuggestedActions(input.suggestedActions, focus);

    const riskLevel = this.normalizeRiskLevel(input.riskLevel || 'MEDIUM');
    assertCouncilRiskLevelEnabled(riskLevel);
    const now = new Date();
    const nowIso = now.toISOString();
    const suggestionId = toSuggestionId();
    const runId = toRunId();

    const fingerprint = createHash('sha256')
      .update(
        JSON.stringify({
          focus,
          objective,
          riskLevel,
          dataSources,
          suggestedActions,
          rationale,
        })
      )
      .digest('hex')
      .slice(0, 16);

    const suggestion: CouncilSuggestionState = {
      id: suggestionId,
      runId,
      title,
      focus,
      objective,
      rationale,
      risk: {
        level: riskLevel,
        reason: this.buildRiskReason(riskLevel),
      },
      dataSources,
      suggestedActions,
      status: 'OPEN',
      trace: {
        traceId: toTraceId(),
        promptKitVersion: 'v3-council-suggest-v1',
        model: 'heuristic-council-planner',
        fingerprint,
      },
      createdAt: nowIso,
      updatedAt: nowIso,
      response: {
        decision: null,
        note: null,
        respondedAt: null,
        respondedByActor: null,
      },
      audit: {
        createdByAppId: input.requestedBy.appId,
        createdByKeyId: input.requestedBy.keyId,
        createdByActor: input.requestedBy.actor,
        requestId: input.requestedBy.requestId?.trim() || null,
        updatedByActor: input.requestedBy.actor,
      },
    };

    if (this.getStorageMode() === 'memory') {
      this.storeSuggestion(suggestion);
      return cloneSuggestion(suggestion);
    }

    const prisma = await this.getPrismaClient();
    await prisma.$transaction(async (tx: CouncilSuggestionPrismaClient) => {
      await tx.councilRun.create({
        data: {
          id: suggestion.runId,
          appId: suggestion.audit.createdByAppId,
          keyId: suggestion.audit.createdByKeyId,
          requestedByActor: suggestion.audit.createdByActor,
          requestId: suggestion.audit.requestId,
          focus: suggestion.focus,
          objective: suggestion.objective,
          rationale: suggestion.rationale,
          riskLevel: suggestion.risk.level,
          dataSources: suggestion.dataSources,
          suggestedActions: suggestion.suggestedActions,
          traceId: suggestion.trace.traceId,
          promptKitVersion: suggestion.trace.promptKitVersion,
          model: suggestion.trace.model,
          fingerprint: suggestion.trace.fingerprint,
          createdAt: now,
        },
      });

      await tx.councilSuggestion.create({
        data: {
          id: suggestion.id,
          runId: suggestion.runId,
          title: suggestion.title,
          focus: suggestion.focus,
          objective: suggestion.objective,
          rationale: suggestion.rationale,
          riskLevel: suggestion.risk.level,
          riskReason: suggestion.risk.reason,
          dataSources: suggestion.dataSources,
          suggestedActions: suggestion.suggestedActions,
          status: suggestion.status,
          createdByAppId: suggestion.audit.createdByAppId,
          createdByKeyId: suggestion.audit.createdByKeyId,
          createdByActor: suggestion.audit.createdByActor,
          requestId: suggestion.audit.requestId,
          updatedByActor: suggestion.audit.updatedByActor,
          createdAt: now,
          updatedAt: now,
        },
      });

      await tx.domainEvent.create({
        data: {
          aggregateType: 'CouncilSuggestion',
          aggregateId: suggestion.id,
          eventType: 'CouncilSuggestionGenerated',
          payload: {
            suggestionId: suggestion.id,
            runId: suggestion.runId,
            title: suggestion.title,
            focus: suggestion.focus,
            riskLevel: suggestion.risk.level,
            dataSources: suggestion.dataSources,
            suggestedActions: suggestion.suggestedActions,
            trace: suggestion.trace,
            audit: suggestion.audit,
          },
          requestId: suggestion.audit.requestId,
          traceId: suggestion.trace.traceId,
          source: 'api.v3.council.suggestions.create',
        },
      });
    });

    return cloneSuggestion(suggestion);
  }

  async getSuggestionById(input: {
    suggestionId: string;
    scopeAppId?: string;
  }): Promise<CouncilSuggestionReadModel> {
    if (this.getStorageMode() === 'memory') {
      const suggestion = this.getSuggestionByIdOrThrow(input.suggestionId, input.scopeAppId);
      return cloneSuggestion(suggestion);
    }

    const prisma = await this.getPrismaClient();
    const normalizedSuggestionId = this.normalizeSuggestionId(input.suggestionId);
    const record = await prisma.councilSuggestion.findFirst({
      where: {
        id: normalizedSuggestionId,
        ...(input.scopeAppId ? { createdByAppId: input.scopeAppId } : {}),
      },
      include: {
        run: true,
        response: true,
      },
    });

    if (!record) {
      throw new AppError(404, 'council suggestion not found', 'NOT_FOUND', {
        suggestionId: normalizedSuggestionId,
      });
    }

    return this.mapRecordToReadModel(record);
  }

  async listSuggestions(input: {
    scopeAppId?: string;
    status?: CouncilSuggestionStatus;
    limit?: number;
  }): Promise<{
    total: number;
    items: CouncilSuggestionReadModel[];
  }> {
    return this.listSuggestionsForAdmin(input);
  }

  async listSuggestionsForAdmin(input: {
    scopeAppId?: string;
    status?: CouncilSuggestionStatus;
    riskLevel?: CouncilSuggestionRiskLevel;
    limit?: number;
  }): Promise<{
    total: number;
    items: CouncilSuggestionReadModel[];
  }> {
    const statusFilter = input.status;
    const riskLevelFilter = input.riskLevel;
    const limit = Math.max(1, Math.min(input.limit || 20, 100));

    if (this.getStorageMode() === 'memory') {
      const ids = input.scopeAppId
        ? this.suggestionIdsByApp.get(input.scopeAppId) || []
        : Array.from(this.suggestions.keys());

      const candidates = ids
        .map((id) => this.suggestions.get(id))
        .filter((item): item is CouncilSuggestionState => Boolean(item))
        .filter((item) => !statusFilter || item.status === statusFilter)
        .filter((item) => !riskLevelFilter || item.risk.level === riskLevelFilter)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

      return {
        total: candidates.length,
        items: candidates.slice(0, limit).map(cloneSuggestion),
      };
    }

    const prisma = await this.getPrismaClient();
    const where = {
      ...(input.scopeAppId ? { createdByAppId: input.scopeAppId } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(riskLevelFilter ? { riskLevel: riskLevelFilter } : {}),
    };

    const [total, records] = await prisma.$transaction([
      prisma.councilSuggestion.count({ where }),
      prisma.councilSuggestion.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        include: {
          run: true,
          response: true,
        },
      }),
    ]);

    return {
      total,
      items: records.map((record: any) => this.mapRecordToReadModel(record)),
    };
  }

  async respondSuggestion(input: RespondCouncilSuggestionCommand): Promise<CouncilSuggestionReadModel> {
    this.assertCouncilActionsEnabled();

    const normalizedDecision = input.decision.trim().toUpperCase();
    if (!SUGGESTION_DECISION_SET.has(normalizedDecision)) {
      throw new AppError(400, 'council decision is invalid', 'INVALID_INPUT', {
        decision: input.decision,
      });
    }

    if (this.getStorageMode() === 'memory') {
      const suggestion = this.getSuggestionByIdOrThrow(input.suggestionId, input.requestedBy.appId);
      if (suggestion.status !== 'OPEN') {
        throw new AppError(409, 'council suggestion is already resolved', 'INVALID_STATE', {
          suggestionId: suggestion.id,
          status: suggestion.status,
        });
      }

      const now = new Date().toISOString();
      const note = input.note?.trim() || null;
      suggestion.status = this.toStatus(normalizedDecision as CouncilSuggestionDecision);
      suggestion.response = {
        decision: normalizedDecision as CouncilSuggestionDecision,
        note,
        respondedAt: now,
        respondedByActor: input.requestedBy.actor,
      };
      suggestion.updatedAt = now;
      suggestion.audit.updatedByActor = input.requestedBy.actor;

      return cloneSuggestion(suggestion);
    }

    const prisma = await this.getPrismaClient();
    const normalizedSuggestionId = this.normalizeSuggestionId(input.suggestionId);
    const note = input.note?.trim() || null;
    const status = this.toStatus(normalizedDecision as CouncilSuggestionDecision);
    const respondedAt = new Date();

    await prisma.$transaction(async (tx: CouncilSuggestionPrismaClient) => {
      const existing = await tx.councilSuggestion.findFirst({
        where: {
          id: normalizedSuggestionId,
          createdByAppId: input.requestedBy.appId,
        },
        include: {
          run: true,
          response: true,
        },
      });

      if (!existing) {
        throw new AppError(404, 'council suggestion not found', 'NOT_FOUND', {
          suggestionId: normalizedSuggestionId,
        });
      }

      if (existing.status !== 'OPEN' || existing.response) {
        throw new AppError(409, 'council suggestion is already resolved', 'INVALID_STATE', {
          suggestionId: normalizedSuggestionId,
          status: existing.status,
        });
      }

      await tx.councilResponse.create({
        data: {
          suggestionId: normalizedSuggestionId,
          decision: normalizedDecision,
          note,
          respondedByAppId: input.requestedBy.appId,
          respondedByActor: input.requestedBy.actor,
          respondedAt,
          createdAt: respondedAt,
          updatedAt: respondedAt,
        },
      });

      await tx.councilSuggestion.update({
        where: {
          id: normalizedSuggestionId,
        },
        data: {
          status,
          updatedByActor: input.requestedBy.actor,
          updatedAt: respondedAt,
        },
      });

      await tx.domainEvent.create({
        data: {
          aggregateType: 'CouncilSuggestion',
          aggregateId: normalizedSuggestionId,
          eventType: 'CouncilSuggestionResponded',
          payload: {
            suggestionId: normalizedSuggestionId,
            decision: normalizedDecision,
            status,
            note,
            respondedByActor: input.requestedBy.actor,
            respondedByAppId: input.requestedBy.appId,
            respondedAt: respondedAt.toISOString(),
          },
          source: 'api.v3.council.suggestions.respond',
        },
      });
    });

    return this.getSuggestionById({
      suggestionId: normalizedSuggestionId,
      scopeAppId: input.requestedBy.appId,
    });
  }

  resetForTest(): void {
    this.suggestions.clear();
    this.suggestionIdsByApp.clear();
  }

  private getStorageMode(): CouncilSuggestionStorageMode {
    return toStorageMode(process.env.V3_COUNCIL_STORAGE_MODE);
  }

  private async getPrismaClient(): Promise<CouncilSuggestionPrismaClient> {
    if (this.prismaClient) {
      return this.prismaClient;
    }

    const dbModule = await import('../../database');
    this.prismaClient = dbModule.prisma as unknown as CouncilSuggestionPrismaClient;
    return this.prismaClient;
  }

  private assertCouncilActionsEnabled(): void {
    if (isCouncilActionsEnabled()) {
      return;
    }

    throw new AppError(503, 'council actionable suggestions are disabled', 'COUNCIL_ACTIONS_DISABLED', {
      envFlag: 'V3_COUNCIL_ACTIONS_ENABLED',
    });
  }

  private normalizeSuggestionId(suggestionId: string): string {
    const normalized = suggestionId.trim().toLowerCase();
    if (!SUGGESTION_ID_PATTERN.test(normalized)) {
      throw new AppError(400, 'suggestionId is invalid', 'INVALID_INPUT', {
        suggestionId,
      });
    }
    return normalized;
  }

  private getSuggestionByIdOrThrow(suggestionId: string, scopeAppId?: string): CouncilSuggestionState {
    const normalized = this.normalizeSuggestionId(suggestionId);

    const suggestion = this.suggestions.get(normalized);
    if (!suggestion || (scopeAppId && suggestion.audit.createdByAppId !== scopeAppId)) {
      throw new AppError(404, 'council suggestion not found', 'NOT_FOUND', {
        suggestionId: normalized,
      });
    }

    return suggestion;
  }

  private normalizeRiskLevel(level: string): CouncilSuggestionRiskLevel {
    const normalized = level.trim().toUpperCase();
    if (!SUGGESTION_RISK_SET.has(normalized)) {
      throw new AppError(400, 'riskLevel is invalid', 'INVALID_INPUT', {
        riskLevel: level,
      });
    }
    return normalized as CouncilSuggestionRiskLevel;
  }

  private buildDataSources(
    dataSources: CreateCouncilSuggestionCommand['dataSources'],
    focus: string
  ): CouncilSuggestionDataSource[] {
    if (!dataSources || dataSources.length === 0) {
      return [
        {
          source: 'journey.viewer.summary',
          referenceId: null,
          freshness: 'latest',
        },
        {
          source: 'relationship.memory.digest',
          referenceId: null,
          freshness: 'latest',
        },
        {
          source: 'council.focus',
          referenceId: focus,
          freshness: 'request',
        },
      ];
    }

    return dataSources.slice(0, 8).map((item, index) => ({
      source: normalizeNonEmpty(item.source, `dataSources[${index}].source`, 80),
      referenceId: item.referenceId?.trim() || null,
      freshness: item.freshness?.trim() || null,
    }));
  }

  private buildRationale(
    inputRationale: string | undefined,
    context: {
      focus: string;
      objective: string | null;
      dataSources: CouncilSuggestionDataSource[];
    }
  ): string {
    if (inputRationale?.trim()) {
      return normalizeNonEmpty(inputRationale, 'rationale', 500);
    }

    const objectiveText = context.objective ? ` Objective: ${context.objective}.` : '';
    return `Suggestion generated for focus "${context.focus}" using ${context.dataSources.length} data sources.${objectiveText}`;
  }

  private buildSuggestedActions(
    actions: CreateCouncilSuggestionCommand['suggestedActions'],
    focus: string
  ): CouncilSuggestionAction[] {
    const actionSeed =
      actions && actions.length > 0
        ? actions
        : [
            {
              label: 'Assign Owner',
              detail: `Nominate a lead owner for ${focus}.`,
            },
            {
              label: 'Start First Step',
              detail: 'Run a low-risk first step and collect feedback before scaling.',
            },
          ];

    return actionSeed.slice(0, 5).map((action, index) => ({
      id: `act_${index + 1}`,
      label: normalizeNonEmpty(action.label, `suggestedActions[${index}].label`, 80),
      detail: action.detail?.trim() || 'No additional detail provided.',
    }));
  }

  private parseDataSourcesFromStorage(payload: unknown): CouncilSuggestionDataSource[] {
    if (!Array.isArray(payload)) {
      return [];
    }

    return payload
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        const source = typeof (item as any).source === 'string' ? (item as any).source.trim() : '';
        if (!source) {
          return null;
        }

        return {
          source,
          referenceId:
            typeof (item as any).referenceId === 'string' && (item as any).referenceId.trim().length > 0
              ? (item as any).referenceId.trim()
              : null,
          freshness:
            typeof (item as any).freshness === 'string' && (item as any).freshness.trim().length > 0
              ? (item as any).freshness.trim()
              : null,
        } as CouncilSuggestionDataSource;
      })
      .filter((item): item is CouncilSuggestionDataSource => Boolean(item));
  }

  private parseActionsFromStorage(payload: unknown): CouncilSuggestionAction[] {
    if (!Array.isArray(payload)) {
      return [];
    }

    return payload
      .map((item, index) => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        const label = typeof (item as any).label === 'string' ? (item as any).label.trim() : '';
        if (!label) {
          return null;
        }

        const id =
          typeof (item as any).id === 'string' && (item as any).id.trim().length > 0
            ? (item as any).id.trim()
            : `act_${index + 1}`;

        return {
          id,
          label,
          detail:
            typeof (item as any).detail === 'string' && (item as any).detail.trim().length > 0
              ? (item as any).detail.trim()
              : 'No additional detail provided.',
        } as CouncilSuggestionAction;
      })
      .filter((item): item is CouncilSuggestionAction => Boolean(item));
  }

  private mapRecordToReadModel(record: any): CouncilSuggestionReadModel {
    const riskLevel = SUGGESTION_RISK_SET.has(String(record.riskLevel || '').toUpperCase())
      ? (String(record.riskLevel).toUpperCase() as CouncilSuggestionRiskLevel)
      : 'MEDIUM';

    const status = SUGGESTION_STATUS_SET.has(String(record.status || '').toUpperCase())
      ? (String(record.status).toUpperCase() as CouncilSuggestionStatus)
      : 'OPEN';

    const responseDecisionRaw = record.response?.decision
      ? String(record.response.decision).toUpperCase()
      : null;
    const responseDecision = responseDecisionRaw && SUGGESTION_DECISION_SET.has(responseDecisionRaw)
      ? (responseDecisionRaw as CouncilSuggestionDecision)
      : null;

    return {
      id: record.id,
      runId: record.runId,
      title: record.title,
      focus: record.focus,
      objective: record.objective || null,
      rationale: record.rationale,
      risk: {
        level: riskLevel,
        reason: record.riskReason || this.buildRiskReason(riskLevel),
      },
      dataSources: this.parseDataSourcesFromStorage(record.dataSources),
      suggestedActions: this.parseActionsFromStorage(record.suggestedActions),
      status,
      trace: {
        traceId: record.run?.traceId || `trace_missing_${record.id}`,
        promptKitVersion: record.run?.promptKitVersion || 'v3-council-suggest-v1',
        model: record.run?.model || 'heuristic-council-planner',
        fingerprint: record.run?.fingerprint || 'unknown',
      },
      createdAt: toIsoString(record.createdAt),
      updatedAt: toIsoString(record.updatedAt),
      response: {
        decision: responseDecision,
        note: record.response?.note || null,
        respondedAt: record.response?.respondedAt ? toIsoString(record.response.respondedAt) : null,
        respondedByActor: record.response?.respondedByActor || null,
      },
      audit: {
        createdByAppId: record.createdByAppId,
        createdByKeyId: record.createdByKeyId,
        createdByActor: record.createdByActor,
        requestId: record.requestId || null,
        updatedByActor: record.updatedByActor,
      },
    };
  }

  private buildRiskReason(level: CouncilSuggestionRiskLevel): string {
    if (level === 'HIGH') {
      return 'Execution affects live progression and requires active monitoring.';
    }

    if (level === 'LOW') {
      return 'Limited blast radius and reversible operational impact.';
    }

    return 'Moderate impact; apply staged rollout and monitor key metrics.';
  }

  private toStatus(decision: CouncilSuggestionDecision): CouncilSuggestionStatus {
    if (decision === 'ACCEPT') {
      return 'ACCEPTED';
    }
    if (decision === 'REJECT') {
      return 'REJECTED';
    }
    return 'DEFERRED';
  }

  private storeSuggestion(suggestion: CouncilSuggestionState): void {
    this.suggestions.set(suggestion.id, suggestion);
    const current = this.suggestionIdsByApp.get(suggestion.audit.createdByAppId) || [];
    current.push(suggestion.id);
    this.suggestionIdsByApp.set(suggestion.audit.createdByAppId, current);
  }
}

export const v3CouncilSuggestionService = new CouncilSuggestionService();

export const resetV3CouncilSuggestionStoreForTest = (): void => {
  v3CouncilSuggestionService.resetForTest();
};

export const isCouncilSuggestionStatus = (value: string): value is CouncilSuggestionStatus =>
  SUGGESTION_STATUS_SET.has(value);

export const isCouncilSuggestionRiskLevel = (value: string): value is CouncilSuggestionRiskLevel =>
  SUGGESTION_RISK_SET.has(value);
