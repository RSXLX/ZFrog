# ZFrog Project Architecture

本文件是 ZFrog 仓库的全局架构与开发约定说明。

目标：
- 让新的 AI 会话或新加入的开发者在读取本文件后，快速理解项目的真实运行结构。
- 明确哪些目录是当前主线，哪些是遗留/实验代码。
- 提供统一的新增页面、调接口、加功能的推荐路径，避免继续放大现有技术债。

---

## 1. 项目定位

ZFrog 不是单一前端项目，而是一个多模块仓库，当前主线由以下 5 个子项目组成：

- `frontend/`
  用户端 Web 前端，当前真实主线是 `React + Vite + React Router + Wagmi + React Query + Zustand`。
- `admin/`
  管理后台，当前真实主线是 `React + Vite + Ant Design + Axios`。
- `backend/`
  Node.js/TypeScript 后端，负责 API、WebSocket、定时任务、链上监听、AI 和图片相关编排。
- `contracts/`
  Hardhat 智能合约工程，负责 NFT、旅行、跨链相关合约。
- `desktop-pet/`
  Electron 桌宠端，独立于 `frontend/` 的桌面实现。

当前不应默认作为主线开发入口的目录：

- `desktop_pet/`
  旧的 Python 桌宠原型。
- 根目录 `src/renderer/`
  残留渲染层代码，不在当前主启动链路中。
- `microservices/`
  预留/实验性拆分骨架，当前主运行链路未接入。
- `frontend/.next`
  旧构建残留，不代表当前前端仍在使用 Next.js 运行。

结论：
- 默认开发目标应优先落在 `frontend`、`admin`、`backend`、`contracts`、`desktop-pet`。
- 若任务未明确指向遗留目录，不要优先修改 `desktop_pet`、根 `src/renderer`、`microservices`。

---

## 2. 技术栈总览

### 2.1 用户端 `frontend`

- React 18
- TypeScript
- Vite 7
- React Router 7
- Wagmi + Viem + Ethers
- React Query
- Zustand
- Tailwind CSS v4
- Framer Motion
- 存在 Tauri 适配代码，但当前 Web 主线仍以 Vite SPA 为主

重要说明：
- `frontend/package.json` 中虽然有 `next` 依赖，但当前真实运行入口不是 Next.js。
- 不要按 Next App Router 习惯去新增 `app/`、`page.tsx` 等结构。
- 当前前端路由集中定义在 `frontend/src/App.tsx`。

### 2.2 管理后台 `admin`

- React 19
- TypeScript
- Vite 7
- React Router 7
- Ant Design 6
- Axios
- Dayjs

重要说明：
- 后台没有成熟的全局状态层，主要是页面本地状态。
- 后台已安装 Zustand，但当前源码几乎未实际使用。

### 2.3 后端 `backend`

- Node.js 18+
- TypeScript
- Express 4
- Prisma
- PostgreSQL
- Socket.IO
- Redis / ioredis
- node-cron
- Zod
- OpenAI SDK
- Sharp

### 2.4 合约 `contracts`

- Hardhat
- Solidity 0.8.20 / 0.8.24
- OpenZeppelin Contracts
- OpenZeppelin Upgradeable
- ZetaChain 协议依赖

### 2.5 桌宠端 `desktop-pet`

- Electron 28
- React 18
- Vite 5
- TypeScript
- electron-builder
- Framer Motion

---

## 3. 运行方式与入口

本仓库不是 workspace monorepo。
每个子项目单独管理依赖，各自有自己的 `package.json` / `package-lock.json`。

### 3.1 常用启动方式

根目录脚本：

```bash
./start.sh
```

这个脚本当前会启动：
- `backend`
- `frontend`
- `admin`

注意：
- `start.sh` 已与 `admin/vite.config.ts` 对齐，后台默认端口为 `3002`。

### 3.2 独立启动

后端：

```bash
cd backend
npm run dev
```

用户端前端：

```bash
cd frontend
npm run dev
```

管理后台：

```bash
cd admin
npm run dev
```

桌宠 Electron：

```bash
cd desktop-pet
npm run dev
```

### 3.3 端口说明

当前常见端口：

- `backend`: `3001`
- `frontend`: `5173`
- `admin`: `3002`
- `desktop-pet` Vite renderer: `5175`

重要注意：
- `frontend` 与 `desktop-pet` 默认端口已错开，通常不会再发生开发态端口冲突。

---

