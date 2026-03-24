---
status: 执行中
version: 2.26
last_updated: 2026-03-23
reviewer: Codex
---

# ZFrog V2 详尽开发计划

## 一、当前基线（进入 V2 前）

截至 `2026-03-22`，V1 代码主线为：

1. `frontend/`
2. `backend/`
3. `admin/`
4. `desktop-pet/`
5. `contracts/`

已完成进展：

1. V1 主链路代码级回归通过（backend/frontend/admin/desktop/contracts 本地测试与构建通过）。
2. `V2-00` 第一阶段已完成：根级 `package.json`、`pnpm-workspace.yaml`、`apps/*`、`packages/*` 占位映射已建立。
3. V2 backlog 文档已建立并进入执行状态。
4. `2026-03-22`：`V2-W2-01` 已完成，`packages/shared` 初始化（types/schemas/index/contract test）。
5. `2026-03-22`：`V2-W2-02` 已完成，`packages/client-sdk` 初始化（http/auth/health/contract test），并在 frontend `systemFeatureApi.checkHealth` 接入 SDK。
6. `2026-03-22`：`V2-W2-03` 已完成，新增 `.github/workflows/v2-dual-entry-smoke.yml`（legacy/workspace 双入口 smoke）。
7. `2026-03-22`：`V2-W2-04` 已完成，冻结 V2 social API 命名与错误码；后端新增 `/api/v2` 第一版契约路由（contract-only）。
8. `2026-03-23`：`V2-W3-02` 已完成，`/api/v2/families` 升级为最小可用 DB read/write，新增 real-db e2e（create/get/domain_events）。
9. `2026-03-23`：`V2-W3-01` 已完成，`packages/client-sdk` 新增 `life/travel/social` 资源层，Web 首批查询切换为 SDK 调用。
10. `2026-03-23`：`V2-W4-01` 已完成，`/api/v2/communities` 升级为最小 DB 读写（join/get/members）并补齐 e2e 骨架。
11. `2026-03-23`：`V2-W4-02` 已完成，`client-sdk social` 新增 v2 community 读写资源并接入前端 social API。
12. `2026-03-23`：`V2-W4-03` 已完成，新增 Families/Communities 页面骨架并接入 family/community 读模型空态与错误态展示。
13. `2026-03-23`：`V2-W5-01` 已完成，`/api/v2/attestations/relationship` 升级为 DB 入库读写并补齐 create/query/filter 与幂等语义。
14. `2026-03-23`：`V2-W5-02` 已完成，attestation onchain adapter + replay 脚本落地，`onchain_milestones.attestationId` 已支持 `attestationId/txHash` 双向追踪。
15. `2026-03-23`：`V2-W5-03` 已完成，Admin Attestation 观测页与 `/api/admin/attestations` 过滤接口落地，可按 `QUEUED/CONFIRMED/FAILED` 状态筛选并查看链上 trace。
16. `2026-03-23`：`V2-W6-01` 已完成，新增 relationship-memory API（`/api/v2/frogs/:id/relationship-memory`）并完成聚合读模型与 integration/e2e 门控测试。
17. `2026-03-23`：`V2-W6-02` 已完成，新增 `/api/v2/frogs/:id/wallet` 标准查询接口与 `/wallet/milestones`，并落地 `FrogWalletAssetChanged` 资产快照去重事件。
18. `2026-03-23`：`V2-W6-03` 已完成，新增 `memory_summaries` 表与 memory summary 生成服务，`memory:summary:update` 定时脚本 dry-run 已通过。
19. `2026-03-23`：`V2-W7-01` 已完成，Web Families/Communities 页面升级为正式入口，形成“创建家庭 -> 加入社区 -> 提交关系证明（可选链上提交）”闭环。
20. `2026-03-23`：`V2-W7-02` 已完成，新增 Playwright 社交主流程 e2e（mock `/api/v2`），并接入 nightly workflow `v2-social-nightly-e2e`。
21. `2026-03-23`：安全闭环加固已完成，`/api/v2/families|communities|attestations` 写接口新增钱包维度限流，补齐 429 限流用例与 attestation onchain 权限拒绝用例。
22. `2026-03-23`：`V2-W8-01` 已完成，新增按钱包分桶灰度放量与一键 fallback 开关（`V2_SOCIAL_FORCE_FALLBACK`），并将 rollout 观测信息接入 `/api/v2/health` 与 `families|communities|attestations` status 端点。
23. `2026-03-23`：`V2-W8-02` 已完成，新增 `v2-regression-nightly-matrix` 分层 nightly（contract/integration/e2e/smoke）并自动产出矩阵报告；`v2-social-nightly-e2e` 调整为手动触发排障工作流。
24. `2026-03-23`：`V2-W9-01` 已完成，`desktop-pet` life/travel 读链路切换为 `client-sdk`（`getLife/getTravelByIdV1/getTravelHistory/getTravelStats`），并通过桌宠构建回归。
25. `2026-03-23`：`V2-W9-02` 已完成，`desktop-pet` life/travel 写链路切换为 `client-sdk`（life care + v1 travel start/complete），并新增 shared `DomainEvent` 解析适配用于通知 hook 与 WS message 入口。
26. `2026-03-23`：`V2-W10-01` 已完成，新增 `apps/mobile-lite`（PWA-lite）工程并接入 `@zfrog/client-sdk`，可执行 life/travel/social 资源联通探针。
27. `2026-03-23`：`V2-W10-02` 已完成，Mobile Lite 已交付登录/状态/照顾/祈福救援四页面；前端动作统一接入参数校验、in-flight 防重入、cooldown 节流与错误码归一化，形成移动端最小安全闭环。
28. `2026-03-23`：`V2-W11-01` 已完成，新增 `POST /api/v2/chat` 与 Prompt-kit 版本化 trace（prompt/memory）落库到 `domain_events`，并补齐 route e2e/trace integration 用例。
29. `2026-03-23`：`V2-W11-02` 已完成，Desktop 提醒链路支持 relationship-aware 文案与节流策略，设置页新增关系提醒开关，并在好友入口接入 `v2/chat` 关系上下文提示。
30. `2026-03-23`：`V2-W12-01` 已完成，RC 发布门禁机审化：新增 `v2-rc-release-gate` workflow 与 `ci:gate:v2-rc` 校验脚本，按配置校验 `P0/P1=0`、nightly 连续成功次数与最新成功时效，并自动产出 `v2-rc-gate-report` artifact。
31. `2026-03-23`：`V2-W12-02` 已完成，workspace 已成为默认开发入口（`npm run dev` -> `start.sh --workspace`），并新增 `scripts/cutover/start-workspace.sh`、`start-legacy.sh`、`rollback-to-legacy.sh` 与 cutover runbook，回滚演练链路可执行。
32. `2026-03-23`：安全闭环补齐已完成，`/api/v2/frogs/:id/relationship-memory` 增加蛙主人读取校验，`/api/v2/attestations/relationship` 的 detail/list 增加钱包作用域隔离，并补齐越权读取 e2e 用例。
33. `2026-03-23`：`V2-W13-01` 已完成，新增 RC gate 证据归档脚本（`scripts/ci/v2-rc-gate-archive.mjs`）并接入 `v2-rc-release-gate` workflow artifact；新增 cutover 启动日志与 `legacy fallback` 周报脚本（`scripts/cutover/legacy-fallback-report.mjs`），可按原因统计回滚触发。
34. `2026-03-23`：`V2-W13-02` 已完成，新增 `legacy fallback gate` 自动门禁（`scripts/cutover/legacy-fallback-gate-check.mjs` + `.github/release-gates/v2-cutover-fallback-gate.json`）与每日 workflow（`v2-cutover-fallback-gate.yml`），支持 dry-run 排除、阈值判定与 artifact 归档。
35. `2026-03-23`：`V2-W13-03` 已完成，新增周发布健康汇总（`scripts/ci/v2-release-health-summary.mjs` + `.github/workflows/v2-release-health-summary.yml`），将 RC gate 与 fallback gate 合并输出单报告，并提供 fallback reason 周环比与“需处理 reason”清单。
36. `2026-03-23`：`V2-W14-01` 已完成，周发布健康摘要新增连续两周上升 reason 识别与 `p1CandidateReasons` 机器可读输出（`v2-release-health-summary.json`），形成 `Need-to-handle -> P1` 收敛闭环。
37. `2026-03-23`：`V2-W14-02` 已完成，新增 `v2-p1-escalation-dispatch`（script + workflow + gate config），可按 `p1CandidateReasons` 自动去重出卡并分派，产出 `v2-p1-escalation-dispatch-report` artifact。
38. `2026-03-23`：`V2-W15-01` 已完成，`v2-p1-escalation-dispatch` 升级为标准化模板 + owner-route 闭环：新增 `.github/ISSUE_TEMPLATE/v2-p1-escalation.md`、owner route 规则（exact/pattern/default）与 `failOnMissingOwnerRoute` 阻断策略，dispatch 报告新增 owner route 维度并补齐测试。
39. `2026-03-23`：`V2-W15-02` 已完成，`v2-p1-escalation-dispatch` 新增 owner-route/issue-form schema 校验、`--apply` 重试策略与幂等日志落盘（`reports/v2-p1-escalation-dispatch-idempotency.jsonl`），并将报告/JSON 输出扩展为可追溯执行证据。
40. `2026-03-23`：`V2-W15-03` 已完成，新增 `v2-p1-dispatch-quality-gate`（script + lib + workflow/config + tests），将 apply 失败重试结果与幂等日志统计纳入单独质量门禁（`maxFailedCreatesPerRun/maxRetryExhausted/maxIdempotencyParseErrors`）并产出 gate artifact。
41. `2026-03-23`：`V2-W15-04` 已完成，`v2-release-health-summary` 已并入 dispatch-quality-gate 结果，并新增“连续失败周次”趋势门禁（可配置 `consecutiveFailureWeeks` + fail policy），周摘要可直接反映并阻断连续失败趋势。
42. `2026-03-23`：`V2-W15-05` 已完成，`v2-p1-escalation-dispatch` 已联动 dispatch-quality 连续失败趋势：趋势触发时自动追加 `dispatch-quality-consecutive-failed-weeks` 候选卡，并在 issue 模板注入质量门禁失败上下文（latest run / 连续失败周次 / threshold / report 证据）。
43. `2026-03-23`：`V2-W15-06` 已完成，`v2-p1-escalation-dispatch` 已为 P1 issue 写入 workflow run/artifact deep link，并自动回写 trace comment；新增 `v2-p1-escalation-timeout-gate`（脚本 + 配置 + workflow 接线）用于处置超时提醒门禁与 reminder 留痕。
44. `2026-03-23`：`V2-W15-07` 已完成，`v2-release-health-summary` 已并入 timeout gate 周趋势（latest + consecutive failed weeks）并输出 `p1-timeout-consecutive-failed-weeks` 自动升级候选；`v2-p1-escalation-dispatch` 已消费 timeout 上下文并可自动出卡。
45. `2026-03-23`：`V2-W15-08` 已完成，`v2-p1-escalation-timeout-gate` 新增 timeout 候选处置闭环检查（趋势触发必须有 open 卡、恢复 2 周后必须关单）；`v2-release-health-summary` 新增 `timeoutConsecutivePassedWeeks` 字段并接入 timeout gate summary 输入，形成按周机审闭环。
46. `2026-03-23`：`V2-W15-09` 已完成，`v2-p1-escalation-timeout-gate` 新增 required label 漂移门禁（`maxLabelDriftIssues`）并将 issue 拉取策略升级为 `queryLabels/queryState + 分页`，避免 P1 卡因标签漂移或分页截断逃逸 timeout 机审。
47. `2026-03-23`：`V2-W15-10` 已完成，`v2-p1-escalation-timeout-gate` 新增“恢复观察期持卡”门禁：当 timeout 趋势消失但连续恢复周数未达阈值（默认 2 周）时，`p1-timeout-consecutive-failed-weeks` 必须保持 open；达阈值后继续执行关单门禁，防止提前关单导致“观察窗口空转”。
48. `2026-03-23`：`V2-W15-11` 已完成，timeout 候选处置链路新增“恢复阈值加严防回退”机审：`candidateCloseout` 引入 `recoveryThresholdRatcheting`，在稳定窗口触发后强制恢复阈值不低于目标值，并将 `recoveryConsecutivePassedWeeks` 提升到 `3`，防止策略回退导致提前关单。
49. `2026-03-23`：`V2-W15-12` 已完成，新增 `v2-p1-timeout-stability-observation-gate`（script + config + workflow + tests），将“连续两周观察是否稳定 PASS、`labelDriftIssues=0`、ratchet 无误报”升级为每周机审闭环并产出可追溯报告 artifact。
50. `2026-03-23`：`V2-W15-13` 已完成，`v2-release-health-summary` 并入 timeout-stability 周趋势并新增 `p1-timeout-stability-consecutive-failed-weeks` 候选自动升级；`v2-p1-escalation-dispatch` 已补齐 timeout-stability 上下文模板/issue-form/schema 校验，形成“稳定观察门禁 -> 周报趋势 -> 自动出卡”的安全闭环。
51. `2026-03-23`：`V2-W15-14` 已完成，`v2-p1-escalation-timeout-gate` 升级为 `candidateCloseouts` 多候选机审，新增 `p1-timeout-stability-consecutive-failed-weeks` 处置闭环（趋势触发必须开卡、恢复达阈值必须关卡）并补齐报告与测试。
52. `2026-03-23`：`V2-W15-15` 已完成，`v2-p1-escalation-timeout-gate` 新增 summary 新鲜度门禁（`generatedAt` 必填 + `summary.maxAgeHours` 时效约束），并在报告输出 summary age 指标，阻断无时间戳或陈旧 summary 驱动的错误处置。
53. `2026-03-23`：`V2-W15-16` 已完成，`v2-p1-escalation-dispatch` 新增 summary 新鲜度门禁（`summary.requireGeneratedAt/maxAgeHours`）；陈旧或缺失时间戳的周报将阻断自动出卡，并在 dispatch 报告输出 freshness checks 与阻断明细。
54. `2026-03-23`：`V2-W15-17` 已完成，dispatch + timeout 双链路新增 summary 未来时间戳偏移门禁（`summary.maxFutureSkewMinutes`）；超过容忍窗口的“未来 generatedAt”将被机审阻断，避免时钟漂移或伪造时间戳绕过新鲜度策略。

