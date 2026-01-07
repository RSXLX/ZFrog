# 旅行系统事件监听修复报告

## 问题描述

用户反馈：**交互成功后没有出发，没有生成旅行日记**

合约交易成功上链，但后端没有检测到旅行开始事件，导致：
- 后端未创建旅行记录
- 青蛙状态未更新为 Traveling
- 旅行处理器未启动
- 无法生成旅行日记

## 根本原因

**后端事件监听器监听了错误的合约地址！**

### 问题详情

在 `backend/src/workers/eventListener.ts` 中：

```typescript
// ❌ 错误：监听 NFT 合约的 TravelStarted 事件
const travelLogs = await this.publicClient.getLogs({
    address: config.ZETAFROG_NFT_ADDRESS,  // 错误的地址！
    event: parseAbiItem('event TravelStarted(...)'),
    ...
});
```

**但实际上**：
- `TravelStarted` 事件由 **`Travel` 合约** 触发 (`0xa2B8...9eB0`)
- **不是** `ZetaFrogNFT` 合约 (`0x21C6...fA1f`)

### 合约架构

```
ZetaFrogNFT 合约
├── 触发事件: FrogMinted, LevelUp
└── 管理: NFT 铸造、属性、等级

Travel 合约 ← 旅行事件在这里！
├── 触发事件: TravelStarted, TravelCompleted, TravelCancelled
└── 管理: 旅行发起、完成、取消
```

## 修复方案

### 1. 添加 Travel 合约地址配置

**文件**: `backend/src/config/index.ts`

```typescript
export const config = {
  ...
  // Contracts
  ZETAFROG_NFT_ADDRESS: process.env.ZETAFROG_NFT_ADDRESS || '...',
  SOUVENIR_NFT_ADDRESS: process.env.SOUVENIR_NFT_ADDRESS || '...',
  TRAVEL_CONTRACT_ADDRESS: process.env.TRAVEL_CONTRACT_ADDRESS || '0xa2B8FE6dF99C86eE577fD69E27DC8AdA7e619eB0', // 新增
  ...
}
```

### 2. 修复事件监听器

**文件**: `backend/src/workers/eventListener.ts`

#### 修改历史事件扫描

```typescript
// ✅ 正确：监听 Travel 合约的事件
const travelLogs = await this.publicClient.getLogs({
    address: config.TRAVEL_CONTRACT_ADDRESS,  // 修改为 Travel 合约地址
    event: parseAbiItem('event TravelStarted(uint256 indexed tokenId, address indexed targetWallet, uint256 targetChainId, uint64 startTime, uint64 endTime, bool isRandom)'),
    ...
});
```

同样修复：
- `TravelCompleted` 事件监听
- `TravelCancelled` 事件监听

#### 修改实时事件监听

```typescript
// ✅ 正确：监听 Travel 合约
this.publicClient.watchEvent({
    address: config.TRAVEL_CONTRACT_ADDRESS,
    event: parseAbiItem('event TravelStarted(...)'),
    ...
});
```

### 3. 更新事件处理逻辑

**修改前**：
```typescript
const { tokenId, targetWallet, targetChainId, startTime, endTime } = log.args;
const isRandom = (targetWallet as string).toLowerCase() === '0x00...00';
```

**修改后**：
```typescript
// 直接从事件中获取 isRandom 字段
const { tokenId, targetWallet, targetChainId, startTime, endTime, isRandom } = log.args;
```

## 事件签名对比

### Travel 合约的正确事件签名

```solidity
event TravelStarted(
    uint256 indexed tokenId,
    address indexed targetWallet,
    uint256 targetChainId,
    uint64 startTime,
    uint64 endTime,
    bool isRandom  // ← 新增字段
);

event TravelCompleted(
    uint256 indexed tokenId,
    string journalHash,
    uint256 souvenirId,
    uint256 timestamp,
    uint256 xpReward  // ← 新增字段
);

event TravelCancelled(
    uint256 indexed tokenId,
    uint256 timestamp
);
```

## 修改的文件列表

1. ✅ `backend/src/config/index.ts`
   - 添加 `TRAVEL_CONTRACT_ADDRESS` 配置

2. ✅ `backend/src/workers/eventListener.ts`
   - 第101-106行：修改 TravelStarted 历史扫描地址
   - 第116-122行：修改 TravelCompleted 历史扫描地址
   - 第140-146行：修改 TravelCancelled 历史扫描地址
   - 第183-192行：修改 TravelStarted 实时监听地址
   - 第194-203行：修改 TravelCompleted 实时监听地址
   - 第205-214行：修改 TravelCancelled 实时监听地址
   - 第277-280行：更新 handleTravelStarted 参数解析
   - 第317-330行：使用事件中的 isRandom 值

## 环境变量

确保 `backend/.env` 包含：
```env
TRAVEL_CONTRACT_ADDRESS=0xa2B8FE6dF99C86eE577fD69E27DC8AdA7e619eB0
```

## 验证步骤

修复完成后，需要验证：

1. ✅ **重启后端服务**
   ```bash
   # 后端会重新编译 TypeScript
   npm run dev
   ```

2. ✅ **检查日志**
   - 监听器启动日志应显示正确的合约地址
   - 应该能看到 "Watching for new events..."

3. ✅ **发起新的旅行**
   - 前端发起旅行
   - 等待交易上链
   - 检查后端日志是否输出：
     ```
     TravelStarted: tokenId=X, target=0x..., chainId=7001, isRandom=...
     Travel started for frog X to chain 7001
     ```

4. ✅ **数据库验证**
   ```sql
   -- 检查是否创建了旅行记录
   SELECT * FROM "Travel" ORDER BY "startTime" DESC LIMIT 5;
   
   -- 检查青蛙状态
   SELECT tokenId, name, status FROM "Frog";
   ```

## 下一步

1. ✅ 修复完成，后端现在会正确监听 Travel 合约事件
2. 🔄 需要重启后端服务以应用更改
3. 🧪 重新测试发起旅行功能
4. 📊 旅行处理器会自动启动，在旅行结束时生成日记

## 重要提醒

⚠️ **合约事件来源**：
- `FrogMinted`, `LevelUp` → **ZetaFrogNFT 合约**
- `TravelStarted`, `TravelCompleted`, `TravelCancelled` → **Travel 合约**
- `SouvenirMinted` → **SouvenirNFT 合约**

监听事件时必须使用正确的合约地址！
