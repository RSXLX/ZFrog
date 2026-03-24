---
status: 建议执行
version: 1.0
last_updated: 2026-03-24
reviewer: Codex
---

# ZFrog V3 Issue Backlog 可开工版

## 一、文档目标

这份文档是对 [ZFrog_V3_任务清单.md](/Users/sxlx/.gemini/antigravity/ZFrog/docs/02_开发计划/ZFrog_V3_任务清单.md) 的执行层 backlog。

目标：

1. 把 V3 拆成“按周可开工、可验收、可灰度、可回滚”的任务卡。
2. 保证每一张卡都能回答：
   1. 谁做
   2. 依赖谁
   3. 改哪些目录
   4. 怎么测
   5. 怎么回滚
3. 保证 V3 玩法增强建立在 V2 稳定主线上，而不是重新开一条不受控支线。

---

## 二、评估摘要

`2026-03-23` 的 V3 旧计划评估结论如下：

1. 愿景方向正确，但任务粒度不足，无法直接开工。
2. `apps/backend`、`apps/web` 等目录在当前仓库仍是映射目录，不能被当作既成事实。
3. 旧计划更像平台组件目录，不像玩家可感知的玩法计划。
4. V3 的正确打开方式应是：
   1. 先搭护栏
   2. 再做 Journey / Council / Memory / Creator
   3. 最后做开放与 graph 锚定
5. `2026-03-23` 执行记录：
   1. `V3-W5-01` 已完成后端安全闭环基础：`/api/v3/council/suggestions` 与 `respond` 路由、`council.write` 权限拆分、`runtime council module gate`、`V3_COUNCIL_ACTIONS_ENABLED` 回退开关、integration app 作用域隔离、以及 backend/shared/sdk 合同测试闭环。
   2. `V3-W5-01` 当前状态可标记为 `进行中`（后续仍需补齐持久化表、trace 存档与前端页面联调）。
   3. `V3-W5-02` 已完成 Web Alpha 安全闭环：新增 `frontend/src/pages/CouncilPage.tsx` 与 `frontend/src/features/council/*`（beta gate + integration key fail-closed + inbox/detail/respond），接入 `/council` 路由并以 navbar beta 入口控制回滚，补齐 page route test 与 mocked Playwright flow。
   4. `V3-W5-01` 已补齐持久化与审计追踪闭环：新增 `council_runs/council_suggestions/council_responses` schema + migration，`council-suggestion.service` 默认切至 Prisma 存储并在 create/respond 写入 `domain_events`，同时保留 `V3_COUNCIL_STORAGE_MODE=memory` 作为测试隔离回退。
   5. `V3-W6-02` 已完成安全门与审计页闭环：新增 `Council risk-level policy`（LOW/MEDIUM/HIGH 分级开关，create 路由 fail-closed 拦截）、`/api/admin/v3/council/*`（policy/audit/toggle），以及 `admin/src/pages/CouncilAudit/index.tsx` 审计页（查看 prompt kit / data source / 建议结果，并可暂停某类建议）。
   6. `V3-W6-01` 已完成 Brief 下发安全闭环：新增 `/api/v3/council/brief` 与 `/api/v3/council/brief/preferences`（integration key + runtime gate + capability + write rate limit + app scope 隔离 + `V3_COUNCIL_BRIEF_ENABLED` fail-closed），并接入 desktop/mobile-lite 端周报拉取、节流与可关闭控制。
   7. `V3-W7-01` 已完成协作记忆世界后端安全闭环：新增 `/api/v3/memory-palaces`（create/get/collaborators/contributions）并接入 integration key + runtime memory module gate + memory.read/write capability + write rate limit + app scope fail-closed；新增 `V3_MEMORY_PALACE_COLLAB_ENABLED` 回退开关；新增 `memory_palace_worlds/collaborators/contributions/templates` schema + migration，并在 create/contribution/collaborator 写入 `domain_events` 审计轨迹。
   8. `V3-W7-02` 已完成 Memory Palace Builder Web Alpha 安全闭环：新增 `frontend/src/pages/MemoryWorldPage.tsx` 与 `frontend/src/features/memory-palace-builder/*`（owner-only beta gate + integration key fail-closed + relic/留言/足迹共建交互 + collaborator 管理），接入 `/memory-world` 与 `/memory-world/:worldId` 路由并在 navbar 以 owner-beta 条件控制入口回滚，补齐 page/api unit tests 与 `memory-world-contribution-flow.e2e.ts` Playwright smoke。
   9. `V3-W8-01` 已完成 Guestbook / Witness / Exhibit 后端安全闭环：新增 `memory_palace_visits/memory_palace_exhibits` schema + migration、`/api/v3/memory-palaces/:id/visits`（读写）、`/api/admin/v3/memory-palaces/:id/feature`（精选/取消精选），并补齐 `V3_MEMORY_PALACE_VISIT_WRITE_ENABLED` 访客写入回退开关及 backend/shared/sdk 合同测试覆盖。
   10. `V3-W8-02` 已完成 Memory World Pack 与主题化发布安全闭环：新增 `backend/src/modules/memory-palace-templates/template-pack.service.ts` 与 `/api/v3/memory-palaces/templates*`、`/api/admin/v3/memory-palaces/templates*` 路由，落地 `DRAFT -> IN_REVIEW -> PUBLISHED/REJECTED` 审核状态流转、`V3_MEMORY_PALACE_TEMPLATE_PACK_ENABLED` / `V3_MEMORY_PALACE_TEMPLATE_PUBLIC_ENABLED` 双层回退开关、创建 world 时 `templateSlug` 仅允许“已审核发布且 feature 开启”模板（fail-closed），并补齐 backend/shared/sdk/frontend 合同与页面测试覆盖。
   11. `2026-03-24`：`V3-W9-01` 已完成后端安全闭环基础：新增 `backend/src/modules/creator/creator-pipeline.service.ts` 与 `/api/v3/creator/assets|packs*` 路由，接入 `integration key auth + runtime creator module gate + creator.asset.write/creator.pack.write 权限边界 + 写限流 + app scope fail-closed`，新增 `V3_CREATOR_ASSET_PIPELINE_ENABLED` / `V3_CREATOR_PACK_DRAFT_ENABLED` 回退开关，并在素材上传/草稿创建写入 `domain_events`（`CreatorAssetUploaded` / `CreatorPackDrafted`）。
   12. `2026-03-24`：`V3-W9-01` 持久化与合同闭环已补齐：新增 `creator_profiles/creator_assets/creator_packs/creator_pack_assets` schema + migration，补齐 `packages/shared` creator types/schemas 与 `packages/client-sdk` creator resource，新增 backend integration/e2e 与 shared/sdk contract 覆盖。
   13. `2026-03-24`：`V3-W9-01` 已完成 Web Alpha 安全闭环：新增 `frontend/src/pages/CreatorPage.tsx` 与 `frontend/src/features/creator/*`（beta gate + integration key fail-closed + 素材上传预览校验 + pack 草稿创建/队列查看），接入 `/creator` 路由并在 navbar 以 beta 条件控制入口回滚，补齐 page/api unit tests 与 `creator-pipeline-alpha.e2e.ts` mocked Playwright smoke。
   14. `2026-03-24`：`V3-W9-02` 已完成 Creator 审核闭环：新增 `/api/v3/creator/packs/:packId/resubmit`（创作者重提）、`/api/admin/v3/creators/review-queue|packs/:packId/preview|review|rollback`（审核队列/预览/驳回与通过/回滚）与 `admin/src/pages/Creators/index.tsx` 审核页；补齐 `V3_CREATOR_PACK_REVIEW_ENABLED` / `V3_CREATOR_PACK_PUBLISH_ENABLED` / `V3_CREATOR_PREVIEW_RENDER_ENABLED` 三层 fail-closed 开关，并完成 backend integration + e2e 的 review/preview smoke 覆盖。
   15. `2026-03-24`：`V3-W10-01` 已完成 Partner Campaign Runtime 安全闭环：新增 `backend/src/modules/partners/partner-campaign.service.ts`、`/api/v3/partners/campaigns*`、`/api/admin/v3/partners/campaigns*`、`partner_campaigns/partner_callbacks/partner_rewards` schema + migration，落地 publish/pause/resume 生命周期、callback 时间戳与签名校验、callback replay 防护、reward trace 追踪、admin 一键 rollback 与 `domain_events` 审计链路；新增 `backend/src/__tests__/integration/partner-campaign.service.integration.test.ts` 补齐非端口依赖的安全回归验证，并补齐 shared/client-sdk/admin 页面接入。
   16. `2026-03-24`：`V3-W10-02` 已完成 Creator License / Asset Anchor 安全闭环：新增 `backend/src/modules/creator-onchain/creator-license-anchor.service.ts` 与 `/api/v3/creator/assets/:assetId/license-anchor`、`/api/v3/creator/license-anchors/:bindingId/replay`、`/api/admin/v3/creators/license-anchors*`；新增 `creator_asset_bindings/onchain_creator_assets` schema + migration；冻结锚定字段 `assetId/checksum/ownerWallet/issuedAt` 并落地幂等防重（同锚定元组唯一）、失败重放（replay）与 `domain_events` 审计链路；补齐 `V3_CREATOR_LICENSE_ANCHOR_ENABLED` / `V3_CREATOR_LICENSE_ONCHAIN_ENABLED` / `V3_CREATOR_LICENSE_ONCHAIN_REQUIRED` fail-closed 回退开关。
   17. `2026-03-24`：`V3-W11-01` 已完成后端安全闭环基础：新增 `backend/src/modules/relationship-graph/relationship-edge-ledger.service.ts` 与 `/api/v3/relationship-graph/frogs/:frogId`，落地 `JOURNEY/RESCUE/WITNESS/CONTRIBUTION` 四类 edge 聚合、identity key 去重、`relationship_edges/relationship_edge_snapshots` schema + migration、`V3_RELATIONSHIP_EDGE_LEDGER_ENABLED` / `V3_RELATIONSHIP_GRAPH_QUERY_ENABLED` fail-closed 开关、以及 app scope 隔离查询收口。
   18. `2026-03-24`：`V3-W11-01` 后半段第 1 点已完成：新增 `backend/src/modules/relationship-graph/relationship-edge-replay.service.ts` 与 `backend/src/scripts/replay-relationship-edge-signals.ts`，将 `domain_events` 的真实生产事件（`TravelStarted/RescueCompleted/RelationshipAttested/RelationshipMilestoneRecorded`，并预留 `MemoryPalaceContributionAdded/MemoryPalaceVisitLogged`）稳定映射为 `JOURNEY/RESCUE/WITNESS/CONTRIBUTION` 信号，并以 `domain-event:<id>` 作为幂等 identity key 实现可重放不重复记分；补齐 `relationship-edge-replay.service.integration.test.ts` 回放/干跑/fail-closed 验证。
   19. `2026-03-24`：`V3-W11-01` 后半段第 2 点已完成：新增 `frontend/src/pages/RelationshipGraphPage.tsx` + `frontend/src/features/relationship-graph/*`（integration key fail-closed、graph 卡片 + 详情只读页、`__ZFROG_V3_RELATIONSHIP_GRAPH_BETA__` / `VITE_V3_RELATIONSHIP_GRAPH_BETA_ENABLED` 回滚门控），并接入 `/relationship-graph` 与 navbar beta 入口；新增 `admin/src/pages/RelationshipGraph/index.tsx` + `/relationship-graph/:appId/:frogId` 只读观测页，补齐 `admin` 侧 beta gate（`VITE_V3_RELATIONSHIP_GRAPH_ADMIN_ENABLED`）与菜单回滚收口。
   20. `2026-03-24`：`V3-W11-02` 已完成 Relationship Edge Onchain Anchor 安全闭环：在既有 `relationship_edge_anchors` 与 adapter/replay 基础上，补齐 `/api/v3/relationship-graph/frogs/:frogId` 与 `/api/admin/v3/relationship-graph/frogs/:frogId` 的 `edge.anchor` 只读聚合返回（`PENDING/ANCHORED/FAILED` + onchain 元数据），并通过 app scope + integration key 保持 fail-closed。
   21. `2026-03-24`：`V3-W11-02` 已完成前端/管理台观测与回滚收口：`frontend/src/pages/RelationshipGraphPage.tsx` 与 `admin/src/pages/RelationshipGraph/index.tsx` 新增 anchor 状态读模型展示，同时补齐 `VITE_V3_RELATIONSHIP_GRAPH_ANCHOR_BETA_ENABLED` 与 `VITE_V3_RELATIONSHIP_GRAPH_ADMIN_ANCHOR_ENABLED` 两个独立回滚开关。
   22. `2026-03-24`：`V3-W12-01` 第 1 点已完成：新增 `.github/workflows/v3-beta-regression-matrix.yml`、`.github/release-gates/v3-beta-release-gate.json`、`scripts/ci/v3-beta-release-gate*.mjs` 与 `docs/02_开发计划/ZFrog_V3_Beta_Cutover_Runbook.md`，形成独立 `contract/integration/e2e/playwright` 四层门禁与 dry-run fallback 演练闭环。
   23. `2026-03-24`：`V3-W12-01` 第 2 点已完成：新增 `.github/release-gates/v3-rc-gate.json`、`scripts/ci/v3-rc-gate-*.mjs` 与 `.github/workflows/v3-rc-release-gate.yml`，把 `v3-beta-regression-matrix` 的连续稳定性（schedule runs）、freshness 与缺陷预算快照纳入 RC 强门禁，并输出可归档报告。
   24. `2026-03-24`：`V3-W12-01` 第 3 点已完成：新增 `scripts/ci/v3-release-health-summary*.mjs`，把 RC gate 结果汇总为健康摘要（`reports/v3/v3-release-health-summary.{md,json}`）并与 `reports/history/v3-rc-gate` 一起作为证据链归档。
   25. `2026-03-24`：`V3-W12-02` 已完成 Admin Beta 运营总控看板闭环：新增 `admin/src/pages/V3Dashboard/index.tsx`，聚合 creator/partner/world/council/relationship graph 五类运营读模型卡片，并接入 `runtime module toggle` 作为模块暂停入口。
   26. `2026-03-24`：`V3-W12-02` 已完成回滚门控与路由收口：新增 `admin/src/features/v3-dashboard/runtime.ts`，落地 `VITE_V3_DASHBOARD_BETA_ENABLED` + `__ZFROG_ADMIN_V3_DASHBOARD_BETA__` 双态门控，并接入 `admin/src/App.tsx` 路由与 `admin/src/components/Layout/MainLayout.tsx` 侧边栏入口。
   27. `2026-03-24`：`V3-RC-01` 已完成 `V3Dashboard` Playwright 双态 smoke（beta on/off）闭环：新增 `frontend/playwright.admin.config.ts` 与 `frontend/e2e/admin-v3-dashboard-smoke.e2e.ts`，覆盖 beta off fail-closed（入口隐藏 + 路由告警）与 beta on 运营路径（总览加载 + runtime 模块开关 + graph 跳转）；并新增 `frontend` 脚本 `test:e2e:admin:v3-dashboard`。
   28. `2026-03-24`：`V3-RC-01` 已补齐演练模板闭环：`docs/02_开发计划/ZFrog_V3_Beta_Cutover_Runbook.md` 新增 `V3Dashboard` 运营冻结/回滚演练记录模板（输出到 `reports/v3/v3-dashboard-freeze-rollback-drill-*.md`），并将 `.github/workflows/v3-beta-regression-matrix.yml` 的 Playwright 层接入该双态 smoke。
   29. `2026-03-24`：`V3-RC-02` 已完成演练归档自动化闭环：新增 `scripts/ci/v3-dashboard-drill-report*.mjs`（含 fail-closed 校验：Playwright `success` 但缺失 `run-url` 证据时直接失败），并将其接入 `.github/workflows/v3-beta-regression-matrix.yml` 的 `summary` job（自动生成 `reports/v3/v3-dashboard-freeze-rollback-drill-${GITHUB_RUN_ID}.{md,json}` 并写入 step summary）。
   30. `2026-03-24`：`V3-RC-02` 已产出首份冻结/回滚演练记录：`reports/v3/v3-dashboard-freeze-rollback-drill-20260324-0000-run-local.md`（本地受限环境阻塞态归档，明确记录 `listen EPERM 127.0.0.1:4174` 与 `暂缓发布` 结论）。
   31. `2026-03-24`：`V3-RC-02` 后半段已完成“回写模板自动化”闭环：新增 `scripts/ci/v3-dashboard-drill-backlog*.mjs`（对 `drill json` 做 smoke/conclusion/run-url/run-id 一致性 fail-closed 校验并自动生成 backlog 回写片段），并接入 `.github/workflows/v3-beta-regression-matrix.yml` 的 `summary` job（自动生成 `reports/v3/v3-dashboard-freeze-rollback-drill-${GITHUB_RUN_ID}-backlog.md` 并写入 step summary）。
   32. `2026-03-24`：`V3-RC-02` 已完成“回写片段自动合并预览”闭环：新增 `scripts/ci/v3-dashboard-drill-backlog-apply*.mjs`（校验 taskId/runId/重复证据后，自动把 snippet 合并到 `V3-RC-02` 执行记录与“下一点执行清单”），并接入 `.github/workflows/v3-beta-regression-matrix.yml` 生成 `reports/v3/v3-dashboard-freeze-rollback-drill-${GITHUB_RUN_ID}-backlog-applied.md` 预览文件。
   33. `2026-03-24`：`V3-RC-02` 已完成“三产物证据对账 gate”闭环：新增 `scripts/ci/v3-dashboard-drill-evidence-gate*.mjs`（对 `drill/backlog/backlog-applied` 三类产物执行 runId/runUrl/smoke/conclusion 与落盘内容一致性 fail-closed 校验），并接入 `.github/workflows/v3-beta-regression-matrix.yml` 的 `summary` job，自动生成 `reports/v3/v3-dashboard-freeze-rollback-drill-${GITHUB_RUN_ID}-evidence-gate.{md,json}`。
   34. `2026-03-24`：`V3-RC-02` 已补强“四向证据对账”闭环：更新 `scripts/ci/v3-dashboard-drill-evidence-gate*.mjs` 与 `scripts/ci/v3-dashboard-drill-closeout*.mjs`，将 `drill report.md` 纳入强制语义校验（`runId/runUrl/smoke/conclusion`）并与 `drill json/snippet/backlog-applied` 统一 fail-closed。
   35. `2026-03-24`：`V3-RC-02` 已补强“manifest 摘要对账”闭环：升级 `scripts/ci/v3-dashboard-drill-run-manifest*.mjs` 生成四类证据摘要（`drillReportMd/drillJson/backlogSnippetMd/backlogAppliedMd` 的 `path/sha256/bytes`），并更新 `scripts/ci/v3-dashboard-drill-evidence-gate*.mjs` 与 `scripts/ci/v3-dashboard-drill-closeout*.mjs` 强制对账摘要，任一摘要缺失或不一致直接 fail-closed。
   36. `2026-03-24`：`V3-RC-02` 已补强“证据路径作用域”闭环：统一收紧 `scripts/ci/v3-dashboard-drill-run-manifest*.mjs`、`scripts/ci/v3-dashboard-drill-evidence-gate*.mjs`、`scripts/ci/v3-dashboard-drill-closeout*.mjs`，强制 `report-md/drill-json/snippet-md/backlog-applied/run-manifest` 只能使用当前 run 的固定证据路径（`reports/v3/v3-dashboard-freeze-rollback-drill-${runId}*`），任一路径越界直接 fail-closed。
   37. `2026-03-24`：`V3-RC-02` 已补齐“closeout 自动预览 gate”闭环：`.github/workflows/v3-beta-regression-matrix.yml` 新增 `Generate V3 backlog closeout preview (strict by default)`，在 `summary` job 自动执行 `v3-dashboard-drill-closeout` 并产出 `reports/v3/v3-dashboard-freeze-rollback-drill-${GITHUB_RUN_ID}-backlog-closeout.md`；非 dry-run 默认 `--require-publishable=true`，dry-run rehearsal 自动降级 `false`，并在 closeout 失败时 fail-closed 阻断 workflow。
   38. `2026-03-24`：`V3-RC-02` 已补齐“run attempt 身份强绑定”安全闭环：升级 `scripts/ci/v3-dashboard-drill-run-manifest-lib.mjs`、`scripts/ci/v3-dashboard-drill-evidence-gate*.mjs`、`scripts/ci/v3-dashboard-drill-closeout*.mjs`、`scripts/ci/v3-dashboard-drill-closeout-apply*.mjs` 与 `.github/workflows/v3-beta-regression-matrix.yml`，新增 `--expected-run-attempt` 约束并默认绑定 `GITHUB_RUN_ATTEMPT`；当同 `run_id` 但 attempt 不一致时一律 fail-closed，防止旧 attempt 证据被误用于正式关单。
   39. 下一点：在可开放端口环境（CI/staging）补跑 `test:e2e:admin:v3-dashboard`，拿到 workflow run 链接后校验 `evidence-gate` 报告为 PASS、`readyToClose=yes` 且自动生成的 `backlog-closeout` 预览存在，再执行带 `--expected-run-attempt \"${GITHUB_RUN_ATTEMPT}\"` 的 `closeout-apply` 正式关单 `V3-RC-02`（若仍失败则保持 `暂缓发布` 并继续回滚收口）。

