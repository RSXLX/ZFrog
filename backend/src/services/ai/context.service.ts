// backend/src/services/ai/context.service.ts

import { PrismaClient, ChatIntent, ChatMessage } from '@prisma/client';
import { logger } from '../../utils/logger';

/**
 * 聊天上下文接口
 */
export interface ChatContext {
  /** 最近的消息历史 */
  recentMessages: Array<{
    role: 'user' | 'assistant';
    content: string;
    intent?: ChatIntent;
  }>;
  /** 最近识别的意图 */
  lastIntent: ChatIntent | null;
  /** 用户偏好（可扩展） */
  userPreferences: Record<string, any>;
  /** 上下文摘要（用于长对话） */
  summary?: string;
}

/**
 * 上下文管理服务
 * 负责维护聊天会话的上下文记忆
 */
export class ContextService {
  private prisma: PrismaClient;
  
  /** 最大保留的上下文消息数 */
  private static readonly MAX_CONTEXT_MESSAGES = 10;
  
  /** 触发摘要生成的消息阈值 */
  private static readonly SUMMARY_THRESHOLD = 20;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * 获取会话上下文
   */
  async getContext(sessionId: number): Promise<ChatContext> {
    try {
      // 获取最近的消息
      const messages = await this.prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
        take: ContextService.MAX_CONTEXT_MESSAGES,
        select: {
          role: true,
          content: true,
          intent: true,
        }
      });

      // 反转顺序（从旧到新）
      const recentMessages = messages.reverse().map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        intent: msg.intent || undefined,
      }));

      // 获取最后一条有意图的消息
      const lastIntentMessage = messages.find(m => m.intent);

      return {
        recentMessages,
        lastIntent: lastIntentMessage?.intent || null,
        userPreferences: {},
      };
    } catch (error) {
      logger.error('[ContextService] Failed to get context:', error);
      return {
        recentMessages: [],
        lastIntent: null,
        userPreferences: {},
      };
    }
  }

  /**
   * 构建包含历史的提示词
   */
  buildContextualPrompt(context: ChatContext, currentMessage: string): string {
    if (context.recentMessages.length === 0) {
      return currentMessage;
    }

    // 构建历史对话部分
    const historyLines = context.recentMessages.map(msg => {
      const prefix = msg.role === 'user' ? '用户' : '青蛙';
      return `${prefix}: ${msg.content}`;
    });

    // 添加上下文提示
    let contextHint = '';
    if (context.lastIntent) {
      contextHint = `\n[上一轮意图: ${context.lastIntent}]`;
    }

    return `## 对话历史
${historyLines.join('\n')}
${contextHint}

## 当前用户消息
用户: ${currentMessage}

请基于对话历史理解用户意图，保持对话连贯性。`;
  }

  /**
   * 判断是否需要引用上下文
   * 例如：用户说"那BTC呢"需要理解之前问的是价格
   */
  needsContextReference(message: string): boolean {
    const contextualPatterns = [
      /^那(?:个|这|.{0,3})呢/,      // "那XX呢"
      /^还有吗/,                     // "还有吗"
      /^继续/,                       // "继续"
      /^再来一个/,                   // "再来一个"
      /^换一个/,                     // "换一个"
      /^其他的呢/,                   // "其他的呢"
      /^(?:这个|那个)怎么样/,        // "这个/那个怎么样"
      /^(?:它|他|她)(?:的|是)/,      // "它的/它是"
    ];

    return contextualPatterns.some(pattern => pattern.test(message));
  }

  /**
   * 从上下文推断意图参数
   * 例如：上轮问ETH价格，这轮问"那BTC呢"，推断为价格查询
   */
  inferFromContext(
    context: ChatContext,
    currentMessage: string
  ): { inferredIntent?: ChatIntent; inferredParams?: Record<string, any> } {
    if (!this.needsContextReference(currentMessage)) {
      return {};
    }

    // 如果上轮有意图，尝试复用
    if (context.lastIntent) {
      return {
        inferredIntent: context.lastIntent,
        inferredParams: this.extractNewParams(currentMessage),
      };
    }

    return {};
  }

  /**
   * 从消息中提取新参数
   */
  private extractNewParams(message: string): Record<string, any> {
    const params: Record<string, any> = {};

    // 尝试提取代币符号
    const tokenMatch = message.match(/(?:那|换)(.{1,5})(?:呢|吧)?/);
    if (tokenMatch) {
      const token = tokenMatch[1].toUpperCase().trim();
      const validTokens = ['BTC', 'ETH', 'ZETA', 'USDT', 'BNB', 'SOL'];
      if (validTokens.includes(token)) {
        params.symbol = token;
      }
    }

    return params;
  }

  /**
   * 获取会话消息总数（用于判断是否需要摘要）
   */
  async getMessageCount(sessionId: number): Promise<number> {
    return await this.prisma.chatMessage.count({
      where: { sessionId }
    });
  }
}

// 导出单例
export const contextService = new ContextService();