## 4. 目录结构说明

### 4.1 根目录

```text
ZFrog/
├── frontend/         用户端 Web 前端
├── admin/            管理后台
├── backend/          Node API / WebSocket / 定时任务
├── contracts/        Hardhat 合约工程
├── desktop-pet/      Electron 桌宠
├── desktop_pet/      旧 Python 桌宠原型
├── docs/             历史文档、PRD、接口说明
├── microservices/    实验/预留拆分骨架
├── src/              遗留渲染代码
└── start.sh          常用本地启动脚本
```

### 4.2 `frontend/src`

```text
src/
├── App.tsx                 前端总路由与全局布局
├── main.tsx                前端入口
├── pages/                  页面级组件
├── components/
│   ├── common/             通用 UI 组件
│   ├── frog/               青蛙业务组件
│   ├── travel/             旅行业务组件
│   ├── garden/             家园业务组件
│   ├── wallet/             钱包组件
│   ├── chat/               聊天组件
│   ├── notification/       通知组件
│   └── ...
├── hooks/                  自定义 Hook
├── services/               API / 钱包 / 第三方服务封装
├── stores/                 Zustand 状态
├── config/                 链、合约、wagmi 配置
├── styles/                 全局样式与设计变量
├── i18n/                   国际化上下文
├── types/                  TS 类型
└── __tests__/              Jest 测试
```

### 4.3 `admin/src`

```text
src/
├── App.tsx                 后台路由
├── main.tsx                后台入口
├── pages/                  后台页面
├── components/Layout/      后台主布局
├── services/api.ts         Axios 实例
└── utils/error.ts          错误提取工具
```

### 4.4 `backend/src`

```text
src/
├── index.ts                后端总入口
├── api/routes/             各业务路由
├── services/               业务服务
├── workers/                后台任务/监听
├── websocket/              Socket.IO 逻辑
├── middlewares/            中间件
├── config/                 配置与链信息
├── utils/                  公共工具
├── database.ts             Prisma 单例入口
└── types/                  TS 类型
```

### 4.5 `desktop-pet/src`

```text
src/
├── main/                   Electron 主进程与 preload
├── renderer/
│   ├── App.tsx             桌宠总入口
│   ├── components/         桌宠组件
│   ├── hooks/              桌宠本地逻辑
│   ├── services/           API 与本地存储
│   └── styles/             桌宠样式
└── ...
```

---

## 5. 核心入口与路由组织

### 5.1 用户端前端路由

入口链路：

```text
frontend/index.html
  -> frontend/src/main.tsx
  -> frontend/src/App.tsx
```

根入口职责：

- `main.tsx`
  注入 `I18nProvider`、`WagmiProvider`、`QueryClientProvider`。
- `App.tsx`
  定义 `BrowserRouter`、主导航、全局 Footer、好友浮窗、页面路由。

当前特点：

- 没有独立 `router/` 目录。
- 路由集中写在 `frontend/src/App.tsx`。
- 页面按业务放在 `src/pages`。
- 重页面通常做 `lazy` 懒加载。
- 全局 UI 外壳不是嵌套路由布局，而是直接包在 `App.tsx` 外层。

### 5.2 管理后台路由

入口链路：

```text
admin/index.html
  -> admin/src/main.tsx
  -> admin/src/App.tsx
```

当前特点：

- 使用嵌套路由。
- `MainLayout` 作为根布局。
- 子页面通过 `Outlet` 挂载。
- 页面目录在 `admin/src/pages/*/index.tsx`。

### 5.3 后端 API 路由

入口链路：

```text
backend/src/index.ts
  -> 挂载 backend/src/api/routes/*.routes.ts
```

当前特点：

- 各业务域拆为独立 route 文件。
- 在 `backend/src/index.ts` 统一挂载到 `/api/*`。
- 同时启动 Socket.IO、后台 worker、cron。

### 5.4 桌宠端

入口链路：

```text
desktop-pet/src/main/index.ts
  -> 创建 Electron 窗口
  -> 加载 desktop-pet/src/renderer/main.tsx
  -> 渲染 desktop-pet/src/renderer/App.tsx
```

当前特点：

- 没有 URL 路由。
- 界面组织以本地状态 + 弹窗对话框为主。

---

## 6. 当前模块边界

推荐按以下边界理解项目：

- `frontend`
  面向普通用户的主 Web UI。
- `admin`
  运营/调试/合约管理后台。
