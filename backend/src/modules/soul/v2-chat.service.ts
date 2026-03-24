import { randomUUID } from 'crypto';
import { AppError } from '../../middlewares/errorHandler';
import {
  buildPromptKitTrace,
  summarizeMemoryForTrace,
  V2_CHAT_MEMORY_SUMMARY_TYPE,
  V2_CHAT_MEMORY_TRACE_VERSION,
} from './prompt-kit';

export interface SendV2ChatMessageInput {
  frogId: number;
  message: string;
  walletAddress: string;
  sessionId?: number;
  requestId?: string;
}

export interface V2ChatTraceMeta {
  traceId: string;
  domainEventId: string;
  promptKitVersion: string;
  systemPromptVersion: string;
  responsePromptVersion: string;
  memoryTraceVersion: string;
  memorySummaryType: string;
  memorySummaryId: number | null;
  recordedAt: string;
}

export interface LegacyChatResponse {
  sessionId: number;
  reply: {
    content: string;
    intent: string;
    data?: unknown;
  };
  frogMood: string;
}

export interface V2ChatMessageResult extends LegacyChatResponse {
  trace: V2ChatTraceMeta;
}

type V2ChatPrismaClient = {
  frog: {
    findUnique: (args: any) => Promise<any>;
  };
  memorySummary: {
    findUnique: (args: any) => Promise<any>;
  };
  chatMessage: {
    findMany: (args: any) => Promise<any[]>;
  };
  domainEvent: {
    create: (args: any) => Promise<{ id: bigint | number; occurredAt: Date }>;
  };
};
type LegacyChatServicePort = {
  processMessage: (
    frogIdOrTokenId: number,
    ownerAddress: string,
    userMessage: string,
    sessionId?: number
  ) => Promise<LegacyChatResponse>;
};

const MAX_CHAT_MESSAGE_LENGTH = 2000;

const ensurePositiveInteger = (value: number, field: string): number => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new AppError(400, `${field} must be a positive integer`, 'CHAT_INVALID_INPUT');
  }
  return value;
};

const normalizeWalletAddress = (walletAddress: string): string => {
  const normalized = walletAddress.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/i.test(normalized)) {
    throw new AppError(400, 'walletAddress must be a valid 0x address', 'CHAT_INVALID_INPUT');
  }
  return normalized;
};

const normalizeMessage = (message: string): string => {
  const normalized = message.trim();
  if (!normalized) {
    throw new AppError(400, 'message is required', 'CHAT_INVALID_INPUT');
  }
  if (normalized.length > MAX_CHAT_MESSAGE_LENGTH) {
    throw new AppError(
      400,
      `message must be <= ${MAX_CHAT_MESSAGE_LENGTH} characters`,
      'CHAT_INVALID_INPUT'
    );
  }
  return normalized;
};

export class V2ChatService {
  private prismaClient?: V2ChatPrismaClient;
  private readonly legacyChatService: LegacyChatServicePort;

  constructor(deps?: { prismaClient?: V2ChatPrismaClient; legacyChatService?: LegacyChatServicePort }) {
    this.prismaClient = deps?.prismaClient;
    this.legacyChatService = deps?.legacyChatService || {
      processMessage: async (
        frogIdOrTokenId: number,
        ownerAddress: string,
        userMessage: string,
        sessionId?: number
      ) => {
        const chatModule = await import('../../services/ai/chat.service');
        const chatService = new chatModule.ChatService();
        return chatService.processMessage(frogIdOrTokenId, ownerAddress, userMessage, sessionId);
      },
    };
  }

  async sendMessage(input: SendV2ChatMessageInput): Promise<V2ChatMessageResult> {
    const prismaClient = await this.getPrismaClient();
    const frogIdOrTokenId = ensurePositiveInteger(input.frogId, 'frogId');
    const normalizedMessage = normalizeMessage(input.message);
    const walletAddress = normalizeWalletAddress(input.walletAddress);
    const sessionId =
      input.sessionId === undefined ? undefined : ensurePositiveInteger(input.sessionId, 'sessionId');

    const frog = await this.resolveFrog(prismaClient, frogIdOrTokenId);
    if (!frog) {
      throw new AppError(404, 'Frog not found', 'CHAT_NOT_FOUND');
    }
    if (frog.ownerAddress.toLowerCase() !== walletAddress) {
      throw new AppError(403, 'walletAddress cannot access this frog', 'CHAT_PERMISSION_DENIED');
    }

    const memorySummary = await prismaClient.memorySummary.findUnique({
      where: {
        frogId_summaryType: {
          frogId: frog.id,
          summaryType: V2_CHAT_MEMORY_SUMMARY_TYPE,
        },
      },
      select: {
        id: true,
        summaryType: true,
        summaryText: true,
        generatedAt: true,
        updatedAt: true,
      },
    });

    const chatResponse = await this.legacyChatService.processMessage(
      frogIdOrTokenId,
      walletAddress,
      normalizedMessage,
      sessionId
    );

    const recentMessages = await prismaClient.chatMessage.findMany({
      where: { sessionId: chatResponse.sessionId },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        role: true,
        intent: true,
        createdAt: true,
      },
    });

