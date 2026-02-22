---
status: 已审核
version: 1.0
last_updated: 2026-02-04
reviewer: 用户
---

# ZetaFrog 2.0 GAP 修复技术设计

> 基于已审核的需求设计文档，规划各模块的技术实现方案。

---

## 一、可行性评估摘要

| 评估维度    | 结论                                        | 风险等级 |
| :---------- | :------------------------------------------ | :------- |
| 合约升级    | ✅ 可行 - UUPS 代理已部署 (`0x20A08bc1...`) | 🟡 中    |
| Schema 变更 | ✅ 可行 - Prisma migration 可增量添加字段   | 🟢 低    |
| 后端重构    | ✅ 可行 - 服务层模块化程度高                | 🟢 低    |
| 测试覆盖    | ⚠️ 无现有后端测试 - 需主要依赖手动验证      | 🔴 高    |

**工作量预估**: 4 周 (1 周/模块)

---

## 二、业务流程图 (ASCII)

### 2.1 跨链纪念品铸造流程 (修复后)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    跨链旅行完成后                                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  OmniTravel.markTravelCompleted(tokenId, xp, souvenirMetadata)     │
│  [合约内新增逻辑]                                                    │
└─────────────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┴──────────────────┐
           ▼                                      ▼
┌─────────────────────────┐         ┌─────────────────────────────────┐
│ SouvenirNFT.mintSouvenir│         │ 更新 crossChainTravels 状态     │
│ (owner, tokenId, uri)   │         │ status = Completed              │
└─────────────────────────┘         └─────────────────────────────────┘
           │                                      │
           ▼                                      ▼
┌─────────────────────────┐         ┌─────────────────────────────────┐
│ 发出 SouvenirMinted     │         │ 释放锁定的 NFT                   │
│ 事件                     │         │ 退还剩余 provisions              │
└─────────────────────────┘         └─────────────────────────────────┘
```

### 2.2 冬眠检测与唤醒流程

```
┌────────────────────┐    每小时    ┌────────────────────────────────┐
│  status-cron.job   │ ──────────▶  │ SELECT * FROM Frog             │
│  (定时任务)         │              │ WHERE lastInteractedAt < 72h   │
└────────────────────┘              └────────────────────────────────┘
                                                  │
         ┌────────────────────────────────────────┴───────────────┐
         │ 72h < elapsed < 96h                    elapsed >= 96h  │
         ▼                                                         ▼
┌─────────────────────┐                           ┌─────────────────────┐
│ hibernationStatus   │                           │ hibernationStatus   │
│ = DROWSY            │                           │ = SLEEPING          │
│ (发送警告通知)       │                           │ (禁用所有操作)       │
└─────────────────────┘                           └─────────────────────┘
                                                           │
                                        用户调用 reviveFrog(frogId)
                                                           ▼
                                    ┌─────────────────────────────────────┐
                                    │ cost = BASE * ln(sleepDays)        │
                                    │ discount = blessings.count * 0.15  │
                                    │ finalCost = cost * (1 - discount)  │
                                    └─────────────────────────────────────┘
                                                           │
                                                           ▼
                                    ┌─────────────────────────────────────┐
                                    │ 扣除 $LILY, 设置 status = ACTIVE   │
                                    │ 重置 lastInteractedAt              │
                                    └─────────────────────────────────────┘
```

---

## 三、技术方案详细设计

### Phase 1 (D): 基础设施修复

#### D1: 合约修改 - 跨链纪念品上链

**文件**: `contracts/upgradeable/OmniTravelUpgradeable.sol`

**修改点**:

1. 添加 `ISouvenirNFT` 接口声明
2. 添加 `souvenirNFT` 状态变量
3. 在 `markTravelCompleted` 函数中调用 `souvenirNFT.mintSouvenir()`

```solidity
// 新增接口
interface ISouvenirNFT {
    function mintSouvenir(address to, uint256 frogTokenId, string memory uri) external returns (uint256);
}

// 新增状态变量
ISouvenirNFT public souvenirNFT;