- `backend`
  对外统一业务 API 与实时能力。
- `contracts`
  链上事实来源。
- `desktop-pet`
  独立桌面陪伴体验，不等同于 `frontend`。

不要混淆的点：

- `frontend` 不是 Next.js 项目。
- `desktop-pet` 不是 `frontend` 的一个普通页面，而是独立的 Electron 应用。
- `frontend/src-tauri` 存在，但不是当前唯一桌面方案。

---

## 7. API 请求规范

这一部分很重要，因为当前仓库已经存在多套请求方式并存的问题。

### 7.1 当前现状

当前共有 3 套主要请求封装：

- `frontend/src/services/api.ts`
  用户端主请求层，基于 `fetch`。
- `admin/src/services/api.ts`
  后台 Axios 实例。
- `desktop-pet/src/renderer/services/api.ts`
  桌宠端独立 `fetch` 请求层。

此外，源码中还存在若干直接 `fetch(...)`：

- SSE 流式响应
- WebSocket 配套的 fallback polling
- 少量历史遗留组件
- 访问第三方接口

### 7.2 用户端前端如何调接口

推荐规则：

1. 所有新加的用户端业务 HTTP 请求，优先通过 `frontend/src/services/api.ts`。
2. 再按领域封装到 `frontend/src/services/<domain>.api.ts`。
3. 页面和业务组件尽量不要直接写裸 `fetch`。
4. 裸 `fetch` 仅允许用于：
   - SSE / 流式响应
   - WebSocket 旁路轮询
   - 第三方域名接口
   - 当前 `apiService` 明显不适配的特殊场景

推荐写法：

```ts
// src/services/family.api.ts
import { apiService } from './api';

export const familyApi = {
  async getFamilies() {
    const res = await apiService.get('/families');
    return res.data;
  },

  async createFamily(payload: { name: string }) {
    const res = await apiService.post('/families', payload);
    return res.data;
  },
};
```

说明：

- `apiService` 会自动给非 `/api` 路径补 `/api` 前缀。
- 因此在新代码里，推荐传 `/families` 而不是 `/api/families`。
- `frontend/src` 主线代码已收敛为“无 `/api` 前缀”的短路径写法，后续应继续保持。

### 7.3 后台如何调接口

后台当前使用 Axios：

- 基础实例：`admin/src/services/api.ts`
- 返回值已在响应拦截器中解包为 `response.data`

推荐写法：

```ts
import api from '../../services/api';

const data = await api.get('/api/admin/families');
```

后台当前没有自动拼 `/api` 前缀，因此：

- 后台请求路径请显式写完整，如 `/api/admin/...`

### 7.4 桌宠端如何调接口

桌宠端使用自己的 API 层：

- `desktop-pet/src/renderer/services/api.ts`
- 基础地址来自本地设置 `storage.getSettings().apiUrl`

如果是桌宠新功能，优先复用桌宠自己的请求层，不要直接引用 `frontend` 的 `apiService`。

### 7.5 后端响应格式推荐

当前后端响应格式不完全统一。

理想格式应统一为：

```json
{
  "success": true,
  "data": {},
  "message": "optional",
  "meta": {}
}
```

新接口必须优先遵循这一格式。

不要继续新增这些不统一情况：

- 直接返回裸数组
- 直接返回裸对象
- 错误时只返回 `{ error: '...' }` 而没有 `success: false`
- 分页接口返回字段命名不一致

### 7.6 CORS 与跨域

当前跨域机制：

- 开发态通过 Vite 代理 `/api` 到后端。
- 后端开启 CORS 白名单并设置 `credentials: true`。

但当前前端/后台调用中：

- 基本没有使用 cookie session
- 没有统一传 `Authorization`
- 也没有 `withCredentials` / `credentials: 'include'` 常规用法

结论：

- 当前系统并不是一个成熟的 session/cookie 鉴权体系。
- 新增受保护接口时，必须同步考虑鉴权方案，而不是假设项目已有完整登录态。

### 7.7 鉴权现状

后端已有：

- `backend/src/middlewares/auth.middleware.ts`
- JWT token 生成/校验
- 可选认证 / 强制认证 / 资源所有权校验

当前状态：

- `backend/src/index.ts` 已在 `/api/admin` 路由层挂载 `authRequired`
- `/api/admin` 进一步接入了管理员白名单校验（`ADMIN_ADDRESSES`）
- `admin/src/services/api.ts` 已支持统一注入 `Authorization`，并在开发态支持 `x-admin-address` 兜底

