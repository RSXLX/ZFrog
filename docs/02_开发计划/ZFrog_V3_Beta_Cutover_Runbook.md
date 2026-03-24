---
status: Draft
owner: QA Owner + Tech Lead
last_updated: 2026-03-24
scope: V3-W12-01 + V3-RC-01 + V3-RC-02
---

# ZFrog V3 Beta Cutover Runbook

## 1. 目标

1. 让 V3 发布门禁与回归矩阵独立于 V2 主线运行。
2. 保持灰度能力：V3 能开能关，不影响 V1/V2 主体验。
3. 发生异常时，保证可以在 10 分钟内完成回退到 V2 主体验。

## 2. 发布门禁入口

1. Workflow：`.github/workflows/v3-beta-regression-matrix.yml`
2. Gate config：`.github/release-gates/v3-beta-release-gate.json`
3. Gate script：`scripts/ci/v3-beta-release-gate.mjs`
4. Gate report：`reports/v3/v3-beta-release-gate-report.md`
5. RC Workflow：`.github/workflows/v3-rc-release-gate.yml`
6. RC Gate config：`.github/release-gates/v3-rc-gate.json`
7. RC Gate scripts：`scripts/ci/v3-rc-gate-check.mjs`、`scripts/ci/v3-rc-gate-archive.mjs`、`scripts/ci/v3-release-health-summary.mjs`
8. RC Gate reports：`reports/v3/v3-rc-gate-report.md`、`reports/v3/v3-release-health-summary.md`

## 3. Matrix 覆盖层

1. Contract layer：`packages/shared` + `packages/client-sdk` contract/type-check。
2. Integration layer：`backend` integration + type-check。
3. E2E layer：`backend` `v3-*` 与 `admin-v3-*` route e2e。
4. Playwright layer：
   1. `frontend/e2e` 中 V3 Alpha 冒烟流。
   2. `frontend/e2e/admin-v3-dashboard-smoke.e2e.ts`（`V3Dashboard` beta on/off 双态 smoke）。

## 4. 执行方式

1. 定时：每日夜间自动运行（workflow schedule）。
2. 手动：`workflow_dispatch`，可勾选 `dry_run=true`。
3. 强制门禁：`dry_run=false` 时必须所有 required layers 为 `success`。
4. RC gate：`v3-rc-release-gate` 在 matrix 完成后触发，判定 `连续成功 + 新鲜度 + 缺陷快照预算`。

## 5. Fallback Dry-Run 演练

1. 本地演练（使用既有 layer 报告）：

```bash
node ./scripts/ci/v3-beta-release-gate.mjs \
  --config ./.github/release-gates/v3-beta-release-gate.json \
  --reports-dir ./reports/v3/layers \
  --dry-run \
  --report ./reports/v3/v3-beta-release-gate-dry-run.md \
  --out-json ./reports/v3/v3-beta-release-gate-dry-run.json
```

2. CI 演练：`v3-beta-regression-matrix` 在 `summary` job 固定执行一次 dry-run rehearsal，不影响 enforced verdict。

## 6. 灰度发布步骤

1. 确认 `v3-beta-regression-matrix` 最近一次 strict verdict 为 PASS。
2. 按模块开启 V3 beta（先低风险读能力，再高风险写能力）。
3. 每次灰度扩大前，检查上一轮 gate 报告是否仍满足 freshness 阈值。
4. 任何一层转为 FAIL，暂停扩量并进入回滚判定。

## 7. 回滚步骤（退回 V2 主体验）

1. 后端：通过 admin runtime kill-switch 关闭 V3 runtime/module（全局或模块级）。
2. 前端与管理台：关闭对应 V3 beta env gate（保留代码、隐藏入口）。
3. 合作方与创作者写路径：关闭相关 `V3_*_ENABLED` 写开关，保持只读查询或完全禁用。
4. 观察 `domain_events` 与关键错误指标 15 分钟，确认无新扩散后再决定是否重启灰度。

## 8. 故障分级与处理

