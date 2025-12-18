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
        travelDuration: number
    ): Promise<GeneratedJournal> {
        logger.info(`Generating journal for ${frogName}'s travel`);
        
        const prompt = this.buildPrompt(frogName, observation, travelDuration);
        
        try {
            const completion = await this.client.chat.completions.create({
                model: 'qwen-turbo',
                messages: [
                    {
                        role: 'system',
                        content: `你是一个创意写手，从一只可爱小青蛙"${frogName}"的视角写旅行日记。
青蛙刚完成了一次神奇的区块链钱包观察之旅。
用第一人称写作，语气俏皮温馨。
日记应该 150-300 字。
把钱包活动转化为青蛙能理解的有趣比喻。
保持积极、好奇、略带天真的视角。
必须返回有效的 JSON 格式。`
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.8,
                max_tokens: 1000,
            });
            
            const content = completion.choices[0]?.message?.content || '{}';
            
            // 尝试解析 JSON
            try {
                const result = JSON.parse(content);
                return {
                    title: result.title || `${frogName}的冒险`,
                    content: result.content || '呱！真是一次美妙的旅行！',
                    mood: result.mood || 'happy',
                    highlights: result.highlights || [],
                };
            } catch {
                // 如果 JSON 解析失败，直接使用内容
                return {
                    title: `${frogName}的区块链之旅`,
                    content: content,
                    mood: 'happy',
                    highlights: ['探索了区块链世界'],
                };
            }
            
        } catch (error) {
            logger.error('AI generation failed:', error);
            return this.generateFallbackJournal(frogName, observation);
        }
    }
    
    private buildPrompt(
        frogName: string,
        observation: ObservationResult,
        travelDuration: number
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
        
        return `
为小青蛙 ${frogName} 写一篇旅行日记，它刚从 ${travelDuration} 小时的旅程中归来。

旅行详情：
- 时长: ${travelDuration} 小时
- 目的地: 以太坊区块链 (观察的钱包: ${observation.walletAddress.slice(0, 8)}...)
- 活动程度: ${activitySummary}
${eventDescriptions}

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
        
        if (txCount === 0) {
            return {
                title: `${frogName}的宁静之旅`,
                content: `呱！亲爱的日记：\n\n今天我去拜访了以太坊荷叶池塘上一个非常安静的钱包。那里一切都很平静 - 连一丝涟漪都没有！我花了很多时间跳来跳去，欣赏美丽的区块链花朵。有时候最安静的旅程反而最让人放松。我很高兴现在回家了，准备好迎接下一次冒险！\n\n🐸 ${frogName}`,
                mood: 'thoughtful',
                highlights: ['找到了一个宁静的角落', '欣赏了区块链风景', '准备好下次冒险'],
            };
        }
        
        return {
            title: `${frogName}的区块链探险`,
            content: `呱！亲爱的日记：\n\n真是一次激动人心的旅程！我一路跳到了一个以太坊钱包，看到了 ${txCount} 笔神奇的交易。就像看着夜空中的萤火虫在跳舞 - 每一笔都携带着珍贵的数字宝藏！我确保把所有见闻都记在脑海里。现在我带着美好的回忆回家了。下次再见！\n\n🐸 ${frogName}`,
            mood: 'excited',
            highlights: [`见证了 ${txCount} 笔交易`, '探索了以太坊', '收集了美好回忆'],
        };
    }
}

export const aiService = new AIService();
