// backend/src/services/travel/travel-p0.service.ts

import { prisma } from '../../database';
import { ChainKey, CHAIN_KEYS, SUPPORTED_CHAINS } from '../../config/chains';
import { explorationService, Discovery } from './exploration.service';
import { souvenirGenerator } from './souvenir.generator';
import { badgeService } from '../badge/badge.service';
import { buildTravelDiaryPrompt } from '../ai/prompts/travel-diary.prompt';
import { logger } from '../../utils/logger';
import { notifyTravelStarted, notifyTravelProgress, notifyTravelCompleted } from '../../websocket';
import axios from 'axios';
import { FrogStatus } from '@prisma/client';

export interface StartTravelParams {
  frogId: number;
  travelType: 'RANDOM' | 'SPECIFIC';
  targetChain?: ChainKey;
  targetAddress?: string;
  duration?: number; // 旅行时长（秒），默认为120秒（2分钟）
}

class TravelP0Service {
  /**
   * 开始旅行（P0 版本）
   */
  async startTravel(params: StartTravelParams): Promise<{ travelId: number; estimatedDuration: number }> {
    const { frogId, travelType, targetChain, targetAddress, duration = 120 } = params;

    logger.info(`Starting P0 travel for frog ${frogId}, type: ${travelType}, duration: ${duration}s`);

    // 1. 确定目的地
    let chain: ChainKey;
    let blockNumber: bigint;

    if (travelType === 'RANDOM') {
      const destination = await explorationService.pickRandomDestination();
      chain = destination.chain;
      blockNumber = destination.blockNumber;
    } else {
      chain = targetChain || CHAIN_KEYS[Math.floor(Math.random() * CHAIN_KEYS.length)];
      blockNumber = await explorationService.pickRandomBlock(chain);
    }

    // 2. 确定观察目标
    const address = targetAddress || await explorationService.getRandomTargetAddress(chain);

    // 3. 获取青蛙信息
    const frog = await prisma.frog.findUnique({
      where: { id: frogId },
    });

    if (!frog) {
      throw new Error('Frog not found');
    }

    // 4. 更新青蛙状态
    await prisma.frog.update({
      where: { id: frogId },
      data: { status: FrogStatus.Traveling },
    });

    // 5. 创建旅行记录
    const travel = await prisma.travel.create({
      data: {
        frogId,
        targetWallet: address,
        chainId: SUPPORTED_CHAINS[chain].chainId,
        startTime: new Date(),
        endTime: new Date(Date.now() + duration * 1000), // 根据duration计算结束时间
        status: 'Active',
      },
    });

    // 6. 发送 WebSocket 通知
    notifyTravelStarted(frog.tokenId, {
      travelId: travel.id,
      targetWallet: address,
      startTime: travel.startTime,
      endTime: travel.endTime,
    });

    // 7. 异步处理旅行（根据duration设置延迟）
    setTimeout(() => {
      this.processTravel(travel.id, chain, blockNumber, address, frog.name, frog.tokenId).catch(error => {
        logger.error(`Failed to process travel ${travel.id}:`, error);
      });
    }, duration * 1000);

    return {
      travelId: travel.id,
      estimatedDuration: duration,
    };
  }

