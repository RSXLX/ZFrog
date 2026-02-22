---
status: 进行中
version: 1.1
last_updated: 2026-01-14
reviewer: 用户
---

# 个性化青蛙 SVG 生成开发任务

> 本文档记录个性化青蛙 SVG 生成功能的开发任务和进度。

---

## 一、模块概述

实现 LLM 驱动的个性化青蛙 SVG 生成功能，包含稀有度系统、OpenSea 元数据标准、混合生成模式等特性。

**预估工作量**: 22 小时（约 3 个工作日）

---

## 二、任务清单

### 2.1 后端任务

#### P0 - 核心功能

| # | 任务 | 描述 | 预估 | 状态 |
|---|------|------|------|------|
| B1 | 数据库扩展 | Frog 模型添加 5 个字段 | 0.5h | [x] |
| B2 | 类型定义 | 创建 `types/appearance.ts` | 0.5h | [x] |
| B3 | 稀有度算法 | 实现 `rollRarity()` | 1h | [x] |
| B4 | Level 1 规则引擎 | 实现 `generateLevel1()` 同步生成 | 2h | [x] |
| B5 | Sanitizer | 实现参数校验和降级 | 1h | [x] |
| B6 | 生成接口 | `POST /generate` 完整逻辑 | 1.5h | [x] |
| B7 | 获取接口 | `GET /:tokenId/appearance` | 0.5h | [x] |

#### P1 - 安全与优化

| # | 任务 | 描述 | 预估 | 状态 |
|---|------|------|------|------|
| B8 | 签名校验 | 钱包签名验证防刷 | 1h | [x] |
| B9 | 冷却时间 | 5 秒重新生成冷却 | 0.5h | [x] |
| B10 | Level 2 异步 | LLM 异步生成描述 | 1h | [x] |
| B11 | OpenSea 元数据 | `GET /:tokenId/metadata` | 1h | [x] |

#### P2 - 集成

| # | 任务 | 描述 | 预估 | 状态 |
|---|------|------|------|------|
| B12 | 路由注册 | 注册 appearance 路由到 index.ts | 0.3h | [x] |
| B13 | 铸造集成 | frog.routes.ts 保存 appearance | 0.5h | [ ] |

---

### 2.2 前端任务

#### P0 - 核心组件

| # | 任务 | 描述 | 预估 | 状态 |
|---|------|------|------|------|
| F1 | API 服务 | 创建 `appearance.api.ts` | 0.5h | [x] |
| F2 | Hook | 创建 `useFrogAppearance.ts` | 1h | [x] |
| F3 | 插槽式渲染 | `FrogSvgGenerated.tsx` (6 层架构: Base/Markings/Eyes/Mouth/Clothes/Headgear) | 2.5h | [x] |
| F4 | 配件插槽 | 帽子/眼镜/项链/花纹 SVG（各组件独立 viewBox 坐标） | 2.5h | [x] |

#### P1 - 交互与特效

| # | 任务 | 描述 | 预估 | 状态 |
|---|------|------|------|------|
| F5 | DNA 进度条 | `FrogHatchingLoader.tsx` (DNA 读取 + Level 1/2 状态流转 + 蛋壳动画) | 1h | [x] |
| F6 | 彩虹滤镜 | `RainbowEffect.tsx` (隐藏款动态渐变) | 1h | [x] |
| F7 | 稀有度边框 | 不同稀有度的边框样式 | 0.5h | [x] |

#### P2 - 页面集成

| # | 任务 | 描述 | 预估 | 状态 |
|---|------|------|------|------|
| F8 | 铸造页改造 | `FrogMintWithAppearance.tsx` 预览+重新生成 | 1.5h | [x] |
| F9 | 详情页改造 | `FrogAppearanceDisplay.tsx` 外观展示组件 | 1h | [x] |
| F10 | 签名集成 | Hook 支持 withSignature 选项 | 0.5h | [x] |

---

### 2.3 测试任务

| # | 任务 | 描述 | 预估 | 状态 |
|---|------|------|------|------|
| T1 | 单元测试 | 稀有度算法 + Sanitizer | 1h | [ ] |
| T2 | 接口测试 | 生成/获取/元数据接口 | 1h | [ ] |
| T3 | 端到端测试 | 完整铸造流程 | 1h | [ ] |

---

## 三、任务依赖关系

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            任务依赖图                                    │
└─────────────────────────────────────────────────────────────────────────┘

