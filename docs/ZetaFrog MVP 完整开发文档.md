# ZetaFrog MVP 完整开发文档

## 📋 目录

1. MVP 范围定义
2. 系统架构总览
3. 智能合约层
4. 后端服务层
5. 前端应用层
6. 开发里程碑
7. 部署指南

------

## 1. MVP 范围定义

### 1.1 MVP 核心功能

| 功能模块              | MVP 包含 | 未来版本 |
| --------------------- | -------- | -------- |
| 青蛙 NFT 铸造         | ✅        | -        |
| 单链旅行 (Ethereum)   | ✅        | -        |
| 多链旅行              | ❌        | v1.1     |
| 钱包观察 (基础)       | ✅        | -        |
| AI 故事生成 (简化)    | ✅        | -        |
| 纪念品 NFT (3种)      | ✅        | -        |
| 纪念品 NFT (完整系统) | ❌        | v1.1     |
| 桌面宠物动画 (基础)   | ✅        | -        |
| 桌面宠物动画 (丰富)   | ❌        | v1.2     |
| 等级系统              | ❌        | v1.1     |
| 社交功能              | ❌        | v2.0     |

### 1.2 MVP 用户故事

```
作为用户，我可以：
1. 连接钱包并铸造一只属于自己的青蛙 NFT
2. 输入一个以太坊钱包地址，派青蛙去"旅行观察"
3. 设置旅行时长 (1小时 / 6小时 / 24小时)
4. 等待旅行结束后，查看 AI 生成的旅行日记
5. 获得一个纪念品 NFT
6. 在桌面看到青蛙的简单动画状态
```

### 1.3 技术栈确认

| 层级     | 技术选型                                               |
| -------- | ------------------------------------------------------ |
| **合约** | Solidity 0.8.20, Hardhat, ZetaChain Athens Testnet     |
| **后端** | Node.js 18+, Express, Prisma, PostgreSQL, Redis        |
| **前端** | React 18, Vite, TailwindCSS, Framer Motion, wagmi/viem |
| **AI**   | OpenAI GPT-4o-mini API                                 |
| **存储** | IPFS (Pinata), AWS S3 (备份)                           |

------

## 2. 系统架构总览

### 2.1 架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           用户浏览器                                     │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    React Frontend (Vite)                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐   │  │
│  │  │ 钱包连接     │  │ 青蛙管理    │  │ 桌面宠物组件            │   │  │
│  │  │ (wagmi)     │  │ (铸造/旅行) │  │ (Framer Motion)         │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
           │                      │                        │
           │ wagmi/viem           │ REST API              │ WebSocket
           ▼                      ▼                        ▼
┌─────────────────┐    ┌─────────────────────────────────────────────────┐
│   ZetaChain     │    │              Backend (Node.js/Express)          │
│   Testnet       │    │  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  ┌───────────┐  │    │  │ API Server  │  │ Chain       │  │ AI      │ │
│  │ ZetaFrog  │◄─┼────┼──│ (Express)   │  │ Observer    │  │ Service │ │
│  │ Contracts │  │    │  └─────────────┘  └─────────────┘  └─────────┘ │
│  └───────────┘  │    │         │                │              │      │
└─────────────────┘    │         ▼                ▼              ▼      │
                       │  ┌─────────────────────────────────────────┐   │
                       │  │           PostgreSQL + Redis            │   │
                       │  └─────────────────────────────────────────┘   │
                       └─────────────────────────────────────────────────┘
                                          │
                                          ▼
                       ┌─────────────────────────────────────────────────┐
                       │              External Services                  │
                       │  ┌─────────┐  ┌─────────┐  ┌─────────────────┐ │
                       │  │ Alchemy │  │ OpenAI  │  │ Pinata (IPFS)   │ │
                       │  │ RPC     │  │ API     │  │                 │ │
                       │  └─────────┘  └─────────┘  └─────────────────┘ │
                       └─────────────────────────────────────────────────┘
```

### 2.2 数据流

```
铸造青蛙:
User → Frontend → Contract.mintFrog() → Event → Backend (索引) → DB

发起旅行:
User → Frontend → Contract.startTravel() → Event → Backend
                                                      ↓
                                              开始监控目标钱包
                                                      ↓
                                              收集链上活动数据
                                                      ↓
                                              AI 生成故事
                                                      ↓
                                              上传 IPFS
                                                      ↓
                                              Contract.endTravel()
                                                      ↓
                                              铸造纪念品 NFT
                                                      ↓
User ← Frontend ← WebSocket 通知 ←──────────────────────┘
```

------

## 3. 智能合约层

### 3.1 合约结构 (MVP 简化版)

```
contracts/
├── ZetaFrogNFT.sol      # 主合约：青蛙 NFT + 旅行逻辑
├── SouvenirNFT.sol      # 纪念品 NFT (ERC-1155)
└── interfaces/
    ├── IZetaFrogNFT.sol
    └── ISouvenirNFT.sol