  /**
   * 处理旅行（Worker 调用）
   */
  private async processTravel(
    travelId: number,
    chain: ChainKey,
    blockNumber: bigint,
    targetAddress: string,
    frogName: string,
    frogTokenId: number
  ): Promise<void> {
    logger.info(`Processing P0 travel ${travelId}`);

    try {
      // 1. 执行探索
      notifyTravelProgress(frogTokenId, { phase: 'observing', message: '正在同步链上数据...', percentage: 20 });
      const exploration = await explorationService.explore(chain, blockNumber, targetAddress);

      // 2. 生成纪念品
      notifyTravelProgress(frogTokenId, { phase: 'generating_story', message: '正在构思旅行故事...', percentage: 40 });
      const souvenir = souvenirGenerator.generate(
        chain,
        blockNumber,
        exploration.timestamp,
        exploration.discoveries
      );

      // 3. 生成旅行日记
      // Build prompt with enriched data
      const prompt = `
Generate a travel diary for a frog named ${frogName}.
Location: ${chain} blockchain, Block #${blockNumber}.
Time: ${exploration.timestamp.toLocaleTimeString()}.

Wallet Visited: ${exploration.snapshot.address}
- Balance: ${exploration.snapshot.nativeBalance} ${exploration.snapshot.nativeSymbol}
- Transactions: ${exploration.snapshot.txCount}
- Wallet Age: ${exploration.snapshot.walletAge}
${exploration.snapshot.tokens && exploration.snapshot.tokens.length > 0 ? `- Token Holdings: ${exploration.snapshot.tokens.map(t => `${t.balance} ${t.symbol}`).join(', ')}` : ''}

Context of this visit:
${exploration.transactionContext ? `- Observed Transaction: Hash ${exploration.transactionContext.hash.slice(0, 10)}...` : ''}
${exploration.transactionContext ? `- Action: ${exploration.transactionContext.method}` : ''}
${exploration.transactionContext && parseFloat(exploration.transactionContext.value) > 0 ? `- Value: ${exploration.transactionContext.value} ${exploration.snapshot.nativeSymbol}` : ''}

Network Conditions:
${exploration.networkStatus ? `- Gas Price: ${exploration.networkStatus.gasPrice} Gwei` : ''}

Discoveries made:
${exploration.discoveries.map(d => `- [${d.type}] ${d.title}: ${d.description}`).join('\n')}

The frog's personality is: Curious, slightly philosophical, loves observing blockchain activity.
Write a short, engaging diary entry (max 200 words) describing this visit.
Include specific details about what the frog saw (the wallet's status, the specific transaction action if any, the network atmosphere).
If the gas price is high, mention traffic/congestion. If token holdings are found, mention them.
User Language: Chinese

IMPORTANT: Return the result in STRICT JSON format with the following structure:
{
  "title": "A short creative title for the diary",
  "content": "The diary content here...",
  "mood": "One of: HAPPY, CURIOUS, EXCITED, TIRED, MELANCHOLIC"
}
Do not include any markdown formatting (like \`\`\`json) in the response. Just the raw JSON string.
`;

      const diaryResult = await this.generateTravelDiary({
        frogName,
        chain,
        blockNumber,
        timestamp: exploration.timestamp,
        targetAddress,
        snapshot: exploration.snapshot,
        discoveries: exploration.discoveries,
        souvenir,
        overridePrompt: prompt,
      });

      // 4. 计算经验值 (每小时 10 XP + 稀有发现额外 XP)
      const durationHours = 1; // P0 固定为 120s 模拟
      const rareBonus = exploration.discoveries.reduce((sum, d) => sum + (d.rarity >= 4 ? 50 : 0), 0);
      const xpGained = 10 * durationHours + rareBonus;
      
      const frog = await prisma.frog.findFirst({ where: { tokenId: frogTokenId } });
      const newXp = (frog?.xp || 0) + xpGained;
      const newLevel = Math.floor(newXp / 100) + 1;

      // 5. 保存结果
      await prisma.travel.update({
        where: { id: travelId },
        data: {
          status: 'Completed',
          completedAt: new Date(),
          exploredBlock: blockNumber,
          exploredTimestamp: exploration.timestamp,
          exploredSnapshot: {
            ...exploration.snapshot,
            discoveries: exploration.discoveries,
          } as any,
          diary: diaryResult.content,
          diaryMood: diaryResult.mood as any,
          souvenirData: souvenir as any,
          observedTxCount: exploration.snapshot.txCount,
          observedTotalValue: exploration.snapshot.nativeBalance,
        },
      });

      // 6. 更新青蛙状态与等级
      await prisma.frog.update({
        where: { tokenId: frogTokenId },
        data: {
          status: FrogStatus.Idle,
          totalTravels: { increment: 1 },
          p0Travels: { increment: 1 },
          xp: newXp,
          level: newLevel,
        }
      });

      // 7. 更新用户统计
      await this.updateFrogStats(travelId, chain, exploration.discoveries, blockNumber, exploration.timestamp);

      // 8. 检查徽章
      const travel = await prisma.travel.findUnique({ where: { id: travelId } });
      if (travel) {
        await badgeService.checkAndUnlock(travel.frogId, {
          chain,
          travelId,
          discoveries: exploration.discoveries,
        });
      }

      // 9. 发送完成通知
      notifyTravelCompleted(frogTokenId, {
        journalHash: '', // P0 不上传 IPFS，暂留空
        souvenirId: 0,   // P0 不铸造 NFT
        story: {
          title: diaryResult.title,
          content: diaryResult.content,
          mood: diaryResult.mood,
          highlights: exploration.discoveries.map(d => d.title)
        }
      });

      logger.info(`Travel ${travelId} completed successfully`);

    } catch (error) {
      logger.error(`Travel ${travelId} failed:`, error);
      
      await prisma.travel.update({
        where: { id: travelId },
        data: { status: 'Failed' },
      });

      // 恢复青蛙状态
      await prisma.frog.update({
        where: { tokenId: frogTokenId },
        data: { status: FrogStatus.Idle },
      });
    }
  }

