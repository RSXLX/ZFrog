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
  | ChitchatParams;

interface PriceQueryParams {
  symbol?: string;         // 代币符号 (ETH, BTC)
  comparison?: boolean;    // 是否需要对比
}

interface AssetQueryParams {
  chainId?: number;        // 指定链
  assetType?: 'all' | 'tokens' | 'nfts';
}

interface FrogStatusParams {
  frogId?: number;
}

interface TravelInfoParams {
  frogId?: number;
  travelId?: number;
  isRandom?: boolean;
  duration?: number;       // 旅行时长（秒）
}

interface ChitchatParams {
  topic?: string;
  isRandom?: boolean;
  duration?: number;       // 旅行时长（秒）
}

export class IntentService {
  
  /**
   * 使用规则引擎 + AI 识别用户意图
   */
  async classifyIntent(userMessage: string): Promise<IntentResult> {
    // 1. 先尝试规则引擎快速匹配
    const ruleResult = this.quickMatch(userMessage);
    if (ruleResult && ruleResult.confidence >= 0.8) {
      return ruleResult;
    }
    
    // 2. 规则引擎无法确定或置信度低，使用兜底策略
    return this.fallbackMatch(userMessage);
  }
  
  /**
   * 规则引擎快速匹配（优先使用，节省 API 调用）
   */
  private quickMatch(message: string): IntentResult | null {
    const lowerMsg = message.toLowerCase();
    
    // 价格查询关键词
    const priceKeywords = ['价格', '多少钱', '行情', 'price', '涨', '跌', '多少', '值'];
    const priceTokens = this.extractTokenSymbol(message);
    
    if (priceKeywords.some(k => lowerMsg.includes(k)) && priceTokens) {
      return {
        intent: 'price_query',
        confidence: 0.9,
        params: { symbol: priceTokens }
      };
    }
    
    // 资产查询关键词
    const assetKeywords = ['余额', '资产', '钱包', '有多少', '我的', '持有', '拥有'];
    if (assetKeywords.some(k => lowerMsg.includes(k))) {
      return {
        intent: 'asset_query',
        confidence: 0.85,
        params: { assetType: 'all' }
      };
    }
    
    // 青蛙状态关键词
    const frogKeywords = ['青蛙', '在干嘛', '状态', '在哪', '怎么样', '等级', '经验'];
    if (frogKeywords.some(k => lowerMsg.includes(k))) {
      return {
        intent: 'frog_status',
        confidence: 0.85,
        params: {}
      };
    }
    
    // 随机旅行触发关键词（优先检查，避免被 travel_info 误匹配）
    const startTravelKeywords = [
      '出发', '去旅行', '开始旅行', '随机旅行', '去探险', '去探索', 
      '带我走', '出发吧', '旅行去', '探险去', '开始探险', '随机探险',
      '我想去旅行', '想去旅行', '让我去旅行', '去冒险', '开始冒险',
      '可以去旅行', '能去旅行', '测试旅行'
    ];
    if (startTravelKeywords.some(k => lowerMsg.includes(k))) {
      // 提取旅行时长
      let duration = this.extractDuration(message);
      
      // 如果包含"测试"关键词且没有指定时长，默认1分钟
      if (!duration && (lowerMsg.includes('测试') || lowerMsg.includes('试试'))) {
        duration = 60; // 1分钟
      }
      
      return {
        intent: 'start_travel',
        confidence: 0.9,
        params: { 
          isRandom: true,
          duration: duration // 秒数
        }
      };
    }
    
    // 旅行信息关键词（放在 start_travel 之后检查）
    const travelKeywords = ['旅行记录', '去了哪', '旅程', '游记', '纪念品'];
    if (travelKeywords.some(k => lowerMsg.includes(k))) {
      return {
        intent: 'travel_info',
        confidence: 0.85,
        params: {}
      };
    }
    
    // 帮助关键词
    const helpKeywords = ['帮助', 'help', '怎么用', '功能', '指令'];
    if (helpKeywords.some(k => lowerMsg.includes(k))) {
      return {
        intent: 'help',
        confidence: 0.9,
        params: {}
      };
    }
    
    return null; // 需要进一步分析
  }
  
  /**
   * 兜底匹配策略
   * TODO: 未来可以集成 AI 进行更智能的意图识别
   */
  private async fallbackMatch(message: string): Promise<IntentResult> {
    const lowerMsg = message.toLowerCase();
    
    // 检查是否包含任何代币符号
    const priceTokens = this.extractTokenSymbol(message);
    if (priceTokens) {
      return {
        intent: 'price_query',
        confidence: 0.6,
        params: { symbol: priceTokens }
      };
    }
    
    // 默认为闲聊
    return {
      intent: 'chitchat',
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
    
    // 中文映射
    const cnMap: Record<string, string> = {
      '以太坊': 'ETH', 
      '以太': 'ETH',
      '比特币': 'BTC', 
      '大饼': 'BTC',
      '柴犬': 'SHIB',
      '币安币': 'BNB',
      '马蹄': 'MATIC'
    };
    
    // 先检查中文
    for (const [cn, symbol] of Object.entries(cnMap)) {
      if (message.includes(cn)) return symbol;
    }
    
    // 再检查英文缩写
    for (const token of tokens) {
      if (upperMsg.includes(token)) return token;
    }
    
    return null;
  }
  
  /**
   * 验证意图参数的有效性
   */
  validateIntentParams(intent: ChatIntent, params: IntentParams): boolean {
    switch (intent) {
      case 'price_query':
        const priceParams = params as PriceQueryParams;
        return !priceParams.symbol || this.isValidToken(priceParams.symbol);
        
      case 'asset_query':
        const assetParams = params as AssetQueryParams;
        return !assetParams.chainId || this.isValidChainId(assetParams.chainId);
        
      case 'frog_status':
      case 'travel_info':
        return true; // 参数可选
        
      default:
        return true;
    }
  }
  
  /**
   * 检查是否为有效的代币符号
   */
  private isValidToken(symbol: string): boolean {
    const validTokens = ['ETH', 'BTC', 'ZETA', 'USDT', 'USDC', 'ARB', 'OP', 'SOL', 'BNB', 'MATIC'];
    return validTokens.includes(symbol.toUpperCase());
  }
  
  /**
   * 检查是否为有效的链ID
   */
  private isValidChainId(chainId: number): boolean {
    const validChainIds = [97, 11155111, 7001, 80001, 421613]; // 测试链ID
    return validChainIds.includes(chainId);
  }
  
  /**
   * 从消息中提取旅行时长（返回秒数）
   */
  private extractDuration(message: string): number | undefined {
    // 匹配模式：数字 + 时间单位
    // 支持：1小时、30分钟、2天、1.5小时等
    
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
    
    // 默认返回 undefined，由调用方使用默认值
    return undefined;
  }
}