---
status: 建议执行
version: 2.0
last_updated: 2026-03-23
reviewer: Codex
---

# ZFrog V3 详尽开发计划

## 一、当前基线（进入 V3 前）

截至 `2026-03-23`，V3 的真实前置条件不是“从零开始平台化”，而是建立在 V2 已完成能力之上：

1. `travel.command/query`、统一旅行状态机、`/api/v1/*` 主链路已收敛。
2. `/api/v2/*` 已形成 family / community / relationship attestation / relationship memory / wallet / chat 的稳定骨架。
3. `packages/shared` 与 `packages/client-sdk` 已可被 Web / Desktop / Mobile Lite 复用。
4. `memory_palaces`、`memory_summaries`、`onchain_milestones`、`domain_events`、`relationship_attestations` 已具备升级为 V3 平台能力的基础。
5. `apps/*` 目前仍是 V2 软迁移映射，真实源码主线仍在：
   1. `frontend/`
   2. `backend/`
   3. `admin/`
   4. `desktop-pet/`
   5. `contracts/`
   6. `packages/*`
   7. `apps/mobile-lite/`

### 1.1 V3 的目录策略

V3 必须承认当前代码现实：

1. 在 `V2-51` 真正源码搬迁完成之前，V3 实现目录以 `backend/`、`frontend/`、`admin/`、`desktop-pet/`、`contracts/` 为准。
2. `apps/backend`、`apps/web`、`apps/admin` 当前只能作为逻辑映射与目标目录名，不能直接当成现有实现事实来写计划。
3. V3 新文档中若提到 `apps/*`，必须同时给出当前真实实现目录。

---

## 二、对现有 V3 旧计划的评估

### 2.1 旧计划的方向是对的

旧版 V3 任务清单抓对了 5 个方向：

1. `Universal Journey`
2. `AI Frog Council`
3. `Memory Palace 共建`
4. `Creator / Partner`
5. `On-chain relationship graph`

这 5 条线确实是 ZFrog 从“关系成立版”升级到“平台化版”必须走的方向。

### 2.2 旧计划的主要问题

旧计划还不能直接执行，核心问题有 5 个：

1. 目录不贴近当前仓库现实。
   直接写 `apps/backend/src/*`、`apps/web/src/*`，但当前真实主线仍在 `backend/`、`frontend/`。
2. 任务粒度过粗。
   只有模块级目标，没有周节奏、依赖、测试、回滚与 gating。
3. 缺少玩家可感知的玩法闭环。
   看起来像平台部件清单，不像一个会让用户愿意回来的版本。
4. 开放顺序不安全。
   插件、伙伴、创作者开放被提得太早，但权限模型、审核、kill switch、租户隔离没有先落。
5. 缺少“从 V2 往上长”的迁移路径。
   没有明确说明哪些能力复用 `travel/social/chat/memory/wallet`，哪些是新增层。

### 2.3 修订结论

Version 3 不应被定义成“把所有能力都开放出去”，而应被定义成：

**把 V2 已成立的旅行、关系、AI、记忆能力，升级成四条玩家可感知的高阶玩法，再用两条平台护栏把开放性关住。**

这四条玩家可感知玩法是：

1. `剧情远征`
2. `青蛙议会`
3. `记忆世界共建`
4. `创作者赛季世界`

这两条平台护栏是：

1. `权限与审核`
2. `关系图谱与发布门禁`

---

## 三、Version 3 目标与成功指标

## 3.1 目标陈述

V3 的目标是：

**把 ZFrog 从“我和我的蛙”升级成“多个真实人类、多个 AI 青蛙、多个创作者共同参与的活体宠物世界”。**

## 3.2 关键结果（KR）

1. 多步剧情旅行完成率达到可持续 Beta 水平。
2. 至少一种家族/社区级 AI 议会任务具备稳定周活。
3. 重要旅行结果可沉淀为可访问、可留言、可共建的记忆世界。
4. 创作者可在受控权限下发布世界模板或玩法素材包。
5. 高价值共同经历可形成可查询、可锚定的 relationship graph。
6. 第三方接入不会绕过统一事件骨架、权限模型和运营开关。

## 3.3 建议跟踪指标

1. `Journey Arc Completion Rate`
   发起剧情远征后完成至少 2 个章节的比例。
2. `Council Suggestion Acceptance Rate`
   AI 议会建议被接受并进入执行的比例。
3. `Collaborative Memory Contribution Rate`
   一个记忆世界被至少 2 个不同地址贡献内容的比例。
4. `Seasonal World Replay Rate`
   创作者/联名世界在首周被重复访问的比例。