V2 仍遵循硬约束：**不破坏 V1 可运行主链路**。

---

## 二、Version 2 产品目标与成功指标

## 2.1 目标陈述

V2 的目标是：

**把“我和我的蛙”升级成“我们和彼此的蛙”，并完成跨端 shared layer 的结构化重构。**

## 2.2 关键结果（KR）

1. shared packages 被 Web/Desktop/Mobile Lite 三端消费。
2. `/api/v2/*` 社交域（family/community/attestation）形成可执行协作闭环。
3. relationship attestation 具备“库内记录 + 链上可追踪”的双证据。
4. AI 回复可读 relationship-memory，具备可解释链路。
5. V1 主链路指标不退化。

## 2.3 建议跟踪指标（每周）

1. `V1 主链路成功率`：`Verify -> Claim -> Care -> Hatch -> Travel -> Memory -> Bless` 成功率。
2. `V2 社交转化率`：创建 family 后 7 日内 join community 的比例。
3. `Attestation 成功率`：relationship attestation 从提交到链上确认成功率。
4. `跨端一致性`：同一 frog 在 Web/Desktop/Mobile 的 life/travel/wallet 摘要一致率。
5. `回归通过率`：nightly contract/integration/e2e/smoke 通过率。

---

## 三、范围边界（做与不做）

