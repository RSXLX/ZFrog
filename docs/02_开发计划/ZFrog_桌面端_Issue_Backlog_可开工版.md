---
status: 建议执行
version: 1.0
last_updated: 2026-03-24
reviewer: Codex
scope: desktop-pet
---

# ZFrog 桌面端 Issue Backlog 可开工版

## 一、文档目标

这份文档是对 [ZFrog_桌面端问题总结_用户痛点与开发计划.md](/Users/sxlx/.gemini/antigravity/ZFrog/docs/02_开发计划/ZFrog_桌面端问题总结_用户痛点与开发计划.md) 的执行层 backlog。

目标：

1. 把桌面端收敛计划拆成“按周可开工、可验收、可回滚”的任务卡。
2. 每张任务卡都回答清楚：
   1. 谁做
   2. 依赖谁
   3. 改哪些文件
   4. 怎么测
   5. 怎么回滚
3. 保证桌面端先成为稳定可玩的桌宠，再逐步加深联机和动画能力。

---

## 二、当前前提

## 2.1 当前工程前提

1. 桌面端真实主目录为 `desktop-pet/`。
2. 渲染主入口为：
   1. `desktop-pet/src/renderer/App.tsx`
   2. `desktop-pet/src/renderer/services/api.ts`
   3. `desktop-pet/src/renderer/services/storage.ts`
3. 当前核心动画栈为：
   1. `framer-motion`
   2. `SVG 自绘动作`
   3. `lottie-react`
4. 桌面端当前主要问题不是缺功能，而是：
   1. 离线不可解释
   2. 主循环不清晰
   3. 视觉风格不统一
   4. 动画没有统一资产化

## 2.2 本 backlog 的执行原则

1. 先修体验基线，不先堆功能。
2. 先把高频主链路做顺，再改低频扩展页。
3. 所有联机能力都必须有降级路径。
4. 所有新 UI 都必须服从统一样式和动效规范。

---

## 三、任务状态定义

1. `待开工`
   已满足 DoR，可直接领取开发。
2. `进行中`
   已进入编码、联调或设计实现。
3. `阻塞`
   缺依赖、缺设计决策或缺环境支持。
4. `已完成`
   满足 DoD，且测试、文档、回滚策略齐全。

---

## 四、关键路径与并行策略

## 4.1 关键路径

1. `DP-W1-01` -> `DP-W1-02` -> `DP-W2-01` -> `DP-W2-02`
2. `DP-W2-02` -> `DP-W3-01` -> `DP-W3-02` -> `DP-W4-01` -> `DP-W4-02`
3. `DP-W4-02` -> `DP-W5-01` -> `DP-W6-01` -> `DP-W6-02`
4. `DP-W1-01` -> `DP-W7-01` -> `DP-W7-02` -> `DP-W8-01`

## 4.2 可并行任务

1. `DP-W4-01` 设计 token 与 `DP-W5-01` 文案人格库可以并行。
2. `DP-W6-01` 动作状态机与 `DP-W7-01` 登录 UX 可以并行。
3. `DP-W8-01` QA 脚本清理可在 Week 6 后提前起盘，不必等所有界面完成。

---

## 五、周任务总览

| 周次 | 任务卡 | 映射 Issue | 优先级 | 状态 |
|------|--------|------------|--------|------|
| Week 1 | `DP-W1-01` ~ `DP-W1-02` | `DP-00` / `DP-01` | P0 | `待开工` |
| Week 2 | `DP-W2-01` ~ `DP-W2-02` | `DP-10` / `DP-11` | P0 | `待开工` |
| Week 3 | `DP-W3-01` ~ `DP-W3-02` | `DP-20` / `DP-21` | P0 | `待开工` |
| Week 4 | `DP-W4-01` ~ `DP-W4-02` | `DP-30` / `DP-31` | P1 | `待开工` |
| Week 5 | `DP-W5-01` ~ `DP-W5-02` | `DP-40` / `DP-41` | P1 | `待开工` |
| Week 6 | `DP-W6-01` ~ `DP-W6-02` | `DP-50` / `DP-51` | P1 | `待开工` |
| Week 7 | `DP-W7-01` ~ `DP-W7-02` | `DP-60` / `DP-61` | P1 | `待开工` |
| Week 8 | `DP-W8-01` ~ `DP-W8-02` | `DP-70` / `DP-71` | P0 | `待开工` |

