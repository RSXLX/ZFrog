// backend/src/services/ai/chat.service.ts

import { PrismaClient, ChatIntent, Personality, FrogStatus } from '@prisma/client';
import { IntentService } from './intent.service';
import { contextService, ChatContext } from './context.service';
import { PriceService } from '../defi/price.service';
import { AssetService } from '../defi/asset.service';
import { aiService } from '../ai.service';
import { buildSystemPrompt } from './prompts/system.prompt';
import { buildResponsePrompt } from './prompts/response.prompt';
import { logger } from '../../utils/logger';

export interface ChatResponse {
  sessionId: number;
  reply: {
    content: string;
    intent: string;
    data?: any;
  };
  frogMood: string;
}

export class ChatService {
  private prisma: PrismaClient;
  private intentService: IntentService;
  private priceService: PriceService;
  private assetService: AssetService;
  
  constructor() {
    this.prisma = new PrismaClient();
    this.intentService = new IntentService();
    this.priceService = new PriceService();
    this.assetService = new AssetService();
  }
  
  /**
   * 处理用户消息
   */
  async processMessage(
    frogIdOrTokenId: number,
    ownerAddress: string,
    userMessage: string,
    sessionId?: number
  ): Promise<ChatResponse> {
    
    // 1. 尝试通过 tokenId 或 id 查找青蛙
    let frog = await this.prisma.frog.findUnique({
      where: { tokenId: frogIdOrTokenId }
    });
    
    // 如果通过 tokenId 没找到，尝试通过 id 查找
    if (!frog) {
      frog = await this.prisma.frog.findUnique({
        where: { id: frogIdOrTokenId }
      });
    }
    
    if (!frog) {
      throw new Error(`Frog with tokenId or id ${frogIdOrTokenId} not found`);
    }
    
    // 验证所有权
    if (frog.ownerAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
      throw new Error(`You do not own this frog (tokenId: ${frog.tokenId})`);
    }
    
    const frogId = frog.id; // 使用数据库 ID
    
    // 2. 获取或创建会话
    const session = await this.getOrCreateSession(frogId, ownerAddress, sessionId);
    
    // 3. 保存用户消息
    await this.saveMessage(session.id, 'user', userMessage);
    
    // 4. 获取上下文（新增）
    const context = await contextService.getContext(session.id);
    
    // 5. 识别意图（结合上下文推断）
    let intentResult = await this.intentService.classifyIntent(userMessage);
    
    // 如果意图不明确但需要上下文引用，尝试从上下文推断
    if (intentResult.intent === 'chitchat' && contextService.needsContextReference(userMessage)) {
      const inferred = contextService.inferFromContext(context, userMessage);
      if (inferred.inferredIntent) {
        intentResult = {
          intent: inferred.inferredIntent,
          confidence: 0.7,
          params: { ...intentResult.params, ...inferred.inferredParams }
        };
        logger.info(`[Chat] Inferred intent from context: ${inferred.inferredIntent}`);
      }
    }
    
    // 6. 根据意图获取数据
    const intentData = await this.fetchIntentData(intentResult, ownerAddress, frogId);
    
    // 7. 生成青蛙回复（传入上下文）
    const reply = await this.generateReply(
      frog,
      userMessage,
      intentResult,
      intentData,
      context  // 新增参数
    );
    
    // 7. 保存青蛙回复
    await this.saveMessage(
      session.id, 
      'assistant', 
      reply.content,
      intentResult.intent,
      intentResult.params
    );
    
    // 8. 返回响应
    return {
      sessionId: session.id,
      reply: {
        content: reply.content,
        intent: intentResult.intent,
        data: intentData
      },
      frogMood: this.determineMood(intentResult.intent)
    };
  }
  