1. P0：数据错写/权限越界/链路雪崩，立即执行第 7 节全量回滚。
2. P1：单层回归失败但可隔离，先模块级关闭，再保留其余 V3 功能。
3. P2：非阻断告警，记录并在下一次 nightly 前修复。

## 9. 证据留存

1. `reports/v3/v3-beta-release-gate-report.md`
2. `reports/v3/v3-beta-release-gate.json`
3. `reports/v3/v3-beta-release-gate-dry-run.md`
4. `reports/v3/v3-rc-gate-report.md`
5. `reports/v3/v3-rc-gate.json`
6. `reports/v3/v3-release-health-summary.md`
7. `reports/v3/v3-release-health-summary.json`
8. `reports/history/v3-rc-gate/*.md`
9. `reports/v3/layers/*.json`
10. `reports/v3/v3-dashboard-freeze-rollback-drill-*.md`
11. `reports/v3/v3-dashboard-freeze-rollback-drill-*-evidence-gate.{md,json}`
12. `reports/v3/v3-dashboard-freeze-rollback-drill-*-run-manifest.json`
13. `reports/v3/v3-dashboard-freeze-rollback-drill-*-backlog-closeout.md`

## 10. 退出条件（W12-01 完成判据）

1. V3 有独立 workflow + gate script + gate config。
2. contract/integration/e2e/playwright 四层门禁全覆盖。
3. RC gate 可判定连续稳定性、门禁新鲜度与缺陷预算快照。
4. dry-run fallback 演练链路可执行。
5. 发生故障可按 runbook 回退到 V2 主体验。

## 11. V3Dashboard 运营冻结/回滚演练记录模板（V3-RC-01）

每次演练都复制以下模板，保存到：
`reports/v3/v3-dashboard-freeze-rollback-drill-<YYYYMMDD-HHmm>.md`。