这份 backlog 按这个顺序拆解。

---

## 三、当前前提

## 3.1 工程前提

1. V2 workspace 已建立，但主源码仍在 `frontend/`、`backend/`、`admin/`、`desktop-pet/`、`contracts/`。
2. `packages/shared` 与 `packages/client-sdk` 已可复用。
3. `/api/v2` 的 social / wallet / relationship-memory / chat 已可作为 V3 输入层。
4. V3 在 Beta 前不得破坏 V1/V2 可运行主链路。

## 3.2 V3 规划原则

1. 所有外部开放能力先过 `integration registry`。
2. 所有 creator / partner 内容先过审核与 kill switch。
3. 所有 AI 建议必须可解释、可拒绝、可追溯。
4. 所有 graph anchor 先有库内真相，再考虑链上见证。

---

## 四、任务状态定义

1. `待开工`
   已满足 DoR，可领取开发。
2. `进行中`
   已进入实现或联调。
3. `阻塞`
   依赖未满足或决策未冻结。
4. `已完成`
   代码、测试、文档、回滚策略齐全。

---

## 五、关键路径与并行策略

## 5.1 关键路径

1. `V3-W1-01` -> `V3-W2-01` -> `V3-W3-01` -> `V3-W5-01` -> `V3-W7-01` -> `V3-W9-01` -> `V3-W11-01` -> `V3-W12-01`
2. `V3-W1-02` -> `V3-W4-02` -> `V3-W8-02` -> `V3-W10-02`
3. `V3-W5-01` -> `V3-W6-02` -> `V3-W11-02`

## 5.2 可并行任务

1. Journey 前后端 UI 可在后端 schema 冻结后并行。
2. Council UI 与 Weekly Brief 通知链路可并行。
3. Memory Palace Builder 与 Creator Preview Renderer 可并行。
4. Admin 审核页与 Partner Campaign API 可并行。

---

## 六、周任务总览

| 周次 | 任务卡 | 映射 Issue | 优先级 | 状态 |
|------|--------|------------|--------|------|
| Week 1 | `V3-W1-01` ~ `V3-W1-02` | `V3-00` / `V3-01` | P0 | `待开工` |
| Week 2 | `V3-W2-01` ~ `V3-W2-02` | `V3-02` / `V3-10` | P0 | `待开工` |
| Week 3 | `V3-W3-01` ~ `V3-W3-02` | `V3-10` | P0 | `待开工` |
| Week 4 | `V3-W4-01` ~ `V3-W4-02` | `V3-11` / `V3-12` | P0 | `待开工` |
| Week 5 | `V3-W5-01` ~ `V3-W5-02` | `V3-20` | P0 | `已完成` |
| Week 6 | `V3-W6-01` ~ `V3-W6-02` | `V3-21` / `V3-22` | P1 | `已完成` |
| Week 7 | `V3-W7-01` ~ `V3-W7-02` | `V3-30` | P0 | `已完成` |
| Week 8 | `V3-W8-01` ~ `V3-W8-02` | `V3-31` / `V3-32` | P1 | `已完成` |
| Week 9 | `V3-W9-01` ~ `V3-W9-02` | `V3-40` | P1 | `已完成` |
| Week 10 | `V3-W10-01` ~ `V3-W10-02` | `V3-41` / `V3-42` | P1 | `已完成` |
| Week 11 | `V3-W11-01` ~ `V3-W11-02` | `V3-50` | P0 | `已完成` |
| Week 12 | `V3-W12-01` ~ `V3-W12-02` | `V3-51` / `V3-52` | P0 | `已完成` |

---

## 七、任务卡（可直接开工）

## Week 1

### `V3-W1-01` V3 runtime baseline 与 kill switch

1. 映射：`V3-00`
2. Owner：`Tech Lead + QA Owner`
3. 依赖：`V2-W12-02`
4. 关键交付：
   1. `backend/src/platform/runtime/*`
   2. `admin/src/pages/V3Ops/index.tsx`
   3. `packages/shared/src/runtime/*`
5. 测试：
   1. backend route/integration test
   2. admin 页面 smoke
