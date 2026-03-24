---
status: 执行中
version: 2.21
last_updated: 2026-03-23
reviewer: Codex
---

# ZFrog V2 Issue Backlog 可开工版

## 一、文档目标

这份文档是 [ZFrog_V2_任务清单.md](/Users/sxlx/.gemini/antigravity/ZFrog/docs/02_开发计划/ZFrog_V2_任务清单.md) 的执行层 backlog。

目标：

1. 把 V2 拆成“按周可开工、可验收、可回滚”的任务卡。
2. 为每个任务卡提供 owner、依赖、文件级交付、测试与回滚策略。
3. 保证 V1 主链路可运行且可回滚。

---

## 二、当前进展（2026-03-23）

1. `V2-W1-01` 已完成：root `package.json`、`pnpm-workspace.yaml` 已落地。
2. `V2-W1-02` 已完成：`apps/*` 与 `packages/*` 软迁移映射已建立。
3. `V2-W1-03` 已完成：V2 周拆解 backlog 与计划文档已建立。
4. V1 回归已完成一轮本地闭环（作为 V2 进入前基线）。
5. `2026-03-22`：`V2-W2-01` 已完成，`packages/shared`（types/schemas/index/contract test）初始化完成。
6. `2026-03-22`：`V2-W2-02` 已完成，`packages/client-sdk`（http/auth/health/contract test）初始化完成，并接入 `frontend/system` 健康检查调用。
7. `2026-03-22`：`V2-W2-03` 已完成，新增 `.github/workflows/v2-dual-entry-smoke.yml` 支持 legacy/workspace 双入口 smoke。
8. `2026-03-22`：`V2-W2-04` 已完成，V2 social API 命名与错误码冻结；后端已建立 `/api/v2` contract-only 路由骨架与 e2e。
9. `2026-03-23`：`V2-W3-02` 已完成，`/api/v2/families` 已切为最小可用 DB read/write，落地 `family.command/query/service` 与 real-db e2e。
10. `2026-03-23`：`V2-W3-01` 已完成，`packages/client-sdk` 新增 `life/travel/social` 资源层并接入 `frontend/src/features/{life,travel,social}/api.ts` 首批查询。
11. `2026-03-23`：`V2-W3-03` 已完成，`/api/admin/domain-events` 新增 `familyId` 过滤并补齐 admin-cutover 路由回归测试。
12. `2026-03-23`：`V2-W4-01` 已完成，`/api/v2/communities` 切为最小 DB 读写（join/get/members）并新增 real-db e2e 骨架。
13. `2026-03-23`：`V2-W4-02` 已完成，`client-sdk social` 新增 v2 community 读写资源并接入 `frontend/src/features/social/api.ts` 与社区加入弹窗入口。
14. `2026-03-23`：`V2-W4-03` 已完成，新增 `FamiliesPage/CommunitiesPage` 与 social 组件骨架，页面已消费 family/community 读模型并覆盖空态/错误态。
15. `2026-03-23`：`V2-W5-01` 已完成，`/api/v2/attestations/relationship` 升级为 DB 入库读写，补齐查询过滤与幂等（`idempotencyKey + source/subject/object/type`）以及 e2e 用例。
16. `2026-03-23`：`V2-W5-02` 已完成，新增 relationship attestation onchain adapter 与 replay 脚本，`onchain_milestones` 增加 `attestationId` 追踪并支持 `attestationId <-> txHash` 双向查询。
17. `2026-03-23`：`V2-W5-03` 已完成，新增 Admin Attestations 观测页与 `/api/admin/attestations` 过滤接口，支持 `QUEUED/CONFIRMED/FAILED` 状态筛选与 onchain trace 展示。
18. `2026-03-23`：`V2-W6-01` 已完成，新增 `/api/v2/frogs/:id/relationship-memory` 读链路，聚合 relationship events + attestations + soul profile 并补齐 integration/e2e 门控测试。
19. `2026-03-23`：`V2-W6-02` 已完成，新增 v2 frog wallet 标准查询接口（`/api/v2/frogs/:id/wallet` + `/wallet/milestones`）并落地 `FrogWalletAssetChanged` 去重事件。
20. `2026-03-23`：`V2-W6-03` 已完成，新增 `memory_summaries` 表、memory summary 生成服务与 `memory:summary:update` 脚本，dry-run 已可执行。
21. `2026-03-23`：`V2-W8-01` 已完成，新增 V2 social rollout 中间件（按钱包分桶灰度 + `V2_SOCIAL_FORCE_FALLBACK` 一键回退），并在 `/api/v2/families|communities|attestations` 接入统一 gate；`/status` 与 `/health` 已暴露 rollout 观测快照，补齐 e2e 回归用例。
22. `2026-03-23`：`V2-W8-02` 已完成，新增 `.github/workflows/v2-regression-nightly-matrix.yml`（contract/integration/e2e/smoke 分层 nightly + 自动汇总报告 artifact），并保留 `v2-social-nightly-e2e` 为手动触发排障通道。
23. `2026-03-23`：`V2-W9-01` 已完成，`desktop-pet` 的 life/travel 读链路（`getLife/getTravelByIdV1/getTravelHistory/getTravelStats`）切换至 `client-sdk` 资源客户端，桌宠构建回归通过。
24. `2026-03-23`：`V2-W9-02` 已完成，`desktop-pet` 的 life/travel 写链路（照顾动作 + travel start/complete）切换至 `client-sdk`，并新增 shared `DomainEvent` 适配层用于通知链路与 WS message 解析（schema 对齐）。
25. `2026-03-23`：`V2-W10-01` 已完成，新增 `apps/mobile-lite`（PWA-lite）工程骨架并接入 `@zfrog/client-sdk`（life/travel/social 资源探针）。
26. `2026-03-23`：`V2-W10-02` 已完成，Mobile Lite 四页面（登录/状态/照顾/祈福救援）已联通；写操作统一接入输入校验、in-flight 防重入、cooldown 节流与错误归一化，满足移动端最小安全闭环。
27. `2026-03-23`：`V2-W11-01` 已完成，新增 `/api/v2/chat` 路由与 Prompt-kit 版本化 trace（system/response + memory summary）落库链路，trace 写入 `domain_events` 并补齐 route/integration 测试。
28. `2026-03-23`：`V2-W11-02` 已完成，Desktop 通知链路新增 relationship-aware 文案映射、可配置开关与节流策略，并在好友入口接入 `v2/chat` 关系上下文提示。
29. `2026-03-23`：`V2-W12-01` 已完成，新增 `.github/release-gates/v2-rc-gate.json`、`scripts/ci/v2-rc-gate-check.mjs` 与 `v2-rc-release-gate` workflow，RC 门禁改为机审（P0/P1 缺陷预算 + nightly 连续稳定 + 新鲜度）并自动产出 gate report。
30. `2026-03-23`：`V2-W12-02` 已完成，workspace 默认入口切换落地（`start.sh` 默认路由到 `start-workspace.sh`），并新增 legacy 回滚脚本与 cutover runbook，dry-run 回滚演练通过。
31. `2026-03-23`：安全闭环补齐已完成，`relationship-memory` 查询新增蛙主人读取权限校验，`attestation` detail/list 读取新增钱包作用域隔离，并补齐越权读取回归用例。
32. `2026-03-23`：`V2-W13-01` 已完成，新增 RC gate 证据归档脚本（`scripts/ci/v2-rc-gate-archive.mjs`）并接入 workflow 上传 `v2-rc-gate-evidence` artifact；新增 cutover 入口日志与 `legacy fallback` 周报脚本（`scripts/cutover/legacy-fallback-report.mjs`）实现触发原因可追溯。
33. `2026-03-23`：`V2-W13-02` 已完成，新增 fallback SLO 门禁（`scripts/cutover/legacy-fallback-gate-check.mjs` + `.github/release-gates/v2-cutover-fallback-gate.json`），并接入每日 workflow `v2-cutover-fallback-gate.yml`，支持 dry-run 排除与阈值阻断。
34. `2026-03-23`：`V2-W13-03` 已完成，新增 `scripts/ci/v2-release-health-summary.mjs` 与 `.github/workflows/v2-release-health-summary.yml`，每周输出合并健康摘要（RC gate + fallback gate + fallback reason 周环比 + 需处理 reason 清单）。
35. `2026-03-23`：`V2-W14-01` 已完成，周健康摘要新增“连续两周上升 reason”自动识别与 P1 候选输出（md + json artifact），形成 `Need-to-handle -> P1 pool` 可执行闭环。
36. `2026-03-23`：`V2-W14-02` 已完成，新增 `v2-p1-escalation-dispatch`（`scripts/ci/v2-p1-escalation-dispatch.mjs` + `v2-p1-escalation-dispatch-lib.mjs` + workflow/config），可按 `p1CandidateReasons` 自动去重出卡并分派。
37. `2026-03-23`：`V2-W15-01` 已完成，`v2-p1-escalation-dispatch` 新增组织级标准化能力：模板化 issue body（`.github/ISSUE_TEMPLATE/v2-p1-escalation.md`）+ owner route（exact/pattern/default）+ `failOnMissingOwnerRoute` 阻断策略，并补齐对应测试与报告字段。
38. `2026-03-23`：`V2-W15-02` 已完成，`v2-p1-escalation-dispatch` 新增 owner-route/issue-form schema 校验、apply 重试策略与幂等日志落盘（`reports/v2-p1-escalation-dispatch-idempotency.jsonl`），并将 idempotency 证据纳入 workflow artifact。
39. `2026-03-23`：`V2-W15-03` 已完成，新增 `v2-p1-dispatch-quality-gate`（`scripts/ci/v2-p1-dispatch-quality-gate.mjs` + lib + config + workflow 接线），将 dispatch 失败创建预算、重试耗尽与幂等日志解析异常纳入独立质量门禁并产出 gate artifact。
40. `2026-03-23`：`V2-W15-04` 已完成，`v2-release-health-summary` 并入 dispatch-quality-gate 周维结果，新增“连续失败周次”趋势门禁并支持 fail policy，周报可直接输出 dispatch-quality 健康态与趋势阻断信号。
41. `2026-03-23`：`V2-W15-05` 已完成，`v2-p1-escalation-dispatch` 已联动 dispatch-quality 连续失败趋势；当趋势触发时自动追加 `dispatch-quality-consecutive-failed-weeks` 候选，并在 issue 模板携带质量门禁失败上下文（latest run / 连续失败周次 / threshold / 证据路径）。
42. `2026-03-23`：`V2-W15-06` 已完成，`v2-p1-escalation-dispatch` 已新增 workflow run/artifact deep link 上下文字段与 trace comment 回写；新增 `v2-p1-escalation-timeout-gate` 处置超时提醒门禁（含自动 reminder comment 与失败预算检查）。
43. `2026-03-23`：`V2-W15-07` 已完成，`v2-release-health-summary` 并入 timeout gate 周趋势（latest + consecutive failed weeks）与门禁策略，并自动输出 `p1-timeout-consecutive-failed-weeks` 候选；`v2-p1-escalation-dispatch` 已消费 timeout 上下文并支持自动出卡。
44. `2026-03-23`：`V2-W15-08` 已完成，`v2-p1-escalation-timeout-gate` 新增 timeout 候选处置闭环检查（趋势触发必须有 open issue、恢复达阈值后必须闭单）；`v2-release-health-summary` 新增 `timeoutConsecutivePassedWeeks` 供 timeout gate 机审消费，并在 workflow 传入 summary JSON。
45. `2026-03-23`：`V2-W15-09` 已完成，`v2-p1-escalation-timeout-gate` 新增 required label 漂移门禁（`maxLabelDriftIssues`）并升级 issue 抓取策略为 `queryLabels/queryState + 分页`，阻断“标签漂移或分页截断导致陈旧 open 卡逃逸”的监控盲区。
46. `2026-03-23`：`V2-W15-10` 已完成，`v2-p1-escalation-timeout-gate` 新增“恢复观察期持卡”门禁（趋势回落但恢复周数未达阈值时必须保留 timeout 候选 open 卡；达阈值后继续执行关单门禁），将“连续两周观察”转为机审闭环。
47. `2026-03-23`：`V2-W15-11` 已完成，timeout 候选处置链路新增“恢复阈值加严防回退”机审（`candidateCloseout.recoveryThresholdRatcheting`）；稳定窗口触发后要求恢复阈值达到目标值，并将恢复关卡阈值提升到 3 周，避免策略回退导致提前关单。
48. `2026-03-23`：`V2-W15-12` 已完成，新增 `v2-p1-timeout-stability-observation-gate`（script + config + workflow + tests），把“连续两周稳定观察 + label drift + ratchet”升级为每周机审门禁并输出可追溯 artifact。
49. `2026-03-23`：`V2-W15-13` 已完成，`v2-release-health-summary` 并入 timeout-stability 周趋势与 `p1-timeout-stability-consecutive-failed-weeks` 自动升级候选；`v2-p1-escalation-dispatch` 已补齐 timeout-stability issue 模板/字段映射/schema 校验，形成“稳定观察 -> 周报趋势 -> 自动出卡”闭环。
50. `2026-03-23`：`V2-W15-14` 已完成，`v2-p1-escalation-timeout-gate` 新增 timeout-stability 候选处置闭环机审（趋势触发必须有 open 卡、恢复达阈值必须闭单），并升级为 `candidateCloseouts` 多候选策略，补齐报告与测试证据。
51. `2026-03-23`：`V2-W15-15` 已完成，`v2-p1-escalation-timeout-gate` 新增 summary 新鲜度门禁（`generatedAt` 必填 + `maxAgeHours` 时效约束），并补齐 stale/missing summary 的阻断测试，防止基于陈旧周报做错误处置决策。
52. `2026-03-23`：`V2-W15-16` 已完成，`v2-p1-escalation-dispatch` 新增 summary 新鲜度门禁（`summary.requireGeneratedAt/maxAgeHours`），陈旧或缺失 `generatedAt` 的周报将阻断自动出卡并在 dispatch 报告输出 freshness checks 与阻断明细。
53. `2026-03-23`：`V2-W15-17` 已完成，dispatch + timeout 双链路新增 summary 未来时间戳偏移门禁（`summary.maxFutureSkewMinutes`），超过容忍窗口的未来 `generatedAt` 输入将被机审阻断，防止利用未来时间戳绕过 freshness 策略。

