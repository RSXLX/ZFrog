# ZetaFrog 智能合约层技术需求文档 (PRD)

## 1. 概述

### 1.1 文档目的

本文档详细描述 ZetaFrog Desktop Pet 项目中智能合约层的技术需求，包括合约架构设计、核心功能实现、跨链交互逻辑以及安全规范。

### 1.2 合约层定位

智能合约层是 ZetaFrog 系统的链上信任基础，负责：

- 青蛙 NFT 的铸造与管理
- 跨链旅行状态的链上记录与验证
- 纪念品 NFT 的发行与绑定
- 利用 ZetaChain 实现全链互操作

### 1.3 技术栈

| 组件       | 技术选型                           |
| ---------- | ---------------------------------- |
| 主合约平台 | ZetaChain (zEVM)                   |
| 合约语言   | Solidity ^0.8.20                   |
| 开发框架   | Hardhat / Foundry                  |
| 跨链标准   | ZetaChain Connector / ZRC-20       |
| NFT 标准   | ERC-721 (青蛙) / ERC-1155 (纪念品) |
| 测试网络   | ZetaChain Athens Testnet           |

------

## 2. 系统架构

### 2.1 合约架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                      ZetaChain (zEVM)                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    ZetaFrogCore.sol                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │  │
│  │  │ FrogNFT     │  │ TravelLog   │  │ SouvenirVault   │   │  │
│  │  │ (ERC-721)   │  │ Registry    │  │ (ERC-1155)      │   │  │
│  │  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘   │  │
│  │         │                │                   │            │  │
│  │         └────────────────┼───────────────────┘            │  │
│  │                          │                                │  │
│  │              ┌───────────▼───────────┐                    │  │
│  │              │   CrossChainHandler   │                    │  │
│  │              │   (Zeta Connector)    │                    │  │
│  │              └───────────┬───────────┘                    │  │
│  └──────────────────────────┼────────────────────────────────┘  │
│                             │                                    │
└─────────────────────────────┼────────────────────────────────────┘
                              │ ZetaChain Messaging
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   ┌─────────┐           ┌─────────┐           ┌─────────┐
   │Ethereum │           │   BNB   │           │ Bitcoin │
   │  Chain  │           │  Chain  │           │ (UTXO)  │
   └─────────┘           └─────────┘           └─────────┘
```

### 2.2 合约模块划分

| 合约名称                | 功能描述           | 依赖关系              |
| ----------------------- | ------------------ | --------------------- |
| `ZetaFrogNFT.sol`       | 青蛙 NFT 主合约    | OpenZeppelin ERC-721  |
| `TravelRegistry.sol`    | 旅行记录存储       | ZetaFrogNFT           |
| `SouvenirNFT.sol`       | 纪念品 NFT 合约    | OpenZeppelin ERC-1155 |
| `CrossChainHandler.sol` | 跨链消息处理       | ZetaChain Connector   |
| `FrogAttributes.sol`    | 青蛙属性与等级系统 | TravelRegistry        |

------

## 3. 核心合约规范

### 3.1 ZetaFrogNFT.sol (青蛙 NFT)

#### 3.1.1 合约接口

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IZetaFrogNFT {
    // ============ Events ============
    event FrogMinted(address indexed owner, uint256 indexed tokenId, string name);
    event FrogTravelStarted(uint256 indexed tokenId, uint256 indexed chainId, address targetWallet);
    event FrogTravelEnded(uint256 indexed tokenId, uint256 indexed chainId, bytes32 journalHash);
    event FrogAttributeUpdated(uint256 indexed tokenId, string attribute, uint256 newValue);

    // ============ Structs ============
    struct FrogMetadata {
        string name;
        uint256 birthday;        // block.timestamp at mint
        uint256 totalTravels;    // 总旅行次数
        uint256 totalChains;     // 访问过的链数量
        uint256 experiencePoints;// 经验值
        FrogStatus status;       // 当前状态
    }

    enum FrogStatus {
        Idle,       // 在家休息
        Traveling,  // 旅行中
        Returning   // 返程中
    }

    // ============ Core Functions ============
    
    /// @notice 铸造一只新青蛙
    /// @param name 青蛙名字 (2-16字符)
    /// @return tokenId 新铸造的 NFT ID
    function mintFrog(string calldata name) external returns (uint256 tokenId);

    /// @notice 发起跨链旅行
    /// @param tokenId 青蛙 NFT ID
    /// @param targetChainId 目标链 ID
    /// @param targetWallet 要观察的钱包地址
    /// @param duration 旅行时长 (秒)
    function startTravel(
        uint256 tokenId,
        uint256 targetChainId,
        address targetWallet,
        uint256 duration
    ) external;

    /// @notice 结束旅行并记录日志 (仅限 CrossChainHandler 调用)
    /// @param tokenId 青蛙 NFT ID
    /// @param journalHash 旅行日志的 IPFS hash
    /// @param souvenirIds 获得的纪念品 ID 数组
    function endTravel(
        uint256 tokenId,
        bytes32 journalHash,
        uint256[] calldata souvenirIds
    ) external;

    /// @notice 获取青蛙元数据
    function getFrogMetadata(uint256 tokenId) external view returns (FrogMetadata memory);

    /// @notice 检查青蛙是否可以旅行
    function canTravel(uint256 tokenId) external view returns (bool);
}
```