6. 回滚：
   1. 保留总开关 `V3_RUNTIME_DISABLED`
   2. admin 一键关闭所有 `/api/v3/*`
7. DoD：
   1. runtime 状态可观测
   2. kill switch 可生效
   3. 不影响 `/api/v1` 与 `/api/v2`

### `V3-W1-02` Integration Registry 与权限枚举冻结

1. 映射：`V3-01`
2. Owner：`Tech Lead + BE Owner`
3. 依赖：`V3-W1-01`
4. 关键交付：
   1. `backend/src/platform/integrations/*`
   2. `packages/shared/src/types/integration.ts`
   3. `backend/prisma/schema.prisma` 增补 integration 表
5. 测试：
   1. registry contract test
   2. key issuance e2e
6. 回滚：
   1. 所有接入方能力默认 deny
   2. 关闭 registry 后 creator / partner / plugin 无法发布新内容
7. DoD：
   1. integration app 可注册
   2. key 可签发、吊销
   3. 权限模型评审冻结

## Week 2

### `V3-W2-01` Journey Graph schema 与 `/api/v3/journeys` 骨架

1. 映射：`V3-10`
2. Owner：`BE Owner`
3. 依赖：`V3-W1-01`
4. 关键交付：
   1. `backend/src/modules/journey/*`
   2. `backend/src/api/routes/v3/journeys.routes.ts`
   3. `backend/prisma/schema.prisma` 新增 `journeys/journey_steps/journey_party_members`
5. 测试：
   1. create / get / settle e2e
   2. schema migration smoke
6. 回滚：
   1. journey 接口 behind feature flag
   2. 不替换现有 `v1 travel` 主入口
7. DoD：
   1. 可创建剧情远征
   2. 可推进 step
   3. 可返回 journey read model

### `V3-W2-02` Admin runtime policy 与 feature flag 面板

1. 映射：`V3-02`
2. Owner：`Admin Owner + BE Owner`
3. 依赖：`V3-W1-01`
4. 关键交付：
   1. `admin/src/pages/V3Ops/index.tsx`
   2. `/api/admin/v3/runtime/*`
5. 测试：
   1. admin e2e
   2. policy toggle integration
6. 回滚：
   1. flag 回退到全关
7. DoD：
   1. Journey / Council / Memory / Creator 各子能力可独立开关
   2. 审计日志可追溯

## Week 3

### `V3-W3-01` Journey viewer read model 与章节推进

1. 映射：`V3-10`
2. Owner：`BE Owner + FE Owner`
3. 依赖：`V3-W2-01`
4. 关键交付：
   1. `backend/src/modules/journey/journey.query.ts`
   2. `frontend/src/features/journey/api.ts`
   3. `packages/client-sdk/src/resources/journey.ts`
5. 测试：
   1. SDK contract test
   2. frontend page test
6. 回滚：
   1. 页面入口隐藏
7. DoD：
   1. Web 可查看 journey 章节、状态、队伍、奖励占位
   2. SDK 调用稳定

### `V3-W3-02` Journey Map Web Alpha

1. 映射：`V3-10`
2. Owner：`FE Owner`
3. 依赖：`V3-W3-01`
4. 关键交付：
   1. `frontend/src/pages/JourneyPage.tsx`
   2. `frontend/src/features/journey/components/*`
5. 测试：
   1. route/page test
   2. Playwright smoke
6. 回滚：
   1. 新入口默认只对 beta flag 可见
7. DoD：
   1. 用户能发起剧情远征
   2. 用户能看到 step timeline 与 choice 卡片

## Week 4

### `V3-W4-01` World Graph / Relic / Footprint 升级

1. 映射：`V3-11`
2. Owner：`BE Owner + Contract Owner`
3. 依赖：`V3-W2-01`
4. 关键交付：
   1. `backend/src/modules/world-graph/*`
   2. `contracts/contracts/FrogFootprint.sol`
   3. `backend/src/modules/web3/onchain-milestone.service.ts` 扩展
5. 测试：
   1. world node unlock integration
   2. contract event test
6. 回滚：
   1. relic claim 停留库内，不强制链上化
7. DoD：
   1. world node、relic、footprint 可被 journey 引用
   2. 稀有结果可记录 milestone

### `V3-W4-02` Journey Incident 协作事件引擎

1. 映射：`V3-12`
2. Owner：`BE Owner + AI Owner`
3. 依赖：`V3-W3-01`
4. 关键交付：
   1. `backend/src/modules/journey-events/*`
   2. `frontend/src/features/journey-events/*`
5. 测试：
   1. incident trigger/resolve e2e
   2. AI prompt trace integration
6. 回滚：
   1. incident fallback 为普通 step 奖励
7. DoD：
   1. 至少一种“流星救援夜”类协作事件跑通
   2. 事件结果可回流关系与记忆

## Week 5

### `V3-W5-01` Council Planner 与 Suggest API

1. 映射：`V3-20`
2. Owner：`AI Owner + BE Owner`
3. 依赖：`V3-W4-02`
4. 关键交付：
   1. `backend/src/modules/council/*`
   2. `/api/v3/council/suggestions`
   3. `council_runs/council_suggestions/council_responses` 表
5. 测试：
   1. suggest/respond route e2e
   2. trace integration test
6. 回滚：
   1. council 改为只读周报，不给 actionable suggestion
7. DoD：
   1. 建议附带数据来源与理由
   2. 建议可接受、拒绝、延后

### `V3-W5-02` Council Inbox Web Alpha

1. 映射：`V3-21`
2. Owner：`FE Owner`
3. 依赖：`V3-W5-01`
4. 关键交付：
   1. `frontend/src/pages/CouncilPage.tsx`
   2. `frontend/src/features/council/components/*`
5. 测试：
   1. page route test
   2. mocked Playwright flow
6. 回滚：
   1. 页面入口隐藏
7. DoD：
   1. 用户可查看建议详情
   2. 用户可接受/拒绝/稍后处理

## Week 6

### `V3-W6-01` Council Brief 与 Desktop/Mobile Recall

1. 映射：`V3-22`
2. Owner：`AI Owner + Desktop Owner + Mobile Lite Owner`
3. 依赖：`V3-W5-01`
4. 关键交付：
   1. `backend/src/modules/council-brief/*`
   2. `desktop-pet/src/renderer/features/council/*`
   3. `apps/mobile-lite/src/features/council/*`
5. 测试：
   1. desktop build smoke
   2. mobile-lite page test
6. 回滚：
   1. council brief 降级为站内收件箱
7. DoD：
   1. 议会周报可下发到桌宠与 mobile-lite
   2. 通知可节流、可关闭

### `V3-W6-02` AI 建议安全门与审计页

1. 映射：`V3-20` / `V3-51`
2. Owner：`Admin Owner + AI Owner`
3. 依赖：`V3-W5-01`
4. 关键交付：
   1. `admin/src/pages/CouncilAudit/index.tsx`
   2. `/api/admin/v3/council/*`
5. 测试：
   1. admin audit e2e
   2. policy enforcement integration
6. 回滚：
   1. 关闭 high-risk suggestions 类型
7. DoD：
   1. 可查看 prompt kit 版本、数据来源、建议结果
   2. 可暂停某类建议

## Week 7

### `V3-W7-01` Collaborative Memory schema 与 API

1. 映射：`V3-30`
2. Owner：`BE Owner + FE Owner`
3. 依赖：`V3-W4-02`
4. 关键交付：
   1. `backend/src/modules/memory-palace-v3/*`
   2. `/api/v3/memory-palaces`
   3. `memory_palace_contributions/collaborators/templates` 表
5. 测试：
   1. create/contribute/visit e2e
   2. permission integration test
6. 回滚：
   1. 退回只读 `Memory Palace Lite`
7. DoD：
   1. 远征结果可生成协作记忆世界
   2. 多人可贡献内容

### `V3-W7-02` Memory Palace Builder Web Alpha

1. 映射：`V3-30`
2. Owner：`FE Owner`
3. 依赖：`V3-W7-01`
4. 关键交付：
   1. `frontend/src/pages/MemoryWorldPage.tsx`
   2. `frontend/src/features/memory-palace-builder/*`
5. 测试：
   1. component test
   2. contribution flow Playwright smoke
6. 回滚：
   1. builder 仅对 owner 可见
7. DoD：
   1. 可放置 relic、留言、访客足迹
   2. 页面具备访问与共建入口

## Week 8

### `V3-W8-01` Guestbook / Witness / Exhibit 系统

1. 映射：`V3-31`
2. Owner：`BE Owner + Admin Owner`
3. 依赖：`V3-W7-01`
4. 关键交付：
   1. `memory_palace_visits/memory_palace_exhibits` 表
   2. `/api/v3/memory-palaces/:id/visits`
   3. `/api/admin/v3/memory-palaces/:id/feature`
5. 测试：
   1. guestbook integration
   2. exhibit admin e2e
6. 回滚：
   1. 关闭访客写入，只保留只读访问
7. DoD：
   1. 访问、见证、精选展出主链路成立

### `V3-W8-02` Memory World Pack 与主题化发布

1. 映射：`V3-32`
2. Owner：`Tech Lead + Partner Owner`
3. 依赖：`V3-W7-01`
4. 关键交付：
   1. `backend/src/modules/memory-palace-templates/*`
   2. `frontend/src/features/memory-palace/themes/*`
5. 测试：
   1. template rendering smoke
   2. pack publish review flow
6. 回滚：
   1. pack 发布维持 draft，不公开
7. DoD：
   1. 记忆世界支持主题包替换
   2. pack 受审核与 feature flag 控制

## Week 9

### `V3-W9-01` Creator Asset Pipeline 与 Pack Draft

1. 映射：`V3-40`
2. Owner：`FE Owner + BE Owner`
3. 依赖：`V3-W8-02`
4. 关键交付：
   1. `frontend/src/features/creator/*`
   2. `backend/src/modules/creator/*`
   3. `creator_profiles/creator_assets/creator_packs` 表
5. 测试：
   1. upload/preview integration
   2. permission e2e
6. 回滚：
   1. 只保留内部 creator 白名单
7. DoD：
   1. creator 可提交素材
   2. creator 可生成世界包草稿

### `V3-W9-02` Creator Review Queue 与 Preview Renderer

1. 映射：`V3-40` / `V3-51`
2. Owner：`Admin Owner + FE Owner`
3. 依赖：`V3-W9-01`
4. 关键交付：
   1. `admin/src/pages/Creators/index.tsx`
   2. preview render route / moderation API
5. 测试：
   1. admin review e2e
   2. preview smoke
6. 回滚：
   1. 所有 pack 默认草稿态
7. DoD：
   1. pack 可审核、可驳回、可重新提交

## Week 10

### `V3-W10-01` Partner Campaign Runtime

1. 映射：`V3-41`
2. Owner：`Partner Owner + Tech Lead`
3. 依赖：`V3-W1-02`
4. 关键交付：
   1. `backend/src/modules/partners/*`
   2. `/api/v3/partners/campaigns`
   3. `partner_campaigns/partner_rewards/partner_callbacks` 表
5. 测试：
   1. publish/pause/resume e2e
   2. callback signature verification test
6. 回滚：
   1. campaign 一键 pause
7. DoD：
   1. partner 活动可受控发布
   2. callback 与奖励轨迹可审计
8. 执行记录（`2026-03-24`）：
   1. 已交付：`backend/src/modules/partners/partner-campaign.service.ts` + `/api/v3/partners/campaigns*` + `/api/admin/v3/partners/campaigns*` + `admin/src/pages/Partners/index.tsx`。
   2. 已交付：`partner_campaigns/partner_callbacks/partner_rewards` Prisma schema 与迁移，`packages/shared` 合同与 `packages/client-sdk` partner resource。
   3. 安全闭环：`V3_PARTNER_CAMPAIGN_RUNTIME_ENABLED` / `V3_PARTNER_CAMPAIGN_PUBLISH_ENABLED` / `V3_PARTNER_CAMPAIGN_PAUSE_ENABLED` / `V3_PARTNER_CAMPAIGN_RESUME_ENABLED` / `V3_PARTNER_CALLBACKS_ENABLED` / `V3_PARTNER_REWARD_RECORD_ENABLED` fail-closed 开关、callback skew 限制、签名校验与 replay 防护、一键 rollback。
   4. 验证闭环：backend/shared/client-sdk type-check 通过；`client-sdk` partner contract tests 通过；受沙箱限制（listen EPERM）本地 e2e 无法在当前环境直跑，需要在可监听端口的 CI 或本地非沙箱环境补跑。

### `V3-W10-02` Creator License / Asset Anchor

