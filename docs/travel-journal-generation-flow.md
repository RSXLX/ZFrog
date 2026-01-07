# 旅行日记生成完整流程详解

## 📋 目录
1. [整体流程概览](#整体流程概览)
2. [阶段1：发起旅行](#阶段1发起旅行)
3. [阶段2：事件监听与记录创建](#阶段2事件监听与记录创建)
4. [阶段3：旅行处理器启动](#阶段3旅行处理器启动)
5. [阶段4：数据观察与收集](#阶段4数据观察与收集)
6. [阶段5：AI生成旅行日记](#阶段5ai生成旅行日记)
7. [阶段6：上链与完成](#阶段6上链与完成)
8. [数据流转图](#数据流转图)

---

## 整体流程概览

```
用户发起旅行
    ↓
前端调用 Travel 合约
    ↓
合约触发 TravelStarted 事件
    ↓
后端事件监听器捕获事件
    ↓
创建旅行记录（数据库）
    ↓
旅行处理器定期检查到期旅行
    ↓
观察目标钱包活动
    ↓
AI 基于观察数据生成日记
    ↓
上传日记到 IPFS
    ↓
调用合约完成旅行
    ↓
铸造纪念品 NFT
    ↓
前端展示日记和纪念品
```

---

## 阶段1：发起旅行

### 1.1 用户操作
**位置**: `frontend/src/components/travel/TravelForm.tsx` 或 `TravelP0Form.tsx`

用户在前端：
1. 选择旅行模式（快速探索/高级设置）
2. 选择目标链（如 ZetaChain Athens）
3. 选择旅行时长（1分钟/30分钟/1小时/6小时）
4. 输入目标钱包地址 或 选择随机探索

### 1.2 前端发起交易
```typescript
// frontend/src/components/travel/TravelForm.tsx (第90-97行)
writeContract({
    address: TRAVEL_ADDRESS,        // Travel 合约地址
    abi: TRAVEL_ABI,                // Travel 合约 ABI
    functionName: 'startTravel',    // 调用的函数
    args: [
        BigInt(frogId),             // 青蛙的 tokenId
        targetWallet,               // 目标钱包地址（或 0x00...00 表示随机）
        BigInt(duration),           // 旅行时长（秒）
        BigInt(chainId)             // 目标链ID (7001 = ZetaChain Athens)
    ]
});
```

### 1.3 用户确认交易
- MetaMask 弹出，显示交易详情
- 用户确认并签名
- 交易广播到 ZetaChain Athens 测试网

### 1.4 交易上链
```solidity
// contracts/contracts/Travel.sol (第122-154行)
function startTravel(
    uint256 tokenId,
    address targetWallet,
    uint256 duration,
    uint256 targetChainId
) external whenNotPaused nonReentrant onlyFrogOwner(tokenId) {
    // 1. 验证青蛙状态
    require(zetaFrogNFT.getFrogStatus(tokenId) == FrogStatus.Idle);
    
    // 2. 验证参数
    require(supportedChains[targetChainId], "Chain not supported");
    require(duration >= MIN_TRAVEL_DURATION && duration <= MAX_TRAVEL_DURATION);
    
    // 3. 更新青蛙状态为 Traveling
    zetaFrogNFT.setFrogStatus(tokenId, FrogStatus.Traveling);
    
    // 4. 记录旅行信息到合约
    bool isRandom = (targetWallet == address(0));
    activeTravels[tokenId] = TravelSession({
        startTime: uint64(block.timestamp),
        endTime: uint64(block.timestamp + duration),
        targetWallet: targetWallet,
        targetChainId: uint32(targetChainId),
        completed: false,
        isRandom: isRandom
    });
    
    // 5. 触发事件 ← 关键！
    emit TravelStarted(
        tokenId, 
        targetWallet, 
        targetChainId, 
        startTime, 
        endTime, 
        isRandom
    );
}
```

**此时链上状态**:
- ✅ 合约状态已更新
- ✅ `TravelStarted` 事件已触发
- ⏳ 后端尚未同步（需要几秒）

---

##阶段2：事件监听与记录创建

### 2.1 事件监听器捕获事件
**位置**: `backend/src/workers/eventListener.ts`

后端有两种方式监听事件：

#### 方式1：实时监听 (watchEvent)
```typescript
// eventListener.ts (第183-192行)
this.publicClient.watchEvent({
    address: config.TRAVEL_CONTRACT_ADDRESS,  // Travel 合约地址
    event: parseAbiItem('event TravelStarted(...)'),
    onLogs: async (logs) => {
        for (const log of logs) {
            await this.handleTravelStarted(log);  // 处理事件
        }
    }
});
```

#### 方式2：定期扫描历史事件 (每30秒)
```typescript
// eventListener.ts (第76-114行)
async scanHistoricalEvents() {
    const travelLogs = await this.publicClient.getLogs({
        address: config.TRAVEL_CONTRACT_ADDRESS,
        event: parseAbiItem('event TravelStarted(...)'),
        fromBlock: lastProcessedBlock + 1,
        toBlock: currentBlock
    });
    
    for (const log of travelLogs) {
        await this.handleTravelStarted(log);
    }
}
```

### 2.2 处理 TravelStarted 事件
```typescript
// eventListener.ts (第277-350行)
async handleTravelStarted(log: any) {
    // 1. 解析事件参数
    const { tokenId, targetWallet, targetChainId, startTime, endTime, isRandom } = log.args;
    
    // 2. 查找青蛙（通过 tokenId）
    const frog = await prisma.frog.findUnique({
        where: { tokenId: Number(tokenId) }
    });
    
    // 3. 检查是否已有相同记录（防止重复）
    const existingTravel = await prisma.travel.findFirst({
        where: {
            frogId: frog.id,
            startTime: new Date(Number(startTime) * 1000)
        }
    });
    
    if (existingTravel) {
        return; // 已存在，跳过
    }
    
    // 4. 更新青蛙状态
    await prisma.frog.update({
        where: { id: frog.id },
        data: { status: FrogStatus.Traveling }
    });
    
    // 5. 创建旅行记录 ← 关键！
    const travel = await prisma.travel.create({
        data: {
            frogId: frog.id,
            targetWallet: targetWallet.toLowerCase(),
            startTime: new Date(Number(startTime) * 1000),
            endTime: new Date(Number(endTime) * 1000),
            status: 'Active',
            chainId: Number(targetChainId),
            observedTxCount: 0,
            observedTotalValue: "0",
            isRandom: Boolean(isRandom)
        }
    });
    
    // 6. WebSocket 通知前端
    notifyTravelStarted(frog.tokenId, {
        travelId: travel.id,
        targetWallet: travel.targetWallet,
        startTime: travel.startTime,
        endTime: travel.endTime,
        status: 'Active',
        chainId: travel.chainId
    });
}
```

**此时数据库状态**:
```sql
-- Travel 表新增一条记录
INSERT INTO "Travel" (
    frogId,           -- 青蛙的数据库ID
    targetWallet,     -- 目标钱包地址
    startTime,        -- 旅行开始时间
    endTime,          -- 旅行结束时间
    status,           -- 'Active'
    chainId,          -- 7001
    isRandom,         -- true/false
    observedTxCount,  -- 0
    observedTotalValue -- "0"
)

-- Frog 表更新状态
UPDATE "Frog" 
SET status = 'Traveling' 
WHERE id = ?
```

---

## 阶段3：旅行处理器启动

### 3.1 定期检查（每30秒）
**位置**: `backend/src/workers/travelProcessor.ts`

```typescript
// travelProcessor.ts (第91-99行)
async start() {
    logger.info('Travel processor started');
    
    // 每 30 秒检查一次
    setInterval(() => this.processCompletedTravels(), 30 * 1000);
    
    // 立即执行一次
    this.processCompletedTravels();
}
```

### 3.2 查找到期的旅行
```typescript
// travelProcessor.ts (第104-134行)
async processCompletedTravels() {
    // 查找到期但未处理的旅行
    const pendingTravels = await prisma.travel.findMany({
        where: {
            status: TravelStatus.Active,      // 状态为 Active
            endTime: {
                lte: new Date()                // 结束时间 <= 当前时间
            }
        },
        include: {
            frog: true  // 包含青蛙信息
        },
        orderBy: { endTime: 'asc' },
        take: 5  // 每次最多处理 5 个
    });
    
    for (const travel of pendingTravels) {
        await this.processSingleTravel(travel);  // 处理单个旅行
    }
}
```

**检查条件**:
- ✅ `status = 'Active'`
- ✅ `endTime <= 当前时间`

**当旅行时间到期时**，处理器会找到这条记录并开始处理。

---

## 阶段4：数据观察与收集

### 4.1 随机地址发现（如果是随机模式）
```typescript
// travelProcessor.ts (第196-271行)
if (isRandom && targetWallet === '0x0000000000000000000000000000000000000000') {
    // 1. 调用 explorationService 发现随机地址
    const discoveredAddress = await explorationService.getRandomTargetAddress(chainKey);
    
    // 2. 更新旅行记录
    targetWallet = discoveredAddress;
    await prisma.travel.update({
        where: { id: travelId },
        data: { 
            targetWallet: targetWallet.toLowerCase(),
            addressDiscoveredAt: new Date()
        }
    });
}
```

**随机地址来源**:
- `backend/src/services/travel/exploration.service.ts`
- 从链上著名地址池中随机选择
- 或通过链上数据发现活跃地址

### 4.2 观察钱包活动 ← **数据来源的核心**
```typescript
// travelProcessor.ts (第273-303行)
const observation = await observerService.observeWallet(
    targetWallet,     // 目标钱包地址
    startTime,        // 观察开始时间
    endTime,          // 观察结束时间
    chainId           // 链ID
);
```

**观察器返回的数据结构**:
```typescript
{
    transactions: [        // 交易列表
        {
            hash: "0x...",
            from: "0x...",
            to: "0x...",
            value: "1000000000000000000",  // Wei
            gasUsed: "21000",
            timestamp: 1704038400
        },
        // ...
    ],
    totalTxCount: 15,                    // 总交易数
    totalValueWei: BigInt("5000..."),    // 总交易金额（Wei）
    notableEvents: [                     // 特殊事件
        {
            type: "large_transfer",
            description: "转账了 5 ETH"
        },
        {
            type: "nft_mint",
            description: "铸造了一个 NFT"
        }
    ],
    nativeBalance: "10.5",               // 原生代币余额
    protocols: ["Uniswap", "AAVE"]       // 使用的协议
}
```

**观察器实现** (`backend/src/services/observer.service.ts`):
```typescript
async observeWallet(
    walletAddress: string,
    startTime: Date,
    endTime: Date,
    chainId: number
) {
    // 1. 根据链ID选择RPC提供商
    const provider = this.getProviderForChain(chainId);
    
    // 2. 获取时间范围内的区块号
    const fromBlock = await this.getBlockByTimestamp(startTime, provider);
    const toBlock = await this.getBlockByTimestamp(endTime, provider);
    
    // 3. 查询该地址的所有交易
    const transactions = await provider.getLogs({
        address: walletAddress,
        fromBlock,
        toBlock
    });
    
    // 4. 分析交易模式
    const analysis = this.analyzeTransactions(transactions);
    
    // 5. 检测特殊事件
    const notableEvents = this.detectNotableEvents(transactions);
    
    return {
        transactions: analysis.txList,
        totalTxCount: transactions.length,
        totalValueWei: analysis.totalValue,
        notableEvents,
        nativeBalance: await provider.getBalance(walletAddress),
        protocols: this.detectProtocols(transactions)
    };
}
```

### 4.3 保存观察数据
```typescript
// travelProcessor.ts (第288-303行)
await prisma.walletObservation.create({
    data: {
        travelId,
        walletAddress: targetWallet,
        chainId: chainId,
        chainType: chainKey,              // 'ZETACHAIN_ATHENS'
        transactions: observation.transactions,
        totalTxCount: observation.totalTxCount,
        totalValueWei: observation.totalValueWei.toString(),
        notableEvents: observation.notableEvents,
        nativeBalance: observation.nativeBalance,
        protocols: observation.protocols,
        observedFrom: startTime,
        observedTo: endTime
    }
});
```

---

## 阶段5：AI生成旅行日记

### 5.1 调用 AI 服务
```typescript
// travelProcessor.ts (第305-328行)
const durationHours = Math.ceil(
    (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
);

const chainConfig = getChainConfig(chainId);

const journal = await aiService.generateJournal(
    frog.name,           // 青蛙名字
    observation,         // 观察数据 ← 核心输入！
    durationHours,       // 旅行时长
    {
        chainName: chainConfig.displayName,        // "ZetaChain Athens"
        chainScenery: chainConfig.scenery,         // "闪电之城"
        chainVibe: chainConfig.vibe,               // "充满活力"
        isRandom: isRandom                         // 是否随机探索
    }
);
```

### 5.2 AI 日记生成逻辑
**位置**: `backend/src/services/ai.service.ts`

```typescript
async generateJournal(
    frogName: string,
    observation: WalletObservation,
    durationHours: number,
    context: any
) {
    // 1. 构建提示词
    const prompt = this.buildJournalPrompt(
        frogName,
        observation,
        durationHours,
        context
    );
    
    // 2. 调用通义千问 API
    const response = await fetch(config.QWEN_BASE_URL + '/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.QWEN_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'qwen-plus',
            messages: [
                {
                    role: 'system',
                    content: '你是一只爱冒险的青蛙，擅长用有趣的方式描述旅行见闻...'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.8  // 提高创造性
        })
    });
    
    const result = await response.json();
    const journalText = result.choices[0].message.content;
    
    // 3. 解析 AI 返回的 JSON
    const journal = JSON.parse(journalText);
    
    return journal;
}
```

### 5.3 提示词构建
```typescript
buildJournalPrompt(frogName, observation, durationHours, context) {
    return `
我叫${frogName}，刚刚完成了一次${durationHours}小时的旅行！

旅行地点：${context.chainName}（${context.chainScenery}）
旅行方式：${context.isRandom ? '随机探索' : '计划旅行'}

我观察到了这个钱包地址的活动：
- 总共进行了 ${observation.totalTxCount} 笔交易
- 交易总金额：${formatEther(observation.totalValueWei)} ${context.chainName === 'ZetaChain Athens' ? 'ZETA' : 'ETH'}
- 当前余额：${observation.nativeBalance} 代币
- 使用的协议：${observation.protocols.join(', ')}

特别的发现：
${observation.notableEvents.map(e => `- ${e.description}`).join('\n')}

请帮我生成一篇有趣的旅行日记，包含：
1. title: 标题（简短有趣）
2. content: 正文（200-300字，用第一人称，幽默风趣）
3. mood: 心情（happy/excited/curious/amazed/thoughtful）
4. highlights: 3-5个亮点（数组）

返回 JSON 格式：
{
  "title": "...",
  "content": "...",
  "mood": "...",
  "highlights": ["...", "...", "..."]
}
    `.trim();
}
```

### 5.4 AI 返回的日记示例
```json
{
  "title": "一次意外的闪电之城探险",
  "content": "大家好！我是小青蛙SXLX，刚刚完成了一次神奇的1小时旅行！我本来只是随便跳跳，结果不小心掉进了一个叫ZetaChain Athens的地方。这里到处都是闪电⚡，可把我吓了一跳！我偷偷观察了一个钱包地址，发现它超级忙碌，1小时内就进行了15笔交易！而且这个地址还在用Uniswap交易，看起来是个行家！最让我惊讶的是，它还铸造了一个NFT！我虽然是只青蛙，但我也知道NFT可是稀罕物。总之，这次旅行让我大开眼界，原来区块链世界这么有趣！呱！",
  "mood": "excited",
  "highlights": [
    "观察到15笔链上交易",
    "发现使用了Uniswap协议",
    "见证了一次NFT铸造",
    "探索了ZetaChain的闪电世界"
  ]
}
```

---

## 阶段6：上链与完成

### 6.1 上传到 IPFS
```typescript
// travelProcessor.ts (第345-350行)
const journalHash = await ipfsService.uploadJournal(
    frog.name,
    frog.tokenId,
    journal,
    durationHours
);

// 返回: "QmXxx..." 或 "bafkreixxx..."
```

**IPFS 上传内容**:
```json
{
  "frogName": "SXLX",
  "frogTokenId": 0,
  "travelDuration": "1 hour",
  "timestamp": "2025-12-31T02:00:00Z",
  "journal": {
    "title": "一次意外的闪电之城探险",
    "content": "...",
    "mood": "excited",
    "highlights": [...]
  }
}
```

### 6.2 铸造纪念品 NFT
```typescript
// travelProcessor.ts (第356-375行)
if (config.SOUVENIR_NFT_ADDRESS) {
    // 1. 计算稀有度
    const roll = Math.random() * 100;
    if (roll < 70) finalRarity = 'Common';        // 70%
    else if (roll < 95) finalRarity = 'Uncommon'; // 25%
    else finalRarity = 'Rare';                     // 5%
    
    // 2. 调用合约铸造
    souvenirId = await this.mintSouvenir(
        frog.ownerAddress,
        frog.tokenId,
        chainKey
    );
}
```

**合约调用**:
```solidity
// SouvenirNFT.mintSouvenir()
function mintSouvenir(
    address to,
    uint256 frogId,
    uint256 rarityRoll
) external returns (uint256) {
    uint256 souvenirId = totalSupply;
    _mint(to, souvenirId);
    
    souvenirs[souvenirId] = Souvenir({
        frogId: frogId,
        rarity: calculateRarity(rarityRoll),
        mintTime: block.timestamp
    });
    
    emit SouvenirMinted(souvenirId, frogId, to, rarity, name);
    return souvenirId;
}
```

### 6.3 链上完成旅行
```typescript
// travelProcessor.ts (第378行)
await this.completeOnChain(frog.tokenId, journalHash, souvenirId);
```

**合约调用**:
```solidity
// Travel.completeTravel()
function completeTravel(
    uint256 tokenId,
    string calldata journalHash,
    uint256 souvenirId
) external onlyTravelManager {
    TravelSession storage session = activeTravels[tokenId];
    
    session.completed = true;
    lastTravelEnd[tokenId] = uint64(block.timestamp);
    
    // 重置青蛙状态
    zetaFrogNFT.setFrogStatus(tokenId, FrogStatus.Idle);
    
    // 计算奖励经验值
    uint256 xpReward = 50;
    if (block.timestamp >= session.endTime) {
        xpReward += 50;  // 完整完成奖励
    }
    zetaFrogNFT.addExperience(tokenId, xpReward);
    
    emit TravelCompleted(
        tokenId,
        journalHash,
        souvenirId,
        block.timestamp,
        xpReward
    );
}
```

### 6.4 更新数据库
```typescript
// travelProcessor.ts (第478-502行)
await prisma.travel.update({
    where: { id: travelId },
    data: {
        status: TravelStatus.Completed,      // 状态改为 Completed
        currentStage: TravelStage.RETURNING,
        progress: 100,
        journalHash,                          // IPFS 哈希
        journalContent: JSON.stringify(journal), // 日记 JSON
        observedTxCount: observation.totalTxCount,
        observedTotalValue: observation.totalValueWei.toString(),
        completedAt: new Date(),
        souvenirId: dbSouvenirId
    }
});

await prisma.frog.update({
    where: { id: frog.id },
    data: {
        status: FrogStatus.Idle,  // 青蛙状态改为 Idle
        xp: newXp,
        level: newLevel
    }
});
```

### 6.5 WebSocket 通知前端
```typescript
// travelProcessor.ts (第544-554行)
if (this.io) {
    this.io.to(`frog:${frog.tokenId}`).emit('travel:completed', {
        frogId: frog.tokenId,
        travelId,
        journalHash,
        souvenirId,
        chainId,
        chainName: chainConfig.displayName,
        discoveredAddress: isRandom ? targetWallet : null
    });
}
```

---

## 数据流转图

### 完整数据流
```
┌─────────────────────────────────────────────────────────────┐
│ 1. 用户输入                                                  │
├─────────────────────────────────────────────────────────────┤
│ • 青蛙 tokenId: 0                                           │
│ • 目标地址: 0x00...00 (随机) 或 具体地址                    │
│ • 旅行时长: 3600秒 (1小时)                                  │
│ • 目标链: 7001 (ZetaChain Athens)                          │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. 链上记录 (Travel 合约)                                   │
├─────────────────────────────────────────────────────────────┤
│ activeTravels[0] = {                                        │
│   startTime: 1735603276,                                    │
│   endTime: 1735606876,                                      │
│   targetWallet: 0x00...00,                                  │
│   targetChainId: 7001,                                      │
│   completed: false,                                         │
│   isRandom: true                                            │
│ }                                                           │
│                                                             │
│ emit TravelStarted(0, 0x00...00, 7001, ..., true)          │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. 数据库记录 (Travel 表)                                   │
├─────────────────────────────────────────────────────────────┤
│ INSERT INTO Travel {                                        │
│   frogId: 1,                                                │
│   targetWallet: "0x00...00",                                │
│   startTime: "2025-12-31 02:01:16",                         │
│   endTime: "2025-12-31 02:02:16",                           │
│   status: "Active",                                         │
│   chainId: 7001,                                            │
│   isRandom: true                                            │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
                        ↓
                  ⏰ 等待旅行结束
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. 旅行处理器检测到期                                        │
├─────────────────────────────────────────────────────────────┤
│ SELECT * FROM Travel                                        │
│ WHERE status = 'Active'                                     │
│   AND endTime <= NOW()                                      │
│                                                             │
│ → 找到 Travel ID 5                                          │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. 发现随机地址                                             │
├─────────────────────────────────────────────────────────────┤
│ explorationService.getRandomTargetAddress('ZETACHAIN')      │
│ → 返回: "0x735b...6ab"                                      │
│                                                             │
│ UPDATE Travel SET targetWallet = "0x735b...6ab"             │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. 观察钱包活动 ← 数据来源核心！                             │
├─────────────────────────────────────────────────────────────┤
│ observerService.observeWallet(                              │
│   "0x735b...6ab",                                           │
│   "2025-12-31 02:01:16",  // startTime                      │
│   "2025-12-31 02:02:16",  // endTime                        │
│   7001                     // ZetaChain                     │
│ )                                                           │
│                                                             │
│ → 查询 ZetaChain RPC:                                       │
│   - 获取该时间段的区块范围                                   │
│   - 查询该地址的所有交易                                     │
│   - 分析交易模式                                             │
│   - 检测特殊事件                                             │
│                                                             │
│ → 返回观察数据:                                              │
│   {                                                         │
│     transactions: [...],        // 15笔交易                │
│     totalTxCount: 15,                                       │
│     totalValueWei: "5000...",   // 总金额                  │
│     notableEvents: [            // 特殊事件                │
│       "转账了 5 ZETA",                                      │
│       "铸造了一个 NFT"                                       │
│     ],                                                      │
│     nativeBalance: "10.5",      // 余额                    │
│     protocols: ["Uniswap"]      // 使用协议                │
│   }                                                         │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. 保存观察数据                                             │
├─────────────────────────────────────────────────────────────┤
│ INSERT INTO WalletObservation {                             │
│   travelId: 5,                                              │
│   walletAddress: "0x735b...6ab",                            │
│   chainId: 7001,                                            │
│   chainType: "ZETACHAIN_ATHENS",                           │
│   transactions: [...],                                      │
│   totalTxCount: 15,                                         │
│   totalValueWei: "5000...",                                 │
│   notableEvents: [...],                                     │
│   protocols: ["Uniswap"]                                    │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. AI 生成日记 ← 基于观察数据！                              │
├─────────────────────────────────────────────────────────────┤
│ aiService.generateJournal(                                  │
│   "SXLX",              // 青蛙名字                          │
│   observation,         // 观察数据 ← 输入！                 │
│   1,                   // 1小时                             │
│   {                    // 链上下文                          │
│     chainName: "ZetaChain Athens",                          │
│     chainScenery: "闪电之城",                               │
│     isRandom: true                                          │
│   }                                                         │
│ )                                                           │
│                                                             │
│ → 调用通义千问 API:                                          │
│   提示词包含:                                                │
│   - 青蛙名字: SXLX                                          │
│   - 旅行地点: ZetaChain Athens                             │
│   - 观察数据:                                                │
│     * 15笔交易                                              │
│     * 总金额 5 ZETA                                         │
│     * 使用了 Uniswap                                        │
│     * 铸造了 NFT                                            │
│   - 要求: JSON格式，包含title/content/mood/highlights      │
│                                                             │
│ → AI 返回:                                                  │
│   {                                                         │
│     "title": "一次意外的闪电之城探险",                       │
│     "content": "大家好！我是小青蛙SXLX...",                  │
│     "mood": "excited",                                      │
│     "highlights": [                                         │
│       "观察到15笔链上交易",                                  │
│       "发现使用了Uniswap协议",                               │
│       "见证了一次NFT铸造"                                     │
│     ]                                                       │
│   }                                                         │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. 上传到 IPFS                                              │
├─────────────────────────────────────────────────────────────┤
│ ipfsService.uploadJournal(journal)                          │
│ → Pinata API 上传                                           │
│ → 返回: "QmXxx..." 或 "bafkreixxx..."                       │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 10. 铸造纪念品                                              │
├─────────────────────────────────────────────────────────────┤
│ SouvenirNFT.mintSouvenir(owner, frogId, rarityRoll)        │
│ → 铸造 NFT #1 (稀有度: Common)                              │
│ → emit SouvenirMinted(1, 0, owner, 0, "Ethereum Postcard") │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 11. 链上完成旅行                                            │
├─────────────────────────────────────────────────────────────┤
│ Travel.completeTravel(0, "QmXxx...", 1)                     │
│ → 设置 completed = true                                     │
│ → 设置青蛙状态为 Idle                                       │
│ → 添加经验值 100 XP                                         │
│ → emit TravelCompleted(0, "QmXxx...", 1, timestamp, 100)   │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 12. 更新数据库最终状态                                       │
├─────────────────────────────────────────────────────────────┤
│ UPDATE Travel SET {                                         │
│   status: "Completed",                                      │
│   journalHash: "QmXxx...",                                  │
│   journalContent: '{"title":"...","content":"..."}',        │
│   observedTxCount: 15,                                      │
│   observedTotalValue: "5000...",                            │
│   souvenirId: 1,                                            │
│   completedAt: NOW()                                        │
│ } WHERE id = 5                                              │
│                                                             │
│ UPDATE Frog SET {                                           │
│   status: "Idle",                                           │
│   xp: 100,                                                  │
│   level: 1                                                  │
│ } WHERE id = 1                                              │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 13. 前端展示                                                │
├─────────────────────────────────────────────────────────────┤
│ WebSocket 通知: travel:completed                            │
│                                                             │
│ 前端跳转到: /travel/5                                        │
│                                                             │
│ 显示:                                                        │
│ • 标题:"一次意外的闪电之城探险"                              │
│ • 正文: "大家好！我是小青蛙SXLX..."                         │
│ • 心情: 😊 excited                                          │
│ • 亮点:                                                      │
│   - 观察到15笔链上交易                                       │
│   - 发现使用了Uniswap协议                                    │
│   - 见证了一次NFT铸造                                        │
│ • 纪念品: Ethereum Postcard (Common) #1                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 总结

### 数据的主要来源

1. **链上数据**（来源：区块链 RPC）
   - 目标钱包的交易记录
   - 交易金额、Gas费用
   - 智能合约交互记录
   - 钱包余额

2. **AI 生成**（来源：通义千问）
   - 基于链上数据生成故事化内容
   - 标题、正文、心情、亮点

3. **系统配置**（来源：代码配置）
   - 链的描述（"闪电之城"）
   - 稀有度算法（70% Common, 25% Uncommon, 5% Rare）
   - 经验值计算（基础50 XP + 完成奖励50 XP）

### 关键时间点

- **T+0秒**: 用户发起交易
- **T+5秒**: 交易确认，事件触发
- **T+10秒**: 后端创建旅行记录
- **T+3600秒**: 旅行时间到期
- **T+3630秒**: 处理器检测到期，开始处理
- **T+3635秒**: 观察钱包活动完成
- **T+3640秒**: AI 生成日记完成
- **T+3645秒**: IPFS 上传完成
- **T+3650秒**: 链上完成交易确认
- **T+3655秒**: 前端收到完成通知，展示日记

### 数据流的核心环节

1. **链上观察** → 真实的区块链数据
2. **AI 生成** → 将数据转化为有趣的故事
3. **IPFS 存储** → 永久保存日记内容
4. **NFT 铸造** → 旅行凭证和收藏品
5. **数据库记录** → 完整的旅行历史

这就是从发起旅行到生成日记的完整流程！🎉