```md
# V3Dashboard 运营冻结/回滚演练记录

## 1. 基本信息

- 演练时间（UTC）：<2026-03-24T08:00:00Z>
- 演练负责人：<name>
- 环境：<staging / prod-like>
- 触发原因：<例：RC 例行演练 / 线上告警演练>

## 2. 入口门禁快照

- beta gate（admin）：`VITE_V3_DASHBOARD_BETA_ENABLED=<value>`
- runtime 全局状态：<enabled/disabled>
- 模块状态快照：<journey/council/memory/creator/partner/relationshipGraph>
- 证据链接：<workflow run / report artifact>

## 3. 冻结步骤（演练）

1. 通过 `/api/admin/v3/runtime/modules/:module/toggle` 关闭目标模块。
2. 在 `V3 Dashboard` 确认模块状态由 `ACTIVE` -> `BLOCKED`。
3. 验证只读观测页面仍可打开，写路径被 fail-closed 拦截。
4. 记录冻结耗时（秒）：<value>

## 4. 回滚步骤（演练）

1. 恢复模块开关（`active=true`）。
2. 在 `V3 Dashboard` 确认模块状态由 `BLOCKED` -> `ACTIVE`。
3. 验证核心读链路恢复，且无跨 app 权限异常。
4. 记录回滚耗时（秒）：<value>

## 5. 验证与结论

- Playwright 双态 smoke 结果：<pass/fail>
- 关键接口抽样：
  - `/api/admin/v3/runtime/status`: <pass/fail>
  - `/api/admin/v3/*` 目标模块只读接口: <pass/fail>
- 异常与处理：<none / details>
- 结论：<可发布 / 暂缓发布>

## 6. 后续动作

1. <action item 1>
2. <action item 2>
```

## 12. RC-02 自动归档命令（CI/Staging）

在可开放端口的 CI/staging 环境，先完成 `test:e2e:admin:v3-dashboard`，再基于 Playwright layer 结果生成演练归档：

```bash
node ./scripts/ci/v3-dashboard-drill-report.mjs \
  --playwright-layer-report ./reports/v3/layers/playwright.json \
  --environment ci \
  --owner "QA Owner + Admin Owner" \
  --trigger-reason "v3-beta-regression-matrix (workflow_dispatch/schedule)" \
  --run-id "${GITHUB_RUN_ID}" \
  --run-url "${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}" \
  --report ./reports/v3/v3-dashboard-freeze-rollback-drill-${GITHUB_RUN_ID}.md \
  --out-json ./reports/v3/v3-dashboard-freeze-rollback-drill-${GITHUB_RUN_ID}.json
```

安全约束（fail-closed）：

1. 当 Playwright layer 为 `success` 时，若缺少 `run-url` 证据，脚本会直接失败，禁止生成“可发布”结论。
2. 当 Playwright layer 非 `success` 时，报告自动输出 `暂缓发布` 并记录阻塞异常。

## 13. RC-02 Backlog 回写片段自动生成（CI/Staging）

为避免手工回写执行记录时遗漏 run URL / 结论，`summary` job 会在生成 drill 报告后自动执行：

```bash
node ./scripts/ci/v3-dashboard-drill-backlog.mjs \
  --drill-json ./reports/v3/v3-dashboard-freeze-rollback-drill-${GITHUB_RUN_ID}.json \
  --report-md ./reports/v3/v3-dashboard-freeze-rollback-drill-${GITHUB_RUN_ID}.md \
  --out-md ./reports/v3/v3-dashboard-freeze-rollback-drill-${GITHUB_RUN_ID}-backlog.md \
  --task-id V3-RC-02 \
  --expected-run-id "${GITHUB_RUN_ID}" \
  --environment ci
```

安全约束（fail-closed）：

1. 若 `drill.smokeResult` 与 `drill.conclusion` 不一致（例如 pass + 暂缓发布），脚本直接失败。
2. 若结论为 `可发布` 但 run URL 为空或占位值（`n/a`），脚本直接失败。
3. 若结论为 `可发布` 但 run URL 不是规范 workflow 链接（`.../actions/runs/<runId>`）或与 runId 不匹配，脚本直接失败。
4. 若 `drill.runId` 与当前 `GITHUB_RUN_ID` 不一致，脚本直接失败，防止错配证据回写。

## 14. RC-02 Backlog 自动回写预览（CI/Staging）

为避免“片段已生成但未落到任务卡正文”的漏操作，可在同一流程继续执行：

```bash
node ./scripts/ci/v3-dashboard-drill-backlog-apply.mjs \
  --snippet-md ./reports/v3/v3-dashboard-freeze-rollback-drill-${GITHUB_RUN_ID}-backlog.md \
  --backlog-doc ./docs/02_开发计划/ZFrog_V3_Issue_Backlog_可开工版.md \
  --task-id V3-RC-02 \
  --expected-run-id "${GITHUB_RUN_ID}" \
  --out-doc ./reports/v3/v3-dashboard-freeze-rollback-drill-${GITHUB_RUN_ID}-backlog-applied.md
```

说明：

1. CI 中建议写入 `--out-doc` 预览文件并归档（不直接改仓库文件），再由值班人按预览内容落库。
2. 本地执行时可省略 `--out-doc`，脚本会原地更新 backlog 文档。

安全约束（fail-closed）：

1. 若 `taskId` 段落不存在，脚本直接失败，防止写入错误位置。
2. 若同一 `report/json` 证据已在执行记录出现，脚本直接失败，防止重复回写。
3. 若 snippet 的 `runId` 与 `--expected-run-id` 不一致，脚本直接失败。

## 15. RC-02 四产物证据 + 摘要对账 Gate（CI/Staging）

为避免 “drill 报告（md+json）/backlog/backlog-applied/run-manifest” 四类产物出现 runId/runUrl/结论错配，并防止同 run 产物被替换，`summary` job 在生成回写预览后继续执行：

```bash
node ./scripts/ci/v3-dashboard-drill-evidence-gate.mjs \
  --run-id "${GITHUB_RUN_ID}" \
  --reports-dir ./reports/v3 \
  --task-id V3-RC-02 \
  --run-manifest ./reports/v3/v3-dashboard-freeze-rollback-drill-${GITHUB_RUN_ID}-run-manifest.json \
  --expected-server-url "${GITHUB_SERVER_URL}" \
  --expected-repository "${GITHUB_REPOSITORY}" \
  --expected-run-attempt "${GITHUB_RUN_ATTEMPT}" \
  --expected-ref "${GITHUB_REF}" \
  --expected-sha "${GITHUB_SHA}" \
  --max-manifest-age-hours 72 \
  --report ./reports/v3/v3-dashboard-freeze-rollback-drill-${GITHUB_RUN_ID}-evidence-gate.md \
  --out-json ./reports/v3/v3-dashboard-freeze-rollback-drill-${GITHUB_RUN_ID}-evidence-gate.json
```

如需在正式关单前强制要求“可发布”证据，可追加 `--require-publishable`。

安全约束（fail-closed）：

1. `drill report.md` 与 `drill json` 的 `runId/runUrl/smoke/conclusion` 任一不一致即失败。
2. `drill json` 与 `backlog snippet` 的 `runId/runUrl/smoke/conclusion` 任一不一致即失败。
3. snippet 中归档路径若不指向当前 run 的 `drill-<runId>.{md,json}` 即失败。
4. `run-manifest` 的 `workflowName/workflowFile/runId/runUrl` 任一错配即失败。
5. `run-manifest.generatedAt` 超过 `--max-manifest-age-hours` 或未来时间偏移超限即失败（默认 72h + 5m 偏移）。
6. `run-manifest.artifactDigests` 必须包含 `drillReportMd/drillJson/backlogSnippetMd/backlogAppliedMd` 四项摘要，且 `path/sha256/bytes` 与当前 gate 输入文件不一致时直接失败。
7. `backlog-applied` 预览若缺失 run 证据、归档证据、结论行或下一点行即失败。
8. `report-md/drill-json/snippet-md/backlog-applied/run-manifest` 输入路径必须命中当前 run 的固定命名（`reports/v3/v3-dashboard-freeze-rollback-drill-${runId}*`），任一指向外部路径直接失败，防止跨 run 或越界取证。
9. 若结果为 publishable，run URL 必须是 `https` 的 canonical workflow 链接（仅允许 `https://<host>/<owner>/<repo>/actions/runs/<runId>`，不允许 query/hash），且 runId 与 manifest repository 一致；否则直接失败，防止伪造证据链接。
10. 若结果为 publishable，`run-manifest.repository` 不得为 `unknown`；仓库身份缺失时直接失败，防止“URL 形态正确但来源身份不可审计”绕过关单。
11. 若结果为 publishable，必须传入 `--expected-repository`（CI 中绑定 `GITHUB_REPOSITORY`），并要求 `run-manifest.repository` 与 `runUrl.repository` 同时匹配该仓库；缺失参数或不一致均直接失败，防止“同 host 跨仓库 run 证据”绕过关单。
12. 若结果为 publishable，必须传入 `--expected-server-url`（CI 中绑定 `GITHUB_SERVER_URL`）；同时 `run-manifest.serverHost` 必须为已知值，且与 `runUrl.host` 及 expected host 一致；缺失参数或不一致均直接失败，防止“跨域伪造 run 证据”绕过。
13. 若结果为 publishable，必须传入 `--expected-run-attempt`（CI 中绑定 `GITHUB_RUN_ATTEMPT`），并要求 `run-manifest.runAttempt` 一致；缺失参数或不一致均直接失败，防止同 run id 的旧 attempt 证据复用。
14. 若结果为 publishable，必须传入 `--expected-ref/--expected-sha`（CI 中绑定 `GITHUB_REF/GITHUB_SHA`），并要求 `run-manifest.ref/sha` 一致；缺失参数或不一致均直接失败，防止历史 commit 证据误关单。

## 16. RC-02 正式关单命令（Publishable 强约束）

`v3-beta-regression-matrix` 的 `summary` job 现已自动执行一次 closeout 预览命令并产出：
`reports/v3/v3-dashboard-freeze-rollback-drill-${GITHUB_RUN_ID}-backlog-closeout.md`。

- 非 dry-run（`dry_run=false`）默认 strict：`--require-publishable true`，保证不可发布态无法误关单。
- dry-run rehearsal（`dry_run=true`）自动降级为 `--require-publishable false`，仅用于阻塞态演练预览。

当 CI/staging 实跑拿到 PASS 证据后，先生成 closeout 预览：

```bash
node ./scripts/ci/v3-dashboard-drill-closeout.mjs \
  --run-id "${GITHUB_RUN_ID}" \
  --reports-dir ./reports/v3 \
  --run-manifest ./reports/v3/v3-dashboard-freeze-rollback-drill-${GITHUB_RUN_ID}-run-manifest.json \
  --backlog-doc ./docs/02_开发计划/ZFrog_V3_Issue_Backlog_可开工版.md \
  --out-doc ./reports/v3/v3-dashboard-freeze-rollback-drill-${GITHUB_RUN_ID}-backlog-closeout.md \
  --expected-server-url "${GITHUB_SERVER_URL}" \
  --expected-repository "${GITHUB_REPOSITORY}" \
  --expected-run-attempt "${GITHUB_RUN_ATTEMPT}" \
  --expected-ref "${GITHUB_REF}" \
  --expected-sha "${GITHUB_SHA}" \
  --max-manifest-age-hours 72 \
  --require-publishable true
```

随后执行“正式落库 apply gate”（会重放 strict 校验，并强制校验预览文件未被篡改）：

```bash
node ./scripts/ci/v3-dashboard-drill-closeout-apply.mjs \
  --run-id "${GITHUB_RUN_ID}" \
  --reports-dir ./reports/v3 \
  --run-manifest ./reports/v3/v3-dashboard-freeze-rollback-drill-${GITHUB_RUN_ID}-run-manifest.json \
  --closeout-preview ./reports/v3/v3-dashboard-freeze-rollback-drill-${GITHUB_RUN_ID}-backlog-closeout.md \
  --backlog-doc ./docs/02_开发计划/ZFrog_V3_Issue_Backlog_可开工版.md \
  --expected-server-url "${GITHUB_SERVER_URL}" \
  --expected-repository "${GITHUB_REPOSITORY}" \
  --expected-run-attempt "${GITHUB_RUN_ATTEMPT}" \
  --expected-ref "${GITHUB_REF}" \
  --expected-sha "${GITHUB_SHA}" \
  --max-manifest-age-hours 72 \
  --require-publishable true
```

说明：

1. 默认开启 `--require-publishable`，若 `readyToClose != yes` 将直接失败，禁止误关单。
2. `closeout-apply` 会基于同一 run 证据重新计算预期 closeout 结果，并与 `backlog-closeout` 预览逐字节比对；不一致则直接失败，必须先重生预览。
3. `closeout-apply` 通过后才会写回 backlog 原文档，避免人工 copy 过程中引入篡改或跨 run 误落库。

安全约束（fail-closed）：

1. 复用 evidence gate 的四产物一致性、manifest workflow/freshness、artifact digest、repository identity（含 `--expected-repository`）、server host identity、runAttempt identity（含 `--expected-run-attempt`）与 commit identity（含 `--expected-ref` + `--expected-sha`）校验，不一致直接失败。
2. 非 publishable 结果（例如 `暂缓发布`）在 strict 模式下直接失败。
3. snippet 与 evidence gate 的结论或 publishable 标识不一致时直接失败。
4. `closeout` 读取的 `report-md/drill-json/snippet-md/backlog-applied/run-manifest` 路径必须命中当前 run 固定命名，禁止使用外部路径覆盖输入证据。
5. `closeout` 产出的 `backlog-closeout` 预览只允许改动 `V3-RC-02` 任务段落，且原有段落内容必须 append-only 保留（禁止改写/删除）；若改动越界则直接失败，防止误改其他任务卡后落库。
6. `closeout-apply` 仅允许读取当前 run 的固定 `backlog-closeout` 路径，且必须与 deterministic closeout 输出完全一致；若 preview 被改写或来源 run 不一致直接失败。