1. 映射：`V3-42`
2. Owner：`Contract Owner + BE Owner`
3. 依赖：`V3-W9-01`
4. 关键交付：
   1. `contracts/` 中 creator binding 合约或 hook
   2. `backend/src/modules/creator-onchain/*`
5. 测试：
   1. contract unit test
   2. anchor replay integration
6. 回滚：
   1. 允许只写库内 binding，不强制上链
7. DoD：
   1. 高价值 creator 资产可被链上见证
   2. 失败可重放
8. 执行记录（`2026-03-24`）：
   1. 已交付：`backend/src/modules/creator-onchain/creator-license-anchor.service.ts`，新增锚定 write/list/replay、`assetId/checksum/ownerWallet/issuedAt` 冻结校验、幂等防重（同元组唯一）与失败回放。
   2. 已交付：`/api/v3/creator/assets/:assetId/license-anchor`、`/api/v3/creator/license-anchors/:bindingId/replay`、`/api/admin/v3/creators/license-anchors*`，接入 integration key、runtime gate、写限流与 admin replay 审计收口。
   3. 已交付：`creator_asset_bindings` / `onchain_creator_assets` Prisma schema + migration（`20260324033000_add_v3_creator_license_anchor`），并补齐 `CreatorAssetBound` / `CreatorLicenseAnchored` / `CreatorLicenseAnchorFailed` / `CreatorLicenseAnchorReplayRequested` 审计事件。
   4. 已交付：`contracts/contracts/CreatorLicenseAnchorHook.sol` + `contracts/test/creator-license-anchor-hook.test.js`，确认 anchor/replay 事件语义与 replay counter。
   5. 已交付：`packages/shared` creator anchor types/schemas 与 `packages/client-sdk` creator anchor resource，补齐 shared/sdk contract tests。
   6. 安全闭环：`V3_CREATOR_LICENSE_ANCHOR_ENABLED` 总开关、`V3_CREATOR_LICENSE_ONCHAIN_ENABLED` 链上开关、`V3_CREATOR_LICENSE_ONCHAIN_REQUIRED` 强约束开关、`V3_CREATOR_LICENSE_FORCE_FAIL` 失败注入回放验证。
   7. 验证闭环（本轮补齐）：`backend` type-check 通过；`creator-license-anchor.service.integration.test.ts` 4/4 通过；`packages/shared` type-check 与 contract tests 通过；`packages/client-sdk` type-check 与 contract tests 通过。受当前沙箱限制，`backend` supertest e2e 仍被 `listen EPERM 0.0.0.0` 阻断；`contracts` 测试在无外网环境下无法下载 `solc` 编译器，需在可联网 CI 或本地非沙箱环境补跑 `contracts/test/creator-license-anchor-hook.test.js`。

## Week 11

### `V3-W11-01` Relationship Edge Ledger 与 Graph Query

1. 映射：`V3-50`
2. Owner：`BE Owner`
3. 依赖：`V3-W4-02`, `V3-W7-01`
4. 关键交付：
   1. `backend/src/modules/relationship-graph/*`
   2. `relationship_edges/relationship_edge_snapshots` 表
   3. `/api/v3/relationship-graph/frogs/:frogId`
5. 测试：
   1. edge aggregation integration
   2. graph query e2e
6. 回滚：
   1. graph 页面隐藏
7. DoD：
   1. journey / rescue / witness / contribution 可沉淀为 edge
   2. graph 查询性能可接受
8. 执行记录（`2026-03-24`）：
   1. 已交付：`backend/src/modules/relationship-graph/relationship-edge-ledger.service.ts`，统一 `JOURNEY/RESCUE/WITNESS/CONTRIBUTION` 四类信号聚合到 edge ledger，支持 identity key 去重、snapshot 计算与 app scope 隔离。
   2. 已交付：`/api/v3/relationship-graph/frogs/:frogId`（integration key + `relationship_graph.read` capability + runtime gate + app scope fail-closed）并挂载到 `/api/v3/relationship-graph/*`。
   3. 已交付：`relationship_edges` / `relationship_edge_snapshots` Prisma schema + migration（`20260324050000_add_v3_relationship_edge_ledger`）。
   4. 已交付：`packages/shared` relationship graph types/schemas 与 `packages/client-sdk` relationship graph resource，补齐 shared/sdk contract tests。
   5. 已交付：`backend` integration + e2e 用例（`relationship-edge-ledger.service.integration.test.ts` / `v3-relationship-graph-routes.e2e.test.ts`）覆盖聚合去重、权限、作用域、runtime 关闭等 fail-closed 路径。
   6. 已交付：`backend/src/modules/relationship-graph/relationship-edge-replay.service.ts` + `backend/src/scripts/replay-relationship-edge-signals.ts`，将 `domain_events` 真实事件按稳定规则映射到 edge ledger：`TravelStarted -> JOURNEY`、`RescueCompleted -> RESCUE`、`RelationshipAttested -> WITNESS`、`RelationshipMilestoneRecorded(BLESSING) -> CONTRIBUTION`（并预留 `MemoryPalaceContributionAdded/MemoryPalaceVisitLogged` frog pair 字段接入）；回放 identity key 固定为 `domain-event:<eventId>`，支持重复执行幂等不重复记分。
   7. 验证闭环：`npm --prefix backend run test -- --runInBand src/__tests__/integration/relationship-edge-replay.service.integration.test.ts` 通过（3/3）；`npm --prefix backend run type-check` 通过；`relationship-edge-ledger.service.integration.test.ts` 回归通过（4/4）。
   8. 已交付（后半段第 2 点）：`frontend/src/pages/RelationshipGraphPage.tsx` + `frontend/src/features/relationship-graph/*` + `frontend/src/__tests__/pages/RelationshipGraphPage.test.tsx` + `frontend/src/__tests__/features/relationship-graph/api.test.ts`，实现关系图 graph 卡片与详情只读页、integration key fail-closed、beta gate 与 navbar 入口回滚收口；同时新增 `backend/src/api/routes/admin/v3-relationship-graph.routes.ts`、挂载 `/api/admin/v3/relationship-graph/*` 与 `V3_RELATIONSHIP_GRAPH_ADMIN_READ_ENABLED` admin 读开关，再接入 `admin/src/pages/RelationshipGraph/index.tsx` 与 `/relationship-graph/:appId/:frogId` 只读观测页。
9. 下一点执行清单（`2026-03-24`）：
   1. 已完成（`2026-03-24`）：`V3-W11-02` 第 1 点已交付 `relationship_edge_anchors` / `onchain_relationship_edge_anchors` 持久化、`relationship-edge-anchor*.service.ts` + `relationship-edge-anchor.adapter.ts` + `replay-relationship-edge-anchors.ts`，支持高价值 edge（`score >= V3_RELATIONSHIP_EDGE_ANCHOR_MIN_SCORE`）锚定、幂等防重（`scopeAppId + edgeId + anchorDigest` 唯一）、失败重放与 fail-closed 开关。
   2. 已完成（`2026-03-24`）：在 `frontend/src/features/relationship-graph/*`、`frontend/src/pages/RelationshipGraphPage.tsx`、`admin/src/pages/RelationshipGraph/index.tsx` 与后端 graph 路由补齐 `edge.anchor` 状态只读展示（`pending/anchored/failed`），并保持 integration key / app scope fail-closed。
   3. 下一点：进入 `V3-W12-01`，落地 V3 Beta 发布门禁与回归矩阵（contract/integration/e2e/playwright + fallback dry-run）。

### `V3-W11-02` Relationship Edge Onchain Anchor

1. 映射：`V3-50`
2. Owner：`Contract Owner + BE Owner`
3. 依赖：`V3-W11-01`
4. 关键交付：
   1. `relationship_edge_anchors` 表
   2. anchor adapter / replay script
5. 测试：
   1. anchor success/failure/retry integration
   2. contract event test
6. 回滚：
   1. anchor 降级为库内标记
7. DoD：
   1. 至少一种高价值 edge 可完成链上锚定
   2. 前端能看到 anchor 状态
8. 执行记录（`2026-03-24`）：
   1. 已交付：`backend/prisma/schema.prisma` 新增 `RelationshipEdgeAnchor` / `OnchainRelationshipEdgeAnchor`，并补齐 migration `20260324062000_add_v3_relationship_edge_anchor`（`relationship_edge_anchors` + `onchain_relationship_edge_anchors`）。
   2. 已交付：`backend/src/modules/relationship-graph/relationship-edge-anchor.adapter.ts`（mock onchain adapter，支持 `V3_RELATIONSHIP_EDGE_ANCHOR_FORCE_FAIL` 失败注入）。
   3. 已交付：`backend/src/modules/relationship-graph/relationship-edge-anchor.service.ts`，实现高价值 edge 锚定、幂等防重、失败回放、`V3_RELATIONSHIP_EDGE_ANCHOR_ENABLED` / `V3_RELATIONSHIP_EDGE_ONCHAIN_ENABLED` / `V3_RELATIONSHIP_EDGE_ONCHAIN_REQUIRED` fail-closed 门控。
   4. 已交付：`backend/src/modules/relationship-graph/relationship-edge-anchor-replay.service.ts` + `backend/src/scripts/replay-relationship-edge-anchors.ts` + `backend/package.json` 脚本 `relationship:edge:anchor:replay`，支持批量重放（含 dry-run）与 `V3_RELATIONSHIP_EDGE_ANCHOR_REPLAY_ENABLED` gate。
   5. 已交付：`backend/src/__tests__/integration/relationship-edge-anchor.service.integration.test.ts` 与 `relationship-edge-anchor-replay.service.integration.test.ts`，覆盖 success/failure/retry 与 replay gate fail-closed。
   6. 已交付（`2026-03-24`）：新增 `backend/src/modules/relationship-graph/relationship-edge-anchor.service.ts` 批量读方法 `listLatestAnchorsByEdgeIds`，并在 `backend/src/api/routes/v3/relationship-graph.routes.ts` / `backend/src/api/routes/admin/v3-relationship-graph.routes.ts` 为每条 edge 聚合 `anchor` 只读字段；同步更新 `packages/shared` relationship graph contract（`edge.anchor`）、`frontend` 与 `admin` 观测页展示，以及 `VITE_V3_RELATIONSHIP_GRAPH_ANCHOR_BETA_ENABLED` / `VITE_V3_RELATIONSHIP_GRAPH_ADMIN_ANCHOR_ENABLED` 双回滚开关。
9. 下一点执行清单（`2026-03-24`）：
   1. 已完成（`2026-03-24`）：在 `frontend/src/features/relationship-graph/*` 与 `admin/src/pages/RelationshipGraph/index.tsx` 增加 anchor 状态只读展示（`pending/anchored/failed`），并保持 integration key / app scope fail-closed。
   2. 已完成（`2026-03-24`）：增加 `VITE_V3_RELATIONSHIP_GRAPH_ANCHOR_BETA_ENABLED`（frontend）与 `VITE_V3_RELATIONSHIP_GRAPH_ADMIN_ANCHOR_ENABLED`（admin）回滚开关，状态面可独立隐藏，不影响既有 graph 查询链路。
   3. 下一点：进入 `V3-W12-01`，先交付 V3 Beta 发布门禁矩阵脚本与 runbook 初稿。

## Week 12

### `V3-W12-01` V3 Beta Release Gate 与 Regression Matrix

1. 映射：`V3-52`
2. Owner：`QA Owner + Tech Lead`
3. 依赖：前 11 周完成
4. 关键交付：
   1. `.github/workflows/v3-*.yml`
   2. `scripts/ci/v3-*.mjs`
   3. `docs/02_开发计划/ZFrog_V3_Beta_Cutover_Runbook.md`
5. 测试：
   1. contract/integration/e2e/playwright/nightly matrix
   2. fallback dry-run
6. 回滚：
   1. Beta 默认挂在 V3 flag 下
   2. 一键退回 V2 主体验
7. DoD：
   1. V3 有单独发布门禁
   2. 有灰度和回滚 runbook
