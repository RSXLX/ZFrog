---
status: 已审核
version: 1.1
last_updated: 2026-01-14
reviewer: AI (根据实际代码检查)
---

# 青蛙 NFT 模块开发任务

> 本文档记录青蛙 NFT 模块的开发任务和进度。

## 一、模块概述

青蛙 NFT 模块为 ZetaFrog 核心资产系统，包含智能合约、后端 API 和前端组件。

---

## 二、任务清单

### 2.1 智能合约 ✅ 已完成

| 合约文件 | 功能 | 行数 | 状态 |
|----------|------|------|------|
| `ZetaFrogNFT.sol` | 核心 NFT 合约 | 296 | ✅ |
| `ZetaFrogNFTUpgradeable.sol` | 可升级版本 | 387 | ✅ |
| `Travel.sol` | 旅行合约 | - | ✅ |
| `TravelUpgradeable.sol` | 可升级旅行合约 | - | ✅ |
| `OmniTravel.sol` | 跨链旅行合约 | - | ✅ |
| `OmniTravelUpgradeable.sol` | 可升级跨链合约 | - | ✅ |
| `FrogConnector.sol` | 跨链连接器 | - | ✅ |
| `FrogFootprint.sol` | 足迹记录 | - | ✅ |
| `SouvenirNFT.sol` | 纪念品 NFT | - | ✅ |

**核心功能清单**:
- [x] ERC-721 标准实现 + URI 存储
- [x] 铸造功能 (mintFrog) - 名称 2-16 字符
- [x] 单钱包限制 (hasMinted + ownerToTokenId)
- [x] 状态管理 (Idle/Traveling/CrossChainLocked)
- [x] 经验值系统 (addExperience + 自动升级)
- [x] 管理功能 (pause/unpause/setTravelContract)
- [x] 紧急重置 (emergencyResetFrogStatus/batchResetFrogStatus)
- [x] UUPS 代理模式 (可升级版本)
- [x] 数据迁移支持 (migrateFrog/batchMigrateFrogs)

---

### 2.2 后端服务 ✅ 已完成

**API 路由** (`frog.routes.ts` - 621 行):
- [x] `GET /api/frogs/:tokenId` - 获取青蛙详情 (含好友关系判断)
- [x] `GET /api/frogs/my/:address` - 获取我的青蛙 (单钱包)
- [x] `GET /api/frogs/owner/:address` - 获取地址拥有的青蛙
- [x] `GET /api/frogs/search` - 搜索青蛙 (名称/地址/tokenId)
- [x] `GET /api/frogs/world-online` - 世界在线青蛙列表
- [x] `POST /api/frogs/sync` - 手动同步链上数据

**核心服务**:
- [x] `omni-travel.service.ts` (40KB) - 跨链旅行服务
- [x] `travel.service.ts` (24KB) - 旅行核心服务
- [x] `ai.service.ts` (39KB) - AI 日记生成
- [x] `badge-checker.service.ts` - 徽章检查
- [x] `cross-chain-listener.service.ts` - 跨链事件监听

**数据同步**:
- [x] 事件监听 (FrogMinted/Transfer)
- [x] 按需同步机制 (API 调用时触发)
- [x] 状态健康检查 (reconcileFrogStatus)
- [x] 链上状态对账 (syncFrogStatusFromChain)

---

### 2.3 前端组件 ✅ 已完成

**青蛙组件** (19 个):
| 组件 | 功能 | 大小 |
|------|------|------|
| `FrogPet.tsx` | 宠物主体显示 | 25KB |
| `FrogPetAnimated.tsx` | 动画版宠物 | 15KB |
| `FrogMint.tsx` | 铸造界面 | 7KB |
| `FrogContainer.tsx` | 容器组件 | 5KB |
| `FrogSvg.tsx` | SVG 图形 | 11KB |
| `FrogScene.tsx` | 场景组件 | 8KB |
| `FrogCard.tsx` | 卡片展示 | 2KB |
| `FeedingSystem.tsx` | 喂食系统 | 15KB |
| `TravelAnimation.tsx` | 旅行动画 | 13KB |
| `WorldOnlineList.tsx` | 世界在线列表 | 6KB |
| ... | (其他 9 个) | - |

