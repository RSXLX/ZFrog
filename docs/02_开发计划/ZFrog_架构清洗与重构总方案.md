---
status: 建议执行
version: 1.0
last_updated: 2026-03-20
reviewer: Codex
---

# ZFrog 架构清洗与重构总方案

## 一、文档目标

这份文档只回答两个问题：

1. 现有项目架构应该怎么清洗
2. 整个项目需要做什么级别的重构，才能支撑 `AI × Web3 × 宠物蛋 × World ID`

它不是版本任务清单，版本任务清单见：

1. [ZFrog_V1_任务清单.md](/Users/sxlx/.gemini/antigravity/ZFrog/docs/02_开发计划/ZFrog_V1_任务清单.md)
2. [ZFrog_V2_任务清单.md](/Users/sxlx/.gemini/antigravity/ZFrog/docs/02_开发计划/ZFrog_V2_任务清单.md)
3. [ZFrog_V3_任务清单.md](/Users/sxlx/.gemini/antigravity/ZFrog/docs/02_开发计划/ZFrog_V3_任务清单.md)

---

## 二、现有项目的真实架构问题

### 2.1 仓库级问题

当前仓库不是“模块丰富”，而是“历史分叉堆积”。

| 区域 | 现状 | 问题 |
|------|------|------|
| `frontend/` | 主 Web 线 | 请求层和页面编排分裂 |
| `backend/` | 主后端线 | 路由膨胀、领域耦合、入口过重 |
| `admin/` | 管理后台 | 相对清晰，但能力边界仍依赖巨石后端 |
| `desktop-pet/` | Electron 桌面候选主线 | 有大量实验性 hook 和重复逻辑 |
| `desktop_pet/` | Python 桌宠遗留原型 | 应冻结，不应再扩 |
| `frontend/src-tauri/` | Tauri 分叉 | 应冻结，不进入 Version 1 |
| `microservices/` | AI/API gateway/badge/wallet observer 草稿 | 不完整，不适合上主路径 |
| `src/renderer/` | 根目录旧 renderer 原型 | 与 `desktop-pet/` 职责重叠，应归档 |

### 2.2 后端级问题

后端当前有典型的“单体可跑，但领域未收敛”特征。

最明显的信号：

1. 路由总计约 `9076` 行
2. `travel.routes.ts` 约 `1492` 行
3. `nurture.routes.ts` 约 `899` 行
4. `homestead.routes.ts` 约 `672` 行
5. `frog.routes.ts` 约 `602` 行
6. `garden.routes.ts` 约 `550` 行

这说明当前问题不是“没有模块”，而是：

1. 路由承担了太多编排逻辑
2. 同一领域被多个路由文件切开
3. 领域边界和 URL 边界没有一致

### 2.3 数据模型级问题

当前 Prisma 模型已经出现明显的“God Table”倾向。

#### `Frog` 模型问题

当前 `Frog` 模型同时承载：

1. 资产身份
2. 旅行统计
3. 生命状态
4. 养成状态
5. 进化状态
6. 外观状态
7. 冬眠状态
8. 家族状态
9. 繁殖状态

这是 Version 1 可以继续承受，但 Version 2 起必须拆。

#### `Travel` 模型问题

当前 `Travel` 模型同时承载：

1. 本地旅行
2. 跨链旅行
3. AI 日记
4. 旅行发现
5. 跨链消息
6. 纪念品引用
7. 救援与互动

它已经过胖，但比 `Frog` 更适合通过“外围表拆出”来渐进收敛。

### 2.4 接口级问题

#### 养成接口重复

以下两个路由存在明显重叠：

1. `backend/src/api/routes/interaction.routes.ts`
2. `backend/src/api/routes/nurture.routes.ts`

二者都在处理：

1. status
2. feed
3. play
4. inventory
5. 旅行条件检查

这是必须收敛的重复。

#### 旅行接口重复