## 3.1 V2 明确做

1. workspace 化与 shared package 落地。
2. `/api/v2/*` 社交域建立。
3. 三端统一 client-sdk（HTTP + WS + auth/session）。
4. Mobile Lite MVP（登录、状态、快捷照顾、祈福/救援）。
5. relationship attestation（后端 + 合约 adapter + admin 观测）。

## 3.2 V2 明确不做

1. 提前拆分微服务。
2. DAO 全量治理体系。
3. 插件生态全量开放。
4. Full mobile 正式产品。
5. 多链剧情世界系统大扩张。

---

## 四、架构目标与迁移蓝图

| 层级 | V1 现状 | V2 目标 | 迁移方式 |
|------|---------|---------|----------|
| Repo 结构 | 多应用并列目录 | `apps/* + packages/*` | 先映射后迁移 |
| 类型与契约 | 端内复制定义 | `packages/shared` 单一来源 | additive 替换 |
| 调用层 | 多端分散 api helper | `packages/client-sdk` 统一 | 端到端切流 |
| 社交域 | 分散在旧路由/服务 | `/api/v2/social` 领域化 | 并行引入 |
| 关系证明 | 主要是库内记录 | 库内 + 链上 attestation | 双写追踪 |
| 陪伴上下文 | 偏单点动作 | relationship-memory | 读模型增强 |