推荐规范：

- 新增真正需要保护的接口时：
  1. 在后端 route 上接入中间件
  2. 在前端或后台请求层统一注入 token
  3. 明确错误码与 401/403 的处理路径

---

## 8. 全局状态与数据流规范

### 8.1 当前模式

`frontend` 当前是混合模式：

- 链上钱包状态：Wagmi
- 服务端缓存：React Query
- 客户端业务状态：Zustand
- 持久化偏好与会话：`persist` + localStorage / Electron store
- 局部页面状态：React `useState`
- 横切能力：React Context

### 8.2 已存在的主要状态层

`frontend`

- `services/wallet/sessionStore.ts`
  钱包会话持久化
- `stores/frogStore.ts`
  当前青蛙 / 青蛙列表 / 活跃旅行
- `stores/travelStore.ts`
  旅行状态
- `stores/friendDataStore.ts`
  好友数据，不持久化
- `stores/friendFloatStore.ts`
  好友浮窗 UI 状态，持久化
- `stores/communityStore.ts`
  社区选择状态，部分持久化

Context：

- `i18n/index.tsx`
- `components/common/ToastProvider.tsx`

### 8.3 推荐使用规则

新增功能时遵循下面的优先级：

1. 如果是后端数据，且会跨页面复用、需要缓存、需要刷新失效：
   使用 React Query。
2. 如果是纯客户端 UI 状态：
   使用 Zustand。
3. 如果只是单页面短生命周期状态：
   使用 `useState`。
4. 如果是横切基础能力：
   使用 Context。
5. 如果需要持久化：
   在 Zustand store 上用 `persist`，或明确落地 localStorage。

### 8.4 不要再放大的问题

当前已有状态碎片化问题，新代码应避免：

- 把同一份服务端真值同时放在 React Query 和多个 Zustand store
- 页面组件直接读写大量 localStorage
- 业务组件自己发请求、自己缓存、自己维护副本
- 新增没有归属的“临时 store”

推荐：

- 先确定该数据是“服务端真值”还是“纯前端交互态”
- 再选 React Query 或 Zustand

---

## 9. 样式与组件规范

### 9.1 用户端 `frontend`

主要样式方式：

- Tailwind CSS v4
- 全局设计 token：`src/styles/design-system.css`
- 全局样式入口：`src/styles/globals.css`
- Framer Motion 做交互与动画
- 少量复杂场景使用独立 CSS 文件

推荐规则：

1. 新的普通 UI 优先使用 Tailwind utility class。
2. 通用设计变量优先写入 `design-system.css` 或 `globals.css`。
3. 只有在以下情况再单独建 `.css` 文件：
   - 复杂动画
   - 第三方容器样式覆盖
   - 大量伪元素 / keyframes
   - 画布 / 轨迹 / 粒子类复杂视觉

### 9.2 后台 `admin`

主要样式方式：

- Ant Design 组件系统
- `ConfigProvider` 主题
- 少量 `index.css`
- 大量页面局部 inline style

推荐规则：

1. 后台新增页面优先沿用 Ant Design。
2. 不要在后台引入另一套 UI 设计系统。
3. 对后台而言，组件一致性优先于视觉创新。

### 9.3 桌宠端 `desktop-pet`

主要样式方式：

- 普通 CSS 文件
- Framer Motion
- 本地视觉组件分散在各目录

推荐规则：

- 桌宠界面以可控、轻量、动画友好为优先。

### 9.4 通用组件与业务组件如何划分

`frontend` 推荐边界：

- `components/common`
  与业务无关，可跨多个域复用的 UI 组件
  例如：
  - Button
  - Loading
  - Skeleton
  - ToastProvider
  - ResponsiveContainer

- `components/<domain>`
  领域组件，只服务于某个业务域
  例如：
  - `components/frog`
  - `components/travel`
  - `components/garden`
  - `components/chat`

判断标准：

- 如果组件名称脱离业务语境仍然成立，放 `common`
- 如果组件明显依赖某域的数据结构和交互，放对应业务目录

不推荐：

- 把业务组件塞到 `common`
- 在 `common` 里引入具体业务 API
- 一个组件同时承担“页面容器 + 数据请求 + 复杂展示 + 全局状态写入”

---

## 10. 新增页面开发规范

### 10.1 在 `frontend` 新增页面

步骤：

1. 新建页面组件