---

## 三、任务状态定义

1. `待开工`：已满足 DoR，可领取开发。
2. `进行中`：有代码或脚本进入实施。
3. `阻塞`：缺依赖或决策。
4. `已完成`：满足 DoD，测试证据齐全。

---

## 四、关键路径与并行策略

## 4.1 关键路径

1. `V2-W2-01` -> `V2-W2-02` -> `V2-W3-01` -> `V2-W9-01` -> `V2-W12-02`
2. `V2-W3-02` -> `V2-W4-01` + `V2-W4-02` -> `V2-W5-01` -> `V2-W6-01` -> `V2-W11-01`
3. `V2-W5-01` -> `V2-W5-02` -> `V2-W6-02`

## 4.2 可并行任务

1. SDK 线与后端 social 线可并行推进。
2. Web UI 线可在 `V2-W4-02` 后并行开发。
3. QA 回归矩阵可从 Week 2 即并行起盘。

---

## 五、周任务总览

| 周次 | 任务卡 | 映射 Issue | 优先级 | 状态 |
|------|--------|------------|--------|------|
| Week 1 | `V2-W1-01` ~ `V2-W1-03` | `V2-00` | P0 | `已完成` |
| Week 2 | `V2-W2-01` ~ `V2-W2-04` | `V2-00`/`V2-01`/`V2-02` | P0 | `已完成` |
| Week 3 | `V2-W3-01` ~ `V2-W3-03` | `V2-02`/`V2-20` | P0 | `已完成` |
| Week 4 | `V2-W4-01` ~ `V2-W4-03` | `V2-21`/`V2-02`/`V2-10` | P0 | `已完成` |
| Week 5 | `V2-W5-01` ~ `V2-W5-03` | `V2-22`/`V2-30` | P0 | `已完成` |
| Week 6 | `V2-W6-01` ~ `V2-W6-03` | `V2-23`/`V2-31`/`V2-40` | P1 | `已完成` |
| Week 7 | `V2-W7-01` ~ `V2-W7-02` | `V2-10` | P1 | `已完成` |
| Week 8 | `V2-W8-01` ~ `V2-W8-02` | `V2-10`/`V2-50` | P1 | `已完成` |
| Week 9 | `V2-W9-01` ~ `V2-W9-02` | `V2-11` | P1 | `已完成` |
| Week 10 | `V2-W10-01` ~ `V2-W10-02` | `V2-12` | P1 | `已完成` |
| Week 11 | `V2-W11-01` ~ `V2-W11-02` | `V2-40`/`V2-41` | P1 | `已完成` |
| Week 12 | `V2-W12-01` ~ `V2-W12-02` | `V2-50`/`V2-51` | P0 | `已完成` |
| Week 13 | `V2-W13-01` ~ `V2-W13-03` | `V2-52` | P1 | `已完成` |
| Week 14 | `V2-W14-01` ~ `V2-W14-02` | `V2-52` | P1 | `已完成` |
| Week 15 | `V2-W15-01` ~ `V2-W15-17` | `V2-52` | P1 | `已完成` |

---

## 六、任务卡（可直接开工）

## Week 1（已完成）

### `V2-W1-01` Workspace root scaffold

1. 映射：`V2-00`
2. Owner：`Tech Lead`
3. 依赖：无
4. 关键交付：
   1. `/Users/sxlx/.gemini/antigravity/ZFrog/package.json`
   2. `/Users/sxlx/.gemini/antigravity/ZFrog/pnpm-workspace.yaml`
5. DoD：legacy 启动不受影响，root 脚本可调度子项目。
6. 状态：`已完成`

### `V2-W1-02` apps/packages 软迁移映射

1. 映射：`V2-00`
2. Owner：`Tech Lead`
3. 依赖：`V2-W1-01`
4. 关键交付：`apps/*`、`packages/*` README 映射。
5. DoD：目录映射清晰，不发生源码搬迁。
6. 状态：`已完成`

### `V2-W1-03` V2 周节奏 backlog 冻结

1. 映射：`V2-00`
2. Owner：`Tech Lead`
3. 依赖：`V2-W1-01`
4. 关键交付：V2 计划文档与 backlog 文档首版。
5. DoD：周任务、出口条件、状态定义齐全。
6. 状态：`已完成`

## Week 2（已完成）

### `V2-W2-01` 初始化 `packages/shared` Alpha

1. 映射：`V2-01`
2. Owner：`Tech Lead + FE Owner + Desktop Owner`
3. 依赖：`V2-W1-02`
4. 创建文件：
   1. `packages/shared/package.json`
   2. `packages/shared/tsconfig.json`
   3. `packages/shared/src/types/{api.ts,events.ts,life.ts,travel.ts,social.ts}`
   4. `packages/shared/src/schemas/{api.schema.ts,event.schema.ts}`
   5. `packages/shared/src/index.ts`
   6. `packages/shared/src/__tests__/contract.shared.test.ts`
5. 契约要求：
   1. 统一 `ApiResponse` 与 `ApiError`。
   2. 统一 `DomainEvent<T>`（`eventName/eventVersion/source/payload`）。
6. 测试：
   1. schema parse/serialize contract test。
   2. backend/frontend 至少各一处类型引用 smoke。
7. 回滚：保留端内原类型，按 feature flag 回退 import 路径。
8. DoD：shared 类型被至少两个应用消费。
9. 状态：`已完成`

### `V2-W2-02` 初始化 `packages/client-sdk` Alpha

1. 映射：`V2-02`
2. Owner：`Tech Lead + FE Owner + Desktop Owner`
3. 依赖：`V2-W2-01`
4. 创建文件：
   1. `packages/client-sdk/package.json`
   2. `packages/client-sdk/tsconfig.json`
   3. `packages/client-sdk/src/core/{http.ts,retry.ts,errors.ts,session.ts}`
   4. `packages/client-sdk/src/resources/{auth.ts,health.ts}`
   5. `packages/client-sdk/src/index.ts`
   6. `packages/client-sdk/src/__tests__/http.contract.test.ts`
5. 契约要求：
   1. 默认注入 `requestId/correlationId`。
   2. 支持 timeout/retry/deprecation header 透传。
6. 测试：
   1. mock server contract tests。
   2. frontend 引入 `health` 资源 smoke。
7. 回滚：保留原 `frontend/src/lib/api/client.ts` 作为 fallback。
8. DoD：Web 或 Desktop 至少一个真实调用改走 SDK。
9. 状态：`已完成`

### `V2-W2-03` CI 双入口 smoke

1. 映射：`V2-00`
2. Owner：`Tech Lead + QA Owner`
3. 依赖：`V2-W1-01`
4. 修改文件：
   1. `.github/workflows/*`（或当前 CI 配置文件）
   2. `docs/02_开发计划/ZFrog_V2_任务清单.md`
5. 目标：legacy/workspace 双入口均有 smoke job。
6. 测试：
   1. legacy：`backend build + frontend test`。
   2. workspace：`ws:build:backend + ws:build:frontend`。
7. 回滚：CI 中 workspace job 可单独开关。
8. DoD：CI 报告可区分 legacy/workspace。
9. 状态：`已完成`

### `V2-W2-04` 冻结 V2 social API 命名与错误码

1. 映射：`V2-20`/`V2-21`/`V2-22`
2. Owner：`Tech Lead + BE Owner`
3. 依赖：`V2-W2-01`
4. 修改文件：
   1. `docs/02_开发计划/ZFrog_V2_任务清单.md`
   2. `backend/src/types/api.ts`
   3. `backend/src/api/routes/v2/{index.ts,families.routes.ts,communities.routes.ts,attestations.routes.ts,contract.ts}`
   4. `backend/src/__tests__/e2e/v2-social-contract-routes.e2e.test.ts`
5. 交付：
   1. social API 命名冻结表。
   2. 错误码枚举（`FAMILY_*`/`COMMUNITY_*`/`ATTESTATION_*`）。
   3. `/api/v2` 第一版 contract-only 路由可用（`202 CONTRACT_ONLY`）。
6. 测试：
   1. backend e2e：`v2-social-contract-routes.e2e.test.ts`
   2. backend build：通过
7. DoD：评审通过并入文档基线。
8. 状态：`已完成`

## Week 3

### `V2-W3-01` SDK 资源层首批接入

1. 映射：`V2-02`
2. Owner：`FE Owner + Desktop Owner`
3. 依赖：`V2-W2-02`
4. 修改文件：
   1. `packages/client-sdk/src/resources/{life.ts,travel.ts,social.ts}`
   2. `frontend/src/features/{life,travel,social}/api.ts`
