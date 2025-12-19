import {
  STYLE_PREFIX,
  NEGATIVE_PROMPT,
  SOUVENIR_PROMPTS,
  CHAIN_THEMES,
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
}