---
status: 已确认
version: 1.0
last_updated: 2026-02-04
reviewer: 用户
---

# ZetaFrog 2.0 GAP 修复开发任务

> 基于已审核的技术设计，拆解为 TDD 风格的可执行任务。

---

## 执行顺序

```
Phase 1 (D) → Phase 2 (A) → Phase 3 (C) → Phase 4 (B)
  基建修复       冬眠系统       基因博弈       家族 DAO
```

---

## Phase 1 (D): 基础设施修复

### Task D1: 合约升级 - 添加纪念品铸造接口

**Files:**

- Modify: `contracts/upgradeable/OmniTravelUpgradeable.sol`
- Test: 手动验证 (无自动化测试)

**Step 1: 添加 ISouvenirNFT 接口**
在合约顶部添加:

```solidity
interface ISouvenirNFT {
    function mintSouvenir(address to, uint256 frogTokenId, string memory uri) external returns (uint256);
}
```

**Step 2: 添加状态变量**
在状态变量区域添加:

```solidity
ISouvenirNFT public souvenirNFT;
```

**Step 3: 添加设置函数**

```solidity
function setSouvenirNFT(address _souvenirNFT) external onlyOwner {
    souvenirNFT = ISouvenirNFT(_souvenirNFT);
}
```

**Step 4: 修改 markTravelCompleted 函数**
找到 `markTravelCompleted` 函数，在现有逻辑后添加:

```solidity
// Mint souvenir NFT
if (address(souvenirNFT) != address(0) && bytes(souvenirUri).length > 0) {
    try souvenirNFT.mintSouvenir(travel.owner, tokenId, souvenirUri) {
        // Success
    } catch {
        // Log but don't revert
        emit SouvenirMintFailed(tokenId, travel.owner);
    }
}
```

**Step 5: 添加事件**

```solidity
event SouvenirMintFailed(uint256 indexed tokenId, address owner);
```

**Step 6: 编译验证**

```bash
cd contracts
npx hardhat compile
```

预期: 编译成功，无错误

**Step 7: 升级合约**

```bash
npx hardhat run scripts/upgrade-omnitravel.js --network zetaAthens
```

预期: 输出 "Upgrade Complete!"

**Step 8: 配置 SouvenirNFT 地址**

```bash
npx hardhat console --network zetaAthens
# > const omni = await ethers.getContractAt("OmniTravelUpgradeable", "0x20A08bc1deFC1be2273636Af3ba3ef8cA6EaD2C8")
# > await omni.setSouvenirNFT("0xCE871f9F009f7Fa49f23f0EEE09977FfB7b4DbF5")
```

---

### Task D2: 后端调用修改

**Files:**

- Modify: `backend/src/services/omni-travel.service.ts:L500-550`

**Step 1: 找到 completeCrossChainTravel 函数**
确认函数位置和现有逻辑

**Step 2: 确保 souvenirUri 传递到合约调用**
修改合约调用，添加 souvenirUri 参数

**Step 3: 运行后端验证编译**

```bash
cd backend
npx tsc --noEmit
```

预期: 无 TypeScript 错误

---

### Task D3: 统一地址配置

**Files:**

- Modify: `backend/src/services/omni-travel.service.ts:L30-50`

**Step 1: 删除硬编码 Fallback**
查找并删除类似以下代码:

```typescript
// 删除这些硬编码
const OMNI_TRAVEL_ADDRESS = process.env.OMNI_TRAVEL_ADDRESS || "0x...";
```

**Step 2: 统一使用 config 导入**

```typescript
import { config } from "../config";
// 使用 config.OMNI_TRAVEL_ADDRESS
```

**Step 3: 编译验证**

```bash
cd backend
npx tsc --noEmit
```

---

## Phase 2 (A): 冬眠系统

### Task A1: Frog Schema 扩展

**Files:**

- Modify: `backend/prisma/schema.prisma`
- Test: Prisma migration

**Step 1: 添加 HibernationStatus 枚举**
在 enums 区域添加:

```prisma
enum HibernationStatus {
  ACTIVE
  DROWSY
  SLEEPING
}
```

**Step 2: 添加 Frog 字段**
在 Frog model 中添加:

```prisma
hibernationStatus   HibernationStatus @default(ACTIVE)
hibernatedAt        DateTime?
blessingsReceived   Int               @default(0)
```

**Step 3: 生成迁移**

```bash
cd backend
npx prisma migrate dev --name add_hibernation_fields
```

预期: Migration 创建成功

**Step 4: 生成 Prisma Client**

```bash
npx prisma generate
```

---

### Task A2: 冬眠服务实现

**Files:**

- Create: `backend/src/services/hibernation.service.ts`
- Test: 手动验证

**Step 1: 创建服务文件**
创建 `hibernation.service.ts`，包含:

- `checkHibernationStatus(frogId)`: 检查并更新状态
- `calculateRevivalCost(level, hibernatedAt)`: 计算费用
- `reviveFrog(frogId)`: 执行唤醒
- `blessFrog(blesserFrogId, targetFrogId)`: 祈福

**Step 2: 实现 checkHibernationStatus**

```typescript
export async function checkHibernationStatus(frogId: number) {
  const frog = await prisma.frog.findUnique({ where: { id: frogId } });
  if (!frog || !frog.lastInteractedAt) return;

  const hoursElapsed =
    (Date.now() - frog.lastInteractedAt.getTime()) / (1000 * 60 * 60);

  let newStatus: HibernationStatus = "ACTIVE";
  if (hoursElapsed >= 96) newStatus = "SLEEPING";
  else if (hoursElapsed >= 72) newStatus = "DROWSY";

  if (frog.hibernationStatus !== newStatus) {
    await prisma.frog.update({
      where: { id: frogId },
      data: {
        hibernationStatus: newStatus,
        hibernatedAt: newStatus === "SLEEPING" ? new Date() : null,
      },
    });
  }
}
```

