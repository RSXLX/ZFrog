// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

interface IZetaFrogNFT {
    enum FrogStatus { Idle, Traveling }
    function ownerOf(uint256 tokenId) external view returns (address);
    function getFrogStatus(uint256 tokenId) external view returns (FrogStatus);
    function setFrogStatus(uint256 tokenId, FrogStatus status) external;
    function addExperience(uint256 tokenId, uint256 xpAmount) external;
}

/**
 * @title TravelUpgradeable
 * @notice Manages local (same-chain) travel logic for ZetaFrogNFT
 * @dev Upgradeable version using UUPS proxy pattern
 */
contract TravelUpgradeable is 
    Initializable,
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable, 
    PausableUpgradeable,
    UUPSUpgradeable 
{
    // ============ Constants ============
    uint256 public constant MIN_TRAVEL_DURATION = 1 minutes;
    uint256 public constant MAX_TRAVEL_DURATION = 24 hours;
    uint256 public constant COOLDOWN_PERIOD = 1 minutes;

    // ============ Structs ============
    struct TravelSession {
        uint64 startTime;
        uint64 endTime;
        address targetWallet;
        uint32 targetChainId;
        bool completed;
        bool isRandom;
    }

    // ============ State Variables ============
    IZetaFrogNFT public zetaFrogNFT;
    address public travelManager;

    mapping(uint256 => TravelSession) public activeTravels;
    mapping(uint256 => uint64) public lastTravelEnd;
    mapping(uint256 => string[]) public travelJournals;
    mapping(uint256 => bool) public supportedChains;

    // Reserved storage gap for future upgrades
    uint256[50] private __gap;

    // ============ Events ============
    event TravelStarted(
        uint256 indexed tokenId,
        address indexed targetWallet,
        uint256 targetChainId,
        uint64 startTime,
        uint64 endTime,
        bool isRandom
    );

    event TravelCompleted(
        uint256 indexed tokenId,
        string journalHash,
        uint256 souvenirId,
        uint256 timestamp,
        uint256 xpReward
    );

    event TravelCancelled(uint256 indexed tokenId, uint256 timestamp);
    event ChainSupportUpdated(uint256 indexed chainId, bool supported);

    // ============ Modifiers ============
    modifier onlyTravelManager() {
        require(msg.sender == travelManager, "Not travel manager");
        _;
    }

    modifier onlyFrogOwner(uint256 tokenId) {
        require(zetaFrogNFT.ownerOf(tokenId) == msg.sender, "Not frog owner");
        _;
    }

    // ============ Initializer ============
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the contract (replaces constructor)
     * @param _zetaFrogNFT Address of ZetaFrogNFT proxy
     */
    function initialize(address _zetaFrogNFT) public initializer {
        require(_zetaFrogNFT != address(0), "Invalid NFT address");
        
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        
        zetaFrogNFT = IZetaFrogNFT(_zetaFrogNFT);
        travelManager = msg.sender;
        
        _initializeSupportedChains();
    }

    function _initializeSupportedChains() internal {
        supportedChains[97] = true;       // BSC Testnet
        supportedChains[11155111] = true; // ETH Sepolia
        supportedChains[7001] = true;     // ZetaChain Athens
        supportedChains[80001] = true;    // Polygon Mumbai
        supportedChains[421613] = true;   // Arbitrum Goerli
    }
    
    /**
     * @notice Authorize upgrade (required by UUPS)
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @notice Get contract version
     */
    function version() external pure returns (string memory) {
        return "2.0.0";
    }

    // ============ Admin Functions ============
    function setTravelManager(address _manager) external onlyOwner {
        require(_manager != address(0), "Invalid address");
        travelManager = _manager;
    }

    function setSupportedChain(uint256 chainId, bool supported) external onlyOwner {
        supportedChains[chainId] = supported;
        emit ChainSupportUpdated(chainId, supported);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ============ Core Functions ============

    function startTravel(
        uint256 tokenId,
        address targetWallet,
        uint256 duration,
        uint256 targetChainId
    ) external whenNotPaused nonReentrant onlyFrogOwner(tokenId) {
        require(zetaFrogNFT.getFrogStatus(tokenId) == IZetaFrogNFT.FrogStatus.Idle, "Frog is busy");
        require(supportedChains[targetChainId], "Chain not supported");
        require(duration >= MIN_TRAVEL_DURATION, "Duration too short");
        require(duration <= MAX_TRAVEL_DURATION, "Duration too long");
        require(
            block.timestamp >= lastTravelEnd[tokenId] + COOLDOWN_PERIOD,
            "Still in cooldown"
        );

        zetaFrogNFT.setFrogStatus(tokenId, IZetaFrogNFT.FrogStatus.Traveling);

        bool isRandom = (targetWallet == address(0));
        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = uint64(block.timestamp + duration);

        activeTravels[tokenId] = TravelSession({
            startTime: startTime,
            endTime: endTime,
            targetWallet: targetWallet,
            targetChainId: uint32(targetChainId),
            completed: false,
            isRandom: isRandom
        });

        emit TravelStarted(tokenId, targetWallet, targetChainId, startTime, endTime, isRandom);
    }

    function completeTravel(
        uint256 tokenId,
        string calldata journalHash,
        uint256 souvenirId,
        bool success
    ) external onlyTravelManager nonReentrant {
        TravelSession storage session = activeTravels[tokenId];
        
        require(!session.completed, "Already completed");
        require(block.timestamp >= session.startTime, "Travel not started");

        session.completed = true;
        lastTravelEnd[tokenId] = uint64(block.timestamp);
        
        zetaFrogNFT.setFrogStatus(tokenId, IZetaFrogNFT.FrogStatus.Idle);

        if (success) {
            travelJournals[tokenId].push(journalHash);

            uint256 xpReward = 50;
            if (block.timestamp >= session.endTime) {
                xpReward += 50;
            }
            zetaFrogNFT.addExperience(tokenId, xpReward);

            emit TravelCompleted(tokenId, journalHash, souvenirId, block.timestamp, xpReward);
        } else {
             emit TravelCompleted(tokenId, "", 0, block.timestamp, 0);
        }
    }

    function cancelTravel(uint256 tokenId) external onlyFrogOwner(tokenId) {
        require(zetaFrogNFT.getFrogStatus(tokenId) == IZetaFrogNFT.FrogStatus.Traveling, "Not traveling");
        
        activeTravels[tokenId].completed = true;
        lastTravelEnd[tokenId] = uint64(block.timestamp + COOLDOWN_PERIOD);
        
        zetaFrogNFT.setFrogStatus(tokenId, IZetaFrogNFT.FrogStatus.Idle);

        emit TravelCancelled(tokenId, block.timestamp);
    }

    // ============ View Functions ============

    function getActiveTravel(uint256 tokenId)
        external
        view
        returns (
            uint64 startTime,
            uint64 endTime,
            address targetWallet,
            uint256 targetChainId,
            bool completed,
            bool isRandom
        )
    {
        TravelSession memory session = activeTravels[tokenId];
        return (
            session.startTime,
            session.endTime,
            session.targetWallet,
            session.targetChainId,
            session.completed,
            session.isRandom
        );
    }
    
    function getTravelJournals(uint256 tokenId) external view returns (string[] memory) {
        return travelJournals[tokenId];
    }
}
