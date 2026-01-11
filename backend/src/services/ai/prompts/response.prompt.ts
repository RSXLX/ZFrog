// backend/src/services/ai/prompts/response.prompt.ts

import { ChatIntent } from '@prisma/client';
import { ChatContext } from '../context.service';

/**
 * 构建回复生成提示词
 */
export function buildResponsePrompt(
  userMessage: string,
  intent: ChatIntent,
  data: any,
  context?: ChatContext
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
- 旅行信息：问"去了哪里"
- 好友列表：问"我的好友"
- 纪念品：问"我的纪念品"
- 徽章：问"我的徽章"
- 家园：问"去家园"`;
      break;
      
    case 'travel_stats':
      if (data) {
        dataContext = `
## 旅行统计
- 总旅行次数：${data.totalTravels || 0}
- 总行走距离：${data.totalDistance || 0}
- 总获得经验：${data.totalXp || 0}`;
      } else {
        dataContext = '## 旅行统计\n暂无旅行记录';
      }
      break;
      
    case 'friend_list':
      if (data?.friends?.length > 0) {
        dataContext = `
## 好友列表（共 ${data.count} 位）
${data.friends.slice(0, 5).map((f: any) => `- 好友ID: ${f.requesterId || f.addresseeId}`).join('\n')}`;
      } else {
        dataContext = '## 好友列表\n还没有好友，快去交朋友吧！';
      }
      break;
      
    case 'friend_add':
    case 'friend_visit':
      dataContext = data?.message || '好的，帮你处理~';
      break;
      
    case 'souvenirs_query':
      if (data?.souvenirs?.length > 0) {
        dataContext = `
## 纪念品（共 ${data.count} 件）
${data.souvenirs.slice(0, 3).map((s: any) => `- ${s.type}: ${s.name || '未命名'}`).join('\n')}`;
      } else {
        dataContext = '## 纪念品\n还没有纪念品，去旅行收集更多吧！';
      }
      break;
      
    case 'badges_query':
      if (data?.badges?.length > 0) {
        dataContext = `
## 徽章成就（共 ${data.count} 枚）
${data.badges.slice(0, 3).map((b: any) => `- ${b.badge?.name || '未知徽章'}`).join('\n')}`;
      } else {
        dataContext = '## 徽章\n还没有获得徽章，继续探索吧！';
      }
      break;
      
    case 'garden_query':
    case 'messages_query':
    case 'navigate':
      if (data?.action === 'NAVIGATE') {
        dataContext = `【导航提示】${data.message || '准备带你去~'}`;
      } else if (data?.messages?.length > 0) {
        dataContext = `## 最近留言（${data.count} 条）\n有新留言等你查看！`;
      } else {
        dataContext = data?.message || '好的~';
      }
      break;
      
    default:
      dataContext = '（无特定数据，自由发挥即可）';
  }
  
  // 构建历史对话部分（新增）
  let historySection = '';
  if (context && context.recentMessages.length > 0) {
    const historyLines = context.recentMessages.slice(-5).map(msg => {
      const prefix = msg.role === 'user' ? '用户' : '青蛙';
      return `${prefix}: ${msg.content.slice(0, 100)}`;
    });
    historySection = `
## 对话历史（最近几轮）
${historyLines.join('\n')}
`;
  }
  
  return `${historySection}用户说：「${userMessage}」

${dataContext}

请根据你的性格，用简洁有趣的方式回复用户。记住以「呱」开头！${context?.recentMessages.length ? '\n注意保持对话连贯性。' : ''}`;
}
