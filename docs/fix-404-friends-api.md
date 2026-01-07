# 404 错误修复总结

## 问题描述
- **错误**: 访问 `http://localhost:3001/api/friends/requests/3` 返回 404 错误
- **原因**: 前端在调用好友相关API时使用了**数据库ID (`frog.id`)** 而不是 **NFT tokenId (`frog.tokenId`)**

## 根本原因

后端路由设计要求使用 **NFT tokenId** 作为参数：

```typescript
// backend/src/api/routes/friends.routes.ts
router.get('/requests/:frogId', async (req, res) => {
  const tokenId = parseInt(req.params.frogId);  // 期望 tokenId
  const frog = await prisma.frog.findUnique({
    where: { tokenId }  // 使用 tokenId 查询
  });
});
```

但前端多处传递了数据库ID：
```tsx
<FriendRequests frogId={frog.id} />  // ❌ 错误：传递数据库ID
<FriendRequests frogId={frog.tokenId} />  // ✅ 正确：传递tokenId
```

## 修复的文件

### 1. **Pages**
- ✅ `frontend/src/pages/GardenPage.tsx`
  - 修改 `loadFriends()` 使用 `frog.tokenId`
  
- ✅ `frontend/src/pages/Friends.tsx` (7处修改)
  - `<FriendRequests frogId={frog.tokenId}>`
  - `<FriendsList frogId={frog.tokenId}>`
  - `<WorldOnlineList currentFrogId={frog.tokenId}>`
  - `<FriendInteractionModal currentFrogId={frog.tokenId}>`
  - `<AddFriend currentFrogId={frog.tokenId}>`
  - `<AddFriendByWallet currentFrogId={frog.tokenId}>`

### 2. **Components**
- ✅ `frontend/src/components/frog/FrogScene.tsx`
  - 移除 `frogDbId` 参数，统一使用 `frogId` (tokenId)
  - 修改 `loadFriends()` 使用 tokenId

- ✅ `frontend/src/components/frog/WorldOnlineList.tsx`
  - 修改 `filteredFrogs` 过滤逻辑使用 `frog.tokenId`
  - 修改 `setFrogs` 过滤使用 `frog.tokenId`
  - 修改 `sendFriendRequest` 参数和比较使用 `tokenId`
  - 修改 `friendIds` 映射使用 `friend.tokenId`
  - 修改好友判断使用 `frog.tokenId`

- ✅ `frontend/src/components/frog/AddFriend.tsx`
  - 修改过滤自己时使用 `frog.tokenId`
  - 修改好友列表映射使用 `friend.tokenId`
  - 修改过滤结果使用 `frog.tokenId`
  - 修改移除已发送请求使用 `frog.tokenId`
  - 修改发送请求按钮使用 `frog.tokenId`

- ✅ `frontend/src/components/frog/AddFriendByWallet.tsx`
  - 修改检查是否是自己使用 `frog.tokenId`
  - 修改好友列表映射使用 `friend.tokenId`
  - 修改好友判断使用 `frog.tokenId`

## 验证结果

✅ API 测试通过：
- `http://localhost:3001/api/friends/requests/0` - 返回待处理请求
- `http://localhost:3001/api/friends/requests/1` - 返回空数组 (无待处理请求)
- `http://localhost:3001/api/friends/list/0` - 返回正确的好友列表

## 数据库现状

当前数据库中的青蛙：
- tokenId = 0, 名称 "SXLX" (数据库 id = 1)
- tokenId = 1, 名称 "NO2" (数据库 id = 3)

注意: 没有 tokenId = 3 的青蛙，所以之前访问 `/api/friends/requests/3` 会返回 404。

## 重要提醒

前后端API通信时务必注意：
- ⚠️ **URL 参数**应使用 **tokenId** (NFT ID)
- ⚠️ **数据库查询**内部使用 **id** (数据库自增ID)
- ⚠️ API响应中返回完整对象，包含 `id` 和 `tokenId` 两个字段

这样设计的原因：
- **tokenId** 是链上NFT的唯一标识，用户可见
- **id** 是数据库内部主键，用于关联查询
- URL使用 tokenId 更符合用户认知 (如 `/frog/0`, `/frog/1`)
