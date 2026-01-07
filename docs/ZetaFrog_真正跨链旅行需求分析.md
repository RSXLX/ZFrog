# ZetaFrog 真正跨链旅行功能需求分析

> 基于当前系统架构的完整技术方案

## 1. 概述

### 1.1 当前系统架构回顾

**现有实现（跨链观察模式）**：
- 青蛙 NFT 始终存在于 ZetaChain Athens（主链）
- 旅行时后端通过目标链的 RPC/API 读取链上数据
- 旅行完成后在主链调用 `completeTravel` 记录结果
- 无实际资产跨链转移

**核心合约**：
- [ZetaFrogNFT.sol](file:///c:/Users/94447/Desktop/FROG/contracts/contracts/ZetaFrogNFT.sol) - NFT 核心管理
- [Travel.sol](file:///c:/Users/94447/Desktop/FROG/contracts/contracts/Travel.sol) - 旅行逻辑
- [SouvenirNFT.sol](file:///c:/Users/94447/Desktop/FROG/contracts/contracts/SouvenirNFT.sol) - 纪念品铸造

### 1.2 目标功能

实现**真正的跨链旅行**：青蛙 NFT 可以锁定后"跨链"到目标链执行实际操作，完成后安全返回主链。

---

## 2. 技术原理

### 2.1 ZetaChain Omnichain 架构

ZetaChain 提供了原生的**全链互操作能力**：

**跨链消息传递（Cross-Chain Messaging）**：
- ZetaChain 验证者网络作为消息中继层
- 使用 TSS（门限签名方案）确保消息安全
- 支持在任意 EVM 链上执行操作

**关键组件**：
- `ZetaConnector`：每条链上的连接器合约
- `ZetaInteractor`：跨链合约基类
- `ZetaReceiver`：接收跨链消息的接口

### 2.2 跨链旅行机制

```
┌─────────────────────────────────────────────────────────────────┐
│                        完整跨链旅行流程                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ZetaChain (主链)                    目标链 (如 BSC)            │
│   ┌─────────────────┐                ┌─────────────────┐        │
│   │ ZetaFrogNFT     │  ──锁定NFT──→  │                 │        │
│   │                 │                │                 │        │
│   │ Travel.sol      │  ──跨链消息──→ │ FrogConnector   │        │
│   │                 │                │                 │        │
│   │                 │                │ 临时状态+操作    │        │
│   │                 │                │                 │        │
│   │                 │  ←─结果返回──  │                 │        │
│   │                 │                │                 │        │
│   │ 解锁+更新状态    │                └─────────────────┘        │
│   └─────────────────┘                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**三阶段流程**：

1. **出发阶段**：主链锁定 NFT → 发送跨链消息 → 目标链接收
2. **探索阶段**：目标链创建临时状态 → 执行链上操作 → 记录数据
3. **归来阶段**：目标链发送返回消息 → 主链解锁 NFT → 更新状态

---

## 3. 智能合约设计

### 3.1 合约架构变更

**新增合约**：

| 合约名称 | 部署链 | 职责 |
|---------|--------|------|
| `OmniTravel.sol` | ZetaChain | 跨链旅行主控，继承 `ZetaInteractor` |
| `FrogConnector.sol` | BSC/ETH/Polygon | 目标链连接器，接收青蛙/执行操作 |

**修改现有合约**：

| 合约 | 变更内容 |
|------|---------|
| `ZetaFrogNFT.sol` | 新增 `lockForCrossChain` 和 `unlockFromCrossChain` 函数 |
| `Travel.sol` | 新增 `CrossChainTravel` 结构体和相关状态追踪 |

### 3.2 OmniTravel.sol（主链跨链控制器）

**核心状态**：

```
struct CrossChainTravel {
    uint256 tokenId;
    address owner;
    uint256 sourceChainId;
    uint256 targetChainId;
    uint64 startTime;
    uint64 expectedReturnTime;
    bytes32 messageId;         // 跨链消息追踪
    CrossChainStatus status;   // Locked/Traveling/Returning/Completed
    bytes travelData;          // 打包的旅行数据
}

mapping(uint256 => CrossChainTravel) public crossChainTravels;
mapping(bytes32 => uint256) public messageToToken;  // 消息ID到tokenId映射
```

**核心函数**：

| 函数 | 调用者 | 功能 |
|------|--------|------|
| `startCrossChainTravel` | 用户 | 锁定NFT + 发送跨链消息 |
| `onZetaMessage` | ZetaConnector | 接收目标链返回的消息 |
| `emergencyReturn` | 用户/管理员 | 超时后强制归还NFT |

**业务逻辑**：

1. 发起跨链旅行时：
   - 验证用户是 NFT 所有者
   - 验证目标链已支持
   - 调用 `ZetaFrogNFT.lockForCrossChain` 锁定 NFT
   - 打包青蛙元数据（名字、等级、经验值）
   - 通过 `ZetaConnector.send` 发送跨链消息
   - 用户需支付跨链 Gas 费（ZETA）

2. 接收返回消息时：
   - 验证消息来源合法
   - 解析返回的旅行数据
   - 调用 `ZetaFrogNFT.unlockFromCrossChain` 解锁 NFT
   - 根据旅行结果更新经验值/奖励

### 3.3 FrogConnector.sol（目标链连接器）

**核心状态**：

```
struct VisitingFrog {
    uint256 tokenId;
    address owner;
    uint64 arrivalTime;
    uint64 maxStayDuration;
    string name;
    uint256 level;
    bool isActive;
    bytes[] actionLogs;  // 链上操作日志
}

mapping(uint256 => VisitingFrog) public visitingFrogs;
address public zetaChainOmniTravel;  // 主链合约地址
```

**核心函数**：

| 函数 | 调用者 | 功能 |
|------|--------|------|
| `onZetaMessage` | ZetaConnector | 接收青蛙到达 |
| `executeAction` | 青蛙所有者 | 在目标链执行操作 |
| `completeVisit` | 青蛙所有者 | 完成访问并返回 |

**支持的链上操作**：

| 操作类型 | 描述 | 示例 |
|---------|------|------|
| `OBSERVE_DEX` | 观察 DEX 流动性池 | 查询 PancakeSwap 交易对 |
| `CHECK_NFT` | 查看 NFT 市场 | 读取 OpenSea 地板价 |
| `READ_DAO` | 观察 DAO 治理 | 查看提案投票情况 |
| `CUSTOM_CALL` | 自定义合约调用 | 调用任意 view 函数 |

### 3.4 ZetaFrogNFT.sol 修改

**新增函数**：

```
// 跨链锁定
function lockForCrossChain(uint256 tokenId) external onlyOmniTravel {
    require(ownerOf(tokenId) != address(0), "Token does not exist");
    require(frogs[tokenId].status == FrogStatus.Idle, "Frog is busy");
    frogs[tokenId].status = FrogStatus.CrossChainLocked;
    emit FrogLockedForCrossChain(tokenId, block.timestamp);
}

// 跨链解锁
function unlockFromCrossChain(uint256 tokenId, uint256 xpReward) external onlyOmniTravel {
    require(frogs[tokenId].status == FrogStatus.CrossChainLocked, "Not locked");
    frogs[tokenId].status = FrogStatus.Idle;
    if (xpReward > 0) {
        _addExperience(tokenId, xpReward);
    }
    emit FrogUnlockedFromCrossChain(tokenId, xpReward, block.timestamp);
}
```

**FrogStatus 枚举扩展**：
```
enum FrogStatus {
    Idle,
    Traveling,
    CrossChainLocked,  // 新增：跨链锁定中
    Returning
}
```

---

## 4. 后端服务设计

### 4.1 新增服务模块

**文件结构**：
```
backend/src/services/
├── cross-chain/
│   ├── omni-travel.service.ts    # 跨链旅行主服务
│   ├── message-listener.ts       # 跨链消息监听器
│   ├── connector-manager.ts      # 目标链连接器管理
│   └── cross-chain.types.ts      # 类型定义
```

### 4.2 OmniTravelService

**核心职责**：
1. 监听主链 `CrossChainTravelStarted` 事件
2. 跟踪跨链消息状态
3. 监听目标链 `FrogArrived` / `FrogDeparted` 事件
4. 同步数据库状态
5. 处理超时和异常情况

**关键方法**：

| 方法 | 功能 |
|------|------|
| `initiateCrossChainTravel` | 发起跨链旅行（供 API 调用） |
| `handleTravelStarted` | 处理旅行开始事件 |
| `handleTravelCompleted` | 处理旅行完成事件 |
| `checkTimeouts` | 定时检查超时旅行 |
| `syncChainStatus` | 同步链上状态到数据库 |

### 4.3 MessageListenerService

**多链事件监听**：
- 使用 WebSocket 连接各链 RPC
- 监听 `ZetaReceived` / `ZetaSent` 事件
- 解析跨链消息内容
- 触发对应的业务逻辑

**监听的事件**：

| 链 | 合约 | 事件 |
|----|------|------|
| ZetaChain | OmniTravel | `CrossChainTravelStarted` |
| ZetaChain | OmniTravel | `CrossChainTravelCompleted` |
| BSC/ETH | FrogConnector | `FrogArrived` |
| BSC/ETH | FrogConnector | `FrogDeparted` |
| BSC/ETH | FrogConnector | `ActionExecuted` |

### 4.4 与现有服务集成

**contract.service.ts 扩展**：
- 新增 `initiateCrossChainTravel` 方法
- 新增目标链合约交互方法
- 管理多链 Wallet Client

**travel.service.ts 扩展**：
- 区分普通旅行和跨链旅行
- 添加跨链旅行完成处理逻辑

---

## 5. 数据库变更

### 5.1 Travel 模型扩展

```prisma
model Travel {
  // ... 现有字段 ...
  
  // 跨链旅行相关
  isCrossChain       Boolean   @default(false)    // 是否跨链旅行
  crossChainStatus   CrossChainStatus?            // 跨链状态
  crossChainMessageId String?                     // 跨链消息ID
  lockTxHash         String?                      // 锁定交易哈希
  unlockTxHash       String?                      // 解锁交易哈希
  targetChainArrivalTime DateTime?                // 目标链到达时间
  targetChainActions Json?                        // 目标链操作记录
  returnMessageId    String?                      // 返回消息ID
}

enum CrossChainStatus {
  LOCKING          // 锁定中
  LOCKED           // 已锁定
  CROSSING_OUT     // 跨链出发中
  ON_TARGET_CHAIN  // 在目标链上
  CROSSING_BACK    // 跨链返回中
  UNLOCKING        // 解锁中
  COMPLETED        // 完成
  TIMEOUT          // 超时
  FAILED           // 失败
}
```

### 5.2 新增 CrossChainMessage 模型

```prisma
model CrossChainMessage {
  id              Int       @id @default(autoincrement())
  messageId       String    @unique    // 跨链消息唯一ID
  tokenId         Int
  sourceChain     ChainType
  targetChain     ChainType
  direction       MessageDirection    // OUT / BACK
  status          MessageStatus       // PENDING / CONFIRMED / FAILED
  sendTxHash      String?
  receiveTxHash   String?
  payload         Json                // 消息内容
  gasUsed         String?
  sentAt          DateTime
  confirmedAt     DateTime?
  createdAt       DateTime  @default(now())
  
  @@index([tokenId])
  @@index([status])
}

enum MessageDirection {
  OUT   // 从主链到目标链
  BACK  // 从目标链返回主链
}

enum MessageStatus {
  PENDING
  CONFIRMED
  FAILED
  TIMEOUT
}
```

### 5.3 ChainConfig 模型

```prisma
model ChainConfig {
  id              Int       @id @default(autoincrement())
  chainId         Int       @unique
  chainType       ChainType
  name            String
  rpcUrl          String
  wsUrl           String?
  explorerUrl     String?
  connectorAddress String?   // FrogConnector 合约地址
  isEnabled       Boolean   @default(true)
  isCrossChainEnabled Boolean @default(false)  // 是否支持真跨链
  gasMultiplier   Float     @default(1.0)
  updatedAt       DateTime  @updatedAt
}
```

---

## 6. 前端交互设计

### 6.1 旅行发起流程

**TravelDetailPage.tsx 扩展**：

```
┌─────────────────────────────────────────────────────────┐
│                     选择旅行类型                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ┌─────────────┐          ┌─────────────┐              │
│   │  观察旅行   │          │  跨链旅行   │              │
│   │  (免费)     │          │  (付费)     │              │
│   │             │          │             │              │
│   │ 远程观察    │          │ 实际跨链    │              │
│   │ 目标链数据  │          │ 到目标链    │              │
│   │             │          │ 执行操作    │              │
│   └─────────────┘          └─────────────┘              │
│                                                         │
│   跨链旅行费用: 0.05 ZETA (预估)                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 6.2 跨链状态追踪

**CrossChainTravelStatus 组件**：

```
阶段展示:
1. 🔐 锁定中 → 2. 🌉 跨链中 → 3. 🎯 探索中 → 4. 🔙 返程中 → 5. ✅ 完成

每个阶段显示:
- 当前状态描述
- 交易哈希链接
- 预估剩余时间
- 操作按钮（如"查看目标链状态"）
```

### 6.3 目标链操作界面

**CrossChainActionPanel 组件**：
- 显示青蛙在目标链的临时状态
- 提供可执行的操作列表
- 显示操作历史
- "完成并返回"按钮

---

## 7. Gas 费用与经济模型

### 7.1 费用构成

| 费用项 | 支付链 | 支付代币 | 预估金额 |
|--------|--------|----------|---------|
| 锁定 NFT | ZetaChain | ZETA | ~0.001 ZETA |
| 跨链消息(出) | ZetaChain | ZETA | ~0.02 ZETA |
| 目标链接收 | 目标链 | 原生代币 | ~0.005 BNB/ETH |
| 目标链操作 | 目标链 | 原生代币 | 变动 |
| 跨链消息(回) | 目标链 | 原生代币 | ~0.01 BNB/ETH |
| 解锁 NFT | ZetaChain | ZETA | ~0.001 ZETA |

**总计预估**：~0.03-0.05 ZETA + 0.01-0.02 目标链原生代币

### 7.2 费用策略

**方案 A - 用户承担**：
- 用户发起时预付 ZETA
- 目标链操作由用户的目标链钱包支付
- 优点：简单直接
- 缺点：用户体验复杂

**方案 B - 系统代付（推荐）**：
- 用户支付统一价格（如 0.1 ZETA）
- 后端 Relayer 代付所有 Gas
- 优点：用户体验好
- 缺点：需要维护多链 Gas 账户

---

## 8. 安全考虑

### 8.1 核心安全机制

| 风险 | 防护措施 |
|------|---------|
| NFT 丢失 | 跨链消息原子性 + 超时自动归还 |
| 消息伪造 | ZetaChain TSS 验证 |
| 重放攻击 | 消息 ID 唯一性检查 |
| 目标链故障 | 超时回滚 + 紧急归还函数 |
| 资金锁死 | 管理员紧急解锁权限 |

### 8.2 超时机制

```
跨链旅行最大时长: 24小时
单阶段超时: 30分钟

超时处理:
1. 后端定时任务检查超时
2. 触发 emergencyReturn 函数
3. 强制解锁 NFT
4. 记录异常日志
```

---

## 9. 与现有功能兼容性

### 9.1 保持向后兼容

| 现有功能 | 影响 | 处理方式 |
|---------|------|---------|
| 普通旅行 | 无影响 | 继续使用 Travel.sol |
| 徽章系统 | 扩展 | 新增跨链成就徽章 |
| 好友系统 | 无影响 | 跨链旅行也支持结伴 |
| AI 日记 | 扩展 | 根据链上操作生成更丰富日记 |

### 9.2 旅行类型识别

```typescript
enum TravelType {
  OBSERVATION = 'observation',  // 现有观察模式
  CROSS_CHAIN = 'cross_chain',  // 新增跨链模式
}

// 前端选择
// 后端根据类型调用不同服务
```

---

## 10. 部署计划

### 10.1 合约部署顺序

1. 部署 `OmniTravel.sol` 到 ZetaChain Athens
2. 部署 `FrogConnector.sol` 到 BSC Testnet
3. 部署 `FrogConnector.sol` 到 ETH Sepolia
4. 配置各合约互信地址
5. 更新 `ZetaFrogNFT.sol` 权限

### 10.2 数据库迁移

```bash
npx prisma migrate dev --name add_cross_chain_travel
```

### 10.3 后端部署

1. 部署新增的跨链服务模块
2. 配置多链 RPC 端点
3. 配置多链 Relayer 账户
4. 启动消息监听服务

---

## 11. 验证方案

### 11.1 合约测试

**单元测试**（Hardhat）：
- `OmniTravel.test.ts`: 跨链旅行发起/完成
- `FrogConnector.test.ts`: 青蛙接收/操作/返回

**集成测试**：
- 使用 Hardhat 分叉测试网
- 模拟完整跨链流程

### 11.2 后端测试

**服务测试**：
```bash
cd backend
npm run test -- --grep "CrossChain"
```

### 11.3 端到端测试

**手动测试流程**：
1. 在 ZetaChain Athens 铸造青蛙
2. 发起跨链旅行到 BSC Testnet
3. 在 BSC Testnet 执行观察操作
4. 完成旅行返回 ZetaChain
5. 验证经验值/奖励更新

---

## User Review Required

> [!IMPORTANT]
> 此需求分析为真正跨链旅行功能的完整设计方案。在开始实现前，请确认以下关键决策：

1. **Gas 费用策略**：用户承担 vs 系统代付？
2. **目标链支持范围**：初期仅支持 BSC Testnet？还是同时支持 ETH Sepolia？
3. **操作复杂度**：目标链操作是否仅限于只读观察？还是支持写入操作？
4. **开发优先级**：是否作为 V2.0 核心功能开发？

---

## 12. 多链合约部署需求

> [!IMPORTANT]
> 回答问题一：是的，每条需要支持跨链旅行的目标链都需要部署 `FrogConnector.sol` 合约。

### 12.1 部署架构

```
                    ZetaChain Athens (主链)
                    ┌───────────────────────┐
                    │  ZetaFrogNFT.sol      │ ← NFT 永久存储
                    │  Travel.sol           │ ← 普通旅行
                    │  OmniTravel.sol       │ ← 跨链控制器
                    │  SouvenirNFT.sol      │ ← 纪念品
                    └───────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
    BSC Testnet         ETH Sepolia      Polygon Mumbai
    ┌──────────────┐   ┌──────────────┐  ┌──────────────┐
    │FrogConnector │   │FrogConnector │  │FrogConnector │
    │   .sol       │   │   .sol       │  │   .sol       │
    └──────────────┘   └──────────────┘  └──────────────┘
```

### 12.2 合约部署清单

| 合约 | 部署链 | 必需性 | 功能 |
|------|--------|--------|------|
| `ZetaFrogNFT.sol` | ZetaChain | ✅ 已部署 | NFT 核心 |
| `Travel.sol` | ZetaChain | ✅ 已部署 | 普通旅行 |
| `SouvenirNFT.sol` | ZetaChain | ✅ 已部署 | 纪念品 |
| `OmniTravel.sol` | ZetaChain | 🆕 新增 | 跨链主控 |
| `FrogConnector.sol` | BSC Testnet | 🆕 新增 | 目标链连接器 |
| `FrogConnector.sol` | ETH Sepolia | 🆕 新增 | 目标链连接器 |
| `FrogConnector.sol` | Polygon Mumbai | 🔜 可选 | 目标链连接器 |

### 12.3 FrogConnector.sol 部署配置

每条目标链的 `FrogConnector.sol` 部署时需要配置：

| 参数 | 说明 | 示例值 |
|------|------|--------|
| `zetaConnectorAddress` | 该链的 ZetaConnector 合约 | 从 ZetaChain 文档获取 |
| `zetaTokenAddress` | 该链的 ZETA 代币合约 | 从 ZetaChain 文档获取 |
| `zetaChainOmniTravel` | 主链 OmniTravel 合约地址 | 部署后获取 |
| `chainId` | 当前链 ID | 97 / 11155111 / 80001 |

### 12.4 ZetaChain 官方连接器地址

| 链 | ChainId | ZetaConnector | ZetaToken |
|----|---------|---------------|-----------|
| ZetaChain Athens | 7001 | 原生支持 | 原生 ZETA |
| BSC Testnet | 97 | `0x...` (查官方文档) | `0x...` |
| ETH Sepolia | 11155111 | `0x...` (查官方文档) | `0x...` |
| Polygon Mumbai | 80001 | `0x...` (查官方文档) | `0x...` |

> **参考**：[ZetaChain Connector Addresses](https://www.zetachain.com/docs/reference/network/contracts)

### 12.5 部署脚本

**新增文件**：`contracts/scripts/deploy-cross-chain.js`

```
部署步骤：
1. 先部署 OmniTravel.sol 到 ZetaChain
2. 记录 OmniTravel 合约地址
3. 依次部署 FrogConnector.sol 到各目标链
4. 配置 OmniTravel 的 supportedConnectors
5. 配置各 FrogConnector 的互信地址
```

### 12.6 费用估算（部署）

| 链 | 预估 Gas | 预估费用 |
|----|----------|---------|
| ZetaChain (OmniTravel) | ~2,000,000 | ~0.05 ZETA |
| BSC Testnet (Connector) | ~1,500,000 | ~0.005 BNB |
| ETH Sepolia (Connector) | ~1,500,000 | ~0.01 ETH |

---

## 13. 结伴跨链旅行设计

> [!IMPORTANT]
> 回答问题二：当前设计确实未考虑结伴旅行场景。以下是兼容性设计方案。

### 13.1 现有结伴旅行机制

**数据模型**（schema.prisma）：
```
GroupTravel {
  leaderId    Int    // 发起者青蛙
  companionId Int    // 同伴青蛙
  travelId    Int    // 关联的旅行记录
  status      GroupTravelStatus
}
```

**业务逻辑**：
- 发起者青蛙创建旅行，邀请同伴
- 两只青蛙共享同一个旅行记录
- AI 生成双蛙视角的日记
- 两蛙同时获得经验值

### 13.2 跨链结伴的技术挑战

| 挑战 | 描述 |
|------|------|
| 双 NFT 锁定 | 需同时锁定两个 tokenId |
| 消息同步 | 两蛙需同时到达/离开目标链 |
| 原子性 | 一蛙失败则两蛙都应回滚 |
| 所有者验证 | 两蛙可能属于不同所有者 |
| Gas 费用 | 翻倍的跨链消息成本 |

### 13.3 设计方案

**方案选择**：**领队模式** + **同步锁定**

```
结伴跨链流程：
                                                          
  用户A (领队青蛙)        用户B (同伴青蛙)                
       │                      │                          
       ▼                      ▼                          
  ①发起结伴旅行  ───────→  ②确认参加                      
       │                      │                          
       └──────────┬───────────┘                          
                  ▼                                       
         ③同时锁定两个NFT                                 
                  │                                       
                  ▼                                       
         ④单条跨链消息（携带两蛙数据）                    
                  │                                       
                  ▼                                       
         目标链：两蛙同时到达                              
                  │                                       
                  ▼                                       
         ⑤执行操作（共享）                                
                  │                                       
                  ▼                                       
         ⑥单条返回消息                                    
                  │                                       
                  ▼                                       
         ⑦同时解锁两个NFT                                 
```

### 13.4 合约扩展

**OmniTravel.sol 新增结构**：

```
struct GroupCrossChainTravel {
    uint256 leaderTokenId;
    uint256 companionTokenId;
    address leaderOwner;
    address companionOwner;
    uint256 targetChainId;
    bytes32 messageId;
    GroupCrossChainStatus status;
}

mapping(bytes32 => GroupCrossChainTravel) public groupTravels;
```

**新增函数**：

| 函数 | 功能 |
|------|------|
| `startGroupCrossChainTravel` | 发起结伴跨链（领队调用） |
| `confirmGroupTravel` | 同伴确认参加 |
| `cancelGroupTravel` | 取消（任一方取消则全部取消） |
| `onGroupZetaMessage` | 处理结伴返回消息 |

### 13.5 FrogConnector.sol 扩展

**新增结构**：

```
struct VisitingGroup {
    uint256 leaderTokenId;
    uint256 companionTokenId;
    VisitingFrog leader;
    VisitingFrog companion;
    bool isActive;
}
```

**修改逻辑**：
- 接收时创建双蛙状态
- 操作时两蛙共享结果
- 返回时打包双蛙数据

### 13.6 后端服务扩展

**omni-travel.service.ts 扩展**：

```typescript
// 新增方法
async initiateGroupCrossChainTravel(
  leaderTokenId: number,
  companionTokenId: number,
  targetChainId: number
): Promise<{ messageId: string }>;

async handleGroupTravelCompleted(
  messageId: string,
  leaderData: TravelData,
  companionData: TravelData
): Promise<void>;
```

**AI 日记生成**：
- 复用现有 `buildGroupTravelPrompt`
- 根据跨链操作数据生成双蛙冒险故事

### 13.7 费用模型

| 费用项 | 单独旅行 | 结伴旅行 | 节省 |
|--------|---------|---------|------|
| 跨链消息(出) | 0.02 ZETA × 2 | 0.025 ZETA | 37% |
| 目标链接收 | 0.005 × 2 | 0.007 | 30% |
| 跨链消息(回) | 0.01 × 2 | 0.012 | 40% |
| **总计** | ~0.07 | ~0.044 | **~37%** |

> 结伴旅行通过合并消息显著降低成本

### 13.8 前端交互扩展

**结伴跨链旅行流程**：

1. **发起者选择**：选择"跨链旅行" → 勾选"邀请好友结伴"
2. **选择同伴**：从好友列表选择在线青蛙
3. **发送邀请**：WebSocket 通知同伴
4. **同伴确认**：弹窗确认 + 签名授权
5. **同时出发**：两蛙同时锁定并跨链
6. **共享状态**：两用户看到相同的旅行进度
7. **同时归来**：两蛙同时解锁，各自获得奖励

### 13.9 数据库扩展

**Travel 模型扩展**：
```prisma
model Travel {
  // ... 现有字段 ...
  
  // 结伴跨链
  isGroupCrossChain     Boolean  @default(false)
  groupCrossChainData   Json?    // { leaderData, companionData }
}
```

**新增 GroupCrossChainInvite 模型**：
```prisma
model GroupCrossChainInvite {
  id              Int       @id @default(autoincrement())
  leaderFrogId    Int
  companionFrogId Int
  targetChainId   Int
  status          InviteStatus  // PENDING / ACCEPTED / DECLINED / EXPIRED
  expiresAt       DateTime
  createdAt       DateTime  @default(now())
  
  @@index([companionFrogId, status])
}
```

---

## 附录：术语表


| 术语 | 解释 |
|------|------|
| TSS | Threshold Signature Scheme，门限签名方案 |
| ZetaConnector | ZetaChain 在每条链上的连接器合约 |
| Omnichain | ZetaChain 的全链互操作概念 |
| Relayer | 代付 Gas 的后端服务账户 |
| 跨链锁定 | NFT 在主链被标记为不可操作状态 |