5. `Relationship Edge Anchor Success Rate`
   高价值 relationship edge 从库内成立到链上锚定成功的比例。
6. `V1/V2 Core Loop Non-regression`
   `Claim -> Care -> Travel -> Memory -> Bless` 不得因 V3 引入而退化。

---

## 四、V3 的玩法支柱与玩家循环

## 4.1 玩法支柱一：剧情远征 `Story-driven Universal Journey`

从 V2 的“发起旅行 -> 返回结果”，升级到：

1. 一次远征包含多个 `chapter / step / choice`。
2. 每一步会消耗不同资格：
   1. 青蛙状态
   2. Frog Wallet 物品
   3. family/community 协作
   4. 关系证明
3. 远征结果不只产出奖励，还会改变：
   1. 关系热度
   2. AI 议会建议
   3. Memory Palace 世界布景
   4. 可解锁的 creator world

玩家感知应该是：

**这不再是“切一条链看看奖励”，而是“带着我的蛙进入一个有章节、有风险、有共同见证的故事”。**

## 4.2 玩法支柱二：青蛙议会 `AI Frog Council`

从 V2 的 relationship-aware chat，升级到：

1. AI 不只是回答问题，而是定期提出群体目标。
2. 建议必须绑定可解释上下文：
   1. 当前 family 状态
   2. 最近 relationship memory
   3. journey/world 状态
   4. 风险与收益说明
3. 议会建议必须可接受、拒绝、延后、转交。
4. AI 只能给建议和起草，不得越权直接做不可撤销动作。

玩家感知应该是：

**不是一只蛙陪你聊天，而是一群蛙围绕共同生活和共同目标展开协作。**

## 4.3 玩法支柱三：记忆世界共建 `Collaborative Memory Palace`

从 V2 的 `Memory Palace Lite`，升级到：

1. 一次重要远征会生成一个“记忆世界”草稿。
2. 家人、朋友、社区成员可以：
   1. 留下足迹
   2. 放入纪念物
   3. 写见证留言
   4. 挂出照片/片段
3. 记忆世界可模板化、可展览、可被 creator pack 改造皮肤与叙事。
4. 高价值访问和贡献行为会反馈到 relationship graph。

玩家感知应该是：

**旅行不再只留下一页结果，而是变成大家都能回来逛、回来补故事的世界。**

## 4.4 玩法支柱四：创作者赛季世界 `Creator / Partner Seasonal Worlds`

创作者与伙伴能力不是“开放上传素材”这么简单，而是：

1. 创作者发布受控世界包：
   1. 视觉素材
   2. 世界主题
   3. chapter 模板
   4. 纪念品与 relic 配置
2. 伙伴发布受控 campaign：
   1. 参与条件
   2. 奖励规则
   3. 内容审核状态
   4. feature flag
3. 世界包必须经过审核、灰度、可回滚。

玩家感知应该是：

**ZFrog 的世界会换季，会有联名，会有新的旅程和新的公共记忆，而不是永远只有一套玩法。**

## 4.5 三层循环

### 每日循环

```text
看状态 -> 做一次照顾/回应提醒 -> 看 AI 简报 -> 为本日 journey/council 做一个轻决策
```

### 每周循环

```text
家族议会提出目标 -> 组队远征或协作救援 -> 生成共同结果 -> 回流到记忆世界与关系图谱
```

### 赛季循环

```text
创作者/伙伴发布新世界 -> 用户进入赛季远征 -> 解锁新 relic/见证 -> 形成新的记忆展厅与 graph edge
```

## 4.6 示例玩法包

为了避免 V3 继续抽象化，规划阶段就要明确至少 4 个可落地玩法包：

1. `雾海遗迹`
   1. 三章节远征
   2. 需要不同链足迹和 relic
   3. 最终解锁稀有记忆房间背景
2. `流星救援夜`
   1. community 限时协作事件
   2. 需要多只青蛙完成 witness / rescue / bless
   3. 结果进入 relationship graph
3. `图腾修复计划`
   1. family 周目标
   2. 议会提出材料与路线建议
   3. 完成后升级 family totem 与公共空间
4. `联名秘境赛季`
   1. creator 或 partner 提供主题世界
   2. 用户进入主题世界收集限定 relic
   3. 纪念品与访问记录可进入 Memory Palace

---

## 五、范围边界（做与不做）

## 5.1 V3 明确做