---

## 六、任务卡（可直接开工）

## Week 1

### `DP-W1-01` 桌面端运行模式与离线基线收口

1. 映射：`DP-00`
2. Owner：`Desktop Owner`
3. 依赖：无
4. 关键交付：
   1. `desktop-pet/src/renderer/services/api.ts`
   2. `desktop-pet/src/renderer/services/storage.ts`
   3. `desktop-pet/src/renderer/App.tsx`
   4. 新增 `desktop-pet/src/renderer/services/runtimeMode.ts`
   5. 新增 `desktop-pet/src/renderer/components/SystemStatusBanner.tsx`
5. 目标：
   1. 定义 `offline-demo / local-online / production-online` 三种运行模式。
   2. 把默认假在线状态改成显式运行模式。
   3. 对后端不可达时的降级路径做统一收口。
6. 测试：
   1. `npm --prefix desktop-pet run build`
   2. 不启动 `localhost:3001` 时启动桌面端，确认主壳正常可玩
   3. `desktop-pet/test/test_runtime.sh`
7. 回滚：
   1. 保留当前 `storage.getSettings().apiUrl` 路径
   2. 运行模式判断可通过单开关退回旧逻辑
8. DoD：
   1. 用户能明确看到当前运行模式
   2. 后端不可达时不会表现成“像连上但数据是坏的”
   3. 桌宠主界面可在离线模式独立运行
9. 状态：`待开工`

### `DP-W1-02` 远端数据状态组件与异常态产品化

1. 映射：`DP-01`
2. Owner：`Desktop Owner + FE Owner`
3. 依赖：`DP-W1-01`
4. 关键交付：
   1. `desktop-pet/src/renderer/features/notifications/useNotificationFeed.ts`
   2. `desktop-pet/src/renderer/features/pet-shell/useEggLifecycle.ts`
   3. `desktop-pet/src/renderer/components/Dialogs/TravelDialog.tsx`
   4. 新增 `desktop-pet/src/renderer/components/DataStateBadge.tsx`
   5. 新增 `desktop-pet/src/renderer/components/EmptyStateCard.tsx`
5. 目标：
   1. 将“未连接 / 同步中 / 已同步 / 已降级到本地数据”统一成一套状态表达。
   2. 旅行、通知、我的青蛙等面板都显示清楚数据来源与失败原因。
6. 测试：
   1. `npm --prefix desktop-pet run build`
   2. 手动 smoke：后端关闭时打开 `travel / settings / 通知入口`
   3. `desktop-pet/test/test_runtime.sh`
7. 回滚：
   1. 保留组件级 fallback，不强制一次性接管所有界面
8. DoD：
   1. 控制台报错不再是唯一的错误表达
   2. 旅行页能明确显示本地数据 fallback
   3. 通知和我的青蛙读取失败时有 UI 解释
9. 状态：`待开工`

## Week 2

### `DP-W2-01` 试玩模式、默认钱包移除与首次引导

1. 映射：`DP-10`
2. Owner：`Desktop Owner + UX Owner`
3. 依赖：`DP-W1-01`
4. 关键交付：
   1. `desktop-pet/src/renderer/App.tsx`
   2. `desktop-pet/src/renderer/components/Dialogs/SettingsDialog.tsx`
   3. `desktop-pet/src/renderer/services/storage.ts`
   4. 新增 `desktop-pet/src/renderer/components/Dialogs/OnboardingDialog.tsx`
   5. 新增 `desktop-pet/src/renderer/components/GuestModeBadge.tsx`
5. 目标：
   1. 去掉默认钱包地址带来的“伪已接入”感。
   2. 支持未登录试玩。
   3. 为首次打开用户提供最小引导。
6. 测试：
   1. 清空本地存储后首启验证
   2. `npm --prefix desktop-pet run build`
   3. 手动 smoke：试玩模式下完成一次喂养和一次互动
7. 回滚：
   1. 试玩模式仅影响前端显示，不改后端接口
8. DoD：
   1. 首次打开用户能知道当前处于试玩模式
   2. 未登录也能完成基础互动
   3. 设置页不再默认呈现伪钱包身份