迁移顺序固定：

1. `expand`：新增表、路由、模块与 schema。
2. `backfill`：补齐历史数据。
3. `switch-read`：先切读，再观察。
4. `switch-write`：切写并保留 fallback。
5. `contract`：稳定后退役旧路径。

---

## 五、执行治理与协作规则

## 5.1 节奏

1. 周一：计划冻结（本周 scope、owner、风险）。
2. 周三：中期评审（阻塞清理、范围裁剪）。
3. 周五：验收回顾（DoD、回滚演练、文档更新）。

## 5.2 Definition of Ready（DoR）

任务进入开发前必须满足：

1. 接口契约或 schema 已明确。
2. owner、依赖、测试策略明确。
3. 回滚策略明确。

## 5.3 Definition of Done（DoD）

任务标记完成必须满足：

1. 代码 + 测试 + 文档三者齐全。
2. 新增接口有最小 e2e/integration 覆盖。
3. 回归矩阵无新增 P0/P1 失败。
4. 变更可回滚。

## 5.4 版本保护策略

1. V2 全量能力走 feature flag，默认不影响 V1 用户。
2. 发布窗口内禁止无测试证据的破坏性改动。
3. RC 锁窗后只允许 bugfix。

---

## 六、里程碑与周期（12 周）

| 阶段 | 周期 | 目标 | 强制出口 |
|------|------|------|----------|
| Phase 0 | Week 1-2 | 地基 | workspace、命名规范、回归基线冻结 |
| Phase 1 | Week 3-4 | shared/sdk Alpha + family/community 基础域 | Web 首批消费 shared/sdk，family/community API 可联调 |
| Phase 2 | Week 5-6 | attestation + relationship-memory + wallet 稳定化 | 关系证明可追踪，AI 可读取关系摘要 |
| Phase 3 | Week 7-8 | Web/Admin V2 主入口 | family/community/attestation 页面上线灰度 |
| Phase 4 | Week 9-10 | Desktop + Mobile Lite | 两端切 SDK，Mobile Lite MVP 可用 |
| RC | Week 11-12 | 硬化与 cutover | 多端回归全绿，默认入口切换可回滚 |

