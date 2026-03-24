# ZFrog Apps Mapping (V2-00)

`apps/` 是 V2 软迁移目录。当前阶段不移动现有源码目录，只做映射与约束，保证 V1 启动方式不变。

## 当前映射

1. `apps/web` -> 当前实现目录：`/Users/sxlx/.gemini/antigravity/ZFrog/frontend`
2. `apps/backend` -> 当前实现目录：`/Users/sxlx/.gemini/antigravity/ZFrog/backend`
3. `apps/admin` -> 当前实现目录：`/Users/sxlx/.gemini/antigravity/ZFrog/admin`
4. `apps/desktop` -> 当前实现目录：`/Users/sxlx/.gemini/antigravity/ZFrog/desktop-pet`
5. `apps/contracts` -> 当前实现目录：`/Users/sxlx/.gemini/antigravity/ZFrog/contracts`
6. `apps/mobile-lite` -> 新增独立工程：`/Users/sxlx/.gemini/antigravity/ZFrog/apps/mobile-lite`

## 迁移规则

1. V2-00 只建立目录与文档映射，不在本阶段做源码搬迁。
2. 业务继续在现有主线目录开发，避免破坏当前脚本与启动方式。
3. 真正搬迁将在 V2-51 的 cutover 波次执行。
4. `apps/mobile-lite` 为 V2 新增工程，不属于 legacy 目录搬迁范围。