8. 执行记录（`2026-03-24`）：
   1. 已交付：`.github/workflows/v3-beta-regression-matrix.yml`，拆分 `contract/integration/e2e/playwright` 四层 job 并输出标准化 layer report（`reports/v3/layers/*.json`）。
   2. 已交付：`.github/release-gates/v3-beta-release-gate.json` 与 `scripts/ci/v3-beta-release-gate-lib.mjs`、`scripts/ci/v3-beta-release-gate.mjs`，实现 required layer 完整性、状态门禁、新鲜度门禁与 `--dry-run` 豁免模式。
   3. 已交付：`scripts/ci/v3-beta-release-gate-lib.test.mjs` 与 root script 别名 `ci:gate:v3:beta` / `ci:gate:v3:beta:test`，形成脚本级可回归验证入口。
   4. 已交付：`docs/02_开发计划/ZFrog_V3_Beta_Cutover_Runbook.md`，补齐 V3 灰度发布、fallback dry-run 演练与 V2 主体验回滚流程。
   5. 已交付（第 2 点）：`.github/release-gates/v3-rc-gate.json`、`scripts/ci/v3-rc-gate-lib.mjs`、`scripts/ci/v3-rc-gate-check.mjs`、`scripts/ci/v3-rc-gate-archive*.mjs` 与 `.github/workflows/v3-rc-release-gate.yml`，将 `v3-beta-regression-matrix` 的 schedule runs 连续成功、freshness、缺陷预算快照一起纳入 RC gate，并自动归档 `reports/history/v3-rc-gate/*.md`。
   6. 已交付（第 3 点）：`scripts/ci/v3-release-health-summary-lib.mjs` + `scripts/ci/v3-release-health-summary.mjs`，把 RC gate 结果聚合为 `reports/v3/v3-release-health-summary.{md,json}`，用于每次 RC 判定后的健康汇总与行动建议。
   7. 已交付：root script 别名 `ci:gate:v3:rc` / `ci:gate:v3:rc:archive` / `ci:gate:v3:rc:test` / `ci:gate:v3:health-summary` / `ci:gate:v3:health-summary:test`，形成 RC + summary 的本地/CI 统一入口。
   8. 验证闭环（本轮）：
      1. `node --test ./scripts/ci/v3-beta-release-gate-lib.test.mjs`
      2. `node --test ./scripts/ci/v3-rc-gate-lib.test.mjs ./scripts/ci/v3-rc-gate-archive-lib.test.mjs`
      3. `node --test ./scripts/ci/v3-release-health-summary-lib.test.mjs`
      4. `node ./scripts/ci/v3-rc-gate-check.mjs --config ./.github/release-gates/v3-rc-gate.json --runs-fixture ./scripts/ci/fixtures/v3-rc-runs.sample.json --report /tmp/v3-rc-gate-report.md --out-json /tmp/v3-rc-gate.json --now 2026-03-24T06:00:00Z`
      5. `node ./scripts/ci/v3-release-health-summary.mjs --rc-result /tmp/v3-rc-gate.json --report /tmp/v3-release-health-summary.md --out-json /tmp/v3-release-health-summary.json --now 2026-03-24T06:00:00Z`
      6. `node ./scripts/ci/v3-beta-release-gate.mjs --config ./.github/release-gates/v3-beta-release-gate.json --layer-report contract=/tmp/v3-contract.json --layer-report integration=/tmp/v3-integration.json --layer-report e2e=/tmp/v3-e2e.json --layer-report playwright=/tmp/v3-playwright.json --report /tmp/v3-beta-release-gate-report.md --out-json /tmp/v3-beta-release-gate.json`
      7. `node ./scripts/ci/v3-beta-release-gate.mjs --config ./.github/release-gates/v3-beta-release-gate.json --layer-report contract=/tmp/v3-contract.json --layer-report integration=/tmp/v3-integration.json --layer-report e2e=/tmp/v3-e2e-failed.json --layer-report playwright=/tmp/v3-playwright.json --dry-run --report /tmp/v3-beta-release-gate-dry-run.md --out-json /tmp/v3-beta-release-gate-dry-run.json`
9. 下一点执行清单（`2026-03-24`）：
   1. 已完成（`2026-03-24`）：在 `scripts/ci` 补齐 `v3` RC gate（读取 `v3-beta-regression-matrix` 最近 runs，校验连续成功与 freshness）。
   2. 已完成（`2026-03-24`）：新增 `v3` 缺陷快照配置（P0/P1 budget）并纳入 RC gate verdict。
   3. 已完成（`2026-03-24`）：完成 gate 报告归档与健康摘要汇总，`V3-W12-01` 标记为 `已完成`。
   4. 已完成（`2026-03-24`）：进入 `V3-W12-02` 并交付 `admin/src/pages/V3Dashboard/index.tsx` 骨架与总控路由，接入 creator/partner/world/council/graph 五类运营读模型卡片，并补 `VITE_V3_DASHBOARD_BETA_ENABLED` 回滚开关与最小 smoke。

### `V3-W12-02` Admin 审核总控与 Beta 运营看板

1. 映射：`V3-51`
2. Owner：`Admin Owner`
3. 依赖：`V3-W10-01`, `V3-W11-01`
4. 关键交付：
   1. `admin/src/pages/Partners/index.tsx`
   2. `admin/src/pages/Creators/index.tsx`
   3. `admin/src/pages/V3Dashboard/index.tsx`
5. 测试：
   1. admin e2e
   2. report generation smoke
6. 回滚：
   1. 隐藏 Beta 运营页，不影响旧 admin
7. DoD：
   1. creator / partner / world / council / graph 均可在一个总控面看见
   2. 有暂停与审核入口
8. 执行记录（`2026-03-24`）：
   1. 已交付：新增 `admin/src/pages/V3Dashboard/index.tsx`，聚合 `creator/partner/world/council/relationship graph` 五类运营卡片，并提供模块暂停入口（调用 `/api/admin/v3/runtime/modules/:module/toggle`）。
   2. 已交付：新增 `admin/src/features/v3-dashboard/runtime.ts`，支持 `VITE_V3_DASHBOARD_BETA_ENABLED` + `__ZFROG_ADMIN_V3_DASHBOARD_BETA__` 双态回滚门控。
   3. 已交付：`admin/src/App.tsx` 新增 `/v3-dashboard` 路由，`admin/src/components/Layout/MainLayout.tsx` 新增 `V3 Dashboard` 菜单入口，并按 beta gate 动态显隐。
   4. 验证闭环（本轮）：
      1. `npm --prefix admin run build` 通过（TypeScript + 打包 smoke）。
      2. `npm --prefix backend run test -- --runInBand src/__tests__/e2e/v3-runtime-routes.e2e.test.ts src/__tests__/e2e/admin-v3-creators-routes.e2e.test.ts src/__tests__/e2e/admin-v3-partners-routes.e2e.test.ts src/__tests__/e2e/admin-v3-memory-palaces-routes.e2e.test.ts src/__tests__/e2e/admin-v3-council-routes.e2e.test.ts src/__tests__/e2e/admin-v3-relationship-graph-routes.e2e.test.ts` 受沙箱端口限制失败：`listen EPERM 0.0.0.0`（需在可开放端口环境补跑）。
9. 下一点执行清单（`2026-03-24`）：
   1. 已完成（`2026-03-24`）：进入 `V3-RC-01`，补齐 `V3Dashboard` Playwright 双态 smoke（beta on/off）并把运营冻结/回滚演练模板写入 runbook。
   2. 下一点：进入 `V3-RC-02`，在可开放端口环境补跑 admin 双态 smoke，并把首份 `v3-dashboard-freeze-rollback-drill` 记录归档到 `reports/v3/`。

### `V3-RC-01` V3Dashboard 双态 Smoke 与运营冻结回滚模板

1. 映射：`V3-51`
2. Owner：`QA Owner + Admin Owner`
3. 依赖：`V3-W12-02`
4. 关键交付：
   1. `frontend/playwright.admin.config.ts`
   2. `frontend/e2e/admin-v3-dashboard-smoke.e2e.ts`
   3. `docs/02_开发计划/ZFrog_V3_Beta_Cutover_Runbook.md`
   4. `.github/workflows/v3-beta-regression-matrix.yml`
5. 测试：
   1. admin `V3Dashboard` beta on/off Playwright smoke
   2. V3 matrix playwright layer 包含 admin 双态 smoke
6. 回滚：
   1. 移除 workflow 中 `test:e2e:admin:v3-dashboard` 调用可快速回退 smoke 注入
   2. 保留 `VITE_V3_DASHBOARD_BETA_ENABLED` / `__ZFROG_ADMIN_V3_DASHBOARD_BETA__` 双 gate，必要时直接隐藏入口
7. DoD：
   1. beta off 可验证 fail-closed（入口隐藏 + 路由告警）
   2. beta on 可验证核心运营路径（总览加载 + 模块冻结切换 + graph 跳转）
   3. runbook 有可复用的冻结/回滚演练模板并定义归档路径
8. 执行记录（`2026-03-24`）：
   1. 已交付：新增 `frontend/playwright.admin.config.ts`（admin 专用 baseURL + webServer）与 `frontend/package.json` 脚本 `test:e2e:admin:v3-dashboard`。
   2. 已交付：新增 `frontend/e2e/admin-v3-dashboard-smoke.e2e.ts`，覆盖：
      1. beta off：`V3 Dashboard` 菜单入口隐藏、直接访问 `/v3-dashboard` 返回关闭告警；
      2. beta on：mock `/api/admin/v3/*` 总览读取、`relationshipGraph` 模块 toggle、`/relationship-graph/:appId/:frogId` 跳转。
   3. 已交付：`.github/workflows/v3-beta-regression-matrix.yml` 的 Playwright 层接入 `npm --prefix frontend run test:e2e:admin:v3-dashboard`，并在描述中标注 admin 双态 smoke。
   4. 已交付：`docs/02_开发计划/ZFrog_V3_Beta_Cutover_Runbook.md` 新增第 11 节“V3Dashboard 运营冻结/回滚演练记录模板”，并约定产出文件 `reports/v3/v3-dashboard-freeze-rollback-drill-*.md`。
   5. 验证闭环（本轮）：
      1. `npm --prefix admin run build` 通过。
      2. `npm --prefix frontend run test:e2e:admin:v3-dashboard -- --list` 通过（用例发现正常：2 tests）。
      3. `npm --prefix frontend run test:e2e:admin:v3-dashboard` 受沙箱端口限制失败：`listen EPERM 127.0.0.1:4174`（需在可开放端口环境补跑）。
9. 下一点执行清单（`2026-03-24`）：
   1. 已完成（`2026-03-24`）：进入 `V3-RC-02` 并交付 `scripts/ci/v3-dashboard-drill-report*.mjs`，将冻结/回滚演练归档接入 `v3-beta-regression-matrix` 的 `summary` job。
   2. 已完成（`2026-03-24`）：基于同一归档模板产出首份阻塞态记录 `reports/v3/v3-dashboard-freeze-rollback-drill-20260324-0000-run-local.md`。
   3. 下一点：在 CI/staging 执行一次可开放端口的 admin 双态 smoke 实跑并附运行链接，产出 PASS 态归档。

### `V3-RC-02` Admin 双态 Smoke 实跑证据与首份演练归档

1. 映射：`V3-51`
2. Owner：`QA Owner + Admin Owner`
3. 依赖：`V3-RC-01`
4. 关键交付：
   1. `scripts/ci/v3-dashboard-drill-report.mjs`
   2. `scripts/ci/v3-dashboard-drill-report-lib.mjs`
   3. `scripts/ci/v3-dashboard-drill-report-lib.test.mjs`
   4. `.github/workflows/v3-beta-regression-matrix.yml`（summary 归档步骤）
   5. `reports/v3/v3-dashboard-freeze-rollback-drill-20260324-0000-run-local.md`
   6. `scripts/ci/v3-dashboard-drill-backlog-apply.mjs`
   7. `scripts/ci/v3-dashboard-drill-backlog-apply-lib.mjs`
   8. `scripts/ci/v3-dashboard-drill-backlog-apply-lib.test.mjs`
   9. `scripts/ci/v3-dashboard-drill-closeout-apply.mjs`
   10. `scripts/ci/v3-dashboard-drill-closeout-apply-lib.mjs`
5. 测试：
   1. `node --test ./scripts/ci/v3-dashboard-drill-report-lib.test.mjs`
   2. `node ./scripts/ci/v3-dashboard-drill-report.mjs --playwright-layer-report /tmp/v3-dashboard-playwright-layer.local.json --run-id local --run-url n/a --report ./reports/v3/v3-dashboard-freeze-rollback-drill-20260324-0000-run-local.md --out-json ./reports/v3/v3-dashboard-freeze-rollback-drill-20260324-0000-run-local.json --now 2026-03-24T00:00:00Z --environment sandbox --trigger-reason "sandbox blocked rehearsal"`
   3. `node --test ./scripts/ci/v3-dashboard-drill-backlog-lib.test.mjs ./scripts/ci/v3-dashboard-drill-backlog-apply-lib.test.mjs`
6. 回滚：
   1. 从 workflow 移除 `v3-dashboard-drill-report.mjs` 步骤即可回退自动归档注入，不影响既有 gate verdict。
   2. 脚本侧 fail-closed 保护可阻断“无证据 PASS 报告”落盘，防止误判发布状态。
   3. 从 workflow 移除 `Generate V3 backlog apply preview` 步骤即可回退文档预写入预览，不影响 gate verdict。
