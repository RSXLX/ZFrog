## 2026-03-24（本次运行-11）
- 完成点：`V3-RC-02` commit sha 规范化强绑定安全闭环（publishable 场景 short sha 防漂移）。
- 本次新增：
  - 升级 `scripts/ci/v3-dashboard-drill-evidence-gate-lib.mjs`：新增 publishable 场景 `expectedSha` 与 `manifest.sha` 的 40 位 git commit hash 规范校验（短 sha/非十六进制 fail-closed）。
  - 升级 `scripts/ci/v3-dashboard-drill-evidence-gate-lib.test.mjs`：新增 `expectedSha` 非规范与 `manifest.sha` 非规范负例。
  - 同步更新 `scripts/ci/v3-dashboard-drill-closeout-lib.test.mjs` 与 `scripts/ci/v3-dashboard-drill-closeout-apply-lib.test.mjs` 的 publishable sha 夹具为 40 位 commit hash，保持 strict 关单链路一致。
  - `docs/02_开发计划/ZFrog_V3_Issue_Backlog_可开工版.md` 已记录该闭环，并将下一点维持为“在 CI/staging 获取 publishable run 后执行 closeout-apply 正式关单 `V3-RC-02`”。
- 验证结果：
  - `node --test ./scripts/ci/v3-dashboard-drill-evidence-gate-lib.test.mjs ./scripts/ci/v3-dashboard-drill-closeout-lib.test.mjs ./scripts/ci/v3-dashboard-drill-closeout-apply-lib.test.mjs` 通过（33/33）。
- 下一点：在可开放端口环境触发 `v3-beta-regression-matrix` 获取 publishable run，确认 `evidence-gate` 为 `PASS` 且 `readyToClose=yes` 后执行 `closeout-apply --require-publishable true` 正式落库关闭 `V3-RC-02`。
- 当前运行时间（UTC）：`2026-03-24T06:05:58Z`。

## 2026-03-24（本次运行-10）
- 完成点：`V3-RC-02` run-attempt 身份强绑定安全闭环（同 `run_id` 多 attempt 防漂移）。
- 本次新增：
  - 升级 `scripts/ci/v3-dashboard-drill-run-manifest-lib.mjs`，强制 `runAttempt` 必须是正整数。
  - 升级 `scripts/ci/v3-dashboard-drill-evidence-gate*.mjs`、`scripts/ci/v3-dashboard-drill-closeout*.mjs`、`scripts/ci/v3-dashboard-drill-closeout-apply*.mjs`，新增 `--expected-run-attempt` 参数并默认读取 `GITHUB_RUN_ATTEMPT`。
  - `.github/workflows/v3-beta-regression-matrix.yml` 的 `evidence-gate` / `closeout-preview` 与 step summary publishable 命令模板已接入 `--expected-run-attempt "${GITHUB_RUN_ATTEMPT}"`。
  - `docs/02_开发计划/ZFrog_V3_Issue_Backlog_可开工版.md` 已记录该闭环并将下一点更新为“拿到 publishable run 后使用带 `--expected-run-attempt` 的 closeout-apply 正式关单 `V3-RC-02`”。
- 验证结果：
  - `node --test ./scripts/ci/v3-dashboard-drill-run-manifest-lib.test.mjs ./scripts/ci/v3-dashboard-drill-evidence-gate-lib.test.mjs ./scripts/ci/v3-dashboard-drill-closeout-lib.test.mjs ./scripts/ci/v3-dashboard-drill-closeout-apply-lib.test.mjs` 通过（35/35）。
  - `node ./scripts/ci/v3-dashboard-drill-evidence-gate.mjs ... --expected-run-attempt 1` 通过（`passed=true`、`readyToClose=false`）。
  - `node ./scripts/ci/v3-dashboard-drill-closeout.mjs ... --expected-run-attempt 1 --require-publishable false` 通过。
  - `node ./scripts/ci/v3-dashboard-drill-closeout-apply.mjs ... --expected-run-attempt 1 --require-publishable false` 通过（rehearsal，写入 `/tmp` backlog 副本）。
- 下一点：在 CI/staging 获取 publishable run 后执行 `closeout-apply --require-publishable true --expected-run-attempt "${GITHUB_RUN_ATTEMPT}"` 正式落库关闭 `V3-RC-02`。
- 当前运行时间（UTC）：`2026-03-24T04:56:19Z`。