5. DoD：Web 至少 3 个查询改为 SDK 调用且回归通过。
6. 状态：`已完成`

### `V2-W3-02` `/api/v2/families` 最小骨架

1. 映射：`V2-20`
2. Owner：`BE Owner`
3. 依赖：`V2-W2-04`
4. 创建文件：
   1. `backend/src/api/routes/v2/families.routes.ts`
   2. `backend/src/modules/social/family.{command,query,service}.ts`
   3. `backend/src/__tests__/e2e/v2-families-routes.e2e.test.ts`
5. 表结构：复用现有 `families + frog.familyId`（本阶段无新增 migration）。
6. 事件：`FamilyCreated`、`FamilyMemberJoined`。
7. 测试：
   1. `npm --prefix backend run build`
   2. `TEST_DATABASE_URL=$DATABASE_URL npm --prefix backend run test -- --runInBand --testPathPattern=v2-families-routes.e2e.test.ts`
8. DoD：create/get/list members e2e 通过。
9. 状态：`已完成`

### `V2-W3-03` Admin 观测预埋（family）

1. 映射：`V2-50`
2. Owner：`Admin Owner + BE Owner`
3. 依赖：`V2-W3-02`
4. 交付：`/api/admin/domain-events` 增补 family 过滤字段。
5. 测试：
   1. `npm --prefix backend run test -- --runInBand --testPathPattern=admin-cutover-routes.e2e.test.ts`
6. DoD：Admin 可观测 family 事件。
7. 状态：`已完成`

## Week 4

### `V2-W4-01` Community join/list 最小读写骨架

1. 映射：`V2-21`
2. Owner：`BE Owner`
3. 依赖：`V2-W3-02`
4. 创建文件：
   1. `backend/src/api/routes/v2/communities.routes.ts`
   2. `backend/src/modules/social/community.{command,query,service}.ts`
   3. `backend/src/__tests__/e2e/v2-communities-routes.e2e.test.ts`
5. 表结构：复用 `Community`、`UserCommunity`（本阶段无新增 migration）。
6. 事件：`CommunityJoined`。
7. DoD：join/get/members 路由可联调；real-db e2e 用例已就位。
8. 状态：`已完成`

### `V2-W4-02` Community read/write 接入 client-sdk

1. 映射：`V2-02` / `V2-21`
2. Owner：`FE Owner + BE Owner`
3. 依赖：`V2-W4-01`
4. 修改文件：
   1. `packages/client-sdk/src/resources/social.ts`
   2. `frontend/src/features/social/api.ts`
   3. `frontend/src/components/friend-float/JoinCommunityModal.tsx`
   4. `packages/client-sdk/src/__tests__/resources.contract.test.ts`
5. DoD：Web 首批 community 读写调用切到 SDK 并完成回归。
6. 状态：`已完成`

### `V2-W4-03` Web Social Alpha 页面骨架

1. 映射：`V2-10`
2. Owner：`FE Owner`
3. 依赖：`V2-W4-02`
4. 创建文件：
   1. `frontend/src/pages/{FamiliesPage.tsx,CommunitiesPage.tsx}`
   2. `frontend/src/features/social/components/*`
   3. `frontend/src/App.tsx`（路由入口）
   4. `frontend/src/components/common/Navbar.tsx`（导航入口）
5. DoD：页面可读取 family/community 并显示空态/错误态。
6. 状态：`已完成`

## Week 5

### `V2-W5-01` Relationship Attestation 入库

1. 映射：`V2-22`
2. Owner：`BE Owner`
3. 依赖：`V2-W4-02`
4. 创建文件：
   1. `backend/src/api/routes/v2/attestations.routes.ts`
   2. `backend/src/modules/social/attestation.{command,query}.ts`
   3. `backend/src/__tests__/e2e/v2-attestation-routes.e2e.test.ts`
5. 表结构：`relationship_attestations`。
6. 事件：`RelationshipAttested`。
7. DoD：create/query/filter + 幂等测试通过。
8. 状态：`已完成`

### `V2-W5-02` 合约 Attestation adapter

1. 映射：`V2-30`
2. Owner：`Contract Owner + BE Owner`
3. 依赖：`V2-W5-01`
4. 修改文件：
   1. `contracts/scripts/*attestation*.ts`
   2. `backend/src/modules/web3/*attestation*.ts`
5. 表结构：`onchain_milestones` 扩展关联字段。
6. DoD：attestationId/txHash 双向追踪 + replay script 可用。
7. 状态：`已完成`

### `V2-W5-03` Admin Attestation 观测页

1. 映射：`V2-10`/`V2-50`
2. Owner：`Admin Owner`
3. 依赖：`V2-W5-01`
4. 创建文件：`admin/src/pages/Attestations/index.tsx`。
5. DoD：可按状态过滤 pending/confirmed/failed。
6. 状态：`已完成`

## Week 6

### `V2-W6-01` Relationship-memory API

1. 映射：`V2-23`
2. Owner：`BE Owner + AI Owner`
3. 依赖：`V2-W5-01`
4. 创建文件：
   1. `backend/src/modules/soul/relationship-memory.query.ts`
   2. `backend/src/api/routes/v2/relationship-memory.routes.ts`
5. DoD：`GET /api/v2/frogs/:id/relationship-memory` integration 通过。
6. 状态：`已完成`

### `V2-W6-02` Wallet 读取稳定化

1. 映射：`V2-31`
2. Owner：`Contract Owner`
3. 依赖：`V2-W5-02`
4. 交付：标准 wallet query 接口 + `FrogWalletAssetChanged` 事件。
5. DoD：三端展示一致性 smoke 通过。
6. 状态：`已完成`

### `V2-W6-03` Memory summary 生成器 v1

1. 映射：`V2-40`
2. Owner：`AI Owner`
3. 依赖：`V2-W6-01`
4. 表结构：`memory_summaries`。
5. DoD：summary 定时更新脚本可跑。
6. 状态：`已完成`

## Week 7

### `V2-W7-01` Web Family/Community 正式入口

1. 映射：`V2-10`
2. Owner：`FE Owner`
3. 依赖：`V2-W4-03`
4. DoD：创建家庭 -> 加入社区 -> 提交证明流程跑通。
5. 状态：`已完成`

### `V2-W7-02` Web 社交链路 e2e

1. 映射：`V2-50`
2. Owner：`QA Owner + FE Owner`
3. 依赖：`V2-W7-01`
4. DoD：社交主流程 e2e 通过并入 nightly。
5. 状态：`已完成`

## Week 8

### `V2-W8-01` 灰度发布与 fallback 开关

1. 映射：`V2-10`
2. Owner：`FE Owner + BE Owner`
3. 依赖：`V2-W7-01`
4. DoD：按用户灰度放量，异常可秒级回退。
5. 状态：`已完成`

### `V2-W8-02` 回归矩阵 v1

1. 映射：`V2-50`
2. Owner：`QA Owner`
3. 依赖：`V2-W7-02`
4. DoD：contract/integration/e2e/smoke 分层报告可自动生成。
5. 状态：`已完成`

## Week 9

### `V2-W9-01` Desktop 读路径 SDK 化

1. 映射：`V2-11`
2. Owner：`Desktop Owner`
3. 依赖：`V2-W3-01`
4. DoD：life/travel/read hooks 全部委托 SDK。
5. 状态：`已完成`

### `V2-W9-02` Desktop 写路径与 WS 对齐

1. 映射：`V2-11`
2. Owner：`Desktop Owner`
3. 依赖：`V2-W9-01`
4. DoD：写路径切换完成，WS 事件按 shared schema 解析。
5. 状态：`已完成`

## Week 10

### `V2-W10-01` Mobile Lite 工程初始化

1. 映射：`V2-12`
2. Owner：`Mobile Owner + FE Owner`
3. 依赖：`V2-W2-02`
4. 关键交付：`apps/mobile-lite` 初始化完成（PWA-lite + Vite），并接入 `@zfrog/client-sdk` 的 life/travel/social 资源调用。
5. 状态：`已完成`

### `V2-W10-02` Mobile Lite MVP 四页面

1. 映射：`V2-12`
2. Owner：`Mobile Owner`
3. 依赖：`V2-W10-01`
4. DoD：登录、状态、照顾、祈福四页可用；写动作具备输入校验、防重复提交、错误可追踪。
5. 状态：`已完成`

## Week 11

### `V2-W11-01` Prompt-kit 可版本化

1. 映射：`V2-40`
2. Owner：`AI Owner`
3. 依赖：`V2-W6-03`
4. DoD：`POST /api/v2/chat` 可记录 prompt/memory trace。
5. 状态：`已完成`

### `V2-W11-02` Relationship-aware 提醒与聊天

1. 映射：`V2-41`
2. Owner：`Desktop Owner + AI Owner`
3. 依赖：`V2-W11-01`
4. DoD：提醒文案体现关系上下文且具备节流策略。
5. 状态：`已完成`

## Week 12

### `V2-W12-01` RC 回归与发布门禁

1. 映射：`V2-50`
2. Owner：`QA Owner`
3. 依赖：Week 1~11 全量任务
4. DoD：P0/P1 缺陷清零，nightly 连续稳定。
5. 状态：`已完成`

### `V2-W12-02` Workspace 默认入口 cutover

1. 映射：`V2-51`
2. Owner：`Tech Lead`
3. 依赖：`V2-W12-01`
4. 关键交付：
   1. `start.sh` 默认切换到 workspace-first，并支持 `--workspace/--legacy` 显式路由。
   2. 新增 `scripts/cutover/{start-workspace.sh,start-legacy.sh,rollback-to-legacy.sh}`。
   3. 新增 runbook：`docs/02_开发计划/ZFrog_V2_Workspace_Cutover_Runbook.md`。
5. 测试证据：
   1. `bash ./start.sh --workspace --dry-run`
   2. `bash ./start.sh --legacy --dry-run`
   3. `bash ./scripts/cutover/rollback-to-legacy.sh --dry-run`
   4. `npm run ws:list`
6. DoD：workspace 成为默认入口，保留可演练回滚。
7. 状态：`已完成`

## Week 13

### `V2-W13-01` 发布观察闭环（证据归档 + fallback 统计）

1. 映射：`V2-52`
2. Owner：`QA Owner + Tech Lead`
3. 依赖：`V2-W12-02`
4. 关键交付：
   1. 新增 `scripts/ci/v2-rc-gate-archive.mjs`，把 `v2-rc-gate-report` 归档到 `reports/history/v2-rc-gate`（含 run 元数据）。
   2. 更新 `.github/workflows/v2-rc-release-gate.yml`，额外上传 `v2-rc-gate-evidence` artifact。
   3. 新增 `scripts/cutover/log-dev-entry.sh`，记录 workspace/legacy 启动轨迹与 fallback reason。
   4. 新增 `scripts/cutover/legacy-fallback-report.mjs` + `npm run cutover:fallback:report` 生成按窗口统计报告与归档。
5. 测试证据：
   1. `npm run ci:gate:v2-rc:test`
   2. `npm run cutover:fallback:test`
   3. `bash ./start.sh --workspace --dry-run`
   4. `bash ./start.sh --legacy --reason workspace-startup-failed --dry-run`
   5. `npm run cutover:fallback:report`
