# ZFrog Desktop Pet - Evolution Tasks (Current)

## 项目状态
- **项目路径**: `/Users/sxlx/.gemini/antigravity/ZFrog/desktop-pet`
- **当前分支**: `main`（本地 ahead `origin/main` 57 commits）
- **最近验证**: `npm run build` ✅ 通过
- **当前阶段**: **Phase 7 - 可持续成长与长期玩法**

---

## 已完成阶段

### ✅ Phase 1 - 孵化增强
- 孵化互动丰富化
- 蛋壳裂纹可视化
- 孵化记忆系统

### ✅ Phase 2 - 蝌蚪阶段
- 蝌蚪专属 UI
- 变态发育可视化
- 水生环境管理

### ✅ Phase 3 - 照护与惩罚机制
- 疾病系统扩展
- 排泄与清洁系统
- 过度喂食惩罚

### ✅ Phase 4 - 互动与社交增强
- 经典小游戏扩展
- 宠物间互动与送礼
- 性格系统

### ✅ Phase 5 - 遗传与收集
- 基因可视化
- 稀有变异
- 图鉴与收集册

### ✅ Phase 6 - 环境与装饰
- 多场景环境系统
- 环境特效
- 昼夜循环
- 家具/装饰摆放

---

## Phase 7 - 可持续成长与长期玩法（当前）

> 目标：把 ZFrog 从“阶段性功能完整”推进到“可长期养成、可失而复得、可持续回流”。

### P7.1 冬眠 / 唤醒系统（最高优先级）
- [x] 定义 `hibernationStatus` 状态模型（ACTIVE / SLEEPING / WAKING）
- [x] 实现长时间未互动后的自动冬眠检测
- [x] 实现基础唤醒恢复逻辑（恢复精神 / 心情 / 饥饿修正）
- [x] 在 UI 上展示冬眠状态与唤醒反馈
- [x] 将冬眠系统接入更多交互入口与提示文案
- [x] 补充基础规则测试（`src/tests/hibernation.test.ts`）

**交付物**
- `useHibernation.ts`
- `HibernationStatus.tsx`
- `hibernationRules.ts`

### P7.2 基因 2.0（显性 / 隐性）
- [x] 为现有基因结构增加 genotype / phenotype 分层
- [x] 基于 Punnett Square 建立基础繁殖规则层，并接入 `usePetEgg` 的 breed 流程
- [x] 将显隐性结果接入已有 `GeneVisualizer`
- [x] 补充 genetics 基础规则测试（`src/tests/genetics.test.ts`）
- [x] 补充独立稀有变异规则层与基础测试（`mutationRules.ts` + `mutationRules.test.ts`）
- [x] 将稀有变异初步接入 breed 流程（后代可携带 mutation trait）
- [x] 将 mutation trait 接入 UI 展示层（GeneVisualizer 高亮变异特征）
- [x] 将 mutation trait 接入 collection 数据层（create / breed 会写入图鉴条目）
- [x] 将稀有变异与 collection UI / 筛选等现有流程完全打通
- [x] 新增桌面端图鉴弹层并接入菜单 / 托盘入口

**交付物**
- `genetics.ts`
- `punnett.ts`
- `GeneVisualizer` 增强版
- `CollectionDialog.tsx`

### P7.3 长期目标驱动
- [x] 新增长周期目标（连续照护、环境收集、装饰套装）
- [x] 将长期目标接入每日任务 / 成就系统
- [x] 增加回流提示文案和里程碑奖励
- [x] 将家园 / 背包 / 旅行弹层从假数据切回本地真实状态
- [x] 补齐桌宠菜单入口（任务 / 资料 / 家园）
- [x] 将桌面端旅行 / 徽章弹层改为优先同步 web 数据，并对齐旅行统计、足迹与领奖语义

**交付物**
- `useLongTermGoals.ts`
- `LongTermGoalPanel.tsx`
- 真实数据版 `BagDialog` / `HomeDialog` / `TravelDialog`

---

## 真实检查结果（本轮心跳校准）

### Build
- [x] `desktop-pet` 子项目 `npm run build` 通过
- [ ] `npx tsc -p tsconfig.json --noEmit` 仍有历史严格模式报错，当前主要集中在旧 Tadpole / Decoration / utility 组件的未使用变量清理
- [ ] 其他子项目（frontend/backend/contracts/admin）未在本轮逐个验证

### Git
- [x] 当前分支存在本地提交积累：`ahead 57`
- [ ] 需要后续整理哪些提交属于桌宠主线、哪些属于实验性改动

### TODO / FIXME
- [x] 代码主目录未发现明显业务 TODO 堆积
- [x] 发现 `codeQualityChecker.ts` 会扫描 TODO/FIXME，本身不是阻塞项

---

## 下一步执行顺序
1. 先实现 **P7.1 冬眠系统**，提升长期养成与回流体验
2. 再推进 **P7.2 基因 2.0**，强化繁殖博弈深度
3. 最后接 **P7.3 长期目标系统**，形成日常留存闭环

---

## 心跳原则（更新后）
- 每次心跳优先检查 `desktop-pet` 实际可构建性
- 所有阶段推进以真实代码树为准，不再以旧计划文档为准
- 每完成一个子模块，都要同步更新本文件与 `/Users/sxlx/.openclaw/workspace/HEARTBEAT.md`

*进化继续，但这次要和真实代码对齐。* 🐸
