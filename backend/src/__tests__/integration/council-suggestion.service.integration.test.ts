import {
  CouncilSuggestionService,
  type CouncilSuggestionReadModel,
} from '../../modules/council/council-suggestion.service';

type MockRun = {
  id: string;
  appId: string;
  keyId: string;
  requestedByActor: string;
  requestId: string | null;
  focus: string;
  objective: string | null;
  rationale: string;
  riskLevel: string;
  dataSources: unknown;
  suggestedActions: unknown;
  traceId: string;
  promptKitVersion: string;
  model: string;
  fingerprint: string;
  createdAt: Date;
};

type MockSuggestion = {
  id: string;
  runId: string;
  title: string;
  focus: string;
  objective: string | null;
  rationale: string;
  riskLevel: string;
  riskReason: string;
  dataSources: unknown;
  suggestedActions: unknown;
  status: string;
  createdByAppId: string;
  createdByKeyId: string;
  createdByActor: string;
  requestId: string | null;
  updatedByActor: string;
  createdAt: Date;
  updatedAt: Date;
};

type MockResponse = {
  id: string;
  suggestionId: string;
  decision: string;
  note: string | null;
  respondedByAppId: string;
  respondedByActor: string;
  respondedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

const toDate = (value: Date | string | undefined): Date => {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string') {
    return new Date(value);
  }
  return new Date();
};