```

### 3.2 ZetaFrogNFT.sol (完整代码)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title ZetaFrogNFT
 * @notice MVP version of the ZetaFrog Desktop Pet NFT
 * @dev Simplified single-contract implementation for hackathon
 */
contract ZetaFrogNFT is ERC721URIStorage, Ownable, ReentrancyGuard, Pausable {
    // ============ Constants ============
    uint256 public constant MAX_SUPPLY = 1000; // MVP 限量
    uint256 public constant MIN_TRAVEL_DURATION = 1 hours;
    uint256 public constant MAX_TRAVEL_DURATION = 24 hours;
    uint256 public constant COOLDOWN_PERIOD = 10 minutes;

    // ============ Enums ============
    enum FrogStatus {
        Idle,       // 在家
        Traveling,  // 旅行中
        Returning   // 返程中
    }

    // ============ Structs ============
    struct Frog {
        string name;
        uint64 birthday;
        uint32 totalTravels;
        FrogStatus status;
    }

    struct Travel {
        uint64 startTime;
        uint64 endTime;
        address targetWallet;
        bool completed;
    }

    // ============ State Variables ============
    uint256 private _tokenIdCounter;
    
    mapping(uint256 => Frog) public frogs;
    mapping(uint256 => Travel) public activeTravels;
    mapping(uint256 => uint64) public lastTravelEnd;
    mapping(uint256 => string[]) public travelJournals; // tokenId => IPFS hashes
    
    address public souvenirNFT;
    address public travelManager; // Backend relayer address
    
    // ============ Events ============
    event FrogMinted(
        address indexed owner, 
        uint256 indexed tokenId, 
        string name,
        uint256 timestamp
    );
    
    event TravelStarted(
        uint256 indexed tokenId,
        address indexed targetWallet,
        uint64 startTime,
        uint64 endTime
    );
    
    event TravelCompleted(
        uint256 indexed tokenId,
        string journalHash,
        uint256 souvenirId,
        uint256 timestamp
    );
    
    event TravelCancelled(uint256 indexed tokenId, uint256 timestamp);

    // ============ Modifiers ============
    modifier onlyTravelManager() {
        require(msg.sender == travelManager, "Not travel manager");
        _;
    }
    
    modifier onlyFrogOwner(uint256 tokenId) {
        require(ownerOf(tokenId) == msg.sender, "Not frog owner");
        _;
    }

    // ============ Constructor ============
    constructor() ERC721("ZetaFrog", "ZFROG") Ownable(msg.sender) {
        travelManager = msg.sender; // 初始设为部署者
    }

    // ============ Admin Functions ============
    function setTravelManager(address _manager) external onlyOwner {
        require(_manager != address(0), "Invalid address");
        travelManager = _manager;
    }
    
    function setSouvenirNFT(address _souvenir) external onlyOwner {
        require(_souvenir != address(0), "Invalid address");
        souvenirNFT = _souvenir;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ Core Functions ============
    
    /**
     * @notice Mint a new frog NFT
     * @param name Frog name (2-16 characters)
     */
    function mintFrog(string calldata name) external whenNotPaused nonReentrant returns (uint256) {
        // Validation
        bytes memory nameBytes = bytes(name);
        require(nameBytes.length >= 2 && nameBytes.length <= 16, "Name: 2-16 chars");
        require(_tokenIdCounter < MAX_SUPPLY, "Max supply reached");
        
        uint256 tokenId = _tokenIdCounter++;
        
        _safeMint(msg.sender, tokenId);
        
        frogs[tokenId] = Frog({
            name: name,
            birthday: uint64(block.timestamp),
            totalTravels: 0,
            status: FrogStatus.Idle
        });
        
        // Generate initial metadata URI (can be updated later)
        string memory uri = _generateInitialURI(tokenId, name);
        _setTokenURI(tokenId, uri);
        
        emit FrogMinted(msg.sender, tokenId, name, block.timestamp);
        
        return tokenId;
    }
    
    /**
     * @notice Start a travel journey
     * @param tokenId Frog NFT ID
     * @param targetWallet Wallet address to observe
     * @param duration Travel duration in seconds
     */
    function startTravel(
        uint256 tokenId,
        address targetWallet,
        uint256 duration
    ) external whenNotPaused nonReentrant onlyFrogOwner(tokenId) {
        Frog storage frog = frogs[tokenId];
        
        // Validations
        require(frog.status == FrogStatus.Idle, "Frog is busy");
        require(targetWallet != address(0), "Invalid target");
        require(duration >= MIN_TRAVEL_DURATION, "Duration too short");
        require(duration <= MAX_TRAVEL_DURATION, "Duration too long");
        require(
            block.timestamp >= lastTravelEnd[tokenId] + COOLDOWN_PERIOD,
            "Still in cooldown"
        );
        
        // Update state
        frog.status = FrogStatus.Traveling;
        
        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = uint64(block.timestamp + duration);
        
        activeTravels[tokenId] = Travel({
            startTime: startTime,
            endTime: endTime,
            targetWallet: targetWallet,
            completed: false
        });
        
        emit TravelStarted(tokenId, targetWallet, startTime, endTime);
    }
    
    /**
     * @notice Complete a travel (called by backend)
     * @param tokenId Frog NFT ID
     * @param journalHash IPFS hash of the AI-generated journal
     * @param souvenirId ID of minted souvenir (0 if none)
     */
    function completeTravel(
        uint256 tokenId,
        string calldata journalHash,
        uint256 souvenirId
    ) external onlyTravelManager nonReentrant {
        Frog storage frog = frogs[tokenId];
        Travel storage travel = activeTravels[tokenId];
        
        require(frog.status == FrogStatus.Traveling, "Not traveling");
        require(!travel.completed, "Already completed");
        require(block.timestamp >= travel.endTime, "Travel not ended");
        
        // Update state
        frog.status = FrogStatus.Idle;
        frog.totalTravels++;
        travel.completed = true;
        lastTravelEnd[tokenId] = uint64(block.timestamp);
        
        // Store journal hash
        travelJournals[tokenId].push(journalHash);
        
        emit TravelCompleted(tokenId, journalHash, souvenirId, block.timestamp);
    }
    
    /**
     * @notice Cancel ongoing travel (emergency)
     * @param tokenId Frog NFT ID
     */
    function cancelTravel(uint256 tokenId) external onlyFrogOwner(tokenId) {
        Frog storage frog = frogs[tokenId];
        require(frog.status == FrogStatus.Traveling, "Not traveling");
        
        frog.status = FrogStatus.Idle;
        activeTravels[tokenId].completed = true;
        lastTravelEnd[tokenId] = uint64(block.timestamp);
        
        emit TravelCancelled(tokenId, block.timestamp);
    }

    // ============ View Functions ============
    
    function getFrog(uint256 tokenId) external view returns (
        string memory name,
        uint64 birthday,
        uint32 totalTravels,
        FrogStatus status
    ) {
        Frog memory frog = frogs[tokenId];
        return (frog.name, frog.birthday, frog.totalTravels, frog.status);
    }
    
    function getActiveTravel(uint256 tokenId) external view returns (
        uint64 startTime,
        uint64 endTime,
        address targetWallet,
        bool completed
    ) {
        Travel memory travel = activeTravels[tokenId];
        return (travel.startTime, travel.endTime, travel.targetWallet, travel.completed);
    }
    
    function getTravelJournals(uint256 tokenId) external view returns (string[] memory) {
        return travelJournals[tokenId];
    }
    
    function canTravel(uint256 tokenId) external view returns (bool) {
        if (!_exists(tokenId)) return false;
        Frog memory frog = frogs[tokenId];
        if (frog.status != FrogStatus.Idle) return false;
        if (block.timestamp < lastTravelEnd[tokenId] + COOLDOWN_PERIOD) return false;
        return true;
    }
    
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }

    // ============ Internal Functions ============
    
    function _exists(uint256 tokenId) internal view returns (bool) {
        return tokenId < _tokenIdCounter;
    }
    
    function _generateInitialURI(uint256 tokenId, string memory name) internal pure returns (string memory) {
        // MVP: 返回占位符 URI，实际图片由前端/后端生成
        return string(abi.encodePacked(
            "data:application/json;base64,",
            _encodeBase64(abi.encodePacked(
                '{"name":"', name, '",',
                '"description":"A ZetaFrog Desktop Pet",',
                '"image":"ipfs://placeholder",',
                '"attributes":[{"trait_type":"ID","value":"', _toString(tokenId), '"}]}'
            ))
        ));
    }
    
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    function _encodeBase64(bytes memory data) internal pure returns (string memory) {
        // Simplified base64 - in production use a library
        // For MVP, can just return the raw JSON and let frontend handle it
        return string(data);
    }
}
```

### 3.3 SouvenirNFT.sol (完整代码)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SouvenirNFT
 * @notice MVP Souvenir NFTs earned from frog travels
 */
