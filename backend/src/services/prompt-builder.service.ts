import {
  STYLE_PREFIX,
  NEGATIVE_PROMPT,
  SOUVENIR_PROMPTS,
  CHAIN_THEMES,
  GROUP_TRAVEL_PROMPTS,
} from '../config/prompt-templates';

export interface PromptBuildInput {
  souvenirType: string;        // 纪念品类型
  rarity: string;              // 稀有度
  chainId?: number;            // 链 ID（可选）
  customElements?: string[];   // 自定义元素
}

export interface BuiltPrompt {
  prompt: string;
  negative_prompt: string;
}

export class PromptBuilderService {
  /**
   * 构建完整的图片生成 Prompt
   */
  buildPrompt(input: PromptBuildInput): BuiltPrompt {
    const souvenirConfig = SOUVENIR_PROMPTS[input.souvenirType];
    
    if (!souvenirConfig) {
      throw new Error(`Unknown souvenir type: ${input.souvenirType}`);
    }

    const parts: string[] = [];

    // 1. 风格前缀
    parts.push(STYLE_PREFIX);

    // 2. 纪念品基础描述
    parts.push(souvenirConfig.basePrompt);

    // 3. 颜色方案
    parts.push(souvenirConfig.colors);

    // 4. 稀有度增强
    const rarityKey = input.rarity.toUpperCase();
    const rarityEnhance = souvenirConfig.rarityEnhance[rarityKey];
    if (rarityEnhance) {
      parts.push(rarityEnhance);
    }

    // 5. 链主题（如果指定）
    if (input.chainId && CHAIN_THEMES[input.chainId]) {
      const chainTheme = CHAIN_THEMES[input.chainId];
      parts.push(`${chainTheme.name} blockchain themed`);
      parts.push(chainTheme.colors);
      parts.push(chainTheme.elements);
    }

    // 6. 自定义元素
    if (input.customElements?.length) {
      parts.push(...input.customElements);
    }

    // 7. 质量关键词
    parts.push('masterpiece', 'best quality', 'highly detailed');

    return {
      prompt: parts.join(', '),
      negative_prompt: NEGATIVE_PROMPT,
    };
  }

  /**
   * 构建简化的中文 Prompt（利用智能改写功能）
   * 
   * 注意：开启 prompt_extend=true 时，可以使用简短的中文描述，
   * 系统会自动扩展为详细的英文提示词
   */
  buildSimplePrompt(input: PromptBuildInput): BuiltPrompt {
    const souvenirConfig = SOUVENIR_PROMPTS[input.souvenirType];
    
    if (!souvenirConfig) {
      throw new Error(`Unknown souvenir type: ${input.souvenirType}`);
    }

    // 使用简洁的中文描述，让 AI 智能扩展
    const rarityDesc = this.getRarityDescription(input.rarity);
    const chainDesc = input.chainId ? this.getChainDescription(input.chainId) : '';

    const prompt = `
      可爱卡通风格的${souvenirConfig.nameZh}，
      ${rarityDesc}效果，
      ${chainDesc}
      明亮的色彩，精致的细节，
      透明背景，高清画质
    `.trim().replace(/\s+/g, ' ');

    return {
      prompt,
      negative_prompt: '模糊、低质量、变形、文字、水印、恐怖、黑暗',
    };
  }

  private getRarityDescription(rarity: string): string {
    const key = rarity.toUpperCase();
    const descriptions: Record<string, string> = {
      COMMON: '简洁',
      UNCOMMON: '精美',
      RARE: '闪耀的',
      EPIC: '华丽的魔法',
      LEGENDARY: '传奇的宇宙级',
    };
    return descriptions[key] || '精美';
  }

  private getChainDescription(chainId: number): string {
    const chain = CHAIN_THEMES[chainId];
    return chain ? `${chain.name}区块链主题，` : '';
  }

