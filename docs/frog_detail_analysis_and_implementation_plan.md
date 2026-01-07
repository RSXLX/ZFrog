# 青蛙详情页 (FrogDetail) 分析与扩展开发文档

## 1. 核心逻辑校验：用户的青蛙 (One User One Frog)

### 1.1 现状核查
经过对前端 (`FrogDetail.tsx`, `useMyFrog.ts`) 和后端 (`frog.routes.ts`) 的深度代码审查，结论如下：

**符合“一个用户一个青蛙”的逻辑设计。**

*   **后端保障 (Backend Enforcement)**: 
    *   在 `GET /api/frogs/:tokenId` 接口中，系统会强制检查 `ownerAddress`。如果不一致（例如用户通过其他途径获得了第二个青蛙），系统会将旧的青蛙标记为 `active: false` 或将其 `ownerAddress` 修改为孤立状态 (`orphaned_...`)，从而确保数据库层面一个钱包地址在任意时刻只能关联一只有效的青蛙。
    *   `GET /api/frogs/my/:address` 接口专为单青蛙模式设计，直接返回该地址的唯一青蛙。
*   **前端适配 (Frontend Adaptation)**:
    *   `useMyFrog` Hook 专门用于获取当前用户的唯一青蛙。
    *   `FrogDetail` 页面虽然通过 URL 参数 `:id` 访问，但内部通过 `isOwner` (`frog.ownerAddress === userAddress`) 严格区分“我的青蛙”和“访问好友”两种视图模式。
    *   页面头部明确标识“我的小青蛙” (My Frog Badge)，并仅对所有者开放操作入口（刷新、家园、旅行等）。

### 1.2 改进建议
虽然逻辑已闭环，但用户体验上还有优化空间：
*   **建议**: 添加 `/my-frog` 路由，直接复用 `FrogDetail` 组件逻辑但无需传递 ID，自动解析当前用户青蛙。这样用户在导航栏点击“我的青蛙”时体验更流畅。

---

## 2. 现有功能详细分析 (Functional Analysis)

当前 `FrogDetail` 页面是一个聚合型的主控台，集成了展示、交互和状态管理功能。

### 2.1 模块拆解
| 模块 | 功能描述 | 关键组件/Hook |
| :--- | :--- | :--- |
| **头部信息区** | 展示青蛙形象(FrogScene)、名字、状态、所有者标识及核心操作按钮（刷新、家园、兑换、纪念品、好友）。 | `FrogScene` |
| **状态/交互区 (左侧)** | **如果是主人且在旅行**: 显示旅行状态、倒计时、跨链动态流。<br>**如果是主人且空闲**: 显示旅行模式选择器 (本地/跨链)，并发起旅行。<br>**如果是访客**: 显示欢迎卡片、关系状态、好友请求/互动入口。 | `TravelStatus`, `TravelPending`, `InteractionFeed`, `TravelForm`, `CrossChainTravelForm` |
| **历史记录区 (右侧)** | 展示过往的旅行日记、纪念品获取情况，以时间轴流形式呈现。 | `TravelJournal` |
| **实时同步** | 通过 WebSocket 监听旅行开始、进度和完成事件，自动刷新 UI 或触发庆祝动画。 | `useWebSocket`, `useTravelEvents` |

### 2.2 数据流向
1.  **初始化**: URL `id` -> API `getFrogDetail` -> State `frog` & `travels`.
2.  **旅行状态**: 检测 `frog.status === 'Traveling'` -> API `current-travel` -> State `activeTravel`.
3.  **乐观更新**: 用户发起旅行 -> `window` 事件通知 -> `pendingTravelRef` 标记 -> 立即更新 UI 为 "Processing/Traveling" -> 后台轮询等待链上确认。

---

## 3. 具体扩展开发文档 (Extension Development Guide)

基于现有架构，以下是针对三个高价值方向的**具体开发实施指南**。

### 扩展方向 A: 青蛙穿搭/装备系统 (Equipment & Skins)

**目标**: 允许用户给青蛙更换帽子、手持物、背景等，并反映在详情页和 NFT 属性中。