9. 状态：`待开工`

### `DP-W2-02` 主循环收敛与首页信息优先级重排

1. 映射：`DP-11`
2. Owner：`Desktop Owner + Product Owner`
3. 依赖：`DP-W1-02`、`DP-W2-01`
4. 关键交付：
   1. `desktop-pet/src/renderer/App.tsx`
   2. `desktop-pet/src/renderer/components/Frog/StatusBar.tsx`
   3. `desktop-pet/src/renderer/components/Frog/InteractionBubble.tsx`
   4. `desktop-pet/src/renderer/components/QuickActionBar.tsx`
   5. 新增 `desktop-pet/src/renderer/components/DailyFocusCard.tsx`
5. 目标：
   1. 将桌宠首页收敛到核心日循环：
      `看状态 -> 互动/喂养 -> 做 1 个今日动作 -> 收到反馈`
   2. 给首页增加一个推荐动作，不让用户自己猜。
6. 测试：
   1. 手动 smoke：新用户 3 分钟内完成闭环
   2. `npm --prefix desktop-pet run build`
   3. 关键状态更新后页面无报错
7. 回滚：
   1. 保留旧菜单入口，不删除功能，只改变优先级和展示
8. DoD：
   1. 首页能清楚表达当前情绪、关键状态、今日任务、推荐动作
   2. 用户第一次打开不看说明也能开始玩
9. 状态：`待开工`

## Week 3

### `DP-W3-01` 菜单信息架构收敛与实验入口隔离

1. 映射：`DP-20`
2. Owner：`Desktop Owner`
3. 依赖：`DP-W2-02`
4. 关键交付：
   1. `desktop-pet/src/renderer/components/HaloMenu/HaloMenu.tsx`
   2. `desktop-pet/src/renderer/components/Frog/QuickMenu.tsx`
   3. `desktop-pet/src/renderer/App.tsx`
   4. `desktop-pet/src/main/index.ts`（如托盘菜单需同步）
5. 目标：
   1. 一级入口仅保留高频核心动作。
   2. 低频入口下沉。
   3. 把链上监控等实验性能力从主链路里隔离。
6. 测试：
   1. 手动 smoke：一级菜单点击路径不超过 1 次可触达核心玩法
   2. `npm --prefix desktop-pet run build`
   3. `desktop-pet/test/test_features.sh`
7. 回滚：
   1. 菜单布局保留旧版配置开关
8. DoD：
   1. 一级菜单不再承担所有功能入口
   2. 实验入口不会抢占主循环注意力
9. 状态：`待开工`

### `DP-W3-02` 互动反馈总线与成长反馈补齐

1. 映射：`DP-21`
2. Owner：`Desktop Owner`
3. 依赖：`DP-W2-02`
4. 关键交付：
   1. `desktop-pet/src/renderer/hooks/usePetStats.ts`
   2. `desktop-pet/src/renderer/hooks/useDailyTasks.ts`
   3. `desktop-pet/src/renderer/hooks/useAchievements.ts`
   4. `desktop-pet/src/renderer/hooks/useMemory.ts`
   5. `desktop-pet/src/renderer/components/Toast.tsx`
   6. 新增 `desktop-pet/src/renderer/hooks/useFeedbackEvents.ts`
5. 目标：
   1. 喂养、摸头、旅行、任务完成、成就解锁都走统一反馈链。
   2. 反馈内容至少包含数值变化、奖励变化或情绪变化中的一种。
6. 测试：
   1. 手动 smoke：4 个核心动作均有反馈
   2. `npm --prefix desktop-pet run build`
   3. 针对纯逻辑模块新增 `node --test` 用例
7. 回滚：
   1. 保留旧 toast / bubble 调用方式，分阶段切换到反馈总线
8. DoD：
   1. 核心动作不再是“做了但没感觉”
   2. 成长反馈标准化，不再散落在各处文案里
9. 状态：`待开工`

## Week 4

### `DP-W4-01` 桌面端设计 token 与公共弹层骨架

