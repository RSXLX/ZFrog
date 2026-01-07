// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/ZetaInterfaces.sol";

/**
 * @title OmniTravel (v2 - Gateway Based)
 * @notice Cross-chain travel controller for ZetaFrog NFTs using ZetaChain Gateway
 * @dev Uses the new Gateway-based cross-chain messaging system instead of deprecated Connector
 */
contract OmniTravel is Ownable, ReentrancyGuard, Pausable {
    
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
    
    // ============ Constants ============
    uint256 public constant MAX_TRAVEL_DURATION = 24 hours;
    uint256 public constant TIMEOUT_PERIOD = 2 hours;
    uint256 public constant DEFAULT_GAS_LIMIT = 500000;
    
    // Provisions (干粮) fee configuration
    uint256 public constant MIN_PROVISIONS = 0.01 ether;
    uint256 public provisionsFeePerHour = 0.005 ether;
    
    // Test mode configuration
    bool public testMode = false;
    uint256 public constant TEST_MIN_DURATION = 1 minutes;
    uint256 public constant TEST_MAX_DURATION = 5 minutes;
    uint256 public constant TEST_PROVISIONS = 0.001 ether;
    
    // ============ State Variables ============
    IZetaFrogNFT public zetaFrogNFT;
    IGatewayZEVM public gateway;
    
    // System DEX Router (ZetaChain internal)
    IUniswapV2Router02 public systemRouter;
    // WZETA Address (Wrapped ZETA)
    address public wzeta;
    
    // ZRC20 tokens for each chain (used to pay gas fees)
    mapping(uint256 => address) public chainZRC20;
    
    // Cross-chain travel tracking
    mapping(uint256 => CrossChainTravel) public crossChainTravels;
    mapping(bytes32 => uint256) public messageToToken;
    
    // Group travel tracking
    mapping(bytes32 => GroupCrossChainTravel) public groupTravels;
    
    // Supported chains and their connector addresses
    mapping(uint256 => bytes) public chainConnectors;
    mapping(uint256 => bool) public supportedChains;
    
    // Backend service address
    address public travelManager;
    
    // Provisions tracking
    mapping(uint256 => uint256) public frogProvisions;
    
    // Nonce for message ID generation
    uint256 private _messageNonce;
    
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
    
    // Gateway-based exploration events
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
    
    // ============ Constructor ============
    constructor(
        address _zetaFrogNFT,
        address _gateway
    ) Ownable(msg.sender) {
        require(_zetaFrogNFT != address(0), "Invalid NFT address");
        require(_gateway != address(0), "Invalid gateway address");
        
        zetaFrogNFT = IZetaFrogNFT(_zetaFrogNFT);
        gateway = IGatewayZEVM(_gateway);
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
    
    /**
     * @notice Configure a supported chain with its connector and ZRC20 gas token
     * @param chainId The chain ID
     * @param connector The connector address on the target chain (bytes format)
     * @param zrc20 The ZRC20 token representing the chain's gas token
     */
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
        emit ChainConfigured(chainId, connector, zrc20);
    }
    
    function setSystemConfig(address _router, address _wzeta) external onlyOwner {
        require(_router != address(0), "Invalid router");
        require(_wzeta != address(0), "Invalid wzeta");
        systemRouter = IUniswapV2Router02(_router);
        wzeta = _wzeta;
    }
    
    // Legacy compatibility
    function setChainConnector(uint256 chainId, bytes calldata connector) external onlyOwner {
        chainConnectors[chainId] = connector;
        supportedChains[chainId] = true;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // ============ View Functions ============
    
    function calculateProvisions(uint256 durationHours) public view returns (uint256) {
        if (testMode && durationHours <= 1) {
            return TEST_PROVISIONS;
        }
        return MIN_PROVISIONS + (durationHours * provisionsFeePerHour);
    }
    
    function canStartCrossChainTravel(uint256 tokenId) public view returns (bool) {
        // Check frog status
        IZetaFrogNFT.FrogStatus status = zetaFrogNFT.getFrogStatus(tokenId);
        if (status != IZetaFrogNFT.FrogStatus.Idle) {
            return false;
        }
        
        // Check no active cross-chain travel
        CrossChainStatus ccStatus = crossChainTravels[tokenId].status;
        if (ccStatus != CrossChainStatus.None && ccStatus != CrossChainStatus.Completed) {
            return false;
        }
        
        return true;
    }
    
    function getSupportedChains() external view returns (uint256[] memory) {
        uint256[] memory chains = new uint256[](10);
        uint256 count = 0;
        
        // Common chain IDs to check
        uint256[10] memory commonChains = [
            uint256(97),      // BSC Testnet
            uint256(11155111),// Sepolia
            uint256(80001),   // Mumbai
            uint256(421613),  // Arbitrum Goerli
            uint256(420),     // Optimism Goerli
            uint256(1),       // Ethereum
            uint256(56),      // BSC
            uint256(137),     // Polygon
            uint256(42161),   // Arbitrum
            uint256(10)       // Optimism
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
    
    // ============ Core Functions ============
    
    /**
     * @notice Start a cross-chain travel for a frog
     * @param tokenId The frog token ID
     * @param targetChainId The destination chain ID
     * @param duration The travel duration in seconds
     */
    function startCrossChainTravel(
        uint256 tokenId,
        uint256 targetChainId,
        uint256 duration
    ) external payable whenNotPaused nonReentrant {
        // Validations
        require(zetaFrogNFT.ownerOf(tokenId) == msg.sender, "Not owner");
        require(supportedChains[targetChainId], "Chain not supported");
        require(chainConnectors[targetChainId].length > 0, "Connector not set");
        require(duration > 0 && duration <= MAX_TRAVEL_DURATION, "Invalid duration");
        require(crossChainTravels[tokenId].status == CrossChainStatus.None || 
                crossChainTravels[tokenId].status == CrossChainStatus.Completed, "Already traveling");
        
        // Calculate and validate provisions
        uint256 durationHours = (duration + 3599) / 3600;
        uint256 requiredProvisions = calculateProvisions(durationHours);
        require(msg.value >= requiredProvisions, "Insufficient provisions");
        
        IZetaFrogNFT.FrogStatus currentStatus = zetaFrogNFT.getFrogStatus(tokenId);
        require(currentStatus == IZetaFrogNFT.FrogStatus.Idle, "Frog not idle");
        
        // Lock the NFT (use Traveling status as compatible lock state)
        zetaFrogNFT.setFrogStatus(tokenId, IZetaFrogNFT.FrogStatus.Traveling);
        
        // Store provisions amount
        frogProvisions[tokenId] = msg.value;
        
        // Generate message ID
        bytes32 messageId = keccak256(abi.encodePacked(
            tokenId,
            msg.sender,
            targetChainId,
            block.timestamp,
            _messageNonce++
        ));
        
        // Get frog metadata
        (string memory name, , , , , uint256 level) = zetaFrogNFT.frogs(tokenId);
        
        // Encode travel data
        bytes memory travelData = abi.encode(
            tokenId,
            msg.sender,
            name,
            level,
            duration,
            msg.value
        );
        
        // Store travel info
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
        
        // Send cross-chain message via Gateway
        _sendCrossChainMessage(targetChainId, messageId, travelData);
        
        // Update status
        crossChainTravels[tokenId].status = CrossChainStatus.Traveling;
        
        emit ProvisionsDeposited(tokenId, msg.value, block.timestamp);
        emit CrossChainTravelStarted(
            tokenId,
            msg.sender,
            targetChainId,
            messageId,
            uint64(block.timestamp),
            uint64(duration)
        );
    }
    
    /**
     * @notice Internal function to send cross-chain message via Gateway
     * @dev Uses gateway.call() to send message to target chain connector
     */
    function _sendCrossChainMessage(
        uint256 targetChainId,
        bytes32 messageId,
        bytes memory travelData
    ) internal {
        bytes memory receiver = chainConnectors[targetChainId];
        address zrc20 = chainZRC20[targetChainId];
        
        // In test mode, skip actual cross-chain call and just lock locally
        if (testMode) {
            return;
        }
        
        // If ZRC20 is not configured, skip the call
        if (zrc20 == address(0)) {
            return;
        }

        require(address(systemRouter) != address(0), "System router not configured");
        require(wzeta != address(0), "WZETA not configured");
        
        // Encode the message
        bytes memory message = abi.encode(
            messageId,
            travelData,
            block.timestamp
        );
        
        // Prepare call options
        CallOptions memory callOptions = CallOptions({
            gasLimit: DEFAULT_GAS_LIMIT,
            isArbitraryCall: false
        });
        
        // Prepare revert options
        RevertOptions memory revertOptions = RevertOptions({
            revertAddress: address(this),
            callOnRevert: true,
            abortAddress: address(0),
            revertMessage: abi.encode(messageId),
            onRevertGasLimit: 200000
        });
        
        // 1. Estimate Gas Fee (ZRC20)
        (address gasZRC20, uint256 gasFee) = IZRC20(zrc20).withdrawGasFeeWithGasLimit(DEFAULT_GAS_LIMIT);
        
        // 2. Calculate ZETA Cost logic
        address[] memory path = new address[](2);
        path[0] = wzeta;
        path[1] = zrc20;
        
        // Query router for ZETA needed for this ZRC20 gas fee
        uint256[] memory amountsIn = systemRouter.getAmountsIn(gasFee, path);
        uint256 zetaCost = amountsIn[0] * 105 / 100; // +5% Slippage Buffer
        
        // 3. Deduct from Provisions
        uint256 tokenId = messageToToken[messageId];
        require(tokenId != 0, "Token ID not found");
        require(frogProvisions[tokenId] >= zetaCost, "Insufficient provisions for gas swap");
        
        frogProvisions[tokenId] -= zetaCost;
        
        // 4. Perform Swap (ZETA -> ZRC20)
        // Note: Using address(this) balance which includes msg.value from startCrossChainTravel
        uint256[] memory amounts = systemRouter.swapExactETHForTokens{value: zetaCost}(
            0, // accept any amount of ZRC20 >= 0 (strictly we want gasFee but with buffer logic, precise output is tricky, we rely on input)
            path,
            address(this),
            block.timestamp + 300
        );
        
        uint256 finalZrc20Amount = amounts[amounts.length - 1];
        
        // 5. Call Gateway
        // Approve gateway to spend ZRC20
        IZRC20(gasZRC20).approve(address(gateway), finalZrc20Amount);
        
        // Call the gateway
        gateway.call(
            receiver,
            zrc20,
            message,
            callOptions,
            revertOptions
        );
    }
    
    /**
     * @notice Handle incoming cross-chain message (return from target chain)
     * @dev Called by Gateway when frog returns
     */
    function onCall(
        MessageContext calldata context,
        address zrc20,
        uint256 amount,
        bytes calldata message
    ) external onlyGateway {
        // Decode the return message
        (
            bytes32 messageId,
            uint256 tokenId,
            bool success,
            uint256 xpEarned
        ) = abi.decode(message, (bytes32, uint256, bool, uint256));
        
        CrossChainTravel storage travel = crossChainTravels[tokenId];
        require(travel.status == CrossChainStatus.Traveling || 
                travel.status == CrossChainStatus.OnTarget, "Invalid status");
        
        if (success) {
            // Unlock NFT and add XP
            zetaFrogNFT.setFrogStatus(tokenId, IZetaFrogNFT.FrogStatus.Idle);
            if (xpEarned > 0) {
                zetaFrogNFT.addExperience(tokenId, xpEarned);
            }
            
            // Refund remaining provisions to owner
            _refundRemainingProvisions(tokenId);
            
            travel.status = CrossChainStatus.Completed;
            travel.returnMessageId = messageId;
            
            emit CrossChainTravelCompleted(tokenId, messageId, xpEarned, block.timestamp);
        } else {
            travel.status = CrossChainStatus.Failed;
            
            // Still unlock NFT on failure
            zetaFrogNFT.setFrogStatus(tokenId, IZetaFrogNFT.FrogStatus.Idle);
            
            // Refund remaining provisions even on failure
            _refundRemainingProvisions(tokenId);
            
            emit CrossChainTravelFailed(tokenId, messageId, "Target chain failure", block.timestamp);
        }
    }
    
    /**
     * @notice Handle revert from cross-chain call
     */
    function onRevert(RevertContext calldata revertContext) external onlyGateway {
        // Decode the message ID from revert message
        bytes32 messageId = abi.decode(revertContext.revertMessage, (bytes32));
        uint256 tokenId = messageToToken[messageId];
        
        if (tokenId != 0) {
            CrossChainTravel storage travel = crossChainTravels[tokenId];
            travel.status = CrossChainStatus.Failed;
            
            // Unlock the NFT
            zetaFrogNFT.setFrogStatus(tokenId, IZetaFrogNFT.FrogStatus.Idle);
            
            emit CrossChainTravelFailed(tokenId, messageId, "Cross-chain revert", block.timestamp);
        }
    }
    
    // ============ Gateway-Based Exploration (Zero Native Gas on Target Chain) ============
    
    /**
     * @notice Trigger exploration on target chain via Gateway
     * @dev Called by backend scheduler, pays gas in ZETA only
     * @param tokenId The frog token ID
     * @param observation AI-generated observation to record
     */
    struct ExplorationParams {
        uint256 tokenId;
        uint256 targetChainId;
        address zrc20;
        address wzeta;
        uint256 minReserve;
        string observation;
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
        require(
            travel.status == CrossChainStatus.Traveling,
            "Frog not on target chain"
        );
        
        params.targetChainId = travel.targetChainId;
        bytes memory receiver = chainConnectors[params.targetChainId];
        params.zrc20 = chainZRC20[params.targetChainId];
        params.wzeta = wzeta;
        
        require(receiver.length > 0, "Chain not configured");
        require(address(systemRouter) != address(0), "System router not configured");
        
        // In test mode, just emit event without actual cross-chain call
        if (testMode || params.zrc20 == address(0)) {
            emit ExplorationTriggered(params.tokenId, params.targetChainId, params.observation, block.timestamp);
            return;
        }
        
        // 1. Estimate Gas Fee in ZRC20 (Target Chain Gas)
        ( , uint256 zrc20GasFee) = IZRC20(params.zrc20).withdrawGasFeeWithGasLimit(300000);
        
        // 2. Query System Pool Rate (ZRC20 -> ZETA)
        address[] memory path = new address[](2);
        path[0] = params.wzeta;
        path[1] = params.zrc20;
        
        uint256[] memory amountsIn = systemRouter.getAmountsIn(zrc20GasFee, path);
        uint256 zetaCost = amountsIn[0] * 105 / 100; // +5% Slippage Buffer
        
        // 3. Smart Provisions Check
        if (frogProvisions[params.tokenId] < zetaCost + params.minReserve) {
            emit ExplorationTriggered(params.tokenId, params.targetChainId, string(abi.encodePacked("[VIRTUAL] ", params.observation)), block.timestamp);
            return;
        }

        // 4. Consume Provisions & Swap
        frogProvisions[params.tokenId] -= zetaCost;
        
        uint256[] memory amounts = systemRouter.swapExactETHForTokens{value: zetaCost}(
            0, 
            path,
            address(this),
            block.timestamp + 300
        );
        uint256 finalZrc20Amount = amounts[amounts.length - 1];
        
        // 5. Send Cross-Chain Message
        IZRC20(params.zrc20).approve(address(gateway), finalZrc20Amount);

        gateway.call(
            receiver, 
            params.zrc20, 
            abi.encode(bytes4(keccak256("exploration")), params.tokenId, params.observation, block.timestamp), 
            CallOptions(300000, false), 
            RevertOptions(address(this), false, address(0), bytes(""), 0)
        );
        
        emit ExplorationTriggered(params.tokenId, params.targetChainId, params.observation, block.timestamp);
    }
    
    /**
     * @notice Handle exploration result from target chain
     * @dev Called by Gateway when exploration completes on target chain
     */
    function handleExplorationResult(
        uint256 tokenId,
        address exploredAddress,
        bool isContract,
        string calldata observation
    ) external onlyGateway {
        CrossChainTravel storage travel = crossChainTravels[tokenId];
        
        if (travel.status == CrossChainStatus.Traveling) {
            // XP is tracked in backend, just emit event here
            emit ExplorationCompleted(
                tokenId,
                exploredAddress,
                isContract,
                observation,
                block.timestamp
            );
        }
    }
    
    /**
     * @notice Emergency return for stuck frogs
     */
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
        
        // Check timeout (only owner can bypass)
        if (msg.sender != owner()) {
            require(
                block.timestamp > travel.startTime + travel.maxDuration + TIMEOUT_PERIOD,
                "Not yet timed out"
            );
        }
        
        // Unlock the NFT
        zetaFrogNFT.setFrogStatus(tokenId, IZetaFrogNFT.FrogStatus.Idle);
        travel.status = CrossChainStatus.Completed;
        
        // Refund remaining provisions on emergency return
        _refundRemainingProvisions(tokenId);
        
        emit EmergencyReturn(tokenId, msg.sender, "Emergency return executed", block.timestamp);
    }
    
    /**
     * @notice Mark travel as completed (called by backend after processing)
     */
    function markTravelCompleted(uint256 tokenId, uint256 xpReward) external onlyTravelManager {
        CrossChainTravel storage travel = crossChainTravels[tokenId];
        require(travel.status != CrossChainStatus.None, "No travel found");
        
        // Unlock NFT and add XP
        zetaFrogNFT.setFrogStatus(tokenId, IZetaFrogNFT.FrogStatus.Idle);
        if (xpReward > 0) {
            zetaFrogNFT.addExperience(tokenId, xpReward);
        }
        
        // Refund remaining provisions to owner
        _refundRemainingProvisions(tokenId);
        
        travel.status = CrossChainStatus.Completed;
        
        emit CrossChainTravelCompleted(tokenId, travel.outboundMessageId, xpReward, block.timestamp);
    }
    
    // ============ Internal Functions ============
    
    /**
     * @notice Refund remaining provisions to the travel owner
     * @param tokenId The frog token ID
     */
    function _refundRemainingProvisions(uint256 tokenId) internal {
        uint256 remaining = frogProvisions[tokenId];
        if (remaining > 0) {
            address owner = crossChainTravels[tokenId].owner;
            frogProvisions[tokenId] = 0;
            
            // Transfer remaining provisions back to owner
            (bool success, ) = owner.call{value: remaining}("");
            if (success) {
                emit ProvisionsRefunded(tokenId, owner, remaining, block.timestamp);
            }
            // Note: If refund fails, funds stay in contract (can be recovered by owner later)
        }
    }
    
    /**
     * @notice Get remaining provisions for a frog
     * @param tokenId The frog token ID
     */
    function getRemainingProvisions(uint256 tokenId) external view returns (uint256) {
        return frogProvisions[tokenId];
    }
    
    // ============ Receive Function ============
    receive() external payable {}
}