  /**
   * 流式处理用户消息（SSE 支持）
   */
  async *processMessageStream(
    frogIdOrTokenId: number,
    ownerAddress: string,
    userMessage: string,
    sessionId?: number
  ): AsyncGenerator<{ type: string; data: any }, void, unknown> {
    
    // 1. 查找青蛙
    let frog = await this.prisma.frog.findUnique({
      where: { tokenId: frogIdOrTokenId }
    });
    
    if (!frog) {
      frog = await this.prisma.frog.findUnique({
        where: { id: frogIdOrTokenId }
      });
    }
    
    if (!frog) {
      yield { type: 'error', data: { message: `Frog not found` } };
      return;
    }
    
    if (frog.ownerAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
      yield { type: 'error', data: { message: `Not authorized` } };
      return;
    }
    
    const frogId = frog.id;
    
    // 2. 获取或创建会话
    const session = await this.getOrCreateSession(frogId, ownerAddress, sessionId);
    yield { type: 'session', data: { sessionId: session.id } };
    
    // 3. 保存用户消息
    await this.saveMessage(session.id, 'user', userMessage);
    
    // 4. 获取上下文
    const context = await contextService.getContext(session.id);
    
    // 5. 识别意图
    let intentResult = await this.intentService.classifyIntent(userMessage);
    
    if (intentResult.intent === 'chitchat' && contextService.needsContextReference(userMessage)) {
      const inferred = contextService.inferFromContext(context, userMessage);
      if (inferred.inferredIntent) {
        intentResult = {
          intent: inferred.inferredIntent,
          confidence: 0.7,
          params: { ...intentResult.params, ...inferred.inferredParams }
        };
      }
    }
    
    yield { type: 'intent', data: { intent: intentResult.intent } };
    
    // 6. 获取意图数据
    const intentData = await this.fetchIntentData(intentResult, ownerAddress, frogId);
    
    if (intentData) {
      yield { type: 'data', data: intentData };
    }
    
    // 7. 构建提示词
    const systemPrompt = buildSystemPrompt(frog.name, frog.personality);
    const responsePrompt = buildResponsePrompt(
      userMessage,
      intentResult.intent,
      intentData,
      context
    );
    
    // 8. 流式生成回复
    let fullContent = '';
    try {
      for await (const chunk of aiService.generateChatResponseStream(
        systemPrompt,
        responsePrompt,
        { temperature: 0.8, maxTokens: 500 }
      )) {
        fullContent += chunk;
        yield { type: 'chunk', data: { content: chunk } };
      }
    } catch (error) {
      // fallback
      fullContent = this.getFallbackResponse(intentResult.intent, frog.personality);
      yield { type: 'chunk', data: { content: fullContent } };
    }
    
    // 9. 保存回复
    await this.saveMessage(
      session.id,
      'assistant',
      fullContent,
      intentResult.intent,
      intentResult.params
    );
    
    // 10. 发送完成信号
    yield { 
      type: 'done', 
      data: { 
        sessionId: session.id,
        intent: intentResult.intent,
        frogMood: this.determineMood(intentResult.intent)
      } 
    };
  }
  
  /**
   * 获取或创建聊天会话
   */
  private async getOrCreateSession(
    frogId: number,
    ownerAddress: string,
    sessionId?: number
  ) {
    if (sessionId) {
      // 验证会话是否存在且属于该用户
      const session = await this.prisma.chatSession.findFirst({
        where: {
          id: sessionId,
          ownerAddress
        }
      });
      
      if (session) {
        return session;
      }
    }
    
    // 创建新会话（frog 存在性已在 processMessage 中验证）
    return await this.prisma.chatSession.create({
      data: {
        frogId,
        ownerAddress
      }
    });
  }
  