以下三个路由存在明显重叠：

1. `travel.routes.ts`
2. `cross-chain.routes.ts`
3. `group-travel.routes.ts`

它们共同覆盖：

1. travel start
2. travel status
3. travel discoveries
4. rescue / group travel
5. cross-chain lifecycle

这导致“一个旅行”在接口层被拆成了多套故事。

#### 家园/花园/留言接口重复

以下区域存在职责交叉：

1. `garden.routes.ts`
2. `homestead.routes.ts`
3. `message.routes.ts`

最终结果是：

1. 访客留言有多个入口
2. 家园装饰、礼物、照片、消息没有统一归属

### 2.5 前端级问题

#### 服务层分裂

当前前端请求层至少包括：

1. `api.ts`
2. `travel.api.ts`
3. `chat.api.ts`
4. `cross-chain.api.ts`
5. `interaction.api.ts`
6. `homestead.api.ts`
7. `home.api.ts`
8. `garden.api.ts`
9. `message.api.ts`

问题不是文件数量，而是：

1. 统一错误模型缺失
2. 统一鉴权模型缺失
3. 统一缓存和重试策略缺失

#### 状态层分裂

当前 store 包括：

1. `frogStore.ts`
2. `travelStore.ts`
3. `friendDataStore.ts`
4. `friendFloatStore.ts`
5. `floatUIStore.ts`
6. `communityStore.ts`

问题在于：

1. UI 状态和领域状态边界不清
2. 社交状态被拆成多个并行 store

### 2.6 桌面端级问题

`desktop-pet/src/renderer/hooks/` 当前是典型实验田。

明显重复或应合并的方向：

1. `useLifeCycle` / `useNewLifecycle`
2. `useChainMonitor` / `useChainMonitorEnhanced` / `useChainMonitorIntegration`
3. `useQuietMode` / `useQuietModeIntegration`
4. `usePetEgg` / `useEggHatching` / `useTadpoleState`

这说明桌面端当前问题不是能力不足，而是：

1. 原型逻辑未收敛
2. 领域边界未明确
3. 正式陪伴层和 demo 混在一起

### 2.7 合约级问题

当前合约有两套线：

1. `contracts/contracts/*.sol`
2. `contracts/contracts/upgradeable/*.sol`

同时存在：

1. 旧式 NFT 资产语义
2. 升级版资产语义
3. 尚未正式落地的 Frog Wallet / milestone event 策略

此外，Hardhat 当前在 Node 25 下不稳定，环境基线必须收回。

---

## 三、重构原则

### 3.1 Version 1 做“收敛式重构”

Version 1 不做仓库大搬迁，而做：

1. 冻结历史分叉
2. 统一协议
3. 收敛路由
4. 收敛数据模型
5. 建立事件骨架

### 3.2 Version 2 做“结构化重构”

Version 2 再做：

1. workspace 化
2. shared packages
3. client SDK
4. 更明确的 domain modules

### 3.3 Version 3 做“平台化重构”

Version 3 才考虑：

1. plugin runtime
2. external APIs
3. creator platform
4. protocol integration layer

---

## 四、仓库级清洗动作

## 4.1 立刻冻结

以下目录应标注为 `legacy/frozen` 叙事：

1. `desktop_pet/`
2. `frontend/src-tauri/`
3. `src/renderer/`
4. `microservices/api-gateway/`
5. `microservices/badge-service/`
6. `microservices/wallet-observer/`

### 处理方式

1. 在 README 或目录内增加 `FROZEN.md`
2. 不再接新需求
3. 不再作为主架构说明材料

## 4.2 保留但降级为实验区

以下区域保留，但不进入 Version 1 关键路径：

1. `microservices/ai-service/`
2. `contracts/contracts/*.sol` 中的 legacy 非升级版

### 处理方式

1. 标记为 `labs/experimental`
2. 主文档不再把它们写成主路径

## 4.3 保留并作为主线

