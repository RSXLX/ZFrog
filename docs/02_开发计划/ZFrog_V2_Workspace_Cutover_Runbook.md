---
status: 已生效
owner: Tech Lead
last_updated: 2026-03-23
scope: V2-W12-02 + V2-W13-03 + V2-W14-01
---

# ZFrog V2 Workspace Cutover Runbook

## 1. 目标

1. 将根入口默认切换到 workspace-first（pnpm）。
2. 保留 legacy 一键回滚入口（不改业务代码）。
3. 提供可演练脚本和无副作用 dry-run 校验命令。

## 2. 默认入口

1. `npm run dev`
2. `npm run ws:dev`
3. `bash ./start.sh --workspace`

## 3. 回滚入口

1. `npm run legacy:dev`
2. `bash ./start.sh --legacy`
3. `ZFROG_DEV_ENTRY=legacy bash ./start.sh`
4. `npm run rollback:dev:legacy`
5. `bash ./scripts/cutover/rollback-to-legacy.sh --reason "<fallback-reason>"`

## 4. 脚本清单

1. `scripts/cutover/start-workspace.sh`
2. `scripts/cutover/start-legacy.sh`
3. `scripts/cutover/rollback-to-legacy.sh`
4. `scripts/cutover/log-dev-entry.sh`（入口日志）
5. `scripts/cutover/legacy-fallback-report.mjs`（fallback 周报）
6. `scripts/cutover/legacy-fallback-gate-check.mjs`（fallback 阈值门禁）
7. `scripts/ci/v2-release-health-summary.mjs`（周发布健康摘要）
8. `reports/v2-release-health-summary.json`（P1 候选机器可读输出）
9. `start.sh`（统一路由：workspace/legacy）

## 5. 演练与校验

1. `bash ./start.sh --workspace --dry-run`
2. `bash ./start.sh --legacy --reason workspace-startup-failed --dry-run`
3. `bash ./scripts/cutover/rollback-to-legacy.sh --reason workspace-startup-failed --dry-run`
4. `npm run ws:list`
5. `npm run cutover:fallback:report`
6. `npm run cutover:fallback:gate`
7. `npm run ci:gate:v2:health-summary -- --rc-runs-fixture ./scripts/ci/fixtures/v2-regression-runs.sample.json --fallback-log ./reports/cutover/dev-entry.log --summary-json /tmp/v2-release-health-summary.json`

## 6. 失败处理

1. 若 workspace 启动失败，先执行 `npm run rollback:dev:legacy` 恢复开发入口。
2. 若 `pnpm` 缺失，执行 `corepack enable` 后重试 workspace 入口。
3. 回滚仅切入口，不影响现有 V1/V2 业务逻辑与数据库状态。
4. fallback 周报默认读取 `reports/cutover/dev-entry.log`，若需自定义路径可设置 `ZFROG_CUTOVER_LOG_DIR`。
5. fallback 门禁配置位于 `.github/release-gates/v2-cutover-fallback-gate.json`，默认排除 `--dry-run` 演练日志。
6. 周发布健康摘要配置位于 `.github/release-gates/v2-release-health-summary.json`，可控制 reason 周环比告警与严格失败策略。
7. 若 `reports/v2-release-health-summary.json` 中 `p1CandidateReasons` 连续两周非空，需进入 P1 修复池并安排 owner。