7. DoD：
   1. Playwright layer 每次运行都可自动产出一份 drill 报告（`md + json`）。
   2. 报告结论可随 layer 结果自动落到 `可发布/暂缓发布`，且 PASS 必须带 run URL。
   3. 形成首份可追溯归档文件并纳入 V3 证据链。
   4. 可自动生成 backlog“应用后预览”，防止 run URL/结论回写遗漏。
8. 执行记录（`2026-03-24`）：
   1. 已交付：新增 `v3-dashboard-drill-report` 生成器与 lib/test，统一渲染 runbook 模板结构并内置 PASS 证据校验。
   2. 已交付：`.github/workflows/v3-beta-regression-matrix.yml` 新增 drill 报告生成步骤与 `GITHUB_STEP_SUMMARY` 汇总输出。
   3. 已交付：新增首份阻塞态演练报告 `reports/v3/v3-dashboard-freeze-rollback-drill-20260324-0000-run-local.md` 与同名 json。
   4. 已交付：新增 `scripts/ci/v3-dashboard-drill-backlog-lib.mjs`、`scripts/ci/v3-dashboard-drill-backlog.mjs` 与 `scripts/ci/v3-dashboard-drill-backlog-lib.test.mjs`，对演练证据执行 fail-closed 一致性校验（`smokeResult`、`conclusion`、`runUrl`、`runId`），并自动生成可直接回写 backlog 的标准片段（含“下一点”）。
   5. 已交付：`.github/workflows/v3-beta-regression-matrix.yml` 新增 `Generate V3Dashboard backlog update snippet` 步骤，自动产出 `reports/v3/v3-dashboard-freeze-rollback-drill-${GITHUB_RUN_ID}-backlog.md` 并附加到 `GITHUB_STEP_SUMMARY`。
   6. 验证闭环（本轮）：
      1. `node --test ./scripts/ci/v3-dashboard-drill-report-lib.test.mjs ./scripts/ci/v3-dashboard-drill-backlog-lib.test.mjs` 通过。
      2. `node ./scripts/ci/v3-dashboard-drill-backlog.mjs --drill-json ./reports/v3/v3-dashboard-freeze-rollback-drill-20260324-0000-run-local.json --report-md ./reports/v3/v3-dashboard-freeze-rollback-drill-20260324-0000-run-local.md --out-md ./reports/v3/v3-dashboard-freeze-rollback-drill-20260324-0000-run-local-backlog.md --task-id V3-RC-02 --expected-run-id local --environment sandbox` 通过并生成阻塞态回写片段。
      3. `npm --prefix frontend run test:e2e:admin:v3-dashboard` 受沙箱端口限制失败：`listen EPERM 127.0.0.1:4174`（阻塞已写入首份 drill 报告并标记 `暂缓发布`）。
   7. 已交付：新增 `scripts/ci/v3-dashboard-drill-backlog-apply-lib.mjs`、`scripts/ci/v3-dashboard-drill-backlog-apply.mjs` 与 `scripts/ci/v3-dashboard-drill-backlog-apply-lib.test.mjs`，将自动生成的 snippet fail-closed 合并到 `V3-RC-02` 任务卡（缺段落/错 runId/重复证据直接失败）。
   8. 已交付：`.github/workflows/v3-beta-regression-matrix.yml` 新增 `Generate V3 backlog apply preview` 步骤，产出 `reports/v3/v3-dashboard-freeze-rollback-drill-${GITHUB_RUN_ID}-backlog-applied.md` 预览文件供人工落库。
   9. 验证闭环（本轮补充）：
      1. `node --test ./scripts/ci/v3-dashboard-drill-backlog-lib.test.mjs ./scripts/ci/v3-dashboard-drill-backlog-apply-lib.test.mjs` 通过。
      2. `node ./scripts/ci/v3-dashboard-drill-backlog-apply.mjs --snippet-md /tmp/v3-dashboard-pass-backlog.md --backlog-doc ./docs/02_开发计划/ZFrog_V3_Issue_Backlog_可开工版.md --task-id V3-RC-02 --expected-run-id 778899 --out-doc /tmp/v3-dashboard-pass-backlog-applied.md` 通过并生成回写预览。
   10. 已交付：新增 `scripts/ci/v3-dashboard-drill-evidence-gate-lib.mjs`、`scripts/ci/v3-dashboard-drill-evidence-gate.mjs` 与 `scripts/ci/v3-dashboard-drill-evidence-gate-lib.test.mjs`，对 `drill/backlog/backlog-applied` 三类产物执行 runId/runUrl/smoke/conclusion 与落盘内容一致性 fail-closed 对账（支持 `--require-publishable` 关单前强约束）。
   11. 已交付：`.github/workflows/v3-beta-regression-matrix.yml` 新增 `Verify V3Dashboard evidence triad consistency` 步骤，自动产出 `reports/v3/v3-dashboard-freeze-rollback-drill-${GITHUB_RUN_ID}-evidence-gate.{md,json}` 并在对账失败时阻断 workflow。
   12. 验证闭环（本轮新增）：
      1. `node --test ./scripts/ci/v3-dashboard-drill-evidence-gate-lib.test.mjs` 通过。
      2. `node ./scripts/ci/v3-dashboard-drill-evidence-gate.mjs --run-id local --reports-dir ./reports/v3 --backlog-applied /tmp/v3-dashboard-local-backlog-applied.md --report /tmp/v3-dashboard-local-evidence-gate.md --out-json /tmp/v3-dashboard-local-evidence-gate.json` 通过（阻塞态对账 PASS，`readyToClose=no`）。
   13. 已交付：新增 `scripts/ci/v3-dashboard-drill-closeout-lib.mjs`、`scripts/ci/v3-dashboard-drill-closeout.mjs` 与 `scripts/ci/v3-dashboard-drill-closeout-lib.test.mjs`，将 `证据对账 + backlog 正式回写` 合并为一条命令，并默认启用 `--require-publishable`（非 publishable 或对账不一致直接失败）。
   14. 验证闭环（本轮新增）：
      1. `node --test ./scripts/ci/v3-dashboard-drill-closeout-lib.test.mjs` 通过。
      2. `node ./scripts/ci/v3-dashboard-drill-closeout.mjs --run-id local --reports-dir ./reports/v3 --backlog-applied /tmp/v3-dashboard-local-backlog-applied.md --backlog-doc ./docs/02_开发计划/ZFrog_V3_Issue_Backlog_可开工版.md --out-doc /tmp/v3-dashboard-local-backlog-closeout.md --require-publishable true` 预期失败并命中 fail-closed（`not publishable`）。
   15. 已交付（`2026-03-24`）：补强 `scripts/ci/v3-dashboard-drill-evidence-gate-lib.mjs` 与 `scripts/ci/v3-dashboard-drill-closeout*.mjs`，将 `drill report.md` 纳入强制语义对账（`runId/runUrl/smoke/conclusion`），防止“json 与 snippet 一致但 markdown 证据被篡改”的漏检风险。
   16. 验证闭环（本轮补强）：
      1. `node --test ./scripts/ci/v3-dashboard-drill-evidence-gate-lib.test.mjs ./scripts/ci/v3-dashboard-drill-closeout-lib.test.mjs ./scripts/ci/v3-dashboard-drill-backlog-apply-lib.test.mjs ./scripts/ci/v3-dashboard-drill-backlog-lib.test.mjs ./scripts/ci/v3-dashboard-drill-report-lib.test.mjs` 通过（19/19）。
      2. `node ./scripts/ci/v3-dashboard-drill-evidence-gate.mjs --run-id local --reports-dir ./reports/v3 --backlog-applied /tmp/v3-dashboard-local-backlog-applied.md --report /tmp/v3-dashboard-local-evidence-gate.md --out-json /tmp/v3-dashboard-local-evidence-gate.json` 通过（包含 `report.md` 对账，`readyToClose=no`）。
      3. `node ./scripts/ci/v3-dashboard-drill-closeout.mjs --run-id local --reports-dir ./reports/v3 --backlog-applied /tmp/v3-dashboard-local-backlog-applied.md --backlog-doc ./docs/02_开发计划/ZFrog_V3_Issue_Backlog_可开工版.md --out-doc /tmp/v3-dashboard-local-backlog-closeout.md --require-publishable false` 通过（阻塞态 rehearsal 仍可预览，strict 关单约束未放松）。
   17. 已交付（`2026-03-24`）：补齐 `run-manifest + 新鲜度` 安全闭环：新增 `scripts/ci/v3-dashboard-drill-run-manifest.mjs` 与 `scripts/ci/v3-dashboard-drill-run-manifest-lib.mjs`（含 test），并将 `evidence-gate/closeout` 强制接入 `run-manifest` 对账（`workflowName/workflowFile/runId/runUrl`）与时间窗校验（默认 `max-manifest-age-hours=72`，未来偏移>5m fail-closed）；workflow summary 同步产出 `reports/v3/v3-dashboard-freeze-rollback-drill-${GITHUB_RUN_ID}-run-manifest.json` 与带 manifest 参数的 closeout 命令提示。
   18. 验证闭环（本轮新增）：
      1. `node --test ./scripts/ci/v3-dashboard-drill-run-manifest-lib.test.mjs ./scripts/ci/v3-dashboard-drill-evidence-gate-lib.test.mjs ./scripts/ci/v3-dashboard-drill-closeout-lib.test.mjs` 通过。
      2. `node ./scripts/ci/v3-dashboard-drill-run-manifest.mjs --run-id local --run-url n/a --workflow-name v3-beta-regression-matrix --workflow-file .github/workflows/v3-beta-regression-matrix.yml --event-name sandbox --repository local/zfrog --ref local --sha local --out-json ./reports/v3/v3-dashboard-freeze-rollback-drill-local-run-manifest.json` 通过。
      3. `node ./scripts/ci/v3-dashboard-drill-evidence-gate.mjs --run-id local --reports-dir ./reports/v3 --run-manifest ./reports/v3/v3-dashboard-freeze-rollback-drill-local-run-manifest.json --max-manifest-age-hours 72 --backlog-applied /tmp/v3-dashboard-local-backlog-applied.md --report /tmp/v3-dashboard-local-evidence-gate-with-manifest.md --out-json /tmp/v3-dashboard-local-evidence-gate-with-manifest.json` 通过（阻塞态对账 PASS，`readyToClose=no`）。
      4. `node ./scripts/ci/v3-dashboard-drill-closeout.mjs --run-id local --reports-dir ./reports/v3 --run-manifest ./reports/v3/v3-dashboard-freeze-rollback-drill-local-run-manifest.json --backlog-applied /tmp/v3-dashboard-local-backlog-applied.md --backlog-doc ./docs/02_开发计划/ZFrog_V3_Issue_Backlog_可开工版.md --out-doc /tmp/v3-dashboard-local-backlog-closeout-with-manifest.md --max-manifest-age-hours 72 --require-publishable false` 通过（继续保持 strict 模式默认不放宽）。
   19. 已交付（`2026-03-24`）：补齐 `manifest 摘要对账` 安全闭环：升级 `scripts/ci/v3-dashboard-drill-run-manifest*.mjs` 生成 `drillReportMd/drillJson/backlogSnippetMd/backlogAppliedMd` 四类证据 `path/sha256/bytes` 摘要；升级 `scripts/ci/v3-dashboard-drill-evidence-gate*.mjs` 与 `scripts/ci/v3-dashboard-drill-closeout*.mjs` 强制摘要一致性校验（摘要缺失、路径不匹配或内容哈希不一致均 fail-closed）；workflow 的 run-manifest 步骤显式绑定四类证据路径。
   20. 验证闭环（本轮补强）：
      1. `node --test ./scripts/ci/v3-dashboard-drill-run-manifest-lib.test.mjs ./scripts/ci/v3-dashboard-drill-evidence-gate-lib.test.mjs ./scripts/ci/v3-dashboard-drill-closeout-lib.test.mjs` 通过（13/13，含摘要篡改失败用例）。
      2. `node ./scripts/ci/v3-dashboard-drill-run-manifest.mjs --run-id local --run-url n/a --reports-dir ./reports/v3 --drill-report-md-path ./reports/v3/v3-dashboard-freeze-rollback-drill-local.md --drill-json-path ./reports/v3/v3-dashboard-freeze-rollback-drill-local.json --backlog-snippet-path ./reports/v3/v3-dashboard-freeze-rollback-drill-local-backlog.md --backlog-applied-path /tmp/v3-dashboard-local-backlog-applied.md --workflow-name v3-beta-regression-matrix --workflow-file .github/workflows/v3-beta-regression-matrix.yml --event-name sandbox --repository local/zfrog --ref local --sha local --run-attempt 1 --out-json ./reports/v3/v3-dashboard-freeze-rollback-drill-local-run-manifest.json` 通过（`artifactDigests=4`）。
      3. `node ./scripts/ci/v3-dashboard-drill-evidence-gate.mjs --run-id local --reports-dir ./reports/v3 --run-manifest ./reports/v3/v3-dashboard-freeze-rollback-drill-local-run-manifest.json --backlog-applied /tmp/v3-dashboard-local-backlog-applied.md --report /tmp/v3-dashboard-local-evidence-gate-with-digest-manifest.md --out-json /tmp/v3-dashboard-local-evidence-gate-with-digest-manifest.json --max-manifest-age-hours 72` 通过（摘要条目数=4、对账 PASS、`readyToClose=no`）。
      4. `node ./scripts/ci/v3-dashboard-drill-closeout.mjs --run-id local --reports-dir ./reports/v3 --run-manifest ./reports/v3/v3-dashboard-freeze-rollback-drill-local-run-manifest.json --backlog-applied /tmp/v3-dashboard-local-backlog-applied.md --backlog-doc ./docs/02_开发计划/ZFrog_V3_Issue_Backlog_可开工版.md --out-doc /tmp/v3-dashboard-local-backlog-closeout-with-digest-manifest.md --max-manifest-age-hours 72 --require-publishable false` 通过（阻塞态 rehearsal 继续可预览）。
   21. 已交付（`2026-03-24`）：补齐“证据路径作用域”安全闭环：统一更新 `scripts/ci/v3-dashboard-drill-run-manifest-lib.mjs`、`scripts/ci/v3-dashboard-drill-run-manifest.mjs`、`scripts/ci/v3-dashboard-drill-evidence-gate-lib.mjs`、`scripts/ci/v3-dashboard-drill-evidence-gate.mjs`、`scripts/ci/v3-dashboard-drill-closeout.mjs`，强制 `report-md/drill-json/snippet-md/backlog-applied/run-manifest` 只能读取当前 run 固定命名产物（`reports/v3/v3-dashboard-freeze-rollback-drill-${runId}*`），禁止通过参数注入外部路径。
   22. 验证闭环（本轮补强）：
      1. `node --test ./scripts/ci/v3-dashboard-drill-run-manifest-lib.test.mjs ./scripts/ci/v3-dashboard-drill-evidence-gate-lib.test.mjs ./scripts/ci/v3-dashboard-drill-closeout-lib.test.mjs` 通过（16/16，新增路径作用域用例）。
      2. `node ./scripts/ci/v3-dashboard-drill-backlog-apply.mjs --snippet-md ./reports/v3/v3-dashboard-freeze-rollback-drill-local-backlog.md --backlog-doc ./docs/02_开发计划/ZFrog_V3_Issue_Backlog_可开工版.md --task-id V3-RC-02 --expected-run-id local --out-doc ./reports/v3/v3-dashboard-freeze-rollback-drill-local-backlog-applied.md` 通过（生成固定路径预览产物）。
      3. `node ./scripts/ci/v3-dashboard-drill-run-manifest.mjs --run-id local --run-url n/a --reports-dir ./reports/v3 --drill-report-md-path ./reports/v3/v3-dashboard-freeze-rollback-drill-local.md --drill-json-path ./reports/v3/v3-dashboard-freeze-rollback-drill-local.json --backlog-snippet-path ./reports/v3/v3-dashboard-freeze-rollback-drill-local-backlog.md --backlog-applied-path ./reports/v3/v3-dashboard-freeze-rollback-drill-local-backlog-applied.md --workflow-name v3-beta-regression-matrix --workflow-file .github/workflows/v3-beta-regression-matrix.yml --event-name sandbox --repository local/zfrog --ref local --sha local --run-attempt 1 --out-json ./reports/v3/v3-dashboard-freeze-rollback-drill-local-run-manifest.json` 通过；将 `--backlog-applied-path /tmp/...` 作为负例执行会按预期失败（路径越界 fail-closed）。
      4. `node ./scripts/ci/v3-dashboard-drill-evidence-gate.mjs --run-id local --reports-dir ./reports/v3 --run-manifest ./reports/v3/v3-dashboard-freeze-rollback-drill-local-run-manifest.json --report ./reports/v3/v3-dashboard-freeze-rollback-drill-local-evidence-gate.md --out-json ./reports/v3/v3-dashboard-freeze-rollback-drill-local-evidence-gate.json --max-manifest-age-hours 72` 通过（新增路径作用域检查全部 PASS）；将 `--snippet-md /tmp/...` 作为负例执行会按预期失败（路径越界 fail-closed）。
      5. `node ./scripts/ci/v3-dashboard-drill-closeout.mjs --run-id local --reports-dir ./reports/v3 --run-manifest ./reports/v3/v3-dashboard-freeze-rollback-drill-local-run-manifest.json --backlog-doc /tmp/v3-dashboard-closeout-backlog-base.md --out-doc /tmp/v3-dashboard-closeout-backlog-result.md --require-publishable false --max-manifest-age-hours 72` 通过；将 `--backlog-applied /tmp/...` 作为负例执行会按预期失败（路径越界 fail-closed）。
   23. 已交付（`2026-03-24`）：补齐“发布态 run URL 规范化”安全闭环：更新 `scripts/ci/v3-dashboard-drill-report-lib.mjs`、`scripts/ci/v3-dashboard-drill-backlog-lib.mjs`、`scripts/ci/v3-dashboard-drill-evidence-gate-lib.mjs` 与 `scripts/ci/v3-dashboard-drill-report.mjs`，发布态强制 `runUrl` 为规范 workflow 链接（`.../actions/runs/<runId>`）且与 `runId` 绑定，不满足即 fail-closed，防止“多产物一致但证据链接无效”漏检。
   24. 验证闭环（本轮新增）：
      1. `node --test ./scripts/ci/v3-dashboard-drill-report-lib.test.mjs ./scripts/ci/v3-dashboard-drill-backlog-lib.test.mjs ./scripts/ci/v3-dashboard-drill-evidence-gate-lib.test.mjs ./scripts/ci/v3-dashboard-drill-closeout-lib.test.mjs ./scripts/ci/v3-dashboard-drill-run-manifest-lib.test.mjs` 通过（30/30，含 runUrl 非 canonical 与 runId/url 绑定负例）。
   25. 已交付（`2026-03-24`）：补齐“publishable 证据来源身份”安全闭环：收紧 `scripts/ci/v3-dashboard-drill-report-lib.mjs` 与 `scripts/ci/v3-dashboard-drill-evidence-gate-lib.mjs`，发布态 `runUrl` 仅允许 `https://<host>/<owner>/<repo>/actions/runs/<runId>`（拒绝 `http`、query/hash 与非 canonical 变体）；同时新增 publishable 场景 `manifest.repository` 必须为已知仓库（不可 `unknown`）的强约束，避免“URL 结构正确但来源仓库身份缺失”绕过。
   26. 验证闭环（本轮新增）：
      1. `node --test ./scripts/ci/v3-dashboard-drill-report-lib.test.mjs ./scripts/ci/v3-dashboard-drill-backlog-lib.test.mjs ./scripts/ci/v3-dashboard-drill-backlog-apply-lib.test.mjs ./scripts/ci/v3-dashboard-drill-evidence-gate-lib.test.mjs ./scripts/ci/v3-dashboard-drill-closeout-lib.test.mjs ./scripts/ci/v3-dashboard-drill-run-manifest-lib.test.mjs` 通过（35/35，含 `http/query/hash` 与 `manifest.repository=unknown` 负例）。
   27. 已交付（`2026-03-24`）：补齐“publishable 证据 host 可信锚点”安全闭环：升级 `scripts/ci/v3-dashboard-drill-run-manifest-lib.mjs` 与 `scripts/ci/v3-dashboard-drill-run-manifest.mjs` 写入 `serverUrl/serverHost/runUrlHost` 元数据，并升级 `scripts/ci/v3-dashboard-drill-evidence-gate-lib.mjs`、`scripts/ci/v3-dashboard-drill-evidence-gate.mjs`、`scripts/ci/v3-dashboard-drill-closeout*.mjs` 强制 publishable 场景 `runUrl.host` 与 `manifest.serverHost` 一致；同时支持 `--expected-server-url` 绑定 CI `GITHUB_SERVER_URL`，host 缺失或不一致一律 fail-closed。
   28. 验证闭环（本轮新增）：
      1. `node --test ./scripts/ci/v3-dashboard-drill-run-manifest-lib.test.mjs ./scripts/ci/v3-dashboard-drill-evidence-gate-lib.test.mjs ./scripts/ci/v3-dashboard-drill-closeout-lib.test.mjs ./scripts/ci/v3-dashboard-drill-report-lib.test.mjs ./scripts/ci/v3-dashboard-drill-backlog-lib.test.mjs ./scripts/ci/v3-dashboard-drill-backlog-apply-lib.test.mjs` 通过（39/39，含 `serverUrl=https`、`runUrl host` 不匹配、`expected-server-url` 不匹配负例）。
   29. 已交付（`2026-03-24`）：补齐“closeout 自动预览 gate”安全闭环：更新 `.github/workflows/v3-beta-regression-matrix.yml`，在 `summary` job 自动执行 `v3-dashboard-drill-closeout` 生成 `backlog-closeout` 预览产物；非 dry-run 默认 strict（`--require-publishable=true`），dry-run rehearsal 自动降级（`false`）；新增 closeout 失败阻断步骤，防止“证据已产出但关单预览缺失/错误”漏检。
   30. 验证闭环（本轮新增）：
      1. `node --test ./scripts/ci/v3-dashboard-drill-closeout-lib.test.mjs ./scripts/ci/v3-dashboard-drill-evidence-gate-lib.test.mjs ./scripts/ci/v3-dashboard-drill-run-manifest-lib.test.mjs` 通过（22/22）。
   31. 已交付（`2026-03-24`）：补齐“closeout 落库变更边界”安全闭环：升级 `scripts/ci/v3-dashboard-drill-closeout-lib.mjs`，新增 `assertV3DashboardCloseoutDocChangeScope` fail-closed 校验，强制 `backlog-closeout` 预览只允许改动 `V3-RC-02` 任务段落且原有段落内容必须 append-only 保留（禁止改写/删除），防止自动关单预览误改其他任务卡内容后被直接落库。
   32. 验证闭环（本轮新增）：
      1. `node --test ./scripts/ci/v3-dashboard-drill-closeout-lib.test.mjs ./scripts/ci/v3-dashboard-drill-evidence-gate-lib.test.mjs ./scripts/ci/v3-dashboard-drill-run-manifest-lib.test.mjs` 通过（26/26，新增 closeout 文档 scope/append-only 负例）。
   33. 已交付（`2026-03-24`）：补齐“closeout 预览正式落库 apply gate”安全闭环：新增 `scripts/ci/v3-dashboard-drill-closeout-apply-lib.mjs`、`scripts/ci/v3-dashboard-drill-closeout-apply.mjs` 与 `scripts/ci/v3-dashboard-drill-closeout-apply-lib.test.mjs`，在正式写回 backlog 前强制执行 `strict evidence re-check + preview deterministic 一致性校验`；若 `backlog-closeout` 预览与同 run 证据重算结果不一致（含篡改、跨 run、错路径）则 fail-closed。
   34. 验证闭环（本轮新增）：
      1. `node --test ./scripts/ci/v3-dashboard-drill-closeout-apply-lib.test.mjs ./scripts/ci/v3-dashboard-drill-closeout-lib.test.mjs ./scripts/ci/v3-dashboard-drill-evidence-gate-lib.test.mjs` 通过（29/29，含 preview 篡改与 strict 非 publishable 负例）。
   35. 已交付（`2026-03-24`）：补齐“publishable 仓库身份强绑定”安全闭环：升级 `scripts/ci/v3-dashboard-drill-evidence-gate-lib.mjs`、`scripts/ci/v3-dashboard-drill-evidence-gate.mjs`、`scripts/ci/v3-dashboard-drill-closeout-lib.mjs`、`scripts/ci/v3-dashboard-drill-closeout.mjs`、`scripts/ci/v3-dashboard-drill-closeout-apply-lib.mjs` 与 `scripts/ci/v3-dashboard-drill-closeout-apply.mjs`，新增 `--expected-repository` 约束（默认绑定 `GITHUB_REPOSITORY`）；publishable 场景强制 `manifest.repository` 与 `runUrl.repository` 同时命中预期仓库，否则 fail-closed。
   36. 验证闭环（本轮新增）：
      1. `node --test ./scripts/ci/v3-dashboard-drill-evidence-gate-lib.test.mjs ./scripts/ci/v3-dashboard-drill-closeout-lib.test.mjs ./scripts/ci/v3-dashboard-drill-closeout-apply-lib.test.mjs` 通过（23/23，含 cross-repo 负例）。
   37. 已交付（`2026-03-24`）：将 `expected-repository` 强约束正式接入 `.github/workflows/v3-beta-regression-matrix.yml` 的 `evidence-gate` 与 `closeout-preview` 步骤，并更新 step summary 中 publishable closeout/closeout-apply 命令模板（统一追加 `--expected-repository ${GITHUB_REPOSITORY}`），防止 CI 演练命令与脚本约束漂移。
   38. 验证闭环（本轮新增）：
      1. `node ./scripts/ci/v3-dashboard-drill-evidence-gate.mjs --run-id local --reports-dir ./reports/v3 --task-id V3-RC-02 --run-manifest ./reports/v3/v3-dashboard-freeze-rollback-drill-local-run-manifest.json --expected-server-url https://github.com --expected-repository RSXLX/ZFrog --max-manifest-age-hours 72 --report /tmp/v3-dashboard-local-evidence-gate-with-expected-repo.md --out-json /tmp/v3-dashboard-local-evidence-gate-with-expected-repo.json` 通过（`passed=true`、`readyToClose=false`、`publishable=false`）。
      2. `node ./scripts/ci/v3-dashboard-drill-closeout.mjs --run-id local --reports-dir ./reports/v3 --run-manifest ./reports/v3/v3-dashboard-freeze-rollback-drill-local-run-manifest.json --backlog-doc /tmp/v3-rc02-backlog-base.md --out-doc /tmp/v3-rc02-backlog-closeout-with-expected-repo.md --expected-server-url https://github.com --expected-repository RSXLX/ZFrog --max-manifest-age-hours 72 --require-publishable false` 通过（阻塞态 rehearsal 预览成功）。
      3. `node ./scripts/ci/v3-dashboard-drill-closeout-apply.mjs --run-id local --reports-dir ./reports/v3 --run-manifest ./reports/v3/v3-dashboard-freeze-rollback-drill-local-run-manifest.json --closeout-preview ./reports/v3/v3-dashboard-freeze-rollback-drill-local-backlog-closeout.md --backlog-doc /tmp/v3-rc02-backlog-apply-base.md --expected-server-url https://github.com --expected-repository RSXLX/ZFrog --max-manifest-age-hours 72 --require-publishable false` 通过（apply gate 仍保持 strict 可重放）。
   39. 已交付（`2026-03-24`）：补齐“run attempt 身份强绑定”安全闭环：升级 `scripts/ci/v3-dashboard-drill-run-manifest-lib.mjs`（`runAttempt` 必须为正整数）与 `scripts/ci/v3-dashboard-drill-evidence-gate*.mjs`、`scripts/ci/v3-dashboard-drill-closeout*.mjs`、`scripts/ci/v3-dashboard-drill-closeout-apply*.mjs`（新增 `--expected-run-attempt`，默认绑定 `GITHUB_RUN_ATTEMPT`），并将该参数接入 `.github/workflows/v3-beta-regression-matrix.yml` 的 `evidence-gate` / `closeout-preview` 与 step summary 命令模板，防止同 `run_id` 不同 attempt 的历史证据被误关单。
   40. 验证闭环（本轮新增）：
      1. `node --test ./scripts/ci/v3-dashboard-drill-run-manifest-lib.test.mjs ./scripts/ci/v3-dashboard-drill-evidence-gate-lib.test.mjs ./scripts/ci/v3-dashboard-drill-closeout-lib.test.mjs ./scripts/ci/v3-dashboard-drill-closeout-apply-lib.test.mjs` 通过（35/35，新增 runAttempt mismatch 与 invalid runAttempt 负例）。
      2. `node ./scripts/ci/v3-dashboard-drill-evidence-gate.mjs --run-id local --reports-dir ./reports/v3 --task-id V3-RC-02 --run-manifest ./reports/v3/v3-dashboard-freeze-rollback-drill-local-run-manifest.json --expected-server-url https://github.com --expected-repository RSXLX/ZFrog --expected-run-attempt 1 --max-manifest-age-hours 72 --report /tmp/v3-dashboard-local-evidence-gate-with-run-attempt.md --out-json /tmp/v3-dashboard-local-evidence-gate-with-run-attempt.json` 通过（`passed=true`、`readyToClose=false`、`manifestRunAttempt=1`）。
      3. `node ./scripts/ci/v3-dashboard-drill-closeout.mjs --run-id local --reports-dir ./reports/v3 --run-manifest ./reports/v3/v3-dashboard-freeze-rollback-drill-local-run-manifest.json --backlog-doc /tmp/v3-rc02-run-attempt-apply-base.md --out-doc ./reports/v3/v3-dashboard-freeze-rollback-drill-local-backlog-closeout.md --expected-server-url https://github.com --expected-repository RSXLX/ZFrog --expected-run-attempt 1 --max-manifest-age-hours 72 --require-publishable false` 通过。
      4. `node ./scripts/ci/v3-dashboard-drill-closeout-apply.mjs --run-id local --reports-dir ./reports/v3 --run-manifest ./reports/v3/v3-dashboard-freeze-rollback-drill-local-run-manifest.json --closeout-preview ./reports/v3/v3-dashboard-freeze-rollback-drill-local-backlog-closeout.md --backlog-doc /tmp/v3-rc02-run-attempt-apply-base.md --expected-server-url https://github.com --expected-repository RSXLX/ZFrog --expected-run-attempt 1 --max-manifest-age-hours 72 --require-publishable false` 通过（runAttempt gate 与 apply gate 可重放）。
   41. 已完成（`2026-03-24`）：执行 `v3-dashboard-drill-backlog-apply` 自动回写，纳入 run `local`（n/a）证据。
   42. 已归档：`./reports/v3/v3-dashboard-freeze-rollback-drill-local.md`、`./reports/v3/v3-dashboard-freeze-rollback-drill-local.json`。
   43. 结论维持：`暂缓发布`，继续阻塞态回滚收口。