## 2026-03-24（本次运行-9）
- 完成点：`V3-RC-02` 正式落库 apply gate 安全闭环（closeout preview deterministic apply）。
- 本次新增：
  - 新增 `scripts/ci/v3-dashboard-drill-closeout-apply-lib.mjs` 与 `scripts/ci/v3-dashboard-drill-closeout-apply.mjs`，落地“strict 证据复验 + preview 一致性逐字节校验 + 正式写回 backlog”三段式 fail-closed。
  - 新增 `scripts/ci/v3-dashboard-drill-closeout-apply-lib.test.mjs`（publishable 正例、preview 篡改负例、strict 非 publishable 负例）。
  - `.github/workflows/v3-beta-regression-matrix.yml` step summary 增加 `closeout-apply` 命令提示。
  - `docs/02_开发计划/ZFrog_V3_Beta_Cutover_Runbook.md` 与 `docs/02_开发计划/ZFrog_V3_Issue_Backlog_可开工版.md` 已记录该闭环，并把下一点更新为“在可开放端口 CI run 上执行 `closeout-apply --require-publishable true` 完成 `V3-RC-02` 关单”。
- 验证结果：
  - `node --test ./scripts/ci/v3-dashboard-drill-closeout-apply-lib.test.mjs ./scripts/ci/v3-dashboard-drill-closeout-lib.test.mjs ./scripts/ci/v3-dashboard-drill-evidence-gate-lib.test.mjs` 通过（21/21）。
  - CLI rehearsal：`closeout` + `closeout-apply` 在 `run-id=local`、`--require-publishable false` 下通过（使用 `/tmp` backlog 副本，不改主文档）。
- 下一点：在 CI/staging 获取 publishable run（`readyToClose=yes`）后执行 `closeout-apply --require-publishable true` 正式落库关闭 `V3-RC-02`。
- 当前运行时间（UTC）：`2026-03-24T04:11:44Z`。

## 2026-03-24（本次运行-8）
- 完成点：`V3-RC-02` closeout 自动预览 gate 安全闭环。
- 本次新增：
  - `.github/workflows/v3-beta-regression-matrix.yml` 新增 `Generate V3 backlog closeout preview (strict by default)`，`summary` job 自动执行 `v3-dashboard-drill-closeout` 生成 `reports/v3/v3-dashboard-freeze-rollback-drill-${GITHUB_RUN_ID}-backlog-closeout.md`。
  - closeout 预览策略改为：非 dry-run 默认 `--require-publishable=true`；dry-run rehearsal 自动降级为 `false`；新增 closeout 失败阻断步骤（fail-closed）。
  - `docs/02_开发计划/ZFrog_V3_Beta_Cutover_Runbook.md` 补充 closeout 预览自动产物与 strict/dry-run 规则。
  - `docs/02_开发计划/ZFrog_V3_Issue_Backlog_可开工版.md` 记录该点完成并将下一点更新为“在可开放端口环境验证 PASS run + 自动 closeout 预览后正式关单 `V3-RC-02`”。
- 验证结果：
  - `node --test ./scripts/ci/v3-dashboard-drill-closeout-lib.test.mjs ./scripts/ci/v3-dashboard-drill-evidence-gate-lib.test.mjs ./scripts/ci/v3-dashboard-drill-run-manifest-lib.test.mjs` 通过（22/22）。
- 下一点：在 CI/staging 补跑一次可开放端口的 `v3-beta-regression-matrix`，确认 `evidence-gate` 为 PASS 且 `readyToClose=yes`，并确认自动生成的 `backlog-closeout` 可直接落库后关闭 `V3-RC-02`。
- 当前运行时间（UTC）：`2026-03-24T03:21:48Z`。

## 2026-03-24（本次运行-7）
- 完成点：`V3-RC-02` 正式关单脚本安全闭环（closeout strict gate）。
- 本次新增：
  - 新增 `scripts/ci/v3-dashboard-drill-closeout-lib.mjs`、`scripts/ci/v3-dashboard-drill-closeout.mjs`、`scripts/ci/v3-dashboard-drill-closeout-lib.test.mjs`。
  - 根脚本新增 `ci:gate:v3:dashboard:closeout` / `ci:gate:v3:dashboard:closeout:test`。
  - `.github/workflows/v3-beta-regression-matrix.yml` summary 增加 publishable closeout 命令提示。