  /**
   * 构建结伴旅行的 Prompt（两只青蛙一起）
   */
  buildGroupTravelPrompt(input: {
    rarity: string;
    chainId?: number;
    leaderName?: string;
    companionName?: string;
    promptType?: 'TWO_FROGS_ADVENTURE' | 'TWO_FROGS_PHOTO';
  }): BuiltPrompt {
    const config = GROUP_TRAVEL_PROMPTS[input.promptType || 'TWO_FROGS_ADVENTURE'];
    
    if (!config) {
      throw new Error(`Unknown group travel prompt type: ${input.promptType}`);
    }

    const parts: string[] = [];

    // 1. 风格前缀
    parts.push(STYLE_PREFIX);

    // 2. 基础描述
    parts.push(config.basePrompt);

    // 3. 颜色方案
    parts.push(config.colors);

    // 4. 稀有度增强
    const rarityKey = input.rarity.toUpperCase();
    const rarityEnhance = config.rarityEnhance[rarityKey];
    if (rarityEnhance) {
      parts.push(rarityEnhance);
    }

    // 5. 链主题
    if (input.chainId && CHAIN_THEMES[input.chainId]) {
      const chainTheme = CHAIN_THEMES[input.chainId];
      parts.push(`${chainTheme.name} blockchain themed`);
      parts.push(chainTheme.elements);
    }

    // 6. 质量关键词
    parts.push('masterpiece', 'best quality', 'highly detailed', 'two frogs together', 'friendship');

    return {
      prompt: parts.join(', '),
      negative_prompt: NEGATIVE_PROMPT + ', single frog, lonely, alone',
    };
  }

  /**
   * 生成跨链探索发现描述 (AI驱动)
   * 用于实时追踪青蛙在目标链上的发现
   */
  buildCrossChainDiscoveryPrompt(input: {
    discoveryType: 'treasure' | 'landmark' | 'encounter' | 'wisdom' | 'rare';
    data: {
      contractAddress?: string;
      contractName?: string;
      tokenName?: string;
      tvl?: string;
      functionName?: string;
      encounterFrogName?: string;
      [key: string]: any;
    };
    chainId: number;
    frogName: string;
  }): string {
    const templates = {
      treasure: `请生成一段简短有趣的描述(30-50字)，描述青蛙${input.frogName}在区块链上发现了宝藏: ${input.data.tokenName || '神秘代币'}(合约: ${input.data.contractAddress})。使用可爱活泼的语气，就像一个探险故事。`,
      
      landmark: `请生成一段简短有趣的描述(30-50字)，描述青蛙${input.frogName}路过了知名DeFi协议 ${input.data.contractName}(TVL: ${input.data.tvl})。描述青蛙的好奇心和观察，使用探险的口吻。`,
      
      encounter: `请生成一段简短有趣的描述(30-50字)，描述青蛙${input.frogName}在链上遇到了另一只旅行青蛙 ${input.data.encounterFrogName}。描述他们的互动，表现友好和探险精神。`,
      
      wisdom: `请生成一段简短有趣的描述(30-50字)，描述青蛙${input.frogName}观察到了一个有趣的合约函数调用: ${input.data.functionName}。用青蛙的视角解读这个链上事件。`,
      
      rare: `请生成一段简短有趣的描述(30-50字)，描述青蛙${input.frogName}目击了一个稀有的链上事件。使用惊叹和兴奋的语气，营造冒险氛围。`,
    };

    return templates[input.discoveryType] || templates.treasure;
  }

  /**
   * 生成跨链旅行日记 (综合版)
   * 与传统旅行日记不同，跨链日记包含更多技术细节和发现
   */
  buildCrossChainJournalPrompt(input: {
    frogName: string;
    sourceChain: string;
    targetChain: string;
    duration: number; // seconds
    discoveries: Array<{
      type: string;
      title: string;
      location: string;
    }>;
    totalXp: number;
    rarity: string;
  }): string {
    const durationHours = Math.round(input.duration / 3600);
    const discoveryList = input.discoveries.map((d, i) => `${i + 1}. ${d.title} (${d.location})`).join('\n');

    return `
请为青蛙${input.frogName}的跨链探险生成一篇精彩的旅行日记(150-250字)：

**旅行信息**:
- 出发地: ${input.sourceChain}
- 目的地: ${input.targetChain}  
- 时长: ${durationHours}小时
- 稀有度: ${input.rarity}
- 总XP: ${input.totalXp}

**探索发现**:
${discoveryList}

**要求**:
1. 使用第一人称视角(青蛙的口吻)
2. 描述跨链传送的奇妙体验
3. 详细描述每个重要发现的过程和感受
4. 融入区块链元素(合约、DeFi协议、链上活动等)
5. 表现探险的兴奋感和好奇心
6. 结尾表达对跨链技术的感叹
7. 语气活泼可爱，富有冒险精神

请生成完整的日记内容，包含标题和正文。
    `.trim();
  }
}