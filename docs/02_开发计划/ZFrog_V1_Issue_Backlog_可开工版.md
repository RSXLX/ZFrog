---
status: 执行中
version: 1.0
last_updated: 2026-03-21
reviewer: Codex
---

# ZFrog V1 Issue Backlog 可开工版

## 一、文档目标

这份文档是对 [ZFrog_V1_任务清单.md](/Users/sxlx/.gemini/antigravity/ZFrog/docs/02_开发计划/ZFrog_V1_任务清单.md) 的继续细化。

目标是把 Version 1 拆成可以直接开工的 issue 级 backlog。

每个 issue 都会明确：

1. 主负责人
2. 依赖关系
3. 创建文件
4. 修改文件
5. 接口契约
6. 表结构迁移
7. 领域事件
8. 迁移顺序
9. 完成定义

---

## 进展记录

1. `2026-03-21`：`V1-I01` ~ `V1-I06` 已完成并通过主链路验证。
2. `2026-03-21`：`V1-I07` 已进入开发中，已落地 V1 travel module（state machine / command / query / events）和 `/api/v1/travels` 主接口。
3. `2026-03-21`：旧入口开始切流，`/api/travels/start`、`/api/travels/start-p0`、`/api/cross-chain/travel` 已委托统一 travel.command。
4. `2026-03-21`：旧 `travel/group/rescue` 写路径继续收敛到 `travel.command`，旧 `history/stats/active/group/feeds/rescue` 读取路径继续收敛到 `travel.query`，并补 legacy delegation e2e。
5. `2026-03-21`：`cross-chain` 剩余主路由完成委托（started/arrived/completed/status/visiting/active/sync/discoveries）到 travel.command/query，并补 cross-chain delegation e2e。
6. `2026-03-21`：`cross-chain` 对 `omniTravelService` 的直接依赖下沉到 `travel` 模块内部 adapter，旧 websocket 事件补齐与 `travel-state-machine` 对齐（status/currentStage/progress），并新增 e2e + contract integration 回归。
7. `2026-03-21`：`V1-I08` 开始推进，已新增 `web3` 模块（frog-wallet.service / onchain-milestone.service / frog-wallet.query），并接入 `/api/v1/frogs/:frogId/wallet` 与 `/api/v1/frogs/:frogId/milestones`。
8. `2026-03-21`：`egg/soul/hatch` 的里程碑写入统一走 `onchainMilestoneService.record`，并统一产出 `OnchainMilestoneRecorded` domain event。

---

## 二、统一迁移策略

Version 1 必须采用 **并行引入 -> 切流 -> 退役** 的迁移方式。

### 2.1 总迁移顺序

1. 冻结历史分叉目录
2. 在后端并行引入 `/api/v1/*` 新接口
3. 新表先创建，不立即删除旧字段
4. 先做后端双写或兼容写
5. Web 切到新接口
6. Desktop 切到新接口
7. Admin 接入新观测面
8. 冒烟通过后，逐步退役旧路由和旧读取路径

### 2.2 Version 1 不允许的迁移方式

1. 一次性删除旧路由
2. 先改前端再补后端
3. 未做数据回填就切读路径
4. 在主链路中并行保留两套旅行状态机

---

## 三、Issue 概览（当前进度）

| ID | 标题 | 主负责人 | 依赖 | 进度 |
|----|------|----------|------|------|
| `V1-I01` | 冻结遗留分叉与建立 V1 基线 | Tech Lead | 无 | `已完成` |
| `V1-I02` | 建立 Backend V1 API 骨架与统一响应 | BE Owner | `V1-I01` | `已完成` |
| `V1-I03` | 钱包签名登录与 World Verify | BE Owner | `V1-I02` | `已完成` |
| `V1-I04` | 建立 V1 核心数据表并完成回填脚本 | BE Owner | `V1-I02` | `已完成` |
| `V1-I05` | Egg Claim / Soul Imprint / Hatch 后端主链路 | BE Owner | `V1-I03`, `V1-I04` | `已完成` |
| `V1-I06` | Life Engine 收敛 interaction / nurture / hibernation | BE Owner | `V1-I04` | `已完成` |
| `V1-I07` | 统一 Travel 主状态机与 V1 旅行接口 | BE Owner | `V1-I02`, `V1-I04` | `已完成` |
| `V1-I08` | Frog Wallet 接入与链上里程碑聚合 | Contract Owner | `V1-I07` | `进行中` |
| `V1-I09` | Memory Palace Lite 与 AI Recap 出栈 | AI Owner | `V1-I05`, `V1-I07`, `V1-I08` | `未开始` |
| `V1-I10` | Web 端 API Client 重构与主路由切换 | FE Owner | `V1-I02`, `V1-I03` | `未开始` |
| `V1-I11` | Web 端主体验重构 Egg / Life / Travel / Memory | FE Owner | `V1-I05`, `V1-I06`, `V1-I07`, `V1-I09` | `未开始` |
| `V1-I12` | Desktop 主线清洗与快捷照顾/通知切换 | Desktop Owner | `V1-I02`, `V1-I06`, `V1-I07` | `未开始` |
| `V1-I13` | Social Rituals + Dormancy Beta | BE Owner | `V1-I03`, `V1-I04`, `V1-I06`, `V1-I07` | `未开始` |
| `V1-I14` | Admin 观测面与发布前 cutover | Admin Owner | `V1-I03`, `V1-I04`, `V1-I13` | `未开始` |