1. 映射：`DP-30`
2. Owner：`FE Owner + Desktop Owner`
3. 依赖：`DP-W3-01`
4. 关键交付：
   1. `desktop-pet/src/renderer/styles/global.css`
   2. 新增 `desktop-pet/src/renderer/styles/tokens.css`
   3. 新增 `desktop-pet/src/renderer/styles/dialog.css`
   4. 新增 `desktop-pet/src/renderer/components/common/DialogShell.tsx`
   5. 新增 `desktop-pet/src/renderer/components/common/ActionButton.tsx`
5. 目标：
   1. 建立统一的颜色、字号、间距、圆角、阴影 token。
   2. 把通用弹层骨架抽出来，结束白底表单风四处漂移。
6. 测试：
   1. `npm --prefix desktop-pet run build`
   2. 手动 smoke：至少 3 个弹层使用统一外壳
7. 回滚：
   1. token 先增量接入，不强制全量替换
8. DoD：
   1. 桌宠的卡片、按钮、标签有统一设计语言
   2. 新弹层开发不再靠复制旧内联样式
9. 状态：`待开工`

### `DP-W4-02` 高频弹层视觉统一与尺寸分级

1. 映射：`DP-31`
2. Owner：`Desktop Owner + FE Owner`
3. 依赖：`DP-W4-01`
4. 关键交付：
   1. `desktop-pet/src/renderer/components/Dialogs/TravelDialog.tsx`
   2. `desktop-pet/src/renderer/components/Dialogs/SettingsDialog.tsx`
   3. `desktop-pet/src/renderer/components/Dialogs/BagDialog.tsx`
   4. `desktop-pet/src/renderer/components/Dialogs/FriendsDialog.tsx`
   5. `desktop-pet/src/renderer/components/Dialogs/TasksDialog.tsx`
5. 目标：
   1. 完成“小弹层 / 中弹层 / 大弹层”三级尺寸体系。
   2. 统一关闭按钮、标题区、底部动作区、空态区视觉。
6. 测试：
   1. `npm --prefix desktop-pet run build`
   2. 手动 smoke：5 个高频弹层视觉一致性检查
7. 回滚：
   1. 逐页迁移，旧版样式组件保留一版
8. DoD：
   1. 高频弹层切换时不再像来自不同产品
   2. 核心弹层层级和操作区稳定统一
9. 状态：`待开工`

## Week 5

### `DP-W5-01` 桌宠人格文案库与情绪映射

1. 映射：`DP-40`
2. Owner：`Product Owner + Desktop Owner`
3. 依赖：`DP-W2-02`
4. 关键交付：
   1. `desktop-pet/src/renderer/App.tsx`
   2. `desktop-pet/src/renderer/hooks/useMood.ts`
   3. `desktop-pet/src/renderer/hooks/usePetAI.ts`
   4. 新增 `desktop-pet/src/renderer/content/petCopy.ts`
   5. 新增 `desktop-pet/src/renderer/content/petMoodRules.ts`
5. 目标：
   1. 把问候、等待、喂养、开心、失落、困倦、旅行归来等文案统一成一套人格口径。
   2. 让桌宠情绪不再只是数值结果，而是能被用户感知的角色表达。
6. 测试：
   1. 文案状态映射表检查
   2. `npm --prefix desktop-pet run build`
   3. 手动 smoke：不同情绪下文案和动作表达一致
7. 回滚：
   1. 保留原始 fallback 文案
8. DoD：
   1. 桌宠具备稳定的人格语气
   2. 情绪、文案、行为反馈不互相打架
9. 状态：`待开工`

### `DP-W5-02` 次级面板从展示页升级为动作页

1. 映射：`DP-41`
2. Owner：`Desktop Owner`
3. 依赖：`DP-W3-02`、`DP-W4-02`
4. 关键交付：
   1. `desktop-pet/src/renderer/components/Dialogs/FriendsDialog.tsx`
   2. `desktop-pet/src/renderer/components/Dialogs/HomeDialog.tsx`
   3. `desktop-pet/src/renderer/components/Dialogs/CollectionDialog.tsx`
   4. `desktop-pet/src/renderer/components/Dialogs/ProfileDialog.tsx`
5. 目标：
   1. 好友页至少提供一个明确动作，如查看关系、互动、邀请。
   2. 家园页和图鉴页至少能形成回流目标，不只是展示列表。
6. 测试：
   1. 手动 smoke：每个次级页至少有一个“下一步动作”
   2. `npm --prefix desktop-pet run build`
