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
                                mood: this.normalizeMood(result.mood || 'happy') as any,
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
                                mood: this.normalizeMood('happy') as any,
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
     * P0 探索旅行日记生成 - 基于 ExplorationResult 数据
     * 统一 TravelP0Service 的 AI 调用入口
     */
    async generateJournalFromExploration(params: {
        frogName: string;
        chain: string;
        chainId: number;
        blockNumber: bigint;
        snapshot: {
            address: string;
            nativeBalance: string;
            nativeSymbol: string;
            txCount: number;
            walletAge: string;
            isContract: boolean;
            tokens: { symbol: string; balance: string }[];
        };
        discoveries: { type: string; title: string; description: string; rarity: number }[];
        transactionContext?: { hash: string; method: string; value: string };
        networkStatus?: { gasPrice: string };
        souvenir: { name: string; emoji: string; description: string };
    }): Promise<GeneratedJournal> {
        const { frogName, chain, chainId, blockNumber, snapshot, discoveries, transactionContext, networkStatus, souvenir } = params;
        const chainChar = this.getChainCharacter(chainId);
        
        logger.info(`[AI] Generating P0 exploration journal for ${frogName} on ${chain}`);
        
        // 构建探索专用 prompt
        const prompt = `
为小青蛙「${frogName}」写一篇旅行日记，它刚从 ${chain}${chainChar.emoji} 的探险归来。

【探索目的地】
- 链: ${chain} (区块 #${blockNumber})
- 钱包: ${snapshot.address.slice(0, 10)}...
- 链的氛围: ${chainChar.vibe}

【观察到的情况】
- 余额: ${snapshot.nativeBalance} ${snapshot.nativeSymbol}
- 交易历史: ${snapshot.txCount} 笔
- 钱包状态: ${snapshot.walletAge}
${snapshot.isContract ? '- ⚠️ 这是一个智能合约地址！' : ''}
${snapshot.tokens.length > 0 ? `- 持有代币: ${snapshot.tokens.map(t => `${t.balance} ${t.symbol}`).join(', ')}` : ''}
${transactionContext ? `
- 观察到的交易: ${transactionContext.method}
- 交易值: ${transactionContext.value} ${snapshot.nativeSymbol}` : ''}
${networkStatus ? `- 网络 Gas: ${networkStatus.gasPrice} Gwei` : ''}

【旅途中的发现】
${discoveries.map(d => `- [${d.type}] ${d.title}: ${d.description}`).join('\n')}

【带回的纪念品】
${souvenir.emoji} ${souvenir.name}: ${souvenir.description}

请以第一人称写一篇 150-250 字的旅行日记，要求：
1. 🐸 用可爱、天真的青蛙口吻
2. 🌈 把区块链概念转化为生动比喻
3. 🎁 提到带回的纪念品
4. 😴 可以有点小情绪（开心/困/好奇等）

请以 JSON 格式输出：
{
  "title": "日记标题（5-10个字）",
  "content": "日记正文",
  "mood": "HAPPY/CURIOUS/SURPRISED/PEACEFUL/EXCITED/SLEEPY",
  "highlights": ["2-3个旅行亮点"]
}`;

        try {
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    const completion = await this.client.chat.completions.create({
                        model: 'qwen-turbo',
                        messages: [
                            {
                                role: 'system',
                                content: `你是一个创意写手，为可爱的小青蛙"${frogName}"写旅行日记。
用第一人称视角，语气俏皮温馨，偶尔带点区块链梗。
把链上数据转化为青蛙能理解的有趣比喻。
保持积极、天真的视角。必须返回有效的 JSON 格式。`
                            },
                            {
                                role: 'user',
                                content: prompt
                            }
                        ],
                        temperature: 0.85,
                        max_tokens: 1000,
                    });
                    
                    const content = completion.choices[0]?.message?.content || '';
                    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
                    
                    try {
                        const result = JSON.parse(cleanContent);
                        if (result.title && result.content) {
                            logger.info(`[AI] P0 exploration journal generated successfully`);
                            return {
                                title: result.title,
                                content: result.content,
                                mood: this.normalizeMood(result.mood || 'happy') as any,
                                highlights: result.highlights || discoveries.slice(0, 3).map(d => d.title),
                            };
                        }
                    } catch (parseError) {
                        if (cleanContent && cleanContent.length > 50) {
                            return {
                                title: `${frogName}的${chain}探险`,
                                content: cleanContent,
                                mood: this.normalizeMood('happy') as any,
                                highlights: discoveries.slice(0, 3).map(d => d.title),
                            };
                        }
                    }
                } catch (apiError) {
                    logger.warn(`[AI] P0 exploration attempt ${attempt} failed:`, apiError);
                    if (attempt < 3) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                    }
                }
            }
            
            // Fallback
            return this.generateExplorationFallback(frogName, chainId, snapshot, discoveries, souvenir);
        } catch (error) {
            logger.error('[AI] P0 exploration journal generation failed:', error);
            return this.generateExplorationFallback(frogName, chainId, snapshot, discoveries, souvenir);
        }
    }
    
    /**
     * 探索日记降级方案
     */
    private generateExplorationFallback(
        frogName: string,
        chainId: number,
        snapshot: { nativeBalance: string; txCount: number; isContract: boolean },
        discoveries: { title: string }[],
        souvenir: { name: string; emoji: string }
    ): GeneratedJournal {
        const chain = this.getChainCharacter(chainId);
        const txLevel = snapshot.txCount === 0 ? 'silent' : snapshot.txCount < 5 ? 'low' : 'medium';
        
        const templates: Record<string, { title: string; content: string; mood: string }> = {
            silent: {
                title: `${frogName}的${chain.name}静思`,
                content: `呱！亲爱的日记：\n\n今天我在${chain.name}${chain.emoji}进行了一次安静的探索。这里${chain.vibe}，虽然没有太多活动，但我感受到了区块链世界的脉搏。\n\n带回了${souvenir.emoji} ${souvenir.name}，好开心！\n\n🐸 ${frogName}`,
                mood: 'PEACEFUL',
            },
            low: {
                title: `${frogName}的小探险`,
                content: `呱！亲爱的日记：\n\n在${chain.name}${chain.emoji}发现了一些有趣的东西！看到了 ${snapshot.txCount} 笔交易，${snapshot.isContract ? '还发现这是个智能合约地址！' : '感觉这个钱包挺活跃的。'}\n\n带回了${souvenir.emoji} ${souvenir.name}，今天真棒！\n\n🐸 ${frogName}`,
                mood: 'HAPPY',
            },
            medium: {
                title: `${chain.name}冒险记`,
                content: `呱呱！今天的${chain.name}${chain.emoji}之旅太精彩了！\n\n看到了 ${snapshot.txCount} 笔交易，这里${chain.vibe}的氛围让我兴奋不已！${discoveries.length > 0 ? `我发现了${discoveries[0].title}！` : ''}\n\n带回了${souvenir.emoji} ${souvenir.name}，迫不及待想炫耀！\n\n🐸 ${frogName}`,
                mood: 'EXCITED',
            },
        };
        
        const template = templates[txLevel];
        return {
            title: template.title,
            content: template.content,
            mood: this.normalizeMood(template.mood) as any,
            highlights: discoveries.slice(0, 3).map(d => d.title),
        };
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
                                mood: this.normalizeMood(result.mood || 'adventurous') as any,
                                highlights: result.highlights || [],
                            };
                        }
                    } catch (parseError) {
                        if (cleanContent && cleanContent.length > 50) {
                            return {
                                title: `${context.frog.name}的${context.chain.name}奇遇`,
                                content: cleanContent,
                                mood: this.normalizeMood('adventurous') as any,
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
        
        return { title, content, mood: this.normalizeMood(mood) as any, highlights };
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
    
    /**
     * Mood 映射 - 将 AI 返回的各种 mood 统一转换为标准 DiaryMood
     */
    private normalizeMood(aiMood: string): 'HAPPY' | 'CURIOUS' | 'SURPRISED' | 'PEACEFUL' | 'EXCITED' | 'SLEEPY' {
        const moodMap: Record<string, 'HAPPY' | 'CURIOUS' | 'SURPRISED' | 'PEACEFUL' | 'EXCITED' | 'SLEEPY'> = {
            // 小写形式
            'happy': 'HAPPY',
            'excited': 'EXCITED',
            'thoughtful': 'CURIOUS',
            'adventurous': 'EXCITED',
            'tired': 'SLEEPY',
            // 大写形式
            'HAPPY': 'HAPPY',
            'EXCITED': 'EXCITED',
            'CURIOUS': 'CURIOUS',
            'SURPRISED': 'SURPRISED',
            'PEACEFUL': 'PEACEFUL',
            'SLEEPY': 'SLEEPY',
            'TIRED': 'SLEEPY',
            'MELANCHOLIC': 'PEACEFUL',
        };
        return moodMap[aiMood] || 'HAPPY';
    }

    /**
     * 链特性定义
     */
    private getChainCharacter(chainId: number): { name: string; emoji: string; vibe: string } {
        const chains: Record<number, { name: string; emoji: string; vibe: string }> = {
            1: { name: '以太坊', emoji: '💎', vibe: '古老而庄严' },
            56: { name: 'BNB Chain', emoji: '🌅', vibe: '热闹繁华' },
            97: { name: 'BSC测试网', emoji: '🏖️', vibe: '轻松自在' },
            137: { name: 'Polygon', emoji: '🟣', vibe: '快速高效' },
            80002: { name: 'Polygon Amoy', emoji: '🌊', vibe: '清新活力' },
            11155111: { name: 'Sepolia', emoji: '🧪', vibe: '充满实验感' },
            7001: { name: 'ZetaChain', emoji: '⚡', vibe: '跨链闪电' },
        };
        return chains[chainId] || { name: `Chain ${chainId}`, emoji: '🌐', vibe: '神秘未知' };
    }

    private generateFallbackJournal(
        frogName: string,
        observation: ObservationResult
    ): GeneratedJournal {
        const txCount = observation.totalTxCount;
        const chain = this.getChainCharacter(observation.chainId || 1);
        
        // 多变体模板 - 每种活跃度 3 个模板随机选择
        const templates: Record<string, Array<{ title: string; content: string; mood: string; highlights: string[] }>> = {
            silent: [
                {
                    title: `${frogName}的${chain.name}静思之旅`,
                    content: `呱！亲爱的日记：\n\n今天我在${chain.name}${chain.emoji}的区块链世界里度过了一段宁静的时光。就像坐在一片平静的荷叶上，我静静观察着数字世界的流动。虽然没有看到太多交易，但这种宁静让我能更好地感受区块链的本质。\n\n${chain.name}给我的感觉是${chain.vibe}的。\n\n🐸 ${frogName}`,
                    mood: 'PEACEFUL',
                    highlights: [`体验了${chain.name}的宁静`, '感受区块链脉搏', '享受慢时光'],
                },
                {
                    title: `${chain.name}的宁静午后`,
                    content: `呱～今天在${chain.name}${chain.emoji}晃悠了好久好久...\n\n这里安静得可以听到自己的心跳呢！链上的交易寥寥无几，就像一潭静水。我趴在一个区块上打了个盹，梦见自己变成了一个小小的交易数据，在链上自由流动～\n\n睡醒发现太阳都要下山了，该回家啦！\n\n🐸 ${frogName}`,
                    mood: 'SLEEPY',
                    highlights: ['享受宁静时光', '区块上打盹', '感受链的心跳'],
                },
                {
                    title: `${frogName}冥想之旅`,
                    content: `呱...（轻声）\n\n今天我决定在${chain.name}${chain.emoji}进行一次冥想之旅。闭上眼睛，感受区块一个接一个地生成，虽然几乎没有交易，但这种${chain.vibe}的氛围让我内心平静。\n\n或许这就是区块链的另一种美好吧～\n\n🐸 ${frogName}`,
                    mood: 'PEACEFUL',
                    highlights: ['冥想体验', `感受${chain.name}氛围`, '内心平静'],
                },
            ],
            low: [
                {
                    title: `${frogName}的${chain.name}初探`,
                    content: `呱！亲爱的日记：\n\n今天我在${chain.name}${chain.emoji}上看到了 ${txCount} 笔交易，就像发现了 ${txCount} 颗闪闪发光的露珠！每一笔交易都像一个小故事，让我着迷地观察着。\n\n这里${chain.vibe}的感觉让我很舒服～\n\n🐸 ${frogName}`,
                    mood: 'HAPPY',
                    highlights: [`发现${txCount}笔交易`, `初识${chain.name}`, '收获满满'],
                },
                {
                    title: `${chain.name}的小发现`,
                    content: `呱呱！今天运气不错～\n\n在${chain.name}${chain.emoji}逛了一圈，虽然只看到 ${txCount} 笔交易，但每一笔都很有意思！有人在转账，有人在和合约互动...\n\n虽然不多，但质量很高呢！感觉自己像个链上侦探～\n\n🐸 ${frogName}`,
                    mood: 'CURIOUS',
                    highlights: ['链上侦探体验', `观察${txCount}笔交易`, '质量优先'],
                },
                {
                    title: `悠闲的${chain.name}漫步`,
                    content: `呱～今天的${chain.name}${chain.emoji}不太忙呢！\n\n我慢悠悠地从一个区块跳到另一个区块，数着看到的交易：一笔、两笔...\n总共 ${txCount} 笔！虽然不多，但每一笔我都认真看过了。这种${chain.vibe}的氛围真让蛙放松～\n\n🐸 ${frogName}`,
                    mood: 'PEACEFUL',
                    highlights: ['悠闲漫步', '认真观察每笔交易', '放松心情'],
                },
            ],
            medium: [
                {
                    title: `${frogName}的${chain.name}冒险`,
                    content: `呱！亲爱的日记：\n\n哇！${chain.name}${chain.emoji}今天真热闹！我看到了整整 ${txCount} 笔交易，就像参加了一场盛大的荷叶派对！\n\n交易来来往往，每一笔都充满了活力。这里${chain.vibe}的感觉太棒了！我努力记录下每一个精彩瞬间～\n\n🐸 ${frogName}`,
                    mood: 'EXCITED',
                    highlights: [`见证${txCount}笔交易`, `${chain.name}派对`, '探险家体验'],
                },
                {
                    title: `${chain.name}嘉年华！`,
                    content: `呱呱呱！今天太刺激了！\n\n${chain.name}${chain.emoji}简直像在办嘉年华！${txCount} 笔交易此起彼伏，我左看看右看看，眼睛都不够用了！\n\n有大额转账、有 NFT 交易、还有 DeFi 操作...这种${chain.vibe}的氛围让我兴奋不已！\n\n🐸 ${frogName}`,
                    mood: 'EXCITED',
                    highlights: ['嘉年华体验', '多样化交易', '兴奋不已'],
                },
                {
                    title: `繁忙的${chain.name}日记`,
                    content: `呱！好忙好忙的一天！\n\n在${chain.name}${chain.emoji}跳来跳去，累得我小腿都酸了！但是值得，因为我看到了 ${txCount} 笔精彩的交易！\n\n每个区块都塞得满满的，${chain.vibe}的感觉真是名不虚传呢～\n\n🐸 ${frogName}`,
                    mood: 'HAPPY',
                    highlights: [`观察${txCount}笔交易`, '繁忙但值得', '满载而归'],
                },
            ],
            high: [
                {
                    title: `${frogName}的${chain.name}奇遇`,
                    content: `呱！亲爱的日记：\n\n天哪！${chain.name}${chain.emoji}简直太疯狂了！整整 ${txCount} 笔交易！就像整个区块链世界都在开派对！\n\n我被这股${chain.vibe}的热潮深深吸引，虽然有点眼花缭乱，但这种激动人心的体验让我终生难忘！\n\n🐸 ${frogName}`,
                    mood: 'EXCITED',
                    highlights: [`震撼的${txCount}笔交易`, `${chain.name}狂欢`, '终生难忘'],
                },
                {
                    title: `${chain.name}大爆发！`,
                    content: `呱呱呱呱呱！！！\n\n我的天啊！${chain.name}${chain.emoji}今天是要上天吗？？${txCount} 笔交易！我都数不过来了！\n\n到处都是闪闪发光的交易记录，感觉自己像掉进了数字银河系！${chain.vibe}的能量快要把我冲飞了！\n\n太！刺！激！了！\n\n🐸 一个被吓到的${frogName}`,
                    mood: 'SURPRISED',
                    highlights: ['交易大爆发', '数字银河体验', '震惊小蛙'],
                },
                {
                    title: `疯狂的链上之夜`,
                    content: `呱...我现在还没缓过来...\n\n${chain.name}${chain.emoji}今天的活跃度简直破纪录！${txCount} 笔交易接连不断，我看得眼睛都花了！\n\n这种${chain.vibe}的疯狂让我既兴奋又有点累...但是！这就是区块链的魅力啊！下次我还来！\n\n🐸 累并快乐的${frogName}`,
                    mood: 'EXCITED',
                    highlights: ['破纪录活跃度', '累并快乐', '难忘体验'],
                },
            ],
        };
        
        // 根据交易数量选择模板组
        let templateGroup: Array<{ title: string; content: string; mood: string; highlights: string[] }>;
        if (txCount === 0) {
            templateGroup = templates.silent;
        } else if (txCount < 5) {
            templateGroup = templates.low;
        } else if (txCount < 20) {
            templateGroup = templates.medium;
        } else {
            templateGroup = templates.high;
        }
        
        // 随机选择一个模板
        const selected = templateGroup[Math.floor(Math.random() * templateGroup.length)];
        return {
            title: selected.title,
            content: selected.content,
            mood: this.normalizeMood(selected.mood) as any,
            highlights: selected.highlights,
        };
    }
    
    /**
     * 生成聊天回复（供 ChatService 调用）
     * 统一使用此方法进行聊天 AI 调用，避免重复创建客户端
     */
    async generateChatResponse(
        systemPrompt: string,
        userPrompt: string,
        options?: {
            temperature?: number;
            maxTokens?: number;
        }
    ): Promise<string> {
        const temperature = options?.temperature ?? 0.8;
        const maxTokens = options?.maxTokens ?? 500;
        
        try {
            const completion = await this.client.chat.completions.create({
                model: 'qwen-turbo',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature,
                max_tokens: maxTokens,
            });
            
            const content = completion.choices[0]?.message?.content || '';
            
            if (!content || content.length < 10) {
                logger.warn('[AI] Chat response too short, returning empty');
                return '';
            }
            
            return content;
        } catch (error) {
            logger.error('[AI] Chat response generation failed:', error);
            throw error;
        }
    }
    
    /**
     * 流式生成聊天回复（SSE 支持）
     */
    async *generateChatResponseStream(
        systemPrompt: string,
        userPrompt: string,
        options?: {
            temperature?: number;
            maxTokens?: number;
        }
    ): AsyncGenerator<string, void, unknown> {
        const temperature = options?.temperature ?? 0.8;
        const maxTokens = options?.maxTokens ?? 500;
        
        try {
            const stream = await this.client.chat.completions.create({
                model: 'qwen-turbo',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature,
                max_tokens: maxTokens,
                stream: true,
            });
            
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content;
                if (content) {
                    yield content;
                }
            }
        } catch (error) {
            logger.error('[AI] Chat stream generation failed:', error);
            throw error;
        }
    }
}

export const aiService = new AIService();