1. 多步剧情旅程和 world graph。
2. AI Frog Council 群体目标与解释链路。
3. Memory Palace 共建、访问、见证、展览。
4. 创作者素材包与伙伴活动包的受控开放。
5. relationship graph 的库内边图与部分链上锚定。
6. 多租户权限、审核、发布门禁、kill switch。

## 5.2 V3 明确不做

1. 让插件直接写核心 life / travel / wallet 真相源。
2. 让 AI 自动执行不可撤销链上动作。
3. 把创作者经济、DAO、代币系统一口气全做完。
4. 在 V3 Beta 前就允许完全自由上传脚本型玩法。
5. 为了平台化而重走微服务大拆分路线。
6. 把高频生命状态重新推回链上。

---

## 六、架构目标与治理约束

| 层级 | V2 可复用资产 | V3 新增目标 | 强制约束 |
|------|---------------|-------------|----------|
| Repo / Runtime | `packages/shared`、`packages/client-sdk`、workspace 启动 | V3 integration registry、runtime policy、plugin sandbox | `V2-51` 前不做主源码大搬迁 |
| Journey | `travel.command/query`、`travel-state-machine`、`FrogFootprint` | `journeys + chapters + world graph + party orchestration` | 仍由后端领域服务写核心状态 |
| AI | `v2-chat`、`relationship-memory.query`、`memory-summary` | council planner、weekly brief、goal scoring | AI 只建议、不越权 |
| Memory | `memory-palace.service/query`、`onchain_milestones` | 协作记忆世界、模板、展览、访问见证 | 访问控制与内容审核必须先落地 |
| Creator / Partner | `admin`、`domain_events`、feature flag 经验 | creator packs、partner campaigns、发布审核 | 任何外部内容都必须可灰度、可回滚 |
| Graph / Governance | `relationship_attestations`、`domain_events`、Admin 观测页 | relationship edge ledger、anchor adapter、release gates | graph 查询不等于自动上链，需分层 |

### 6.1 V3 的硬约束

1. 所有 V3 外部接入都必须经过 `integration registry`。
2. 所有 world / creator / partner 内容都必须具备：
   1. 审核状态
   2. 发布状态
   3. feature flag
   4. 回滚入口
3. 所有 AI 建议都必须附带 trace：
   1. 数据来源
   2. 规则版本
   3. prompt kit 版本
   4. 建议理由
4. relationship graph 必须先以库内可追溯为真相，再选择性锚定链上。

---

## 七、里程碑与周期（12 周 Beta 计划）

| 阶段 | 周期 | 目标 | 强制出口 |
|------|------|------|----------|
| Phase 0 | Week 1-2 | V3 runtime、权限、schema、kill switch | V3 新能力有统一 runtime policy，可全局关闭 |
| Phase 1 | Week 3-4 | Journey Graph Alpha | 多步剧情远征可创建、推进、结算 |
| Phase 2 | Week 5-6 | AI Council Alpha | family/community 级建议可解释、可响应 |
| Phase 3 | Week 7-8 | Collaborative Memory Alpha | 记忆世界可生成、共建、留言、访问 |
| Phase 4 | Week 9-10 | Creator / Partner Beta | creator pack 与 partner campaign 可受控发布 |
| RC | Week 11-12 | Relationship Graph + 发布门禁 | graph 查询、anchor、回归矩阵、回滚 runbook 齐备 |

---

## 八、执行级任务清单（V3-00 ~ V3-52）

## 8.1 平台与治理地基

| ID | 负责人 | 当前实现目录 | 关键接口 | 表/合约 | 关键事件 | 玩家结果 | 完成定义 |
|----|--------|--------------|----------|---------|----------|----------|----------|
| `V3-00` | `Tech Lead + QA Owner` | `backend/src/platform/runtime`, `admin/src/pages/V3Ops`, `packages/shared` | `GET /api/v3/runtime/status`, `POST /api/admin/v3/runtime/kill-switch` | `integration_apps`, `runtime_policies` | `IntegrationAppRegistered`, `RuntimePolicyChanged` | 平台能力可开可关，不会污染 V1/V2 主链路 | runtime 状态、kill switch、租户级权限策略可用 |
| `V3-01` | `Tech Lead + BE Owner` | `backend/src/platform/integrations`, `packages/shared` | `POST /api/admin/v3/integrations`, `POST /api/admin/v3/integrations/:id/keys` | `integration_keys`, `integration_permissions` | `IntegrationKeyIssued` | creator / partner / plugin 都走统一注册入口 | integration registry、key 管理、权限枚举冻结 |
| `V3-02` | `Tech Lead + Admin Owner` | `backend/src/platform/plugin-runtime`, `admin/src/pages/Partners` | plugin manifest validate / install APIs | `plugin_manifests`, `plugin_installs` | `PluginInstalled`, `PluginPermissionGranted` | 平台先具备受控扩展能力，再谈开放生态 | 插件只能读受控资源或写受限挂载点 |