  /**
   * 生成旅行日记
   */
  private async generateTravelDiary(params: any): Promise<{ content: string; mood: string; title: string }> {
    const prompt = params.overridePrompt || buildTravelDiaryPrompt(params);

    try {
      // 使用 AI 服务生成日记
      const response = await axios.post(
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        {
          model: 'qwen-turbo',
          input: { prompt },
          parameters: {
            max_tokens: 500,
            temperature: 0.8,
            result_format: 'message',
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.QWEN_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      const text = response.data.output.choices[0].message.content;
      const parsed = JSON.parse(text);
      
      return {
        content: parsed.content,
        mood: parsed.mood,
        title: parsed.title,
      };

    } catch (error) {
      logger.error('Failed to generate AI diary:', error);
      
      // 降级方案
      return {
        content: `呱~ ${params.frogName} 今天去了 ${params.chain}，看到了很多有趣的东西！带回了 ${params.souvenir.name}，好开心呀！`,
        mood: 'HAPPY',
        title: '今天的旅行',
      };
    }
  }

  /**
   * 更新青蛙统计
   */
  async updateFrogStats(
    travelId: number, 
    chain: ChainKey, 
    discoveries: Discovery[], 
    block: bigint,
    date: Date
  ): Promise<void> {
    const travel = await prisma.travel.findUnique({
      where: { id: travelId },
    });

    if (!travel) return;

    const chainField = {
      BSC_TESTNET: 'bscTrips',
      ETH_SEPOLIA: 'ethTrips',
      ZETACHAIN_ATHENS: 'zetaTrips',
      POLYGON_MUMBAI: 'polygonTrips',
      ARBITRUM_GOERLI: 'arbitrumTrips',
    }[chain] as 'bscTrips' | 'ethTrips' | 'zetaTrips' | 'polygonTrips' | 'arbitrumTrips';

    const rareFinds = discoveries.filter(d => d.rarity >= 4).length;

    const existingStats = await prisma.frogTravelStats.findUnique({
      where: { frogId: travel.frogId }
    });

    const isEarlierBlock = !existingStats?.earliestBlockVisited || block < existingStats.earliestBlockVisited;
    const isOldestDate = !existingStats?.oldestDateVisited || date < existingStats.oldestDateVisited;

    await prisma.frogTravelStats.upsert({
      where: { frogId: travel.frogId },
      create: {
        frogId: travel.frogId,
        totalTrips: 1,
        [chainField]: 1,
        totalDiscoveries: discoveries.length,
        rareFinds: rareFinds,
        earliestBlockVisited: block,
        oldestDateVisited: date,
      },
      update: {
        totalTrips: { increment: 1 },
        [chainField]: { increment: 1 },
        totalDiscoveries: { increment: discoveries.length },
        rareFinds: { increment: rareFinds },
        earliestBlockVisited: isEarlierBlock ? block : undefined,
        oldestDateVisited: isOldestDate ? date : undefined,
      },
    });
  }
}

export const travelP0Service = new TravelP0Service();