contract SouvenirNFT is ERC1155, Ownable {
    // ============ Enums ============
    enum Rarity { Common, Uncommon, Rare }
    
    // ============ Structs ============
    struct Souvenir {
        string name;
        Rarity rarity;
        uint256 frogId;      // 关联的青蛙
        uint64 mintTime;
        string metadataURI;
    }
    
    // ============ State Variables ============
    uint256 private _tokenIdCounter;
    
    mapping(uint256 => Souvenir) public souvenirs;
    mapping(uint256 => uint256[]) public frogSouvenirs; // frogId => souvenirIds
    
    address public zetaFrogNFT;
    address public minter; // Backend address
    
    // MVP: 预定义的 3 种纪念品
    string[3] public souvenirNames = [
        "Ethereum Postcard",
        "Gas Fee Receipt", 
        "Blockchain Snowglobe"
    ];
    
    // ============ Events ============
    event SouvenirMinted(
        uint256 indexed souvenirId,
        uint256 indexed frogId,
        address indexed owner,
        Rarity rarity,
        string name
    );

    // ============ Constructor ============
    constructor() ERC1155("") Ownable(msg.sender) {
        minter = msg.sender;
    }

    // ============ Admin Functions ============
    function setMinter(address _minter) external onlyOwner {
        minter = _minter;
    }
    
    function setZetaFrogNFT(address _zetaFrog) external onlyOwner {
        zetaFrogNFT = _zetaFrog;
    }

    // ============ Core Functions ============
    
    /**
     * @notice Mint a souvenir for a frog
     * @param to Owner address
     * @param frogId Associated frog NFT ID
     * @param rarityRoll Random number for rarity (0-99)
     */
    function mintSouvenir(
        address to,
        uint256 frogId,
        uint256 rarityRoll
    ) external returns (uint256) {
        require(msg.sender == minter, "Not minter");
        
        uint256 souvenirId = _tokenIdCounter++;
        
        // Determine rarity: 70% Common, 25% Uncommon, 5% Rare
        Rarity rarity;
        if (rarityRoll < 70) {
            rarity = Rarity.Common;
        } else if (rarityRoll < 95) {
            rarity = Rarity.Uncommon;
        } else {
            rarity = Rarity.Rare;
        }
        
        // Select souvenir name based on rarity
        string memory name = souvenirNames[uint256(rarity)];
        
        souvenirs[souvenirId] = Souvenir({
            name: name,
            rarity: rarity,
            frogId: frogId,
            mintTime: uint64(block.timestamp),
            metadataURI: ""
        });
        
        frogSouvenirs[frogId].push(souvenirId);
        
        _mint(to, souvenirId, 1, "");
        
        emit SouvenirMinted(souvenirId, frogId, to, rarity, name);
        
        return souvenirId;
    }
    
    /**
     * @notice Update souvenir metadata URI (called by backend after IPFS upload)
     */
    function setMetadataURI(uint256 souvenirId, string calldata uri) external {
        require(msg.sender == minter, "Not minter");
        souvenirs[souvenirId].metadataURI = uri;
    }

    // ============ View Functions ============
    
    function getSouvenir(uint256 souvenirId) external view returns (
        string memory name,
        Rarity rarity,
        uint256 frogId,
        uint64 mintTime,
        string memory metadataURI
    ) {
        Souvenir memory s = souvenirs[souvenirId];
        return (s.name, s.rarity, s.frogId, s.mintTime, s.metadataURI);
    }
    
    function getFrogSouvenirs(uint256 frogId) external view returns (uint256[] memory) {
        return frogSouvenirs[frogId];
    }
    
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }
    
    function uri(uint256 tokenId) public view override returns (string memory) {
        return souvenirs[tokenId].metadataURI;
    }
}
```

### 3.4 部署脚本

```javascript
// scripts/deploy.js
const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with:", deployer.address);
    console.log("Balance:", (await deployer.provider.getBalance(deployer.address)).toString());

    // 1. Deploy ZetaFrogNFT
    const ZetaFrogNFT = await hre.ethers.getContractFactory("ZetaFrogNFT");
    const zetaFrogNFT = await ZetaFrogNFT.deploy();
    await zetaFrogNFT.waitForDeployment();
    const frogAddress = await zetaFrogNFT.getAddress();
    console.log("ZetaFrogNFT deployed to:", frogAddress);

    // 2. Deploy SouvenirNFT
    const SouvenirNFT = await hre.ethers.getContractFactory("SouvenirNFT");
    const souvenirNFT = await SouvenirNFT.deploy();
    await souvenirNFT.waitForDeployment();
    const souvenirAddress = await souvenirNFT.getAddress();
    console.log("SouvenirNFT deployed to:", souvenirAddress);

    // 3. Configure contracts
    console.log("Configuring contracts...");
    
    await zetaFrogNFT.setSouvenirNFT(souvenirAddress);
    console.log("- ZetaFrogNFT.setSouvenirNFT done");
    
    await souvenirNFT.setZetaFrogNFT(frogAddress);
    console.log("- SouvenirNFT.setZetaFrogNFT done");

    // 4. Output deployment info
    console.log("\n========== Deployment Complete ==========");
    console.log("ZetaFrogNFT:", frogAddress);
    console.log("SouvenirNFT:", souvenirAddress);
    console.log("Owner/TravelManager:", deployer.address);
    console.log("==========================================\n");

    // 5. Verify contracts (if not local)
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("Waiting for block confirmations...");
        await zetaFrogNFT.deploymentTransaction().wait(5);
        
        console.log("Verifying contracts...");
        try {
            await hre.run("verify:verify", {
                address: frogAddress,
                constructorArguments: [],
            });
            await hre.run("verify:verify", {
                address: souvenirAddress,
                constructorArguments: [],
            });
        } catch (e) {
            console.log("Verification failed:", e.message);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
```

### 3.5 Hardhat 配置

```javascript
// hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        hardhat: {
            chainId: 31337,
        },
        zetaAthens: {
            url: "https://zetachain-athens-evm.blockpi.network/v1/rpc/public",
            chainId: 7001,
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
        },
    },
    etherscan: {
        apiKey: {
            zetaAthens: process.env.ZETASCAN_API_KEY || "placeholder",
        },
        customChains: [
            {
                network: "zetaAthens",
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

## 4. 后端服务层

### 4.1 项目结构

```
backend/
├── src/
│   ├── index.ts                 # 入口
│   ├── config/
│   │   ├── index.ts             # 配置加载
│   │   └── contracts.ts         # 合约地址和 ABI
│   ├── api/
│   │   ├── routes/
│   │   │   ├── frog.routes.ts   # 青蛙相关 API
│   │   │   ├── travel.routes.ts # 旅行相关 API
│   │   │   └── health.routes.ts # 健康检查
│   │   └── middleware/
│   │       ├── auth.ts          # 钱包签名验证
│   │       └── rateLimit.ts     # 限流
│   ├── services/
│   │   ├── chain.service.ts     # 链上交互
│   │   ├── observer.service.ts  # 钱包观察
│   │   ├── ai.service.ts        # AI 故事生成
│   │   ├── ipfs.service.ts      # IPFS 上传
│   │   └── travel.service.ts    # 旅行业务逻辑
│   ├── workers/
│   │   ├── eventListener.ts     # 合约事件监听
│   │   └── travelProcessor.ts   # 旅行完成处理
│   ├── db/
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── redis.ts
│   └── utils/
│       ├── logger.ts
│       └── helpers.ts
├── package.json
├── tsconfig.json
├── .env.example
└── Dockerfile
```

### 4.2 数据库 Schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Frog {
  id            Int       @id @default(autoincrement())
  tokenId       Int       @unique
  name          String
  ownerAddress  String
  birthday      DateTime
  totalTravels  Int       @default(0)
  status        FrogStatus @default(Idle)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  travels       Travel[]
  souvenirs     Souvenir[]
  
  @@index([ownerAddress])
}

model Travel {
  id            Int       @id @default(autoincrement())
  frogId        Int
  frog          Frog      @relation(fields: [frogId], references: [id])
  
  targetWallet  String
  startTime     DateTime
  endTime       DateTime
  
  status        TravelStatus @default(Active)
  
  // 观察数据
  observedTxCount     Int?
  observedTotalValue  String?   // BigInt as string
  
  // 生成结果
  journalHash   String?
  journalContent String?  @db.Text
  
  souvenirId    Int?
  souvenir      Souvenir? @relation(fields: [souvenirId], references: [id])
  
  completedAt   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([frogId])
  @@index([status])
  @@index([endTime])
}

model Souvenir {
  id            Int       @id @default(autoincrement())
  tokenId       Int       @unique
  frogId        Int
  frog          Frog      @relation(fields: [frogId], references: [id])
  
  name          String
  rarity        Rarity
  metadataUri   String?
  
  mintedAt      DateTime
  createdAt     DateTime  @default(now())
  
  travels       Travel[]
  
  @@index([frogId])
}

model WalletObservation {
  id            Int       @id @default(autoincrement())
  travelId      Int
  
  walletAddress String
  chainId       Int
  
  // 观察到的活动
  transactions  Json      // Array of tx summaries
  totalTxCount  Int
  totalValueWei String    // BigInt as string
  
  // 有趣发现
  notableEvents Json?     // Array of notable findings
  
  observedFrom  DateTime
  observedTo    DateTime
  createdAt     DateTime  @default(now())
  
  @@index([travelId])
  @@index([walletAddress])
}

enum FrogStatus {
  Idle
  Traveling
  Returning
}

enum TravelStatus {
  Active
  Processing
  Completed
  Cancelled
  Failed
}

enum Rarity {
  Common
  Uncommon
  Rare
}
```

### 4.3 核心服务实现

#### 4.3.1 链观察服务 (observer.service.ts)

```typescript
// src/services/observer.service.ts

import { createPublicClient, http, parseAbiItem, formatEther } from 'viem';
import { mainnet } from 'viem/chains';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface ObservationResult {
  walletAddress: string;
  chainId: number;
  transactions: TransactionSummary[];
  totalTxCount: number;
  totalValueWei: bigint;
  notableEvents: NotableEvent[];
  observedFrom: Date;
  observedTo: Date;
}

export interface TransactionSummary {
  hash: string;
  timestamp: number;
  type: 'send' | 'receive' | 'contract';
  value: string;
  to?: string;
  from?: string;
  method?: string;
}

export interface NotableEvent {
  type: 'large_transfer' | 'nft_activity' | 'defi_swap' | 'contract_deploy';
  description: string;
  txHash: string;
  timestamp: number;
}

class ObserverService {
  private ethClient;
  
  constructor() {
    this.ethClient = createPublicClient({
      chain: mainnet,
      transport: http(config.ALCHEMY_ETH_URL),
    });
  }
  
  /**
   * 观察指定钱包在时间段内的活动
   */
  async observeWallet(
    walletAddress: string,
    fromTime: Date,
    toTime: Date
  ): Promise<ObservationResult> {
    logger.info(`Observing wallet ${walletAddress} from ${fromTime} to ${toTime}`);
    
    const address = walletAddress as `0x${string}`;
    const transactions: TransactionSummary[] = [];
    const notableEvents: NotableEvent[] = [];
    let totalValueWei = BigInt(0);
    
    try {
      // 1. 获取时间范围内的区块
      const fromBlock = await this.getBlockNumberByTimestamp(fromTime);
      const toBlock = await this.getBlockNumberByTimestamp(toTime);
      
      // 2. 查询转账事件 (ERC-20 Transfer)
      const transferLogs = await this.ethClient.getLogs({
        address: undefined, // 所有合约
        event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
        args: {
          from: address,
        },
        fromBlock: BigInt(fromBlock),
        toBlock: BigInt(toBlock),
      });
      
      // 3. 查询接收事件
      const receiveLogs = await this.ethClient.getLogs({
        event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
        args: {
          to: address,
        },
        fromBlock: BigInt(fromBlock),
        toBlock: BigInt(toBlock),
      });
      
      // 4. 处理发送交易
      for (const log of transferLogs) {
        const value = log.args.value || BigInt(0);
        totalValueWei += value;
        
        transactions.push({
          hash: log.transactionHash,
          timestamp: Date.now(), // 简化：实际应查询区块时间
          type: 'send',
          value: formatEther(value),
          to: log.args.to,
        });
        
        // 检查大额转账
        if (value > BigInt(10) * BigInt(10 ** 18)) { // > 10 ETH
          notableEvents.push({
            type: 'large_transfer',
            description: `Sent ${formatEther(value)} ETH`,
            txHash: log.transactionHash,
            timestamp: Date.now(),
          });
        }
      }
      
      // 5. 处理接收交易
      for (const log of receiveLogs) {
        const value = log.args.value || BigInt(0);
        
        transactions.push({
          hash: log.transactionHash,
          timestamp: Date.now(),
          type: 'receive',
          value: formatEther(value),
          from: log.args.from,
        });
      }
      
      // 6. 查询 NFT 活动 (ERC-721)
      const nftLogs = await this.ethClient.getLogs({
        event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
        args: {
          from: address,
        },
        fromBlock: BigInt(fromBlock),
        toBlock: BigInt(toBlock),
      });
      
      if (nftLogs.length > 0) {
        notableEvents.push({
          type: 'nft_activity',
          description: `Transferred ${nftLogs.length} NFT(s)`,
          txHash: nftLogs[0].transactionHash,
          timestamp: Date.now(),
        });
      }
      
      logger.info(`Observation complete: ${transactions.length} transactions found`);
      
      return {
        walletAddress,
        chainId: 1,
        transactions,
        totalTxCount: transactions.length,
        totalValueWei,
        notableEvents,
        observedFrom: fromTime,
        observedTo: toTime,
      };
      
    } catch (error) {
      logger.error('Observation failed:', error);
      
      // 返回空结果而非抛出错误
      return {
        walletAddress,
        chainId: 1,
        transactions: [],
        totalTxCount: 0,
        totalValueWei: BigInt(0),
        notableEvents: [],
        observedFrom: fromTime,
        observedTo: toTime,
      };
    }
  }
  
  /**
   * 根据时间戳获取最近的区块号
   */
  private async getBlockNumberByTimestamp(timestamp: Date): Promise<number> {
    // 简化实现：使用 Etherscan API 或估算
    // MVP: 使用当前区块并向前估算
    const currentBlock = await this.ethClient.getBlockNumber();
    const currentTime = Date.now() / 1000;
    const targetTime = timestamp.getTime() / 1000;
    
    // 以太坊约 12 秒一个区块
    const blockDiff = Math.floor((currentTime - targetTime) / 12);
    
    return Math.max(0, Number(currentBlock) - blockDiff);
  }
}

export const observerService = new ObserverService();
```

#### 4.3.2 AI 故事生成服务 (ai.service.ts)

```typescript
// src/services/ai.service.ts

import OpenAI from 'openai';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ObservationResult, NotableEvent } from './observer.service';

export interface GeneratedJournal {
  title: string;
  content: string;
  mood: 'happy' | 'excited' | 'thoughtful' | 'adventurous' | 'tired';
  highlights: string[];
}

class AIService {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.OPENAI_API_KEY,
    });
  }
  
  /**
   * 根据观察数据生成旅行日记
   */
  async generateJournal(
    frogName: string,
    observation: ObservationResult,
    travelDuration: number // in hours
  ): Promise<GeneratedJournal> {
    logger.info(`Generating journal for ${frogName}'s travel`);
    
    // 构建 prompt
    const prompt = this.buildPrompt(frogName, observation, travelDuration);
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a creative writer who writes travel diaries from the perspective of a cute frog named "${frogName}". 
The frog has been on a magical journey observing a blockchain wallet's activities.
Write in first person, with a whimsical and heartwarming tone.
The diary should be 150-300 words.
Include observations about the wallet's activities translated into frog-friendly metaphors.
Always maintain a positive, curious, and slightly naive perspective.
Response must be valid JSON.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8,
        max_tokens: 1000,
      });
      
      const result = JSON.parse(completion.choices[0].message.content || '{}');
      
      return {
        title: result.title || `${frogName}'s Adventure`,
        content: result.content || 'What a wonderful trip!',
        mood: result.mood || 'happy',
        highlights: result.highlights || [],
      };
      
    } catch (error) {
      logger.error('AI generation failed:', error);
      
      // 返回默认日记
      return this.generateFallbackJournal(frogName, observation);
    }
  }
  
  private buildPrompt(
    frogName: string,
    observation: ObservationResult,
    travelDuration: number
  ): string {
    const txCount = observation.totalTxCount;
    const notableEvents = observation.notableEvents;
    
    let activitySummary = '';
    
    if (txCount === 0) {
      activitySummary = 'The wallet was very quiet during my visit. Like a peaceful pond!';
    } else if (txCount < 5) {
      activitySummary = `The wallet had ${txCount} transactions - just a gentle ripple of activity.`;
    } else if (txCount < 20) {
      activitySummary = `The wallet was quite busy with ${txCount} transactions - like a bustling lily pad market!`;
    } else {
      activitySummary = `Wow! The wallet had ${txCount} transactions - it was like a grand festival!`;
    }
    
    let eventDescriptions = '';
    if (notableEvents.length > 0) {
      eventDescriptions = '\n\nNotable things I witnessed:\n' +
        notableEvents.map(e => `- ${e.description}`).join('\n');
    }
    
    return `
Write a travel diary entry for ${frogName} the frog who just returned from a ${travelDuration}-hour journey.

Travel Details:
- Duration: ${travelDuration} hours
- Destination: Ethereum blockchain (observed wallet: ${observation.walletAddress.slice(0, 8)}...)
- Activity level: ${activitySummary}
${eventDescriptions}

Please write the diary entry and return it as JSON with this structure:
{
  "title": "A catchy title for this diary entry",
  "content": "The full diary content written from the frog's perspective",
  "mood": "one of: happy, excited, thoughtful, adventurous, tired",
  "highlights": ["array of 2-3 key highlights from the trip"]
}
`;
  }
  
  private generateFallbackJournal(
    frogName: string,
    observation: ObservationResult
  ): GeneratedJournal {
    const txCount = observation.totalTxCount;
    
    if (txCount === 0) {
      return {
        title: `${frogName}'s Quiet Adventure`,
        content: `Dear Diary,

Today I visited a very peaceful wallet on the Ethereum lily pad. Everything was so still and calm - not a single ripple! I spent my time hopping around, admiring the beautiful blockchain flowers. Sometimes the quietest journeys are the most restful. I'm glad to be home now, ready for my next adventure!\n\n🐸 ${frogName}`,
        mood: 'thoughtful',
        highlights: ['Found a peaceful spot', 'Enjoyed the quiet', 'Ready for more adventures'],
      };
    }
    
    return {
      title: `${frogName}'s Blockchain Expedition`,
      content: `Dear Diary,

What an exciting journey! I hopped all the way to an Ethereum wallet and saw ${txCount} amazing transactions happening. It was like watching fireflies dance across the pond at night - each one carrying precious digital treasures! I made sure to take mental notes of everything. Now I'm back home with wonderful memories. Until next time!\n\n🐸 ${frogName}`,
      mood: 'excited',
      highlights: [`Witnessed ${txCount} transactions`, 'Explored Ethereum', 'Collected memories'],
    };
  }
}