```text
frontend/src/pages/FamilyPage.tsx
```

2. 如果页面较重，建议在 `frontend/src/App.tsx` 中用 `lazy` 引入。

3. 在 `frontend/src/App.tsx` 中注册路由。

4. 如果需要导航入口，更新：

- `frontend/src/components/common/Navbar.tsx`
- 或对应业务入口页

5. 把页面使用的领域组件放入：

```text
frontend/src/components/family/
```

6. 把页面的 HTTP 封装放入：

```text
frontend/src/services/family.api.ts
```

7. 如果存在跨页面状态，新增：

```text
frontend/src/stores/familyStore.ts
```

或者优先考虑 React Query。

推荐最小模板：

```tsx
// frontend/src/pages/FamilyPage.tsx
import { useEffect, useState } from 'react';
import { familyApi } from '../services/family.api';

export function FamilyPage() {
  const [families, setFamilies] = useState([]);

  useEffect(() => {
    familyApi.getFamilies().then(setFamilies).catch(console.error);
  }, []);

  return <div>Family Page</div>;
}
```

### 10.2 在 `admin` 新增页面

步骤：

1. 新建目录：

```text
admin/src/pages/Families/index.tsx
```

2. 在 `admin/src/App.tsx` 注册后台路由。

3. 在 `admin/src/components/Layout/MainLayout.tsx` 增加：

- 菜单项
- 页面标题映射

4. 调接口时使用 `admin/src/services/api.ts`

5. 页面状态优先本地维护，除非确实需要全局化。

---

## 11. 新增接口开发规范

### 11.1 在 `backend` 新增 API

标准步骤：

1. 判断该接口属于哪个业务域：

- frog
- travel
- garden / homestead
- chat
- notification
- admin
- community
- nurture
- shop
- breed
- ...

2. 优先写入已有 domain route 文件；只有域明显独立时再新建新的 `*.routes.ts`。

3. 如果涉及核心业务，逻辑应尽量下沉到 `services/`，route 只做：

- 参数提取
- 权限判断
- service 调用
- 响应返回

4. 在 `backend/src/index.ts` 挂载新 route。

5. 如涉及数据库模型变更：

- 修改 `backend/prisma/schema.prisma`
- 生成 migration
- 补 seed / 数据修正脚本（如果需要）

6. 如涉及实时通知：

- 更新 `backend/src/websocket/index.ts`
- 或在对应 worker / service 中发送事件

### 11.2 后端 route 的推荐写法

建议：

- 新代码优先使用统一响应格式
- 新代码优先复用 `backend/src/database.ts` 的 prisma 单例
- 不要再在 service / route 中随意 `new PrismaClient()`
- 复杂 async 路由建议使用统一错误处理包装器

推荐骨架：

```ts
import { Router } from 'express';
import { prisma } from '../../database';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const rows = await prisma.family.findMany();
    return res.json({
      success: true,
      data: rows,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

export default router;
```

### 11.3 前后端联动新增接口

完整链路建议：

1. 后端先确定路径、参数、返回结构
2. 前端在 `types` 中补接口类型
3. 前端在 `services/*.api.ts` 封装调用
4. 需要复用/缓存时包一层 Hook
5. 页面或业务组件再消费 Hook 或 service

---

## 12. 新增功能的推荐流程

新增功能不要从页面直接开始堆代码，推荐按下面顺序做：

### 12.1 纯前端功能

适用：
- 新页面
- 新组件
- 新交互
- 新动效
- 新的本地 UI 能力

流程：

1. 确定落在哪个模块
2. 先补类型
3. 再补通用组件或业务组件
4. 最后注册页面与入口

### 12.2 需要后端支持的功能

流程：

1. 明确数据模型是否需要变更
2. 新增/扩展后端 route + service
3. 明确返回结构
4. 前端新增 `services/<domain>.api.ts`
5. 需要缓存则加 React Query Hook
6. 需要共享前端 UI 态则加 Zustand store
7. 页面接入

### 12.3 需要全链路的功能

典型场景：
- 新旅行模式
- 新 NFT 行为
- 新家园玩法
- 新社交能力
- 新空投/任务/繁殖/家族系统

流程：

1. `contracts` 确认链上事实
2. `backend` 对接链上结果并持久化
3. `frontend` 封装 API、展示状态
4. `admin` 补运维/调试入口
5. 需要桌面体验时再评估是否同步到 `desktop-pet`

---