// 修改 markTravelCompleted 函数
function markTravelCompleted(
    uint256 tokenId,
    uint256 xpReward,
    string calldata souvenirUri
) external onlyTravelManager {
    // ... 现有逻辑 ...

    // 新增: 铸造纪念品
    if (bytes(souvenirUri).length > 0) {
        souvenirNFT.mintSouvenir(travel.owner, tokenId, souvenirUri);
    }
}
```

#### D2: 后端调用修改

**文件**: `backend/src/services/omni-travel.service.ts`

**修改点**: 在 `completeCrossChainTravel` 中传递 `souvenirUri` 到合约调用

#### D3: 统一配置

**文件**: `backend/src/services/omni-travel.service.ts`

**修改点**: 删除 L30-50 的硬编码 Fallback 地址，强制使用 `config.OMNI_TRAVEL_ADDRESS`

---

### Phase 2 (A): 冬眠系统

#### A1: Schema 扩展

**文件**: `backend/prisma/schema.prisma`

```prisma
enum HibernationStatus {
  ACTIVE
  DROWSY      // 72-96h 未交互
  SLEEPING    // >96h 未交互
}

model Frog {
  // 新增字段
  hibernationStatus   HibernationStatus @default(ACTIVE)
  hibernatedAt        DateTime?         // 进入 SLEEPING 的时间
  blessingsReceived   Int               @default(0)  // 祈福次数
}
```

#### A2: 冬眠检测服务

**新建文件**: `backend/src/services/hibernation.service.ts`

**核心函数**:

- `checkHibernationStatus(frogId)`: 根据 `lastInteractedAt` 判断状态
- `calculateRevivalCost(level, hibernatedAt)`: 公式 `cost = 100 * level * ln(days + 1)`
- `reviveFrog(frogId, payerAddress)`: 扣费并重置状态
- `blessFrog(blesserFrogId, targetFrogId)`: 消耗祈福者活力，增加 blessingsReceived

#### A3: 定时任务修改

**文件**: `backend/src/services/status-cron.job.ts`

**新增**: 每小时调用 `hibernationService.batchCheckHibernation()`

---

### Phase 3 (C): 基因博弈

#### C1: 基因数据结构

**Frog.genes** JSON 结构定义:

```typescript
interface FrogGenes {
  skin: { dominant: string; recessive: string }; // e.g. { dom: 'green', rec: 'gold' }
  eyes: { dominant: string; recessive: string };
  pattern: { dominant: string; recessive: string };
}
```

#### C2: 孟德尔遗传算法

**修改文件**: `backend/src/services/breed.service.ts`

**新增函数**: `mendelianInheritance(parent1Genes, parent2Genes)`

```typescript
function mendelianInheritance(p1: FrogGenes, p2: FrogGenes): FrogGenes {
  const inheritLocus = (p1Locus, p2Locus) => {
    // 从每个父母随机选一个等位基因
    const fromP1 = Math.random() < 0.5 ? p1Locus.dominant : p1Locus.recessive;
    const fromP2 = Math.random() < 0.5 ? p2Locus.dominant : p2Locus.recessive;

    // 显性判定 (简化: 非 'gold'/'rainbow' 为显性)
    const recessiveTraits = ["gold", "rainbow", "albino"];
    const isDominant = (trait) => !recessiveTraits.includes(trait);

    if (isDominant(fromP1) && isDominant(fromP2)) {
      return { dominant: fromP1, recessive: fromP2 };
    } else if (isDominant(fromP1)) {
      return { dominant: fromP1, recessive: fromP2 };
    } else if (isDominant(fromP2)) {
      return { dominant: fromP2, recessive: fromP1 };
    } else {
      // 双隐性 -> 25% 隐性表现
      return { dominant: fromP1, recessive: fromP2 };
    }
  };

  return {
    skin: inheritLocus(p1.skin, p2.skin),
    eyes: inheritLocus(p1.eyes, p2.eyes),
    pattern: inheritLocus(p1.pattern, p2.pattern),
  };
}
```

---

### Phase 4 (B): 家族 DAO

#### B1: Schema 扩展

**文件**: `backend/prisma/schema.prisma`

```prisma
model Family {
  id            Int       @id @default(autoincrement())
  name          String    @unique
  leaderId      Int       // 族长 Frog ID
  leader        Frog      @relation("FamilyLeader", fields: [leaderId], references: [id])
  members       Frog[]    @relation("FamilyMembers")
  totemLevel    Int       @default(1)
  totemProgress Int       @default(0)  // 当前等级进度
  weeklyMileage Int       @default(0)  // 本周累计里程
  createdAt     DateTime  @default(now())
}