    const promptTrace = buildPromptKitTrace({
      frogName: frog.name,
      personality: frog.personality,
      userMessage: normalizedMessage,
      intent: chatResponse.reply.intent,
      sessionId: chatResponse.sessionId,
      messageCountHint: recentMessages.length,
    });

    const assistantMessageRef = recentMessages.find((item: any) => item.role === 'assistant');
    const userMessageRef = recentMessages.find((item: any) => item.role === 'user');

    const memoryTrace = memorySummary
      ? {
          traceVersion: V2_CHAT_MEMORY_TRACE_VERSION,
          summaryType: memorySummary.summaryType,
          memorySummaryId: memorySummary.id,
          generatedAt: memorySummary.generatedAt.toISOString(),
          updatedAt: memorySummary.updatedAt.toISOString(),
          ...summarizeMemoryForTrace(memorySummary.summaryText),
        }
      : {
          traceVersion: V2_CHAT_MEMORY_TRACE_VERSION,
          summaryType: V2_CHAT_MEMORY_SUMMARY_TYPE,
          memorySummaryId: null,
          reason: 'memory_summary_missing',
        };

    const traceId = randomUUID();
    const tracePayload = {
      route: '/api/v2/chat',
      promptTrace,
      memoryTrace,
      chat: {
        sessionId: chatResponse.sessionId,
        intent: chatResponse.reply.intent,
        requestPreview: normalizedMessage.slice(0, 200),
        replyPreview: chatResponse.reply.content.slice(0, 200),
        userMessageId: userMessageRef?.id ?? null,
        assistantMessageId: assistantMessageRef?.id ?? null,
      },
    };

    const traceEvent = await prismaClient.domainEvent.create({
      data: {
        frogId: frog.id,
        aggregateType: 'ChatSession',
        aggregateId: String(chatResponse.sessionId),
        eventType: 'ChatPromptMemoryTraceRecorded',
        payload: tracePayload,
        requestId: input.requestId,
        traceId,
        source: 'api.v2.chat',
      },
      select: {
        id: true,
        occurredAt: true,
      },
    });

    return {
      ...chatResponse,
      trace: {
        traceId,
        domainEventId: traceEvent.id.toString(),
        promptKitVersion: promptTrace.promptKitVersion,
        systemPromptVersion: promptTrace.systemPrompt.templateVersion,
        responsePromptVersion: promptTrace.responsePrompt.templateVersion,
        memoryTraceVersion: V2_CHAT_MEMORY_TRACE_VERSION,
        memorySummaryType: memorySummary?.summaryType || V2_CHAT_MEMORY_SUMMARY_TYPE,
        memorySummaryId: memorySummary?.id || null,
        recordedAt: traceEvent.occurredAt.toISOString(),
      },
    };
  }

  private async resolveFrog(prismaClient: V2ChatPrismaClient, frogIdOrTokenId: number) {
    const byTokenId = await prismaClient.frog.findUnique({
      where: { tokenId: frogIdOrTokenId },
      select: {
        id: true,
        tokenId: true,
        name: true,
        personality: true,
        ownerAddress: true,
      },
    });
    if (byTokenId) {
      return byTokenId;
    }

    return prismaClient.frog.findUnique({
      where: { id: frogIdOrTokenId },
      select: {
        id: true,
        tokenId: true,
        name: true,
        personality: true,
        ownerAddress: true,
      },
    });
  }

  private async getPrismaClient(): Promise<V2ChatPrismaClient> {
    if (this.prismaClient) {
      return this.prismaClient;
    }
    const dbModule = await import('../../database');
    this.prismaClient = dbModule.prisma as unknown as V2ChatPrismaClient;
    return this.prismaClient;
  }
}

export const v2ChatService = new V2ChatService();
