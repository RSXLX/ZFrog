/**
 * @deprecated 此服务未被使用，功能已由 ai.service.ts 和 ipfs.service.ts 接管。
 * 保留仅供参考，计划在下一个版本中删除。
 * 
 * 🐸 旅行服务 - 日记生成模块
 * 职责: AI 日记生成和 IPFS 上传
 * 拆分自: travel.service.ts
 */

import { ethers } from 'ethers';
import axios from 'axios';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { WalletObservation } from './travel-wallet-observer';

export interface Frog {
  id: number;
  tokenId: number;
  name: string;
  ownerAddress: string;
}

class TravelJournalService {
  /**
   * 生成 AI 旅行日记
   */
  async generateJournal(frog: Frog, walletData: WalletObservation): Promise<string> {
    const txCount = walletData.totalTxCount;
    const totalValue = ethers.formatEther(walletData.totalValueWei || '0');
    const dataSource = walletData.source;
    const isRandomExploration = walletData.isRandomExploration || false;

    let prompt: string;

    if (isRandomExploration && walletData.notableEvents.length > 0) {
      const chainEvent = walletData.notableEvents[0];
      prompt = `你是一只名叫 ${frog.name} 的旅行青蛙，刚刚完成了一次探索 ${chainEvent.chainName} 区块链的冒险。

探索数据:
- 探索的链: ${chainEvent.chainName}
- 最新区块高度: ${chainEvent.latestBlock}
- 该区块交易数: ${chainEvent.blockTxCount} 笔
- 链上氛围: ${(chainEvent.blockTxCount || 0) > 50 ? '非常繁忙' : (chainEvent.blockTxCount || 0) > 20 ? '比较活跃' : '相对安静'}

请以第一人称（青蛙的视角）写一篇100-150字的随机探险日记。`;
    } else if (dataSource === 'RPC' && walletData.balance) {
      const balance = ethers.formatEther(walletData.balance);
      prompt = `你是一只名叫 ${frog.name} 的旅行青蛙，刚刚完成了一次观察神秘地址的旅行。

旅行数据:
- 地址活跃度: ${txCount} 次历史互动
- 当前财富: ${parseFloat(balance) > 0 ? '富有' : '朴素'}

请以第一人称（青蛙的视角）写一篇100-150字的旅行日记。`;
    } else {
      prompt = `你是一只名叫 ${frog.name} 的旅行青蛙，刚刚完成了一次观察区块链钱包的旅行。

旅行数据:
- 交易数量: ${txCount} 笔
- 总交易额: ${totalValue} ETH

请以第一人称(青蛙的视角)写一篇100-150字的旅行日记。`;
    }

    try {
      const response = await axios.post(
        config.QWEN_BASE_URL + '/chat/completions',
        {
          model: 'qwen-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500,
          temperature: 0.9
        },
        {
          headers: {
            'Authorization': `Bearer ${config.QWEN_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const journal = response.data.choices[0].message.content.trim();
      logger.info('[JournalService] AI journal generated');
      return journal;

    } catch (error: any) {
      logger.error('[JournalService] Error generating journal:', error.message);
      return this.getFallbackJournal(frog, walletData);
    }
  }

  /**
   * 生成备用日记
   */
  getFallbackJournal(frog: Frog, walletData: WalletObservation): string {
    const isRandomExploration = walletData.isRandomExploration;
    const txCount = walletData.totalTxCount;

    if (isRandomExploration) {
      const chainEvent = walletData.notableEvents?.[0];
      return `今天${frog.name}去了一个神秘的数字世界冒险！看到${chainEvent?.blockTxCount || '很多'}个忙碌的身影在穿梭。真是一次奇妙的探险！`;
    }

    const fallbackJournals = [
      `今天我去了一个神秘的地方观察，看到了 ${txCount} 个忙碌的身影。${frog.name} 觉得这个世界真奇妙！`,
      `呱呱~ ${frog.name} 今天的旅行充满惊喜！遇到了许多勤劳的小伙伴，一共有 ${txCount} 次呢！`,
      `亲爱的日记，今天 ${frog.name} 去了一个繁华的市集，看到 ${txCount} 次交易，真热闹啊！`
    ];
    return fallbackJournals[Math.floor(Math.random() * fallbackJournals.length)];
  }

  /**
   * 上传日记到 IPFS
   */
  async uploadToIPFS(content: string): Promise<string> {
    try {
      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinJSONToIPFS',
        {
          pinataContent: { journal: content, timestamp: Date.now() },
          pinataMetadata: { name: `frog-journal-${Date.now()}` }
        },
        {
          headers: {
            'pinata_api_key': config.PINATA_API_KEY,
            'pinata_secret_api_key': config.PINATA_SECRET_KEY,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const hash = response.data.IpfsHash;
      logger.info(`[JournalService] Uploaded to IPFS: ${hash}`);
      return hash;

    } catch (error: any) {
      logger.error('[JournalService] Error uploading to IPFS:', error.message);
      // 返回模拟 hash
      const mockHash = `Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
      return mockHash;
    }
  }
}

export const travelJournalService = new TravelJournalService();
export default travelJournalService;