9. 下一点执行清单（`2026-03-24`）：
   1. 已完成（`2026-03-24`）：交付 `v3-dashboard-drill-backlog` 自动化回写片段，并接入 `v3-beta-regression-matrix` summary。
   2. 已完成（`2026-03-24`）：交付 `v3-dashboard-drill-backlog-apply` 自动回写脚本，并接入 workflow 生成 `backlog-applied` 预览产物。
   3. 已完成（`2026-03-24`）：交付 `v3-dashboard-drill-evidence-gate` 三产物对账脚本，并接入 workflow summary 自动校验与归档。
   4. 已完成（`2026-03-24`）：交付 `v3-dashboard-drill-closeout` 正式关单脚本（默认 `--require-publishable`）并将命令提示接入 workflow summary。
   5. 已完成（`2026-03-24`）：将 `drill report.md` 纳入 evidence gate 与 closeout 的强制语义对账，补齐四向一致性 fail-closed（report/json/snippet/backlog-applied）。
   6. 已完成（`2026-03-24`）：交付 `v3-dashboard-drill-run-manifest` 与 manifest 新鲜度门禁（默认 72h），并将其接入 `evidence-gate/closeout` 与 workflow summary。
   7. 已完成（`2026-03-24`）：交付 run-manifest 四产物摘要（`path/sha256/bytes`）并将摘要对账接入 `evidence-gate/closeout`，形成“身份 + 新鲜度 + 内容完整性”三层关单门禁。
   8. 已完成（`2026-03-24`）：交付 run-manifest/evidence-gate/closeout 三段的“证据路径作用域”强约束，固定当前 run 证据路径并补齐 CLI 负例校验。
   9. 已完成（`2026-03-24`）：发布态 run URL 证据已升级为 canonical 强约束（`.../actions/runs/<runId>` + runId 绑定），并补齐脚本与单测 fail-closed。
   10. 已完成（`2026-03-24`）：发布态证据已补齐 `https canonical + manifest.repository 非 unknown` 双重身份约束，并补齐脚本与单测 fail-closed。
   11. 已完成（`2026-03-24`）：run-manifest/evidence-gate/closeout 已接入 `server host` 绑定 gate（`--server-url` + `--expected-server-url`），publishable 证据必须命中 CI server host。
   12. 已完成（`2026-03-24`）：workflow `summary` job 已自动生成 `backlog-closeout` 预览并在 closeout gate 失败时 fail-closed 阻断（non-dry-run strict，dry-run rehearsal 自动降级）。
   13. 已完成（`2026-03-24`）：补齐 `v3-dashboard-drill-closeout` 落库变更边界 gate（仅允许改动 `V3-RC-02` 段落 + append-only 保留原内容），并补齐 scope/append-only 负例单测。
   14. 已完成（`2026-03-24`）：交付 `v3-dashboard-drill-closeout-apply` 正式落库 gate，强制复验 strict 证据并逐字节比对 `backlog-closeout` 预览与 deterministic closeout 输出，一致后才允许写回 backlog。
   15. 已完成（`2026-03-24`）：补齐 publishable 证据 `expected-repository` 强约束，关单链路默认绑定 `GITHUB_REPOSITORY`，防止同 host 跨仓库 run 证据绕过。
   16. 已完成（`2026-03-24`）：`v3-beta-regression-matrix` workflow 已接入 `--expected-repository "${GITHUB_REPOSITORY}"`，并完成本地 `evidence-gate -> closeout -> closeout-apply` 带仓库身份约束 rehearsal。
   17. 已完成（`2026-03-24`）：`v3-beta-regression-matrix` workflow 与关单脚本链路已接入 `--expected-run-attempt "${GITHUB_RUN_ATTEMPT}"` 强约束，并完成本地 `runAttempt` 约束 rehearsal。
   18. 在可开放端口环境触发一次 `v3-beta-regression-matrix`（schedule 或 workflow_dispatch 均可），获取 run URL 与同 run 的 `run-manifest`。
   19. 校验 `reports/v3/v3-dashboard-freeze-rollback-drill-<runId>-evidence-gate.md` 对账 verdict 为 `PASS`，且 `readyToClose=yes`（manifest freshness/workflow identity/artifact digests/path scope/runUrl canonical（含 `https` / 无 query/hash）/repository identity（含 `--expected-repository`）/server host identity/runAttempt identity（含 `--expected-run-attempt`）均必须 PASS，必要时使用 `--require-publishable` + `--expected-server-url` + `--expected-repository` + `--expected-run-attempt` 复核）。
   20. 下一点：在可开放端口环境拿到 publishable run 后执行 `node ./scripts/ci/v3-dashboard-drill-closeout-apply.mjs --run-id <runId> --reports-dir ./reports/v3 --run-manifest ./reports/v3/v3-dashboard-freeze-rollback-drill-<runId>-run-manifest.json --closeout-preview ./reports/v3/v3-dashboard-freeze-rollback-drill-<runId>-backlog-closeout.md --backlog-doc ./docs/02_开发计划/ZFrog_V3_Issue_Backlog_可开工版.md --expected-server-url \"${GITHUB_SERVER_URL}\" --expected-repository \"${GITHUB_REPOSITORY}\" --expected-run-attempt \"${GITHUB_RUN_ATTEMPT}\" --max-manifest-age-hours 72 --require-publishable true` 正式落库关闭 `V3-RC-02`；若 preview 一致性或任一 gate 失败则维持 `暂缓发布` 并继续回滚收口。
   21. 下一点：保持 `暂缓发布`，修复阻塞项后在可开放端口环境重跑并覆盖同类演练报告。