6. DoD：门禁证据可下载追溯；legacy fallback 次数与原因可按周统计。
7. 状态：`已完成`

### `V2-W13-02` fallback SLO 自动门禁（阈值阻断 + 日报）

1. 映射：`V2-52`
2. Owner：`QA Owner + Tech Lead`
3. 依赖：`V2-W13-01`
4. 关键交付：
   1. 新增 `.github/release-gates/v2-cutover-fallback-gate.json`，冻结窗口、fallback rate、reason budget 阈值。
   2. 新增 `scripts/cutover/legacy-fallback-gate-check.mjs` 与 `legacy-fallback-gate-lib.mjs`，支持 dry-run 排除、阈值判定与 markdown 门禁报告输出。
   3. 新增 `.github/workflows/v2-cutover-fallback-gate.yml`，按日执行 gate、上传 `v2-cutover-fallback-gate-report` artifact 并写入 step summary。
5. 测试证据：
   1. `npm run cutover:fallback:test`
   2. `npm run cutover:fallback:gate -- --config ./.github/release-gates/v2-cutover-fallback-gate.json --log ./reports/cutover/dev-entry.log`
   3. `ruby -ryaml -e "YAML.load_file('.github/workflows/v2-cutover-fallback-gate.yml')"`
6. DoD：fallback 超阈值可自动 FAIL；日报证据可追溯并可下载。
7. 状态：`已完成`

### `V2-W13-03` 周发布健康摘要（双门禁合流 + 周环比）

1. 映射：`V2-52`
2. Owner：`QA Owner + Tech Lead`
3. 依赖：`V2-W13-02`
4. 关键交付：
   1. 新增 `.github/release-gates/v2-release-health-summary.json`，冻结周窗口与 reason 上升告警策略。
   2. 新增 `scripts/ci/v2-release-health-summary.mjs` 与 `v2-release-health-summary-lib.mjs`，汇总 RC gate + fallback gate，并输出 fallback reason 周环比与 Need-to-handle 清单。
   3. 新增 `.github/workflows/v2-release-health-summary.yml`，按周生成并上传 `v2-release-health-summary-report` artifact，同时写入 step summary。
5. 测试证据：
   1. `npm run ci:gate:v2:health-summary:test`
   2. `npm run ci:gate:v2:health-summary -- --rc-runs-fixture ./scripts/ci/fixtures/v2-regression-runs.sample.json --fallback-log ./reports/cutover/dev-entry.log --now 2026-03-23T12:00:00Z --report /tmp/v2-release-health-summary.md`
   3. `ruby -ryaml -e "YAML.load_file('.github/workflows/v2-release-health-summary.yml')"`
6. DoD：单份周报可同时判定 RC/fallback 健康状态并输出需处理 reason。
7. 状态：`已完成`

## Week 14

### `V2-W14-01` Need-to-handle 自动升舱（连续两周上升 -> P1 候选）

1. 映射：`V2-52`
2. Owner：`QA Owner + Tech Lead`
3. 依赖：`V2-W13-03`
4. 关键交付：
   1. `scripts/ci/v2-release-health-summary-lib.mjs` 支持多窗口趋势比较，并识别同一 reason 连续两周环比上升。
   2. `scripts/ci/v2-release-health-summary.mjs` 新增 `--summary-json` 输出，落地 `p1CandidateReasons` 机器可读结果。
   3. `.github/workflows/v2-release-health-summary.yml` 上传 `md + json` 双 artifact，支持周例会与自动化消费。
   4. `.github/release-gates/v2-release-health-summary.json` 冻结连续上升策略开关（track/fail）。
5. 测试证据：
   1. `npm run ci:gate:v2:health-summary:test`
   2. `npm run ci:gate:v2:health-summary -- --rc-runs-fixture ./scripts/ci/fixtures/v2-regression-runs.sample.json --fallback-log ./reports/cutover/dev-entry.log --now 2026-03-23T12:00:00Z --report /tmp/v2-release-health-summary.md --summary-json /tmp/v2-release-health-summary.json`
   3. `ruby -ryaml -e "YAML.load_file('.github/workflows/v2-release-health-summary.yml')"`
6. DoD：当同一 reason 连续两周上升时，可在周报中明确产出 P1 候选清单并可被机器消费。
7. 状态：`已完成`

### `V2-W14-02` P1 修复卡自动生成/分派

1. 映射：`V2-52`
2. Owner：`QA Owner + Tech Lead`
3. 依赖：`V2-W14-01`
4. 关键交付：
   1. 新增 `.github/release-gates/v2-p1-escalation-dispatch.json`，冻结标题前缀、labels、assignee mapping 与单次出卡上限。
   2. 新增 `scripts/ci/v2-p1-escalation-dispatch.mjs` 与 `v2-p1-escalation-dispatch-lib.mjs`，读取 `p1CandidateReasons` 并按 reason 生成 issue payload，支持 open issue 去重、`dry-run/apply` 双模式与 markdown/json 报告。
   3. 新增 `.github/workflows/v2-p1-escalation-dispatch.yml`，周维度自动执行“生成 summary -> 自动分派 P1 修复卡”，并上传 dispatch artifact。
   4. 新增 `scripts/ci/v2-p1-escalation-dispatch-lib.test.mjs` 与 fixtures，覆盖去重、配额、报告渲染路径。
5. 测试证据：
   1. `npm run ci:gate:v2:p1-dispatch:test`
   2. `npm run ci:gate:v2:p1-dispatch -- --summary-json ./scripts/ci/fixtures/v2-release-health-summary.sample.json --open-issues-fixture ./scripts/ci/fixtures/v2-open-issues.sample.json --report /tmp/v2-p1-escalation-dispatch.md --out-json /tmp/v2-p1-escalation-dispatch.json`
   3. `ruby -ryaml -e "YAML.load_file('.github/workflows/v2-p1-escalation-dispatch.yml')"`
6. DoD：当 `p1CandidateReasons` 非空时，系统可自动生成去重后的 P1 修复卡并沉淀可追溯 artifact。
7. 状态：`已完成`

## Week 15

### `V2-W15-01` P1 修复卡标准化（模板 + owner route 策略）

1. 映射：`V2-52`
2. Owner：`QA Owner + Tech Lead`
3. 依赖：`V2-W14-02`
4. 关键交付：
   1. 新增 `.github/ISSUE_TEMPLATE/v2-p1-escalation.md`，统一 P1 修复卡内容结构与变量占位。
   2. 升级 `scripts/ci/v2-p1-escalation-dispatch-lib.mjs`，支持模板渲染与 owner route 解析（`reasonOwnerRoutes`/`ownerRoutePatterns`/`defaultOwnerRoute`）。
   3. 升级 `.github/release-gates/v2-p1-escalation-dispatch.json`，冻结 owner route 标签前缀、默认路由与 `failOnMissingOwnerRoute` 门禁策略。
   4. 升级 dispatch 报告，新增 owner route 维度与 `skip-owner-route-missing` 统计。
   5. 新增测试用例覆盖 owner route 缺失阻断与模板渲染。
5. 测试证据：
   1. `npm run ci:gate:v2:p1-dispatch:test`
   2. `npm run ci:gate:v2:p1-dispatch -- --summary-json ./scripts/ci/fixtures/v2-release-health-summary.sample.json --open-issues-fixture ./scripts/ci/fixtures/v2-open-issues.sample.json --report /tmp/v2-p1-escalation-dispatch.md --out-json /tmp/v2-p1-escalation-dispatch.json`
   3. `ruby -ryaml -e "YAML.load_file('.github/workflows/v2-p1-escalation-dispatch.yml')"`
6. DoD：P1 修复卡 body 与 owner route 可标准化生成，且 owner route 缺失可按策略阻断并留痕。
7. 状态：`已完成`

### `V2-W15-02` P1 分派安全闭环（schema 校验 + apply 重试 + 幂等日志）

1. 映射：`V2-52`
2. Owner：`QA Owner + Tech Lead`
3. 依赖：`V2-W15-01`
4. 关键交付：
   1. 升级 `scripts/ci/v2-p1-escalation-dispatch-lib.mjs`，新增 owner-route 配置 schema 校验与 issue-form 字段映射 schema 校验（模板 token 覆盖检查）。
   2. 升级 `scripts/ci/v2-p1-escalation-dispatch.mjs`，`--apply` 模式增加可配置重试策略（重试次数/退避/状态码）。
   3. 新增幂等日志落盘 `reports/v2-p1-escalation-dispatch-idempotency.jsonl`，重跑时优先命中日志避免重复出卡。
   4. 升级 `.github/release-gates/v2-p1-escalation-dispatch.json`，冻结 `issueForm`、`applyRetry` 与 `idempotency.logPath` 配置。
   5. 升级 `.github/workflows/v2-p1-escalation-dispatch.yml`，将幂等日志纳入 artifact。
5. 测试证据：
   1. `npm run ci:gate:v2:p1-dispatch:test`
   2. `npm run ci:gate:v2:p1-dispatch -- --summary-json ./scripts/ci/fixtures/v2-release-health-summary.sample.json --open-issues-fixture /tmp/v2-open-issues-empty.json --report /tmp/v2-p1-escalation-dispatch-w1502-empty.md --out-json /tmp/v2-p1-escalation-dispatch-w1502-empty.json`
   3. `ruby -ryaml -e "YAML.load_file('.github/workflows/v2-p1-escalation-dispatch.yml')"`
6. DoD：dispatch 在执行前可阻断无效 schema，执行中具备失败重试能力，执行后可通过幂等日志与 artifact 追溯并抑制重复出卡。
7. 状态：`已完成`

### `V2-W15-03` P1 出卡执行质量门禁（失败重试结果 + 幂等日志统计）

1. 映射：`V2-52`
2. Owner：`QA Owner + Tech Lead`
3. 依赖：`V2-W15-02`
4. 关键交付：
   1. 新增 `.github/release-gates/v2-p1-dispatch-quality-gate.json`，冻结 `maxFailedCreatesPerRun/maxRetryExhausted/maxIdempotencyParseErrors` 阈值。
   2. 新增 `scripts/ci/v2-p1-dispatch-quality-gate.mjs` 与 `v2-p1-dispatch-quality-gate-lib.mjs`，读取 dispatch 结果与幂等日志，输出 gate verdict + markdown/json 报告。
   3. 升级 `.github/workflows/v2-p1-escalation-dispatch.yml`，在 dispatch 之后执行 quality gate，并将 gate 报告写入 step summary 与 artifact。
   4. 新增 `scripts/ci/v2-p1-dispatch-quality-gate-lib.test.mjs`，覆盖通过/失败阈值、重试耗尽判定与报告渲染路径。
   5. 升级 root `package.json`，新增 `ci:gate:v2:p1-dispatch:quality` 与 `ci:gate:v2:p1-dispatch:quality:test` 命令。
5. 测试证据：
   1. `npm run ci:gate:v2:p1-dispatch:test`
   2. `npm run ci:gate:v2:p1-dispatch:quality:test`
   3. `npm run ci:gate:v2:p1-dispatch -- --summary-json ./scripts/ci/fixtures/v2-release-health-summary.sample.json --open-issues-fixture ./scripts/ci/fixtures/v2-open-issues.sample.json --report /tmp/v2-p1-escalation-dispatch-w1503.md --out-json /tmp/v2-p1-escalation-dispatch-w1503.json`
   4. `npm run ci:gate:v2:p1-dispatch:quality -- --config ./.github/release-gates/v2-p1-dispatch-quality-gate.json --dispatch-json /tmp/v2-p1-escalation-dispatch-w1503.json --idempotency-log /tmp/v2-p1-escalation-dispatch-w1503-idempotency.jsonl --report /tmp/v2-p1-dispatch-quality-gate.md --out-json /tmp/v2-p1-dispatch-quality-gate.json`
   5. `ruby -ryaml -e "YAML.load_file('.github/workflows/v2-p1-escalation-dispatch.yml')"`