model Frog {
  // 新增关联
  familyId      Int?
  family        Family?   @relation("FamilyMembers", fields: [familyId], references: [id])
  ledFamilies   Family[]  @relation("FamilyLeader")
}
```

#### B2: 家族服务

**新建文件**: `backend/src/services/family.service.ts`

**核心函数**:

- `createFamily(leaderFrogId, name, cost)`: 创建家族
- `joinFamily(frogId, familyId)`: 加入家族
- `waterTotem(frogId)`: 每日浇水 (消耗 10 活力，增加 totemProgress)
- `checkWeeklyMission(familyId)`: 检查周常任务完成度

---

## 四、验证计划

### 4.1 自动化测试

**现状**: 后端无现有测试套件。

**建议**: 为关键逻辑新增单元测试:

| 模块 | 测试文件                      | 测试内容                          |
| :--- | :---------------------------- | :-------------------------------- |
| A    | `hibernation.service.test.ts` | 冬眠状态转换、费用计算公式        |
| C    | `breed.service.test.ts`       | 孟德尔遗传概率分布 (抽样 1000 次) |

**运行命令** (需新建 Jest 配置):

```bash
cd backend
npm run test
```

### 4.2 手动验证步骤

#### D1-D2: 跨链纪念品上链

1. **合约升级验证**

   ```bash
   cd contracts
   npx hardhat run scripts/upgrade-omnitravel.js --network zetaAthens
   ```

   - 预期: 控制台输出 "Upgrade Complete!"

2. **功能验证**
   - 调用 `startCrossChainTravel` 发起跨链旅行
   - 等待旅行完成后，检查 ZetaScan 上是否有 `SouvenirMinted` 事件
   - 检查目标地址是否收到 SouvenirNFT

#### A1-A3: 冬眠系统

1. **强制触发冬眠** (测试用)
   - 手动将某只青蛙的 `lastInteractedAt` 设为 120h 前
   - 运行 `status-cron.job.ts` 或等待定时任务
   - 检查该青蛙 `hibernationStatus` 是否变为 `SLEEPING`

2. **唤醒验证**
   - 调用 `/api/frog/:id/revive` 接口
   - 检查 $LILY 是否正确扣除
   - 检查青蛙状态是否恢复为 `ACTIVE`

#### C1-C2: 基因系统

1. **繁殖测试**
   - 创建两只 `rec: gold` 的测试青蛙
   - 执行繁殖 10 次
   - 统计子代中金色皮肤 (双隐性表现) 的比例
   - 预期: 约 25% (2-3 只)

#### B1-B2: 家族系统

1. **创建家族**
   - 调用 `/api/family/create` 接口
   - 检查 Family 记录是否创建成功

2. **浇水测试**
   - 调用 `/api/family/water` 接口
   - 检查 `totemProgress` 是否增加，活力是否减少

---

## 五、多角色讨论记录

### 🏗️ 架构师

> 合约升级方案合理。建议在 `markTravelCompleted` 中使用 try-catch 包裹 Mint 调用，避免 Mint 失败导致整个旅行完成回滚。

### 🔐 安全工程师

> `reviveFrog` 需检查调用者是否为青蛙主人。$LILY 扣费应使用 `safeTransferFrom` 模式。

### 🧪 测试工程师

> 建议在 Phase 1 完成后添加 Jest 测试框架，为后续模块提供测试基础。

### 💾 DBA

> Schema 变更使用 `prisma migrate dev` 即可增量更新。建议在 `hibernatedAt` 上添加索引以优化批量查询。

---

## 六、变更记录

| 日期       | 版本 | 内容         |
| ---------- | ---- | ------------ |
| 2026-02-04 | 1.0  | 初始技术设计 |
