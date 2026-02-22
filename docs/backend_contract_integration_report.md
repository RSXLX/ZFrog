# 系统合约层与后端结合检查报告

**检查时间**: 2026-02-04
**检查对象**: 后端服务 (`backend/src/services`) 与系统合约配置 (`backend/src/config`)

## 1. 总体结论

✅ **核心连接正常**: 后端能够成功连接 ZetaChain RPC，并读取 ZetaFrog NFT 合约的基础状态（如总供应量）。
⚠️ **逻辑不一致**: "本地旅行"与"跨链旅行"在纪念品（Souvenir）的处理上存在显著差异，跨链模式下缺失链上纪念品铸造环节。
⚠️ **配置风险**: 合约地址在 `config/index.ts` 和 `services/omni-travel.service.ts` 中存在两套不同的默认值，增加了维护风险。

## 2. 详细分析

### 2.1 合约连通性

- **RPC 连接**: ZetaChain Athens Testnet (ChainID 7001) 连接正常。
- **ZetaFrog NFT**:
  - 地址: `0x0721CDff3291a1Dd2af28633B5dEE5427553F09E` (来自 Config)
  - 状态: 可读 (`totalSupply`, `MAX_SUPPLY` 返回正常)。
  - ABI: `config/contracts.ts` 中的 ABI配置正确匹配了合约功能。

### 2.2 业务逻辑集成

#### A. 本地旅行 (`TravelService`)

- **逻辑**: 使用 `ZetaFrogNFT` 合约直接管理。
- **状态同步**: 完整。调用 `completeTravel` 并传入 `journalHash` 和 `souvenirId`。
- **纪念品**: ✅ **链上铸造**。后端显式调用 `souvenirContract.mintSouvenir`，获取 ID 后传给主合约。

#### B. 跨链旅行 (`OmniTravelService`) - **当前核心关注点**

- **逻辑**: 使用 `OmniTravel` (ZetaChain) 和 `FrogConnector` (目标链) 合约。
- **状态同步**:
  - 使用 `CrossChainListener` 监听目标链事件 (`FrogArrived`, `FrogReturned`)。
  - 数据库状态通过 `syncCrossChainTravelState` 与链上保持一致。
- **探索模拟**: 后端使用 `ExplorationService` 读取真实链上区块数据，生成"虚拟"的探索记录和日记，逻辑闭环。
- **缺失**: ❌ **链上纪念品缺失**。
  - 在 `completeCrossChainTravel` 中，代码仅在数据库层面创建了 Souvenir 记录 (`prisma.souvenir.create`)。
  - 调用 `OmniTravel.markTravelCompleted` 解锁青蛙时，**未传入** 纪念品信息。
  - 结果：跨链旅行结束时，用户在数据库能看到纪念品，但在链上钱包中**没有对应的 NFT**。

### 2.3 配置一致性检查

发现合约地址配置存在“红鲱鱼”风险（多处定义）：

| 项目                  | `config/index.ts` (生效值) | `omni-travel.service.ts` (硬编码 fallback) | 风险          |
| :-------------------- | :------------------------- | :----------------------------------------- | :------------ |
| **OmniTravel**        | `0x7e85...50d5`            | `0x52B0...cd7`                             | ⚠️ 地址不一致 |
| **BSC Connector**     | `0x8E79...aec`             | `0x1cBD...AD1`                             | ⚠️ 地址不一致 |
| **Sepolia Connector** | `0xca54...3C9`             | `0xBfE0...241`                             | ⚠️ 地址不一致 |

**风险提示**: 虽然 `config/index.ts` 的优先级更高，但如果环境变量未正确加载，或者开发者误以为修改 Service 里的地址有效，会导致调试困难。

## 3. 建议修复方案

### P0 (高优先级)

1.  **统一配置源**: 移除 `omni-travel.service.ts` 中的硬编码地址 Fallback，强制依赖 `config` 模块。如果 `config` 缺失应直接报错，而不是静默使用过时地址。
2.  **补全跨链纪念品逻辑**:
    - 方案 A (推荐): 修改 `OmniTravel` 合约的 `markTravelCompleted` 函数，增加 `mintSouvenir` 的逻辑（需要合约升级）。
    - 方案 B (后端补丁): 在 `OmniTravelService.completeCrossChainTravel` 中，在调用 `markTravelCompleted` 之前/之后，由 Relayer 额外调用一次 `SouvenirNFT.mintSouvenir`。

### P1 (优化)

1.  **ABI 补全**: `contracts.ts` 中的 `ZETAFROG_ABI` 缺少 `name()` 和 `symbol()` 等标准 ERC721 读取函数，建议补全以便于调试工具使用。
2.  **类型安全**: `omni-travel.service.ts` 中存在较多 `any` 类型转换，建议完善 Viem 的类型定义。

## 4. 执行脚本

已创建 `backend/scripts/check-integration.ts` 用于快速验证环境配置。
运行方式:

```bash
cd backend
npx ts-node scripts/check-integration.ts
```