6. DoD：P1 自动出卡流程具备独立执行质量门禁，失败创建超预算、重试耗尽或幂等日志解析异常可被机审识别并阻断。
7. 状态：`已完成`

### `V2-W15-04` 周健康摘要并入 dispatch-quality + 连续失败周次门禁

1. 映射：`V2-52`
2. Owner：`QA Owner + Tech Lead`
3. 依赖：`V2-W15-03`
4. 关键交付：
   1. 升级 `scripts/ci/v2-release-health-summary.mjs`，新增 dispatch-quality workflow runs 数据源（fixture/GitHub）并写入 summary JSON。
   2. 升级 `scripts/ci/v2-release-health-summary-lib.mjs`，新增 `evaluateDispatchQualityTrend`，支持按周计算连续失败次数与 trend gate 判定。
   3. 升级 `.github/release-gates/v2-release-health-summary.json`，新增 `dispatchQuality` 策略（`events`、`consecutiveFailureWeeks`、`failOnLatestFailure`、`failOnConsecutiveFailureWeeks`）。
   4. 新增 `scripts/ci/fixtures/v2-dispatch-quality-runs.sample.json` 并补齐 `v2-release-health-summary-lib.test.mjs` 覆盖 dispatch-quality 趋势判定与报告渲染。
   5. 升级 `v2-release-health-summary` 报告与 JSON 输出，新增 dispatch-quality gate 行、趋势段落与策略回显。
5. 测试证据：
   1. `npm run ci:gate:v2:health-summary:test`
   2. `npm run ci:gate:v2:health-summary -- --summary-config ./.github/release-gates/v2-release-health-summary.json --rc-config ./.github/release-gates/v2-rc-gate.json --fallback-config ./.github/release-gates/v2-cutover-fallback-gate.json --rc-runs-fixture ./scripts/ci/fixtures/v2-regression-runs.sample.json --dispatch-quality-runs-fixture ./scripts/ci/fixtures/v2-dispatch-quality-runs.sample.json --fallback-log ./reports/cutover/dev-entry.log --now 2026-03-23T12:00:00Z --report /tmp/v2-release-health-summary-w1504.md --summary-json /tmp/v2-release-health-summary-w1504.json`
   3. 连续失败门禁验证（预期非零退出）：`npm run ci:gate:v2:health-summary -- --summary-config ./.github/release-gates/v2-release-health-summary.json --rc-config ./.github/release-gates/v2-rc-gate.json --fallback-config ./.github/release-gates/v2-cutover-fallback-gate.json --rc-runs-fixture ./scripts/ci/fixtures/v2-regression-runs.sample.json --dispatch-quality-runs-fixture /tmp/v2-dispatch-quality-runs.fail2.json --fallback-log ./reports/cutover/dev-entry.log --now 2026-03-23T12:00:00Z --report /tmp/v2-release-health-summary-w1504-fail.md --summary-json /tmp/v2-release-health-summary-w1504-fail.json`
6. DoD：周健康摘要可统一展示 RC/fallback/dispatch-quality 三门禁，且 dispatch-quality 连续失败周次达到阈值时可机审阻断。
7. 状态：`已完成`

### `V2-W15-05` dispatch-quality 趋势联动 P1 自动出卡（附失败上下文）

1. 映射：`V2-52`
2. Owner：`QA Owner + Tech Lead`
3. 依赖：`V2-W15-04`
4. 关键交付：
   1. 升级 `scripts/ci/v2-p1-escalation-dispatch-lib.mjs`：当 `dispatchQualityConsecutiveFailureDetected=true` 时自动注入 `dispatch-quality-consecutive-failed-weeks` 候选 reason，参与同一套去重/owner-route/quota 机制。
   2. 升级 `.github/ISSUE_TEMPLATE/v2-p1-escalation.md` 与默认模板上下文，新增 dispatch-quality 字段（latest run、连续失败周次、threshold、pass/fail）与证据文件引用。
   3. 升级 `.github/release-gates/v2-p1-escalation-dispatch.json`：新增 `^dispatch-quality-` owner-route 规则，扩展 `issueForm.requiredFieldIds/fieldMap` 覆盖新增上下文字段，并将 titlePrefix 前移到 `V2-W15-05`。
   4. 升级 `scripts/ci/fixtures/v2-release-health-summary.sample.json` 与 `scripts/ci/fixtures/v2-open-issues.sample.json`，保持样例与新配置对齐。
   5. 补齐 `scripts/ci/v2-p1-escalation-dispatch-lib.test.mjs`：覆盖“趋势触发自动生成 dispatch-quality 候选 + issue body 注入失败上下文”路径。
5. 测试证据：
   1. `npm run ci:gate:v2:p1-dispatch:test`
   2. `npm run ci:gate:v2:p1-dispatch -- --summary-json ./scripts/ci/fixtures/v2-release-health-summary.sample.json --open-issues-fixture ./scripts/ci/fixtures/v2-open-issues.sample.json --report /tmp/v2-p1-escalation-dispatch-w1505.md --out-json /tmp/v2-p1-escalation-dispatch-w1505.json`
   3. 趋势触发验证：`npm run ci:gate:v2:p1-dispatch -- --summary-json /tmp/v2-release-health-summary.dispatch-trend.json --open-issues-fixture ./scripts/ci/fixtures/v2-open-issues.sample.json --report /tmp/v2-p1-escalation-dispatch-w1505-dispatch-trend.md --out-json /tmp/v2-p1-escalation-dispatch-w1505-dispatch-trend.json`
6. DoD：dispatch-quality 连续失败趋势可自动触发 P1 候选并出卡，且卡片正文可直接携带质量门禁失败上下文，不依赖人工补写。
7. 状态：`已完成`

### `V2-W15-06` P1 issue 双向追溯 + 处置超时提醒门禁

1. 映射：`V2-52`
2. Owner：`QA Owner + Tech Lead`
3. 依赖：`V2-W15-05`
4. 关键交付：
   1. 升级 `scripts/ci/v2-p1-escalation-dispatch-lib.mjs` 与 `.github/ISSUE_TEMPLATE/v2-p1-escalation.md`，新增 dispatch workflow run/artifacts deep link 字段，P1 issue 正文可直接追溯到对应 workflow。
   2. 升级 `scripts/ci/v2-p1-escalation-dispatch.mjs`，`--apply` 模式对 `created/skip-existing/skip-idempotency-log` issue 自动写入 trace comment（含 run URL + artifacts deep link），并以 marker 防同 run 重复回写。
   3. 新增 `.github/release-gates/v2-p1-escalation-timeout-gate.json`、`scripts/ci/v2-p1-escalation-timeout-gate.mjs` 与 `v2-p1-escalation-timeout-gate-lib.mjs`，按 `maxOpenHours/maxIdleHours` 检测处置超时并支持 reminder comment 自动提醒。
   4. 升级 `.github/workflows/v2-p1-escalation-dispatch.yml`，串联 dispatch -> quality gate -> timeout gate，并上传 timeout gate 报告 artifact。
   5. 新增 fixture `scripts/ci/fixtures/v2-p1-open-issues-timeout.sample.json` 与测试 `scripts/ci/v2-p1-escalation-timeout-gate-lib.test.mjs`；root scripts 新增 `ci:gate:v2:p1-timeout*` 命令。
5. 测试证据：
   1. `npm run ci:gate:v2:p1-dispatch:test`
   2. `npm run ci:gate:v2:p1-timeout:test`
   3. `npm run ci:gate:v2:p1-dispatch -- --summary-json ./scripts/ci/fixtures/v2-release-health-summary.sample.json --open-issues-fixture ./scripts/ci/fixtures/v2-open-issues.sample.json --report /tmp/v2-p1-escalation-dispatch-w1506.md --out-json /tmp/v2-p1-escalation-dispatch-w1506.json --workflow-run-url https://example.test/zfrog/actions/runs/777 --workflow-artifacts-url https://example.test/zfrog/actions/runs/777#artifacts --run-id 777 --run-attempt 2`
   4. timeout gate 告警样例（预期非零）：`npm run ci:gate:v2:p1-timeout -- --config ./.github/release-gates/v2-p1-escalation-timeout-gate.json --open-issues-fixture ./scripts/ci/fixtures/v2-p1-open-issues-timeout.sample.json --report /tmp/v2-p1-escalation-timeout-gate.md --out-json /tmp/v2-p1-escalation-timeout-gate.json --now 2026-03-23T12:00:00Z --workflow-run-url https://example.test/zfrog/actions/runs/777 --workflow-artifacts-url https://example.test/zfrog/actions/runs/777#artifacts --run-id 777 --apply-reminder false`
   5. timeout gate 通过样例：`npm run ci:gate:v2:p1-timeout -- --config /tmp/v2-p1-escalation-timeout-gate-pass.json --open-issues-fixture ./scripts/ci/fixtures/v2-p1-open-issues-timeout.sample.json --report /tmp/v2-p1-escalation-timeout-gate-pass.md --out-json /tmp/v2-p1-escalation-timeout-gate-pass.json.out --now 2026-03-23T12:00:00Z --workflow-run-url https://example.test/zfrog/actions/runs/777 --workflow-artifacts-url https://example.test/zfrog/actions/runs/777#artifacts --run-id 777`
   6. `ruby -ryaml -e "YAML.load_file('.github/workflows/v2-p1-escalation-dispatch.yml')"`
6. DoD：趋势触发的 P1 issue 与 workflow run/artifact 完成双向追溯，且超时 issue 可被门禁识别并自动提醒，提醒失败可被预算门禁拦截。
7. 状态：`已完成`

### `V2-W15-07` timeout gate 并入周健康摘要 + 自动升级候选

1. 映射：`V2-52`
2. Owner：`QA Owner + Tech Lead`
3. 依赖：`V2-W15-06`
4. 关键交付：
   1. 升级 `scripts/ci/v2-release-health-summary.mjs` 与 `v2-release-health-summary-lib.mjs`，新增 timeout gate workflow runs 数据源（fixture/GitHub）、连续失败周次趋势判定、门禁策略回显与 summary JSON 输出字段（`timeout*`）。
   2. 升级 `.github/release-gates/v2-release-health-summary.json`，新增 `timeoutGate` 策略（`events`、`consecutiveFailureWeeks`、`failOnLatestFailure`、`failOnConsecutiveFailureWeeks`）。
   3. 升级 `reports/v2-release-health-summary.json` 机器可读候选输出：当 timeout 连续失败趋势触发时自动追加 `p1-timeout-consecutive-failed-weeks`。
   4. 升级 `scripts/ci/v2-p1-escalation-dispatch-lib.mjs` 与 `.github/ISSUE_TEMPLATE/v2-p1-escalation.md`，补齐 timeout 上下文字段（passed/latest/consecutive/threshold/url）并支持 timeout 候选自动出卡。
   5. 新增/更新 fixture 与测试：`scripts/ci/fixtures/v2-p1-timeout-runs.sample.json`、`v2-release-health-summary-lib.test.mjs`、`v2-p1-escalation-dispatch-lib.test.mjs`。