以下区域继续作为主线：

1. `frontend/`
2. `backend/`
3. `admin/`
4. `desktop-pet/`
5. `contracts/contracts/upgradeable/`

---

## 五、目标项目结构

## 5.1 Version 1 目标结构

Version 1 不搬目录，只收敛内容：

```text
frontend/
backend/
admin/
desktop-pet/
contracts/
docs/
```

## 5.2 Version 2 目标结构

Version 2 才升级为：

```text
apps/
  web/
  admin/
  desktop/
  backend/
packages/
  shared/
  client-sdk/
  prompt-kit/
  contract-types/
contracts/
docs/
```

---

## 六、后端重构方案

## 6.1 路由重构目标

### 现状

当前路由主要按历史功能生长，不按领域收敛。

### 目标

Version 1 末期收敛为：

1. `identity.routes.ts`
2. `frog.routes.ts`
3. `life.routes.ts`
4. `travel.routes.ts`
5. `social.routes.ts`
6. `memory.routes.ts`
7. `admin.routes.ts`

### 路由迁移映射

| 现有路由 | 目标归属 | 处理动作 |
|----------|----------|----------|
| `interaction.routes.ts` | `life.routes.ts` | 合并 |
| `nurture.routes.ts` | `life.routes.ts` | 合并 |
| `hibernation.routes.ts` | `life.routes.ts` | 合并 |
| `travel.routes.ts` | `travel.routes.ts` | 保留主文件但拆服务 |
| `cross-chain.routes.ts` | `travel.routes.ts` | 合并 |
| `group-travel.routes.ts` | `travel.routes.ts` | 合并 |
| `friends.routes.ts` | `social.routes.ts` | 合并 |
| `garden.routes.ts` | `social.routes.ts` / `memory.routes.ts` | 拆分 |
| `homestead.routes.ts` | `memory.routes.ts` | 合并 |
| `message.routes.ts` | `social.routes.ts` | 合并 |
| `community.routes.ts` | `social.routes.ts` | 合并 |

## 6.2 服务层重构目标

### 现状

当前 `backend/src/services/` 是扁平 + 子目录混用状态。

### 目标

Version 1 内部收敛为：

1. `services/identity/`
2. `services/life/`
3. `services/soul/`
4. `services/travel/`
5. `services/social/`
6. `services/memory/`
7. `services/web3/`
8. `services/admin/`

### 必须迁移或包裹的现有服务

| 现有服务 | 目标归属 |
|----------|----------|
| `frog-status.service.ts` | `services/life/` |
| `evolution.service.ts` | `services/life/` / `services/soul/` |
| `hibernation.service.ts` | `services/life/` |
| `travel/*` | `services/travel/` |
| `group-travel.service.ts` | `services/travel/` |
| `omni-travel.service.ts` | `services/travel/` |
| `friend/*`, `intimacy.service.ts`, `gift.service.ts`, `family.service.ts`, `community.service.ts` | `services/social/` |
| `notification.service.ts` | `services/social/` or `services/notification/` |
| `ai.service.ts`, `services/ai/*`, `prompt-builder.service.ts` | `services/soul/` |

## 6.3 数据模型重构目标

### 现状

`Frog` 过胖，`Travel` 次胖。

### Version 1 做法

不立刻删旧表，但开始把新增能力从 `Frog` 主表拆出去。

### Version 1 新表建议

#### `human_verifications`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `wallet_address` | String | 钱包地址 |
| `provider` | String | `world` 等 |
| `action_type` | String | `egg_claim`, `blessing`, `family_found` |
| `nullifier_hash` | String | 唯一性证明标识 |
| `proof_ref` | String? | proof 存档引用 |
| `verified_at` | DateTime | 校验时间 |
| `expires_at` | DateTime? | 过期时间 |
| `metadata` | Json | 扩展字段 |

#### `egg_profiles`

