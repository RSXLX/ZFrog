import express from 'express';
import request from 'supertest';
import v2ChatRoutes from '../../api/routes/v2/chat.routes';
import { errorHandler, notFoundHandler } from '../../middlewares/errorHandler';

jest.mock('../../middlewares/auth.middleware', () => ({
  authRequired: (req: any, _res: any, next: any) => {
    req.user = {
      address: '0xabc0000000000000000000000000000000000001',
      walletAddress: '0xabc0000000000000000000000000000000000001',
    };
    next();
  },
}));

jest.mock('../../modules/soul/v2-chat.service', () => ({
  v2ChatService: {
    sendMessage: jest.fn(),
  },
}));

describe('V2 Chat Routes E2E', () => {
  const app = express();
  const { v2ChatService } = jest.requireMock('../../modules/soul/v2-chat.service') as {
    v2ChatService: {
      sendMessage: jest.Mock;
    };
  };
  const mockV2ChatService = v2ChatService as {
    sendMessage: jest.Mock;
  };

  app.use(express.json());
  app.use('/api/v2/chat', v2ChatRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  beforeEach(() => {
    jest.clearAllMocks();
    mockV2ChatService.sendMessage.mockResolvedValue({
      sessionId: 101,
      reply: {
        content: '呱！测试回复',
        intent: 'chitchat',
      },
      frogMood: 'relaxed',
      trace: {
        traceId: 'trace_1',
        domainEventId: '9001',
        promptKitVersion: '2026-03-23.prompt-kit.v1',
        systemPromptVersion: '2026-03-23.chat-system.v1',
        responsePromptVersion: '2026-03-23.chat-response.v1',
        memoryTraceVersion: '2026-03-23.chat-memory.v1',
        memorySummaryType: 'RELATIONSHIP_V1',
        memorySummaryId: 77,
        recordedAt: '2026-03-23T09:00:00.000Z',
      },
    });
  });

  it('POST /api/v2/chat validates frogId and message', async () => {
    const invalidFrog = await request(app).post('/api/v2/chat').send({
      frogId: 'x',
      message: 'hello',
    });
    expect(invalidFrog.status).toBe(400);
    expect(invalidFrog.body.success).toBe(false);
    expect(invalidFrog.body.error.code).toBe('CHAT_INVALID_INPUT');

    const invalidMessage = await request(app).post('/api/v2/chat').send({
      frogId: 1,
      message: '   ',
    });
    expect(invalidMessage.status).toBe(400);
    expect(invalidMessage.body.success).toBe(false);
    expect(invalidMessage.body.error.code).toBe('CHAT_INVALID_INPUT');
  });

  it('POST /api/v2/chat returns reply and trace metadata', async () => {
    const response = await request(app).post('/api/v2/chat').send({
      frogId: 12,
      message: '今天过得怎么样？',
      sessionId: 55,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.sessionId).toBe(101);
    expect(response.body.data.reply.intent).toBe('chitchat');
    expect(response.body.data.trace.promptKitVersion).toBe('2026-03-23.prompt-kit.v1');
    expect(response.body.data.trace.memorySummaryType).toBe('RELATIONSHIP_V1');

    expect(mockV2ChatService.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        frogId: 12,
        message: '今天过得怎么样？',
        sessionId: 55,
        walletAddress: '0xabc0000000000000000000000000000000000001',
      })
    );
  });
});