---

## 七、执行级任务清单（V2-00 ~ V2-52）

## 7.1 仓库结构与共享层

### `V2-00` Workspace 脚手架

1. 目标：建立 root workspace 能力且不破坏 legacy 启动。
2. 当前状态：`第一阶段已完成`（root scripts + workspace 映射）。
3. 第二阶段交付：
   1. CI 双入口（legacy/workspace）并行。
   2. 回滚脚本与切换指引。
4. 验收：旧命令可用、workspace 可跑通 Web+Backend。

### `V2-01` `packages/shared`

1. 目标：统一 DTO、schema、event contract。
2. 交付：
   1. `types`：`ApiResponse/ErrorCode/DomainEvent/Life/Travel/Social`。
   2. `schemas`：zod/JSON schema。
   3. version policy：`eventName + eventVersion + payload`。
3. 验收：frontend/desktop/backend 至少两端消费；contract test 通过。

### `V2-02` `packages/client-sdk`

1. 目标：统一 HTTP/WS/Auth/session client。
2. 交付：
   1. transport（timeout/retry/correlation-id/deprecation-header）。
   2. resource clients（life/travel/social/auth）。
   3. mock/contract 测试工具。
3. 验收：三端不再新增直连 `apiService`。

## 7.2 前端与多端

### `V2-10` Web 社交入口

1. 目标：Web 完成 family/community/attestation 主入口。
2. 关键接口：
   1. `POST /api/v2/families`
   2. `GET /api/v2/families/:familyId`
   3. `POST /api/v2/communities/:communityId/join`
   4. `POST /api/v2/attestations/relationship`
3. 验收：创建家庭 -> 加入社区 -> 提交关系证明可独立跑通。

### `V2-11` Desktop SDK-first

1. 目标：桌宠读写与 ws 订阅全部切至 client-sdk。
2. 关键交付：notification/chat hooks 对齐 shared event schema。
3. 验收：travel/life/notification 回归通过；断网重连稳定。

### `V2-12` Mobile Lite MVP

1. 目标：上线最小可用移动端。
2. 页面范围：登录、状态、快捷照顾、祈福/救援。
3. 验收：主流程可跑通，失败重试与离线提示可用。

## 7.3 后端与数据模型

### `V2-20` Family 领域化

1. 目标：family 成为聚合根（成员/角色/目标）。
2. 表结构：`families`、`family_members`、`family_goals`。
3. 验收：并发写入无重复 membership，事件可观测。

### `V2-21` Community 协作域

1. 目标：community 从展示升级为成员关系模型。
2. 表结构：`communities`、`community_members`。
3. 验收：join/list members 可联调，权限校验完整。

### `V2-22` Relationship Attestation

1. 目标：关系证明标准化并可追踪。
2. 表结构：`relationship_attestations`。
3. 规则：同 `source + subject + object + type` 幂等。
4. 验收：可创建、可查询、可过滤、可重放。

### `V2-23` Relationship Memory Read Model

1. 目标：聚合关系事件给 AI/提醒消费。
2. 输入：`relationship_events + attestations + soul_profiles`。
3. 输出：`GET /api/v2/frogs/:id/relationship-memory`。
4. 验收：API SLA 达标，trace 字段齐全。

## 7.4 合约与链上关系

### `V2-30` Attestation Adapter

1. 目标：打通 EAS/自定义 schema 的 adapter。
2. 数据：扩展 `onchain_milestones` 关联键（attestationId/txHash）。
3. 验收：链上与库内双向追踪，retry/replay 可用。

### `V2-31` Frog Wallet 稳定化

1. 目标：钱包读写标准接口化、资产变化事件化。
2. 事件：`FrogWalletAssetChanged`。
3. 验收：三端钱包摘要一致，V1 摘要接口不破坏。

## 7.5 AI 与陪伴

### `V2-40` Prompt Kit + Memory Summary