#### 3.1.2 核心状态变量

```solidity
contract ZetaFrogNFT is ERC721URIStorage, Ownable, IZetaFrogNFT {
    // ============ State Variables ============
    
    uint256 private _tokenIdCounter;
    
    // tokenId => FrogMetadata
    mapping(uint256 => FrogMetadata) public frogs;
    
    // tokenId => chainId => visited count
    mapping(uint256 => mapping(uint256 => uint256)) public chainVisits;
    
    // tokenId => array of journal hashes
    mapping(uint256 => bytes32[]) public travelJournals;
    
    // 当前旅行信息
    struct ActiveTravel {
        uint256 startTime;
        uint256 duration;
        uint256 targetChainId;
        address targetWallet;
    }
    mapping(uint256 => ActiveTravel) public activeTravels;
    
    // ============ Constants ============
    uint256 public constant MAX_SUPPLY = 10000;
    uint256 public constant MIN_TRAVEL_DURATION = 1 hours;
    uint256 public constant MAX_TRAVEL_DURATION = 7 days;
    uint256 public constant COOLDOWN_PERIOD = 30 minutes;
    
    // 关联合约
    address public travelRegistry;
    address public crossChainHandler;
    address public souvenirNFT;
}
```

#### 3.1.3 铸造逻辑

```solidity
function mintFrog(string calldata name) external returns (uint256 tokenId) {
    require(bytes(name).length >= 2 && bytes(name).length <= 16, "Invalid name length");
    require(_tokenIdCounter < MAX_SUPPLY, "Max supply reached");
    
    tokenId = _tokenIdCounter++;
    
    _safeMint(msg.sender, tokenId);
    
    frogs[tokenId] = FrogMetadata({
        name: name,
        birthday: block.timestamp,
        totalTravels: 0,
        totalChains: 0,
        experiencePoints: 0,
        status: FrogStatus.Idle
    });
    
    // 生成初始外观属性 (基于 tokenId 的伪随机)
    _initializeAppearance(tokenId);
    
    emit FrogMinted(msg.sender, tokenId, name);
}

function _initializeAppearance(uint256 tokenId) internal {
    // 基于 tokenId 和 block 信息生成伪随机外观
    uint256 seed = uint256(keccak256(abi.encodePacked(tokenId, block.timestamp, block.prevrandao)));
    
    // 存储外观属性到 tokenURI 或单独的 mapping
    // skinColor, eyeStyle, accessory 等
}
```

### 3.2 TravelRegistry.sol (旅行记录)

