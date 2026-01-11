// backend/src/services/ai/intent.service.ts

import { ChatIntent } from '@prisma/client';

// 意图识别结果
interface IntentResult {
  intent: ChatIntent;
  confidence: number;      // 0-1 置信度
  params: IntentParams;    // 提取的参数
}

// 不同意图的参数
type IntentParams = 
  | PriceQueryParams 
  | AssetQueryParams 
  | FrogStatusParams 
  | TravelInfoParams
  | FriendParams
  | CollectionParams
  | GardenParams
  | NavigateParams
  | ChitchatParams;

interface PriceQueryParams {
  symbol?: string;
  comparison?: boolean;
}

interface AssetQueryParams {
  chainId?: number;
  assetType?: 'all' | 'tokens' | 'nfts';
}

interface FrogStatusParams {
  frogId?: number;
}

interface TravelInfoParams {
  frogId?: number;
  travelId?: number;
  isRandom?: boolean;
  duration?: number;
}

interface FriendParams {
  targetName?: string;
  targetAddress?: string;
}

interface CollectionParams {
  type?: 'souvenirs' | 'badges';
}

interface GardenParams {
  targetAddress?: string;
}

interface NavigateParams {
  target?: string;
}

interface ChitchatParams {
  topic?: string;
}

interface StartTravelParams {
  isRandom?: boolean;
  duration?: number;
  targetChain?: string;
}

export class IntentService {
  
  // 所有支持的意图及其描述（用于 AI 分类）
  private readonly intentDescriptions: Record<string, string> = {
    price_query: '查询加密货币价格，如"ETH多少钱"、"比特币价格"',
    asset_query: '查询用户钱包资产余额',
    frog_status: '查询青蛙当前状态、等级、经验',
    travel_info: '查询旅行历史记录',
    travel_stats: '查询旅行统计数据（次数、成就等）',
    start_travel: '发起一次新的旅行探险',
    friend_list: '查看好友列表',
    friend_add: '添加新好友',
    friend_visit: '拜访好友的家园',
    souvenirs_query: '查看收集的纪念品',
    badges_query: '查看获得的徽章/成就',
    garden_query: '查看自己或他人的家园',
    messages_query: '查看留言板消息',
    navigate: '导航到某个页面，如"打开好友页面"',
    help: '寻求帮助，了解功能',
    chitchat: '闲聊、问候、其他无法分类的对话',
    unknown: '无法识别的意图',
  };
  
  /**
   * 使用 Qwen AI 识别用户意图
   */
  async classifyIntent(userMessage: string): Promise<IntentResult> {
    // 边界情况：空消息
    if (!userMessage || userMessage.trim().length === 0) {
      return {
        intent: 'unknown' as ChatIntent,
        confidence: 1.0,
        params: {}
      };
    }
    
    try {
      const result = await this.aiClassify(userMessage);
      return result;
    } catch (error) {
      console.error('[IntentService] AI classification failed:', error);
      return this.fallbackMatch(userMessage);
    }
  }
  