---

## 四、Issue 详细拆解

## V1-I01 冻结遗留分叉与建立 V1 基线（已完成）

### 主负责人

`Tech Lead`

### 协作人

1. `FE Owner`
2. `Desktop Owner`
3. `Contract Owner`

### 目标

把 Version 1 的正式主线和遗留分叉彻底区分开。

### 创建文件

1. `desktop_pet/FROZEN.md`
2. `frontend/src-tauri/FROZEN.md`
3. `src/renderer/FROZEN.md`
4. `microservices/api-gateway/FROZEN.md`
5. `microservices/badge-service/FROZEN.md`
6. `microservices/wallet-observer/FROZEN.md`

### 修改文件

1. `docs/00_架构设计/ZFrog_未来三版本架构收敛图.md`
2. `docs/02_开发计划/ZFrog_超级融合版技术实施方案与开发计划.md`
3. 根目录 `README` 或项目入口文档

### 接口契约

无。

### 表结构

无。

### 事件

无。

### 迁移顺序

1. 为冻结目录补 `FROZEN.md`
2. 把主线文档统一改为只认 `frontend/`、`backend/`、`admin/`、`desktop-pet/`、`contracts/`
3. 在开发流程里规定：冻结目录不得接新功能

### 完成定义

1. 主线目录明确
2. 冻结目录有文字标记
3. 后续 backlog 不再引用冻结目录作为正式实现路径

---

## V1-I02 建立 Backend V1 API 骨架与统一响应（已完成）

### 主负责人

`BE Owner`

### 协作人

1. `Tech Lead`
2. `FE Owner`
3. `Desktop Owner`

### 目标

在不打断旧接口的前提下，引入 `/api/v1/*` 统一接口面和统一响应模型。

### 创建文件

1. `backend/src/api/routes/v1/index.ts`
2. `backend/src/api/routes/v1/auth.routes.ts`
3. `backend/src/api/routes/v1/frogs.routes.ts`
4. `backend/src/api/routes/v1/life.routes.ts`
5. `backend/src/api/routes/v1/travels.routes.ts`
6. `backend/src/api/routes/v1/social.routes.ts`
7. `backend/src/api/routes/v1/memory.routes.ts`
8. `backend/src/api/response.ts`
9. `backend/src/types/api.ts`
10. `backend/src/utils/request-id.ts`

### 修改文件

1. `backend/src/index.ts`
2. `backend/src/middlewares/errorHandler.ts`
3. `backend/src/middlewares/auth.middleware.ts`

### 接口契约

#### 统一响应结构

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-03-20T12:00:00.000Z"
  }
}
```

#### 统一错误结构

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "frogId is required",
    "details": {}
  },
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-03-20T12:00:00.000Z"
  }
}
```

### 表结构

无直接变更。

### 事件

1. `DomainEventDefined`

### 迁移顺序

1. 先创建统一 response/error 工具
2. `backend/src/index.ts` 并行挂载 `/api/v1`
3. 先接入 health/auth/frogs 占位路由
4. 前端和桌面端暂时仍可继续访问旧接口

### 完成定义

1. `/api/v1/*` 可以启动
2. 新接口全部返回统一 envelope
3. requestId 可在日志中追踪

---

## V1-I03 钱包签名登录与 World Verify（已完成）

### 主负责人

`BE Owner`

### 协作人

1. `FE Owner`
2. `Admin Owner`

### 目标

建立不依赖旧开发态 header fallback 的正式身份路径。

### 创建文件

1. `backend/src/modules/identity/auth.service.ts`
2. `backend/src/modules/identity/nonce.service.ts`
3. `backend/src/modules/identity/world-verify.service.ts`
4. `backend/src/modules/identity/types.ts`
5. `backend/src/modules/identity/index.ts`