| 字段 | 类型 | 说明 |
|------|------|------|
| `frog_id` | Int | 对应 frog |
| `claim_source` | String | claim 来源 |
| `rarity_seed` | String | 稀有度种子 |
| `hatch_progress` | Int | 孵化进度 |
| `hatch_status` | String | `claimable`, `incubating`, `hatched` |
| `hatched_at` | DateTime? | 孵化时间 |
| `imprint_version` | Int | 灵魂印记版本 |

#### `pet_states`

| 字段 | 类型 | 说明 |
|------|------|------|
| `frog_id` | Int | 对应 frog |
| `hunger` | Int | 饱食度 |
| `happiness` | Int | 幸福度 |
| `cleanliness` | Int | 清洁度 |
| `health` | Int | 健康度 |
| `energy` | Int | 活力值 |
| `mood` | String | 情绪态 |
| `is_sick` | Boolean | 是否生病 |
| `is_resting` | Boolean | 是否休息中 |
| `needs_clean` | Boolean | 是否需要清洁 |
| `last_calculated_at` | DateTime | 计算基准时间 |
| `version` | Int | 乐观锁版本 |

#### `soul_profiles`

| 字段 | 类型 | 说明 |
|------|------|------|
| `frog_id` | Int | 对应 frog |
| `persona_version` | Int | 人格版本 |
| `tone` | String | 语气 |
| `traits_json` | Json | 人格特征 |
| `preferences_json` | Json | 偏好 |
| `relationship_summary` | Json | 关系摘要 |
| `memory_summary` | Json | 记忆摘要 |
| `last_imprint_at` | DateTime | 最近印记时间 |

#### `relationship_events`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `actor_frog_id` | Int | 发起方 |
| `target_frog_id` | Int | 目标方 |
| `event_type` | String | `feed`, `visit`, `bless`, `rescue`, `co_travel` |
| `source_id` | String? | 来源业务 ID |
| `intensity` | Int | 强度分值 |
| `metadata` | Json | 扩展信息 |
| `created_at` | DateTime | 时间 |

#### `rituals`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `type` | String | `blessing`, `rescue`, `family_founding` |
| `target_frog_id` | Int | 目标 frog |
| `initiator_frog_id` | Int | 发起 frog |
| `status` | String | `pending`, `active`, `completed`, `expired` |
| `required_participants` | Int | 所需参与人数 |
| `current_participants` | Int | 当前人数 |
| `verification_required` | Boolean | 是否需真人验证 |
| `reward_snapshot` | Json | 奖励快照 |
| `resolved_at` | DateTime? | 完成时间 |

#### `memory_palaces`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `frog_id` | Int | 所属 frog |
| `source_travel_id` | Int? | 来源旅行 |
| `title` | String | 标题 |
| `summary` | String | 摘要 |
| `content_uri` | String | 内容存储引用 |
| `access_policy` | String | 访问策略 |
| `onchain_ref` | String? | 链上引用 |
| `created_at` | DateTime | 创建时间 |

#### `onchain_milestones`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `frog_id` | Int | 对应 frog |
| `milestone_type` | String | `egg_claimed`, `hatched`, `evolved`, `souvenir_minted` |
| `chain_id` | Int | 链 ID |
| `tx_hash` | String | 交易哈希 |
| `block_number` | BigInt? | 区块号 |
| `status` | String | `pending`, `confirmed`, `failed` |
| `metadata` | Json | 附加信息 |
| `created_at` | DateTime | 创建时间 |

#### `domain_events`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `aggregate_type` | String | 聚合类型 |
| `aggregate_id` | String | 聚合 ID |
| `event_type` | String | 事件类型 |
| `payload` | Json | 事件载荷 |
| `status` | String | `pending`, `processed`, `failed` |
| `created_at` | DateTime | 创建时间 |
| `processed_at` | DateTime? | 处理时间 |

### Version 2 数据拆表

Version 2 才做更深的拆表：