#### 3.2.1 合约接口

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ITravelRegistry {
    // ============ Events ============
    event TravelRecorded(
        uint256 indexed tokenId,
        uint256 indexed chainId,
        address targetWallet,
        uint256 startTime,
        uint256 endTime,
        bytes32 journalHash
    );

    // ============ Structs ============
    struct TravelRecord {
        uint256 tokenId;
        uint256 chainId;
        address targetWallet;
        uint256 startTime;
        uint256 endTime;
        bytes32 journalHash;      // IPFS CID of AI-generated story
        uint256[] souvenirIds;    // 获得的纪念品
        TravelOutcome outcome;
    }

    enum TravelOutcome {
        Success,      // 正常完成
        EarlyReturn,  // 提前返回
        LostAndFound  // 迷路后找回 (特殊事件)
    }

    // ============ Functions ============
    
    /// @notice 记录一次旅行
    function recordTravel(TravelRecord calldata record) external;

    /// @notice 获取青蛙的所有旅行记录
    function getTravelHistory(uint256 tokenId) external view returns (TravelRecord[] memory);

    /// @notice 获取特定链的旅行统计
    function getChainStats(uint256 tokenId, uint256 chainId) external view returns (
        uint256 visitCount,
        uint256 totalDuration,
        uint256 lastVisit
    );

    /// @notice 获取全局旅行统计
    function getGlobalStats() external view returns (
        uint256 totalTravels,
        uint256 totalChains,
        uint256 totalFrogs
    );
}
```

#### 3.2.2 核心实现

```solidity
contract TravelRegistry is ITravelRegistry, Ownable {
    // ============ State Variables ============
    
    // tokenId => TravelRecord[]
    mapping(uint256 => TravelRecord[]) private _travelHistory;
    
    // tokenId => chainId => ChainStats
    struct ChainStats {
        uint256 visitCount;
        uint256 totalDuration;
        uint256 lastVisit;
    }
    mapping(uint256 => mapping(uint256 => ChainStats)) public chainStats;
    
    // 全局统计
    uint256 public totalTravelsRecorded;
    mapping(uint256 => bool) public activeChains;  // chainId => isActive
    uint256 public activeChainsCount;
    
    // 支持的链 ID
    uint256[] public supportedChainIds;
    mapping(uint256 => string) public chainNames;
    
    // 权限控制
    address public zetaFrogNFT;
    
    // ============ Modifiers ============
    modifier onlyFrogContract() {
        require(msg.sender == zetaFrogNFT, "Only FrogNFT can call");
        _;
    }
    
    // ============ Functions ============
    function recordTravel(TravelRecord calldata record) external onlyFrogContract {
        _travelHistory[record.tokenId].push(record);
        
        // 更新链统计
        ChainStats storage stats = chainStats[record.tokenId][record.chainId];
        stats.visitCount++;
        stats.totalDuration += (record.endTime - record.startTime);
        stats.lastVisit = record.endTime;
        
        // 更新全局统计
        totalTravelsRecorded++;
        if (!activeChains[record.chainId]) {
            activeChains[record.chainId] = true;
            activeChainsCount++;
        }
        
        emit TravelRecorded(
            record.tokenId,
            record.chainId,
            record.targetWallet,
            record.startTime,
            record.endTime,
            record.journalHash
        );
    }
    
    function initializeSupportedChains() external onlyOwner {
        // ZetaChain 支持的链
        _addChain(1, "Ethereum");
        _addChain(56, "BNB Chain");
        _addChain(137, "Polygon");
        _addChain(8332, "Bitcoin");  // ZetaChain 的 BTC 表示
        _addChain(7000, "ZetaChain");
    }
    
    function _addChain(uint256 chainId, string memory name) internal {
        supportedChainIds.push(chainId);
        chainNames[chainId] = name;
    }
}
```

### 3.3 SouvenirNFT.sol (纪念品 NFT)

#### 3.3.1 合约接口

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

interface ISouvenirNFT {
    // ============ Events ============
    event SouvenirMinted(
        address indexed owner,
        uint256 indexed souvenirId,
        uint256 indexed chainId,
        SouvenirRarity rarity
    );
    event SouvenirBoundToFrog(uint256 indexed souvenirId, uint256 indexed frogId);

    // ============ Enums ============
    enum SouvenirRarity {
        Common,     // 60% - 普通纪念品
        Uncommon,   // 25% - 稀有纪念品
        Rare,       // 12% - 珍稀纪念品
        Epic,       // 2.5% - 史诗纪念品
        Legendary   // 0.5% - 传说纪念品
    }

    enum SouvenirCategory {
        Wearable,   // 可穿戴装饰
        Background, // 背景装饰
        Effect,     // 特效
        Companion,  // 小伙伴
        Badge       // 徽章/成就
    }

    // ============ Structs ============
    struct SouvenirMetadata {
        string name;
        string description;
        uint256 chainId;         // 来源链
        SouvenirRarity rarity;
        SouvenirCategory category;
        string imageURI;
        uint256 mintTimestamp;
        bool isBound;            // 是否已绑定到青蛙
        uint256 boundFrogId;     // 绑定的青蛙 ID
    }

    // ============ Functions ============
    
    /// @notice 铸造纪念品 (仅限 CrossChainHandler)
    function mintSouvenir(
        address to,
        uint256 chainId,
        SouvenirRarity rarity,
        SouvenirCategory category,
        string calldata metadataURI
    ) external returns (uint256 souvenirId);

    /// @notice 将纪念品绑定到青蛙
    function bindToFrog(uint256 souvenirId, uint256 frogId) external;

    /// @notice 解绑纪念品
    function unbindFromFrog(uint256 souvenirId) external;

    /// @notice 获取纪念品元数据
    function getSouvenirMetadata(uint256 souvenirId) external view returns (SouvenirMetadata memory);

    /// @notice 获取青蛙装备的所有纪念品
    function getFrogEquippedSouvenirs(uint256 frogId) external view returns (uint256[] memory);
}
```

#### 3.3.2 纪念品生成规则