#### A.1 数据库设计 (Database Schema)
```prisma
// 在 schema.prisma 中新增
model Equipment {
  id          Int      @id @default(autoincrement())
  name        String
  type        String   // 'HAT', 'HAND', 'BACKGROUND'
  assetUrl    String
  frogId      Int?
  frog        Frog?    @relation(fields: [frogId], references: [id])
  isEquipped  Boolean  @default(false)
}
```

#### A.2 后端接口 (Backend API)
*   **GET /api/frogs/:id/equipment**: 获取拥有的装备列表。
*   **POST /api/frogs/:id/equip**: 装备/卸下物品。需验证所有权。

#### A.3 前端实现 (Frontend Implementation)
1.  **修改 `FrogScene.tsx`**:
    *   接收 `equippedItems` prop。
    *   使用绝对定位将装备图层叠加在基础青蛙 Image 之上。
    ```tsx
    // 伪代码
    <div className="relative frog-container">
      <img src={frogBase} className="z-10" />
      {equippedItems.hat && <img src={equippedItems.hat.url} className="absolute z-20 top-0" />}
      {equippedItems.hand && <img src={equippedItems.hand.url} className="absolute z-20 right-0" />}
    </div>
    ```
2.  **在 `FrogDetail.tsx` 添加“衣柜”入口**:
    *   在头部操作区添加“👕 衣柜”按钮。
    *   点击弹出 `EquipmentModal`，允许用户拖拽或点击更换装备。

---

### 扩展方向 B: 深度社交互动 - "串门与留言" (Social Visiting)

**目标**: 访客不仅能看，还能留下“脚印”或礼物，并在场景中实时显示访客青蛙。

#### B.1 后端扩展
*   **Schema 变更**: 新增 `Guestbook` 表，记录 `visitorId`, `hostId`, `message`, `giftId`。
*   **API**: `POST /api/frogs/:id/visit` (记录访问，增加双方亲密度)。

#### B.2 前端实现
1.  **升级 `FrogScene.tsx` 为多人模式**:
    *   目前 `FrogScene` 已预留 `showVisitor` 逻辑。
    *   **扩展**: 当用户不仅是查看，而是点击“拜访”时，不仅仅是弹窗，而是将当前用户的青蛙形象**渲染到宿主青蛙旁边**。
2.  **具体代码逻辑**:
    ```tsx
    // FrogDetail.tsx
    // 当 isOwner = false 时，自动获取当前登录用户的青蛙信息 (visitorFrog)
    <FrogScene 
        mainFrog={hostFrog}
        visitorFrog={visitorFrog} // 传入访客青蛙
        interactionMode="visiting" 
    />
    ```
3.  **互动反馈**:
    *   用户在访问页点击“打招呼”，屏幕出现动态表情包动画（气泡、爱心），并通过 WebSocket 推送给正在浏览详情页的主人（如果在线）。

---

### 扩展方向 C: 跨链旅行地图可视化 (Travel Visualization)

**目标**: 将右侧的文字版“旅行日记”升级为地图轨迹视图。

#### C.1 组件开发
开发 `TravelMap.tsx` 组件，使用 Canvas 或 SVG 绘制简单的多链地图（Ethereum, ZetaChain, BSC, Polygon）。

#### C.2 数据整合
在 `FrogDetail.tsx` 中：
```tsx
const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

// ... 渲染右侧区域
<div className="flex justify-between">
  <h3>旅行日记</h3>
  <Toggle value={viewMode} onChange={setViewMode} options={['列表', '地图']} />
</div>

{viewMode === 'map' ? (
  <TravelMap 
    travelHistory={travels} 
    currentLocation={activeTravel?.chainId} 
  />
) : (
  <TravelJournalList travels={travels} />
)}
```

---

## 4. 开发注意事项

1.  **状态同步**: 任何修改青蛙外观或属性的操作，务必在成功后调用 `fetchData()` 或更新本地 Context，确保头部 `FrogScene` 立即反映变化。
2.  **权限控制**: 前端 `isOwner` 仅作 UI 隐藏，后端必须再次校验 `req.user.address === frog.ownerAddress`。
3.  **加载优化**: 引入装备系统或地图后，图片资源会增多。务必对图片资源使用 CDN 并开启浏览器缓存，`FrogScene` 图片建议使用 WebP 格式。