## 8.2 Journey & World Graph

| ID | 负责人 | 当前实现目录 | 关键接口 | 表/合约 | 关键事件 | 玩家结果 | 完成定义 |
|----|--------|--------------|----------|---------|----------|----------|----------|
| `V3-10` | `BE Owner + FE Owner` | `backend/src/modules/journey`, `frontend/src/features/journey` | `POST /api/v3/journeys`, `GET /api/v3/journeys/:id` | `journeys`, `journey_steps`, `journey_party_members` | `JourneyCreated`, `JourneyStepStarted`, `JourneyStepCompleted` | 玩家能发起多章节远征 | journey create/advance/settle 主链路可跑通 |
| `V3-11` | `BE Owner + Contract Owner` | `backend/src/modules/world-graph`, `contracts/contracts/FrogFootprint.sol` | `GET /api/v3/worlds/:worldId`, `POST /api/v3/journeys/:id/relics/claim` | `world_arcs`, `world_nodes`, `journey_relics` | `JourneyRelicDiscovered`, `WorldNodeUnlocked` | 旅行世界有地图、节点、 relic 和足迹 | world graph 与 relic 规则可配置、可追踪 |
| `V3-12` | `BE Owner + AI Owner + FE Owner` | `backend/src/modules/journey-events`, `frontend/src/features/journey-events` | `POST /api/v3/world-events/:id/respond` | `journey_world_events`, `journey_incidents` | `JourneyIncidentTriggered`, `JourneyIncidentResolved` | 旅行过程中会出现需要团队决策的事件 | 至少一种协作事件可联调并回流 relationship / memory |

## 8.3 AI Society

| ID | 负责人 | 当前实现目录 | 关键接口 | 表/合约 | 关键事件 | 玩家结果 | 完成定义 |
|----|--------|--------------|----------|---------|----------|----------|----------|
| `V3-20` | `AI Owner + BE Owner` | `backend/src/modules/council` | `POST /api/v3/council/suggestions`, `POST /api/v3/council/suggestions/:id/respond` | `council_runs`, `council_suggestions`, `council_responses` | `CouncilSuggestionGenerated`, `CouncilSuggestionResponded` | family/community 会收到 AI 议会建议 | 建议可解释、可接受、可拒绝、可审计 |
| `V3-21` | `FE Owner + Desktop Owner` | `frontend/src/features/council`, `desktop-pet/src/renderer/features/council` | council UI APIs | 无 | 消费 `CouncilSuggestionGenerated` | 用户能在 Web/桌宠里看到议会建议与执行进度 | council inbox、detail、action drawer 成立 |
| `V3-22` | `AI Owner + Desktop Owner + Mobile Lite Owner` | `backend/src/modules/council-brief`, `desktop-pet/src/renderer/features/notifications`, `apps/mobile-lite/src/features/council` | `GET /api/v3/council/briefs/:frogId` | `council_briefs` | `CouncilBriefGenerated` | 议会结果会转成周报和召回提醒 | brief 可推送到 Web、Desktop、Mobile Lite |

## 8.4 Memory Palace Platform

| ID | 负责人 | 当前实现目录 | 关键接口 | 表/合约 | 关键事件 | 玩家结果 | 完成定义 |
|----|--------|--------------|----------|---------|----------|----------|----------|
| `V3-30` | `FE Owner + BE Owner` | `backend/src/modules/memory-palace-v3`, `frontend/src/features/memory-palace` | `POST /api/v3/memory-palaces`, `POST /api/v3/memory-palaces/:id/contributions` | `memory_palace_templates`, `memory_palace_contributions`, `memory_palace_collaborators` | `MemoryPalaceContributionAdded`, `MemoryPalaceCollaboratorAdded` | 记忆空间支持多人共建 | contribution / collaborator / access policy 主链路跑通 |
| `V3-31` | `FE Owner + Admin Owner` | `frontend/src/features/memory-palace-builder`, `admin/src/pages/MemoryWorlds` | `POST /api/v3/memory-palaces/:id/visits`, `POST /api/admin/v3/memory-palaces/:id/feature` | `memory_palace_visits`, `memory_palace_exhibits` | `MemoryPalaceVisited`, `MemoryPalaceExhibitFeatured` | 用户可以访问、留言、展出记忆空间 | visit / guestbook / exhibit 具备运营入口 |
| `V3-32` | `Tech Lead + Partner Owner` | `backend/src/modules/memory-palace-templates`, `frontend/src/features/memory-palace/themes` | template pack APIs | `memory_world_packs`, `memory_world_pack_versions` | `MemoryWorldPackPublished` | 记忆空间可被 creator/partner 世界包改造 | 模板包受控发布、可灰度、可回滚 |