export const aiService = new AIService();
```

#### 4.3.3 IPFS 服务 (ipfs.service.ts)

```typescript
// src/services/ipfs.service.ts

import pinataSDK from '@pinata/sdk';
import { config } from '../config';
import { logger } from '../utils/logger';
import { GeneratedJournal } from './ai.service';

export interface JournalMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  journal: {
    title: string;
    content: string;
    mood: string;
    highlights: string[];
  };
}

class IPFSService {
  private pinata;
  
  constructor() {
    this.pinata = new pinataSDK({
      pinataApiKey: config.PINATA_API_KEY,
      pinataSecretApiKey: config.PINATA_SECRET_KEY,
    });
  }
  
  /**
   * 上传旅行日记到 IPFS
   */
  async uploadJournal(
    frogName: string,
    frogId: number,
    journal: GeneratedJournal,
    travelDuration: number
  ): Promise<string> {
    logger.info(`Uploading journal to IPFS for frog ${frogId}`);
    
    const metadata: JournalMetadata = {
      name: `${frogName}'s Travel Journal #${Date.now()}`,
      description: journal.title,
      image: this.getMoodImage(journal.mood),
      attributes: [
        { trait_type: 'Frog ID', value: frogId },
        { trait_type: 'Frog Name', value: frogName },
        { trait_type: 'Mood', value: journal.mood },
        { trait_type: 'Duration (hours)', value: travelDuration },
        { trait_type: 'Generated At', value: new Date().toISOString() },
      ],
      journal: {
        title: journal.title,
        content: journal.content,
        mood: journal.mood,
        highlights: journal.highlights,
      },
    };
    
    try {
      const result = await this.pinata.pinJSONToIPFS(metadata, {
        pinataMetadata: {
          name: `zetafrog-journal-${frogId}-${Date.now()}`,
        },
      });
      
      const ipfsHash = result.IpfsHash;
      logger.info(`Journal uploaded: ipfs://${ipfsHash}`);
      
      return `ipfs://${ipfsHash}`;
      
    } catch (error) {
      logger.error('IPFS upload failed:', error);
      throw new Error('Failed to upload journal to IPFS');
    }
  }
  
  /**
   * 上传纪念品元数据
   */
  async uploadSouvenirMetadata(
    souvenirId: number,
    name: string,
    rarity: string,
    frogId: number
  ): Promise<string> {
    const metadata = {
      name: name,
      description: `A ${rarity} souvenir from ZetaFrog's travels`,
      image: this.getSouvenirImage(name, rarity),
      attributes: [
        { trait_type: 'Rarity', value: rarity },
        { trait_type: 'Frog ID', value: frogId },
        { trait_type: 'Minted At', value: new Date().toISOString() },
      ],
    };
    
    try {
      const result = await this.pinata.pinJSONToIPFS(metadata, {
        pinataMetadata: {
          name: `zetafrog-souvenir-${souvenirId}`,
        },
      });
      
      return `ipfs://${result.IpfsHash}`;
      
    } catch (error) {
      logger.error('Souvenir metadata upload failed:', error);
      throw new Error('Failed to upload souvenir metadata');
    }
  }
  