### 修改文件

1. `backend/src/api/routes/v1/auth.routes.ts`
2. `backend/src/middlewares/auth.middleware.ts`
3. `backend/src/config/index.ts`
4. `frontend/src/hooks/useWalletConnect.ts`
5. `frontend/src/services/wallet/sessionStore.ts`
6. `admin/src/services/api.ts`

### 接口契约

#### `POST /api/v1/auth/nonce`

Request:

```json
{
  "walletAddress": "0x..."
}
```

Response:

```json
{
  "success": true,
  "data": {
    "nonce": "random-string",
    "message": "Sign this message to login to ZFrog",
    "expiresAt": "2026-03-20T12:10:00.000Z"
  }
}
```

#### `POST /api/v1/auth/wallet`

Request:

```json
{
  "walletAddress": "0x...",
  "signature": "0x...",
  "chainId": 7001
}
```

Response:

```json
{
  "success": true,
  "data": {
    "token": "jwt",
    "walletAddress": "0x...",
    "frogTokenId": 1,
    "hasFrog": true
  }
}
```

#### `POST /api/v1/verify/world`

Request:

```json
{
  "action": "egg_claim",
  "walletAddress": "0x...",
  "proof": {
    "nullifierHash": "0x...",
    "proof": "0x..."
  },
  "signal": "zfrog:egg_claim"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "verified": true,
    "verificationId": "uuid",
    "action": "egg_claim"
  }
}
```

#### `GET /api/v1/me`

Response:

```json
{
  "success": true,
  "data": {
    "walletAddress": "0x...",
    "world": {
      "verifiedActions": ["egg_claim"]
    },
    "frogTokenId": 1
  }
}
```

### 表结构

新增：

1. `auth_nonces`
2. `human_verifications`

### 事件

1. `WalletAuthenticated`
2. `HumanVerified`

### 迁移顺序

1. 先上 nonce 接口
2. 上钱包签名登录
3. 再上 World Verify
4. 前端切 wallet 登录
5. 仅在开发环境继续保留 header fallback

### 完成定义

1. Web 端可完成钱包签名登录
2. 真人验证结果可入库、可审计
3. admin 可查看验证记录

---

## V1-I04 建立 V1 核心数据表并完成回填脚本（已完成）

### 主负责人

`BE Owner`

### 协作人

1. `Tech Lead`
2. `QA Owner`

### 目标

在不破坏现有 `Frog` / `Travel` 主表可运行性的前提下，把新增能力外移到独立表。

### 创建文件

1. `backend/prisma/migrations/<timestamp>_v1_core_domain/migration.sql`
2. `backend/src/scripts/backfill-v1-domain.ts`
3. `backend/src/scripts/verify-v1-domain-backfill.ts`

### 修改文件

1. `backend/prisma/schema.prisma`
2. `backend/src/database.ts`

### 目标表

1. `auth_nonces`
2. `human_verifications`
3. `egg_profiles`
4. `pet_states`
5. `soul_profiles`
6. `relationship_events`
7. `rituals`
8. `memory_palaces`
9. `onchain_milestones`
10. `domain_events`

### 接口契约

无直接外部接口。

### 迁移顺序

1. 新表 migration 上线
2. 回填 `egg_profiles`、`pet_states`、基础 `soul_profiles`
3. 验证脚本确认 `frogId` 对齐
4. life / egg / travel 新模块开始写新表
5. 旧逻辑仍暂时保留旧字段写入

### 完成定义

1. migration 可执行
2. 回填脚本可重复运行且幂等
3. 新表数据与现有 frog/travel 主数据可关联

---

## V1-I05 Egg Claim / Soul Imprint / Hatch 后端主链路（已完成）

### 主负责人

`BE Owner`

### 协作人

1. `AI Owner`
2. `Contract Owner`

### 目标

建立新用户第一条完整链路：`verify -> claim egg -> soul imprint -> hatch`

### 创建文件

1. `backend/src/modules/life/egg.service.ts`
2. `backend/src/modules/life/hatch.service.ts`
3. `backend/src/modules/soul/soul-imprint.service.ts`
4. `backend/src/modules/life/egg.query.ts`

### 修改文件

1. `backend/src/api/routes/v1/frogs.routes.ts`
2. `backend/src/api/routes/v1/life.routes.ts`
3. `backend/src/modules/identity/world-verify.service.ts`
4. `contracts/contracts/upgradeable/ZetaFrogNFTUpgradeable.sol`

### 接口契约

#### `POST /api/v1/frogs/claim-egg`

Request:

```json
{
  "walletAddress": "0x...",
  "verificationId": "uuid",
  "petName": "呱呱"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "frogId": 1,
    "tokenId": 1,
    "eggProfile": {
      "hatchStatus": "incubating",
      "hatchProgress": 0
    }
  }
}
```

#### `POST /api/v1/frogs/:frogId/soul-imprint`

Request:

```json
{
  "introText": "我喜欢冒险和海边",
  "voiceSummary": "optional",
  "preferredStyle": "adventurous"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "tone": "playful",
    "traits": ["curious", "warm"],
    "evolutionBias": "explorer"
  }
}
```

#### `POST /api/v1/frogs/:frogId/hatch`

Request:

```json
{
  "source": "web"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "hatched": true,
    "frogStatus": "Idle",
    "eggStatus": "hatched"
  }
}
```

### 表结构

写入：

1. `egg_profiles`
2. `soul_profiles`
3. `onchain_milestones`
4. `domain_events`

### 事件

1. `EggClaimed`
2. `SoulImprinted`
3. `HatchUnlocked`
4. `Hatched`

### 迁移顺序

1. 先后端写好 claim/hatch 流程
2. 暂时允许 claim 只写 DB + 事件
3. 合约 Egg/Hatch event 同步补齐
4. 前端和桌面端再切入新链路

### 完成定义

1. claim egg 不再走旧 mint-only 文案
2. hatch 不是纯时间驱动
3. soul imprint 结果可持久化并回读

---

## V1-I06 Life Engine 收敛 interaction / nurture / hibernation（已完成）

### 主负责人

`BE Owner`

### 协作人

1. `FE Owner`
2. `Desktop Owner`

### 目标

把现有重复的养成与冬眠逻辑收敛成一个 `life` 接口面。

### 创建文件

1. `backend/src/modules/life/life.query.ts`
2. `backend/src/modules/life/life.command.ts`
3. `backend/src/modules/life/state-calculator.ts`
4. `backend/src/modules/life/dormancy.service.ts`

### 修改文件

1. `backend/src/api/routes/v1/life.routes.ts`
2. `backend/src/services/frog-status.service.ts`
3. `backend/src/services/hibernation.service.ts`
4. `backend/src/services/evolution.service.ts`
5. `backend/src/services/status-cron.job.ts`

### 退役读取路径

1. `backend/src/api/routes/interaction.routes.ts`
2. `backend/src/api/routes/nurture.routes.ts`
3. `backend/src/api/routes/hibernation.routes.ts`

### 接口契约

#### `GET /api/v1/frogs/:frogId/life`

Response:

```json
{
  "success": true,
  "data": {
    "hunger": 80,
    "happiness": 70,
    "cleanliness": 95,
    "health": 100,
    "energy": 90,
    "mood": "happy",
    "isSick": false,
    "hibernationStatus": "ACTIVE"
  }
}
```

#### `POST /api/v1/frogs/:frogId/care/feed`

Request:

```json
{
  "foodType": "bug_bento",
  "quantity": 1
}
```

#### `POST /api/v1/frogs/:frogId/care/clean`

Request:

```json
{
  "source": "web"
}
```

#### `POST /api/v1/frogs/:frogId/care/play`

Request:

```json
{
  "gameType": "guess",
  "score": 1
}
```

#### `POST /api/v1/frogs/:frogId/hibernation/bless`

Request:

```json
{
  "blesserFrogId": 9,
  "verificationId": "uuid"
}
```

### 表结构

读写：

1. `pet_states`
2. `rituals`
3. `relationship_events`
4. `domain_events`

### 事件

1. `PetStateUpdated`
2. `PetNeedsCare`
3. `PetEnteredDormancy`
4. `BlessingStarted`
5. `BlessingCompleted`

### 迁移顺序

1. 先建立 `life.query` 和 `life.command`
2. 旧 route 改为委托调用新 life service
3. 前端切到 `/api/v1/frogs/:id/life`
4. 稳定后退役旧养成读取路径

### 完成定义

1. status/feed/clean/play/heal/rest/hibernation 都走一套服务
2. 冬眠状态不再分散在不同路由判断
3. life read model 一致

---

## V1-I07 统一 Travel 主状态机与 V1 旅行接口（已完成）

### 主负责人

`BE Owner`

### 协作人

1. `Contract Owner`
2. `AI Owner`

### 目标

把 `travel.routes.ts`、`cross-chain.routes.ts`、`group-travel.routes.ts` 收敛到单一旅行故事。

### 创建文件

1. `backend/src/modules/travel/travel-state-machine.ts`
2. `backend/src/modules/travel/travel.command.ts`
3. `backend/src/modules/travel/travel.query.ts`
4. `backend/src/modules/travel/travel-events.ts`

