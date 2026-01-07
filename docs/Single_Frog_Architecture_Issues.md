# ZetaFrog 青蛙归属架构问题分析与解决方案

> 生成时间: 2026-01-07
> 
> 背景: 系统从"一个用户可以拥有多个青蛙"改为"一个用户只能拥有一个青蛙"架构

## 目录

1. [问题总览](#问题总览)
2. [详细问题分析](#详细问题分析)
3. [解决方案汇总](#解决方案汇总)

---

## 问题总览

| # | 问题类别 | 问题描述 | 严重程度 | 影响范围 |
|---|----------|----------|----------|----------|
| 1 | 前端API调用 | `Home.tsx` 使用已废弃的 `getFrogsByOwner` API | 🟡 中 | 首页加载 |
| 2 | 前端UI误导 | `Home.tsx` 显示"铸造更多青蛙"按钮 | 🟡 中 | 用户体验 |
| 3 | 前端API调用 | `FrogDetail.tsx` 使用 `getFrogsByOwner` 获取用户青蛙列表 | 🟡 中 | 青蛙详情页 |
| 4 | 后端API冗余 | `/api/frogs/owner/:address` 返回数组而非单个青蛙 | 🟢 低 | API一致性 |
| 5 | 权限判断逻辑 | `FrogDetail.tsx` 的 `isOwner` 判断依赖地址比较 | 🟡 中 | 所有者显示 |
| 6 | 数据一致性 | 数据库可能存在一个地址关联多个青蛙的历史数据 | 🔴 高 | 数据完整性 |
| 7 | 前端状态残留 | 页面切换时可能显示旧数据 | 🟡 中 | 用户体验 |
| 8 | ID类型混用 | 部分API使用 `tokenId`，部分使用数据库 `id` | 🟡 中 | API调用 |

---

## 详细问题分析

### 问题 1: `Home.tsx` 使用已废弃的 `getFrogsByOwner` API

**位置**: `frontend/src/pages/Home.tsx` 第 32-38 行

```typescript
apiService.getFrogsByOwner(address)
  .then(frogs => {
    setHasFrogs(frogs.length > 0);
    if (frogs.length > 0 && !currentFrog) {
      setCurrentFrog(frogs[0]);
    }
  })
```

**问题分析**:
- `getFrogsByOwner` 是多青蛙架构遗留的 API
- 在 `api.ts` 中已标记为 `@deprecated`
- 应使用 `getMyFrog` 替代

**解决方案**:
```typescript
apiService.getMyFrog(address)
  .then(frog => {
    setHasFrogs(!!frog);
    if (frog && !currentFrog) {
      setCurrentFrog(frog);
    }
  })
```

---

### 问题 2: `Home.tsx` 显示"铸造更多青蛙"按钮

**位置**: `frontend/src/pages/Home.tsx` 第 208-213 行

```tsx
<button
  onClick={() => setShowMint(true)}
  className="..."
>
  ➕ 铸造更多青蛙
</button>
```

**问题分析**:
- 单青蛙架构下，每个钱包只能拥有一只青蛙
- 显示"铸造更多青蛙"会误导用户

**解决方案**:
- 删除此按钮
- 或改为"查看青蛙"按钮，跳转到 `/my-frog`

---

### 问题 3: `FrogDetail.tsx` 使用 `getFrogsByOwner`

**位置**: `frontend/src/pages/FrogDetail.tsx` 第 186-189 行

```typescript
if (address && frogData?.ownerAddress.toLowerCase() !== address.toLowerCase()) {
    const myFrogs = await apiService.getFrogsByOwner(address);
    setUserFrogs(myFrogs);
}
```

**问题分析**:
- 当用户查看他人青蛙时，获取自己的青蛙列表用于"加好友"功能
- 使用了已废弃的多青蛙 API

**解决方案**:
```typescript
if (address && frogData?.ownerAddress.toLowerCase() !== address.toLowerCase()) {
    const myFrog = await apiService.getMyFrog(address);
    setUserFrogs(myFrog ? [myFrog] : []);
}
```

---

### 问题 4: 后端 `/api/frogs/owner/:address` 返回数组

**位置**: `backend/src/api/routes/frog.routes.ts` 第 240-368 行

**问题分析**:
- 此 API 设计用于多青蛙架构
- 返回数组格式，但现在每个地址最多只有一个青蛙
- `/api/frogs/my/:address` 是正确的单青蛙 API

**解决方案**:
- 保留 `/api/frogs/owner/:address` 以向后兼容，但标记为废弃
- 前端统一使用 `/api/frogs/my/:address`
- 可在 API 文档中添加废弃说明

---

### 问题 5: `FrogDetail.tsx` 的 `isOwner` 判断

**位置**: `frontend/src/pages/FrogDetail.tsx` 第 74 行

```typescript
const isOwner = frog && address && frog.ownerAddress.toLowerCase() === address.toLowerCase();
```

**问题分析**:
- 判断逻辑本身正确
- 问题在于 `frog.ownerAddress` 可能因数据不同步导致判断错误
- 用户可能看不到自己的青蛙（即 `isOwner` 为 `false`）

**可能原因**:
1. 数据库中的 `ownerAddress` 未及时更新
2. 链上转移青蛙后，数据库未同步
3. 大小写不一致（虽然已使用 `toLowerCase()`）

**解决方案**:
```typescript
// 在获取青蛙数据后，添加调试日志
useEffect(() => {
  if (frog && address) {
    console.log('[FrogDetail] Owner check:', {
      frogOwner: frog.ownerAddress.toLowerCase(),
      walletAddress: address.toLowerCase(),
      isOwner: frog.ownerAddress.toLowerCase() === address.toLowerCase()
    });
  }
}, [frog, address]);

// 如果 isOwner 始终为 false，可能需要触发同步
if (!isOwner && frog && address) {
  // 检查是否应该是所有者但数据未同步
  apiService.syncFrog(frog.tokenId);
}
```

---

### 问题 6: 数据库可能存在一地址多青蛙的历史数据

**位置**: `backend/src/api/routes/frog.routes.ts` 第 436-447 行

```typescript
// 检查该 owner 是否已有其他蛙（单钱包单蛙规则）
const existingByOwner = await prisma.frog.findUnique({
    where: { ownerAddress: ownerLower },
});

if (existingByOwner && existingByOwner.tokenId !== tokenId) {
    // 该 owner 已有别的蛙，将旧蛙标记为孤立
    await prisma.frog.update({
        where: { id: existingByOwner.id },
        data: { ownerAddress: `orphaned_${existingByOwner.tokenId}_${Date.now()}` },
    });
}
```

**问题分析**:
- 后端已有处理逻辑，但仅在链上同步时触发
- 历史数据可能未被清理

**解决方案**:
1. 编写数据库迁移脚本，清理历史数据
2. 确保 `ownerAddress` 字段有唯一约束（已在 Prisma schema 中设置）

```typescript
// 数据清理脚本示例
async function cleanupDuplicateFrogs() {
  const duplicates = await prisma.$queryRaw`
    SELECT "ownerAddress", COUNT(*) as count 
    FROM "Frog" 
    WHERE "ownerAddress" NOT LIKE 'orphaned_%'
    GROUP BY "ownerAddress" 
    HAVING COUNT(*) > 1
  `;
  
  for (const dup of duplicates) {
    const frogs = await prisma.frog.findMany({
      where: { ownerAddress: dup.ownerAddress },
      orderBy: { tokenId: 'desc' } // 保留最新的
    });
    
    // 除了第一个（最新），其余标记为孤立
    for (let i = 1; i < frogs.length; i++) {
      await prisma.frog.update({
        where: { id: frogs[i].id },
        data: { ownerAddress: `orphaned_${frogs[i].tokenId}_${Date.now()}` }
      });
    }
  }
}
```

---

### 问题 7: 页面切换时可能显示旧数据

**位置**: `frontend/src/hooks/useMyFrog.ts` 第 27-29 行

```typescript
// 清除旧数据，防止状态残留
setFrog(null);
setHasFrog(false);
```

**问题分析**:
- Hook 已有清理逻辑，但可能在某些情况下失效
- `FrogDetail.tsx` 在 `useParams` 变化时需要完全重置状态

**解决方案**:
`FrogDetail.tsx` 已在第 198-201 行有相关逻辑：
```typescript
useEffect(() => {
    fetchData();
}, [tokenId, address]);
```

但需确保 `fetchData` 开始时清除旧状态：
```typescript
const fetchData = async () => {
    if (isFetching) return;
    
    try {
        setIsFetching(true);
        setIsLoading(true);
        // 添加: 清除旧青蛙数据
        setFrog(null);
        setActiveTravel(null);
        setTravels([]);
        
        // ... 其余逻辑
    }
}
```

---

### 问题 8: ID 类型混用 (tokenId vs 数据库 id)

**位置**: 多处

**问题分析**:
| API | 参数/字段 | 使用的 ID 类型 |
|-----|----------|---------------|
| `/api/frogs/:tokenId` | 路径参数 | tokenId (NFT ID) |
| `/api/friends/list/:frogId` | 路径参数 | tokenId |
| `/api/garden/:frogId` | 路径参数 | tokenId |
| `friendInteraction.actorId` | 数据库字段 | 数据库 id |
| `FriendInteractionModal` 的 `currentFrogId` | Props | **混用** |

**解决方案**:
1. 统一 API 路径参数命名规范：使用 `:tokenId` 表示 NFT ID
2. 前端组件 Props 明确使用 `frogTokenId` 或 `frogDbId`
3. 在 API 层添加转换逻辑：
```typescript
// 示例：friends.routes.ts
router.get('/list/:frogId', async (req, res) => {
  const tokenId = parseInt(req.params.frogId);
  
  // 先根据 tokenId 查找青蛙
  const frog = await prisma.frog.findUnique({
    where: { tokenId }
  });
  
  if (!frog) {
    return res.status(404).json({ error: 'Frog not found' });
  }
  
  // 使用数据库 id 进行后续查询
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { requesterId: frog.id },
        { addresseeId: frog.id }
      ]
    }
  });
  // ...
});
```

---

## 解决方案汇总

### 立即修复 (高优先级)

| # | 文件 | 修改内容 |
|---|------|----------|
| 1 | `frontend/src/pages/Home.tsx` | 将 `getFrogsByOwner` 改为 `getMyFrog` |
| 2 | `frontend/src/pages/Home.tsx` | 删除"铸造更多青蛙"按钮 |
| 3 | `frontend/src/pages/FrogDetail.tsx` | 将 `getFrogsByOwner` 改为 `getMyFrog` |

### 代码改进 (中优先级)

| # | 文件 | 修改内容 |
|---|------|----------|
| 4 | `frontend/src/pages/FrogDetail.tsx` | 在 `fetchData` 开始时清除旧状态 |
| 5 | `frontend/src/pages/FrogDetail.tsx` | 添加所有者判断调试日志 |
| 6 | `frontend/src/services/api.ts` | 删除 `getFrogsByOwner` 或强化废弃警告 |

### 数据清理 (低优先级)

| # | 操作 | 描述 |
|---|------|------|
| 7 | 数据库迁移 | 运行清理脚本，处理一地址多青蛙的历史数据 |
| 8 | API 文档 | 更新 `/api/frogs/owner/:address` 的废弃说明 |

---

## 附录：受影响的文件清单

### 前端文件
- `frontend/src/pages/Home.tsx`
- `frontend/src/pages/FrogDetail.tsx`
- `frontend/src/pages/MyFrog.tsx`
- `frontend/src/services/api.ts`
- `frontend/src/hooks/useMyFrog.ts`

### 后端文件
- `backend/src/api/routes/frog.routes.ts`
- `backend/src/api/routes/friends.routes.ts`
- `backend/src/api/routes/garden.routes.ts`
