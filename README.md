# ZFrog

ZFrog 当前进入 Version 1 收敛开发阶段。

## Version 1 正式主线目录

1. `frontend/`
2. `backend/`
3. `admin/`
4. `desktop-pet/`
5. `contracts/`

## 已冻结目录（Version 1 不接新功能）

1. `desktop_pet/`
2. `frontend/src-tauri/`
3. `src/renderer/`
4. `microservices/api-gateway/`
5. `microservices/badge-service/`
6. `microservices/wallet-observer/`

冻结目录均已补充 `FROZEN.md` 标记，仅可用于历史参考与迁移说明。

## 当前开发入口

1. 任务分解：`docs/02_开发计划/ZFrog_V1_Issue_Backlog_可开工版.md`
2. 实施总计划：`docs/02_开发计划/ZFrog_超级融合版技术实施方案与开发计划.md`
3. 架构收敛图：`docs/00_架构设计/ZFrog_未来三版本架构收敛图.md`
4. V2 周拆解：`docs/02_开发计划/ZFrog_V2_Issue_Backlog_可开工版.md`

## V2 Workspace（V2-00 / V2-W12-02）

为保证 V2 平滑演进，根目录已补 workspace 脚手架：

1. `package.json`（根级 scripts）
2. `pnpm-workspace.yaml`
3. `apps/`（软迁移映射目录）
4. `packages/`（shared 层预留目录）

V2 cutover 后默认入口已切为 workspace-first，并保留 legacy 可演练回滚。

### 默认入口（workspace-first）

1. `npm run dev`（等价 `bash ./start.sh --workspace`）
2. `npm run ws:dev`
3. `npm run ws:dev:backend`
4. `npm run ws:dev:frontend`

### Legacy 回滚入口（保留）

1. `npm run legacy:dev`
2. `bash ./start.sh --legacy`
3. `ZFROG_DEV_ENTRY=legacy bash ./start.sh`
4. `npm run rollback:dev:legacy`

### Cutover 脚本

1. `scripts/cutover/start-workspace.sh`
2. `scripts/cutover/start-legacy.sh`
3. `scripts/cutover/rollback-to-legacy.sh`