## 13. 当前项目中的关键开发规范

这一节不是“当前代码全都这样”，而是未来应该优先遵守的统一规则。

### 13.1 新代码应该遵守

- 用户端 HTTP 请求优先走 `frontend/src/services/api.ts`
- 新业务域优先新建 `services/<domain>.api.ts`
- React Query 管服务端缓存，Zustand 管前端状态
- 通用 UI 放 `components/common`
- 业务 UI 放 `components/<domain>`
- 后端新 route 尽量返回统一 `success/data/message/meta`
- 后端复用 `backend/src/database.ts` 的 Prisma 单例
- 大功能优先按“后端 -> service -> 前端 service -> hook/store -> 页面”串起来

### 13.2 新代码应避免

- 在页面或业务组件里直接写大量裸 `fetch`
- 新增第四套请求层
- 服务端数据重复存进多个 store
- 新增没有明确归属的 `localStorage` key
- 在 `backend` 各处继续随手 `new PrismaClient()`
- 在 `frontend` 用 Next.js 习惯新增结构
- 在 `admin` 引入和 Ant Design 冲突的新 UI 体系

---

## 14. 重要特殊逻辑

未来开发时需要特别知道下面这些“容易踩坑”的逻辑：

### 14.1 前端并非 Next.js

- 虽然有 `next` 依赖和 `.next` 目录，但当前运行主线是 `Vite SPA + React Router`。

### 14.2 路径命名不完全统一

后端当前存在：

- `/api/frogs`
- `/api/frog`
- `/api/travels`
- `/api/group-travel`
- `/api/crosschain-transfer`
- `/api/frogs/appearance`

这说明：
- 复数/单数命名并不统一
- 新接口设计时要特别确认领域归属和现有命名

### 14.3 `frontend` 的 `apiService` 支持自动补 `/api`

所以：

- `apiService.get('/frogs/1')` 可以
- `apiService.get('/api/frogs/1')` 也可以

但这也会导致团队心理模型混乱。

推荐：
- 新用户端代码统一使用“不带 `/api` 前缀”的调用方式（当前主线已基本完成该收敛）。

### 14.4 部分长任务同时依赖 WebSocket 与 Polling

例如旅行、跨链追踪等模块：

- WebSocket 做实时推送
- HTTP polling 做 fallback

因此：
- 新增长时任务状态流时，需要明确是否也需要 fallback 轮询

### 14.5 `DELETE` 带 body 支持现状

当前 `apiService.delete()` 已支持可选 body 参数。

现有代码里仍有：
- 用 `POST /lock/release` 模拟 `DELETE` 的历史兼容做法

建议：
- 新功能优先按标准 REST 语义设计接口
- 遗留 POST 兼容路径可逐步迁移

### 14.6 管理后台权限现状

当前已接入：
- `/api/admin` 统一认证中间件保护
- `admin` 请求层统一注入 token（开发态有地址兜底）

仍需注意：
- 当前仍未形成完整的生产级 RBAC / 审计能力
- 生产环境应显式配置 `ADMIN_ADDRESSES`，否则管理员接口会拒绝访问
- 敏感后台功能应继续补细粒度权限策略

---

## 15. 当前主要技术债

### 15.1 请求层分裂

现状：
- `frontend` 主请求层已覆盖内部 HTTP；`interactionApi` 已复用 `apiService`
- 仍保留 SSE / 第三方接口 / 链 RPC 场景的裸 `fetch`
- `admin` 用 Axios
- `desktop-pet` 自己再封一套

影响：
- 错误处理不一致
- 返回结构适配成本高
- 重构困难

### 15.2 后端响应格式不统一

现状：
- 有统一响应工具，但实际路由广泛未收口
- `admin`、`friends`、`notifications`、`tasks`、`communities` 路由已收敛到统一 envelope
- 有的接口返回 `{ success, data }`
- 有的接口返回裸对象/裸数组

影响：
- 前端不得不写兼容代码

### 15.3 状态管理碎片化

现状：
- Wagmi
- React Query
- 多个 Zustand store
- localStorage / sessionStorage
- 局部组件状态

影响：
- 刷新恢复与数据一致性更复杂

### 15.4 多套桌面方案并存

现状：
- `frontend/src-tauri`
- `desktop-pet` Electron
- `desktop_pet` Python 原型

影响：
- 桌面能力边界不清晰

### 15.5 Prisma 实例化散落