- 安全约束：closeout 默认 `--require-publishable=true`，若 `readyToClose!=yes` 或 triad 证据不一致将 fail-closed。
- 验证结果：
  - `node --test ./scripts/ci/v3-dashboard-drill-closeout-lib.test.mjs` 通过（3/3）。
  - `node --test ./scripts/ci/v3-dashboard-drill-backlog-apply-lib.test.mjs ./scripts/ci/v3-dashboard-drill-evidence-gate-lib.test.mjs` 通过（6/6）。
  - `node ./scripts/ci/v3-dashboard-drill-closeout.mjs --run-id local ... --require-publishable true` 预期失败（`not publishable`）。
  - `node ./scripts/ci/v3-dashboard-drill-closeout.mjs --run-id local ... --require-publishable false` 通过并生成预览。
- 文档更新：
  - `docs/02_开发计划/ZFrog_V3_Beta_Cutover_Runbook.md` 新增第 16 节（正式关单命令）。
  - `docs/02_开发计划/ZFrog_V3_Issue_Backlog_可开工版.md` 已记录该点完成，并将下一点明确为“获取可开放端口 CI PASS run 后执行 closeout 正式关单”。
- 当前运行时间（UTC）：`2026-03-24T00:19:25Z`。

# v3 自动化记忆

## 2026-03-24（本次运行-6）
- 完成点：`V3-RC-02` 后半段“backlog 自动合并预览”安全闭环。
- 本次新增：
  - 新增 `scripts/ci/v3-dashboard-drill-backlog-apply-lib.mjs`、`scripts/ci/v3-dashboard-drill-backlog-apply.mjs`、`scripts/ci/v3-dashboard-drill-backlog-apply-lib.test.mjs`，将自动生成的 backlog snippet fail-closed 合并到 `V3-RC-02` 对应任务卡段落。
  - `.github/workflows/v3-beta-regression-matrix.yml` 新增 `Generate V3 backlog apply preview`，产出 `reports/v3/v3-dashboard-freeze-rollback-drill-${GITHUB_RUN_ID}-backlog-applied.md`。
  - `docs/02_开发计划/ZFrog_V3_Beta_Cutover_Runbook.md` 新增第 14 节，固化自动回写预览命令与 fail-closed 约束。
  - `docs/02_开发计划/ZFrog_V3_Issue_Backlog_可开工版.md` 已记录该点完成，并把下一点更新为“CI/staging PASS 实跑 + 校验 drill/backlog/backlog-applied 三产物 + 使用 apply 脚本正式关闭 `V3-RC-02`”。
- 验证结果：
  - `node --test ./scripts/ci/v3-dashboard-drill-backlog-lib.test.mjs ./scripts/ci/v3-dashboard-drill-backlog-apply-lib.test.mjs` 通过（6/6）。
  - `node ./scripts/ci/v3-dashboard-drill-backlog-apply.mjs --snippet-md /tmp/v3-dashboard-pass-backlog.md --backlog-doc ./docs/02_开发计划/ZFrog_V3_Issue_Backlog_可开工版.md --task-id V3-RC-02 --expected-run-id 778899 --out-doc /tmp/v3-dashboard-pass-backlog-applied.md` 通过。
  - 本机端口限制仍存在：`npm --prefix frontend run test:e2e:admin:v3-dashboard` 仍需在可开放端口环境补跑（`listen EPERM 127.0.0.1:4174`）。
- 当前运行时间（UTC）：`2026-03-23T23:35:33Z`。

## 2026-03-24（本次运行-3）
- 完成点：`V3-W11-02` Relationship Edge Onchain Anchor 前后端观测闭环（anchor 状态只读展示 + 回滚门控）。
- 本次新增：
  - 后端：
    - `backend/src/modules/relationship-graph/relationship-edge-anchor.service.ts` 新增 `listLatestAnchorsByEdgeIds` 批量读取最新锚定状态（按 `scopeAppId + edgeIds`）。
    - `backend/src/api/routes/v3/relationship-graph.routes.ts` 与 `backend/src/api/routes/admin/v3-relationship-graph.routes.ts` 在 `edge` 上聚合返回 `anchor`（`PENDING/ANCHORED/FAILED` + onchain 元数据）。
  - 契约：
    - 更新 `packages/shared/src/types/relationship-graph.ts` 与 `packages/shared/src/schemas/relationship-graph.schema.ts`，正式纳入 `edge.anchor` 读模型。
  - 前端与管理台：
    - `frontend/src/pages/RelationshipGraphPage.tsx` 增加 anchor 状态列/详情展示，并新增门控 `VITE_V3_RELATIONSHIP_GRAPH_ANCHOR_BETA_ENABLED`（运行时读取 `__ZFROG_V3_RELATIONSHIP_GRAPH_ANCHOR_BETA__`）。
    - `admin/src/pages/RelationshipGraph/index.tsx` 增加 anchor 状态列/详情展示，并新增门控 `VITE_V3_RELATIONSHIP_GRAPH_ADMIN_ANCHOR_ENABLED`（运行时读取 `__ZFROG_ADMIN_V3_RELATIONSHIP_GRAPH_ANCHOR_BETA__`）。