```solidity
contract SouvenirNFT is ERC1155, ISouvenirNFT, Ownable {
    // ============ State Variables ============
    uint256 private _souvenirIdCounter;
    
    mapping(uint256 => SouvenirMetadata) public souvenirs;
    mapping(uint256 => uint256[]) public frogEquippedSouvenirs; // frogId => souvenirIds
    
    // 每条链的特色纪念品模板
    mapping(uint256 => SouvenirTemplate[]) public chainSouvenirTemplates;
    
    struct SouvenirTemplate {
        string name;
        string description;
        SouvenirCategory category;
        string baseImageURI;
        uint256 weight; // 掉落权重
    }
    
    // ============ Souvenir Generation ============
    
    /// @notice 基于链特色生成纪念品
    function generateSouvenir(
        uint256 chainId,
        uint256 travelDuration,
        address targetWallet
    ) internal returns (uint256 souvenirId, SouvenirRarity rarity) {
        // 1. 计算稀有度
        rarity = _calculateRarity(travelDuration, targetWallet);
        
        // 2. 从链特色模板中选择
        SouvenirTemplate memory template = _selectTemplate(chainId, rarity);
        
        // 3. 铸造纪念品
        souvenirId = _souvenirIdCounter++;
        
        souvenirs[souvenirId] = SouvenirMetadata({
            name: template.name,
            description: template.description,
            chainId: chainId,
            rarity: rarity,
            category: template.category,
            imageURI: template.baseImageURI,
            mintTimestamp: block.timestamp,
            isBound: false,
            boundFrogId: 0
        });
        
        return (souvenirId, rarity);
    }
    
    /// @notice 稀有度计算
    function _calculateRarity(
        uint256 travelDuration,
        address targetWallet
    ) internal view returns (SouvenirRarity) {
        // 基于旅行时长和目标钱包活跃度计算
        uint256 seed = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            travelDuration,
            targetWallet
        )));
        
        uint256 roll = seed % 1000;
        
        // 时长加成 (每天增加 1% 高稀有度概率)
        uint256 durationBonus = (travelDuration / 1 days) * 10;
        roll = roll > durationBonus ? roll - durationBonus : 0;
        
        if (roll < 5) return SouvenirRarity.Legendary;      // 0.5%
        if (roll < 30) return SouvenirRarity.Epic;          // 2.5%
        if (roll < 150) return SouvenirRarity.Rare;         // 12%
        if (roll < 400) return SouvenirRarity.Uncommon;     // 25%
        return SouvenirRarity.Common;                        // 60%
    }
    
    // ============ Chain-Specific Souvenirs ============
    
    /// @notice 初始化各链特色纪念品
    function initializeChainSouvenirs() external onlyOwner {
        // Ethereum 特色
        chainSouvenirTemplates[1].push(SouvenirTemplate({
            name: "Vitalik's Glasses",
            description: "A pixel art replica of the iconic glasses",
            category: SouvenirCategory.Wearable,
            baseImageURI: "ipfs://...",
            weight: 100
        }));
        chainSouvenirTemplates[1].push(SouvenirTemplate({
            name: "Gas Fee Receipt",
            description: "A souvenir from the days of high gas",
            category: SouvenirCategory.Badge,
            baseImageURI: "ipfs://...",
            weight: 200
        }));
        
        // BNB Chain 特色
        chainSouvenirTemplates[56].push(SouvenirTemplate({
            name: "Golden BNB Coin",
            description: "Shiny memento from BNB Chain",
            category: SouvenirCategory.Wearable,
            baseImageURI: "ipfs://...",
            weight: 150
        }));
        
        // Bitcoin 特色
        chainSouvenirTemplates[8332].push(SouvenirTemplate({
            name: "Satoshi's Note",
            description: "A mysterious note from the genesis block",
            category: SouvenirCategory.Badge,
            baseImageURI: "ipfs://...",
            weight: 50
        }));
    }
}
```

### 3.4 CrossChainHandler.sol (跨链处理器)

#### 3.4.1 ZetaChain 集成

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@zetachain/protocol-contracts/contracts/zevm/interfaces/zContract.sol";
import "@zetachain/protocol-contracts/contracts/zevm/SystemContract.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IZRC20.sol";

