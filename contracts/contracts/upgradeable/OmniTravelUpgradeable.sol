// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../interfaces/ZetaInterfaces.sol";

/**
 * @title ISouvenirNFT Interface
 * @notice Interface for minting souvenir NFTs
 */
interface ISouvenirNFT {
    function mintSouvenir(address to, uint256 frogTokenId, string memory uri) external returns (uint256);
}

/**
 * @title OmniTravelUpgradeable (v3 - Gateway Based + UUPS)
 * @notice Cross-chain travel controller for ZetaFrog NFTs using ZetaChain Gateway
 * @dev Upgradeable version using UUPS proxy pattern
 */
contract OmniTravelUpgradeable is 
    Initializable,
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable, 
    PausableUpgradeable,
    UUPSUpgradeable 
{
    
    // ============ Enums ============
    enum CrossChainStatus {
        None,
        Locked,       // NFT locked on ZetaChain
        Traveling,    // Cross-chain message sent
        OnTarget,     // Confirmed arrival on target chain
        Returning,    // Return message sent
        Completed,    // Unlocked and completed
        Failed,       // Failed (can be emergency returned)
        Timeout       // Timed out (can be emergency returned)
    }
    
    // ============ Structs ============
    struct CrossChainTravel {
        uint256 tokenId;
        address owner;
        uint256 targetChainId;
        bytes32 outboundMessageId;
        bytes32 returnMessageId;
        uint64 startTime;
        uint64 maxDuration;
        CrossChainStatus status;
        bytes travelData;
    }
    
    struct GroupCrossChainTravel {
        uint256 leaderTokenId;
        uint256 companionTokenId;
        address leaderOwner;
        address companionOwner;
        uint256 targetChainId;
        bytes32 messageId;
        CrossChainStatus status;
    }
    
    struct ExplorationParams {
        uint256 tokenId;
        uint256 targetChainId;
        address zrc20;
        address wzetaAddr;
        uint256 minReserve;
        string observation;
    }
    
    // ============ Constants ============
    uint256 public constant MAX_TRAVEL_DURATION = 24 hours;
    uint256 public constant TIMEOUT_PERIOD = 2 hours;
    uint256 public constant DEFAULT_GAS_LIMIT = 500000;
    uint256 public constant MIN_PROVISIONS = 0.01 ether;
    uint256 public constant TEST_MIN_DURATION = 1 minutes;
    uint256 public constant TEST_MAX_DURATION = 5 minutes;
    uint256 public constant TEST_PROVISIONS = 0.001 ether;
    
    // ============ State Variables ============
    uint256 public provisionsFeePerHour;
    bool public testMode;
    
    IZetaFrogNFT public zetaFrogNFT;
    IGatewayZEVM public gateway;
    IUniswapV2Router02 public systemRouter;
    address public wzeta;
    
    mapping(uint256 => address) public chainZRC20;
    mapping(uint256 => CrossChainTravel) public crossChainTravels;
    mapping(bytes32 => uint256) public messageToToken;
    mapping(bytes32 => GroupCrossChainTravel) public groupTravels;
    mapping(uint256 => bytes) public chainConnectors;
    mapping(uint256 => bool) public supportedChains;
    
    address public travelManager;
    mapping(uint256 => uint256) public frogProvisions;
    uint256 private _messageNonce;
    
    // V4: Souvenir NFT integration
    ISouvenirNFT public souvenirNFT;
    
    // Reserved storage gap for future upgrades
    uint256[49] private __gap;
    
    // ============ Events ============
    event CrossChainTravelStarted(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 targetChainId,
        bytes32 messageId,
        uint64 startTime,
        uint64 maxDuration
    );
    
    event CrossChainTravelCompleted(
        uint256 indexed tokenId,
        bytes32 messageId,
        uint256 xpReward,
        uint256 timestamp
    );
    
    event CrossChainTravelFailed(
        uint256 indexed tokenId,
        bytes32 messageId,
        string reason,
        uint256 timestamp
    );
    
    event EmergencyReturn(
        uint256 indexed tokenId,
        address indexed owner,
        string reason,
        uint256 timestamp
    );
    
    event ProvisionsDeposited(
        uint256 indexed tokenId,
        uint256 amount,
        uint256 timestamp
    );
    
    event ChainConfigured(
        uint256 indexed chainId,
        bytes connector,
        address zrc20
    );
    
    event ProvisionsRefunded(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 amount,
        uint256 timestamp
    );
    
    event ExplorationTriggered(
        uint256 indexed tokenId,
        uint256 targetChainId,
        string observation,
        uint256 timestamp
    );
    
    event ExplorationCompleted(
        uint256 indexed tokenId,
        address exploredAddress,
        bool isContract,
        string observation,
        uint256 timestamp
    );
    
    // ============ Modifiers ============
    modifier onlyTravelManager() {
        require(msg.sender == travelManager || msg.sender == owner(), "Not authorized");
        _;
    }
    
    modifier onlyGateway() {
        require(msg.sender == address(gateway), "Only gateway");
        _;
    }
    
    // ============ Initializer (Replaces Constructor) ============
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize the contract (replaces constructor)
     * @param _zetaFrogNFT Address of ZetaFrogNFT proxy
     * @param _gateway Address of ZetaChain Gateway
     */
    function initialize(
        address _zetaFrogNFT,
        address _gateway
    ) public initializer {
        require(_zetaFrogNFT != address(0), "Invalid NFT address");
        require(_gateway != address(0), "Invalid gateway address");
        
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        
        zetaFrogNFT = IZetaFrogNFT(_zetaFrogNFT);
        gateway = IGatewayZEVM(_gateway);
        provisionsFeePerHour = 0.005 ether;
        testMode = false;
    }
    
    /**
     * @notice Authorize upgrade (required by UUPS)
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    /**
     * @notice Get contract version
     */
    function version() external pure returns (string memory) {
        return "3.1.0";
    }
    
    // ============ Admin Functions ============
    
    function setTestMode(bool _testMode) external onlyOwner {
        testMode = _testMode;
    }
    
    function setTravelManager(address _manager) external onlyOwner {
        require(_manager != address(0), "Invalid address");
        travelManager = _manager;
    }
    
    function setProvisionsFee(uint256 _feePerHour) external onlyOwner {
        provisionsFeePerHour = _feePerHour;
    }
    
    function setChainConfig(
        uint256 chainId,
        bytes calldata connector,
        address zrc20
    ) external onlyOwner {
        require(connector.length > 0, "Invalid connector");
        require(zrc20 != address(0), "Invalid ZRC20");
        
        chainConnectors[chainId] = connector;
        chainZRC20[chainId] = zrc20;
        supportedChains[chainId] = true;
        
        emit ChainConfigured(chainId, connector, zrc20);
    }
    
    function setSystemConfig(address _router, address _wzeta) external onlyOwner {
        require(_router != address(0), "Invalid router");
        require(_wzeta != address(0), "Invalid wzeta");
        systemRouter = IUniswapV2Router02(_router);
        wzeta = _wzeta;
    }
    
    function setChainConnector(uint256 chainId, bytes calldata connector) external onlyOwner {
        chainConnectors[chainId] = connector;
        supportedChains[chainId] = true;
    }
    
    /**
     * @notice Set SouvenirNFT contract address (V4)
     */
    function setSouvenirNFT(address _souvenirNFT) external onlyOwner {
        require(_souvenirNFT != address(0), "Invalid souvenir address");
        souvenirNFT = ISouvenirNFT(_souvenirNFT);
    }
    
    /**
     * @notice Admin function to clear a stuck cross-chain travel record
     * @dev Use when markTravelCompleted fails or frog is stuck in invalid state
     * @param tokenId The frog token ID to clear
     */
    function adminClearStuckTravel(uint256 tokenId) external onlyOwner {
        CrossChainTravel storage travel = crossChainTravels[tokenId];
        
        // Reset NFT status to Idle
        try zetaFrogNFT.setFrogStatus(tokenId, IZetaFrogNFT.FrogStatus.Idle) {
            // Success
        } catch {
            // If setFrogStatus fails, continue anyway to clear the record
        }
        
        // Clear the travel record
        travel.status = CrossChainStatus.Completed;
        
        // Refund any remaining provisions
        _refundRemainingProvisions(tokenId);
        
        emit CrossChainTravelCompleted(tokenId, travel.outboundMessageId, 0, block.timestamp);
    }
    
    /**
     * @notice Admin function to batch clear stuck travels
     */
    function adminBatchClearStuckTravels(uint256[] calldata tokenIds) external onlyOwner {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            CrossChainTravel storage travel = crossChainTravels[tokenIds[i]];
            try zetaFrogNFT.setFrogStatus(tokenIds[i], IZetaFrogNFT.FrogStatus.Idle) {} catch {}
            travel.status = CrossChainStatus.Completed;
            _refundRemainingProvisions(tokenIds[i]);
            emit CrossChainTravelCompleted(tokenIds[i], travel.outboundMessageId, 0, block.timestamp);
        }
    }
    
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
    
    // ============ View Functions ============
    
    function calculateProvisions(uint256 durationHours) public view returns (uint256) {
        if (testMode && durationHours <= 1) {
            return TEST_PROVISIONS;
        }
        return MIN_PROVISIONS + (durationHours * provisionsFeePerHour);
    }
    
    function canStartCrossChainTravel(uint256 tokenId) public view returns (bool) {
        IZetaFrogNFT.FrogStatus status = zetaFrogNFT.getFrogStatus(tokenId);
        if (status != IZetaFrogNFT.FrogStatus.Idle) {
            return false;
        }
        
        CrossChainStatus ccStatus = crossChainTravels[tokenId].status;
        if (ccStatus != CrossChainStatus.None && ccStatus != CrossChainStatus.Completed) {
            return false;
        }
        
        return true;
    }
    
    function getSupportedChains() external view returns (uint256[] memory) {
        uint256[] memory chains = new uint256[](10);
        uint256 count = 0;
        
        uint256[10] memory commonChains = [
            uint256(97), uint256(11155111), uint256(80001), uint256(421613), uint256(420),
            uint256(1), uint256(56), uint256(137), uint256(42161), uint256(10)
        ];
        
        for (uint256 i = 0; i < 10; i++) {
            if (supportedChains[commonChains[i]]) {
                chains[count] = commonChains[i];
                count++;
            }
        }
        
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = chains[i];
        }
        
        return result;
    }
    
    function getRemainingProvisions(uint256 tokenId) external view returns (uint256) {
        return frogProvisions[tokenId];
    }
    
    // ============ Core Functions ============
    
    function startCrossChainTravel(
        uint256 tokenId,
        uint256 targetChainId,
        uint256 duration
    ) external payable whenNotPaused nonReentrant {
        require(zetaFrogNFT.ownerOf(tokenId) == msg.sender, "Not owner");
        require(supportedChains[targetChainId], "Chain not supported");
        require(chainConnectors[targetChainId].length > 0, "Connector not set");
        require(duration > 0 && duration <= MAX_TRAVEL_DURATION, "Invalid duration");
        require(crossChainTravels[tokenId].status == CrossChainStatus.None || 
                crossChainTravels[tokenId].status == CrossChainStatus.Completed, "Already traveling");
        
        uint256 durationHours = (duration + 3599) / 3600;
        uint256 requiredProvisions = calculateProvisions(durationHours);
        require(msg.value >= requiredProvisions, "Insufficient provisions");
        
        IZetaFrogNFT.FrogStatus currentStatus = zetaFrogNFT.getFrogStatus(tokenId);
        require(currentStatus == IZetaFrogNFT.FrogStatus.Idle, "Frog not idle");
        
        zetaFrogNFT.setFrogStatus(tokenId, IZetaFrogNFT.FrogStatus.Traveling);
        frogProvisions[tokenId] = msg.value;
        
        bytes32 messageId = keccak256(abi.encodePacked(
            tokenId, msg.sender, targetChainId, block.timestamp, _messageNonce++
        ));
        
        (string memory name, , , , , uint256 level) = zetaFrogNFT.frogs(tokenId);
        
        bytes memory travelData = abi.encode(
            tokenId, msg.sender, name, level, duration, msg.value
        );
        
        crossChainTravels[tokenId] = CrossChainTravel({
            tokenId: tokenId,
            owner: msg.sender,
            targetChainId: targetChainId,
            outboundMessageId: messageId,
            returnMessageId: bytes32(0),
            startTime: uint64(block.timestamp),
            maxDuration: uint64(duration),
            status: CrossChainStatus.Locked,
            travelData: travelData
        });
        
        messageToToken[messageId] = tokenId;
        
        _sendCrossChainMessage(targetChainId, messageId, travelData);
        
        crossChainTravels[tokenId].status = CrossChainStatus.Traveling;
        
        emit ProvisionsDeposited(tokenId, msg.value, block.timestamp);
        emit CrossChainTravelStarted(
            tokenId, msg.sender, targetChainId, messageId,
            uint64(block.timestamp), uint64(duration)
        );
    }
    
    function _sendCrossChainMessage(
        uint256 targetChainId,
        bytes32 messageId,
        bytes memory travelData
    ) internal {
        bytes memory receiver = chainConnectors[targetChainId];
        address zrc20 = chainZRC20[targetChainId];
        
        if (testMode) { return; }
        if (zrc20 == address(0)) { return; }

        require(address(systemRouter) != address(0), "System router not configured");
        require(wzeta != address(0), "WZETA not configured");
        
        bytes memory message = abi.encode(messageId, travelData, block.timestamp);
        
        CallOptions memory callOptions = CallOptions({
            gasLimit: DEFAULT_GAS_LIMIT,
            isArbitraryCall: false
        });
        
        RevertOptions memory revertOptions = RevertOptions({
            revertAddress: address(this),
            callOnRevert: true,
            abortAddress: address(0),
            revertMessage: abi.encode(messageId),
            onRevertGasLimit: 200000
        });
        
        (address gasZRC20, uint256 gasFee) = IZRC20(zrc20).withdrawGasFeeWithGasLimit(DEFAULT_GAS_LIMIT);
        
        address[] memory path = new address[](2);
        path[0] = wzeta;
        path[1] = zrc20;
        
        uint256[] memory amountsIn = systemRouter.getAmountsIn(gasFee, path);
        uint256 zetaCost = amountsIn[0] * 105 / 100;
        
        uint256 tokenId = messageToToken[messageId];
        require(tokenId != 0, "Token ID not found");
        require(frogProvisions[tokenId] >= zetaCost, "Insufficient provisions for gas swap");
        
        frogProvisions[tokenId] -= zetaCost;
        
        uint256[] memory amounts = systemRouter.swapExactETHForTokens{value: zetaCost}(
            0, path, address(this), block.timestamp + 300
        );
        
        uint256 finalZrc20Amount = amounts[amounts.length - 1];
        
        IZRC20(gasZRC20).approve(address(gateway), finalZrc20Amount);
        
        gateway.call(receiver, zrc20, message, callOptions, revertOptions);
    }
    
    function onCall(
        MessageContext calldata,
        address,
        uint256,
        bytes calldata message
    ) external onlyGateway {
        (bytes32 messageId, uint256 tokenId, bool success, uint256 xpEarned) = 
            abi.decode(message, (bytes32, uint256, bool, uint256));
        
        CrossChainTravel storage travel = crossChainTravels[tokenId];
        require(travel.status == CrossChainStatus.Traveling || 
                travel.status == CrossChainStatus.OnTarget, "Invalid status");
        
        if (success) {
            zetaFrogNFT.setFrogStatus(tokenId, IZetaFrogNFT.FrogStatus.Idle);
            if (xpEarned > 0) {
                zetaFrogNFT.addExperience(tokenId, xpEarned);
            }
            _refundRemainingProvisions(tokenId);
            travel.status = CrossChainStatus.Completed;
            travel.returnMessageId = messageId;
            emit CrossChainTravelCompleted(tokenId, messageId, xpEarned, block.timestamp);
        } else {
            travel.status = CrossChainStatus.Failed;
            zetaFrogNFT.setFrogStatus(tokenId, IZetaFrogNFT.FrogStatus.Idle);
            _refundRemainingProvisions(tokenId);
            emit CrossChainTravelFailed(tokenId, messageId, "Target chain failure", block.timestamp);
        }
    }
    
    function onRevert(RevertContext calldata revertContext) external onlyGateway {
        bytes32 messageId = abi.decode(revertContext.revertMessage, (bytes32));
        uint256 tokenId = messageToToken[messageId];
        
        if (tokenId != 0) {
            CrossChainTravel storage travel = crossChainTravels[tokenId];
            travel.status = CrossChainStatus.Failed;
            zetaFrogNFT.setFrogStatus(tokenId, IZetaFrogNFT.FrogStatus.Idle);
            emit CrossChainTravelFailed(tokenId, messageId, "Cross-chain revert", block.timestamp);
        }
    }
    
    function triggerExploration(
        uint256 tokenId,
        string calldata observation,
        uint256 minReserve
    ) external onlyTravelManager {
        ExplorationParams memory params;
        params.tokenId = tokenId;
        params.observation = observation;
        params.minReserve = minReserve;
        
        CrossChainTravel storage travel = crossChainTravels[params.tokenId];
        require(travel.status == CrossChainStatus.Traveling, "Frog not on target chain");
        
        params.targetChainId = travel.targetChainId;
        bytes memory receiver = chainConnectors[params.targetChainId];
        params.zrc20 = chainZRC20[params.targetChainId];
        params.wzetaAddr = wzeta;
        
        require(receiver.length > 0, "Chain not configured");
        require(address(systemRouter) != address(0), "System router not configured");
        
        if (testMode || params.zrc20 == address(0)) {
            emit ExplorationTriggered(params.tokenId, params.targetChainId, params.observation, block.timestamp);
            return;
        }
        
        ( , uint256 zrc20GasFee) = IZRC20(params.zrc20).withdrawGasFeeWithGasLimit(300000);
        
        address[] memory path = new address[](2);
        path[0] = params.wzetaAddr;
        path[1] = params.zrc20;
        
        uint256[] memory amountsIn = systemRouter.getAmountsIn(zrc20GasFee, path);
        uint256 zetaCost = amountsIn[0] * 105 / 100;
        
        if (frogProvisions[params.tokenId] < zetaCost + params.minReserve) {
            emit ExplorationTriggered(params.tokenId, params.targetChainId, string(abi.encodePacked("[VIRTUAL] ", params.observation)), block.timestamp);
            return;
        }

        frogProvisions[params.tokenId] -= zetaCost;
        
        uint256[] memory amounts = systemRouter.swapExactETHForTokens{value: zetaCost}(
            0, path, address(this), block.timestamp + 300
        );
        uint256 finalZrc20Amount = amounts[amounts.length - 1];
        
        IZRC20(params.zrc20).approve(address(gateway), finalZrc20Amount);

        gateway.call(
            receiver, params.zrc20, 
            abi.encode(bytes4(keccak256("exploration")), params.tokenId, params.observation, block.timestamp), 
            CallOptions(300000, false), 
            RevertOptions(address(this), false, address(0), bytes(""), 0)
        );
        
        emit ExplorationTriggered(params.tokenId, params.targetChainId, params.observation, block.timestamp);
    }
    
    function handleExplorationResult(
        uint256 tokenId,
        address exploredAddress,
        bool isContract,
        string calldata observation
    ) external onlyGateway {
        CrossChainTravel storage travel = crossChainTravels[tokenId];
        
        if (travel.status == CrossChainStatus.Traveling) {
            emit ExplorationCompleted(tokenId, exploredAddress, isContract, observation, block.timestamp);
        }
    }
    
    function emergencyReturn(uint256 tokenId) external nonReentrant {
        CrossChainTravel storage travel = crossChainTravels[tokenId];
        
        require(travel.owner == msg.sender || msg.sender == owner(), "Not authorized");
        require(
            travel.status == CrossChainStatus.Traveling ||
            travel.status == CrossChainStatus.OnTarget ||
            travel.status == CrossChainStatus.Failed ||
            travel.status == CrossChainStatus.Timeout,
            "Cannot emergency return"
        );
        
        if (msg.sender != owner()) {
            require(
                block.timestamp > travel.startTime + travel.maxDuration + TIMEOUT_PERIOD,
                "Not yet timed out"
            );
        }
        
        zetaFrogNFT.setFrogStatus(tokenId, IZetaFrogNFT.FrogStatus.Idle);
        travel.status = CrossChainStatus.Completed;
        _refundRemainingProvisions(tokenId);
        
        emit EmergencyReturn(tokenId, msg.sender, "Emergency return executed", block.timestamp);
    }
    
    // V4: Event for failed souvenir minting
    event SouvenirMintFailed(uint256 indexed tokenId, address owner, string reason);
    event SouvenirMinted(uint256 indexed tokenId, address owner, uint256 souvenirId);
    
    /**
     * @notice Mark cross-chain travel as completed (V4: with souvenir minting)
     * @param tokenId The frog token ID
     * @param xpReward XP reward amount
     * @param souvenirUri IPFS URI for the souvenir NFT metadata (empty to skip minting)
     */
    function markTravelCompleted(
        uint256 tokenId, 
        uint256 xpReward,
        string calldata souvenirUri
    ) external onlyTravelManager {
        CrossChainTravel storage travel = crossChainTravels[tokenId];
        require(travel.status != CrossChainStatus.None, "No travel found");
        
        zetaFrogNFT.setFrogStatus(tokenId, IZetaFrogNFT.FrogStatus.Idle);
        if (xpReward > 0) {
            zetaFrogNFT.addExperience(tokenId, xpReward);
        }
        
        // V4: Mint souvenir NFT if URI provided and souvenirNFT is configured
        if (address(souvenirNFT) != address(0) && bytes(souvenirUri).length > 0) {
            try souvenirNFT.mintSouvenir(travel.owner, tokenId, souvenirUri) returns (uint256 souvenirId) {
                emit SouvenirMinted(tokenId, travel.owner, souvenirId);
            } catch Error(string memory reason) {
                emit SouvenirMintFailed(tokenId, travel.owner, reason);
            } catch {
                emit SouvenirMintFailed(tokenId, travel.owner, "Unknown error");
            }
        }
        
        _refundRemainingProvisions(tokenId);
        travel.status = CrossChainStatus.Completed;
        
        emit CrossChainTravelCompleted(tokenId, travel.outboundMessageId, xpReward, block.timestamp);
    }
    
    /**
     * @notice Legacy markTravelCompleted without souvenir (backward compatible)
     */
    function markTravelCompletedLegacy(uint256 tokenId, uint256 xpReward) external onlyTravelManager {
        this.markTravelCompleted(tokenId, xpReward, "");
    }
    
    // ============ Internal Functions ============
    
    function _refundRemainingProvisions(uint256 tokenId) internal {
        uint256 remaining = frogProvisions[tokenId];
        if (remaining > 0) {
            address travelOwner = crossChainTravels[tokenId].owner;
            frogProvisions[tokenId] = 0;
            
            (bool success, ) = travelOwner.call{value: remaining}("");
            if (success) {
                emit ProvisionsRefunded(tokenId, travelOwner, remaining, block.timestamp);
            }
        }
    }
    
    // ============ Group Cross-Chain Travel Functions ============
    
    event GroupCrossChainTravelStarted(
        uint256 indexed leaderTokenId,
        uint256 indexed companionTokenId,
        address indexed leaderOwner,
        address companionOwner,
        uint256 targetChainId,
        bytes32 messageId,
        uint64 startTime,
        uint64 maxDuration
    );
    
    /**
     * @notice Calculate provisions for group travel (1.5x single traveler)
     */
    function calculateGroupProvisions(uint256 durationHours) public view returns (uint256) {
        uint256 singleProvisions = calculateProvisions(durationHours);
        return (singleProvisions * 3) / 2; // 1.5x social discount
    }
    
    /**
     * @notice Start a cross-chain group travel for two frogs
     * @param leaderTokenId The leader frog token ID (pays gas)
     * @param companionTokenId The companion frog token ID
     * @param targetChainId The destination chain ID
     * @param duration Travel duration in seconds
     */
    function startGroupCrossChainTravel(
        uint256 leaderTokenId,
        uint256 companionTokenId,
        uint256 targetChainId,
        uint256 duration
    ) external payable whenNotPaused nonReentrant {
        // 1. Validate leader ownership
        require(zetaFrogNFT.ownerOf(leaderTokenId) == msg.sender, "Not leader owner");
        
        // 2. Validate chain support
        require(supportedChains[targetChainId], "Chain not supported");
        require(chainConnectors[targetChainId].length > 0, "Connector not set");
        
        // 3. Validate duration
        require(duration > 0 && duration <= MAX_TRAVEL_DURATION, "Invalid duration");
        
        // 4. Validate both frogs are idle
        require(canStartCrossChainTravel(leaderTokenId), "Leader not available");
        require(canStartCrossChainTravel(companionTokenId), "Companion not available");
        
        // 5. Calculate and validate group provisions (1.5x single)
        uint256 durationHours = (duration + 3599) / 3600;
        uint256 requiredProvisions = calculateGroupProvisions(durationHours);
        require(msg.value >= requiredProvisions, "Insufficient provisions");
        
        // 6. Lock leader NFT (companion is tracked in backend DB)
        zetaFrogNFT.setFrogStatus(leaderTokenId, IZetaFrogNFT.FrogStatus.Traveling);
        
        // 7. Generate message ID
        bytes32 messageId = keccak256(abi.encodePacked(
            "GROUP",
            leaderTokenId,
            companionTokenId,
            msg.sender,
            targetChainId,
            block.timestamp,
            _messageNonce++
        ));
        
        // 8. Store group travel info
        groupTravels[messageId] = GroupCrossChainTravel({
            leaderTokenId: leaderTokenId,
            companionTokenId: companionTokenId,
            leaderOwner: msg.sender,
            companionOwner: zetaFrogNFT.ownerOf(companionTokenId),
            targetChainId: targetChainId,
            messageId: messageId,
            status: CrossChainStatus.Locked
        });
        
        // 9. Store provisions under leader tokenId
        frogProvisions[leaderTokenId] = msg.value;
        
        // Map messageId to leader tokenId for refund
        messageToToken[messageId] = leaderTokenId;
        
        // 10. Send cross-chain message (if not test mode)
        if (!testMode) {
            bytes memory travelData = abi.encode(
                leaderTokenId,
                companionTokenId,
                msg.sender,
                duration
            );
            _sendCrossChainMessage(targetChainId, messageId, travelData);
        }
        
        // 11. Update status to traveling
        groupTravels[messageId].status = CrossChainStatus.Traveling;
        
        // 12. Emit event
        emit GroupCrossChainTravelStarted(
            leaderTokenId,
            companionTokenId,
            msg.sender,
            zetaFrogNFT.ownerOf(companionTokenId),
            targetChainId,
            messageId,
            uint64(block.timestamp),
            uint64(duration)
        );
    }
    
    receive() external payable {}
}