1. 从 `Frog` 中彻底拆出 `life_state`
2. 从 `Frog` 中拆出 `evolution_profile`
3. 从 `Frog` 中拆出 `hibernation_profile`
4. 从 `Travel` 中拆出 `cross_chain_journey`
5. 从 `Travel` 中拆出 `travel_result_snapshot`

---

## 七、前端重构方案

## 7.1 页面结构重构

### 现状

当前页面更像功能堆栈，而不是主链路编排。

### 目标

Version 1 页面主链路统一为：

1. `EggClaimPage`
2. `EggIntroPage`
3. `MyFrogPage`
4. `TravelStartPage`
5. `TravelResultPage`
6. `FriendsPage`
7. `MemoryPalacePage`

## 7.2 服务层重构

### 目标

所有前端请求统一经由：

1. `frontend/src/lib/api/client.ts`
2. `frontend/src/lib/api/errors.ts`
3. `frontend/src/lib/auth/session.ts`

### 处理动作

| 现有文件 | 动作 |
|----------|------|
| `services/api.ts` | 收敛为基础 client |
| `travel.api.ts` | 迁到 `features/travel/api.ts` |
| `interaction.api.ts` | 迁到 `features/life/api.ts` |
| `hibernation.api.ts` | 迁到 `features/life/api.ts` |
| `home.api.ts` / `homestead.api.ts` / `garden.api.ts` | 合并到 `features/memory-palace/api.ts` |
| `chat.api.ts` | 迁到 `features/soul/api.ts` |
| `message.api.ts` | 迁到 `features/social/api.ts` |

## 7.3 状态层重构

Version 1 统一为 5 类 store：

1. `sessionStore`
2. `frogStore`
3. `travelStore`
4. `socialStore`
5. `uiStore`

以下 store 应收敛：

1. `friendDataStore.ts`
2. `friendFloatStore.ts`
3. `floatUIStore.ts`
4. `communityStore.ts`

---

## 八、桌面端重构方案

## 8.1 目录职责清洗

### 主进程

主进程只保留：

1. window management
2. tray
3. notification bridge
4. updater
5. secure preload

### 渲染进程

渲染进程只保留：

1. pet shell
2. quick actions
3. chat bubble
4. status panel
5. recap / reminder

## 8.2 Hook 清洗规则

Version 1 规则：

1. 每个领域只允许一个正式 hook
2. 原型 hook 一律迁入 `experimental/` 或冻结

### 必须收敛的 hook 组

| 当前组 | 目标 |
|--------|------|
| `usePetEgg` + `useEggHatching` + `useTadpoleState` | `useEggLifecycle` |
| `useLifeCycle` + `useNewLifecycle` | `useLifeState` |
| `useChainMonitor*` | `useTravelSync` |
| `useQuietMode*` | `useQuietMode` |

---

## 九、合约重构方案

## 9.1 主从关系清洗

### Version 1

1. legacy 合约只保留兼容和参考作用
2. upgradeable 合约成为主线
3. 所有新事件、新里程碑只加到 upgradeable 路径

## 9.2 合约边界清洗

Version 1 合约只做：

1. Frog identity
2. travel lifecycle
3. souvenir mint
4. Frog Wallet integration hook

Version 1 不做：

1. World ID on-chain 主验证路径
2. 自研 relationship proof contract
3. 复杂治理 contract

---

## 十、AI 架构重构方案

## 10.1 主路径清洗

Version 1 AI 主路径只保留：

1. `backend/src/services/ai/`

以下目录不进入关键路径：

1. `microservices/ai-service/`

## 10.2 模块清洗

AI 代码应收敛为：

1. `providers/`
2. `prompts/`
3. `memory/`
4. `persona/`
5. `journal/`
6. `safety/`
7. `facade.ts`

当前重复或分散点：

1. `ai.service.ts`
2. `services/ai/*`
3. `prompt-builder.service.ts`

