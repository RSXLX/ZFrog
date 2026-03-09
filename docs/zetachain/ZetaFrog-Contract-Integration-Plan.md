# ZetaFrog 合约层与前后端集成开发计划

**日期**: 2026-03-06  
**目标**: 完成合约层逻辑完善 + 前后端交互流畅化

---

## 一、合约层（Smart Contract）开发

### 1.1 合约架构设计

```
contracts/
├── ZetaFrogCore.sol          # 核心合约：青蛙NFT和基础属性
├── ZetaFrogLifecycle.sol     # 生命周期：喂养、成长、衰减逻辑
├── ZetaFrogBreeding.sol      # 繁殖系统：配对、孵化
├── ZetaFrogBattle.sol        # 战斗系统：PVP对战
├── ZetaFrogMarket.sol        # 交易市场：买卖、拍卖
├── ZetaFrogStaking.sol      # 质押系统：赚取代币
├── interfaces/
│   ├── IZetaFrog.sol
│   ├── ILifecycle.sol
│   └── IMarket.sol
└── libraries/
    ├── Frog Genetics.sol       # 遗传算法
    ├── Frog Math.sol         # 数值计算
    └── Randomness.sol        # 随机数生成
```

### 1.2 核心合约：ZetaFrogCore.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract ZetaFrogCore is ERC721, ERC721Enumerable, Ownable, Pausable {
    
    // ============ 数据结构 ============
    
    struct Frog {
        uint256 id;
        string name;
        uint8 level;           // 等级 1-50
        uint32 experience;     // 经验值
        uint256 birthTime;     // 出生时间
        uint256 lastFed;       // 上次喂养时间
        
        // 属性值 (0-100)
        uint8 health;          // 健康
        uint8 happiness;       // 快乐
        uint8 hunger;          // 饥饿 (0=饱, 100=饿)
        uint8 energy;          // 精力
        
        // 基因
        uint256 genes;         // 遗传基因编码
        uint8 rarity;          // 稀有度 1-5
        uint16 generation;   // 世代
    }
    
    struct Species {
        uint8 id;
        string name;
        string description;
        uint8 baseHealth;
        uint8 baseHappiness;
        uint8 baseEnergy;
        string imageURI;
    }
    
    // ============ 状态变量 ============
    
    mapping(uint256 => Frog) public frogs;
    mapping(uint8 => Species) public species;
    mapping(address => uint256[]) public ownerFrogs;
    
    uint256 public nextFrogId = 1;
    uint8 public nextSpeciesId = 1;
    uint256 public maxSupply = 100000;
    
    uint256 public constant FEED_COOLDOWN = 4 hours;
    uint256 public constant PLAY_COOLDOWN = 1 hours;
    uint256 public constant SLEEP_COOLDOWN = 8 hours;
    
    uint256 public constant DAILY_HUNGER_DECAY = 10;
    uint256 public constant DAILY_HAPPINESS_DECAY = 5;
    uint256 public constant DAILY_ENERGY_DECAY = 15;
    
    // ============ 事件 ============
    
    event FrogMinted(address indexed owner, uint256 indexed frogId, uint8 speciesId);
    event FrogFed(uint256 indexed frogId, uint256 hunger, uint256 health);
    event FrogPlayed(uint256 indexed frogId, uint256 happiness, uint256 energy);
    event FrogSlept(uint256 indexed frogId, uint256 energy, uint256 health);
    event FrogLeveledUp(uint256 indexed frogId, uint8 newLevel);
    event FrogBred(uint256 indexed parent1, uint256 indexed parent2, uint256 indexed childId);
    
    // ============ 构造函数 ============
    
    constructor() ERC721("ZetaFrog", "ZFROG") {
        // 初始化物种
        _createSpecies("Common Frog", "A common but adorable frog", 50, 50, 50, "ipfs://common");
        _createSpecies("Tree Frog", "Loves climbing and jumping", 45, 60, 55, "ipfs://tree");
        _createSpecies("Bullfrog", "Big and strong", 70, 40, 45, "ipfs://bull");
        _createSpecies("Poison Dart", "Small but mighty", 35, 70, 60, "ipfs://dart");
        _createSpecies("Golden Frog", "Rare and legendary", 60, 60, 60, "ipfs://golden");
    }
    
    // ============ 外部函数 ============
    
    function mintFrog(uint8 speciesId) external payable whenNotPaused returns (uint256) {
        require(totalSupply() < maxSupply, "Max supply reached");
        require(speciesId > 0 && speciesId < nextSpeciesId, "Invalid species");
        
        uint256 frogId = nextFrogId++;
        
        // 创建青蛙
        Frog storage frog = frogs[frogId];
        frog.id = frogId;
        frog.name = string(abi.encodePacked("Frog #", _uintToString(frogId)));
        frog.level = 1;
        frog.birthTime = block.timestamp;
        frog.lastFed = block.timestamp;
        frog.genes = _generateGenes(frogId);
        frog.rarity = _calculateRarity(frog.genes);
        frog.generation = 0;
        
        // 设置基础属性
        Species storage sp = species[speciesId];
        frog.health = sp.baseHealth;
        frog.happiness = sp.baseHappiness;
        frog.energy = sp.baseEnergy;
        frog.hunger = 50; // 中等饥饿
        
        _safeMint(msg.sender, frogId);
        ownerFrogs[msg.sender].push(frogId);
        
        emit FrogMinted(msg.sender, frogId, speciesId);
        return frogId;
    }
    
    function feedFrog(uint256 frogId) external {
        require(_isApprovedOrOwner(msg.sender, frogId), "Not owner");
        Frog storage frog = frogs[frogId];
        require(block.timestamp >= frog.lastFed + FEED_COOLDOWN, "Too soon to feed");
        
        frog.hunger = frog.hunger > 20 ? frog.hunger - 20 : 0;
        frog.health = frog.health < 95 ? frog.health + 5 : 100;
        frog.lastFed = block.timestamp;
        
        _checkLevelUp(frogId);
        emit FrogFed(frogId, frog.hunger, frog.health);
    }
    
    function playWithFrog(uint256 frogId) external {
        require(_isApprovedOrOwner(msg.sender, frogId), "Not owner");
        Frog storage frog = frogs[frogId];
        require(block.timestamp >= frog.lastFed + PLAY_COOLDOWN, "Too soon to play");
        require(frog.energy >= 10, "Not enough energy");
        
        frog.happiness = frog.happiness < 90 ? frog.happiness + 10 : 100;
        frog.energy -= 10;
        
        _checkLevelUp(frogId);
        emit FrogPlayed(frogId, frog.happiness, frog.energy);
    }
    
    // ============ 内部函数 ============
    
    function _createSpecies(string memory name, string memory description, uint8 baseHealth, uint8 baseHappiness, uint8 baseEnergy, string memory imageURI) internal {
        uint8 id = nextSpeciesId++;
        Species storage s = species[id];
        s.id = id;
        s.name = name;
        s.description = description;
        s.baseHealth = baseHealth;
        s.baseHappiness = baseHappiness;
        s.baseEnergy = baseEnergy;
        s.imageURI = imageURI;
    }
    
    function _generateGenes(uint256 tokenId) internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, tokenId, msg.sender)));
    }
    
    function _calculateRarity(uint256 genes) internal pure returns (uint8) {
        uint256 rarityRoll = genes % 100;
        if (rarityRoll < 5) return 5; // Legendary
        if (rarityRoll < 15) return 4; // Epic
        if (rarityRoll < 35) return 3; // Rare
        if (rarityRoll < 65) return 2; // Uncommon
        return 1; // Common
    }
    
    function _checkLevelUp(uint256 frogId) internal {
        Frog storage frog = frogs[frogId];
        uint256 expNeeded = frog.level * 100;
        if (frog.experience >= expNeeded && frog.level < 50) {
            frog.level++;
            frog.experience = 0;
            emit FrogLeveledUp(frogId, frog.level);
        }
    }
    
    function _uintToString(uint256 value) internal pure returns (string memory) {
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
}
```