1. 目标：prompt/memory 版本化管理。
2. 表结构：`prompt_versions`、`memory_summaries`。
3. 接口：`POST /api/v2/chat`、`POST /api/v2/ritual-response`。
4. 验收：可解释（prompt+memory trace）且可审计。

### `V2-41` Relationship-aware Companion

1. 目标：桌面提醒和聊天具备关系上下文。
2. 验收：提醒噪声可控、开关可配、失败场景可降级。

## 7.6 质量与发布

### `V2-50` 多端回归矩阵

1. 测试分层：contract / integration / e2e / smoke。
2. nightly：自动回归 + flaky 追踪。
3. 验收：关键路径失败可定位到层级。

### `V2-51` Workspace Cutover

1. 三波迁移：脚手架 -> 增量切换 -> 默认入口切换。
2. 每波必须有回滚 tag 与脚本。
3. 验收：workspace 默认入口可用且 V1 零可见退化。

### `V2-52` 发布观察闭环

1. 目标：把 RC 门禁与 fallback 观测从“人工关注”升级为“可追溯证据链”。
2. 关键交付：
   1. `scripts/ci/v2-rc-gate-archive.mjs` 自动归档 gate report（含 run 元数据）。
   2. `scripts/cutover/log-dev-entry.sh` + `scripts/cutover/legacy-fallback-report.mjs` 记录并汇总 legacy fallback 次数与原因。
   3. `v2-rc-release-gate` workflow 上传 `v2-rc-gate-evidence` artifact。
   4. `scripts/ci/v2-release-health-summary.mjs` + `v2-release-health-summary` workflow 输出统一周健康摘要（RC + fallback + 周环比）。
3. 验收：可输出按周 fallback 原因报告；门禁报告具备可下载归档证据；统一健康摘要可列出需处理 reason。

---

## 八、V2 API 契约冻结（W2-04）

