// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ZetaFrogNFT
 * @notice MVP version of the ZetaFrog Desktop Pet NFT
 * @dev Simplified single-contract implementation for hackathon
 */
contract ZetaFrogNFT is ERC721URIStorage, Ownable, ReentrancyGuard, Pausable {
    // ============ Constants ============
    uint256 public constant MAX_SUPPLY = 1000;
    uint256 public constant MIN_TRAVEL_DURATION = 1 minutes;
    uint256 public constant MAX_TRAVEL_DURATION = 24 hours;
    uint256 public constant COOLDOWN_PERIOD = 1 minutes;

    // ============ Enums ============
    enum FrogStatus {
        Idle,
        Traveling
    }

    // ============ Structs ============
    struct Frog {
        string name;
        uint64 birthday;
        uint32 totalTravels;
        FrogStatus status;
        uint256 xp;
        uint256 level;
    }

    struct Travel {
        uint64 startTime;
        uint64 endTime;
        address targetWallet;
        uint256 targetChainId;
        bool completed;
        bool isRandom;          // 新增：是否随机探索
    }

    // ============ State Variables ============
    uint256 private _tokenIdCounter;
    mapping(uint256 => Frog) public frogs;
    mapping(uint256 => Travel) public activeTravels;
    mapping(uint256 => uint64) public lastTravelEnd;
    mapping(uint256 => string[]) public travelJournals;
    
    // 新增：支持的链 ID
    mapping(uint256 => bool) public supportedChains;
    
    address public souvenirNFT;
    address public travelManager;

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
        uint256 targetChainId,
        uint64 startTime,
        uint64 endTime,
        bool isRandom              // 新增
    );
    
    event ChainSupportUpdated(uint256 indexed chainId, bool supported);  // 新增

    event TravelCompleted(
        uint256 indexed tokenId,
        string journalHash,
        uint256 souvenirId,
        uint256 timestamp
    );

    event TravelCancelled(uint256 indexed tokenId, uint256 timestamp);
    event LevelUp(uint256 indexed tokenId, uint256 newLevel, uint256 timestamp);

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
        travelManager = msg.sender;
        _initializeSupportedChains();
    }
    
    // 新增：初始化支持的链
    function _initializeSupportedChains() internal {
        supportedChains[97] = true;       // BSC Testnet
        supportedChains[11155111] = true; // ETH Sepolia
        supportedChains[7001] = true;     // ZetaChain Athens
        supportedChains[80001] = true;    // Polygon Mumbai
        supportedChains[421613] = true;   // Arbitrum Goerli
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
    
    // 新增：管理支持的链
    function setSupportedChain(uint256 chainId, bool supported) external onlyOwner {
        supportedChains[chainId] = supported;
        emit ChainSupportUpdated(chainId, supported);
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
    function mintFrog(string calldata name)
        external
        whenNotPaused
        nonReentrant
        returns (uint256)
    {
        bytes memory nameBytes = bytes(name);
        require(nameBytes.length >= 2 && nameBytes.length <= 16, "Name: 2-16 chars");
        require(_tokenIdCounter < MAX_SUPPLY, "Max supply reached");

        uint256 tokenId = _tokenIdCounter++;
        _safeMint(msg.sender, tokenId);

        frogs[tokenId] = Frog({
            name: name,
            birthday: uint64(block.timestamp),
            totalTravels: 0,
            status: FrogStatus.Idle,
            xp: 0,
            level: 1
        });

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
        uint256 duration,
        uint256 targetChainId
    ) external whenNotPaused nonReentrant onlyFrogOwner(tokenId) {
        Frog storage frog = frogs[tokenId];
        require(frog.status == FrogStatus.Idle, "Frog is busy");
        require(supportedChains[targetChainId], "Chain not supported");
        require(duration >= MIN_TRAVEL_DURATION, "Duration too short");
        require(duration <= MAX_TRAVEL_DURATION, "Duration too long");
        require(
            block.timestamp >= lastTravelEnd[tokenId] + COOLDOWN_PERIOD,
            "Still in cooldown"
        );
        
        // 关键修改：允许零地址（随机探索）
        bool isRandom = (targetWallet == address(0));

        frog.status = FrogStatus.Traveling;

        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = uint64(block.timestamp + duration);

        activeTravels[tokenId] = Travel({
            startTime: startTime,
            endTime: endTime,
            targetWallet: targetWallet,
            targetChainId: targetChainId,
            completed: false,
            isRandom: isRandom
        });

        emit TravelStarted(tokenId, targetWallet, targetChainId, startTime, endTime, isRandom);
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
        require(block.timestamp >= travel.startTime, "Travel not started");

        frog.status = FrogStatus.Idle;
        frog.totalTravels++;
        travel.completed = true;
        lastTravelEnd[tokenId] = uint64(block.timestamp);

        travelJournals[tokenId].push(journalHash);

        // Add XP reward
        uint256 xpReward = 50; // Base reward
        if (block.timestamp >= travel.endTime) {
            xpReward += 50; // Bonus for completing full journey
        }
        _addExperience(tokenId, xpReward);

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
        
        // Apply cooldown penalty for cancellation
        lastTravelEnd[tokenId] = uint64(block.timestamp + COOLDOWN_PERIOD);

        emit TravelCancelled(tokenId, block.timestamp);
    }

    /**
     * @notice Add experience to a frog (internal with external wrapper)
     */
    function _addExperience(uint256 tokenId, uint256 xpAmount) internal {
        Frog storage frog = frogs[tokenId];
        frog.xp += xpAmount;

        // Simple leveling logic: Every 100 XP = 1 Level
        uint256 newLevel = (frog.xp / 100) + 1;
        if (newLevel > frog.level) {
            frog.level = newLevel;
            emit LevelUp(tokenId, newLevel, block.timestamp);
        }
    }

    /**
     * @notice Add experience to a frog (public interface)
     * @param tokenId Frog NFT ID
     * @param xpAmount Amount of XP to add
     */
    function addExperience(uint256 tokenId, uint256 xpAmount)
        external
        onlyTravelManager
    {
        require(tokenId < _tokenIdCounter, "Frog does not exist");
        _addExperience(tokenId, xpAmount);
    }

    // ============ View Functions ============

    function getFrog(uint256 tokenId)
        external
        view
        returns (
            string memory name,
            uint64 birthday,
            uint32 totalTravels,
            FrogStatus status,
            uint256 xp,
            uint256 level
        )
    {
        Frog memory frog = frogs[tokenId];
        return (
            frog.name,
            frog.birthday,
            frog.totalTravels,
            frog.status,
            frog.xp,
            frog.level
        );
    }

    function getActiveTravel(uint256 tokenId)
        external
        view
        returns (
            uint64 startTime,
            uint64 endTime,
            address targetWallet,
            uint256 targetChainId,
            bool completed,
            bool isRandom       // 新增返回值
        )
    {
        Travel memory travel = activeTravels[tokenId];
        return (
            travel.startTime,
            travel.endTime,
            travel.targetWallet,
            travel.targetChainId,
            travel.completed,
            travel.isRandom
        );
    }
    
    function isChainSupported(uint256 chainId) external view returns (bool) {
        return supportedChains[chainId];
    }

    function getTravelJournals(uint256 tokenId)
        external
        view
        returns (string[] memory)
    {
        return travelJournals[tokenId];
    }

    function canTravel(uint256 tokenId) external view returns (bool) {
        if (tokenId >= _tokenIdCounter) return false;
        Frog memory frog = frogs[tokenId];
        if (frog.status != FrogStatus.Idle) return false;
        if (block.timestamp < lastTravelEnd[tokenId] + COOLDOWN_PERIOD)
            return false;
        return true;
    }

    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }

    // ============ Internal Functions ============

    function _generateInitialURI(uint256 tokenId, string memory name)
        internal
        pure
        returns (string memory)
    {
        return
            string(
                abi.encodePacked(
                    "data:application/json,",
                    '{"name":"',
                    name,
                    '",',
                    '"description":"A ZetaFrog Desktop Pet",',
                    '"image":"ipfs://placeholder",',
                    '"attributes":[{"trait_type":"ID","value":"',
                    _toString(tokenId),
                    '"}]}'
                )
            );
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
}