**Step 3: 实现 calculateRevivalCost**

```typescript
export function calculateRevivalCost(
  level: number,
  hibernatedAt: Date,
): number {
  const days = (Date.now() - hibernatedAt.getTime()) / (1000 * 60 * 60 * 24);
  const baseCost = 100;
  return Math.floor(baseCost * level * Math.log(days + 1));
}
```

**Step 4: 编译验证**

```bash
npx tsc --noEmit
```

---

### Task A3: 定时任务集成

**Files:**

- Modify: `backend/src/services/status-cron.job.ts`

**Step 1: 导入 hibernation service**

**Step 2: 在定时函数中添加批量检查**

```typescript
async function runStatusCron() {
  // 现有逻辑...

  // 新增: 批量检查冬眠状态
  const inactiveFrogs = await prisma.frog.findMany({
    where: {
      hibernationStatus: { not: "SLEEPING" },
      lastInteractedAt: { lt: new Date(Date.now() - 72 * 60 * 60 * 1000) },
    },
  });

  for (const frog of inactiveFrogs) {
    await checkHibernationStatus(frog.id);
  }
}
```

---

## Phase 3 (C): 基因博弈

### Task C1: 基因数据结构

**Files:**

- Modify: `backend/src/services/breed.service.ts`

**Step 1: 定义 FrogGenes 接口**

```typescript
interface GeneAllele {
  dominant: string;
  recessive: string;
}

interface FrogGenes {
  skin: GeneAllele;
  eyes: GeneAllele;
  pattern: GeneAllele;
}
```

**Step 2: 定义隐性特征列表**

```typescript
const RECESSIVE_TRAITS = ["gold", "rainbow", "albino", "crystal"];
```

---

### Task C2: 孟德尔遗传算法

**Files:**

- Modify: `backend/src/services/breed.service.ts`

**Step 1: 实现 inheritLocus 函数**

```typescript
function inheritLocus(p1Locus: GeneAllele, p2Locus: GeneAllele): GeneAllele {
  const fromP1 = Math.random() < 0.5 ? p1Locus.dominant : p1Locus.recessive;
  const fromP2 = Math.random() < 0.5 ? p2Locus.dominant : p2Locus.recessive;

  const isDominant = (trait: string) => !RECESSIVE_TRAITS.includes(trait);

  // 显性在前，隐性在后
  if (isDominant(fromP1) || !isDominant(fromP2)) {
    return { dominant: fromP1, recessive: fromP2 };
  } else {
    return { dominant: fromP2, recessive: fromP1 };
  }
}
```

**Step 2: 实现 mendelianInheritance 函数**

```typescript
function mendelianInheritance(
  p1Genes: FrogGenes,
  p2Genes: FrogGenes,
): FrogGenes {
  return {
    skin: inheritLocus(p1Genes.skin, p2Genes.skin),
    eyes: inheritLocus(p1Genes.eyes, p2Genes.eyes),
    pattern: inheritLocus(p1Genes.pattern, p2Genes.pattern),
  };
}
```

**Step 3: 实现 getPhenotype 函数**

```typescript
function getPhenotype(genes: FrogGenes): object {
  const express = (allele: GeneAllele) =>
    RECESSIVE_TRAITS.includes(allele.dominant) &&
    RECESSIVE_TRAITS.includes(allele.recessive)
      ? allele.recessive // 双隐性表达
      : allele.dominant; // 显性表达

  return {
    skin: express(genes.skin),
    eyes: express(genes.eyes),
    pattern: express(genes.pattern),
  };
}
```

**Step 4: 修改 calculateOffspringGenes 使用新算法**

---

## Phase 4 (B): 家族 DAO

### Task B1: Family Schema

**Files:**

- Modify: `backend/prisma/schema.prisma`

**Step 1: 添加 Family model**

```prisma
model Family {
  id            Int       @id @default(autoincrement())
  name          String    @unique
  leaderId      Int
  leader        Frog      @relation("FamilyLeader", fields: [leaderId], references: [id])
  members       Frog[]    @relation("FamilyMembers")
  totemLevel    Int       @default(1)
  totemProgress Int       @default(0)
  weeklyMileage Int       @default(0)
  createdAt     DateTime  @default(now())
}
```

**Step 2: 修改 Frog model 添加关联**

```prisma
familyId      Int?
family        Family?   @relation("FamilyMembers", fields: [familyId], references: [id])
ledFamilies   Family[]  @relation("FamilyLeader")
```

**Step 3: 生成迁移**

```bash
npx prisma migrate dev --name add_family_system
```

---

### Task B2: 家族服务实现

**Files:**

- Create: `backend/src/services/family.service.ts`

**Step 1: 创建服务文件**
包含核心函数: createFamily, joinFamily, waterTotem, checkWeeklyMission

**Step 2: 添加 API 路由**

- Create: `backend/src/api/routes/family.routes.ts`

**Step 3: 编译验证**

```bash
npx tsc --noEmit
```

---

## 验证检查清单

| Task | 验证方式                           | 预期结果                  |
| :--- | :--------------------------------- | :------------------------ |
| D1   | `npx hardhat compile`              | 编译成功                  |
| D1   | ZetaScan 事件查询                  | `SouvenirMinted` 事件存在 |
| A1   | `npx prisma migrate dev`           | Migration 成功            |
| A2   | 手动修改 `lastInteractedAt` 后检查 | 状态变为 SLEEPING         |
| C2   | 繁殖 10 对 `rec:gold` 青蛙         | ~2-3 只金色子代 (25%)     |
| B1   | `npx prisma migrate dev`           | Migration 成功            |
