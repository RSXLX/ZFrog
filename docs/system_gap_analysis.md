# ZetaFrog 2.0 系统匹配度检查报告 (Gap Analysis)

**检查时间**: 2026-02-04
**目标对比**: 当前代码库 vs `ZetaFrog_2.0_Unified_PRD.md`

---

## 1. 总体匹配度评分: 45%

系统当前处于 **V1.5 (过渡期)** 状态。基础框架（青蛙状态、好友系统、旅行系统）已就绪，但 V2.0 定义的核心博弈机制（显隐性基因、冬眠、家族 DAO）尚未实现。

| 模块                   | 匹配度 | 状态简述                                   |
| :--------------------- | :----- | :----------------------------------------- |
| **A. 资产韧性 (冬眠)** | 🔴 20% | 仅有基础状态衰减，缺冬眠状态机与唤醒逻辑。 |
| **B. 深度社交 (家族)** | 🟡 40% | 好友系统完善，家族 DAO 架构完全缺失。      |
| **C. 基因博弈**        | 🟡 30% | 实现了概率遗传，缺孟德尔显隐性核心算法。   |
| **D. 基础设施**        | 🟡 60% | 跨链框架已通，缺纪念品上链与统一配置。     |

---

## 2. 详细 GAP 分析

### 2.1 模块 A: 资产韧性系统 (Hibernation)

- **当前代码**: `frog-status.service.ts`
  - 实现了 `hunger`/`health` 随时间衰减。
  - 实现了简单的 `isSick` (生病) 状态，触发条件为 `health < 15`。
  - ❌ **缺失**: 连续 96h 无交互触发 `Soft Hibernation` 的逻辑。
  - ❌ **缺失**: 唤醒罚金公式 ($Cost = Base \times \ln(Days)$) 及好友祈福减免功能。

- **差距**: `Frog` 模型需增加 `hibernationStatus` (ACTIVE/SLEEPING/DEAD) 字段，状态服务需新增 `checkHibernation` 定时任务。

### 2.2 模块 B: 深度社交系统 (Social 2.0)

- **当前代码**: `prisma/schema.prisma`, `group-travel.service.ts`
  - ✅ 现有 `Friendship` 表支持 `affinityLevel` (友情值) 和 `intimacy` (亲密度)。
  - ✅ 现有 `GroupTravel` 支持结伴旅行基础框架。
  - ❌ **缺失**: `Family` (家族) 实体及相关逻辑 (图腾、周常任务)。
  - ❌ **缺失**: 跨链救援 (Rescue) 机制虽然在 Schema 中有 `RescueRequest` 定义，但未发现配套的业务逻辑代码实现。

- **差距**: 需新建 `FamilyService`，并完善 `RescueService` 的业务流。

### 2.3 模块 C: 基因与经济 (Genetics & Economy)

- **当前代码**: `breed.service.ts`
  - 目前的 `calculateOffspringGenes` 使用简单的加权随机 (例如 70% 继承父母，30% 变异)。
  - 外观颜色混合使用 `blendColors` (RGB 平均值)。
  - ❌ **缺失**: 基因型 (Genotype) vs 表现型 (Phenotype) 的分离。没有 `{显性, 隐性}` 的数据结构。
  - ❌ **缺失**: G-Factor 全局经济宏观调控逻辑。

- **差距**: `Frog` 表的 `genes` 字段需结构化为 `{ locus: { dominant, recessive } }`，繁殖算法需重写为 Punnett Square 逻辑。

### 2.4 模块 D: 基础设施 (Infrastructure)

- **当前代码**: `omni-travel.service.ts`
  - 已识别到跨链纪念品仅 DB 生成未上链的问题（见前序报告）。
  - `config` 配置存在多处硬编码 Fallback。

- **差距**: 需移除 Service 层的硬编码地址，补全合约的 Mint 接口调用。

---

## 3. 建议执行计划

建议按照 **基础设施 -> 核心博弈 -> 社交扩展** 的顺序填补空缺：

1.  **Phase 1 (Week 1)**: 修复模块 D。统一 Config，解决跨链纪念品虚假铸造问题。[高优先级]
2.  **Phase 2 (Week 2)**: 实现模块 A (冬眠)。修改 `Frog` Schema，在 `status-cron.job.ts` 中增加冬眠检测。
3.  **Phase 3 (Week 3)**: 重构模块 C (基因)。修改 `breed.service.ts`，引入孟德尔算法，让繁殖结果可预测、可博弈。
4.  **Phase 4 (Week 4)**: 构建模块 B (家族)。从零开发家族系统。

## 4. 结论

系统基础良好，但距离 V2.0 "可博弈、有深度" 的目标仍有较大功能缺口。建议立即着手 **Phase 1 (基础设施修复)** 和 **Phase 2 (冬眠系统)** 的开发。