  /**
   * 使用 Qwen AI 进行意图分类
   */
  private async aiClassify(message: string): Promise<IntentResult> {
    const { aiService } = await import('../ai.service');
    
    const intentList = Object.entries(this.intentDescriptions)
      .map(([key, desc]) => `- ${key}: ${desc}`)
      .join('\n');
    
    const systemPrompt = `你是一个意图分类器。根据用户输入，识别用户意图并提取相关参数。

可选意图：
${intentList}

返回格式必须是有效的 JSON：
{
  "intent": "意图名称",
  "confidence": 0.0-1.0,
  "params": { ... }
}

参数说明：
- price_query: { "symbol": "代币符号如ETH/BTC" }
- start_travel: { "duration": 秒数, "isRandom": true/false }
- friend_add/friend_visit: { "targetName": "目标名称" }
- navigate: { "target": "目标路由如/friends, /garden, /badges" }
- 其他意图可以返回空 params: {}`;

    const userPrompt = `用户说：${message}

请分类意图并提取参数，仅返回JSON，不要其他文字。`;

    try {
      const response = await aiService.generateChatResponse(
        systemPrompt,
        userPrompt,
        { temperature: 0.3, maxTokens: 200 }
      );
      
      const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanResponse);
      
      const validIntents = Object.keys(this.intentDescriptions);
      if (!validIntents.includes(parsed.intent)) {
        parsed.intent = 'chitchat';
        parsed.confidence = 0.5;
      }
      
      return {
        intent: parsed.intent as ChatIntent,
        confidence: parsed.confidence || 0.8,
        params: parsed.params || {}
      };
    } catch (parseError) {
      console.error('[IntentService] Failed to parse AI response:', parseError);
      return this.fallbackMatch(message);
    }
  }
  
  /**
   * 兜底匹配策略（当 AI 调用失败时使用）
   */
  private fallbackMatch(message: string): IntentResult {
    const lowerMsg = message.toLowerCase();
    
    // 价格查询
    const priceTokens = this.extractTokenSymbol(message);
    if (priceTokens) {
      return {
        intent: 'price_query' as ChatIntent,
        confidence: 0.7,
        params: { symbol: priceTokens }
      };
    }
    
    // 旅行相关
    const travelKeywords = ['旅行', '出发', '探险', '探索', '冒险', 'travel'];
    if (travelKeywords.some(k => lowerMsg.includes(k))) {
      const duration = this.extractDuration(message);
      return {
        intent: 'start_travel' as ChatIntent,
        confidence: 0.6,
        params: { isRandom: true, duration }
      };
    }
    
    // 好友相关
    const friendKeywords = ['好友', '朋友', '拜访', 'friend'];
    if (friendKeywords.some(k => lowerMsg.includes(k))) {
      return {
        intent: 'friend_list' as ChatIntent,
        confidence: 0.6,
        params: {}
      };
    }
    
    // 青蛙状态
    const frogKeywords = ['青蛙', '在干嘛', '状态', '等级'];
    if (frogKeywords.some(k => lowerMsg.includes(k))) {
      return {
        intent: 'frog_status' as ChatIntent,
        confidence: 0.6,
        params: {}
      };
    }
    
    // 帮助
    const helpKeywords = ['帮助', 'help', '怎么用', '功能', '指令'];
    if (helpKeywords.some(k => lowerMsg.includes(k))) {
      return {
        intent: 'help' as ChatIntent,
        confidence: 0.8,
        params: {}
      };
    }
    
    // 默认为闲聊
    return {
      intent: 'chitchat' as ChatIntent,
      confidence: 0.5,
      params: { topic: message }
    };
  }
  
  /**
   * 从消息中提取代币符号
   */
  private extractTokenSymbol(message: string): string | null {
    const tokens = ['ETH', 'BTC', 'ZETA', 'USDT', 'USDC', 'ARB', 'OP', 'SOL', 'BNB', 'MATIC'];
    const upperMsg = message.toUpperCase();
    
    const cnMap: Record<string, string> = {
      '以太坊': 'ETH', 
      '以太': 'ETH',
      '比特币': 'BTC', 
      '大饼': 'BTC',
      '泽塔': 'ZETA',
    };
    
    for (const [cn, symbol] of Object.entries(cnMap)) {
      if (message.includes(cn)) return symbol;
    }
    
    for (const token of tokens) {
      if (upperMsg.includes(token)) return token;
    }
    
    return null;
  }
  
  /**
   * 从消息中提取旅行时长（返回秒数）
   */
  private extractDuration(message: string): number | undefined {
    // 小时
    const hourMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:个)?小时/);
    if (hourMatch) {
      return Math.floor(parseFloat(hourMatch[1]) * 3600);
    }
    
    // 分钟
    const minuteMatch = message.match(/(\d+)\s*(?:分钟|分)/);
    if (minuteMatch) {
      return parseInt(minuteMatch[1]) * 60;
    }
    
    // 天
    const dayMatch = message.match(/(\d+)\s*天/);
    if (dayMatch) {
      return parseInt(dayMatch[1]) * 86400;
    }
    
    return undefined;
  }
}

export { IntentResult, IntentParams };