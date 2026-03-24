---
status: 建议执行
version: 1.0
last_updated: 2026-03-20
reviewer: Codex
---

# ZFrog V1 任务清单

## 一、Version 1 目标

Version 1 的唯一目标是：

**做出第一只会被真人领取、会被照顾、会孵化、会旅行、会沉淀记忆、会被朋友唤醒的青蛙。**

Version 1 只围绕 5 个结果展开：

1. `Verified Egg`
2. `Care + Hatch`
3. `Unified Travel`
4. `Frog Wallet + Memory Palace Lite`
5. `Blessing / Dormancy Beta`

---

## 二、负责人角色定义

| 角色 | 负责内容 |
|------|----------|
| `Tech Lead` | 架构收敛、接口冻结、跨线依赖裁决 |
| `FE Owner` | Web 主控制台 |
| `BE Owner` | API、DB、领域状态机 |
| `Desktop Owner` | `desktop-pet/` 主线 |
| `Contract Owner` | upgradeable 合约与链上事件 |
| `AI Owner` | `backend/src/services/ai` 主线 |
| `Admin Owner` | 管理后台与运营能力 |
| `QA Owner` | 回归、验收、冒烟、发布前检查 |

---

## 三、Version 1 退出标准

1. 新用户可完成 `Verify -> Claim Egg -> Care -> Hatch`
2. 已有用户可进入统一 `MyFrog -> Travel -> Result -> Memory Palace Lite`
3. 旅行主状态机只剩一套
4. 冬眠/祈福 Beta 可跑通
5. Frog Wallet 地址可被展示和使用

---

## 四、任务清单

## 4.1 基础收敛任务

| ID | 负责人 | 目录 | 关键接口 | 表结构 | 事件 | 完成定义 |
|----|--------|------|----------|--------|------|----------|
| `V1-00` | Tech Lead | `docs/`, `frontend/`, `backend/`, `desktop-pet/`, `contracts/` | 无 | 无 | 无 | 冻结 `desktop_pet/`、`frontend/src-tauri/`、`src/renderer/`、非关键 microservices，并在文档中移除其主线地位 |
| `V1-01` | Tech Lead + BE Owner | `backend/src/` | 全部 `/api` 返回结构 | 无 | `DomainEventDefined` | 统一 response/error schema，冻结 Version 1 事件名单 |
| `V1-02` | Tech Lead + Contract Owner | `contracts/`, `.nvmrc` 或文档 | 无 | 无 | 无 | Node 20 LTS 成为合约开发和 CI 基线 |

## 4.2 身份与真人验证

| ID | 负责人 | 目录 | 关键接口 | 表结构 | 事件 | 完成定义 |
|----|--------|------|----------|--------|------|----------|
| `V1-10` | BE Owner | `backend/src/modules/identity` 或 `services/identity` | `POST /api/v1/auth/nonce`, `POST /api/v1/auth/wallet`, `GET /api/v1/me` | 新增 `auth_nonces`，必要时补 `wallet_sessions` | `WalletAuthenticated` | 后端提供基于钱包签名的统一登录、会话与当前用户查询 |
| `V1-11` | BE Owner | `backend/src/modules/identity`, `middlewares/` | `POST /api/v1/verify/world` | `human_verifications` 新增 | `HumanVerified` | World ID 校验结果入库，可按 action type 去重 |
| `V1-12` | FE Owner | `frontend/src/features/auth`, `frontend/src/lib/auth` | 对接 `auth/wallet`, `verify/world` | 无 | 消费 `HumanVerified` | 前端完成钱包登录与真人验证引导页 |
| `V1-13` | Admin Owner | `admin/src/pages/Config`, `admin/src/pages/Dashboard` | `GET /api/admin/verifications`, `PUT /api/admin/config` | 读 `human_verifications` | 无 | 后台可查看验证统计与异常记录 |

## 4.3 Egg + Hatch 主链路