5. 测试证据：
   1. `npm run ci:gate:v2:health-summary:test`
   2. `npm run ci:gate:v2:p1-dispatch:test`
   3. `npm run ci:gate:v2:p1-timeout:test`
   4. timeout 并入 PASS 样例：`npm run ci:gate:v2:health-summary -- --summary-config ./.github/release-gates/v2-release-health-summary.json --rc-config ./.github/release-gates/v2-rc-gate.json --fallback-config ./.github/release-gates/v2-cutover-fallback-gate.json --rc-runs-fixture ./scripts/ci/fixtures/v2-regression-runs.sample.json --dispatch-quality-runs-fixture ./scripts/ci/fixtures/v2-dispatch-quality-runs.sample.json --timeout-runs-fixture ./scripts/ci/fixtures/v2-p1-timeout-runs.sample.json --fallback-log ./reports/cutover/dev-entry.log --now 2026-03-23T12:00:00Z --report /tmp/v2-release-health-summary-w1507.md --summary-json /tmp/v2-release-health-summary-w1507.json`
   5. timeout 连续失败门禁样例（预期非零）：`npm run ci:gate:v2:health-summary -- --summary-config ./.github/release-gates/v2-release-health-summary.json --rc-config ./.github/release-gates/v2-rc-gate.json --fallback-config ./.github/release-gates/v2-cutover-fallback-gate.json --rc-runs-fixture ./scripts/ci/fixtures/v2-regression-runs.sample.json --dispatch-quality-runs-fixture ./scripts/ci/fixtures/v2-dispatch-quality-runs.sample.json --timeout-runs-fixture /tmp/v2-p1-timeout-runs.fail2.json --fallback-log ./reports/cutover/dev-entry.log --now 2026-03-23T12:00:00Z --report /tmp/v2-release-health-summary-w1507-timeout-fail.md --summary-json /tmp/v2-release-health-summary-w1507-timeout-fail.json`
   6. timeout 候选出卡 dry-run：`npm run ci:gate:v2:p1-dispatch -- --config ./.github/release-gates/v2-p1-escalation-dispatch.json --summary-json /tmp/v2-release-health-summary-w1507-timeout-fail.json --open-issues-fixture /tmp/v2-open-issues-empty.json --report /tmp/v2-p1-escalation-dispatch-w1507-timeout.md --out-json /tmp/v2-p1-escalation-dispatch-w1507-timeout.json --workflow-run-url https://example.test/zfrog/actions/runs/888 --workflow-artifacts-url https://example.test/zfrog/actions/runs/888#artifacts --run-id 888 --run-attempt 1`
6. DoD：周健康摘要可统一展示 RC/fallback/dispatch-quality/timeout 四门禁，timeout 连续失败趋势可机审阻断并自动输出升级候选，且候选卡片正文具备 timeout 证据上下文。
7. 状态：`已完成`

### `V2-W15-08` timeout 候选处置闭环机审（恢复即关单）

1. 映射：`V2-52`
2. Owner：`QA Owner + Tech Lead`
3. 依赖：`V2-W15-07`
4. 关键交付：
   1. 升级 `scripts/ci/v2-release-health-summary-lib.mjs` 与 `v2-release-health-summary.mjs`，新增 `timeoutConsecutivePassedWeeks`（并同步 `dispatchQualityConsecutivePassedWeeks`）机器可读字段，输出到 `reports/v2-release-health-summary.json`。
   2. 升级 `scripts/ci/v2-p1-escalation-timeout-gate-lib.mjs`，新增 candidate closeout 校验：
      1. timeout 趋势触发（`timeoutConsecutiveFailureDetected=true`）时，`p1-timeout-consecutive-failed-weeks` 必须存在 open issue。
      2. timeout 连续恢复周次达到阈值（默认 2）后，`p1-timeout-consecutive-failed-weeks` open issue 必须清零（关闭处置）。
   3. 升级 `scripts/ci/v2-p1-escalation-timeout-gate.mjs`，支持 `--summary-json` 输入并将 summary source 写入 markdown/json 报告。
   4. 升级 `.github/release-gates/v2-p1-escalation-timeout-gate.json`，冻结 `candidateCloseout` 策略（reason/开卡下限/恢复阈值/恢复后开卡上限）；升级 `.github/workflows/v2-p1-escalation-dispatch.yml` 传入 summary JSON。
   5. 补齐测试：`scripts/ci/v2-p1-escalation-timeout-gate-lib.test.mjs` 覆盖“趋势触发缺卡失败/恢复后未关卡失败/恢复后关卡通过”；`v2-release-health-summary-lib.test.mjs` 覆盖连续成功周次输出字段。
5. 测试证据：
   1. `npm run ci:gate:v2:health-summary:test`
   2. `npm run ci:gate:v2:p1-dispatch:test`
   3. `npm run ci:gate:v2:p1-timeout:test`
   4. summary PASS 样例：`npm run ci:gate:v2:health-summary -- --summary-config ./.github/release-gates/v2-release-health-summary.json --rc-config ./.github/release-gates/v2-rc-gate.json --fallback-config ./.github/release-gates/v2-cutover-fallback-gate.json --rc-runs-fixture ./scripts/ci/fixtures/v2-regression-runs.sample.json --dispatch-quality-runs-fixture ./scripts/ci/fixtures/v2-dispatch-quality-runs.sample.json --timeout-runs-fixture ./scripts/ci/fixtures/v2-p1-timeout-runs.sample.json --fallback-log ./reports/cutover/dev-entry.log --now 2026-03-23T12:00:00Z --report /tmp/v2-release-health-summary-w1508.md --summary-json /tmp/v2-release-health-summary-w1508.json`
   5. timeout closeout PASS 样例：`npm run ci:gate:v2:p1-timeout -- --config /tmp/v2-p1-escalation-timeout-gate-pass-w1508.json --open-issues-fixture ./scripts/ci/fixtures/v2-p1-open-issues-timeout.sample.json --summary-json ./scripts/ci/fixtures/v2-release-health-summary.sample.json --report /tmp/v2-p1-escalation-timeout-gate-w1508-pass.md --out-json /tmp/v2-p1-escalation-timeout-gate-w1508-pass.json --now 2026-03-23T12:00:00Z --workflow-run-url https://example.test/zfrog/actions/runs/999 --workflow-artifacts-url https://example.test/zfrog/actions/runs/999#artifacts --run-id 999`
   6. timeout closeout FAIL 样例（预期非零）：`npm run ci:gate:v2:p1-timeout -- --config ./.github/release-gates/v2-p1-escalation-timeout-gate.json --open-issues-fixture /tmp/v2-p1-open-issues-timeout-candidate.json --summary-json /tmp/v2-release-health-summary-timeout-recovered.json --report /tmp/v2-p1-escalation-timeout-gate-w1508-fail.md --out-json /tmp/v2-p1-escalation-timeout-gate-w1508-fail.json --now 2026-03-23T12:00:00Z --workflow-run-url https://example.test/zfrog/actions/runs/1001 --workflow-artifacts-url https://example.test/zfrog/actions/runs/1001#artifacts --run-id 1001 --apply-reminder false`
6. DoD：timeout 候选的“触发->出卡->处置->恢复后关卡”链路可被机审阻断，避免持续恢复后仍遗留陈旧 open 卡；报告与 artifact 具备 summary 证据追溯能力。
7. 状态：`已完成`

### `V2-W15-09` timeout 标签漂移闭环机审（防监控逃逸）

1. 映射：`V2-52`
2. Owner：`QA Owner + Tech Lead`
3. 依赖：`V2-W15-08`
4. 关键交付：
   1. 升级 `scripts/ci/v2-p1-escalation-timeout-gate-lib.mjs`，新增 required label 合规检查（`required-label-compliance`）与 `labelDriftIssues` 输出，支持统计缺失标签的 open P1 issue 并纳入 gate verdict。
   2. 升级 `scripts/ci/v2-p1-escalation-timeout-gate.mjs`，将 issue 拉取从单页改为分页抓取（`per_page + page`），并支持 `queryLabels/queryState` 配置，避免仅看第一页或 `need-triage` 标签导致的监控盲区。
   3. 升级 `.github/release-gates/v2-p1-escalation-timeout-gate.json`：冻结 `queryLabels`、`queryState`、`maxLabelDriftIssues` 策略，并前移 titlePrefix 到 `V2-W15-09`。
   4. 升级 `scripts/ci/v2-p1-escalation-timeout-gate-lib.test.mjs`，补“label drift 触发 FAIL”测试，确保标签漂移可被机审阻断。
   5. 升级 `.github/release-gates/v2-p1-escalation-dispatch.json` titlePrefix 到 `V2-W15-09`，保证新增修复卡版本一致。
5. 测试证据：
   1. `npm run ci:gate:v2:p1-timeout:test`
   2. `npm run ci:gate:v2:p1-dispatch:test`
   3. timeout PASS 样例：`npm run ci:gate:v2:p1-timeout -- --config /tmp/v2-p1-escalation-timeout-gate-pass-w1509.json --open-issues-fixture ./scripts/ci/fixtures/v2-p1-open-issues-timeout.sample.json --summary-json ./scripts/ci/fixtures/v2-release-health-summary.sample.json --report /tmp/v2-p1-escalation-timeout-gate-w1509-pass.md --out-json /tmp/v2-p1-escalation-timeout-gate-w1509-pass.json --now 2026-03-23T12:00:00Z --workflow-run-url https://example.test/zfrog/actions/runs/1209 --workflow-artifacts-url https://example.test/zfrog/actions/runs/1209#artifacts --run-id 1209 --apply-reminder false`
   4. label drift FAIL 样例（预期非零）：`npm run ci:gate:v2:p1-timeout -- --config /tmp/v2-p1-escalation-timeout-gate-label-drift-w1509.json --open-issues-fixture /tmp/v2-p1-open-issues-timeout-label-drift-w1509.json --summary-json ./scripts/ci/fixtures/v2-release-health-summary.sample.json --report /tmp/v2-p1-escalation-timeout-gate-label-drift-w1509.md --out-json /tmp/v2-p1-escalation-timeout-gate-label-drift-w1509.json.out --now 2026-03-23T12:00:00Z --workflow-run-url https://example.test/zfrog/actions/runs/1210 --workflow-artifacts-url https://example.test/zfrog/actions/runs/1210#artifacts --run-id 1210 --apply-reminder false`
   5. dispatch dry-run：`npm run ci:gate:v2:p1-dispatch -- --config ./.github/release-gates/v2-p1-escalation-dispatch.json --summary-json ./scripts/ci/fixtures/v2-release-health-summary.sample.json --open-issues-fixture ./scripts/ci/fixtures/v2-open-issues.sample.json --report /tmp/v2-p1-escalation-dispatch-w1509.md --out-json /tmp/v2-p1-escalation-dispatch-w1509.json --workflow-run-url https://example.test/zfrog/actions/runs/1309 --workflow-artifacts-url https://example.test/zfrog/actions/runs/1309#artifacts --run-id 1309 --run-attempt 1`
   6. `ruby -ryaml -e "YAML.load_file('.github/workflows/v2-p1-escalation-dispatch.yml')"`
6. DoD：timeout 门禁可阻断“标签漂移 + 分页截断”引发的监控逃逸风险，陈旧 open 卡不会因标签变化或抓取范围不足而绕过机审。
7. 状态：`已完成`