const createMockPrisma = () => {
  const runs = new Map<string, MockRun>();
  const suggestions = new Map<string, MockSuggestion>();
  const responses = new Map<string, MockResponse>();

  const hydrateSuggestion = (row: MockSuggestion | null) => {
    if (!row) {
      return null;
    }

    const run = runs.get(row.runId) || null;
    const response = responses.get(row.id) || null;

    return {
      ...row,
      run,
      response,
    };
  };

  const applyWhere = (items: MockSuggestion[], where: any): MockSuggestion[] => {
    if (!where) {
      return items;
    }

    return items.filter((item) => {
      if (where.id && item.id !== where.id) {
        return false;
      }
      if (where.createdByAppId && item.createdByAppId !== where.createdByAppId) {
        return false;
      }
      if (where.status && item.status !== where.status) {
        return false;
      }
      return true;
    });
  };

  const mockPrisma: any = {};

  mockPrisma.councilRun = {
    create: jest.fn(async ({ data }: any) => {
      runs.set(data.id, {
        ...data,
        requestId: data.requestId ?? null,
        objective: data.objective ?? null,
        createdAt: toDate(data.createdAt),
      });
      return runs.get(data.id);
    }),
  };

  mockPrisma.councilSuggestion = {
    create: jest.fn(async ({ data }: any) => {
      suggestions.set(data.id, {
        ...data,
        objective: data.objective ?? null,
        requestId: data.requestId ?? null,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      });
      return hydrateSuggestion(suggestions.get(data.id) || null);
    }),
    findFirst: jest.fn(async ({ where }: any) => {
      const rows = applyWhere(Array.from(suggestions.values()), where);
      const row = rows[0] || null;
      return hydrateSuggestion(row);
    }),
    findMany: jest.fn(async ({ where, orderBy, take }: any) => {
      const rows = applyWhere(Array.from(suggestions.values()), where);
      if (orderBy?.createdAt === 'desc') {
        rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      const limited = typeof take === 'number' ? rows.slice(0, take) : rows;
      return limited.map((item) => hydrateSuggestion(item));
    }),
    count: jest.fn(async ({ where }: any) => applyWhere(Array.from(suggestions.values()), where).length),
    update: jest.fn(async ({ where, data }: any) => {
      const existing = suggestions.get(where.id);
      if (!existing) {
        throw new Error(`suggestion ${where.id} not found`);
      }

      const next: MockSuggestion = {
        ...existing,
        ...data,
        updatedAt: toDate(data.updatedAt),
      };
      suggestions.set(where.id, next);
      return hydrateSuggestion(next);
    }),
  };

  mockPrisma.councilResponse = {
    create: jest.fn(async ({ data }: any) => {
      const next: MockResponse = {
        id: `resp_${responses.size + 1}`,
        ...data,
        note: data.note ?? null,
        respondedAt: toDate(data.respondedAt),
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      };
      responses.set(next.suggestionId, next);
      return next;
    }),
  };

  mockPrisma.domainEvent = {
    create: jest.fn(async ({ data }: any) => ({
      id: BigInt(1000),
      occurredAt: new Date(),
      ...data,
    })),
  };

  mockPrisma.$transaction = jest.fn(async (input: any): Promise<any> => {
    if (Array.isArray(input)) {
      return Promise.all(input);
    }
    if (typeof input === 'function') {
      return input(mockPrisma as any);
    }
    throw new Error('unsupported transaction payload');
  });

  return {
    mockPrisma,
    runs,
    suggestions,
    responses,
  };
};

describe('CouncilSuggestionService Integration', () => {
  const originalEnv = {
    V3_COUNCIL_STORAGE_MODE: process.env.V3_COUNCIL_STORAGE_MODE,
    V3_COUNCIL_ACTIONS_ENABLED: process.env.V3_COUNCIL_ACTIONS_ENABLED,
  };

  beforeEach(() => {
    process.env.V3_COUNCIL_STORAGE_MODE = 'prisma';
    process.env.V3_COUNCIL_ACTIONS_ENABLED = 'true';
  });

  afterAll(() => {
    process.env.V3_COUNCIL_STORAGE_MODE = originalEnv.V3_COUNCIL_STORAGE_MODE;
    process.env.V3_COUNCIL_ACTIONS_ENABLED = originalEnv.V3_COUNCIL_ACTIONS_ENABLED;
  });

  it('persists council suggestion run/suggestion and records generation trace event', async () => {
    const { mockPrisma, runs, suggestions } = createMockPrisma();
    const service = new CouncilSuggestionService({
      prismaClient: mockPrisma as any,
    });

    const created = await service.createSuggestion({
      focus: 'season launch ritual',
      objective: 'pick a reversible first rollout',
      requestedBy: {
        appId: 'int_001',
        keyId: 'ikey_001',
        actor: 'season-lab:ikey_001',
        requestId: 'req_v3_council_001',
      },
    });

    expect(created.id.startsWith('csg_')).toBe(true);
    expect(created.status).toBe('OPEN');
    expect(created.trace.promptKitVersion).toBe('v3-council-suggest-v1');

    expect(runs.has(created.runId)).toBe(true);
    expect(suggestions.has(created.id)).toBe(true);
    expect(mockPrisma.domainEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'CouncilSuggestionGenerated',
          aggregateType: 'CouncilSuggestion',
          aggregateId: created.id,
          traceId: created.trace.traceId,
        }),
      })
    );

    const listed = await service.listSuggestions({
      scopeAppId: 'int_001',
      limit: 10,
    });

    expect(listed.total).toBe(1);
    expect(listed.items[0].id).toBe(created.id);
  });

  it('records response in persistence store, emits audit event, and prevents replay', async () => {
    const { mockPrisma, responses } = createMockPrisma();
    const service = new CouncilSuggestionService({
      prismaClient: mockPrisma as any,
    });

    const created = await service.createSuggestion({
      focus: 'meteor rescue duty',
      requestedBy: {
        appId: 'int_001',
        keyId: 'ikey_001',
        actor: 'season-lab:ikey_001',
      },
    });

    const responded = await service.respondSuggestion({
      suggestionId: created.id,
      decision: 'ACCEPT',
      note: 'start with limited canary',
      requestedBy: {
        appId: 'int_001',
        actor: 'season-lab:ikey_001',
      },
    });

    expect(responded.status).toBe('ACCEPTED');
    expect(responded.response).toMatchObject({
      decision: 'ACCEPT',
      note: 'start with limited canary',
      respondedByActor: 'season-lab:ikey_001',
    });
    expect(responses.has(created.id)).toBe(true);

    expect(mockPrisma.domainEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'CouncilSuggestionResponded',
          aggregateId: created.id,
        }),
      })
    );

    await expect(
      service.respondSuggestion({
        suggestionId: created.id,
        decision: 'DEFER',
        requestedBy: {
          appId: 'int_001',
          actor: 'season-lab:ikey_001',
        },
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'INVALID_STATE',
    });
  });

  it('keeps read path fail-closed by integration app scope', async () => {
    const { mockPrisma } = createMockPrisma();
    const service = new CouncilSuggestionService({
      prismaClient: mockPrisma as any,
    });

    const created: CouncilSuggestionReadModel = await service.createSuggestion({
      focus: 'scope isolation check',
      requestedBy: {
        appId: 'int_scope_a',
        keyId: 'ikey_a',
        actor: 'scope-a:ikey_a',
      },
    });

    await expect(
      service.getSuggestionById({
        suggestionId: created.id,
        scopeAppId: 'int_scope_b',
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });
});
