# Gateway 模式增强：实现真实跨链足迹 (FrogFootprint)

## 1. 核心理念：ZETA-Only 原生体验

利用 **ZetaChain zEVM 内部系统级流动性池**，在合约层将用户预存的 ZETA 自动兑换为目标链 Gas (ZRC20)，从而实现用户仅感知 ZETA 消耗，但能驱动全链交互的极致体验。

---

## 2. 详细开发计划 (Development Roadmap)

### 阶段一：合约升级 (Smart Contract Upgrade)

目标：改造 `OmniTravel.sol`，集成 System Router 并重写探索触发逻辑。

#### 2.1 引入接口与状态变量
在 `OmniTravel.sol` 中添加 Uniswap 和 System Contract 相关定义。

```solidity
// --- Interfaces ---
interface IUniswapV2Router02 {
    function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts);
    function getAmountsIn(uint amountOut, address[] memory path) external view returns (uint[] memory amounts);
}

// --- State Variables in OmniTravel Contract ---
    // System DEX Router (ZetaChain internal)
    IUniswapV2Router02 public systemRouter;
    // WZETA Address (Wrapped ZETA)
    address public wzeta;

// --- Admin Function ---
    function setSystemConfig(address _router, address _wzeta) external onlyOwner {
        systemRouter = IUniswapV2Router02(_router);
        wzeta = _wzeta;
    }
```

#### 2.2 重写 `triggerExploration` (核心逻辑)
此函数将替换原有的实现。它必须是 `payable` 的吗？不，因为它消耗的是内部状态 `frogProvisions`。

```solidity
    /**
     * @notice Trigger exploration with ZETA -> ZRC20 auto-swap
     * @param tokenId The frog NFT ID
     * @param observation The AI generated journal text
     * @param minReserve Minimum ZETA to keep for return trip (Safety Bag)
     */
    function triggerExploration(
        uint256 tokenId,
        string calldata observation,
        uint256 minReserve
    ) external onlyTravelManager {
        CrossChainTravel storage travel = crossChainTravels[tokenId];
        require(travel.status == CrossChainStatus.Traveling, "Not traveling");
        
        uint256 targetChainId = travel.targetChainId;
        address zrc20 = chainZRC20[targetChainId];
        bytes memory receiver = chainConnectors[targetChainId];
        
        require(zrc20 != address(0), "ZRC20 not configured");
        require(receiver.length > 0, "Connector not configured");

        // 1. 估算目标链 Gas (ZRC20 数量)
        // 300k gas limit covers standard Solidity execution on destination
        ( , uint256 zrc20GasFee) = IZRC20(zrc20).withdrawGasFeeWithGasLimit(300000);
        
        // 2. 查询系统池汇率 (ZRC20 -> ZETA)
        address[] memory path = new address[](2);
        path[0] = wzeta;
        path[1] = zrc20;
        
        uint256[] memory amountsIn = systemRouter.getAmountsIn(zrc20GasFee, path);
        uint256 zetaCost = amountsIn[0] * 105 / 100; // +5% Slippage Buffer
        
        // 3. 智能干粮检查 (Smart Provisions Check)
        if (frogProvisions[tokenId] < zetaCost + minReserve) {
            // 余额不足以支付 Gas + 预留金，降级为“云旅游”
            // 仅抛出事件供后端记录，不执行跨链
            emit ExplorationTriggered(tokenId, targetChainId, string(abi.encodePacked("[VIRTUAL] ", observation)), block.timestamp);
            return;
        }

        // 4. 扣费与兑换
        frogProvisions[tokenId] -= zetaCost;
        
        // 内部 Swap: ZETA -> ZRC20
        uint256[] memory amounts = systemRouter.swapExactETHForTokens{value: zetaCost}(
            0, // Min amount out (slippage handled by input buffer)
            path,
            address(this),
            block.timestamp + 300
        );
        uint256 finalZrc20Amount = amounts[amounts.length - 1];
        
        // 5. 跨链调用
        IZRC20(zrc20).approve(address(gateway), finalZrc20Amount);
        
        bytes memory message = abi.encode(
            bytes4(keccak256("exploration")),
            tokenId,
            observation,
            block.timestamp
        );
        
        gateway.call(
            receiver, 
            zrc20, 
            message, 
            CallOptions(300000, false), 
            RevertOptions(address(this), false, address(0), bytes(""), 0)
        );
        
        emit ExplorationTriggered(tokenId, targetChainId, observation, block.timestamp);
    }
```

---

### 阶段二：后端适配 (Backend Adaptation)

目标：更新 `ExplorationSchedulerService`，使其适应新的合约接口。

#### 2.3 修改调用逻辑
文件：`backend/src/services/exploration-scheduler.service.ts`

```typescript
// 常量定义
const RETURN_TICKET_RESERVE = ethers.parseEther("0.1"); // 保留 0.1 ZETA 回家

// 在 processExploringFrog 方法中
async function processExploringFrog(frog: any) {
    // ... 获取 observation ...
    
    try {
        // 调用新版 triggerExploration
        // 注意：不再需要 backend wallet 支付 value，只需支付微量 Gas 用于触发交易
        const tx = await this.omniTravelContract.triggerExploration(
            frog.tokenId, 
            observation,
            RETURN_TICKET_RESERVE
        );
        
        const receipt = await tx.wait();
        
        // 检查是否为虚拟探索 (通过事件内容判断)
        // 合约中我们给虚拟探索加了 "[VIRTUAL] " 前缀
        // 实际开发中也可以增加一个专门的 ExplorationSkipped 事件
        
        logger.info(`Frog ${frog.tokenId} exploration processed.`);
        
    } catch (error) {
        logger.error(`Exploration failed: ${error.message}`);
    }
}
```

---

### 阶段三：部署与配置 (Deployment & Config)

目标：在 ZetaChain Athens-3 测试网上配置正确的参数。

#### 2.4 获取并设置系统地址
在 ZetaChain Athens-3 上：
- **Uniswap V2 Router**: `0x2ca7d64A7EFE2D62A04be5eb797f9561eL72b3F` (System Contract Router)
- **WZETA**: `0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf` (示例地址，需核实)
- **System Contract**: `0xEdf1c3275d13489aCdC6cD6eD246E72458B8795B`

执行配置脚本：
```javascript
const router = "0x2ca7d64A7EFE2D62A04be5eb797f9561eL72b3F"; // 请核实
const wzeta = "0x..."; 

await omniTravel.setSystemConfig(router, wzeta);
```

#### 2.5 验证配置
确保 `chainZRC20` 映射正确：
- Chain ID 97 (BSC Testnet): 对应的 ZRC20-BNB 地址。
- Chain ID 11155111 (Sepolia): 对应的 ZRC20-ETH 地址。

---

## 3. 风险控制与后续

1.  **滑点风险**：系统池流动性不足可能导致 Swap 得到 ZRC20 偏少。代码中并不 revert，而是全部 approve 给 gateway。如果少于 Gas 需求，Gateway 调用可能会失败？
    *   *优化*：`withdrawGasFee` 返回的是预估值，实际 Swap 得到的 `finalZrc20Amount` 应该再检查一次是否 >= `zrc20GasFee`。如果不够（因为滑点），则应该 Revert 或跳过。

2.  **安全预留**：`minReserve` 是保护用户资金的关键，建议后端将其设为可配置参数，根据 ZETA 价格波动动态调整。

此计划现已准备就绪，可直接进入代码实施阶段。