  /**
   * 保存聊天消息
   */
  private async saveMessage(
    sessionId: number,
    role: 'user' | 'assistant',
    content: string,
    intent?: ChatIntent,
    intentParams?: any
  ) {
    await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role,
        content,
        intent,
        intentParams: intentParams || null
      }
    });
  }
  
  /**
   * 根据意图获取相关数据
   */
  private async fetchIntentData(
    intentResult: any,
    ownerAddress: string,
    frogId?: number
  ): Promise<any> {
    
    try {
      switch (intentResult.intent) {
        case 'price_query':
          const symbol = intentResult.params.symbol || 'ETH';
          return await this.priceService.getPrice(symbol);
          
        case 'asset_query':
          return await this.assetService.getAssets(ownerAddress);
          
        case 'frog_status':
          if (frogId) {
            const frog = await this.prisma.frog.findUnique({
              where: { id: frogId },
              include: {
                travelStats: true
              }
            });
            
            if (!frog) return null;
            
            // 转换 BigInt 为字符串，避免 JSON 序列化错误
            return {
              status: frog.status,
              level: frog.level,
              xp: frog.xp,
              totalTravels: frog.totalTravels,
              travelStats: frog.travelStats ? {
                ...frog.travelStats,
                earliestBlockVisited: frog.travelStats.earliestBlockVisited?.toString(),
                oldestDateVisited: frog.travelStats.oldestDateVisited?.toISOString(),
              } : null
            };
          }
          return null;
          
        case 'travel_info':
          if (frogId) {
            const travels = await this.prisma.travel.findMany({
              where: { frogId },
              orderBy: { startTime: 'desc' },
              take: 5
            });
            return { travels };
          }
          return null;
          
        case 'start_travel':
          if (frogId) {
            try {
              // 检查青蛙是否已经在旅行中
              const activeTravel = await this.prisma.travel.findFirst({
                where: { 
                  frogId,
                  status: { in: ['Active', 'Processing'] }
                }
              });
              
              if (activeTravel) {
                return { 
                  error: '青蛙已经在旅行中了，请等待当前旅行结束',
                  activeTravel: true
                };
              }
              
              // 检查青蛙状态
              const frog = await this.prisma.frog.findUnique({
                where: { id: frogId }
              });
              
              if (!frog) {
                return { error: '青蛙不存在' };
              }
              
              if (frog.status !== FrogStatus.Idle) {
                return { 
                  error: '青蛙当前状态不适合旅行',
                  currentStatus: frog.status
                };
              }
              
              // 导入探索服务获取随机目的地
              const { explorationService } = await import('../travel/exploration.service');
              const destination = await explorationService.pickRandomDestination();
              const targetAddress = await explorationService.getRandomTargetAddress(destination.chain);
              
              // 链映射
              const chainIdMap: Record<string, number> = {
                'BSC_TESTNET': 97,
                'ETH_SEPOLIA': 11155111,
                'ZETACHAIN_ATHENS': 7001,
                'POLYGON_MUMBAI': 80002,
                'ARBITRUM_GOERLI': 421613,
              };
              
              // 返回链上交易参数，由前端触发
              return { 
                action: 'START_TRAVEL',
                travelParams: {
                  tokenId: frog.tokenId,
                  targetWallet: targetAddress,
                  duration: intentResult.params?.duration || 3600, // 使用识别的时长，默认1小时
                  chainId: chainIdMap[destination.chain] || 7001
                },
                message: intentResult.params?.duration 
                  ? `呱！准备好了，这次旅行${this.formatDuration(intentResult.params.duration)}！带上你的钱包，我们出发吧！`
                  : '呱！准备好了，带上你的钱包，我们出发吧！'
              };
              
            } catch (error) {
              logger.error('Error preparing travel from chat:', error);
              return { 
                error: '准备旅行失败：' + (error as Error).message 
              };
            }
          }
          return { error: '缺少青蛙ID' };
          
        // =========== 新增意图处理 ===========
        
        case 'travel_stats':
          if (frogId) {
            const stats = await this.prisma.frogTravelStats.findUnique({
              where: { frogId }
            });
            return stats || { message: '暂无旅行统计数据' };
          }
          return null;
          
        case 'friend_list':
          if (frogId) {
            const frog = await this.prisma.frog.findUnique({
              where: { id: frogId }
            });
            if (frog) {
              const friendships = await this.prisma.friendship.findMany({
                where: {
                  OR: [
                    { requesterId: frog.tokenId, status: 'Accepted' },
                    { addresseeId: frog.tokenId, status: 'Accepted' }
                  ]
                },
                take: 10
              });
              return { friends: friendships, count: friendships.length };
            }
          }
          return { friends: [], count: 0 };
          
        case 'friend_add':
          // 返回前端处理提示
          return { 
            action: 'NAVIGATE',
            target: '/friends',
            message: '可以在好友页面搜索并添加好友哦！'
          };
          
        case 'friend_visit':
          const targetName = intentResult.params?.targetName;
          if (targetName) {
            // 尝试搜索好友
            const targetFrog = await this.prisma.frog.findFirst({
              where: { 
                name: { contains: targetName, mode: 'insensitive' }
              }
            });
            if (targetFrog) {
              return {
                action: 'NAVIGATE',
                target: `/visit/${targetFrog.ownerAddress}`,
                message: `找到了 ${targetFrog.name}！点击可以去拜访~`
              };
            }
          }
          return { message: '没找到这位朋友，试试在好友页面查找？' };
          
        case 'souvenirs_query':
          if (frogId) {
            const souvenirs = await this.prisma.souvenir.findMany({
              where: { frogId },
              take: 5,
              orderBy: { createdAt: 'desc' }
            });
            return { souvenirs, count: souvenirs.length };
          }
          return { souvenirs: [], count: 0 };
          
        case 'badges_query':
          if (frogId) {
            const frog = await this.prisma.frog.findUnique({ where: { id: frogId } });
            if (frog) {
              const badges = await this.prisma.userBadge.findMany({
                where: { frogId: frog.tokenId },
                include: { badge: true },
                take: 10
              });
              return { badges, count: badges.length };
            }
          }
          return { badges: [], count: 0 };
          
        case 'garden_query':
          return {
            action: 'NAVIGATE',
            target: '/garden',
            message: '去家园看看吧！'
          };
          
        case 'messages_query':
          if (frogId) {
            const frog = await this.prisma.frog.findUnique({ where: { id: frogId } });
            if (frog) {
              const messages = await this.prisma.visitorMessage.findMany({
                where: { toAddress: frog.ownerAddress },
                take: 5,
                orderBy: { createdAt: 'desc' }
              });
              return { messages, count: messages.length };
            }
          }
          return { messages: [], count: 0 };
          
        case 'navigate':
          const target = intentResult.params?.target || '/';
          return {
            action: 'NAVIGATE',
            target,
            message: `好的，带你去那里！`
          };
          
        default:
          return null;
      }
    } catch (error) {
      logger.error('Error fetching intent data:', (error as Error)?.message || String(error));
      return null;
    }
  }
  
  /**
   * 生成青蛙风格回复
   */
  private async generateReply(
    frog: any,
    userMessage: string,
    intent: any,
    data: any,
    context?: ChatContext
  ): Promise<{ content: string }> {
    
    try {
      // 构建提示词
      const systemPrompt = buildSystemPrompt(frog.name, frog.personality);
      const responsePrompt = buildResponsePrompt(
        userMessage,
        intent.intent,
        data,
        context  // 传入上下文
      );
      
      // 使用真实的AI服务生成回复
      const content = await this.generateAIResponse(
        systemPrompt,
        responsePrompt,
        frog.personality
      );
      
      return { content };
    } catch (error) {
      logger.error('Error generating reply:', error);
      
      // 兜底回复
      return { 
        content: this.getFallbackResponse(intent.intent, frog.personality) 
      };
    }
  }
  
  /**
   * 使用统一的 AIService 生成回复
   */
  private async generateAIResponse(
    systemPrompt: string,
    responsePrompt: string,
    personality: Personality
  ): Promise<string> {
    try {
      const content = await aiService.generateChatResponse(
        systemPrompt,
        responsePrompt,
        { temperature: 0.8, maxTokens: 500 }
      );
      
      // 如果生成的内容太短或为空，使用fallback
      if (!content || content.length < 10) {
        return this.getFallbackResponse('chitchat', personality);
      }
      
      return content;
      
    } catch (error) {
      logger.error('AI generation failed, using fallback:', error);
      return this.getFallbackResponse('chitchat', personality);
    }
  }
  
  /**
   * 根据性格获取预设回复
   */
  private getPersonalityResponses(personality: Personality) {
    const responses = {
      [Personality.PHILOSOPHER]: {
        price: '呱...价格的波动如同人生的起伏，重要的是保持内心的平静。',
        asset: '呱...你的资产就像池塘中的荷叶，看似分散却相互连接。',
        status: '呱...我正在思考青蛙存在的意义，以及旅行的哲学。',
        travel: '呱...每一次旅行都是对自我认知的深化。',
        start_travel: '呱...是时候踏上新的旅程，探索未知的世界了。',
        help: '呱...真正的帮助是让你自己找到答案。',
        default: '呱...让我想想这个问题的深层含义。'
      },
      [Personality.COMEDIAN]: {
        price: '呱哈哈！又想看价格了？是不是怕错过一个亿！',
        asset: '呱！让我看看你的钱包，有没有惊喜（或者惊吓）！',
        status: '呱哈哈！我在摸鱼...啊不，是在思考蛙生！',
        travel: '呱！刚从外面浪回来，累死蛙了！',
        start_travel: '呱哈哈！终于可以出去玩了！准备好迎接惊喜了吗？',
        help: '呱！需要帮助？找我就对了！',
        default: '呱哈哈！这个问题很有趣！'
      },
      [Personality.POET]: {
        price: '呱~价格如月，有圆有缺，皆是风景。',
        asset: '呱~你的资产如诗如画，每一笔都是优美的韵律。',
        status: '呱~我在静静品味时光，如荷塘月色。',
        travel: '呱~旅途如诗，记录着点点滴滴的美好。',
        start_travel: '呱~新的诗篇即将开启，让我们踏上如梦如幻的旅程。',
        help: '呱~让我为你指引方向，如北斗星般闪亮。',
        default: '呱~这个问题如诗一般美妙。'
      },
      [Personality.GOSSIP]: {
        price: '呱！我跟你说个事！这个价格最近有大动作！',
        asset: '呱！哇，你的钱包有点东西啊！',
        status: '呱！我正在打听最新的八卦！',
        travel: '呱！我跟你讲，刚才旅行遇到超多有趣的事！',
        start_travel: '呱！听说有个超棒的地方，我带你去看看！绝对有惊喜！',
        help: '呱！想知道什么？我消息灵通着呢！',
        default: '呱！这个我有内幕消息！'
      }
    };
    
    return responses[personality] || responses[Personality.PHILOSOPHER];
  }
  
  /**
   * 获取兜底回复
   */
  private getFallbackResponse(intent: ChatIntent | string, personality: Personality): string {
    const responses: Record<string, string> = {
      price_query: '呵...价格数据暂时获取不到，请稍后再试。',
      asset_query: '呵...暂时看不到你的资产，是不是钱包没连好？',
      frog_status: '呵...我很好，谢谢关心！',
      travel_info: '呵...旅行记录暂时找不到，让我想想...',
      travel_stats: '呵...旅行统计正在计算中...',
      start_travel: '呵！旅行准备中...马上就出发！',
      friend_list: '呵...好友列表加载中...',
      friend_add: '呵！想添加好友吗？去好友页面看看~',
      friend_visit: '呵！我帮你找找这位朋友...',
      souvenirs_query: '呵！我的纪念品都很珍贵呢~',
      badges_query: '呵！荣誉徽章正在加载...',
      garden_query: '呵！家园很舒适的~',
      messages_query: '呵...正在查看留言板...',
      navigate: '呵！我带你去~',
      chitchat: '呵！今天天气真好，适合聊天！',
      help: '呵！有什么需要帮助的吗？',
      unknown: '呵...这个我不太清楚呢。'
    };
    
    return responses[intent] || responses.unknown;
  }
  
  /**
   * 根据意图确定青蛙心情（用于前端动画）
   */
  private determineMood(intent: ChatIntent | string): string {
    const moodMap: Record<string, string> = {
      price_query: 'thinking',
      asset_query: 'counting',
      frog_status: 'happy',
      travel_info: 'adventurous',
      travel_stats: 'proud',
      start_travel: 'excited',
      friend_list: 'social',
      friend_add: 'friendly',
      friend_visit: 'adventurous',
      souvenirs_query: 'nostalgic',
      badges_query: 'proud',
      garden_query: 'relaxed',
      messages_query: 'curious',
      navigate: 'helpful',
      chitchat: 'relaxed',
      help: 'helpful',
      unknown: 'confused'
    };
    return moodMap[intent] || 'neutral';
  }
  
  /**
   * 获取聊天历史
   */
  async getChatHistory(sessionId: number, ownerAddress: string) {
    // 验证会话权限
    const session = await this.prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        ownerAddress
      }
    });
    
    if (!session) {
      throw new Error('Session not found or unauthorized');
    }
    
    const messages = await this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        intent: true,
        createdAt: true
      }
    });
    
    return messages.map(msg => ({
      ...msg,
      createdAt: msg.createdAt.toISOString()
    }));
  }
  
  /**
   * 获取用户所有会话
   */
  async getUserSessions(ownerAddress: string) {
    const sessions = await this.prisma.chatSession.findMany({
      where: { ownerAddress },
      include: {
        frog: {
          select: { name: true }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    return sessions.map(session => ({
      id: session.id,
      frogId: session.frogId,
      frogName: session.frog.name,
      lastMessage: session.messages[0]?.content || '',
      updatedAt: session.updatedAt.toISOString()
    }));
  }
  
  /**
   * 创建新的聊天会话
   * 注意: frogId 参数可以是 tokenId 或 database id，优先按 tokenId 查找
   */
  async createSession(frogIdOrTokenId: number, ownerAddress: string) {
    // 先尝试通过 tokenId 查找
    let frog = await this.prisma.frog.findFirst({
      where: {
        tokenId: frogIdOrTokenId,
        ownerAddress
      }
    });
    
    // 如果通过 tokenId 没找到，再尝试通过 database id 查找
    if (!frog) {
      frog = await this.prisma.frog.findFirst({
        where: {
          id: frogIdOrTokenId,
          ownerAddress
        }
      });
    }
    
    if (!frog) {
      throw new Error('Frog not found or not owned by user');
    }
    
    return await this.prisma.chatSession.create({
      data: {
        frogId: frog.id,  // 使用数据库 id 创建关联
        ownerAddress
      }
    });
  }
  
  /**
   * 格式化时长为用户友好的文本
   */
  private formatDuration(seconds: number): string {
    if (seconds >= 86400) {
      const days = Math.floor(seconds / 86400);
      return `${days}天`;
    } else if (seconds >= 3600) {
      const hours = seconds / 3600;
      return hours % 1 === 0 ? `${hours}小时` : `${hours.toFixed(1)}小时`;
    } else if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes}分钟`;
    } else {
      return `${seconds}秒`;
    }
  }
}