## 8.5 Creator / Partner Ecosystem

| ID | 负责人 | 当前实现目录 | 关键接口 | 表/合约 | 关键事件 | 玩家结果 | 完成定义 |
|----|--------|--------------|----------|---------|----------|----------|----------|
| `V3-40` | `FE Owner + BE Owner` | `frontend/src/features/creator`, `backend/src/modules/creator` | `POST /api/v3/creator/packs`, `POST /api/v3/creator/assets` | `creator_profiles`, `creator_assets`, `creator_packs` | `CreatorAssetUploaded`, `CreatorPackDrafted` | 创作者可提交玩法素材和世界包草稿 | 资产上传、pack 草稿、preview 渲染成立 |
| `V3-41` | `Partner Owner + Tech Lead` | `backend/src/modules/partners`, `admin/src/pages/Partners` | `POST /api/v3/partners/campaigns`, partner callbacks | `partner_campaigns`, `partner_rewards`, `partner_callbacks` | `PartnerCampaignPublished`, `PartnerCampaignRolledBack` | 伙伴活动可上线但不会突破核心权限 | campaign 发布、暂停、回滚、审计可执行 |
| `V3-42` | `Contract Owner + BE Owner` | `contracts/`, `backend/src/modules/creator-onchain` | creator bind / license hook APIs | `creator_asset_bindings`, `onchain_creator_assets` | `CreatorAssetBound`, `CreatorLicenseAnchored` | 高价值 creator 资产与记忆世界可被链上见证 | 绑定与 license anchor 可追踪、可重放 |

## 8.6 Relationship Graph 与发布治理

| ID | 负责人 | 当前实现目录 | 关键接口 | 表/合约 | 关键事件 | 玩家结果 | 完成定义 |
|----|--------|--------------|----------|---------|----------|----------|----------|
| `V3-50` | `BE Owner + Contract Owner` | `backend/src/modules/relationship-graph`, `contracts/` | `GET /api/v3/relationship-graph/frogs/:frogId` | `relationship_edges`, `relationship_edge_snapshots`, `relationship_edge_anchors` | `RelationshipEdgeRecorded`, `RelationshipEdgeAnchored` | 用户能看到“这只蛙和谁一起旅行、救援、见证过什么” | graph query、edge 聚合、anchor 流成立 |
| `V3-51` | `Admin Owner + BE Owner` | `admin/src/pages/Creators`, `admin/src/pages/Partners`, `admin/src/pages/V3Ops` | partner / creator / world moderation APIs | 读全部 V3 平台表 | `WorldPackRejected`, `CampaignPaused` | 平台有真正的审核与应急能力 | 审核队列、暂停、补偿、审计面齐全 |
| `V3-52` | `QA Owner + Tech Lead` | `.github/workflows`, `scripts/ci`, `docs/02_开发计划` | 无 | 无 | 无 | V3 能安全灰度，不拖垮 V1/V2 | 多租户、多世界、多插件、多链路回归矩阵与 runbook 建立 |

---

## 九、Version 3 退出标准

Version 3 Beta 退出标准必须是“用户真能玩、运营真能控、平台真能关”：

1. 用户可完整跑通：
   `议会建议 -> 多步剧情远征 -> 记忆世界生成 -> 朋友共建 -> relationship edge 形成`
2. 至少一个 creator pack 与一个 partner campaign 可在灰度下上线并回滚。
3. 至少一种 relationship edge 可完成库内成立、链上锚定、前端查询三段闭环。
4. `V1/V2` 主链路在 regression matrix 中无新增 P0/P1 退化。
5. 平台出现异常时，Admin 可以关闭：
   1. 某个 integration app
   2. 某个 creator pack
   3. 某个 partner campaign
   4. 某类 V3 新接口

---

## 十、Version 3 最终定义

Version 3 的本质不是“再加更多模块”，而是让 ZFrog 形成下面这条更强的主叙事：

```text
Care -> Council -> Journey -> Shared Memory -> Relationship Graph -> New Seasonal Worlds
```

如果这条主叙事没有成立，V3 就仍然只是功能扩张。

如果这条主叙事成立，ZFrog 才真正具备“可信 AI 宠物社会”的平台雏形。
