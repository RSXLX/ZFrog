# BigInt序列化错误和重复旅行记录修复报告

## 问题1: BigInt序列化错误

### 错误信息
```
Do not know how to serialize a BigInt
at JSON.stringify (<anonymous>)
at Printf.template (logger.ts:17:24)
```

### 根本原因
Logger 在尝试序列化包含 BigInt 类型的对象时，`JSON.stringify()` 无法处理 BigInt，导致错误。

### 修复方案
在 `backend/src/utils/logger.ts` 中添加自定义序列化函数：

```typescript
const safeStringify = (obj: any): string => {
    return JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    );
};
```

#### 修改位置
- **文件**: `backend/src/utils/logger.ts`
- **行数**: 15-21
- **改动**: 使用 `safeStringify` 替代 `JSON.stringify`

## 问题2: 重复旅行记录

### 问题描述
数据库中存在4条完全相同的旅行记录：
- Travel ID: 2, 3, 4, 5
- 青蛙: SXLX (tokenId: 0)
- 开始时间: 2025-12-30T18:01:16.000Z
- 状态: 全部 Completed

### 根本原因

事件监听器的重复检查逻辑有缺陷：

**原逻辑**：
```typescript
const existingTravel = await prisma.travel.findFirst({
    where: {
        frogId: frog.id,
        startTime: new Date(Number(startTime) * 1000),
        status: 'Active',  // ❌ 问题在这里！
    },
});
```

**问题**：
1. 只检查`status: 'Active'` 的旅行
2. 当旅行完成后状态变为 `Completed`
3. 后端重启时重新扫描历史事件（从5000个区块前）
4. 再次扫描到同一个 `TravelStarted` 事件
5. 由于找不到 `status: 'Active'` 的记录，误认为没有重复
6. 创建新的旅行记录

**后端重启次数 = 重复记录数量**：
- 用户后端重启4次 → 创建了4条相同记录

### 修复方案

移除 `status` 过滤条件，检查**所有状态**的旅行记录：

```typescript
const existingTravel = await prisma.travel.findFirst({
    where: {
        frogId: frog.id,
        startTime: new Date(Number(startTime) * 1000),
        // ✅ 移除 status 过滤，检查所有状态
    },
});

if (existingTravel) {
    logger.info(`Travel already exists for frog ${tokenId} (ID: ${existingTravel.id}, status: ${existingTravel.status})`);
    return;  // 跳过创建
}
```

#### 修改位置
- **文件**: `backend/src/workers/eventListener.ts`
- **行数**: 295-307
- **改动**: 移除 `status: 'Active'` 条件

### 为什么会扫描5000个区块前的事件？

在 `eventListener.ts` 第52行：

```typescript
this.lastProcessedBlock = currentBlock - BigInt(5000); // 从 5000 个区块前开始
```

这是为了防止遗漏事件，但副作用是后端重启时会重复扫描已处理的事件。

## 清理重复记录

创建清理脚本删除重复的旅行记录：

```javascript
// delete-duplicate-travels.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteDuplicates() {
  const duplicates = await prisma.travel.findMany({
    where: {
      frogId: 1,
      startTime: new Date('2025-12-30T18:01:16.000Z'),
    },
    orderBy: { id: 'asc' }
  });
  
  // 保留第一条，删除其他
  const toDelete = duplicates.slice(1).map(t => t.id);
  
  if (toDelete.length > 0) {
    await prisma.travel.deleteMany({
      where: { id: { in: toDelete } }
    });
    console.log(`✅ 删除了 ${toDelete.length} 条重复记录 (IDs: ${toDelete.join(', ')})`);
  }
  
  await prisma.$disconnect();
}

deleteDuplicates();
```

运行：
```bash
node delete-duplicate-travels.js
```

## 验证修复

### 1. 检查日志不再报BigInt错误
```bash
# 重启后端
npm run dev

# 查看日志，确认没有 BigInt 序列化错误
```

### 2. 测试发起新旅行
```bash
# 发起旅行
# 重启后端多次
# 检查数据库是否还有重复记录

node check-duplicate-travels.js
```

预期结果：
```
✅ 没有发现重复记录
```

## 已修改的文件

1. ✅ `backend/src/utils/logger.ts`
   - 添加 `safeStringify` 处理 BigInt

2. ✅ `backend/src/workers/eventListener.ts`
   - 修改重复检查逻辑，移除 `status` 过滤

## 注意事项

⚠️ **需要重启后端**：
修改已完成，但需要重启后端服务才能生效：
```bash
# Ctrl+C 停止当前后端
npm run dev
```

⚠️ **数据库清理**：
修复不会自动删除已有的重复记录，需要手动运行清理脚本或使用数据库工具删除。

## 防止未来出现重复

✅ **修复后的保护机制**：
1. 事件处理前检查**所有状态**的旅行记录
2. 基于 (frogId + startTime) 的唯一性检查
3. 即使后端重启扫描历史事件，也不会创建重复记录

## 后续优化建议

### 1. 添加数据库唯一索引
在 Prisma schema 中添加：
```prisma
model Travel {
  @@unique([frogId, startTime])
}
```

这样数据库层面会拒绝重复记录。

### 2. 保存最后处理的区块号
将 `lastProcessedBlock` 保存到数据库或文件，重启时从该位置继续，而不是往前5000个区块。

### 3. 使用事件哈希去重
基于事件的 `transactionHash + logIndex` 创建唯一标识，完全避免重复处理。