**页面** (13 个):
| 页面 | 功能 | 大小 |
|------|------|------|
| `FrogDetail.tsx` | 青蛙详情页 | 41KB |
| `MyFrog.tsx` | 我的青蛙页 | 4KB |
| `TravelHistoryPage.tsx` | 旅行历史 | 25KB |
| `TravelDetailPage.tsx` | 旅行详情 | 16KB |
| `BadgesPage.tsx` | 徽章页面 | 18KB |
| `SouvenirsPage.tsx` | 纪念品页面 | 13KB |
| `GardenPage.tsx` | 花园页面 | 21KB |
| `Friends.tsx` | 好友页面 | 8KB |
| ... | (其他 5 个) | - |

**Hooks** (21 个):
- [x] `useFrogData.ts` - 青蛙数据获取
- [x] `useFrogState.ts` - 状态管理
- [x] `useFrogStatus.ts` - 状态检测 (10KB)
- [x] `useFrogInteraction.ts` - 交互逻辑 (9KB)
- [x] `useMyFrog.ts` - 我的青蛙
- [x] `useZetaFrog.ts` - 合约交互 (5KB)
- [x] `useCrossChain.ts` - 跨链功能 (9KB)
- [x] `useTravelAnimation.ts` - 旅行动画 (6KB)
- [x] ... (其他 13 个)

---

### 2.4 数据库模型 ✅ 已完成

**Prisma Schema** (1002 行):
- [x] `Frog` 模型 - 完整属性 + 关联
- [x] `Travel` 模型 - 支持跨链状态
- [x] `Souvenir` 模型 - 纪念品系统
- [x] `Friendship` 模型 - 好友系统
- [x] `TravelBadge` / `UserBadge` - 徽章系统
- [x] `ChatSession` / `ChatMessage` - 聊天系统
- [x] `CrossChainMessage` - 跨链消息
- [x] `VisitorMessage` - 串门留言
- [x] 家园系统 (Decoration/RoomLayout/Gift)

**状态枚举**:
- `FrogStatus`: Idle / Traveling / Returning / CrossChainLocked
- `TravelStatus`: Active / Processing / Completed / Cancelled / Failed
- `TravelStage`: DEPARTING / CROSSING / ARRIVING / EXPLORING / RETURNING
- `ChainType`: BSC_TESTNET / ETH_SEPOLIA / ZETACHAIN_ATHENS / ...

---

### 2.5 文档 ✅ 已完成

- [x] 需求设计文档 (已审核)
- [x] 技术设计文档 (已审核)
- [x] 接口文档 (已审核)
- [x] 模块规格文档 (已审核)
- [x] 开发任务文档 (当前文档)

---

## 三、依赖关系

```
┌─────────────────┐
│  青蛙 NFT 模块   │
└────────┬────────┘
         │
    ┌────┴────┬──────────┬───────────┐
    ▼         ▼          ▼           ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│旅行系统│ │徽章系统│ │好友系统│ │跨链模块│
└────────┘ └────────┘ └────────┘ └────────┘
```

---

## 四、待优化事项 (P2)

| 事项 | 说明 | 优先级 |
|------|------|--------|
| NFT 图片生成 | 接入 AI 生成独特青蛙图片 | P2 |
| 元数据 IPFS | 元数据上传到 IPFS | P2 |
| 饥饿/心情系统 | 时间衰减机制 | P2 |
| 喂食/互动功能 | 用户与青蛙互动 | P2 |

---

## 五、变更记录

| 日期 | 内容 |
|------|------|
| 2026-01-14 | 创建开发任务文档，汇总现有实现状态 |

---