### `V2-W15-10` timeout 恢复观察期持卡门禁（防提前关单）

1. 映射：`V2-52`
2. Owner：`QA Owner + Tech Lead`
3. 依赖：`V2-W15-09`
4. 关键交付：
   1. 升级 `scripts/ci/v2-p1-escalation-timeout-gate-lib.mjs`，在 candidate closeout 规则中新增 observation hold 检查：当 timeout 趋势已回落但 `timeoutConsecutivePassedWeeks < recoveryConsecutivePassedWeeks` 时，`p1-timeout-consecutive-failed-weeks` 必须保持 open（避免提前关单）。
   2. 升级 timeout gate 报告，新增 observation hold 状态输出（`shouldHoldOpenBeforeRecovery` + `minOpenIssuesBeforeRecoveryCloseout`），保证周报可追溯“观察窗口是否被保留”。
   3. 升级 `.github/release-gates/v2-p1-escalation-timeout-gate.json`：在 `candidateCloseout` 冻结 `minOpenIssuesBeforeRecoveryCloseout`，并前移 titlePrefix 到 `V2-W15-10`；同步 `.github/release-gates/v2-p1-escalation-dispatch.json` titlePrefix 到 `V2-W15-10`。
   4. 升级 `scripts/ci/v2-p1-escalation-timeout-gate-lib.test.mjs`，补齐“恢复窗口未达阈值提前关单 FAIL”和“观察窗口持卡 PASS”用例。
5. 测试证据：
   1. `npm run ci:gate:v2:p1-timeout:test`
   2. timeout 观察期提前关单 FAIL 样例（预期非零）：`npm run ci:gate:v2:p1-timeout -- --config /tmp/v2-p1-escalation-timeout-gate-w1510.json --open-issues-fixture /tmp/v2-p1-open-issues-timeout-empty.json --summary-json /tmp/v2-release-health-summary-timeout-recovering.json --report /tmp/v2-p1-escalation-timeout-gate-w1510-fail.md --out-json /tmp/v2-p1-escalation-timeout-gate-w1510-fail.json --now 2026-03-23T12:00:00Z --workflow-run-url https://example.test/zfrog/actions/runs/1510 --workflow-artifacts-url https://example.test/zfrog/actions/runs/1510#artifacts --run-id 1510 --apply-reminder false`
   3. timeout 观察期持卡 PASS 样例：`npm run ci:gate:v2:p1-timeout -- --config /tmp/v2-p1-escalation-timeout-gate-w1510.json --open-issues-fixture /tmp/v2-p1-open-issues-timeout-w1510.json --summary-json /tmp/v2-release-health-summary-timeout-recovering.json --report /tmp/v2-p1-escalation-timeout-gate-w1510-pass.md --out-json /tmp/v2-p1-escalation-timeout-gate-w1510-pass.json --now 2026-03-23T12:00:00Z --workflow-run-url https://example.test/zfrog/actions/runs/1510 --workflow-artifacts-url https://example.test/zfrog/actions/runs/1510#artifacts --run-id 1510 --apply-reminder false`
6. DoD：timeout 候选处置链路从“趋势触发开卡 -> 恢复达阈值关卡”升级为“趋势触发开卡 -> 恢复观察期持卡 -> 恢复达阈值关卡”，连续两周观察不再依赖人工。
7. 状态：`已完成`

### `V2-W15-11` timeout 恢复阈值加严防回退门禁（防策略降级）

1. 映射：`V2-52`
2. Owner：`QA Owner + Tech Lead`
3. 依赖：`V2-W15-10`
4. 关键交付：
   1. 升级 `scripts/ci/v2-p1-escalation-timeout-gate-lib.mjs`，在 `candidateCloseout` 增加 `recoveryThresholdRatcheting` 机审：
      1. 当 timeout 趋势回落且连续恢复周次达到稳定窗口（默认 2 周）后，强制 `recoveryConsecutivePassedWeeks` 不低于目标值（默认 3 周）。
      2. 报告输出 ratchet 状态（是否启用、是否达到强制条件、target/current、是否满足）。
   2. 升级 `.github/release-gates/v2-p1-escalation-timeout-gate.json`：
      1. `candidateCloseout.recoveryConsecutivePassedWeeks` 提升到 `3`。
      2. 新增 `candidateCloseout.recoveryThresholdRatcheting`（`enabled=true`、`minConsecutivePassedWeeksToRequireTarget=2`、`targetRecoveryConsecutivePassedWeeks=3`）。
      3. `titlePrefixes` 前移到 `V2-W15-11`。
   3. 升级 `.github/release-gates/v2-p1-escalation-dispatch.json` titlePrefix 到 `V2-W15-11`，保证新卡版本一致。
   4. 升级 `scripts/ci/v2-p1-escalation-timeout-gate-lib.test.mjs`，新增 ratchet FAIL/PASS 用例。
5. 测试证据：
   1. `npm run ci:gate:v2:p1-timeout:test`
   2. `npm run ci:gate:v2:p1-dispatch:test`
   3. `npm run ci:gate:v2:health-summary:test`
   4. ratchet FAIL 样例（预期非零）：`npm run ci:gate:v2:p1-timeout -- --config /tmp/v2-p1-escalation-timeout-gate-w1511-ratchet-fail.json --open-issues-fixture /tmp/v2-p1-open-issues-timeout-empty.json --summary-json /tmp/v2-release-health-summary-timeout-stable2.json --report /tmp/v2-p1-escalation-timeout-gate-w1511-ratchet-fail.md --out-json /tmp/v2-p1-escalation-timeout-gate-w1511-ratchet-fail.json --now 2026-03-23T12:00:00Z --apply-reminder false`
   5. ratchet PASS 样例：`npm run ci:gate:v2:p1-timeout -- --config ./.github/release-gates/v2-p1-escalation-timeout-gate.json --open-issues-fixture /tmp/v2-p1-open-issues-timeout-empty.json --summary-json /tmp/v2-release-health-summary-timeout-stable3.json --report /tmp/v2-p1-escalation-timeout-gate-w1511-ratchet-pass.md --out-json /tmp/v2-p1-escalation-timeout-gate-w1511-ratchet-pass.json --now 2026-03-23T12:00:00Z --apply-reminder false`
6. DoD：timeout 候选链路在“连续恢复稳定”后自动执行阈值加严防回退，避免恢复策略被调低而导致提前关单。
7. 状态：`已完成`

### `V2-W15-12` timeout 连续稳定观察门禁（两周 PASS + labelDrift=0 + ratchet PASS）

1. 映射：`V2-52`
2. Owner：`QA Owner + Tech Lead`
3. 依赖：`V2-W15-11`
4. 关键交付：
   1. 新增 `scripts/ci/v2-p1-timeout-stability-observation-gate-lib.mjs` + `scripts/ci/v2-p1-timeout-stability-observation-gate.mjs`，将“连续两周观察”升级为机审：检查 `timeoutConsecutivePassedWeeks >= 2`、`timeoutConsecutiveFailureDetected=false`、`timeoutLatestRunFailed=false`。
   2. 新增 `.github/release-gates/v2-p1-timeout-stability-observation-gate.json`，冻结 `maxLabelDriftIssues=0` 与 `ratcheting check id=timeout-candidate-recovery-threshold-ratchet`，并默认开启 fail-fast 策略（观察期不足/label drift/ratchet 失败均阻断）。
   3. 升级 `.github/workflows/v2-p1-escalation-dispatch.yml`：在 timeout gate 后新增 stability gate 步骤，产出 `v2-p1-timeout-stability-observation-gate.{md,json}` 并归档到 `v2-p1-escalation-dispatch-report` artifact。
   4. 升级 root `package.json` scripts：新增 `ci:gate:v2:p1-timeout:stability` 与 `ci:gate:v2:p1-timeout:stability:test`。
   5. 新增 `scripts/ci/v2-p1-timeout-stability-observation-gate-lib.test.mjs`，覆盖 PASS / 连续周数不足 FAIL / label drift FAIL / ratchet 规则宽松策略场景。
5. 测试证据：
   1. `npm run ci:gate:v2:p1-timeout:stability:test`
   2. `npm run ci:gate:v2:p1-timeout:stability -- --config ./.github/release-gates/v2-p1-timeout-stability-observation-gate.json --summary-json ./scripts/ci/fixtures/v2-release-health-summary.sample.json --timeout-gate-json /tmp/v2-timeout-gate-sample.json --report /tmp/v2-p1-timeout-stability-observation-gate.md --out-json /tmp/v2-p1-timeout-stability-observation-gate.json --now 2026-03-23T16:00:00Z`（预期因连续通过周数不足返回非零，验证阻断生效）
6. DoD：`V2-W15-11` 的“连续两周稳定 PASS + labelDriftIssues=0 + ratchet 无误报”从人工观察升级为每周机审闭环，未满足即阻断并给出可追溯报告。
7. 状态：`已完成`

### `V2-W15-13` timeout-stability 趋势并入周报 + 自动升级候选

1. 映射：`V2-52`
2. Owner：`QA Owner + Tech Lead`
3. 依赖：`V2-W15-12`
4. 关键交付：
   1. 升级 `scripts/ci/v2-release-health-summary-lib.mjs` 与 `scripts/ci/v2-release-health-summary.mjs`，新增 `timeoutStabilityGate` 趋势评估（latest/consecutive failed weeks/consecutive passed weeks）并写入周报/summary JSON。
   2. 周健康摘要新增 `P1 timeout stability gate` 判定行与 `timeoutStability*` 字段；当连续失败趋势触发时，自动追加 `p1-timeout-stability-consecutive-failed-weeks` 候选。
   3. 升级 `.github/release-gates/v2-release-health-summary.json`，冻结 `timeoutStabilityGate` 采样与趋势策略。
   4. 升级 `scripts/ci/v2-p1-escalation-dispatch-lib.mjs`、`.github/ISSUE_TEMPLATE/v2-p1-escalation.md` 与 `.github/release-gates/v2-p1-escalation-dispatch.json`，补齐 timeout-stability 上下文字段、schema 映射与自动出卡 reason。
   5. 新增 `scripts/ci/fixtures/v2-p1-timeout-stability-runs.sample.json`，并补齐 `v2-release-health-summary-lib.test.mjs`、`v2-p1-escalation-dispatch-lib.test.mjs` 覆盖 timeout-stability 候选与报告渲染路径。
5. 测试证据：
   1. `npm run ci:gate:v2:health-summary:test`
   2. `npm run ci:gate:v2:p1-dispatch:test`
   3. timeout-stability 并入周报样例：`npm run ci:gate:v2:health-summary -- --summary-config ./.github/release-gates/v2-release-health-summary.json --rc-config ./.github/release-gates/v2-rc-gate.json --fallback-config ./.github/release-gates/v2-cutover-fallback-gate.json --rc-runs-fixture ./scripts/ci/fixtures/v2-regression-runs.sample.json --dispatch-quality-runs-fixture ./scripts/ci/fixtures/v2-dispatch-quality-runs.sample.json --timeout-runs-fixture ./scripts/ci/fixtures/v2-p1-timeout-runs.sample.json --timeout-stability-runs-fixture ./scripts/ci/fixtures/v2-p1-timeout-stability-runs.sample.json --fallback-log ./reports/cutover/dev-entry.log --now 2026-03-23T12:00:00Z --report /tmp/v2-release-health-summary-w1513.md --summary-json /tmp/v2-release-health-summary-w1513.json`
   4. timeout-stability 候选出卡 dry-run：`npm run ci:gate:v2:p1-dispatch -- --config ./.github/release-gates/v2-p1-escalation-dispatch.json --summary-json /tmp/v2-release-health-summary-w1513.json --open-issues-fixture ./scripts/ci/fixtures/v2-open-issues.sample.json --report /tmp/v2-p1-escalation-dispatch-w1513.md --out-json /tmp/v2-p1-escalation-dispatch-w1513.json --workflow-run-url https://example.test/zfrog/actions/runs/1513 --workflow-artifacts-url https://example.test/zfrog/actions/runs/1513#artifacts --run-id 1513 --run-attempt 1`