### 修改文件

1. `backend/src/api/routes/v1/travels.routes.ts`
2. `backend/src/services/travel/travel-p0.service.ts`
3. `backend/src/services/travel/travel-query.service.ts`
4. `backend/src/services/travel/travel-reward.service.ts`
5. `backend/src/services/travel/rescue.service.ts`
6. `backend/src/services/omni-travel.service.ts`
7. `backend/src/workers/travelProcessor.ts`
8. `backend/src/websocket/index.ts`

### 退役读取路径

1. `backend/src/api/routes/travel.routes.ts` 中 `start-p0`
2. `backend/src/api/routes/cross-chain.routes.ts`
3. `backend/src/api/routes/group-travel.routes.ts`

### 接口契约

#### `POST /api/v1/travels`

Request:

```json
{
  "frogId": 1,
  "travelType": "cross_chain",
  "targetChain": 7001,
  "duration": 3600,
  "companionFrogId": null
}
```

Response:

```json
{
  "success": true,
  "data": {
    "travelId": 101,
    "status": "PENDING",
    "currentStage": "PREPARING"
  }
}
```

#### `GET /api/v1/travels/:travelId`

Response:

```json
{
  "success": true,
  "data": {
    "travelId": 101,
    "frogId": 1,
    "status": "ACTIVE",
    "currentStage": "OBSERVING",
    "progress": 40
  }
}
```

#### `POST /api/v1/travels/:travelId/complete`

Response:

```json
{
  "success": true,
  "data": {
    "travelId": 101,
    "status": "COMPLETED",
    "souvenirId": 88
  }
}
```

### 表结构

使用：

1. `Travel`
2. `TravelDiscovery`
3. `onchain_milestones`
4. `domain_events`

### 事件

1. `TravelStarted`
2. `TravelProgressed`
3. `TravelCompleted`
4. `SouvenirMintRequested`
5. `SouvenirMinted`

### 迁移顺序

1. 新 `travel-state-machine` 落地
2. 旧 route 全部改调 state machine
3. `/api/v1/travels` 并行开放
4. Web 切换新接口
5. Desktop 切换 WebSocket 事件
6. 退役旧 `start-p0` 路径

### 完成定义

1. 旅行开始到完成只走一套状态机
2. 结果页需要的数据都能从一个 query 拿到
3. WebSocket 事件名与后端状态机一致

---

## V1-I08 Frog Wallet 接入与链上里程碑聚合

### 主负责人

`Contract Owner`

### 协作人

1. `BE Owner`
2. `FE Owner`

### 目标

让每只蛙拥有可展示的 Frog Wallet，并把关键里程碑统一归档。

### 创建文件

1. `contracts/scripts/deploy-tba-registry.ts`
2. `backend/src/modules/web3/frog-wallet.service.ts`
3. `backend/src/modules/web3/onchain-milestone.service.ts`
4. `backend/src/modules/web3/frog-wallet.query.ts`

### 修改文件

1. `contracts/contracts/upgradeable/ZetaFrogNFTUpgradeable.sol`
2. `contracts/contracts/upgradeable/TravelUpgradeable.sol`
3. `contracts/contracts/upgradeable/OmniTravelUpgradeable.sol`
4. `contracts/contracts/SouvenirNFT.sol`
5. `backend/src/api/routes/v1/frogs.routes.ts`
6. `backend/src/api/routes/v1/memory.routes.ts`

### 接口契约

#### `GET /api/v1/frogs/:frogId/wallet`

Response:

```json
{
  "success": true,
  "data": {
    "tbaAddress": "0x...",
    "assets": {
      "souvenirs": [],
      "badges": [],
      "decorations": []
    }
  }
}
```

#### `GET /api/v1/frogs/:frogId/milestones`

Response:

```json
{
  "success": true,
  "data": [
    {
      "type": "hatched",
      "chainId": 7001,
      "txHash": "0x..."
    }
  ]
}
```

### 表结构

读写：

1. `onchain_milestones`

### 事件

1. `FrogWalletBound`
2. `OnchainMilestoneRecorded`

### 迁移顺序

1. 先接标准 ERC-6551 registry
2. 后端实现 tokenId -> TBA 读路径
3. 前端只读展示
4. 后续再逐步增加写路径或更复杂资产交互

### 完成定义

1. TBA 地址稳定可推导
2. 关键链上事件可落库
3. Web 端可展示 Frog Wallet 摘要

---

## V1-I09 Memory Palace Lite 与 AI Recap 出栈

### 主负责人