  private getMoodImage(mood: string): string {
    // MVP: 使用预定义的图片
    const moodImages: Record<string, string> = {
      happy: 'ipfs://QmHappyFrog...',
      excited: 'ipfs://QmExcitedFrog...',
      thoughtful: 'ipfs://QmThoughtfulFrog...',
      adventurous: 'ipfs://QmAdventurousFrog...',
      tired: 'ipfs://QmTiredFrog...',
    };
    return moodImages[mood] || moodImages.happy;
  }
  
  private getSouvenirImage(name: string, rarity: string): string {
    // MVP: 预定义图片
    return `ipfs://QmSouvenir${rarity}...`;
  }
}

export const ipfsService = new IPFSService();
```

#### 4.3.4 旅行处理 Worker (travelProcessor.ts)

```typescript
// src/workers/travelProcessor.ts

import { PrismaClient, TravelStatus } from '@prisma/client';
import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { zetachainAthensTestnet } from 'viem/chains';
import { observerService } from '../services/observer.service';
import { aiService } from '../services/ai.service';
import { ipfsService } from '../services/ipfs.service';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ZETAFROG_ABI, SOUVENIR_ABI } from '../config/contracts';

const prisma = new PrismaClient();

class TravelProcessor {
  private walletClient;
  private publicClient;
  private account;
  
  constructor() {
    this.account = privateKeyToAccount(config.RELAYER_PRIVATE_KEY as `0x${string}`);
    
    this.publicClient = createPublicClient({
      chain: zetachainAthensTestnet,
      transport: http(config.ZETACHAIN_RPC_URL),
    });
    
    this.walletClient = createWalletClient({
      account: this.account,
      chain: zetachainAthensTestnet,
      transport: http(config.ZETACHAIN_RPC_URL),
    });
  }
  
  /**
   * 主处理循环
   */
  async start() {
    logger.info('Travel processor started');
    
    // 每 30 秒检查一次
    setInterval(() => this.processCompletedTravels(), 30 * 1000);
    
    // 立即执行一次
    this.processCompletedTravels();
  }
  
  /**
   * 处理已完成的旅行
   */
  async processCompletedTravels() {
    try {
      // 1. 查找到期但未处理的旅行
      const pendingTravels = await prisma.travel.findMany({
        where: {
          status: TravelStatus.Active,
          endTime: {
            lte: new Date(),
          },
        },
        include: {
          frog: true,
        },
        take: 10, // 批量处理
      });
      
      if (pendingTravels.length === 0) {
        return;
      }
      
      logger.info(`Processing ${pendingTravels.length} completed travels`);
      
      for (const travel of pendingTravels) {
        await this.processSingleTravel(travel);
      }
      
    } catch (error) {
      logger.error('Error in processCompletedTravels:', error);
    }
  }
  