6. DoD：timeout-stability 门禁结果可被周报趋势统一消费，且在连续失败触发时可自动生成标准化 P1 修复卡并携带完整证据上下文，无需人工拼接。
7. 状态：`已完成`

### `V2-W15-14` timeout-stability 候选处置闭环机审（趋势触发开卡 + 恢复达阈值关单）

1. 映射：`V2-52`
2. Owner：`QA Owner + Tech Lead`
3. 依赖：`V2-W15-13`
4. 关键交付：
   1. 升级 `scripts/ci/v2-p1-escalation-timeout-gate-lib.mjs`：将 `candidateCloseout` 从单候选升级为 `candidateCloseouts` 多候选策略，支持 `p1-timeout-consecutive-failed-weeks` 与 `p1-timeout-stability-consecutive-failed-weeks` 并行机审。
   2. 新增 timeout-stability 候选处置检查：趋势触发必须存在 open 候选卡；恢复达阈值后必须闭单；并在报告中新增 `Timeout stability candidate closeout` 与候选 issue 列表。
   3. 升级 `.github/release-gates/v2-p1-escalation-timeout-gate.json`：引入 `issue.candidateCloseouts[]`，冻结 timeout 与 timeout-stability 双候选策略；`titlePrefixes` 前移到 `V2-W15-14`。
   4. 升级 `.github/release-gates/v2-p1-escalation-dispatch.json` 与 `scripts/ci/v2-p1-escalation-dispatch-lib.mjs` 默认前缀到 `V2-W15-14`，确保新候选卡版本一致。
   5. 补齐 `scripts/ci/v2-p1-escalation-timeout-gate-lib.test.mjs`：新增 timeout-stability 候选“趋势触发无 open 卡 FAIL / 恢复闭环 PASS”场景。
5. 测试证据：
   1. `npm run ci:gate:v2:p1-timeout:test`
   2. `npm run ci:gate:v2:p1-timeout:stability:test`
   3. `npm run ci:gate:v2:p1-dispatch:test`
   4. timeout-stability 候选门禁 FAIL 样例：`node ./scripts/ci/v2-p1-escalation-timeout-gate.mjs --config ./.github/release-gates/v2-p1-escalation-timeout-gate.json --open-issues-fixture /tmp/v2-p1-open-issues-empty.json --summary-json /tmp/v2-p1-timeout-gate-summary-stability-trend.json --report /tmp/v2-p1-escalation-timeout-gate-w1514-fail.md --out-json /tmp/v2-p1-escalation-timeout-gate-w1514-fail.json --now 2026-03-23T12:00:00Z`（预期非零退出）。
   5. timeout-stability 候选门禁 PASS 样例：`node ./scripts/ci/v2-p1-escalation-timeout-gate.mjs --config ./.github/release-gates/v2-p1-escalation-timeout-gate.json --open-issues-fixture /tmp/v2-p1-open-issues-timeout-stability-open.json --summary-json /tmp/v2-p1-timeout-gate-summary-stability-trend-active.json --report /tmp/v2-p1-escalation-timeout-gate-w1514-pass.md --out-json /tmp/v2-p1-escalation-timeout-gate-w1514-pass.json --now 2026-03-23T12:00:00Z`（预期 PASS）。
6. DoD：timeout-stability 候选从“只自动出卡”升级为“趋势触发开卡 + 观察期持卡 + 恢复达阈值关单”机审闭环，避免稳定性候选长期漏开或长期挂单。
7. 状态：`已完成`

### `V2-W15-15` timeout summary 新鲜度门禁（generatedAt 必填 + 时效窗口）

1. 映射：`V2-52`
2. Owner：`QA Owner + Tech Lead`
3. 依赖：`V2-W15-14`
4. 关键交付：
   1. 升级 `scripts/ci/v2-p1-escalation-timeout-gate-lib.mjs`：在候选处置校验前新增 summary 新鲜度门禁，校验 `generatedAt` 存在性与 `summary.maxAgeHours` 时效窗口（默认 36h）。
   2. 升级 `.github/release-gates/v2-p1-escalation-timeout-gate.json`：新增 `summary.requireGeneratedAt` 与 `summary.maxAgeHours`，冻结 timeout 候选处置对周报输入的时效要求。
   3. 升级 timeout gate 报告：输出 summary presence/generatedAt/age 指标，确保陈旧 summary 可被直接识别并追溯。
   4. 补齐 `scripts/ci/v2-p1-escalation-timeout-gate-lib.test.mjs`：新增 `generatedAt` 缺失 FAIL 与 summary stale FAIL 场景。
5. 测试证据：
   1. `npm run ci:gate:v2:p1-timeout:test`
   2. stale summary FAIL 样例：`node ./scripts/ci/v2-p1-escalation-timeout-gate.mjs --config ./.github/release-gates/v2-p1-escalation-timeout-gate.json --open-issues-fixture ./scripts/ci/fixtures/v2-p1-open-issues-timeout.sample.json --summary-json /tmp/v2-release-health-summary-stale.json --report /tmp/v2-p1-escalation-timeout-gate-w1515-fail.md --out-json /tmp/v2-p1-escalation-timeout-gate-w1515-fail.json --now 2026-03-23T12:00:00Z`（预期非零退出）。
6. DoD：timeout 候选处置不再接受“无时间戳”或“超过时效窗口”的 summary 输入，避免基于陈旧周报做错误开卡/关卡决策。
7. 状态：`已完成`

### `V2-W15-16` dispatch summary 新鲜度门禁（阻断陈旧周报触发出卡）

1. 映射：`V2-52`
2. Owner：`QA Owner + Tech Lead`
3. 依赖：`V2-W15-15`
4. 关键交付：
   1. 升级 `scripts/ci/v2-p1-escalation-dispatch-lib.mjs`：新增 summary 新鲜度评估（`dispatch-summary-present/generated-at/recency`），并在 freshness 失败时将创建决策降级为 `skip-summary-freshness`。
   2. 升级 `scripts/ci/v2-p1-escalation-dispatch.mjs`：执行出卡前强制评估 freshness，失败时阻断 apply，并在 JSON/markdown 报告输出 checks 与阻断计数。
   3. 升级 `.github/release-gates/v2-p1-escalation-dispatch.json`：新增 `summary.requireGeneratedAt` 与 `summary.maxAgeHours`，并将 `titlePrefix` 前移至 `V2-W15-16`。
   4. 升级 `.github/release-gates/v2-p1-escalation-timeout-gate.json`：补齐 `titlePrefixes` 包含 `V2-W15-16`，确保 timeout gate 持续覆盖新前缀出卡。
   5. 补齐 `scripts/ci/v2-p1-escalation-dispatch-lib.test.mjs`：新增 freshness PASS、`generatedAt` 缺失 FAIL、stale FAIL、`skip-summary-freshness` 决策与 summary schema 校验场景。
5. 测试证据：
   1. `npm run ci:gate:v2:p1-dispatch:test`
   2. stale summary 阻断样例：`node ./scripts/ci/v2-p1-escalation-dispatch.mjs --config ./.github/release-gates/v2-p1-escalation-dispatch.json --summary-json /tmp/v2-release-health-summary-stale.json --open-issues-fixture ./scripts/ci/fixtures/v2-open-issues.sample.json --report /tmp/v2-p1-escalation-dispatch-w1516-stale.md --out-json /tmp/v2-p1-escalation-dispatch-w1516-stale.json --now 2026-03-23T12:00:00Z`（预期非零退出 + `skip-summary-freshness`）。
6. DoD：`v2-p1-escalation-dispatch` 不再接受“无时间戳”或“超过时效窗口”的 summary 输入；陈旧周报不会触发新 P1 卡，且阻断原因在报告可追溯。
7. 状态：`已完成`

### `V2-W15-17` summary 未来时间戳偏移门禁（防未来时间戳绕过新鲜度）

1. 映射：`V2-52`
2. Owner：`QA Owner + Tech Lead`
3. 依赖：`V2-W15-16`
4. 关键交付：
   1. 升级 `scripts/ci/v2-p1-escalation-dispatch-lib.mjs`：在 summary freshness 增加 `dispatch-summary-not-future` 检查与 `summary.maxFutureSkewMinutes` 配置，阻断超前时间戳绕过 recency。
   2. 升级 `scripts/ci/v2-p1-escalation-timeout-gate-lib.mjs`：新增 `closeout-summary-not-future` 检查，timeout 候选处置链路同样执行未来偏移容忍窗口校验。
   3. 升级 `.github/release-gates/v2-p1-escalation-dispatch.json` 与 `.github/release-gates/v2-p1-escalation-timeout-gate.json`：新增 `summary.maxFutureSkewMinutes`，并将 title prefix 前移到 `V2-W15-17`。
   4. 升级测试：`scripts/ci/v2-p1-escalation-dispatch-lib.test.mjs`、`scripts/ci/v2-p1-escalation-timeout-gate-lib.test.mjs` 新增“future skew FAIL/PASS”双场景。
5. 测试证据：
   1. `npm run ci:gate:v2:p1-dispatch:test`
   2. `npm run ci:gate:v2:p1-timeout:test`
6. DoD：dispatch + timeout 双链路均可识别并阻断超前时间戳输入；未来时间戳无法再绕过 summary 新鲜度策略，且容忍窗口内的轻微时钟偏移可通过机审。
7. 状态：`已完成`

---

## 七、当前开工队列（建议）

1. 每周消费 `v2-release-health-summary-report` 与 `v2-release-health-summary.json`，优先处理 `Need-to-handle reasons` 与 `P1 escalation candidates`。
2. 继续观察 `v2-rc-release-gate` 与 `v2-cutover-fallback-gate` 子报告，确保双门禁持续 PASS。
3. `V2-W15-17` 已落地，dispatch + timeout 双链路已补齐 summary 新鲜度 + 未来时间戳偏移门禁；后续每周同时关注 `v2-p1-escalation-dispatch-report`、`v2-p1-escalation-timeout-gate-report` 与 `v2-release-health-summary-report`，确认无误报、无漏报、无陈旧/未来 summary 输入。

---

## 八、阻塞与决策项

1. `已决策` `pnpm` 作为团队默认本地工具链；legacy 入口仅作为回滚保底。
2. `已决策` Mobile Lite 技术路线冻结为 `PWA-lite（React + Vite）`，如改为 React Native 需走变更评审。
3. Attestation 链上环境：优先测试网与 gas 预算阈值需确认。

---

## 九、文档维护规则

1. 每周五更新任务状态与证据链接。
2. 任务完成必须附带测试命令与结果摘要。
3. 新增任务卡必须声明依赖与回滚策略。