contract CrossChainHandler is zContract {
    // ============ State Variables ============
    SystemContract public systemContract;
    address public zetaFrogNFT;
    address public travelRegistry;
    address public souvenirNFT;
    
    // 跨链消息类型
    enum MessageType {
        TravelStart,
        TravelEnd,
        ObservationData
    }
    
    struct CrossChainMessage {
        MessageType msgType;
        uint256 frogId;
        bytes payload;
    }
    
    // 进行中的旅行 (frogId => 目标链信息)
    mapping(uint256 => PendingTravel) public pendingTravels;
    
    struct PendingTravel {
        uint256 targetChainId;
        address targetWallet;
        uint256 startTime;
        uint256 expectedEndTime;
        bool isActive;
    }
    
    // ============ Events ============
    event CrossChainTravelInitiated(uint256 indexed frogId, uint256 indexed targetChainId);
    event CrossChainDataReceived(uint256 indexed frogId, uint256 indexed sourceChainId, bytes data);
    event TravelCompleted(uint256 indexed frogId, bytes32 journalHash);
    
    // ============ Constructor ============
    constructor(address systemContractAddress) {
        systemContract = SystemContract(systemContractAddress);
    }
    
    // ============ ZetaChain Callback ============
    
    /// @notice 处理来自其他链的消息
    function onCrossChainCall(
        zContext calldata context,
        address zrc20,
        uint256 amount,
        bytes calldata message
    ) external override {
        require(msg.sender == address(systemContract), "Only system contract");
        
        CrossChainMessage memory ccMsg = abi.decode(message, (CrossChainMessage));
        
        if (ccMsg.msgType == MessageType.ObservationData) {
            _handleObservationData(ccMsg.frogId, context.chainID, ccMsg.payload);
        }
    }
    
    // ============ Travel Management ============
    
    /// @notice 发起跨链旅行
    function initiateTravel(
        uint256 frogId,
        uint256 targetChainId,
        address targetWallet,
        uint256 duration
    ) external {
        require(msg.sender == zetaFrogNFT, "Only FrogNFT can call");
        
        pendingTravels[frogId] = PendingTravel({
            targetChainId: targetChainId,
            targetWallet: targetWallet,
            startTime: block.timestamp,
            expectedEndTime: block.timestamp + duration,
            isActive: true
        });
        
        // 发送跨链消息到目标链的监听器合约 (如果存在)
        // 对于纯观察类旅行，这一步是可选的
        
        emit CrossChainTravelInitiated(frogId, targetChainId);
    }
    
    /// @notice 处理观察数据并完成旅行
    function _handleObservationData(
        uint256 frogId,
        uint256 sourceChainId,
        bytes memory observationData
    ) internal {
        PendingTravel storage travel = pendingTravels[frogId];
        require(travel.isActive, "No active travel");
        require(sourceChainId == travel.targetChainId, "Chain mismatch");
        
        // 解码观察数据
        (
            uint256 txCount,
            uint256 totalVolume,
            address[] memory interactedContracts,
            bytes32 journalHash
        ) = abi.decode(observationData, (uint256, uint256, address[], bytes32));
        
        // 生成纪念品
        uint256[] memory souvenirIds = _generateSouvenirs(
            frogId,
            sourceChainId,
            travel.expectedEndTime - travel.startTime,
            travel.targetWallet
        );
        
        // 记录旅行
        ITravelRegistry(travelRegistry).recordTravel(
            ITravelRegistry.TravelRecord({
                tokenId: frogId,
                chainId: sourceChainId,
                targetWallet: travel.targetWallet,
                startTime: travel.startTime,
                endTime: block.timestamp,
                journalHash: journalHash,
                souvenirIds: souvenirIds,
                outcome: ITravelRegistry.TravelOutcome.Success
            })
        );
        
        // 更新青蛙状态
        IZetaFrogNFT(zetaFrogNFT).endTravel(frogId, journalHash, souvenirIds);
        
        // 清理
        travel.isActive = false;
        
        emit TravelCompleted(frogId, journalHash);
    }
    
    // ============ Souvenir Generation ============
    
    function _generateSouvenirs(
        uint256 frogId,
        uint256 chainId,
        uint256 duration,
        address targetWallet
    ) internal returns (uint256[] memory) {
        // 基于旅行时长决定纪念品数量
        uint256 souvenirCount = 1; // 至少 1 个
        if (duration >= 1 days) souvenirCount++;
        if (duration >= 3 days) souvenirCount++;
        if (duration >= 7 days) souvenirCount++;
        
        uint256[] memory ids = new uint256[](souvenirCount);
        
        for (uint256 i = 0; i < souvenirCount; i++) {
            (ids[i], ) = ISouvenirNFT(souvenirNFT).generateSouvenir(
                chainId,
                duration,
                targetWallet
            );
        }
        
        return ids;
    }
}
```

### 3.5 FrogAttributes.sol (属性与等级系统)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FrogAttributes {
    // ============ Level System ============
    
    struct LevelInfo {
        uint256 level;
        uint256 currentExp;
        uint256 expToNextLevel;
    }
    
    mapping(uint256 => LevelInfo) public frogLevels;
    
    // 等级对应的经验值需求
    uint256[] public levelThresholds = [
        0,      // Level 1
        100,    // Level 2
        300,    // Level 3
        600,    // Level 4
        1000,   // Level 5
        1500,   // Level 6
        2100,   // Level 7
        2800,   // Level 8
        3600,   // Level 9
        4500    // Level 10 (Max)
    ];
    
    // ============ Titles System ============
    
    enum FrogTitle {
        Newcomer,           // 新手旅行者
        Explorer,           // 探索者
        Adventurer,         // 冒险家
        Globetrotter,       // 环球旅行者
        ChainHopper,        // 跨链达人
        LegendaryTraveler   // 传奇旅行者
    }
    
    mapping(uint256 => FrogTitle) public frogTitles;
    
    // ============ Experience Calculation ============
    
    /// @notice 计算一次旅行获得的经验值
    function calculateTravelExp(
        uint256 duration,
        uint256 chainId,
        bool isFirstVisit,
        ISouvenirNFT.SouvenirRarity highestRarity
    ) public pure returns (uint256 exp) {
        // 基础经验 (每小时 10 点)
        exp = (duration / 1 hours) * 10;
        
        // 首次访问链加成
        if (isFirstVisit) {
            exp += 50;
        }
        
        // 稀有纪念品加成
        if (highestRarity == ISouvenirNFT.SouvenirRarity.Legendary) {
            exp += 100;
        } else if (highestRarity == ISouvenirNFT.SouvenirRarity.Epic) {
            exp += 50;
        } else if (highestRarity == ISouvenirNFT.SouvenirRarity.Rare) {
            exp += 25;
        }
        
        // 上限 500 点/次
        if (exp > 500) exp = 500;
    }
    
    /// @notice 增加经验并检查升级
    function addExperience(uint256 frogId, uint256 exp) external returns (bool leveledUp) {
        LevelInfo storage info = frogLevels[frogId];
        info.currentExp += exp;
        
        // 检查升级
        while (info.level < 10 && info.currentExp >= levelThresholds[info.level]) {
            info.currentExp -= levelThresholds[info.level];
            info.level++;
            leveledUp = true;
        }
        
        // 更新称号
        _updateTitle(frogId, info.level);
    }
    
    function _updateTitle(uint256 frogId, uint256 level) internal {
        if (level >= 10) {
            frogTitles[frogId] = FrogTitle.LegendaryTraveler;
        } else if (level >= 8) {
            frogTitles[frogId] = FrogTitle.ChainHopper;
        } else if (level >= 6) {
            frogTitles[frogId] = FrogTitle.Globetrotter;
        } else if (level >= 4) {
            frogTitles[frogId] = FrogTitle.Adventurer;
        } else if (level >= 2) {
            frogTitles[frogId] = FrogTitle.Explorer;
        } else {
            frogTitles[frogId] = FrogTitle.Newcomer;
        }
    }
}
```