必须收为一条 facade 调用路径。

---

## 十一、目标接口面

Version 1 目标接口应收敛为以下命名空间。

## 11.1 Identity

1. `POST /api/v1/auth/wallet`
2. `POST /api/v1/verify/world`
3. `GET /api/v1/me`

## 11.2 Frog / Life

1. `GET /api/v1/frogs/:frogId`
2. `GET /api/v1/frogs/:frogId/life`
3. `POST /api/v1/frogs/:frogId/care/feed`
4. `POST /api/v1/frogs/:frogId/care/clean`
5. `POST /api/v1/frogs/:frogId/care/play`
6. `POST /api/v1/frogs/:frogId/care/heal`
7. `POST /api/v1/frogs/:frogId/rest/start`
8. `POST /api/v1/frogs/:frogId/rest/end`
9. `POST /api/v1/frogs/:frogId/hatch`
10. `POST /api/v1/frogs/:frogId/evolve`
11. `POST /api/v1/frogs/:frogId/hibernation/revive`
12. `POST /api/v1/frogs/:frogId/hibernation/bless`

## 11.3 Travel

1. `POST /api/v1/travels`
2. `GET /api/v1/travels/:travelId`
3. `GET /api/v1/frogs/:frogId/travels`
4. `POST /api/v1/travels/:travelId/start`
5. `POST /api/v1/travels/:travelId/complete`
6. `GET /api/v1/travels/:travelId/discoveries`
7. `POST /api/v1/travels/:travelId/feed`
8. `POST /api/v1/travels/:travelId/rescue`
9. `GET /api/v1/travels/:travelId/share`

## 11.4 Social

1. `POST /api/v1/friends/requests`
2. `PATCH /api/v1/friends/requests/:id`
3. `GET /api/v1/friends`
4. `POST /api/v1/social/visits`
5. `POST /api/v1/social/messages`
6. `POST /api/v1/rituals`
7. `GET /api/v1/rituals/:id`

## 11.5 Memory

1. `GET /api/v1/memory-palaces/:id`
2. `POST /api/v1/memory-palaces/:id/visit`
3. `POST /api/v1/memory-palaces/:id/comment`

---

## 十二、统一事件契约

以下事件作为前后端、桌面端、合约、AI 的统一骨架：

1. `EggClaimed`
2. `SoulImprinted`
3. `PetStateUpdated`
4. `PetNeedsCare`
5. `PetEnteredDormancy`
6. `BlessingStarted`
7. `BlessingCompleted`
8. `TravelStarted`
9. `TravelArrived`
10. `TravelCompleted`
11. `SouvenirMinted`
12. `EvolutionUnlocked`
13. `EvolutionCompleted`
14. `RelationshipMilestoneRecorded`
15. `MemoryPalaceCreated`

---

## 十三、重构顺序

### Step 1

冻结分叉：

1. `desktop_pet/`
2. `frontend/src-tauri/`
3. `src/renderer/`
4. 非关键 microservices

### Step 2

统一协议：

1. API response
2. error model
3. event model
4. config model

### Step 3

收敛后端：

1. life
2. travel
3. social
4. memory
5. soul

### Step 4

收敛前端与桌面端：

1. feature 目录
2. store 合并
3. hook 合并

### Step 5

收敛合约与 AI：

1. upgradeable 主线
2. backend AI facade 主线

---

## 十四、最终结论

这个项目需要的不是“重写一遍”，而是 **有边界的清洗式重构**。

真正必须做的清洗动作只有 6 件：

1. 冻结历史分叉目录
2. 统一前端和桌面端请求协议
3. 合并重复的养成与旅行路由
4. 把 `Frog` God Table 的新增能力逐步外移
5. 确立 upgradeable 合约和 backend AI 的唯一主线
6. 建立统一事件骨架

只要这 6 件事做完，ZFrog 才有资格进入 Version 化开发。