| ID | 负责人 | 目录 | 关键接口 | 表结构 | 事件 | 完成定义 |
|----|--------|------|----------|--------|------|----------|
| `V1-20` | Contract Owner | `contracts/contracts/upgradeable/ZetaFrogNFTUpgradeable.sol` | 合约事件 | 无 | `EggClaimed`, `Hatched` | 合约层增加 Egg / Hatch 生命周期事件与 metadata 占位 |
| `V1-21` | BE Owner | `backend/src/modules/life`, `prisma/` | `POST /api/v1/frogs/claim-egg`, `POST /api/v1/frogs/:frogId/hatch` | `egg_profiles` 新增 | `EggClaimed`, `HatchUnlocked`, `Hatched` | 领取蛋和孵化逻辑在后端统一编排 |
| `V1-22` | AI Owner | `backend/src/services/ai/persona`, `memory/` | `POST /api/v1/frogs/:frogId/soul-imprint` | `soul_profiles` 新增 | `SoulImprinted` | 蛋阶段可生成初始人格并持久化 |
| `V1-23` | FE Owner | `frontend/src/features/egg`, `pages/` | 对接 `claim-egg`, `soul-imprint`, `hatch` | 无 | 消费 `EggClaimed`, `SoulImprinted`, `Hatched` | Web 端完成 Egg onboarding 和孵化流 |
| `V1-24` | Desktop Owner | `desktop-pet/src/renderer/features/pet-shell`, `features/chat` | 读 `frog summary`, 写 `soul-imprint` | 无 | 消费 `EggClaimed`, `Hatched` | 桌面端能展示蛋状态、孵化反馈和首轮 AI 反馈 |

## 4.4 Life Engine

| ID | 负责人 | 目录 | 关键接口 | 表结构 | 事件 | 完成定义 |
|----|--------|------|----------|--------|------|----------|
| `V1-30` | BE Owner | `backend/src/modules/life`, `services/life` | `GET /api/v1/frogs/:frogId/life` | `pet_states` 新增 | `PetStateUpdated` | 状态统一读取走单一 life query |
| `V1-31` | BE Owner | `backend/src/modules/life` | `POST /api/v1/frogs/:frogId/care/feed` | 复用 `food_inventory`, 写 `pet_states` | `PetStateUpdated` | 喂食动作统一进 life 模块 |
| `V1-32` | BE Owner | `backend/src/modules/life` | `POST /api/v1/frogs/:frogId/care/clean`, `.../play`, `.../heal`, `.../rest/*` | 写 `pet_states` | `PetStateUpdated`, `PetNeedsCare` | 清洁/玩耍/治疗/休息全部从 `interaction` 与 `nurture` 收拢 |
| `V1-33` | FE Owner | `frontend/src/features/life`, `stores/frogStore.ts` | 对接全部 care APIs | 无 | 消费 `PetStateUpdated`, `PetNeedsCare` | 主详情页可完成全部照顾动作与状态展示 |
| `V1-34` | Desktop Owner | `desktop-pet/src/renderer/features/life-actions` | 对接 life APIs | 无 | 消费 `PetStateUpdated` | 桌面端提供快捷喂食/清洁/休息 |
| `V1-35` | Admin Owner | `admin/src/pages/Frogs`, `admin/src/pages/Config` | `PUT /api/admin/frogs/:tokenId/status` | 读写 `pet_states` | 无 | 后台可兜底修复异常状态 |

## 4.5 Travel 主线收敛

| ID | 负责人 | 目录 | 关键接口 | 表结构 | 事件 | 完成定义 |
|----|--------|------|----------|--------|------|----------|
| `V1-40` | BE Owner | `backend/src/api/routes/travel.routes.ts`, `modules/travel`, `services/travel/*` | `POST /api/v1/travels`, `GET /api/v1/travels/:id`, `POST /api/v1/travels/:id/start`, `POST /api/v1/travels/:id/complete` | 复用 `Travel`, 必要时补 `domain_events` | `TravelStarted`, `TravelCompleted` | travel / cross-chain / group-travel 的主状态机统一为一套 |
| `V1-41` | Contract Owner | `TravelUpgradeable.sol`, `OmniTravelUpgradeable.sol`, `SouvenirNFT.sol` | 合约事件与回调 | `onchain_milestones` | `TravelStarted`, `TravelCompleted`, `SouvenirMinted` | 旅行与纪念品铸造事件具备可追踪因果关系 |
| `V1-42` | AI Owner | `backend/src/services/ai/journal` | `POST /api/v1/travels/:id/recap` | 读 `Travel`、写 `soul_profiles` 或 memory | `TravelRecapGenerated` | 旅行完成后稳定生成 Journal / Recap |
| `V1-43` | FE Owner | `frontend/src/features/travel`, `pages/TravelResultPage.tsx` | 对接 travel APIs | 无 | 消费 `TravelStarted`, `TravelCompleted`, `SouvenirMinted` | Web 端从发起到结果页只走一套旅行流 |
| `V1-44` | Desktop Owner | `desktop-pet/src/renderer/features/travel` | 读 travel summary / ws | 无 | 消费 `TravelStarted`, `TravelCompleted` | 桌面端可收到旅行开始、归来、稀有纪念品提醒 |

## 4.6 Frog Wallet + Memory Palace Lite

