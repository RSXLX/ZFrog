# 好友系统全面检查与修复报告

## 问题描述
用户发起好友请求后，显示"暂无好友请求"。

## 根本原因分析

### **主要问题**
前后端对于ID参数的理解不一致：
- **前端**: 修改后使用 `tokenId` (NFT ID)
- **后端 POST /api/friends/request**: 期望 `requesterId` 和 `addresseeId` 是**数据库ID**
- **后端 GET /api/friends/requests/:frogId**: 接收 `tokenId` 并转换为数据库ID

### **边界情况问题**
`requesterId = 0` 时，原代码使用 `if (!requesterId)` 会误判为false，导致验证失败。

## 修复方案

### 1. **修改后端 POST /api/friends/request 路由**

**修改内容**:
- 将 `requesterId` 和 `addresseeId` 参数从期望数据库ID改为期望 **tokenId**
- 在路由内部自动转换 tokenId 为数据库ID
- 修复边界情况：使用严格相等检查 `requesterId === undefined || requesterId === null`

**修改后的逻辑**:
```typescript
// 1. 接收 tokenId
const { requesterId, addresseeId, walletAddress } = req.body;

// 2. 严格验证（支持 tokenId = 0）
if (requesterId === undefined || requesterId === null) {
    return res.status(400).json({ error: 'Requester ID is required' });
}

// 3. 转换为数据库ID
const requesterFrog = await prisma.frog.findUnique({ 
    where: { tokenId: requesterId } 
});

// 4. walletAddress 也转换为数据库ID
if (walletAddress && !addresseeId) {
    targetAddresseeFrog = await prisma.frog.findFirst({
        where: {
            ownerAddress: {
                equals: walletAddress.toLowerCase(),
                mode: 'insensitive'
            }
        }
    });
} else if (addresseeId) {
    targetAddresseeFrog = await prisma.frog.findUnique({ 
        where: { tokenId: addresseeId } 
    });
}

// 5. 使用数据库ID创建关系
const friendship = await prisma.friendship.create({
    data: {
        requesterId: requesterFrog.id,
        addresseeId: targetAddresseeFrog.id,
        status: FriendshipStatus.Pending
    }
});
```

## 测试验证

### **完整流程测试结果**

✅ **测试1**: 获取 NO2 (tokenId=1) 的请求
- 状态: 200
- 收到 1 条请求（来自 No3）

✅ **测试2**: 获取 SXLX (tokenId=0) 的请求
- 状态: 200  
- 收到 1 条请求（来自 NO2）

✅ **测试3**: SXLX (tokenId=0) 向 No3 (tokenId=2) 发送请求
- 状态: 201
- ✅ 成功发送！

✅ **测试4**: 验证 No3 收到请求
- 状态: 200
- 收到 1 条请求（来自 SXLX）

### **边界情况验证**
✅ tokenId = 0 的情况现在可以正常工作
✅ walletAddress 方式发送请求正常
✅ 重复请求检测正常
✅ 自己给自己发请求的检测正常

## 当前数据库状态

**青蛙列表**:
- SXLX: tokenId=0, DB ID=1
- NO2: tokenId=1, DB ID=3  
- No3: tokenId=2, DB ID=4

**好友请求列表**:
1. NO2 (tokenId=1) → SXLX (tokenId=0) - Pending
2. No3 (tokenId=2) → NO2 (tokenId=1) - Pending
3. SXLX (tokenId=0) → No3 (tokenId=2) - Pending

## API 规范总结

### **统一规范：所有好友相关API的URL参数和请求体参数都使用 tokenId**

#### 发送好友请求
```typescript
POST /api/friends/request
Body: {
  requesterId: number,    // tokenId (NFT ID)
  addresseeId?: number,   // tokenId (NFT ID) 
  walletAddress?: string  // 或使用钱包地址
}
```

#### 获取好友请求列表
```typescript
GET /api/friends/requests/:frogId
Params: {
  frogId: number  // tokenId (NFT ID)
}
```

#### 获取好友列表
```typescript
GET /api/friends/list/:frogId
Params: {
  frogId: number  // tokenId (NFT ID)
}
```

#### 响应好友请求
```typescript
PUT /api/friends/request/:id/respond
Params: {
  id: number  // friendship 数据库ID
}
Body: {
  status: 'Accepted' | 'Declined'
}
```

## 关键要点

⚠️ **重要**: 
- **对外API**: 统一使用 `tokenId` (用户可见的NFT ID)
- **内部处理**: 自动转换为数据库ID进行查询和创建
- **边界情况**: 必须使用严格相等检查，支持 tokenId = 0

## 下一步建议

1. ✅ 前端已正确使用 tokenId
2. ✅ 后端已统一支持 tokenId
3. 建议添加更多集成测试
4. 建议在 WebSocket 通知中也确保使用正确的ID
