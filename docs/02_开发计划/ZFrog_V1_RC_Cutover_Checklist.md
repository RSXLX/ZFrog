# ZFrog V1 RC Cutover Checklist

更新时间：`2026-03-22`

## 1. Admin 观测面（I14）

- [x] `/api/admin/verifications` 已上线并接入页面。
- [x] `/api/admin/rituals` 已上线并接入页面。
- [x] `/api/admin/memory-palaces` 已上线并接入页面。
- [x] `/api/admin/domain-events` 已上线；Dashboard 展示最近关键事件。
- [x] 修复动作 `POST /api/admin/frogs/:tokenId/recalculate-life` 已上线并接入页面按钮。
- [x] 修复动作 `POST /api/admin/travels/:id/rebuild-memory` 已上线并接入页面按钮。
- [x] Admin cutover e2e/smoke 已补齐（`admin-cutover-routes.e2e.test.ts`）。

## 2. 旧读路径退役（I15-Phase1）

- [x] `GET /api/nurture/:frogId/status` 已添加 `Deprecation/Sunset/Link` 响应头。
- [x] `GET /api/frogs/:tokenId/status` 已添加 `Deprecation/Sunset/Link` 响应头。
- [x] `GET /api/travels/journal/:travelId` 已添加 `Deprecation/Sunset/Link` 响应头。
- [x] `GET /api/travels/p0/:travelId` 已添加 `Deprecation/Sunset/Link` 响应头。
- [x] legacy deprecation e2e 已补齐（`legacy-life-read-deprecation.e2e.test.ts`、`legacy-travel-delegation.e2e.test.ts`）。

## 3. RC 发布门槛

- [ ] FE + Desktop 全量确认不再依赖上述旧读路径。
- [ ] 旧写路径退役窗口与回滚预案确认（interaction/nurture/hibernation/cross-chain/group）。
- [ ] 线上 `legacy route hit` 指标连续 7 天为低阈值。
- [ ] RC 锁窗后仅允许 bugfix。

## 4. 本地回归记录（2026-03-22）

- [x] `npm --prefix backend run test` 通过（`15 passed / 1 skipped`）。
- [x] `npm --prefix backend run test:integration` 通过（`3 passed / 1 skipped`）。
- [x] `npm --prefix backend run test:e2e` 通过（`11 passed`）。
- [x] `npm --prefix backend run build` 通过。
- [x] `npm --prefix frontend run test` 通过（`12 passed`）。
- [x] `npm --prefix frontend run test:e2e` 通过（`1 passed`）。
- [x] `npm --prefix frontend run type-check` 通过。
- [x] `npm --prefix frontend run build` 通过。
- [x] `npm --prefix admin run build` 通过。
- [x] `npm --prefix desktop-pet run build` 通过。
- [x] `npm --prefix desktop-pet run build:electron` 通过。
- [x] `npm --prefix contracts run test` 通过（`14 passed / 2 pending`）。

备注：

1. 前端与 Admin 构建存在 chunk size warning，当前不阻塞 RC，但建议纳入 V2 性能治理。
2. backend e2e 日志中的 `error` 输出来自“非法参数”负向用例断言，非失败。