| ID | 负责人 | 目录 | 关键接口 | 表结构 | 事件 | 完成定义 |
|----|--------|------|----------|--------|------|----------|
| `V1-50` | Contract Owner | `contracts/` | TBA registry / account 读取 | 无 | `FrogWalletBound` | 每只蛙可推导出稳定的 ERC-6551 TBA 地址 |
| `V1-51` | BE Owner | `backend/src/modules/web3`, `modules/memory-palace` | `GET /api/v1/frogs/:frogId/wallet`, `GET /api/v1/memory-palaces/:id` | `onchain_milestones`, `memory_palaces` 新增 | `MemoryPalaceCreated` | 后端能聚合 Frog Wallet 和 Memory Palace Lite 数据 |
| `V1-52` | AI Owner | `backend/src/services/ai/journal`, `memory/` | 由 backend 内部调用 | 写 `memory_palaces` | `MemoryPalaceCreated` | AI 可把旅行 recap 转成记忆空间摘要和文案 |
| `V1-53` | FE Owner | `frontend/src/features/memory-palace`, `features/web3` | 对接 wallet / memory APIs | 无 | 消费 `MemoryPalaceCreated` | Web 端展示 Frog Wallet 与 Memory Palace Lite |
| `V1-54` | Desktop Owner | `desktop-pet/src/renderer/features/notifications` | 读 memory summary | 无 | 消费 `MemoryPalaceCreated` | 桌面端可提示旅行记忆空间生成完成 |

## 4.7 Social Rituals + Dormancy Beta

| ID | 负责人 | 目录 | 关键接口 | 表结构 | 事件 | 完成定义 |
|----|--------|------|----------|--------|------|----------|
| `V1-60` | BE Owner | `backend/src/modules/social`, `modules/life` | `POST /api/v1/frogs/:frogId/hibernation/revive`, `POST /api/v1/frogs/:frogId/hibernation/bless` | `rituals`, `relationship_events` 新增 | `PetEnteredDormancy`, `BlessingStarted`, `BlessingCompleted` | 冬眠和祈福/唤醒 Beta 跑通 |
| `V1-61` | BE Owner | `services/social`, `services/notification` | `POST /api/v1/friends/requests`, `GET /api/v1/friends` | 复用 `Friendship`，补 `relationship_events` | `FriendshipCreated`, `RelationshipMilestoneRecorded` | 好友、留言、投喂、祈福被统一沉淀为关系事件 |
| `V1-62` | FE Owner | `frontend/src/features/social`, `pages/Friends.tsx` | 对接 friends / bless APIs | 无 | 消费 `BlessingStarted`, `BlessingCompleted` | Web 端支持好友状态、祈福入口、留言入口 |
| `V1-63` | Desktop Owner | `desktop-pet/src/renderer/features/notifications`, `features/chat` | 读 bless summary | 无 | 消费 `PetEnteredDormancy`, `BlessingCompleted` | 桌面端可快速响应祈福与冬眠提醒 |
| `V1-64` | AI Owner | `backend/src/services/ai/memory`, `persona/` | 由 backend 内部调用 | 读写 `relationship_events`, `soul_profiles` | `RelationshipMilestoneRecorded` | AI 能识别“谁喂过我、谁救过我、谁祝福过我” |

## 4.8 质量、发布与运维

| ID | 负责人 | 目录 | 关键接口 | 表结构 | 事件 | 完成定义 |
|----|--------|------|----------|--------|------|----------|
| `V1-70` | QA Owner | `frontend/test`, `backend/src/__tests__`, `desktop-pet/src/__tests__`, `contracts/test` | 无 | 无 | 无 | 形成主链路冒烟：Claim -> Care -> Hatch -> Travel -> Result -> Bless |
| `V1-71` | Admin Owner + BE Owner | `admin/`, `backend/scripts/` | `GET /api/admin/dashboard`, `PUT /api/admin/config` | 读 `domain_events`, `human_verifications`, `pet_states` | 无 | 后台具备 feature flag、异常状态修复、验证统计查看 |
| `V1-72` | Tech Lead + QA Owner | 仓库全局 | 无 | 无 | 无 | 发布前 checklist 完成，RC 只允许修 bug |

---

## 五、Version 1 明确不做

1. Family DAO 全量治理
2. 复杂基因与繁殖博弈
3. 完整 mobile 产品
4. 自研 relationship proof 合约
5. AI 自主链上代理

---

## 六、Version 1 最终交付包

1. Web 主控制台
2. Electron 桌面陪伴层
3. 模块化单体后端
4. upgradeable 合约主线
5. backend AI 主线
6. Admin 基础治理能力