- 验证结果：
  - `npm --prefix backend run type-check` 通过。
  - `npm --prefix backend run test -- --runInBand src/__tests__/integration/relationship-edge-anchor.service.integration.test.ts src/__tests__/integration/relationship-edge-anchor-replay.service.integration.test.ts` 通过（5/5）。
  - `npm --prefix packages/shared run type-check` 通过。
  - `node --import ./node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/loader.mjs --test packages/shared/src/__tests__/contract.shared.test.ts` 通过（21/21）。
  - `npm --prefix packages/client-sdk run type-check && npm --prefix packages/client-sdk run test:contract` 通过（38/38）。
  - `npm --prefix frontend run test -- --runInBand src/__tests__/pages/RelationshipGraphPage.test.tsx` 通过（4/4）。
  - `npm --prefix admin run build` 通过。
  - 受沙箱限制，`backend` supertest e2e 仍失败：`listen EPERM 0.0.0.0`（`v3-relationship-graph-routes.e2e` / `admin-v3-relationship-graph-routes.e2e` 需在可开放端口环境补跑）。
- 文档更新：`docs/02_开发计划/ZFrog_V3_Issue_Backlog_可开工版.md` 已将 `V3-W11-02` 标记为完成，并写明下一点 `V3-W12-01`（V3 Beta Release Gate 与 Regression Matrix）。
- 当前运行时间（UTC）：`2026-03-23T20:57:30Z`。

## 2026-03-24（本次运行-2）
- 完成点：`V3-W10-01` Partner Campaign Runtime 安全闭环补强（验证与文档收口）。
- 本次新增：
  - 新增 `backend` 集成测试：`src/__tests__/integration/partner-campaign.service.integration.test.ts`，覆盖：
    - publish/pause/resume 生命周期与 admin rollback。
    - callback 时间戳+签名验真、防重放、reward trace。
    - `V3_PARTNER_CAMPAIGN_PUBLISH_ENABLED` fail-closed 开关。
- 验证结果：
  - `npm --prefix backend run test -- --runInBand src/__tests__/integration/partner-campaign.service.integration.test.ts` 通过（3/3）。
  - `npm --prefix backend run type-check` 通过。
  - `npm --prefix backend run test -- --runInBand src/__tests__/e2e/v3-partners-routes.e2e.test.ts` 受沙箱限制失败：`listen EPERM 0.0.0.0`。
- 文档更新：`docs/02_开发计划/ZFrog_V3_Issue_Backlog_可开工版.md` 已补充 `V3-W10-01` 的集成测试收口说明，并保留下一点为 `V3-W10-02`（Creator License / Asset Anchor）。
- 当前运行时间（UTC）：`2026-03-23T18:10:40Z`。

## 2026-03-24（本次运行）
- 完成点：`V3-W9-02` Creator Review Queue 与 Preview Renderer 安全闭环。
- 后端新增：
  - `POST /api/v3/creator/packs/:packId/resubmit`（创作者驳回后重提）。
  - `GET /api/admin/v3/creators/review-queue`、`GET /api/admin/v3/creators/packs/:packId/preview`、`POST /review`、`POST /rollback`。
  - `creator-pipeline.service` 增加审核流：`submit -> review(approve/reject) -> rollback`，并补齐 fail-closed 开关：
    - `V3_CREATOR_PACK_REVIEW_ENABLED`
    - `V3_CREATOR_PACK_PUBLISH_ENABLED`
    - `V3_CREATOR_PREVIEW_RENDER_ENABLED`
- 管理台新增：`admin/src/pages/Creators/index.tsx`，并接入 `admin` 路由与侧边栏入口。
- 验证结果：
  - `backend` 定向测试通过：
    - `src/__tests__/e2e/v3-creator-routes.e2e.test.ts`
    - `src/__tests__/e2e/admin-v3-creators-routes.e2e.test.ts`
    - `src/__tests__/integration/creator-pipeline.service.integration.test.ts`
  - `backend npm run type-check` 通过。
  - `admin npm run build` 通过。
- 文档更新：`docs/02_开发计划/ZFrog_V3_Issue_Backlog_可开工版.md` 已记录 `V3-W9-02` 完成，并写明下一点 `V3-W10-01` 要落地 `Partner Campaign Runtime`（publish/pause/resume、callback 签名校验、审计与回滚）。
- 当前运行时间（UTC）：`2026-03-23T17:33:50Z`。