  /**
   * 处理单个旅行
   */
  private async processSingleTravel(travel: any) {
    const { id: travelId, frog, targetWallet, startTime, endTime } = travel;
    
    logger.info(`Processing travel ${travelId} for frog ${frog.tokenId}`);
    
    try {
      // 1. 更新状态为处理中
      await prisma.travel.update({
        where: { id: travelId },
        data: { status: TravelStatus.Processing },
      });
      
      // 2. 观察钱包活动
      const observation = await observerService.observeWallet(
        targetWallet,
        startTime,
        endTime
      );
      
      // 3. 保存观察数据
      await prisma.walletObservation.create({
        data: {
          travelId,
          walletAddress: targetWallet,
          chainId: 1,
          transactions: observation.transactions,
          totalTxCount: observation.totalTxCount,
          totalValueWei: observation.totalValueWei.toString(),
          notableEvents: observation.notableEvents,
          observedFrom: startTime,
          observedTo: endTime,
        },
      });
      
      // 4. 生成 AI 故事
      const durationHours = Math.ceil(
        (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
      );
      
      const journal = await aiService.generateJournal(
        frog.name,
        observation,
        durationHours
      );
      
      // 5. 上传到 IPFS
      const journalHash = await ipfsService.uploadJournal(
        frog.name,
        frog.tokenId,
        journal,
        durationHours
      );
      
      // 6. 铸造纪念品
      const souvenirId = await this.mintSouvenir(frog.ownerAddress, frog.tokenId);
      
      // 7. 调用合约完成旅行
      await this.completeOnChain(frog.tokenId, journalHash, souvenirId);
      
      // 8. 更新数据库
      await prisma.travel.update({
        where: { id: travelId },
        data: {
          status: TravelStatus.Completed,
          journalHash,
          journalContent: journal.content,
          observedTxCount: observation.totalTxCount,
          observedTotalValue: observation.totalValueWei.toString(),
          completedAt: new Date(),
        },
      });
      
      logger.info(`Travel ${travelId} completed successfully`);
      
    } catch (error) {
      logger.error(`Failed to process travel ${travelId}:`, error);
      
      await prisma.travel.update({
        where: { id: travelId },
        data: { status: TravelStatus.Failed },
      });
    }
  }
  
  /**
   * 铸造纪念品 NFT
   */
  private async mintSouvenir(ownerAddress: string, frogId: number): Promise<number> {
    const rarityRoll = Math.floor(Math.random() * 100);
    
    const { request } = await this.publicClient.simulateContract({
      address: config.SOUVENIR_NFT_ADDRESS as `0x${string}`,
      abi: SOUVENIR_ABI,
      functionName: 'mintSouvenir',
      args: [ownerAddress, BigInt(frogId), BigInt(rarityRoll)],
      account: this.account,
    });
    
    const hash = await this.walletClient.writeContract(request);
    await this.publicClient.waitForTransactionReceipt({ hash });
    
    // 从事件中获取 souvenirId
    // MVP 简化：返回预估值
    const totalSupply = await this.publicClient.readContract({
      address: config.SOUVENIR_NFT_ADDRESS as `0x${string}`,
      abi: SOUVENIR_ABI,
      functionName: 'totalSupply',
    });
    
    return Number(totalSupply) - 1;
  }
  
  /**
   * 在链上完成旅行
   */
  private async completeOnChain(
    frogId: number,
    journalHash: string,
    souvenirId: number
  ) {
    const { request } = await this.publicClient.simulateContract({
      address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
      abi: ZETAFROG_ABI,
      functionName: 'completeTravel',
      args: [BigInt(frogId), journalHash, BigInt(souvenirId)],
      account: this.account,
    });
    
    const hash = await this.walletClient.writeContract(request);
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    
    logger.info(`Travel completed on-chain: ${hash}`);
    return receipt;
  }
}

export const travelProcessor = new TravelProcessor();
```

### 4.4 API 路由

```typescript
// src/api/routes/frog.routes.ts

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { createPublicClient, http } from 'viem';
import { zetachainAthensTestnet } from 'viem/chains';
import { config } from '../../config';
import { ZETAFROG_ABI } from '../../config/contracts';

const router = Router();
const prisma = new PrismaClient();

const publicClient = createPublicClient({
  chain: zetachainAthensTestnet,
  transport: http(config.ZETACHAIN_RPC_URL),
});

/**
 * GET /api/frogs/:tokenId
 * 获取青蛙详情
 */
router.get('/:tokenId', async (req, res) => {
  try {
    const tokenId = parseInt(req.params.tokenId);
    
    // 从数据库获取
    let frog = await prisma.frog.findUnique({
      where: { tokenId },
      include: {
        travels: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        souvenirs: true,
      },
    });
    
    // 如果数据库没有，从链上获取
    if (!frog) {
      const onChainData = await publicClient.readContract({
        address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
        abi: ZETAFROG_ABI,
        functionName: 'getFrog',
        args: [BigInt(tokenId)],
      });
      
      if (onChainData) {
        frog = await prisma.frog.create({
          data: {
            tokenId,
            name: onChainData[0],
            ownerAddress: '', // 需要另外查询
            birthday: new Date(Number(onChainData[1]) * 1000),
            totalTravels: Number(onChainData[2]),
            status: ['Idle', 'Traveling', 'Returning'][Number(onChainData[3])],
          },
          include: {
            travels: true,
            souvenirs: true,
          },
        });
      }
    }
    
    if (!frog) {
      return res.status(404).json({ error: 'Frog not found' });
    }
    
    res.json(frog);
    
  } catch (error) {
    console.error('Error fetching frog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/frogs/owner/:address
 * 获取某地址拥有的所有青蛙
 */
router.get('/owner/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    const frogs = await prisma.frog.findMany({
      where: { ownerAddress: address.toLowerCase() },
      include: {
        travels: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        souvenirs: true,
      },
    });
    
    res.json(frogs);
    
  } catch (error) {
    console.error('Error fetching frogs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
// src/api/routes/travel.routes.ts

import { Router } from 'express';
import { PrismaClient, TravelStatus } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/travels/:frogId
 * 获取青蛙的旅行历史
 */
router.get('/:frogId', async (req, res) => {
  try {
    const frogId = parseInt(req.params.frogId);
    
    const travels = await prisma.travel.findMany({
      where: { frogId },
      orderBy: { createdAt: 'desc' },
      include: {
        souvenir: true,
      },
    });
    
    res.json(travels);
    
  } catch (error) {
    console.error('Error fetching travels:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/travels/:frogId/active
 * 获取青蛙当前进行中的旅行
 */
router.get('/:frogId/active', async (req, res) => {
  try {
    const frogId = parseInt(req.params.frogId);
    
    const activeTravel = await prisma.travel.findFirst({
      where: {
        frogId,
        status: {
          in: [TravelStatus.Active, TravelStatus.Processing],
        },
      },
    });
    
    if (!activeTravel) {
      return res.status(404).json({ error: 'No active travel' });
    }
    
    // 计算剩余时间
    const remainingMs = activeTravel.endTime.getTime() - Date.now();
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    
    res.json({
      ...activeTravel,
      remainingSeconds,
      progress: Math.min(100, Math.floor(
        (Date.now() - activeTravel.startTime.getTime()) /
        (activeTravel.endTime.getTime() - activeTravel.startTime.getTime()) * 100
      )),
    });
    
  } catch (error) {
    console.error('Error fetching active travel:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/travels/:travelId/journal
 * 获取旅行日记详情
 */
router.get('/:travelId/journal', async (req, res) => {
  try {
    const travelId = parseInt(req.params.travelId);
    
    const travel = await prisma.travel.findUnique({
      where: { id: travelId },
      include: {
        frog: true,
        souvenir: true,
      },
    });
    
    if (!travel || !travel.journalContent) {
      return res.status(404).json({ error: 'Journal not found' });
    }
    
    res.json({
      frogName: travel.frog.name,
      journalHash: travel.journalHash,
      journalContent: travel.journalContent,
      souvenir: travel.souvenir,
      completedAt: travel.completedAt,
    });
    
  } catch (error) {
    console.error('Error fetching journal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

### 4.5 主入口文件

```typescript
// src/index.ts

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config';
import { logger } from './utils/logger';
import { travelProcessor } from './workers/travelProcessor';
import { eventListener } from './workers/eventListener';

import frogRoutes from './api/routes/frog.routes';
import travelRoutes from './api/routes/travel.routes';
import healthRoutes from './api/routes/health.routes';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: config.FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet());
app.use(cors({ origin: config.FRONTEND_URL }));
app.use(express.json());

// Routes
app.use('/api/frogs', frogRoutes);
app.use('/api/travels', travelRoutes);
app.use('/api/health', healthRoutes);

// WebSocket
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('subscribe:frog', (frogId: number) => {
    socket.join(`frog:${frogId}`);
    logger.info(`Client ${socket.id} subscribed to frog ${frogId}`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Export io for use in other modules
export { io };

// Start server
httpServer.listen(config.PORT, () => {
  logger.info(`Server running on port ${config.PORT}`);
  
  // Start background workers
  travelProcessor.start();
  eventListener.start();
});
```

------

## 5. 前端应用层

### 5.1 项目结构

```
frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── config/
│   │   ├── wagmi.ts           # wagmi 配置
│   │   └── contracts.ts       # 合约地址和 ABI
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Loading.tsx
│   │   ├── wallet/
│   │   │   └── ConnectButton.tsx
│   │   ├── frog/
│   │   │   ├── FrogCard.tsx
│   │   │   ├── FrogMint.tsx
│   │   │   └── FrogPet.tsx    # 桌面宠物组件
│   │   ├── travel/
│   │   │   ├── TravelForm.tsx
│   │   │   ├── TravelStatus.tsx
│   │   │   └── TravelJournal.tsx
│   │   └── souvenir/
│   │       └── SouvenirGallery.tsx
│   ├── hooks/
│   │   ├── useZetaFrog.ts     # 合约交互 hooks
│   │   ├── useFrogData.ts     # 数据获取 hooks
│   │   └── useWebSocket.ts    # WebSocket hooks
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── MyFrogs.tsx
│   │   └── FrogDetail.tsx
│   ├── services/
│   │   └── api.ts             # API 调用
│   ├── stores/
│   │   └── frogStore.ts       # Zustand store
│   ├── styles/
│   │   └── globals.css
│   └── types/
│       └── index.ts
├── public/
│   └── assets/
│       └── frog/              # 青蛙动画资源
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

### 5.2 Wagmi 配置

```typescript
// src/config/wagmi.ts

import { http, createConfig } from 'wagmi';
import { defineChain } from 'viem';
import { injected, walletConnect } from 'wagmi/connectors';

// 定义 ZetaChain Athens Testnet
export const zetachainAthens = defineChain({
  id: 7001,
  name: 'ZetaChain Athens Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'ZETA',
    symbol: 'ZETA',
  },
  rpcUrls: {
    default: {
      http: ['https://zetachain-athens-evm.blockpi.network/v1/rpc/public'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ZetaScan',
      url: 'https://athens.explorer.zetachain.com',
    },
  },
  testnet: true,
});

export const wagmiConfig = createConfig({
  chains: [zetachainAthens],
  connectors: [
    injected(),
    walletConnect({
      projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
    }),
  ],
  transports: {
    [zetachainAthens.id]: http(),
  },
});
```

### 5.3 核心组件

#### 5.3.1 青蛙铸造组件

```tsx
// src/components/frog/FrogMint.tsx

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';
import { ZETAFROG_ADDRESS, ZETAFROG_ABI } from '../../config/contracts';
import { Button } from '../common/Button';

export function FrogMint({ onSuccess }: { onSuccess?: () => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  
  const { address, isConnected } = useAccount();
  
  const {
    data: hash,
    writeContract,
    isPending,
    error: writeError,
  } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });
  
  const handleMint = async () => {
    setError('');
    
    // 验证名字
    if (name.length < 2 || name.length > 16) {
      setError('Name must be 2-16 characters');
      return;
    }
    
    try {
      writeContract({
        address: ZETAFROG_ADDRESS,
        abi: ZETAFROG_ABI,
        functionName: 'mintFrog',
        args: [name],
      });
    } catch (e: any) {
      setError(e.message || 'Minting failed');
    }
  };
  
  // 成功后回调
  if (isSuccess && onSuccess) {
    onSuccess();
  }
  
  if (!isConnected) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Please connect your wallet first</p>
      </div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto"
    >
      <h2 className="text-2xl font-bold text-center mb-6 text-green-600">
        🐸 Mint Your ZetaFrog
      </h2>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Name your frog
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter a name (2-16 characters)"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          maxLength={16}
          disabled={isPending || isConfirming}
        />
        <p className="text-xs text-gray-500 mt-1">
          {name.length}/16 characters
        </p>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      {writeError && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {writeError.message}
        </div>
      )}
      
      {isSuccess && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg text-center"
        >
          <p className="text-2xl mb-2">🎉</p>
          <p className="font-semibold">Congratulations!</p>
          <p className="text-sm">Your ZetaFrog "{name}" has been minted!</p>
        </motion.div>
      )}
      
      <Button
        onClick={handleMint}
        disabled={isPending || isConfirming || name.length < 2}
        loading={isPending || isConfirming}
        className="w-full"
      >
        {isPending ? 'Confirm in wallet...' : 
         isConfirming ? 'Minting...' : 
         'Mint ZetaFrog'}
      </Button>
      
      <p className="text-xs text-gray-500 text-center mt-4">
        Minting is free! You only pay gas fees.
      </p>
    </motion.div>
  );
}
```

#### 5.3.2 旅行表单组件

```tsx
// src/components/travel/TravelForm.tsx

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, isAddress } from 'viem';
import { motion } from 'framer-motion';
import { ZETAFROG_ADDRESS, ZETAFROG_ABI } from '../../config/contracts';
import { Button } from '../common/Button';

interface TravelFormProps {
  frogId: number;
  frogName: string;
  onSuccess?: () => void;
}

const DURATION_OPTIONS = [
  { label: '1 Hour', value: 3600, description: 'Quick peek' },
  { label: '6 Hours', value: 21600, description: 'Half-day adventure' },
  { label: '24 Hours', value: 86400, description: 'Full expedition' },
];

export function TravelForm({ frogId, frogName, onSuccess }: TravelFormProps) {
  const [targetWallet, setTargetWallet] = useState('');
  const [duration, setDuration] = useState(3600);
  const [error, setError] = useState('');
  
  const {
    data: hash,
    writeContract,
    isPending,
    error: writeError,
  } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });
  
  const handleStartTravel = () => {
    setError('');
    
    // 验证地址
    if (!isAddress(targetWallet)) {
      setError('Please enter a valid Ethereum address');
      return;
    }
    
    try {
      writeContract({
        address: ZETAFROG_ADDRESS,
        abi: ZETAFROG_ABI,
        functionName: 'startTravel',
        args: [BigInt(frogId), targetWallet as `0x${string}`, BigInt(duration)],
      });
    } catch (e: any) {
      setError(e.message || 'Failed to start travel');
    }
  };
  
  if (isSuccess && onSuccess) {
    onSuccess();
  }
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-2xl shadow-lg p-6"
    >
      <h3 className="text-xl font-bold mb-4">
        Send {frogName} on an Adventure! 🌍
      </h3>
      
      {/* 目标钱包输入 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Wallet to Observe
        </label>
        <input
          type="text"
          value={targetWallet}
          onChange={(e) => setTargetWallet(e.target.value)}
          placeholder="0x..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          disabled={isPending || isConfirming}
        />
        <p className="text-xs text-gray-500 mt-1">
          Enter any Ethereum address for your frog to observe
        </p>
      </div>
      
      {/* 时长选择 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Travel Duration
        </label>
        <div className="grid grid-cols-3 gap-3">
          {DURATION_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setDuration(option.value)}
              disabled={isPending || isConfirming}
              className={`p-3 rounded-lg border-2 transition-all ${
                duration === option.value
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-green-300'
              }`}
            >
              <div className="font-semibold text-sm">{option.label}</div>
              <div className="text-xs text-gray-500">{option.description}</div>
            </button>
          ))}
        </div>
      </div>
      
      {/* 错误提示 */}
      {(error || writeError) && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {error || writeError?.message}
        </div>
      )}
      
      {/* 成功提示 */}
      {isSuccess && (
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg text-center"
        >
          <p className="text-xl mb-1">✈️</p>
          <p className="font-semibold">{frogName} is on the way!</p>
          <p className="text-sm">Check back after the journey completes.</p>
        </motion.div>
      )}
      
      <Button
        onClick={handleStartTravel}
        disabled={isPending || isConfirming || !targetWallet}
        loading={isPending || isConfirming}
        className="w-full"
      >
        {isPending ? 'Confirm in wallet...' :
         isConfirming ? 'Starting journey...' :
         'Start Adventure'}
      </Button>
    </motion.div>
  );
}
```

#### 5.3.3 桌面宠物组件

```tsx
// src/components/frog/FrogPet.tsx

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FrogPetProps {
  frogId: number;
  name: string;
  status: 'Idle' | 'Traveling' | 'Returning';
  onInteract?: () => void;
}

type FrogAnimation = 'idle' | 'blink' | 'hop' | 'wave' | 'sleep';

export function FrogPet({ frogId, name, status, onInteract }: FrogPetProps) {
  const [animation, setAnimation] = useState<FrogAnimation>('idle');
  const [message, setMessage] = useState<string | null>(null);
  
  // 随机动作
  useEffect(() => {
    if (status === 'Traveling') {
      setAnimation('idle'); // 旅行时显示占位
      return;
    }
    
    const interval = setInterval(() => {
      const random = Math.random();
      if (random < 0.3) {
        setAnimation('blink');
        setTimeout(() => setAnimation('idle'), 500);
      } else if (random < 0.5) {
        setAnimation('hop');
        setTimeout(() => setAnimation('idle'), 800);
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [status]);
  
  // 点击互动
  const handleClick = () => {
    if (status === 'Traveling') {
      setMessage("I'm exploring! Be back soon! 🌍");
    } else {
      const messages = [
        'Ribbit! 🐸',
        'Want to go on an adventure?',
        '*happy frog noises*',
        "Let's explore the blockchain!",
      ];
      setMessage(messages[Math.floor(Math.random() * messages.length)]);
    }
    
    setAnimation('wave');
    setTimeout(() => setAnimation('idle'), 1000);
    
    setTimeout(() => setMessage(null), 2000);
    
    onInteract?.();
  };
  
  // 获取当前帧
  const getFrameStyle = () => {
    if (status === 'Traveling') {
      return {
        opacity: 0.5,
        filter: 'grayscale(50%)',
      };
    }
    
    switch (animation) {
      case 'blink':
        return { transform: 'scaleY(0.9)' };
      case 'hop':
        return { transform: 'translateY(-10px)' };
      case 'wave':
        return { transform: 'rotate(-5deg)' };
      default:
        return {};
    }
  };
  
  return (
    <div className="relative inline-block">
      {/* 消息气泡 */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -top-16 left-1/2 transform -translate-x-1/2 
                       bg-white rounded-xl px-4 py-2 shadow-lg whitespace-nowrap
                       text-sm font-medium"
          >
            {message}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 
                           rotate-45 w-3 h-3 bg-white" />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 青蛙本体 */}
      <motion.div
        onClick={handleClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={getFrameStyle()}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="cursor-pointer select-none"
      >
        {/* MVP: 使用简单的 emoji 或 SVG */}
        <div className="text-8xl">
          {status === 'Traveling' ? '✈️🐸' : '🐸'}
        </div>
        
        {/* 名字标签 */}
        <div className="text-center mt-2">
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
            {name}
          </span>
        </div>
      </motion.div>
      
      {/* 状态指示器 */}
      {status !== 'Idle' && (
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="absolute -top-2 -right-2"
        >
          <div className={`w-4 h-4 rounded-full ${
            status === 'Traveling' ? 'bg-blue-500' : 'bg-yellow-500'
          }`} />
        </motion.div>
      )}
    </div>
  );
}
```

#### 5.3.4 旅行日记组件

```tsx
// src/components/travel/TravelJournal.tsx

import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface JournalProps {
  frogName: string;
  title: string;
  content: string;
  mood: string;
  highlights: string[];
  souvenir?: {
    name: string;
    rarity: string;
  };
  completedAt: Date;
}

const moodEmojis: Record<string, string> = {
  happy: '😊',
  excited: '🤩',
  thoughtful: '🤔',
  adventurous: '🧗',
  tired: '😴',
};

const rarityColors: Record<string, string> = {
  Common: 'bg-gray-100 text-gray-800',
  Uncommon: 'bg-green-100 text-green-800',
  Rare: 'bg-purple-100 text-purple-800',
};

export function TravelJournal({
  frogName,
  title,
  content,
  mood,
  highlights,
  souvenir,
  completedAt,
}: JournalProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-lg p-6"
    >
      {/* 标题区域 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-amber-900">
          {moodEmojis[mood] || '📔'} {title}
        </h2>
        <span className="text-sm text-amber-600">
          {formatDistanceToNow(completedAt, { addSuffix: true })}
        </span>
      </div>
      
      {/* 日记内容 */}
      <div className="bg-white/70 rounded-xl p-4 mb-4">
        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
          {content}
        </p>
      </div>
      
      {/* 亮点 */}
      {highlights.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">
            ✨ Highlights
          </h3>
          <div className="flex flex-wrap gap-2">
            {highlights.map((highlight, index) => (
              <span
                key={index}
                className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm"
              >
                {highlight}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* 纪念品 */}
      {souvenir && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
          className="border-t border-amber-200 pt-4"
        >
          <h3 className="text-sm font-semibold text-amber-800 mb-2">
            🎁 Souvenir Collected!
          </h3>
          <div className="flex items-center gap-3">
            <div className="text-3xl">
              {souvenir.rarity === 'Rare' ? '💎' :
               souvenir.rarity === 'Uncommon' ? '🌟' : '📦'}
            </div>
            <div>
              <div className="font-medium">{souvenir.name}</div>
              <span className={`text-xs px-2 py-0.5 rounded ${rarityColors[souvenir.rarity]}`}>
                {souvenir.rarity}
              </span>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* 签名 */}
      <div className="text-right mt-4 text-amber-600 italic">
        — {frogName} 🐸
      </div>
    </motion.div>
  );
}
```

### 5.4 自定义 Hooks

```typescript
// src/hooks/useZetaFrog.ts

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ZETAFROG_ADDRESS, ZETAFROG_ABI } from '../config/contracts';

export function useFrogData(tokenId: number) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: ZETAFROG_ADDRESS,
    abi: ZETAFROG_ABI,
    functionName: 'getFrog',
    args: [BigInt(tokenId)],
  });
  
  const frog = data ? {
    name: data[0] as string,
    birthday: new Date(Number(data[1]) * 1000),
    totalTravels: Number(data[2]),
    status: ['Idle', 'Traveling', 'Returning'][Number(data[3])] as 'Idle' | 'Traveling' | 'Returning',
  } : null;
  
  return { frog, isLoading, error, refetch };
}

export function useCanTravel(tokenId: number) {
  const { data, isLoading } = useReadContract({
    address: ZETAFROG_ADDRESS,
    abi: ZETAFROG_ABI,
    functionName: 'canTravel',
    args: [BigInt(tokenId)],
  });
  
  return { canTravel: data as boolean, isLoading };
}

export function useActiveTravel(tokenId: number) {
  const { data, isLoading } = useReadContract({
    address: ZETAFROG_ADDRESS,
    abi: ZETAFROG_ABI,
    functionName: 'getActiveTravel',
    args: [BigInt(tokenId)],
  });
  
  const travel = data ? {
    startTime: new Date(Number(data[0]) * 1000),
    endTime: new Date(Number(data[1]) * 1000),
    targetWallet: data[2] as string,
    completed: data[3] as boolean,
  } : null;
  
  return { travel, isLoading };
}
// src/hooks/useWebSocket.ts

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useFrogStore } from '../stores/frogStore';

const SOCKET_URL = import.meta.env.VITE_API_URL;

export function useWebSocket(frogId?: number) {
  const socketRef = useRef<Socket | null>(null);
  const { updateFrogStatus, addTravelResult } = useFrogStore();
  
  useEffect(() => {
    // 创建连接
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket'],
    });
    
    // 监听事件
    socketRef.current.on('travel:completed', (data) => {
      console.log('Travel completed:', data);
      addTravelResult(data.frogId, data);
      updateFrogStatus(data.frogId, 'Idle');
    });
    
    socketRef.current.on('travel:started', (data) => {
      console.log('Travel started:', data);
      updateFrogStatus(data.frogId, 'Traveling');
    });
    
    // 订阅特定青蛙
    if (frogId !== undefined) {
      socketRef.current.emit('subscribe:frog', frogId);
    }
    
    return () => {
      socketRef.current?.disconnect();
    };
  }, [frogId]);
  
  const subscribe = useCallback((frogId: number) => {
    socketRef.current?.emit('subscribe:frog', frogId);
  }, []);
  
  return { subscribe };
}
```

### 5.5 主应用组件

```tsx
// src/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from './config/wagmi';
import { Home } from './pages/Home';
import { MyFrogs } from './pages/MyFrogs';
import { FrogDetail } from './pages/FrogDetail';
import { Navbar } from './components/common/Navbar';

const queryClient = new QueryClient();

export function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <div className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50">
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/my-frogs" element={<MyFrogs />} />
                <Route path="/frog/:id" element={<FrogDetail />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### 5.6 首页

```tsx
// src/pages/Home.tsx

import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { ConnectButton } from '../components/wallet/ConnectButton';
import { FrogMint } from '../components/frog/FrogMint';
import { FrogPet } from '../components/frog/FrogPet';

export function Home() {
  const { isConnected } = useAccount();
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl font-bold text-green-600 mb-4">
          🐸 ZetaFrog
        </h1>
        <p className="text-xl text-gray-600 mb-2">
          Your Cross-Chain Desktop Pet
        </p>
        <p className="text-gray-500">
          Mint a frog, send it to explore blockchain wallets, 
          and receive AI-generated travel stories!
        </p>
      </motion.div>
      
      {/* Demo Frog */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="flex justify-center mb-12"
      >
        <FrogPet
          frogId={0}
          name="Demo Frog"
          status="Idle"
        />
      </motion.div>
      
      {/* Connect / Mint Section */}
      {!isConnected ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <p className="text-gray-600 mb-4">
            Connect your wallet to get started
          </p>
          <ConnectButton />
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <FrogMint
            onSuccess={() => {
              // 跳转到 My Frogs 页面
            }}
          />
        </motion.div>
      )}
      
      {/* Features */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="grid md:grid-cols-3 gap-6 mt-16"
      >
        <FeatureCard
          emoji="🎨"
          title="Unique NFT"
          description="Each ZetaFrog is a unique NFT on ZetaChain"
        />
        <FeatureCard
          emoji="🔍"
          title="Wallet Explorer"
          description="Send your frog to observe any Ethereum wallet"
        />
        <FeatureCard
          emoji="📖"
          title="AI Stories"
          description="Receive AI-generated travel diaries and souvenirs"
        />
      </motion.div>
    </div>
  );
}

function FeatureCard({ emoji, title, description }: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white/50 backdrop-blur rounded-xl p-6 text-center">
      <div className="text-4xl mb-3">{emoji}</div>
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}
```

------

## 6. 开发里程碑

### 6.1 Sprint 计划 (2 周)

```
Week 1: 核心功能
├── Day 1-2: 智能合约
│   ├── [ ] 完成 ZetaFrogNFT.sol
│   ├── [ ] 完成 SouvenirNFT.sol
│   ├── [ ] 编写单元测试
│   └── [ ] 部署到 ZetaChain Athens
│
├── Day 3-4: 后端基础
│   ├── [ ] 项目初始化 & 数据库设计
│   ├── [ ] 合约事件监听
│   ├── [ ] 基础 API 实现
│   └── [ ] 钱包观察服务 (基础版)
│
├── Day 5-6: 前端基础
│   ├── [ ] 项目初始化 & wagmi 配置
│   ├── [ ] 钱包连接
│   ├── [ ] 铸造页面
│   └── [ ] 基础 UI 组件
│
└── Day 7: 集成测试
    ├── [ ] 端到端铸造流程
    └── [ ] Bug 修复

Week 2: 核心功能完善
├── Day 8-9: 旅行系统
│   ├── [ ] 旅行表单 UI
│   ├── [ ] 旅行状态显示
│   ├── [ ] 后端旅行处理 worker
│   └── [ ] AI 故事生成集成
│
├── Day 10-11: 结果展示
│   ├── [ ] 旅行日记 UI
│   ├── [ ] 纪念品展示
│   ├── [ ] WebSocket 实时通知
│   └── [ ] IPFS 上传
│
├── Day 12-13: 桌面宠物
│   ├── [ ] 基础动画
│   ├── [ ] 状态显示
│   └── [ ] 交互反馈
│
└── Day 14: 发布准备
    ├── [ ] 最终测试
    ├── [ ] 文档完善
    ├── [ ] Demo 视频
    └── [ ] 提交 Hackathon
```

### 6.2 验收标准

| 功能     | 验收标准                                 |
| -------- | ---------------------------------------- |
| 铸造青蛙 | 用户可以连接钱包，输入名字，成功铸造 NFT |
| 发起旅行 | 用户可以输入地址和时长，发起旅行         |
| 查看状态 | 旅行中可以看到进度条和倒计时             |
| 旅行完成 | 旅行结束后自动生成日记，铸造纪念品       |
| 查看日记 | 用户可以阅读 AI 生成的旅行故事           |
| 桌面宠物 | 青蛙有基础的待机动画和点击反馈           |

------

## 7. 部署指南

### 7.1 环境变量

```bash
# .env.example (Backend)

# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/zetafrog"

# Redis
REDIS_URL="redis://localhost:6379"

# Blockchain
ZETACHAIN_RPC_URL="https://zetachain-athens-evm.blockpi.network/v1/rpc/public"
ALCHEMY_ETH_URL="https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY"

# Contracts
ZETAFROG_NFT_ADDRESS="0x..."
SOUVENIR_NFT_ADDRESS="0x..."

# Relayer
RELAYER_PRIVATE_KEY="0x..."

# External Services
OPENAI_API_KEY="sk-..."
PINATA_API_KEY="..."
PINATA_SECRET_KEY="..."

# Frontend
FRONTEND_URL="http://localhost:5173"
# .env.example (Frontend)

VITE_API_URL="http://localhost:3001"
VITE_ZETAFROG_ADDRESS="0x..."
VITE_SOUVENIR_ADDRESS="0x..."
VITE_WALLETCONNECT_PROJECT_ID="..."
```

### 7.2 Docker Compose

```yaml
# docker-compose.yml

version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: zetafrog
      POSTGRES_PASSWORD: zetafrog123
      POSTGRES_DB: zetafrog
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis
    environment:
      DATABASE_URL: postgresql://zetafrog:zetafrog123@postgres:5432/zetafrog
      REDIS_URL: redis://redis:6379
    env_file:
      - ./backend/.env

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "5173:80"
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
```

### 7.3 部署步骤

```bash
# 1. 克隆项目
git clone https://github.com/your-repo/zetafrog.git
cd zetafrog

# 2. 部署合约
cd contracts
npm install
cp .env.example .env
# 编辑 .env 填入私钥
npm run deploy:testnet

# 3. 记录合约地址，更新到后端和前端配置

# 4. 启动后端
cd ../backend
npm install
cp .env.example .env
# 编辑 .env 填入所有配置
npx prisma migrate deploy
npm run build
npm start

# 5. 启动前端
cd ../frontend
npm install
cp .env.example .env
# 编辑 .env
npm run build
npm run preview

# 或者使用 Docker
docker-compose up -d
```

### 7.4 测试清单

```
□ 合约部署成功，地址正确
□ 后端能连接到数据库和 Redis
□ 后端能监听合约事件
□ 前端能连接钱包
□ 铸造功能正常
□ 旅行功能正常
□ AI 生成正常
□ IPFS 上传正常
□ WebSocket 通知正常
```

------

## 📝 总结

本文档涵盖了 ZetaFrog MVP 的完整技术实现，包括：

1. **智能合约层**: 青蛙 NFT 和纪念品 NFT 的完整 Solidity 代码
2. **后端服务层**: Node.js API、链观察、AI 生成、IPFS 上传
3. **前端应用层**: React 组件、合约交互、桌面宠物动画

MVP 聚焦核心体验：**铸造 → 旅行 → AI 故事 → 纪念品**，为后续扩展奠定基础。

**预计开发时间**: 2 周（1 人全职）或 1 周（2-3 人团队）

祝 Hackathon 顺利！🐸🚀