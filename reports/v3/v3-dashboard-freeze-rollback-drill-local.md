# V3Dashboard 运营冻结/回滚演练记录

## 1. 基本信息

- 演练时间（UTC）：2026-03-24T00:00:00.000Z
- 演练负责人：QA Owner + Admin Owner
- 环境：sandbox
- 触发原因：sandbox blocked rehearsal

## 2. 入口门禁快照

- beta gate（admin）：`VITE_V3_DASHBOARD_BETA_ENABLED=true + __ZFROG_ADMIN_V3_DASHBOARD_BETA__=true`
- runtime 全局状态：unknown（受限环境未进入页面）
- 模块状态快照：relationshipGraph=unknown（未进入 toggle 验证）
- 证据链接：n/a
- workflow run id：local

## 3. 冻结步骤（演练）

1. 通过 `/api/admin/v3/runtime/modules/:module/toggle` 关闭目标模块（relationshipGraph）。
2. 在 `V3 Dashboard` 确认模块状态由 `ACTIVE` -> `BLOCKED`。
3. 验证只读观测页面仍可打开，写路径被 fail-closed 拦截：fail（未执行到写路径拦截验证）
4. 记录冻结耗时（秒）：n/a

## 4. 回滚步骤（演练）

1. 恢复模块开关（`active=true`）。
2. 在 `V3 Dashboard` 确认模块状态由 `BLOCKED` -> `ACTIVE`。
3. 验证核心读链路恢复，且无跨 app 权限异常：fail（未执行到读链路恢复验证）
4. 记录回滚耗时（秒）：n/a

## 5. 验证与结论

- Playwright 双态 smoke 结果：fail
- 关键接口抽样：
  - `/api/admin/v3/runtime/status`：fail
  - `/api/admin/v3/relationship-graph/frogs/:frogId`：fail
- 异常与处理：Playwright layer status=failure，执行环境端口监听受限（listen EPERM）。
- 结论：暂缓发布

## 6. 后续动作

1. 若本次为 fail，需在可开放端口环境重新执行同一 smoke 并覆盖报告。
2. 将报告与 workflow artifact 一并归档到 `reports/v3/`。
