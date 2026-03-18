# ZFrog 多端职责与架构边界（Heartbeat Draft）

更新日期：2026-03-13

## 1. 产品分层

### Desktop (desktop-pet)
**核心定位**：陪伴式桌宠，持续在线，系统级存在感。

**保留为桌面端专属的能力**：
- 悬浮桌宠、透明窗口、鼠标穿透
- 托盘入口 / 菜单快捷动作
- 本地存档与离线优先
- 高即时性互动（拖动、巡逻、悬浮反馈）

**不应该在桌面端里硬耦合的内容**：
- 活动页运营逻辑
- 复杂账号传播页
- 纯浏览型排行榜页面

### Web (frontend)
**核心定位**：轻访问、账号同步、活动传播、社交分享。

**适合优先承载的能力**：
- 用户登录 / 账户绑定
- 宠物图鉴展示、成就展示
- 活动页、分享页、排行榜
- 跨端状态查看

### Mobile (future)
**核心定位**：提醒唤醒、碎片照护、消息触达。

**适合优先承载的能力**：
- 喂食 / 清洁 / 签到等轻操作
- 推送提醒与回流召回
- Widget / 小组件状态展示

---

## 2. 代码职责边界

### desktop-pet/src/renderer/components
负责：
- 纯 UI 组件
- 交互展示
- 视觉层与动效层

不负责：
- 跨组件业务状态汇总
- 本地存储细节
- API 拼接逻辑

### desktop-pet/src/renderer/hooks
负责：
- 单一领域状态与行为封装
- 生命周期逻辑
- 业务规则（如 hibernation / decoration / inventory）

建议继续拆分为：
- `core/`：宠物生命状态、交互、成长主链
- `systems/`：冬眠、装饰、社交、旅行、任务
- `platform/`：Electron、窗口、快捷键、系统能力

### desktop-pet/src/renderer/services
负责：
- 存储访问
- API 访问
- 数据格式转换
- 外部能力桥接

不负责：
- 直接渲染 UI
- 持有复杂 React 状态

---

## 3. 下一步共享层建议

建议新增：`packages/shared/` 或仓库根 `shared/`

第一批可抽离内容：
1. `types/`
   - PetState
   - HibernationState
   - Gene / Mutation / CollectionBook
2. `constants/`
   - 生命周期阈值
   - 稀有度枚举
   - 环境配置
3. `utils/`
   - 时间计算
   - 数值 clamp
   - 稀有度概率工具
4. `rules/`
   - hibernation rules
   - genetics rules
   - reward rules

---

## 4. 当前推荐开发顺序

1. **先稳桌面端**
   - 完成冬眠系统收尾
   - 补规则测试
   - 减少 App.tsx 继续膨胀

2. **再抽共享规则层**
   - 从 `useHibernation` / 基因算法开始抽离纯函数
   - 为未来 web / mobile 复用做准备

3. **最后再推进多端页面**
   - 先做 web 的“查看/同步/分享”能力
   - 不急着把桌宠交互硬搬去网页端

---

## 5. 风险提醒

- 不要把 Electron 专属行为抽进共享层
- 不要让 App.tsx 继续变成总控巨石文件
- 不要一边做桌宠沉浸交互，一边试图让 web 完全复制它
- 多端统一的是数据模型与设计语言，不是所有交互细节