7. 回滚：
   1. 页面结构不变，仅在卡片内增加 CTA 和空态引导
8. DoD：
   1. 次级页不再是“看完就关”
   2. 页面能把用户带回主循环或长期目标
9. 状态：`待开工`

## Week 6

### `DP-W6-01` 青蛙动作状态机与 motion preset 抽离

1. 映射：`DP-50`
2. Owner：`Desktop Owner + Motion Owner`
3. 依赖：`DP-W5-01`
4. 关键交付：
   1. `desktop-pet/src/renderer/components/Frog/Frog.tsx`
   2. `desktop-pet/src/renderer/hooks/useAnimationController.ts`
   3. 新增 `desktop-pet/src/renderer/animation/frogMotionPresets.ts`
   4. 新增 `desktop-pet/src/renderer/animation/frogStateMachine.ts`
5. 目标：
   1. 把当前散落在 `Frog.tsx` 的状态动画抽离成统一 preset。
   2. 定义动作优先级、可打断性和持续时间。
6. 测试：
   1. `desktop-pet/test/test_features.sh`
   2. `npm --prefix desktop-pet run build`
   3. 针对状态机模块新增 `node --test`
7. 回滚：
   1. 保留旧 `stateVariants` 作为 fallback 映射
8. DoD：
   1. 新增动作不必直接修改 `Frog.tsx` 主体结构
   2. 动作切换不再互相覆盖失控
9. 状态：`待开工`

### `DP-W6-02` 关键演出 Lottie 管线与资产目录

1. 映射：`DP-51`
2. Owner：`Motion Owner + Desktop Owner`
3. 依赖：`DP-W6-01`
4. 关键交付：
   1. `desktop-pet/src/renderer/components/Lottie/FrogLottie.tsx`
   2. `desktop-pet/src/renderer/components/StartupAnimation.tsx`
   3. 新增 `desktop-pet/src/renderer/assets/animations/*.json`
   4. 新增 `desktop-pet/src/renderer/animation/ceremonyRegistry.ts`
5. 目标：
   1. 将占位 Lottie 替换为真实关键演出管线。
   2. 首批覆盖：启动、升级、旅行归来、冬眠唤醒。
6. 测试：
   1. `npm --prefix desktop-pet run build`
   2. 手动 smoke：关键演出播放与中断行为验证
7. 回滚：
   1. 若无正式 Lottie 资源，则回退为 Framer Motion 轻演出
8. DoD：
   1. 至少 3 个高价值场景接入真实演出资源
   2. 资产目录、注册表、触发方式固定
9. 状态：`待开工`

## Week 7

### `DP-W7-01` 先试玩后登录的认证 UX 重做

1. 映射：`DP-60`
2. Owner：`Desktop Owner + FE Owner`
3. 依赖：`DP-W2-01`
4. 关键交付：
   1. `desktop-pet/src/renderer/components/Dialogs/SettingsDialog.tsx`
   2. `desktop-pet/src/renderer/services/api.ts`
   3. 新增 `desktop-pet/src/renderer/components/AuthFlowCard.tsx`
5. 目标：
   1. 把当前技术化登录步骤改成用户导向流程。
   2. 明确“为什么要登录”“登录后有什么增强能力”。
6. 测试：
   1. 手动 smoke：试玩状态进入登录流程
   2. `npm --prefix desktop-pet run build`
7. 回滚：
   1. 保留高级模式入口，仍允许手工输入签名
8. DoD：
   1. 登录流程不会打断试玩
   2. 设置页能够解释登录收益，而不只是暴露技术步骤
9. 状态：`待开工`

### `DP-W7-02` 联机增强能力产品化

1. 映射：`DP-61`
2. Owner：`Desktop Owner + BE Owner`
3. 依赖：`DP-W1-02`、`DP-W7-01`
4. 关键交付：
   1. `desktop-pet/src/renderer/features/travel/useTravelSync.ts`
   2. `desktop-pet/src/renderer/features/notifications/useNotificationFeed.ts`
   3. `desktop-pet/src/renderer/hooks/useSocial.ts`
   4. `desktop-pet/src/renderer/components/Notification.tsx`
   5. `desktop-pet/src/renderer/components/Dialogs/TravelDialog.tsx`
