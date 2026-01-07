import OpenAI from 'openai';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ObservationResult, NotableEvent } from './observer.service';

export interface GeneratedJournal {
    title: string;
    content: string;
    mood: 'happy' | 'excited' | 'thoughtful' | 'adventurous' | 'tired';
    highlights: string[];
}

/**
 * 增强版故事上下文 - 包含完整钱包数据
 */
export interface EnhancedStoryContext {
    frog: {
        name: string;
        personality?: string;
        level?: number;
    };
    chain: {
        name: string;
        chainId: number;
        gasPrice?: string;
        gasTrend?: 'spike' | 'normal' | 'low';
        scenery?: string;
        vibe?: string;
    };
    wallet: {
        address: string;
        balance: string;
        balanceFormatted: string;
        tokens: { symbol: string; balance: string }[];
        nfts: { name: string; tokenId: string }[];
        txCount: number;
        isContract: boolean;
        lastActivity?: string;
    };
    interesting?: {
        name: string;
        category: string;
        description?: string;
        rarity?: number;
    };
    footprints?: {
        message: string;
        location: string;
        timestamp: Date;
    }[];
    travel: {
        duration: number;
        isRandom: boolean;
        source: 'interesting' | 'local_frog' | 'chain_pool' | 'random';
    };
}


class AIService {
    private client: OpenAI;
    
    constructor() {
        // 使用 Qwen API (兼容 OpenAI 格式)
        this.client = new OpenAI({
            apiKey: config.QWEN_API_KEY,
            baseURL: config.QWEN_BASE_URL,
        });
    }
    