后端:
        B1 (数据库)
           │
           ▼
        B2 (类型)
           │
     ┌─────┴─────┐
     ▼           ▼
  B3 (稀有度)  B5 (Sanitizer)
     │           │
     └─────┬─────┘
           ▼
     B4 (规则引擎)
           │
     ┌─────┴─────┬───────────┐
     ▼           ▼           ▼
  B6 (POST)   B8 (签名)   B9 (冷却)
     │           │           │
     └─────┬─────┴───────────┘
           ▼
     B7 (GET) ───▶ B11 (OpenSea)
           │
           ▼
     B10 (异步LLM) ───▶ B12 (注册) ───▶ B13 (铸造集成)


前端:
        F1 (API)
           │
           ▼
        F2 (Hook)
           │
     ┌─────┴─────┐
     ▼           ▼
  F3 (渲染)   F4 (配件)
     │           │
     └─────┬─────┘
           │
     ┌─────┼─────┬─────────┐
     ▼     ▼     ▼         ▼
  F5 (加载) F6 (滤镜) F7 (边框) F10 (签名)
     │     │     │         │
     └─────┴─────┴─────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
  F8 (铸造)   F9 (详情)
```

---

## 四、开发顺序建议

### 第一阶段：后端核心 (Day 1 上午)

```
B1 → B2 → B3 → B5 → B4 → B6 → B7
```

预估时间：7 小时

### 第二阶段：后端优化 + 前端基础 (Day 1 下午 - Day 2 上午)

```
后端: B8 → B9 → B10 → B11 → B12 → B13
前端: F1 → F2 → F3 → F4
```

预估时间：8 小时

### 第三阶段：前端特效 + 集成 (Day 2 下午)

```
F5 → F6 → F7 → F8 → F9 → F10
```

预估时间：4 小时

### 第四阶段：测试 (Day 3)

```
T1 → T2 → T3
```

预估时间：3 小时

---

## 五、文件变更清单

### 5.1 新增文件 (10 个)

| 文件路径 | 说明 |
|----------|------|
| `backend/src/types/appearance.ts` | 类型定义 |
| `backend/src/services/appearance.service.ts` | 核心服务 |
| `backend/src/api/routes/appearance.routes.ts` | API 路由 |
| `frontend/src/services/appearance.api.ts` | API 调用 |
| `frontend/src/hooks/useFrogAppearance.ts` | 外观 Hook |
| `frontend/src/components/frog/FrogSvgGenerated.tsx` | 参数化渲染 |
| `frontend/src/components/frog/FrogHatchingLoader.tsx` | 孵化动画 |
| `frontend/src/components/frog/effects/RainbowEffect.tsx` | 彩虹滤镜 |
| `frontend/src/components/frog/accessories/index.tsx` | 配件导出 |
| `frontend/src/components/frog/accessories/*.tsx` | 各配件组件 |

### 5.2 修改文件 (5 个)

| 文件路径 | 修改内容 |
|----------|----------|
| `backend/prisma/schema.prisma` | Frog 模型添加 5 个字段 |
| `backend/src/index.ts` | 注册 appearance 路由 |
| `backend/src/api/routes/frog.routes.ts` | 铸造时保存 appearance |
| `frontend/src/components/frog/FrogMint.tsx` | 集成预览和签名 |
| `frontend/src/pages/FrogDetail.tsx` | 使用新渲染组件 |

---

## 六、验收标准

### 6.1 功能验收

| 验收项 | 验收标准 |
|--------|----------|
| 生成外观 | 返回完整参数，响应 < 100ms |
| 稀有度分布 | 10000 次测试符合预设概率 |
| 重新生成 | 限制 3 次，有 5 秒冷却 |
| 签名校验 | 无签名请求返回 401 |
| 隐藏款 | 触发时显示彩虹滤镜 |
| OpenSea 元数据 | 符合标准格式 |

### 6.2 性能验收

| 指标 | 目标值 |
|------|--------|
| Level 1 生成 | < 50ms |
| 完整接口响应 | < 100ms |
| SVG 渲染 FPS | 60 FPS |
| 彩虹动画 FPS | 30+ FPS |

---

## 七、变更记录

| 日期 | 内容 |
|------|------|
| 2026-01-14 | 创建开发任务文档 |
| 2026-01-14 | v1.1: F3/F4 改为 6 层插槽架构，F5 改为 DNA 进度条设计 |

---