------

## 4. 跨链交互设计

### 4.1 支持的目标链

| 链名称    | Chain ID | 支持方式            | 观察能力                         |
| --------- | -------- | ------------------- | -------------------------------- |
| Ethereum  | 1        | ZetaChain Connector | ERC-20 转账、NFT 交易、DeFi 交互 |
| BNB Chain | 56       | ZetaChain Connector | BEP-20 转账、PancakeSwap 交互    |
| Polygon   | 137      | ZetaChain Connector | MATIC 转账、NFT 活动             |
| Bitcoin   | 8332     | ZetaChain BTC 支持  | UTXO 转账、Ordinals              |
| Base      | 8453     | ZetaChain Connector | ERC-20、NFT 活动                 |
| Arbitrum  | 42161    | ZetaChain Connector | L2 交易活动                      |

### 4.2 跨链消息流程

```
┌──────────────────────────────────────────────────────────────────┐
│                        Travel Flow                                │
└──────────────────────────────────────────────────────────────────┘

1. User Action (Frontend)
   │
   ▼
2. ZetaFrogNFT.startTravel(frogId, chainId, wallet, duration)
   │  - Verify ownership
   │  - Check frog status
   │  - Lock frog (status = Traveling)
   │
   ▼
3. CrossChainHandler.initiateTravel(...)
   │  - Record pending travel
   │  - Emit event for backend indexer
   │
   ▼
4. Backend Service (Off-chain)
   │  - Listen to TravelInitiated event
   │  - Start monitoring target wallet on target chain
   │  - Collect activity data
   │  - Generate AI story when duration ends
   │  - Upload story to IPFS
   │
   ▼
5. Backend calls CrossChainHandler.completeTravel(...)
   │  - Submit observation data + IPFS hash
   │  - Signed by authorized relayer
   │
   ▼
6. CrossChainHandler processes completion
   │  - Generate souvenirs
   │  - Record to TravelRegistry
   │  - Update frog attributes
   │  - Unlock frog (status = Idle)
   │
   ▼
7. Frontend receives events
   - Display return animation
   - Show new souvenirs
   - Present AI-generated story
```

### 4.3 数据观察策略

```solidity
/// @notice 定义可观察的链上活动类型
enum ObservableActivity {
    TokenTransfer,      // 代币转账
    NFTMintOrTransfer,  // NFT 相关
    DeFiSwap,           // DEX 交易
    Staking,            // 质押操作
    BridgeTransaction,  // 跨链桥交易
    ContractDeploy,     // 合约部署
    GovernanceVote      // 治理投票
}

/// @notice 观察数据结构
struct ObservationReport {
    uint256 chainId;
    address wallet;
    uint256 observationStart;
    uint256 observationEnd;
    
    // 活动统计
    uint256 totalTransactions;
    uint256 totalValueMoved;     // in USD equivalent
    uint256 uniqueContractsInteracted;
    
    // 特色发现
    ObservableActivity[] significantActivities;
    address[] notableContracts;  // e.g., Uniswap, OpenSea
    
    // 用于 AI 生成的原始数据
    bytes rawActivityData;
}
```

------

## 5. 安全规范

### 5.1 访问控制

```solidity
// ============ Access Control ============

import "@openzeppelin/contracts/access/AccessControl.sol";

contract ZetaFrogNFT is ERC721, AccessControl {
    bytes32 public constant TRAVEL_MANAGER_ROLE = keccak256("TRAVEL_MANAGER_ROLE");
    bytes32 public constant ATTRIBUTE_UPDATER_ROLE = keccak256("ATTRIBUTE_UPDATER_ROLE");
    
    modifier onlyTravelManager() {
        require(hasRole(TRAVEL_MANAGER_ROLE, msg.sender), "Not travel manager");
        _;
    }
    
    modifier onlyAttributeUpdater() {
        require(hasRole(ATTRIBUTE_UPDATER_ROLE, msg.sender), "Not attribute updater");
        _;
    }
}
```

### 5.2 重入保护

```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract ZetaFrogNFT is ERC721, ReentrancyGuard {
    function startTravel(...) external nonReentrant {
        // ...
    }
    
    function endTravel(...) external nonReentrant {
        // ...
    }
}
```

### 5.3 输入验证

```solidity
// ============ Input Validation ============

function startTravel(
    uint256 tokenId,
    uint256 targetChainId,
    address targetWallet,
    uint256 duration
) external {
    // 1. 所有权验证
    require(ownerOf(tokenId) == msg.sender, "Not the owner");
    
    // 2. 状态验证
    require(frogs[tokenId].status == FrogStatus.Idle, "Frog is busy");
    
    // 3. 参数范围验证
    require(duration >= MIN_TRAVEL_DURATION, "Duration too short");
    require(duration <= MAX_TRAVEL_DURATION, "Duration too long");
    
    // 4. 目标链验证
    require(_isSupportedChain(targetChainId), "Unsupported chain");
    
    // 5. 目标钱包验证 (非零地址)
    require(targetWallet != address(0), "Invalid target wallet");
    
    // 6. 冷却时间验证
    require(
        block.timestamp >= lastTravelEnd[tokenId] + COOLDOWN_PERIOD,
        "Still in cooldown"
    );
}
```