## 8.1 统一响应 envelope

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-03-22T00:00:00.000Z"
  }
}
```

## 8.2 Social Domain（冻结）

1. `POST /api/v2/families`

```json
{
  "name": "Frog Family",
  "ownerFrogId": 101,
  "goal": "Grow together"
}
```

2. `POST /api/v2/communities/:communityId/join`

```json
{
  "frogId": 101,
  "role": "member"
}
```

3. `POST /api/v2/attestations/relationship`

```json
{
  "subjectFrogId": 101,
  "objectFrogId": 202,
  "attestationType": "blessing",
  "source": "v2-social",
  "evidence": {
    "eventId": "evt_xxx",
    "note": "helped in dormancy"
  }
}
```

4. `GET /api/v2/frogs/:frogId/relationship-memory`

```json
{
  "summary": "...",
  "highlights": [],
  "version": 3
}
```

## 8.3 命名冻结表

| 领域 | Method | Path | 语义 |
|------|--------|------|------|
| Family | `POST` | `/api/v2/families` | 创建家庭 |
| Family | `GET` | `/api/v2/families/:familyId` | 查询家庭详情 |
| Community | `POST` | `/api/v2/communities/:communityId/join` | 加入社区 |
| Attestation | `POST` | `/api/v2/attestations/relationship` | 提交关系证明 |

冻结规则：

1. 资源使用复数名词：`families/communities/attestations`。
2. 参数统一使用 `:familyId/:communityId`，避免 `:id` 歧义。
3. 关系证明类型字段固定为 `attestationType`，来源字段固定为 `source`。

## 8.4 错误码冻结草案（V2 Social）

| Domain | Code | HTTP（建议） | 说明 |
|--------|------|-------------|------|
| Family | `FAMILY_INVALID_INPUT` | `400` | 输入参数非法 |
| Family | `FAMILY_NOT_FOUND` | `404` | 家庭不存在 |
| Family | `FAMILY_ALREADY_EXISTS` | `409` | 家庭名称或关系冲突 |
| Family | `FAMILY_MEMBER_LIMIT_REACHED` | `409` | 家庭人数达到上限 |
| Family | `FAMILY_PERMISSION_DENIED` | `403` | 无权操作该家庭 |
| Community | `COMMUNITY_INVALID_INPUT` | `400` | 输入参数非法 |
| Community | `COMMUNITY_NOT_FOUND` | `404` | 社区不存在 |
| Community | `COMMUNITY_ALREADY_MEMBER` | `409` | 已是社区成员 |
| Community | `COMMUNITY_MEMBER_LIMIT_REACHED` | `409` | 社区人数达到上限 |
| Community | `COMMUNITY_PERMISSION_DENIED` | `403` | 无权操作该社区 |
| Attestation | `ATTESTATION_INVALID_INPUT` | `400` | 输入参数非法 |
| Attestation | `ATTESTATION_NOT_FOUND` | `404` | 证明记录不存在 |
| Attestation | `ATTESTATION_DUPLICATE` | `409` | 幂等键冲突（重复证明） |
| Attestation | `ATTESTATION_PERMISSION_DENIED` | `403` | 无权提交/读取该证明 |
| Attestation | `ATTESTATION_CHAIN_SUBMIT_FAILED` | `502` | 链上提交失败 |
| Social Contract | `V2_SOCIAL_CONTRACT_ONLY` | `501` | 仍处于契约阶段 |

## 8.5 第一版路由契约（代码落地）

1. `backend/src/api/routes/v2/index.ts`
2. `backend/src/api/routes/v2/families.routes.ts`
3. `backend/src/api/routes/v2/communities.routes.ts`
4. `backend/src/api/routes/v2/attestations.routes.ts`
5. `backend/src/types/api.ts` 新增 `V2SocialErrorCodes`

当前行为：

1. `families` 已进入最小可用 DB read/write（`POST/GET` 真实落库，`201/200`）。
2. `communities` 已进入最小可用 DB read/write（`POST join` + `GET detail/members` 真实落库，`201/200`）。
3. `attestations` 已进入最小可用 DB read/write（`POST/GET list/GET detail`，支持 `idempotencyKey` 与语义组合幂等）。

---

## 九、数据迁移与回滚剧本

## 9.1 Expand

1. 新增 family/community/attestation/prompt/memory 相关表。
2. 禁止在本阶段删除旧字段。

## 9.2 Backfill

1. 基于现有 social/friend/ritual 事件回填 relationship_attestations。
2. 回填脚本要求支持 dry-run 与可重复执行。

## 9.3 Switch

1. 先切读（feature flag 控制）。
2. 稳定后切写。

## 9.4 Contract

1. 旧路径低流量稳定 7 天后进入退役窗口。
2. 退役前必须有回滚演练记录。

---

## 十、测试矩阵与发布门禁

## 10.1 必跑测试（每周）

1. Backend：unit + integration + e2e。
2. Frontend：unit + type-check + e2e smoke。
3. Desktop：build + smoke。
4. Contracts：unit/integration tests + deploy script smoke。

## 10.2 阶段门禁

1. Phase 1 门禁：shared/sdk contract tests 通过。
2. Phase 2 门禁：attestation 双向追踪链路通过。
3. Phase 3 门禁：Web/Admin 灰度指标达标。
4. Phase 4 门禁：Desktop/Mobile 主流程通过。
5. RC 门禁：P0/P1 缺陷清零，回滚演练通过。
6. RC 门禁执行器：`.github/workflows/v2-rc-release-gate.yml` + `.github/release-gates/v2-rc-gate.json`。
7. Cutover 回滚门禁执行器：`.github/workflows/v2-cutover-fallback-gate.yml` + `.github/release-gates/v2-cutover-fallback-gate.json`。
8. 周发布健康摘要执行器：`.github/workflows/v2-release-health-summary.yml` + `.github/release-gates/v2-release-health-summary.json`。
9. P1 候选输出：`reports/v2-release-health-summary.json`（`p1CandidateReasons`）作为修复池输入。
10. P1 修复卡自动分派执行器：`.github/workflows/v2-p1-escalation-dispatch.yml` + `.github/release-gates/v2-p1-escalation-dispatch.json`。
11. P1 出卡标准化：`v2-p1-escalation-dispatch` 使用模板化 body、owner-route 与 issue-form 字段 schema 校验；`--apply` 支持失败重试并落盘幂等日志，防止重复出卡。
12. P1 出卡执行质量门禁：`.github/release-gates/v2-p1-dispatch-quality-gate.json` + `scripts/ci/v2-p1-dispatch-quality-gate.mjs`，用于拦截失败创建超预算与重试耗尽异常。
13. 周健康摘要并入 dispatch-quality：`v2-release-health-summary` 汇总 dispatch-quality 最近周状态，并对连续失败周次执行趋势门禁。
14. P1 出卡与 dispatch-quality 趋势联动：当 `dispatchQualityConsecutiveFailureDetected=true` 时，`v2-p1-escalation-dispatch` 自动追加 `dispatch-quality-consecutive-failed-weeks` 候选，并把质量门禁失败上下文写入卡片字段。
15. P1 issue 处置超时提醒门禁：`.github/release-gates/v2-p1-escalation-timeout-gate.json` + `scripts/ci/v2-p1-escalation-timeout-gate.mjs`，用于检测 open/idle 超时并自动写入 reminder comment（含 workflow run/artifact deep link）。
16. 周健康摘要并入 timeout gate：`v2-release-health-summary` 输出 timeout gate 周趋势与门禁状态，并在连续超时周次触发时自动追加 `p1-timeout-consecutive-failed-weeks` 候选，供 `v2-p1-escalation-dispatch` 自动出卡。
17. timeout 候选处置闭环门禁：`v2-p1-escalation-timeout-gate` 消费 `v2-release-health-summary.json`，要求 `p1-timeout-consecutive-failed-weeks` 在趋势触发时必须有 open issue，在连续恢复周次达阈值后必须闭单，避免“长期挂卡”。
18. timeout 标签漂移闭环门禁：`v2-p1-escalation-timeout-gate` 新增 required label 合规检查（`maxLabelDriftIssues`）与 `queryLabels/queryState` 拉取策略，按分页抓取 issue 并阻断“标签漂移导致监控逃逸”风险。
19. timeout 恢复观察期持卡门禁：`v2-p1-escalation-timeout-gate` 要求在“趋势已回落但恢复周数未达阈值”阶段保留 `p1-timeout-consecutive-failed-weeks` open issue，避免提前关单；恢复窗口达标后仍执行关单门禁。
20. timeout 恢复阈值加严防回退门禁：`v2-p1-escalation-timeout-gate` 新增 `candidateCloseout.recoveryThresholdRatcheting`，在稳定窗口触发后要求恢复阈值达到更严格目标（当前 `3` 周），防止策略被回调至更宽松阈值。
21. timeout-stability 候选处置闭环门禁：`v2-p1-escalation-timeout-gate` 升级为 `candidateCloseouts` 多候选策略，对 `p1-timeout-stability-consecutive-failed-weeks` 执行“趋势触发必须有 open 卡、恢复达阈值必须闭单”机审，防止稳定性候选漏开或长期挂卡。
22. timeout summary 新鲜度门禁：`v2-p1-escalation-timeout-gate` 新增 `summary.requireGeneratedAt` 与 `summary.maxAgeHours`，要求候选处置消费的周报必须带时间戳且在时效窗口内，避免基于陈旧数据触发开卡/关卡误判。
23. dispatch summary 新鲜度门禁：`v2-p1-escalation-dispatch` 新增 `summary.requireGeneratedAt` 与 `summary.maxAgeHours`，当周报输入缺失 `generatedAt` 或超过时效窗口时统一阻断出卡，并在 dispatch 报告输出 freshness checks 与 `skip-summary-freshness` 决策。
24. summary 未来时间戳偏移门禁：`v2-p1-escalation-dispatch` 与 `v2-p1-escalation-timeout-gate` 新增 `summary.maxFutureSkewMinutes`，对 `generatedAt` 超前于当前时间的输入执行容忍窗口校验；超过窗口即 FAIL，阻断利用未来时间戳规避 freshness 的风险。

---

## 十一、风险台账（执行版）

| 风险 | 触发信号 | 影响 | 负责人 | 缓解 |
|------|----------|------|--------|------|
| workspace 切换影响效率 | 开发同学频繁 fallback legacy | 中 | Tech Lead | 双入口并存到 RC 后 |
| shared schema 频繁变更 | 三端接口联调阻塞 | 中 | Tech Lead | 先冻结 V2 核心字段，增量扩展 |
| attestation 链上失败率高 | pending 积压增长 | 高 | Contract Owner | retry + replay + 降级为库内确认 |
| 移动端交付延期 | Week10 未能可用 | 中 | FE Owner | 限制 MVP 范围，PWA-lite 兜底 |
| 回归成本上升 | nightly 不稳定 | 高 | QA Owner | 统一 fixtures，先稳 smoke 再扩层级 |

---

## 十二、最近两周执行清单（Now）

1. 观察项：每周查看 `v2-release-health-summary-report` + `v2-release-health-summary.json`，确认 RC/fallback/dispatch-quality/timeout 四门禁状态与 `p1CandidateReasons` 趋势。
2. 新增门禁：持续关注 `v2-cutover-fallback-gate` 日报（`v2-cutover-fallback-gate-report` artifact）是否连续 PASS。
3. 收敛项：`V2-W15-17` 已落地，dispatch + timeout 双链路已补齐 summary 新鲜度 + 未来时间戳偏移门禁；下一步持续观察 `v2-p1-escalation-dispatch-report`、`v2-p1-escalation-timeout-gate-report` 与 `v2-release-health-summary` 是否连续稳定 PASS，确保无误报、无漏报、无陈旧/未来 summary 输入。

阶段完成定义：

1. shared 与 sdk 被至少 1 个端消费。
2. `/api/v2/families` 最小骨架可联调。
3. 双入口 CI 报告可追溯。