    /**
     * 根据观察数据生成旅行日记
     */
    async generateJournal(
        frogName: string,
        observation: ObservationResult,
        travelDuration: number,
        options?: boolean | {
            chainName?: string;
            chainScenery?: string;
            chainVibe?: string;
            isRandom?: boolean;
            footprints?: { message: string; location: string }[];
        }
    ): Promise<GeneratedJournal> {
        // 处理向后兼容性
        let isRandom = false;
        let chainInfo: { chainName?: string; chainScenery?: string; chainVibe?: string; footprints?: { message: string, location: string }[] } = {};
        
        if (typeof options === 'boolean') {
            isRandom = options;
        } else if (options) {
            isRandom = options.isRandom || false;
            chainInfo = {
                chainName: options.chainName,
                chainScenery: options.chainScenery,
                chainVibe: options.chainVibe,
                footprints: options.footprints,
            };
        }
        
        logger.info(`Generating journal for ${frogName}'s travel (isRandom: ${isRandom})`);
        
        const prompt = this.buildPrompt(frogName, observation, travelDuration, isRandom, chainInfo);
        
        try {
            // 增加重试机制
            let lastError: Error | null = null;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    const completion = await this.client.chat.completions.create({
                        model: 'qwen-turbo',
                        messages: [
                            {
                                role: 'system',
                                content: `你是一个创意写手，从一只可爱小青蛙"${frogName}"的视角写旅行日记。
青蛙刚完成了一次神奇的区块链钱包观察之旅。
用第一人称写作，语气俏皮温馨，富有好奇心。
日记应该 150-300 字。
把钱包活动转化为青蛙能理解的有趣比喻。
保持积极、天真、略带傻气的视角。
必须返回有效的 JSON 格式，不要包含其他文字。`
                            },
                            {
                                role: 'user',
                                content: prompt
                            }
                        ],
                        temperature: 0.8,
                        max_tokens: 1000,
                    });
                    
                    const content = completion.choices[0]?.message?.content || '';
                    
                    // 清理内容，移除可能的markdown标记
                    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
                    
                    // 尝试解析 JSON
                    try {
                        const result = JSON.parse(cleanContent);
                        
                        // 验证必要字段
                        if (result.title && result.content) {
                            return {
                                title: result.title,
                                content: result.content,
                                mood: result.mood || 'happy',
                                highlights: result.highlights || [],
                            };
                        }
                    } catch (parseError) {
                        logger.warn(`JSON解析失败 (尝试 ${attempt}):`, parseError);
                        // 尝试从纯文本创建日记
                        if (cleanContent && cleanContent.length > 50) {
                            return {
                                title: `${frogName}的区块链冒险`,
                                content: cleanContent,
                                mood: 'happy',
                                highlights: ['探索了区块链世界'],
                            };
                        }
                    }
                    
                    // 如果这次尝试失败，记录并继续下一次尝试
                    lastError = new Error(`尝试 ${attempt} 失败: 内容解析失败`);
                    
                } catch (apiError) {
                    lastError = apiError as Error;
                    logger.warn(`AI API调用失败 (尝试 ${attempt}):`, apiError);
                    
                    // 如果不是最后一次尝试，等待一段时间后重试
                    if (attempt < 3) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                    }
                }
            }
            
            // 所有尝试都失败，使用fallback
            logger.error('AI generation failed after 3 attempts:', lastError);
            return this.generateFallbackJournal(frogName, observation);
            
        } catch (error) {
            logger.error('AI generation failed:', error);
            return this.generateFallbackJournal(frogName, observation);
        }
    }
    
    /**
     * 增强版日记生成 - 使用完整钱包数据驱动
     */
    async generateJournalEnhanced(context: EnhancedStoryContext): Promise<GeneratedJournal> {
        logger.info(`[AI] Generating enhanced journal for ${context.frog.name} exploring ${context.chain.name}`);
        
        const prompt = this.buildEnhancedPrompt(context);
        
        try {
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    const completion = await this.client.chat.completions.create({
                        model: 'qwen-turbo',
                        messages: [
                            {
                                role: 'system',
                                content: this.getEnhancedSystemPrompt(context)
                            },
                            {
                                role: 'user',
                                content: prompt
                            }
                        ],
                        temperature: 0.85,
                        max_tokens: 1200,
                    });
                    
                    const content = completion.choices[0]?.message?.content || '';
                    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
                    
                    try {
                        const result = JSON.parse(cleanContent);
                        if (result.title && result.content) {
                            logger.info(`[AI] Enhanced journal generated successfully`);
                            return {
                                title: result.title,
                                content: result.content,
                                mood: result.mood || 'adventurous',
                                highlights: result.highlights || [],
                            };
                        }
                    } catch (parseError) {
                        if (cleanContent && cleanContent.length > 50) {
                            return {
                                title: `${context.frog.name}的${context.chain.name}奇遇`,
                                content: cleanContent,
                                mood: 'adventurous',
                                highlights: ['探索了区块链世界'],
                            };
                        }
                    }
                } catch (apiError) {
                    logger.warn(`[AI] Enhanced generation attempt ${attempt} failed:`, apiError);
                    if (attempt < 3) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                    }
                }
            }
            
            return this.generateEnhancedFallback(context);
        } catch (error) {
            logger.error('[AI] Enhanced generation failed:', error);
            return this.generateEnhancedFallback(context);
        }
    }
    
    /**
     * 增强版系统提示词
     */
    private getEnhancedSystemPrompt(context: EnhancedStoryContext): string {
        const personality = context.frog.personality || '好奇活泼';
        return `你是一个创意写手，为一只性格${personality}的小青蛙"${context.frog.name}"写旅行日记。

写作规则：
1. 第一人称视角，语气俏皮温馨，带点区块链梗
2. 把链上数据转化为青蛙能理解的有趣比喻
3. 如果发现了有趣地址（DeFi/NFT/巨鲸），要特别描述这次"奇遇"
4. 字数 200-350 字
5. 必须返回有效的 JSON 格式

${context.interesting ? `【特别关注】青蛙发现了 ${context.interesting.name}（${context.interesting.category}类地址）！这是稀有度 ${context.interesting.rarity || 3}/5 的发现！` : ''}`;
    }
    
    /**
     * 增强版 Prompt 构建
     */
    private buildEnhancedPrompt(context: EnhancedStoryContext): string {
        const { frog, chain, wallet, interesting, travel } = context;
        
        // 生成钱包描述
        let walletDescription = '';
        if (wallet.isContract) {
            walletDescription = '🤖 这是一个智能合约地址！';
        } else if (parseFloat(wallet.balance) > 1000) {
            walletDescription = `🐋 巨鲸出没！余额高达 ${wallet.balanceFormatted}`;
        } else if (parseFloat(wallet.balance) > 0) {
            walletDescription = `💰 发现 ${wallet.balanceFormatted} 余额`;
        } else {
            walletDescription = '🏚️ 钱包空空如也';
        }
        
        // 代币信息
        let tokenInfo = '';
        if (wallet.tokens.length > 0) {
            const tokenList = wallet.tokens.slice(0, 3).map(t => `${t.balance} ${t.symbol}`).join(', ');
            tokenInfo = `\n💎 持有代币: ${tokenList}`;
        }
        
        // Gas 信息
        let gasInfo = '';
        if (chain.gasPrice) {
            const trendEmoji = chain.gasTrend === 'spike' ? '🔥' : chain.gasTrend === 'low' ? '💤' : '⚡';
            gasInfo = `\nGas 价格: ${chain.gasPrice} ${trendEmoji}`;
        }
        
        // 地址来源描述
        const sourceDescription: Record<string, string> = {
            'interesting': '🌟 这是预设的有趣地址',
            'local_frog': '🐸 这是系统内其他青蛙主人的家',
            'chain_pool': '🔗 这是链上活跃地址',
            'random': '🎲 这是随机发现的地址',
        };
        
        return `
为 ${frog.name} 写一篇旅行日记，它刚从 ${travel.duration} 小时的 ${chain.name} 之旅归来。

【旅行类型】
${travel.isRandom ? '🎲 随机探险' : '🎯 定向访问'} - ${sourceDescription[travel.source] || '未知来源'}

【探索发现】
📍 目的地: ${chain.name} (${wallet.address.slice(0, 8)}...)
${walletDescription}
📊 历史交易: ${wallet.txCount} 笔
${wallet.lastActivity ? `⏰ 活跃度: ${wallet.lastActivity}` : ''}
${tokenInfo}
${gasInfo}

${interesting ? `
【特殊发现】⭐
类型: ${interesting.category}
名称: ${interesting.name}
${interesting.description ? `描述: ${interesting.description}` : ''}
稀有度: ${'⭐'.repeat(interesting.rarity || 3)}
` : ''}
${context.footprints && context.footprints.length > 0 ? `
【青蛙留下的足迹】🐾
${context.footprints.map(fp => `- 在 ${fp.location.slice(0,8)}... 留言: "${fp.message}"`).join('\n')}
` : ''}

请返回 JSON：
{
  "title": "日记标题（包含地点或发现）",
  "content": "200-350字的日记内容",
  "mood": "happy/excited/thoughtful/adventurous/tired",
  "highlights": ["3个旅行亮点"]
}`;
    }
    
    /**
     * 增强版 Fallback
     */
    private generateEnhancedFallback(context: EnhancedStoryContext): GeneratedJournal {
        const { frog, chain, wallet, interesting } = context;
        
        let title = `${frog.name}的${chain.name}之旅`;
        let content = `呱！亲爱的日记：\n\n今天我在${chain.name}进行了一次神奇的探险！`;
        let highlights: string[] = [`探索了${chain.name}`];
        let mood: GeneratedJournal['mood'] = 'happy';
        
        if (interesting) {
            title = `${frog.name}发现${interesting.name}`;
            content += `\n\n🌟 最让我兴奋的是发现了${interesting.name}！这可是一个${interesting.category}类型的地址呀！`;
            highlights.push(`发现${interesting.name}`);
            mood = 'excited';
        }
        
        if (wallet.isContract) {
            content += `\n\n🤖 我还发现这是一个智能合约地址，里面藏着好多复杂的代码~`;
            highlights.push('探索智能合约');
        } else if (parseFloat(wallet.balance) > 100) {
            content += `\n\n💰 这个钱包有 ${wallet.balanceFormatted} 的余额，是个大户！`;
            highlights.push('发现富有钱包');
        }
        
        if (context.footprints && context.footprints.length > 0) {
            content += `\n\n🐾 我还在那里留下了一个足迹！给地址 ${context.footprints[0].location.slice(0,6)}... 留言说："${context.footprints[0].message}"。好开心呀！`;
            highlights.push('留下了足迹');
        }
        
        content += `\n\n这次冒险真是太棒了！\n\n🐸 ${frog.name}`;
        
        return { title, content, mood, highlights };
    }
    
    private buildPrompt(
        frogName: string,
        observation: ObservationResult,
        travelDuration: number,
        isRandom: boolean = false,
        chainInfo?: { chainName?: string; chainScenery?: string; chainVibe?: string; footprints?: { message: string, location: string }[] }
    ): string {
        const txCount = observation.totalTxCount;
        const notableEvents = observation.notableEvents;
        
        let activitySummary = '';
        
        if (txCount === 0) {
            activitySummary = '这个钱包在我访问期间非常安静，像一个宁静的池塘！';
        } else if (txCount < 5) {
            activitySummary = `这个钱包有 ${txCount} 笔交易 - 就像水面上轻轻的涟漪。`;
        } else if (txCount < 20) {
            activitySummary = `这个钱包相当活跃，有 ${txCount} 笔交易 - 像繁忙的荷叶市场！`;
        } else {
            activitySummary = `哇！这个钱包有 ${txCount} 笔交易 - 简直像场盛大的节日！`;
        }
        
        let eventDescriptions = '';
        if (notableEvents.length > 0) {
            eventDescriptions = '\n\n我见证的特别事件：\n' +
                notableEvents.map(e => `- ${e.description}`).join('\n');
        }
        
        // 获取链名称
const getChainName = (chainId: number): string => {
  const chainNames: Record<number, string> = {
    1: '以太坊',
    56: 'BNB Chain',
    97: 'BSC测试网',
    137: 'Polygon',
    80002: 'Polygon Amoy测试网',
    11155111: 'Sepolia测试网',
    7001: 'ZetaChain',
  };
  return chainNames[chainId] || `链${chainId}`;
};

return `
为小青蛙 ${frogName} 写一篇旅行日记，它刚从 ${travelDuration} 小时的旅程中归来。

【旅行性质】
${isRandom ? '这是一次【随机探险】🎲！青蛙漫无目的地旅行，意外发现了一个感兴趣的钱包并开始了观察。' : '这是一次【定向旅行】🎯！青蛙受主人之托，专门去观察一个特定的目的地。'}

旅行详情：
- 时长: ${travelDuration} 小时
- 目的地: ${getChainName(observation.chainId || 1)}区块链 (观察的钱包: ${observation.walletAddress.slice(0, 8)}...)
- 活动程度: ${activitySummary}
${eventDescriptions}
${chainInfo?.footprints && chainInfo.footprints.length > 0 ? `
【我的足迹】🐾
${chainInfo.footprints.map(fp => `- 在 ${fp.location.slice(0,8)}... 留言: "${fp.message}"`).join('\n')}
` : ''}

${isRandom ? '重点强调：这种“意外发现”带来的惊喜感和奇妙缘分。' : ''}

请返回 JSON 格式：
{
  "title": "日记的标题",
  "content": "完整的日记内容，从青蛙的第一人称视角写",
  "mood": "happy/excited/thoughtful/adventurous/tired 中的一个",
  "highlights": ["2-3个旅行亮点"]
}
`;
    }
    
    private generateFallbackJournal(
        frogName: string,
        observation: ObservationResult
    ): GeneratedJournal {
        const txCount = observation.totalTxCount;
        
        // 获取链名称
        const getChainName = (chainId: number): string => {
          const chainNames: Record<number, string> = {
            1: '以太坊',
            56: 'BNB Chain',
            97: 'BSC测试网',
            137: 'Polygon',
            80002: 'Polygon Amoy测试网',
            11155111: 'Sepolia测试网',
            7001: 'ZetaChain',
          };
          return chainNames[chainId] || `链${chainId}`;
        };
        
        const chainName = getChainName(observation.chainId || 1);
        
        // 动态生成内容，减少硬编码
        
                const generateDynamicContent = (txCount: number, chainName: string): { title: string; content: string; mood: string; highlights: string[] } => {
        
                    const templates = {
        
                        0: {
        
                            title: `${frogName}的${chainName}静思之旅`,
        
                            content: `呱！亲爱的日记：\n\n今天我在${chainName}的区块链世界里度过了一段宁静的时光。就像坐在一片平静的荷叶上，我静静观察着数字世界的流动。虽然没有看到太多交易，但这种宁静让我能更好地感受区块链的本质。每一秒的等待都像是在聆听区块链的心跳。我很高兴体验了这份独特的宁静！\n\n🐸 ${frogName}`,
        
                            mood: 'thoughtful',
        
                            highlights: [`体验了${chainName}的宁静`, '感受区块链本质', '静心观察时光'],
        
                        },
        
                        low: {
        
                            title: `${frogName}的${chainName}初探`,
        
                            content: `呱！亲爱的日记：\n\n今天我在${chainName}上看到了 ${txCount} 笔交易，就像发现了 ${txCount} 颗闪闪发光的露珠！每一笔交易都像一个小故事，让我着迷地观察着。虽然不算太热闹，但这种恰到好处的活动让我感觉很舒服。我学到了很多关于${chainName}的知识！\n\n🐸 ${frogName}`,
        
                            mood: 'happy',
        
                            highlights: [`发现了${txCount}笔交易`, `初识${chainName}`, '收获满满'],
        
                        },
        
                        medium: {
        
                            title: `${frogName}的${chainName}冒险`,
        
                            content: `呱！亲爱的日记：\n\n哇！${chainName}今天真热闹！我看到了整整 ${txCount} 笔交易，就像参加了一场盛大的荷叶派对！交易来来往往，每一笔都充满了活力。我努力记录下每一个精彩瞬间，感觉自己像个真正的区块链探险家。这次冒险太精彩了！\n\n🐸 ${frogName}`,
        
                            mood: 'excited',
        
                            highlights: [`见证了${txCount}笔交易`, `${chainName}热闹非凡`, '探险家体验'],
        
                        },
        
                        high: {
        
                            title: `${frogName}的${chainName}奇遇`,
        
                            content: `呱！亲爱的日记：\n\n天哪！${chainName}简直太疯狂了！整整 ${txCount} 笔交易！就像整个区块链世界都在开派对！我被这股热潮深深吸引，感觉自己像个超级明星一样受欢迎。虽然有点眼花缭乱，但这种激动人心的体验让我终生难忘！\n\n🐸 ${frogName}`,
        
                            mood: 'adventurous',
        
                            highlights: [`震撼的${txCount}笔交易`, `${chainName}狂欢体验`, '终生难忘的冒险'],
        
                        }
        
                    };
        
        
        
                    let template;
        
                    if (txCount === 0) template = templates[0];
        
                    else if (txCount < 5) template = templates.low;
        
                    else if (txCount < 20) template = templates.medium;
        
                    else template = templates.high;
        
        
        
                    return template;
        
                };
        
        
        
                const dynamicContent = generateDynamicContent(txCount, chainName);
        
                
        
                return {
        
                    title: dynamicContent.title,
        
                    content: dynamicContent.content,
        
                    mood: dynamicContent.mood as any,
        
                    highlights: dynamicContent.highlights,
        
                };    }
}

export const aiService = new AIService();