### 5.4 暂停机制

```solidity
import "@openzeppelin/contracts/security/Pausable.sol";

contract ZetaFrogNFT is ERC721, Pausable {
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function startTravel(...) external whenNotPaused {
        // ...
    }
}
```

### 5.5 升级策略

```solidity
// 使用 UUPS 代理模式
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract ZetaFrogNFTV1 is 
    ERC721Upgradeable,
    UUPSUpgradeable,
    OwnableUpgradeable 
{
    function initialize() public initializer {
        __ERC721_init("ZetaFrog", "ZFROG");
        __Ownable_init();
        __UUPSUpgradeable_init();
    }
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
```

------

## 6. Gas 优化

### 6.1 存储优化

```solidity
// ============ Storage Packing ============

// 不好的写法 (每个变量占用一个 slot)
struct FrogMetadataBad {
    uint256 birthday;        // slot 0
    uint256 totalTravels;    // slot 1
    uint256 totalChains;     // slot 2
    uint256 experiencePoints;// slot 3
    uint8 status;            // slot 4
}

// 优化后 (紧凑打包)
struct FrogMetadataOptimized {
    uint64 birthday;         // 
    uint32 totalTravels;     // 
    uint16 totalChains;      // slot 0 (8+4+2+4+1 = 19 bytes)
    uint32 experiencePoints; // 
    uint8 status;            //
}
```

### 6.2 批量操作

```solidity
/// @notice 批量领取纪念品
function batchClaimSouvenirs(uint256[] calldata souvenirIds) external {
    for (uint256 i = 0; i < souvenirIds.length; i++) {
        _claimSouvenir(souvenirIds[i]);
    }
}
```

### 6.3 事件替代存储

```solidity
// 对于历史查询，优先使用事件而非存储
event TravelCompleted(
    uint256 indexed tokenId,
    uint256 indexed chainId,
    bytes32 journalHash,
    uint256 timestamp
);

// 后端可以通过索引事件来重建历史，无需链上存储完整记录
```

------

## 7. 测试规范

### 7.1 单元测试用例

```javascript
// test/ZetaFrogNFT.test.js

describe("ZetaFrogNFT", function () {
    describe("Minting", function () {
        it("Should mint a frog with valid name", async function () {
            const tx = await zetaFrogNFT.mintFrog("Pepe");
            await expect(tx)
                .to.emit(zetaFrogNFT, "FrogMinted")
                .withArgs(owner.address, 0, "Pepe");
        });
        
        it("Should reject names shorter than 2 characters", async function () {
            await expect(zetaFrogNFT.mintFrog("A"))
                .to.be.revertedWith("Invalid name length");
        });
        
        it("Should reject names longer than 16 characters", async function () {
            await expect(zetaFrogNFT.mintFrog("A".repeat(17)))
                .to.be.revertedWith("Invalid name length");
        });
    });
    
    describe("Travel", function () {
        it("Should start travel for owned frog", async function () {
            await zetaFrogNFT.mintFrog("Traveler");
            const tx = await zetaFrogNFT.startTravel(
                0,                    // tokenId
                1,                    // Ethereum
                targetWallet.address, // target
                3600                  // 1 hour
            );
            
            const frog = await zetaFrogNFT.getFrogMetadata(0);
            expect(frog.status).to.equal(1); // Traveling
        });
        
        it("Should reject travel for non-owned frog", async function () {
            await zetaFrogNFT.mintFrog("NotMine");
            await expect(
                zetaFrogNFT.connect(otherUser).startTravel(0, 1, targetWallet.address, 3600)
            ).to.be.revertedWith("Not the owner");
        });
        
        it("Should reject travel during cooldown", async function () {
            // ... complete a travel first
            await expect(
                zetaFrogNFT.startTravel(0, 1, targetWallet.address, 3600)
            ).to.be.revertedWith("Still in cooldown");
        });
    });
    
    describe("Souvenirs", function () {
        it("Should generate souvenirs based on travel duration", async function () {
            // 7 day travel should yield 4 souvenirs
            // ...
        });
        
        it("Should respect rarity distribution over many samples", async function () {
            // Statistical test over 1000 generations
            // ...
        });
    });
});
```

### 7.2 集成测试

```javascript
describe("Cross-Chain Integration", function () {
    it("Should complete full travel cycle", async function () {
        // 1. Mint frog
        await zetaFrogNFT.mintFrog("CrossChainFrog");
        
        // 2. Start travel
        await zetaFrogNFT.startTravel(0, 1, targetWallet.address, 3600);
        
        // 3. Simulate time passing
        await network.provider.send("evm_increaseTime", [3700]);
        await network.provider.send("evm_mine");
        
        // 4. Submit observation data (as authorized relayer)
        await crossChainHandler.connect(relayer).submitObservation(
            0, // frogId
            observationData
        );
        
        // 5. Verify results
        const frog = await zetaFrogNFT.getFrogMetadata(0);
        expect(frog.status).to.equal(0); // Idle
        expect(frog.totalTravels).to.equal(1);
        
        const history = await travelRegistry.getTravelHistory(0);
        expect(history.length).to.equal(1);
    });
});
```