---

## 八、Definition of Ready（DoR）

每张 V3 任务卡开工前必须满足：

1. 接口名与表结构已冻结到当前周。
2. Owner 与协作人已明确。
3. feature flag 与回滚入口已明确。
4. 至少有一条最小自动化测试路径。

---

## 九、Definition of Done（DoD）

每张 V3 任务卡标记完成必须满足：

1. 代码、测试、文档齐全。
2. 新接口至少有 route/integration 其一覆盖。
3. 新玩法至少有一条玩家视角演示路径。
4. 出现问题时可以独立关闭，不需要回滚整个版本。

---

## 十、V3 开工顺序建议

如果只能先开 3 张卡，优先顺序应是：

1. `V3-W1-01`
   先把 runtime / kill switch 立住，否则后面所有开放能力都没有护栏。
2. `V3-W2-01`
   先把 `journeys` 做出来，否则 V3 没有玩家主玩法。
3. `V3-W5-01`
   Council 必须建立在 journey/world 的真实数据之上，不能只做一个空 AI 壳。

---

## 十一、最终判断

V3 的 backlog 不该再是“平台组件采购单”，而应是一条清晰的版本主线：

```text
Journey 做故事主骨架
Council 做群体决策
Memory Palace 做情感沉淀
Creator / Partner 做赛季更新
Relationship Graph 做长期证明
```

这 5 件事若能按本 backlog 顺序落地，V3 才既更具体，也更有玩法。