## 2026-03-24（本次运行-4）
- 完成点：`V3-W12-02` Admin 审核总控与 Beta 运营看板安全闭环。
- 本次新增：
  - 新增 `admin/src/pages/V3Dashboard/index.tsx`，聚合 creator/partner/world/council/relationship graph 五类运营读模型卡片。
  - 新增 `admin/src/features/v3-dashboard/runtime.ts`，支持 `VITE_V3_DASHBOARD_BETA_ENABLED` + `__ZFROG_ADMIN_V3_DASHBOARD_BETA__` 双态门控。
  - `admin/src/App.tsx` 新增 `/v3-dashboard` 路由；`admin/src/components/Layout/MainLayout.tsx` 新增菜单入口并按 beta gate 动态显隐。
  - 看板内接入 runtime 模块暂停入口（`/api/admin/v3/runtime/modules/:module/toggle`）与 Relationship Graph 快速跳转（`appId + frogId` 校验）。
- 验证结果：
  - `npm --prefix admin run build` 通过。
  - `npm --prefix backend run test -- --runInBand src/__tests__/e2e/v3-runtime-routes.e2e.test.ts src/__tests__/e2e/admin-v3-creators-routes.e2e.test.ts src/__tests__/e2e/admin-v3-partners-routes.e2e.test.ts src/__tests__/e2e/admin-v3-memory-palaces-routes.e2e.test.ts src/__tests__/e2e/admin-v3-council-routes.e2e.test.ts src/__tests__/e2e/admin-v3-relationship-graph-routes.e2e.test.ts` 受沙箱限制失败：`listen EPERM 0.0.0.0`。
- 文档更新：`docs/02_开发计划/ZFrog_V3_Issue_Backlog_可开工版.md` 已记录 `V3-W12-02` 完成，并写明下一点 `V3-RC-01`（V3Dashboard Playwright 双态 smoke + 运营冻结/回滚演练模板）。
- 当前运行时间（UTC）：`2026-03-23T22:03:04Z`。

## 2026-03-24（本次运行-5）
- 完成点：`V3-RC-02` 后半段“回写模板自动化”安全闭环。
- 本次新增：
  - 新增 `scripts/ci/v3-dashboard-drill-backlog-lib.mjs`、`scripts/ci/v3-dashboard-drill-backlog.mjs`、`scripts/ci/v3-dashboard-drill-backlog-lib.test.mjs`，对 drill 证据执行 fail-closed 校验（`smokeResult` + `conclusion` 一致性、PASS 必须有 run URL、`runId` 必须匹配期望值）。
  - `.github/workflows/v3-beta-regression-matrix.yml` 的 `summary` job 新增 `Generate V3Dashboard backlog update snippet`，自动产出 `reports/v3/v3-dashboard-freeze-rollback-drill-${GITHUB_RUN_ID}-backlog.md` 并写入 step summary。
  - 新增本地阻塞态回写片段归档：`reports/v3/v3-dashboard-freeze-rollback-drill-20260324-0000-run-local-backlog.md`。
- 验证结果：
  - `node --test ./scripts/ci/v3-dashboard-drill-report-lib.test.mjs ./scripts/ci/v3-dashboard-drill-backlog-lib.test.mjs` 通过（9/9）。
  - `node ./scripts/ci/v3-dashboard-drill-backlog.mjs --drill-json ./reports/v3/v3-dashboard-freeze-rollback-drill-20260324-0000-run-local.json --report-md ./reports/v3/v3-dashboard-freeze-rollback-drill-20260324-0000-run-local.md --out-md ./reports/v3/v3-dashboard-freeze-rollback-drill-20260324-0000-run-local-backlog.md --task-id V3-RC-02 --expected-run-id local --environment sandbox` 通过。
  - 端口限制仍存在：`npm --prefix frontend run test:e2e:admin:v3-dashboard` 在本环境依旧 `listen EPERM 127.0.0.1:4174`，因此当前结论继续保持 `暂缓发布`。
- 文档更新：
  - `docs/02_开发计划/ZFrog_V3_Issue_Backlog_可开工版.md` 已记录该点完成，并写入下一点为“CI/staging 实跑 + PASS 证据回写并关闭 `V3-RC-02`”。
  - `docs/02_开发计划/ZFrog_V3_Beta_Cutover_Runbook.md` 新增第 13 节，固化 backlog 回写片段自动化命令与 fail-closed 约束。
- 当前运行时间（UTC）：`2026-03-23T23:11:24Z`。