### 7.3 测试覆盖率要求

| 模块              | 最低覆盖率 |
| ----------------- | ---------- |
| ZetaFrogNFT       | 95%        |
| TravelRegistry    | 90%        |
| SouvenirNFT       | 90%        |
| CrossChainHandler | 85%        |
| FrogAttributes    | 90%        |

------

## 8. 部署规范

### 8.1 部署顺序

```
1. Deploy FrogAttributes.sol
2. Deploy TravelRegistry.sol
3. Deploy SouvenirNFT.sol
4. Deploy CrossChainHandler.sol (with ZetaChain system contract)
5. Deploy ZetaFrogNFT.sol
6. Configure cross-references:
   - ZetaFrogNFT.setTravelRegistry(...)
   - ZetaFrogNFT.setCrossChainHandler(...)
   - ZetaFrogNFT.setSouvenirNFT(...)
   - TravelRegistry.setZetaFrogNFT(...)
   - CrossChainHandler.setZetaFrogNFT(...)
   - SouvenirNFT.setCrossChainHandler(...)
7. Initialize chain souvenirs
8. Grant roles
9. Verify all contracts on explorer
```

### 8.2 部署脚本

```javascript
// scripts/deploy.js
const { ethers, upgrades } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with:", deployer.address);
    
    // 1. Deploy FrogAttributes
    const FrogAttributes = await ethers.getContractFactory("FrogAttributes");
    const frogAttributes = await FrogAttributes.deploy();
    await frogAttributes.deployed();
    console.log("FrogAttributes:", frogAttributes.address);
    
    // 2. Deploy TravelRegistry
    const TravelRegistry = await ethers.getContractFactory("TravelRegistry");
    const travelRegistry = await TravelRegistry.deploy();
    await travelRegistry.deployed();
    console.log("TravelRegistry:", travelRegistry.address);
    
    // ... continue with other contracts
    
    // Configuration
    await zetaFrogNFT.setTravelRegistry(travelRegistry.address);
    await zetaFrogNFT.setCrossChainHandler(crossChainHandler.address);
    // ...
    
    // Initialize
    await souvenirNFT.initializeChainSouvenirs();
    await travelRegistry.initializeSupportedChains();
    
    console.log("Deployment complete!");
}

main().catch(console.error);
```

### 8.3 网络配置

```javascript
// hardhat.config.js
module.exports = {
    networks: {
        zetaTestnet: {
            url: "https://zetachain-athens-evm.blockpi.network/v1/rpc/public",
            chainId: 7001,
            accounts: [process.env.PRIVATE_KEY],
        },
        zetaMainnet: {
            url: "https://zetachain-evm.blockpi.network/v1/rpc/public",
            chainId: 7000,
            accounts: [process.env.PRIVATE_KEY],
        },
    },
    etherscan: {
        apiKey: {
            zetaTestnet: process.env.ZETASCAN_API_KEY,
            zetaMainnet: process.env.ZETASCAN_API_KEY,
        },
        customChains: [
            {
                network: "zetaTestnet",
                chainId: 7001,
                urls: {
                    apiURL: "https://athens.explorer.zetachain.com/api",
                    browserURL: "https://athens.explorer.zetachain.com",
                },
            },
        ],
    },
};
```

------

## 9. 监控与维护

### 9.1 关键指标

| 指标                      | 描述           | 告警阈值  |
| ------------------------- | -------------- | --------- |
| Total Frogs Minted        | 已铸造青蛙总数 | N/A       |
| Active Travels            | 进行中的旅行数 | > 1000    |
| Failed Travel Completions | 失败的旅行完成 | > 5/hour  |
| Average Travel Duration   | 平均旅行时长   | N/A       |
| Souvenir Generation Rate  | 纪念品生成速率 | N/A       |
| Contract Balance          | 合约 ZETA 余额 | < 10 ZETA |

### 9.2 事件监听

```javascript
// Backend event listener
const events = [
    "FrogMinted",
    "FrogTravelStarted",
    "FrogTravelEnded",
    "SouvenirMinted",
    "TravelRecorded"
];

for (const eventName of events) {
    contract.on(eventName, (...args) => {
        logger.info(`Event ${eventName}:`, args);
        metrics.increment(`event.${eventName}`);
    });
}
```

------

## 10. 附录

### 10.1 合约地址 (Testnet)

| 合约              | 地址 | 说明        |
| ----------------- | ---- | ----------- |
| ZetaFrogNFT       | TBD  | 主 NFT 合约 |
| TravelRegistry    | TBD  | 旅行记录    |
| SouvenirNFT       | TBD  | 纪念品 NFT  |
| CrossChainHandler | TBD  | 跨链处理    |
| FrogAttributes    | TBD  | 属性系统    |

### 10.2 ABI 导出

所有合约 ABI 将在编译后导出至 `artifacts/` 目录，并同步至前端和后端项目。

### 10.3 版本历史

| 版本  | 日期       | 变更说明               |
| ----- | ---------- | ---------------------- |
| 0.1.0 | 2024-12-17 | 初始版本，核心功能定义 |

------

**文档状态**: Draft
**最后更新**: 2024-12-17
**作者**: ZetaFrog Team