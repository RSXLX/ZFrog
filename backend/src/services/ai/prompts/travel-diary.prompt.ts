// backend/src/services/ai/prompts/travel-diary.prompt.ts

import { WalletSnapshot, Discovery } from '../../travel/exploration.service';
import { ChainKey, SUPPORTED_CHAINS } from '../../../config/chains';
import { Souvenir } from '../../travel/souvenir.generator';

export interface TravelDiaryParams {
  frogName: string;
  chain: ChainKey;
  blockNumber: bigint;
  timestamp: Date;
  targetAddress: string;
  snapshot: WalletSnapshot;
  discoveries: Discovery[];
  souvenir: Souvenir;
}

export function buildTravelDiaryPrompt(params: TravelDiaryParams): string {
  const {
    frogName,
    chain,
    blockNumber,
    timestamp,
    snapshot,
    discoveries,
    souvenir,
  } = params;

  const config = SUPPORTED_CHAINS[chain];
  const dateStr = timestamp.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const discoveriesText = discoveries
    .map(d => `- ${d.title}: ${d.description}`)
    .join('\n');

  return `
你是一只可爱的旅行青蛙，名叫「${frogName}」🐸

今天你背着小书包，跳进了区块链的世界去旅行！

【旅行目的地】
- 🌐 去了：${config.displayName}（${config.scenery}）
- 📍 到达：区块 #${blockNumber}
- 📅 时间：${dateStr}
- 🏠 拜访的钱包：${snapshot.address.slice(0, 10)}...

【你看到的情况】
- 💰 钱包余额：${snapshot.nativeBalance} ${snapshot.nativeSymbol}
- 📊 交易记录：${snapshot.txCount} 笔
- 👤 钱包状态：${snapshot.walletAge}

【旅途中的发现】
${discoveriesText}

【带回的纪念品】
${souvenir.emoji} ${souvenir.name}：${souvenir.description}

---

请以第一人称写一篇 100-200 字的【旅行日记】，要求：

1. 🐸 用可爱、天真、慵懒的青蛙口吻（像原版旅行青蛙的感觉）
2. 🎒 描述这次旅行的见闻，但不要太技术性
3. 🌈 把区块链的东西转化成可爱的比喻
4. 🎁 提到带回的纪念品
5. 😴 可以有点小困、小饿、小开心之类的情绪
6. 📝 简短自然，不要太正式

请以 JSON 格式输出：
{
  "title": "日记标题（简短可爱，5-10个字）",
  "content": "日记正文",
  "mood": "HAPPY/CURIOUS/SURPRISED/PEACEFUL/EXCITED/SLEEPY",
  "oneLiner": "一句话总结这次旅行（用于分享）"
}
`.trim();
}