现状：
- 运行时主链路的 service / route 已收敛为共享 `backend/src/database.ts` 单例
- `backend/src/scripts` 也已完成单例收敛（`backend/src` 范围内不再散落 `new PrismaClient()`）

影响：
- 连接池风险显著降低，后续重点转向响应协议与鉴权策略收敛

### 15.6 类型约束偏松

现状：
- `frontend` TypeScript `strict: false`
- `noImplicitAny: false`

影响：
- 接口漂移更难被编译期发现

### 15.7 历史兼容与 fallback 较多

现状：
- deprecated service
- legacy 路径
- mock mode
- fallback journal / fallback address / fallback polling

影响：
- 新会话很容易误把兼容逻辑当成主逻辑

---

## 16. 推荐的后续收敛方向

若未来有时间进行架构治理，优先顺序建议：

1. 收敛用户端请求层
   - 所有普通 HTTP 调用统一到 `apiService`
2. 统一后端响应协议
   - 新接口全部收敛到统一 envelope
3. 收敛 Prisma 客户端
   - 全部改为共享单例
4. 补齐真正的鉴权链路
   - 特别是 `admin`
5. 收敛桌面方案边界
   - 明确保留 Tauri 还是 Electron 为主线

---

## 17. AI 会话启动建议

新 AI 会话开始时，建议先按以下顺序判断：

1. 任务属于哪个模块？
   - `frontend`
   - `admin`
   - `backend`
   - `contracts`
   - `desktop-pet`

2. 是否误落入遗留目录？
   - `desktop_pet`
   - 根 `src/renderer`
   - `microservices`

3. 是否涉及：
   - 新页面
   - 新接口
   - 数据模型变更
   - 链上逻辑
   - WebSocket / polling
   - 后台管理能力

4. 若是前端新功能，先找：
   - `services/`
   - `hooks/`
   - `stores/`
   - `App.tsx` 路由

5. 若是后端新功能，先找：
   - `api/routes`
   - `services`
   - `database.ts`
   - `prisma/schema.prisma`

---

## 18. 快速操作手册

### 18.1 新增前端页面

```text
1. 新建 src/pages/FooPage.tsx
2. 视情况在 App.tsx 中 lazy import
3. 在 App.tsx 注册 Route
4. 如需入口，更新 Navbar.tsx
5. 新建 src/services/foo.api.ts
6. 需要缓存时新建 Hook，必要时加 store
```

### 18.2 新增后台页面

```text
1. 新建 admin/src/pages/Foo/index.tsx
2. 在 admin/src/App.tsx 注册路由
3. 在 MainLayout.tsx 增加菜单项和标题映射
4. 使用 admin/src/services/api.ts 调用后端
```

### 18.3 新增后端接口

```text
1. 选定 domain route
2. 逻辑下沉到 services
3. route 返回统一 success/data
4. 在 backend/src/index.ts 中挂载
5. 如需数据变更，更新 Prisma schema 与 migration
```

### 18.4 新增端到端功能

```text
1. 先确认数据模型或链上来源
2. 再加 backend route/service
3. 再加 frontend service/hook/store
4. 最后接页面与组件
5. 若有运维需求，同步加 admin 页面
```

### 18.5 常用测试命令

```text
backend
- npm run lint
- npm run type-check
- npm test                 # 当前会执行 unit + integration + e2e 测试文件
- npm run test:coverage
- npm run test:integration
- npm run test:e2e

frontend
- npm run lint
- npm run type-check
- npm test                 # Jest 单测
- npm run test:e2e         # Playwright 冒烟（frontend/e2e/smoke.e2e.ts）

admin
- npm run lint
- npm run build

contracts
- npm run compile
- npm test
```

---

## 19. 本文档维护规则

当出现以下变化时，应同步更新本文件：

- 新的主线模块加入
- 旧模块正式废弃
- 路由入口调整
- 请求层统一策略调整
- 状态管理策略调整
- 鉴权链路接通
- 桌面方案主线发生变化

如果代码和本文档冲突：

- 先以代码真实实现为准
- 然后尽快修正文档

---

## 20. 一句话总结

ZFrog 当前是一个以 `frontend + admin + backend + contracts + desktop-pet` 为主线的多模块仓库；真实主 Web 前端是 `Vite + React Router`，不是 Next.js；状态和请求层目前存在一定碎片化，未来新增功能应优先沿用统一的 service、route、store 和组件分层方式，不要继续扩散遗留模式。
