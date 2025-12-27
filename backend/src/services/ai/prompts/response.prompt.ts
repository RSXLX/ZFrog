// backend/src/services/ai/prompts/response.prompt.ts

import { ChatIntent } from '@prisma/client';

/**
 * 构建回复生成提示词
 */
export function buildResponsePrompt(
  userMessage: string,
  intent: ChatIntent,
  data: any
): string {
  
  let dataContext = '';
  
  switch (intent) {
    case 'price_query':
      if (data && data.symbol) {
        dataContext = `
## 价格数据
- 代币：${data.symbol}
- 当前价格：$${data.priceUsd?.toLocaleString?.() || 'N/A'}
- 24h 涨跌：${data.change24h >= 0 ? '+' : ''}${data.change24h?.toFixed?.(2) || 'N/A'}%
- 数据时间：刚刚更新`;
      } else {
        dataContext = '## 价格数据\n获取失败，请稍后再试';
      }
      break;
      
    case 'asset_query':
      if (data && data.totalValueUsd !== undefined) {
        const tokens = data.tokens || [];
        dataContext = `
## 用户资产
- 总价值：$${data.totalValueUsd.toLocaleString()}
- 主要持仓：
${tokens.slice(0, 5).map((t: any) => 
  `  - ${t.symbol}: ${t.balance} ($${t.valueUsd?.toLocaleString?.() || 'N/A'})`
).join('\n')}`;
      } else {
        dataContext = '## 用户资产\n获取失败，请确保钱包已连接';
      }
      break;
      
    case 'frog_status':
      if (data) {
        dataContext = `
## 青蛙状态
- 当前状态：${data.status || '未知'}
- 等级：Lv.${data.level || 1}
- 经验值：${data.xp || 0}
- 总旅行次数：${data.totalTravels || 0}`;
      } else {
        dataContext = '## 青蛙状态\n找不到你的青蛙，先去 mint 一只吧！';
      }
      break;
      
    case 'travel_info':
      if (data && data.travels) {
        const recentTravel = data.travels[0];
        dataContext = `
## 旅行信息
- 最近旅行：${recentTravel?.targetChain || '未知'}
- 出发时间：${recentTravel?.startTime || '未知'}
- 状态：${recentTravel?.status || '未知'}`;
      } else {
        dataContext = '## 旅行信息\n还没有旅行记录，快让你的青蛙去探索吧！';
      }
      break;
      
    case 'start_travel':
      if (data && data.action === 'START_TRAVEL') {
        dataContext = data.message || '呱！准备好了，带上你的钱包，我们出发吧！';
      } else if (data && data.error) {
        dataContext = `## 提示\n${data.error}`;
      } else {
        dataContext = '## 旅行准备\n准备中...';
      }
      break;
      
    case 'help':
      dataContext = `
## 功能介绍
- 查价格：问"ETH多少钱"
- 查资产：问"我有什么"
- 青蛙状态：问"青蛙在干嘛"
- 旅行信息：问"去了哪里"`;
      break;
      
    default:
      dataContext = '（无特定数据，自由发挥即可）';
  }
  
  return `用户说：「${userMessage}」

${dataContext}

请根据你的性格，用简洁有趣的方式回复用户。记住以「呱」开头！`;
}
