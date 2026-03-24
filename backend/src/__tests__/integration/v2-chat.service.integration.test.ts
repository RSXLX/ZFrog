import { V2ChatService } from '../../modules/soul/v2-chat.service';

describe('V2ChatService Integration', () => {
  const mockPrisma = {
    frog: {
      findUnique: jest.fn(),
    },
    memorySummary: {
      findUnique: jest.fn(),
    },
    chatMessage: {
      findMany: jest.fn(),
    },
    domainEvent: {
      create: jest.fn(),
    },
  } as any;

  const legacyChatService = {
    processMessage: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma.frog.findUnique.mockResolvedValue({
      id: 7,
      tokenId: 7007,
      name: 'TraceFrog',
      personality: 'PHILOSOPHER',
      ownerAddress: '0xabc0000000000000000000000000000000000007',
    });

    mockPrisma.memorySummary.findUnique.mockResolvedValue({
      id: 99,
      summaryType: 'RELATIONSHIP_V1',
      summaryText: 'Trace memory summary text',
      generatedAt: new Date('2026-03-23T01:00:00.000Z'),
      updatedAt: new Date('2026-03-23T01:05:00.000Z'),
    });

    legacyChatService.processMessage.mockResolvedValue({
      sessionId: 321,
      reply: {
        content: '呱！关系记忆已就绪。',
        intent: 'frog_status',
      },
      frogMood: 'thinking',
    });

    mockPrisma.chatMessage.findMany.mockResolvedValue([
      {
        id: 2002,
        role: 'assistant',
        intent: 'frog_status',
        createdAt: new Date('2026-03-23T01:10:00.000Z'),
      },
      {
        id: 2001,
        role: 'user',
        intent: null,
        createdAt: new Date('2026-03-23T01:09:00.000Z'),
      },
    ]);

    mockPrisma.domainEvent.create.mockResolvedValue({
      id: 9001n,
      occurredAt: new Date('2026-03-23T01:11:00.000Z'),
    });
  });

  it('records prompt/memory trace into domain events after chat reply', async () => {
    const service = new V2ChatService({
      prismaClient: mockPrisma,
      legacyChatService,
    });

    const result = await service.sendMessage({
      frogId: 7,
      message: '请结合我们的关系记忆给我建议',
      walletAddress: '0xabc0000000000000000000000000000000000007',
      sessionId: 321,
      requestId: 'req_v2_chat_1',
    });

    expect(result.sessionId).toBe(321);
    expect(result.reply.intent).toBe('frog_status');
    expect(result.trace.promptKitVersion).toBe('2026-03-23.prompt-kit.v1');
    expect(result.trace.memorySummaryId).toBe(99);
    expect(result.trace.domainEventId).toBe('9001');

    expect(mockPrisma.domainEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          frogId: 7,
          aggregateType: 'ChatSession',
          aggregateId: '321',
          eventType: 'ChatPromptMemoryTraceRecorded',
          requestId: 'req_v2_chat_1',
          source: 'api.v2.chat',
          payload: expect.objectContaining({
            route: '/api/v2/chat',
            promptTrace: expect.objectContaining({
              promptKitVersion: '2026-03-23.prompt-kit.v1',
            }),
            memoryTrace: expect.objectContaining({
              traceVersion: '2026-03-23.chat-memory.v1',
              summaryType: 'RELATIONSHIP_V1',
              memorySummaryId: 99,
            }),
          }),
        }),
      })
    );
  });
});