`AI Owner`

### 协作人

1. `BE Owner`
2. `FE Owner`

### 目标

把旅行结果从“奖励页”升级成“记忆空间 Lite”。

### 创建文件

1. `backend/src/modules/memory-palace/memory-palace.service.ts`
2. `backend/src/modules/memory-palace/memory-palace.query.ts`
3. `backend/src/services/ai/journal/recap.service.ts`
4. `backend/src/services/ai/memory/milestone-memory.service.ts`

### 修改文件

1. `backend/src/api/routes/v1/memory.routes.ts`
2. `backend/src/modules/travel/travel.command.ts`
3. `frontend/src/pages/TravelResultPage.tsx`
4. `frontend/src/components/travel/TravelResult.tsx`

### 接口契约

#### `GET /api/v1/memory-palaces/:id`

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "frogId": 1,
    "title": "海风中的第一次远行",
    "summary": "呱呱第一次穿越到目标链并带回纪念品",
    "journal": {
      "title": "旅行日志",
      "content": "...",
      "mood": "excited"
    },
    "souvenir": {
      "id": 88,
      "name": "潮汐碎片"
    },
    "highlights": [],
    "comments": []
  }
}
```

### 表结构

读写：

1. `memory_palaces`
2. `soul_profiles`
3. `domain_events`

### 事件

1. `TravelRecapGenerated`
2. `MemoryPalaceCreated`

### 迁移顺序

1. 旅行完成后先生成 recap
2. recap 通过后写 `memory_palaces`
3. 前端结果页切到读 `memory-palaces`
4. 保留旧结果页字段作为兼容 fallback

### 完成定义

1. 每次完成旅行至少可生成一个 Lite 记忆空间
2. 结果页不再只展示裸奖励
3. AI 文案和纪念物有统一摘要结构

---

## V1-I10 Web 端 API Client 重构与主路由切换

### 主负责人

`FE Owner`

### 协作人

1. `BE Owner`

### 目标

把前端从分散 service 调用切到统一的 `lib/api` 契约层。

### 创建文件

1. `frontend/src/lib/api/client.ts`
2. `frontend/src/lib/api/errors.ts`
3. `frontend/src/lib/api/contracts.ts`
4. `frontend/src/lib/auth/session.ts`
5. `frontend/src/features/egg/api.ts`
6. `frontend/src/features/life/api.ts`
7. `frontend/src/features/travel/api.ts`
8. `frontend/src/features/social/api.ts`
9. `frontend/src/features/memory-palace/api.ts`

### 修改文件

1. `frontend/src/App.tsx`
2. `frontend/src/services/api.ts`
3. `frontend/src/services/travel.api.ts`
4. `frontend/src/services/interaction.api.ts`
5. `frontend/src/services/hibernation.api.ts`
6. `frontend/src/services/home.api.ts`
7. `frontend/src/services/homestead.api.ts`
8. `frontend/src/services/garden.api.ts`
9. `frontend/src/services/message.api.ts`

### 接口契约

前端必须只依赖 `/api/v1/*` 契约，不再直接拼旧路径。

### 表结构

无。

### 事件

消费：

1. `EggClaimed`
2. `PetStateUpdated`
3. `TravelCompleted`
4. `MemoryPalaceCreated`

### 迁移顺序

1. 先引入 `lib/api/client`
2. feature API 包装 `/api/v1/*`
3. 页面逐页切换
4. 最后保留旧 `services/*` 作为兼容层或删除

### 完成定义

1. 页面不再直接调用旧分散 service 协议
2. 鉴权、错误处理、重试统一
3. 旧 service 可被标记 deprecated

---

## V1-I11 Web 端主体验重构 Egg / Life / Travel / Memory

### 主负责人

`FE Owner`

### 协作人

1. `AI Owner`
2. `BE Owner`

### 目标

把当前页面重新编排成主链路体验。

### 创建文件

1. `frontend/src/pages/EggClaimPage.tsx`
2. `frontend/src/pages/MemoryPalacePage.tsx`
3. `frontend/src/features/egg/components/EggIntroFlow.tsx`
4. `frontend/src/features/life/components/PetStatePanel.tsx`
5. `frontend/src/features/life/components/CareActionPanel.tsx`
6. `frontend/src/features/travel/components/TravelSummaryCard.tsx`
7. `frontend/src/features/memory-palace/components/MemoryPalaceView.tsx`

### 修改文件

1. `frontend/src/pages/MyFrog.tsx`
2. `frontend/src/pages/FrogDetail.tsx`
3. `frontend/src/pages/TravelResultPage.tsx`
4. `frontend/src/pages/Friends.tsx`
5. `frontend/src/hooks/useMyFrog.ts`
6. `frontend/src/hooks/useHibernation.ts`
7. `frontend/src/stores/frogStore.ts`
8. `frontend/src/stores/travelStore.ts`
9. `frontend/src/stores/friendDataStore.ts`

### 页面迁移顺序

1. `MyFrog` 只负责入口判断
2. `EggClaimPage` 负责无蛙时入口
3. `FrogDetail` 收敛成主详情页
4. `TravelResultPage` 改为跳 `MemoryPalacePage`
5. `Friends` 保留社交入口，但接新仪式

### 接口契约

依赖：

1. `GET /api/v1/me`
2. `POST /api/v1/frogs/claim-egg`
3. `GET /api/v1/frogs/:frogId/life`
4. `POST /api/v1/travels`
5. `GET /api/v1/memory-palaces/:id`

### 表结构

无。

### 事件

消费：

1. `EggClaimed`
2. `Hatched`
3. `TravelCompleted`
4. `MemoryPalaceCreated`
5. `BlessingCompleted`

### 完成定义

1. Web 端体验主线统一
2. 页面命名和用户心智一致
3. 结果页能自然过渡到记忆空间

---

## V1-I12 Desktop 主线清洗与快捷照顾/通知切换

### 主负责人

`Desktop Owner`

### 协作人

1. `BE Owner`
2. `AI Owner`

### 目标

把 `desktop-pet/` 从原型集合清洗成陪伴层。

### 创建文件

1. `desktop-pet/src/renderer/features/pet-shell/useEggLifecycle.ts`
2. `desktop-pet/src/renderer/features/life-actions/useLifeState.ts`
3. `desktop-pet/src/renderer/features/travel/useTravelSync.ts`
4. `desktop-pet/src/renderer/features/notifications/useNotificationFeed.ts`

### 修改文件

1. `desktop-pet/src/renderer/App.tsx`
2. `desktop-pet/src/renderer/services/api.ts`
3. `desktop-pet/src/renderer/services/storage.ts`
4. `desktop-pet/src/renderer/hooks/usePetEgg.ts`
5. `desktop-pet/src/renderer/hooks/useEggHatching.ts`
6. `desktop-pet/src/renderer/hooks/useTadpoleState.ts`
7. `desktop-pet/src/renderer/hooks/useLifeCycle.ts`
8. `desktop-pet/src/renderer/hooks/useNewLifecycle.ts`
9. `desktop-pet/src/renderer/hooks/useChainMonitor.ts`
10. `desktop-pet/src/renderer/hooks/useChainMonitorEnhanced.ts`
11. `desktop-pet/src/renderer/hooks/useChainMonitorIntegration.ts`
12. `desktop-pet/src/renderer/hooks/useQuietMode.ts`
13. `desktop-pet/src/renderer/hooks/useQuietModeIntegration.ts`

### 接口契约

依赖：

1. `GET /api/v1/frogs/:frogId/life`
2. `POST /api/v1/frogs/:frogId/care/feed`
3. `GET /api/v1/travels/:travelId`
4. WebSocket:
   - `travel:started`
   - `travel:completed`
   - `frog:statusChanged`
   - `ritual:blessingCompleted`

### 表结构

无。

### 事件

消费：

1. `PetStateUpdated`
2. `TravelCompleted`
3. `MemoryPalaceCreated`
4. `BlessingCompleted`

### 迁移顺序

1. 先写新 feature hooks
2. `App.tsx` 切到新 hooks
3. 旧 hooks 标记 deprecated
4. 稳定后删除不再使用的 hook 分叉

### 完成定义

1. 桌面端只保留陪伴层能力
2. 所有写操作走新 `/api/v1/*`
3. 不再并行存在多套 egg/lifecycle/travel hook

---

## V1-I13 Social Rituals + Dormancy Beta

### 主负责人

`BE Owner`

### 协作人

1. `FE Owner`
2. `Desktop Owner`
3. `AI Owner`

### 目标

把好友系统升级到真正有协作价值的仪式层。

### 创建文件

1. `backend/src/modules/social/ritual.service.ts`
2. `backend/src/modules/social/relationship-event.service.ts`
3. `frontend/src/features/social/components/BlessingPanel.tsx`
4. `frontend/src/features/social/components/RescuePanel.tsx`

### 修改文件

1. `backend/src/api/routes/v1/social.routes.ts`
2. `backend/src/modules/life/dormancy.service.ts`
3. `backend/src/services/notification.service.ts`
4. `frontend/src/pages/Friends.tsx`
5. `desktop-pet/src/renderer/components/HibernationStatus.tsx`
6. `desktop-pet/src/renderer/hooks/useHibernation.ts`

### 接口契约

#### `POST /api/v1/rituals`

Request:

```json
{
  "type": "blessing",
  "targetFrogId": 1,
  "initiatorFrogId": 9
}
```

#### `POST /api/v1/frogs/:frogId/hibernation/bless`

Request:

```json
{
  "blesserFrogId": 9,
  "verificationId": "uuid"
}
```

#### `POST /api/v1/travels/:travelId/rescue`

Request:

```json
{
  "rescuerFrogId": 9,
  "verificationId": "uuid"
}
```

### 表结构

读写：

1. `rituals`
2. `relationship_events`
3. `human_verifications`

### 事件

1. `PetEnteredDormancy`
2. `BlessingStarted`
3. `BlessingCompleted`
4. `RescueStarted`
5. `RescueCompleted`
6. `RelationshipMilestoneRecorded`

### 迁移顺序

1. 先建立 ritual 数据模型
2. 祈福先跑通
3. 再接 rescue
4. 最后把前端 Friends 和 Desktop 告警接入

### 完成定义

1. 冬眠 Beta 可被好友祈福唤醒
2. 祈福和救援会沉淀关系事件
3. AI 可读取这些事件做回应

---

## V1-I14 Admin 观测面与发布前 cutover

### 主负责人

`Admin Owner`

### 协作人

1. `BE Owner`
2. `QA Owner`
3. `Tech Lead`

### 目标

让管理后台具备 Version 1 必需的观测和修复能力，并完成旧接口退役。

### 创建文件

1. `admin/src/pages/Verifications/index.tsx`
2. `admin/src/pages/Rituals/index.tsx`
3. `admin/src/pages/MemoryPalaces/index.tsx`

### 修改文件

1. `admin/src/App.tsx`
2. `admin/src/services/api.ts`
3. `admin/src/pages/Dashboard/index.tsx`
4. `admin/src/pages/Frogs/index.tsx`
5. `admin/src/pages/Travels/index.tsx`
6. `backend/src/api/routes/admin.routes.ts`

### 接口契约

#### `GET /api/admin/verifications`

#### `GET /api/admin/rituals`

#### `GET /api/admin/memory-palaces`

#### `POST /api/admin/frogs/:tokenId/recalculate-life`

#### `POST /api/admin/travels/:id/rebuild-memory`

### 表结构

读取：

1. `human_verifications`
2. `rituals`
3. `memory_palaces`
4. `domain_events`
5. `pet_states`

### 事件

无新增。

### 迁移顺序

1. 后台只读面先上
2. 再上修复动作
3. QA 完成冒烟矩阵
4. 前端和桌面端全部切 `/api/v1/*`
5. 标记旧路由 deprecated
6. RC 结束后删除旧读取路径

### 完成定义

1. 后台能看验证、冬眠、记忆空间和关键事件
2. 主链路有 repair 操作
3. cutover checklist 完整

---

## 五、旧接口与旧代码退役顺序

### 5.1 第一步：只读退役

先退役旧读路径：

1. `GET /api/nurture/:frogId/status`
2. `GET /api/frogs/:tokenId/status`
3. `GET /api/travels/p0/:travelId`
4. `GET /api/travels/journal/:travelId`

统一切到：

1. `GET /api/v1/frogs/:frogId/life`
2. `GET /api/v1/travels/:travelId`
3. `GET /api/v1/memory-palaces/:id`

### 5.2 第二步：写路径退役

再退役旧写路径：

1. `interaction.routes.ts`
2. `nurture.routes.ts`
3. `hibernation.routes.ts`
4. `cross-chain.routes.ts`
5. `group-travel.routes.ts`

### 5.3 第三步：代码归档

最后归档：

1. 旧前端 `services/*` 兼容实现
2. 桌面端重复 hook
3. 不再被引用的旧 helper

---

## 六、开工建议顺序

如果你要真正开始推进，我建议按下面顺序拉 issue：

1. `V1-I01`
2. `V1-I02`
3. `V1-I03`
4. `V1-I04`
5. `V1-I05`
6. `V1-I06`
7. `V1-I07`
8. `V1-I10`
9. `V1-I11`
10. `V1-I08`
11. `V1-I09`
12. `V1-I12`
13. `V1-I13`
14. `V1-I14`

这是故意把顺序排成：

**先地基、再身份、再状态、再旅行、再前端切流、最后补桌面和社交。**

不按这个顺序做，Version 1 很容易陷入“所有线都在动，但没有一条主线完成”的状态。