6. 目标：
   1. 把联机能力明确包装成“增强项”，包括：
      1. 旅行历史同步
      2. 联机通知
      3. 关系提醒
      4. 周报/议会类提醒入口
   2. 在线增强必须失败可降级。
7. 测试：
   1. 后端开启和关闭两种场景 smoke
   2. `npm --prefix desktop-pet run build`
8. 回滚：
   1. 联机入口可通过 feature flag 隐藏
   2. 所有页面必须保留本地 fallback
9. DoD：
   1. 用户能感知“登录后更强”，而不是“登录后才可用”
   2. 联机失败不破坏基础养成
10. 状态：`待开工`

## Week 8

### `DP-W8-01` 桌面端 QA 脚本、Smoke 与回归收口

1. 映射：`DP-70`
2. Owner：`QA Owner + Desktop Owner`
3. 依赖：`DP-W4-02`、`DP-W6-01`、`DP-W7-02`
4. 关键交付：
   1. `desktop-pet/test/test_runtime.sh`
   2. `desktop-pet/test/test_features.sh`
   3. `desktop-pet/test/test_all.sh`
   4. `desktop-pet/test/README.md`
   5. 新增 `desktop-pet/test/desktop_smoke_checklist.md`
5. 目标：
   1. 修正现有脚本中的历史噪声和不稳定检查。
   2. 把桌面端 smoke 固定为：
      1. 离线试玩
      2. 联机成功
      3. 动作播放
      4. 高频弹层
6. 测试：
   1. 脚本自运行通过
   2. `npm --prefix desktop-pet run build`
7. 回滚：
   1. 保留旧脚本作为 archive，不直接删除
8. DoD：
   1. QA 能稳定复跑桌面端主链路
   2. 回归检查不再依赖手工记忆
9. 状态：`待开工`

### `DP-W8-02` 桌面端 RC 候选构建与发布门槛冻结

1. 映射：`DP-71`
2. Owner：`Tech Lead + QA Owner + Desktop Owner`
3. 依赖：`DP-W8-01`
4. 关键交付：
   1. `desktop-pet/package.json`
   2. `desktop-pet/electron-builder.json`
   3. `desktop-pet/release/` 构建验证
   4. 新增 `docs/02_开发计划/ZFrog_桌面端_RC_Checklist.md`
5. 目标：
   1. 冻结桌面端 RC 发布门槛。
   2. 明确“离线可玩、联机可降级、动作稳定、弹层统一、脚本可复跑”作为准入标准。
6. 测试：
   1. `npm --prefix desktop-pet run build`
   2. `npm --prefix desktop-pet run pack`
   3. RC checklist 人工演练
7. 回滚：
   1. 保留上一版桌面构建产物
   2. RC 失败则退回到 Week 7 收口
8. DoD：
   1. 有明确桌面端准发布标准
   2. 不再依赖口头说明判断“能不能给用户试玩”
9. 状态：`待开工`

---

## 七、首批建议开工顺序

如果只能先做 3 张卡，建议严格按下面顺序：

1. `DP-W1-01`
2. `DP-W1-02`
3. `DP-W2-01`

原因：

1. 不解决运行模式和异常态，后面所有 UI 优化都会建立在不稳定基线之上。
2. 不解决试玩模式，桌面端仍会带着“默认假在线”的错误产品感。
3. 这三张卡完成后，才适合开始做主循环、UI 统一和动画资产化。

---

## 八、风险提示

1. 如果在 `DP-W1-01` 前继续堆联机功能，桌面端的异常态只会更乱。
2. 如果在 `DP-W4-01` 前大规模改 UI，会继续积累视觉债务。
3. 如果在 `DP-W6-01` 前直接扩动作，动画维护成本会快速失控。
4. 如果在 `DP-W8-01` 前就尝试正式发桌面包，回归稳定性不足。

---

## 九、最终说明

这份 backlog 的目标不是把桌面端做成“大而全桌面平台”，而是先把它做成：

**一个离线可玩、在线增强、人格鲜明、动作稳定、值得每天打开一下的桌宠。**

只要按这份顺序执行，桌面端会明显从“功能样样有一点”收敛成“体验主线是完整的”。 
