// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/ZetaInterfaces.sol";

/**
 * @title FrogConnector
 * @notice Target chain connector for ZetaFrog cross-chain travel
 * @dev Receives frogs from ZetaChain, allows actions, and sends them back
 */
contract FrogConnector is Ownable, ReentrancyGuard, Pausable, ZetaReceiver {
    
    // ============ Enums ============
    enum FrogVisitStatus {
        None,
        Active,      // Frog is visiting this chain
        Exploring,   // Frog is exploring/executing actions
        Departing,   // Frog is preparing to return
        Departed     // Frog has left
    }
    
    enum ActionType {
        OBSERVE_DEX,    // Observe DEX activity
        CHECK_NFT,      // Check NFT collections
        READ_DAO,       // Read DAO proposals
        EXPLORE_CHAIN,  // General chain exploration
        CUSTOM_READ     // Custom read-only call
    }
    
    // ============ Structs ============
    struct VisitingFrog {
        uint256 tokenId;
        address owner;
        string name;
        uint256 level;
        uint64 arrivalTime;
        uint64 maxStayDuration;
        FrogVisitStatus status;
        bytes32 messageId;
        uint256 actionsExecuted;
        uint256 xpEarned;
    }
    
    struct VisitingGroup {
        uint256 leaderTokenId;
        uint256 companionTokenId;
        address leaderOwner;
        address companionOwner;
        string leaderName;
        string companionName;
        uint64 arrivalTime;
        FrogVisitStatus status;
        bytes32 messageId;
    }
    
    struct ActionLog {
        ActionType actionType;
        address target;
        bytes result;
        uint256 timestamp;
    }
    
    // ============ State Variables ============
    ZetaConnector public zetaConnector;
    IERC20 public zetaToken;
    
    // ZetaChain OmniTravel contract address
    bytes public zetaChainOmniTravel;
    uint256 public zetaChainId = 7001;
    
    // FrogFootprint contract for leaving exploration traces
    address public frogFootprint;
    
    // Visiting frogs tracking
    mapping(uint256 => VisitingFrog) public visitingFrogs;
    mapping(bytes32 => uint256) public messageToToken;
    mapping(uint256 => ActionLog[]) public frogActionLogs;
    
    // Group visits
    mapping(bytes32 => VisitingGroup) public visitingGroups;
    
    // Provisions (干粮) tracking - Gas budget for exploration
    mapping(uint256 => uint256) public frogProvisions; // tokenId => remaining gas budget
    mapping(uint256 => uint256) public lastExplorationTime; // tokenId => last exploration timestamp
    mapping(uint256 => string[]) public frogObservations; // tokenId => observations generated
    
    // Active addresses pool (refreshed by backend)
    address[] public activeAddressPool;
    mapping(address => bool) public isInActivePool;
    uint256 public activePoolLastUpdated;
    
    // Exploration configuration
    uint256 public explorationInterval = 5 minutes; // Time between explorations
    uint256 public gasPerExploration = 50000; // Gas cost per exploration
    
    // Test mode configuration (for faster testing)
    bool public testMode = false;
    uint256 public constant TEST_EXPLORATION_INTERVAL = 20 seconds;
    uint256 public constant TEST_MIN_DURATION = 1 minutes;
    
    // XP rewards configuration
    uint256 public baseXpReward = 50;
    uint256 public actionXpReward = 10;
    uint256 public maxActionsPerVisit = 10;
    
    // Gas limit for return messages
    uint256 public returnGasLimit = 500000;
    
    // Smart return thresholds (for early return when gas is low)
    uint256 public emergencyReturnThreshold = 0.005 ether;  // Minimum gas needed for return
    uint256 public returnGasBuffer = 0.002 ether;           // Additional safety buffer

    
    // ============ Events ============
    event FrogArrived(
        uint256 indexed tokenId,
        address indexed owner,
        string name,
        bytes32 messageId,
        uint256 timestamp
    );
    
    event FrogDeparted(
        uint256 indexed tokenId,
        bytes32 returnMessageId,
        uint256 xpEarned,
        uint256 actionsExecuted,
        uint256 timestamp
    );
    
    event ActionExecuted(
        uint256 indexed tokenId,
        ActionType actionType,
        address target,
        bool success,
        uint256 timestamp
    );
    
    event GroupArrived(
        uint256 indexed leaderTokenId,
        uint256 indexed companionTokenId,
        bytes32 messageId,
        uint256 timestamp
    );
    
    event RandomExploration(
        uint256 indexed tokenId,
        address indexed exploredAddress,
        bool isContract,
        uint256 codeSize,
        string observation,
        uint256 timestamp
    );
    
    event ProvisionsUpdated(
        uint256 indexed tokenId,
        uint256 remaining,
        uint256 used
    );
    
    event ActivePoolUpdated(
        uint256 addressCount,
        uint256 timestamp
    );
    
    event ExplorationResultSent(
        uint256 indexed tokenId,
        address exploredAddress,
        bool isContract,
        string observation
    );

    
    // ============ Modifiers ============
    modifier onlyConnector() {
        require(msg.sender == address(zetaConnector), "Not connector");
        _;
    }
    
    modifier onlyFrogOwner(uint256 tokenId) {
        require(visitingFrogs[tokenId].owner == msg.sender, "Not frog owner");
        require(visitingFrogs[tokenId].status == FrogVisitStatus.Active || 
                visitingFrogs[tokenId].status == FrogVisitStatus.Exploring, "Frog not active");
        _;
    }
    
    // ============ Constructor ============
    constructor(
        address _zetaConnector,
        address _zetaToken,
        bytes memory _zetaChainOmniTravel
    ) Ownable(msg.sender) {
        zetaConnector = ZetaConnector(_zetaConnector);
        zetaToken = IERC20(_zetaToken);
        zetaChainOmniTravel = _zetaChainOmniTravel;
    }
    
    // ============ Admin Functions ============
    
    function setZetaChainOmniTravel(bytes calldata _address) external onlyOwner {
        zetaChainOmniTravel = _address;
    }
    
    function setXpRewards(uint256 _baseXp, uint256 _actionXp) external onlyOwner {
        baseXpReward = _baseXp;
        actionXpReward = _actionXp;
    }
    
    function setReturnGasLimit(uint256 _gasLimit) external onlyOwner {
        returnGasLimit = _gasLimit;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function setFrogFootprint(address _footprint) external onlyOwner {
        frogFootprint = _footprint;
    }
    
    function setExplorationConfig(uint256 _interval, uint256 _gasPerExploration) external onlyOwner {
        explorationInterval = _interval;
        gasPerExploration = _gasPerExploration;
    }
    
    /**
     * @notice Enable/disable test mode for faster exploration cycles
     * @param _testMode true for 20s intervals, false for normal 5min intervals
     */
    function setTestMode(bool _testMode) external onlyOwner {
        testMode = _testMode;
    }
    
    /**
     * @notice Set smart return thresholds
     * @param _emergencyThreshold Minimum gas needed for return journey
     * @param _gasBuffer Additional safety buffer
     */
    function setReturnThresholds(
        uint256 _emergencyThreshold,
        uint256 _gasBuffer
    ) external onlyOwner {
        emergencyReturnThreshold = _emergencyThreshold;
        returnGasBuffer = _gasBuffer;
    }
    
    /**
     * @notice Get current exploration interval based on mode
     */
    function getExplorationInterval() public view returns (uint256) {
        return testMode ? TEST_EXPLORATION_INTERVAL : explorationInterval;
    }
    
    /**
     * @notice Update active address pool (called by backend)
     * @param addresses Array of recently active addresses on this chain
     */
    function updateActiveAddressPool(address[] calldata addresses) external onlyOwner {
        // Clear old pool
        for (uint i = 0; i < activeAddressPool.length; i++) {
            isInActivePool[activeAddressPool[i]] = false;
        }
        delete activeAddressPool;
        
        // Add new addresses
        for (uint i = 0; i < addresses.length; i++) {
            activeAddressPool.push(addresses[i]);
            isInActivePool[addresses[i]] = true;
        }
        
        activePoolLastUpdated = block.timestamp;
        emit ActivePoolUpdated(addresses.length, block.timestamp);
    }

    
    // ============ Cross-Chain Message Handling ============
    
    /**
     * @notice Handle incoming cross-chain message (frog arrival or exploration trigger)
     * @dev Receives frog data + provisions (ETH/BNB) for exploration gas
     *      Or receives exploration trigger from Gateway
     */
    function onZetaMessage(ZetaMessage calldata zetaMessage) external override onlyConnector whenNotPaused {
        // Verify source is ZetaChain
        require(zetaMessage.sourceChainId == zetaChainId, "Invalid source chain");
        
        // Check if this is an exploration message (starts with bytes4 type identifier)
        if (zetaMessage.message.length >= 36) {
            // Try to decode first 4 bytes as message type
            bytes4 msgType = bytes4(zetaMessage.message[:4]);
            
            // Handle Gateway-triggered exploration
            if (msgType == bytes4(keccak256("exploration"))) {
                _handleExplorationTrigger(zetaMessage.message);
                return;
            }
        }
        
        // Original arrival handling logic
        (
            bytes32 messageId,
            bytes memory travelData,
            uint256 sentTimestamp
        ) = abi.decode(zetaMessage.message, (bytes32, bytes, uint256));
        
        // Check if this is a group travel
        (bool isGroup, ) = _checkIfGroupTravel(travelData);
        
        if (isGroup) {
            _handleGroupArrival(messageId, travelData);
        } else {
            _handleSingleArrival(messageId, travelData);
        }
    }
    
    /**
     * @notice Handle exploration trigger from ZetaChain via Gateway
     * @dev Executes random exploration and sends result back
     */
    function _handleExplorationTrigger(bytes calldata message) internal {
        (
            bytes4 msgType,
            uint256 tokenId,
            string memory observation,
            uint256 triggerTime
        ) = abi.decode(message, (bytes4, uint256, string, uint256));
        
        VisitingFrog storage frog = visitingFrogs[tokenId];
        require(frog.status == FrogVisitStatus.Active, "Frog not active");
        
        // Execute random exploration
        (address exploredAddr, bool isContract) = _executeRandomExplore(tokenId);
        
        // Record the observation
        frogObservations[tokenId].push(observation);
        frog.actionsExecuted++;
        frog.xpEarned += actionXpReward;
        lastExplorationTime[tokenId] = block.timestamp;
        
        emit RandomExploration(tokenId, exploredAddr, isContract, 0, observation, block.timestamp);
        
        // Send result back to ZetaChain (via ZetaConnector)
        _sendExplorationResult(tokenId, exploredAddr, isContract, observation);
    }
    
    /**
     * @notice Execute random exploration on this chain
     */
    function _executeRandomExplore(uint256 tokenId) internal returns (address target, bool isContract) {
        // Use simple randomness for exploration target
        if (activeAddressPool.length > 0) {
            uint256 randomIndex = uint256(keccak256(abi.encodePacked(
                block.timestamp,
                block.prevrandao,
                tokenId,
                visitingFrogs[tokenId].actionsExecuted
            ))) % activeAddressPool.length;
            target = activeAddressPool[randomIndex];
        } else {
            // Generate pseudo-random address if no pool
            target = address(uint160(uint256(keccak256(abi.encodePacked(
                block.timestamp,
                tokenId
            )))));
        }
        
        // Check if it's a contract
        uint256 codeSize;
        assembly {
            codeSize := extcodesize(target)
        }
        isContract = codeSize > 0;
        
        return (target, isContract);
    }
    
    /**
     * @notice Send exploration result back to ZetaChain
     * @dev For now, just emit an event - actual cross-chain return is optional
     */
    function _sendExplorationResult(
        uint256 tokenId,
        address exploredAddr,
        bool isContract,
        string memory observation
    ) internal {
        // Emit event for backend to capture
        // Cross-chain return is handled when frog departs
        emit ExplorationResultSent(tokenId, exploredAddr, isContract, observation);
    }
    
    
    function _checkIfGroupTravel(bytes memory travelData) internal pure returns (bool isGroup, uint256 dataLength) {
        // Group travel has more fields (10 vs 5)
        // Try to decode and check
        dataLength = travelData.length;
        // Simple heuristic: group travel data is larger
        isGroup = dataLength > 200;
        return (isGroup, dataLength);
    }
    
    function _handleSingleArrival(bytes32 messageId, bytes memory travelData) internal {
        (
            uint256 tokenId,
            address owner,
            string memory name,
            uint256 level,
            uint256 duration,
            uint256 provisions  // 干粮 amount received
        ) = abi.decode(travelData, (uint256, address, string, uint256, uint256, uint256));
        
        // Create visiting frog record
        visitingFrogs[tokenId] = VisitingFrog({
            tokenId: tokenId,
            owner: owner,
            name: name,
            level: level,
            arrivalTime: uint64(block.timestamp),
            maxStayDuration: uint64(duration),
            status: FrogVisitStatus.Active,
            messageId: messageId,
            actionsExecuted: 0,
            xpEarned: baseXpReward
        });
        
        // Store provisions - this is the gas budget for exploration
        // The provisions arrive as msg.value through cross-chain transfer
        frogProvisions[tokenId] = provisions > 0 ? provisions : msg.value;
        lastExplorationTime[tokenId] = block.timestamp;
        
        messageToToken[messageId] = tokenId;
        
        emit FrogArrived(tokenId, owner, name, messageId, block.timestamp);
        emit ProvisionsUpdated(tokenId, frogProvisions[tokenId], 0);
    }
    
    function _handleGroupArrival(bytes32 messageId, bytes memory travelData) internal {
        (
            uint256 leaderTokenId,
            uint256 companionTokenId,
            address leaderOwner,
            address companionOwner,
            string memory leaderName,
            string memory companionName,
            uint256 leaderLevel,
            uint256 companionLevel,
            uint256 duration,
        ) = abi.decode(travelData, (uint256, uint256, address, address, string, string, uint256, uint256, uint256, bool));
        
        // Create visiting group record
        visitingGroups[messageId] = VisitingGroup({
            leaderTokenId: leaderTokenId,
            companionTokenId: companionTokenId,
            leaderOwner: leaderOwner,
            companionOwner: companionOwner,
            leaderName: leaderName,
            companionName: companionName,
            arrivalTime: uint64(block.timestamp),
            status: FrogVisitStatus.Active,
            messageId: messageId
        });
        
        // Also create individual records for both frogs
        visitingFrogs[leaderTokenId] = VisitingFrog({
            tokenId: leaderTokenId,
            owner: leaderOwner,
            name: leaderName,
            level: leaderLevel,
            arrivalTime: uint64(block.timestamp),
            maxStayDuration: uint64(duration),
            status: FrogVisitStatus.Active,
            messageId: messageId,
            actionsExecuted: 0,
            xpEarned: baseXpReward
        });
        
        visitingFrogs[companionTokenId] = VisitingFrog({
            tokenId: companionTokenId,
            owner: companionOwner,
            name: companionName,
            level: companionLevel,
            arrivalTime: uint64(block.timestamp),
            maxStayDuration: uint64(duration),
            status: FrogVisitStatus.Active,
            messageId: messageId,
            actionsExecuted: 0,
            xpEarned: baseXpReward
        });
        
        messageToToken[messageId] = leaderTokenId;
        
        emit GroupArrived(leaderTokenId, companionTokenId, messageId, block.timestamp);
    }
    
    /**
     * @notice Handle cross-chain revert
     */
    function onZetaRevert(ZetaRevert calldata zetaRevert) external override onlyConnector {
        // Revert handling - mark frog as departed with error
        (bytes32 messageId, , ) = abi.decode(zetaRevert.message, (bytes32, bytes, uint256));
        
        uint256 tokenId = messageToToken[messageId];
        if (tokenId != 0 && visitingFrogs[tokenId].status != FrogVisitStatus.None) {
            visitingFrogs[tokenId].status = FrogVisitStatus.Departed;
        }
    }
    
    // ============ Frog Actions on Target Chain ============
    
    /**
     * @notice Execute an observation action (read-only)
     * @param tokenId Frog token ID
     * @param actionType Type of action to execute
     * @param target Target contract address to observe
     * @param data Call data for the target
     */
    function executeAction(
        uint256 tokenId,
        ActionType actionType,
        address target,
        bytes calldata data
    ) external whenNotPaused nonReentrant onlyFrogOwner(tokenId) {
        VisitingFrog storage frog = visitingFrogs[tokenId];
        require(frog.actionsExecuted < maxActionsPerVisit, "Max actions reached");
        
        // Update status
        frog.status = FrogVisitStatus.Exploring;
        
        // Execute read-only call
        (bool success, bytes memory result) = target.staticcall(data);
        
        // Log action
        frogActionLogs[tokenId].push(ActionLog({
            actionType: actionType,
            target: target,
            result: success ? result : bytes(""),
            timestamp: block.timestamp
        }));
        
        // Update frog stats
        frog.actionsExecuted++;
        if (success) {
            frog.xpEarned += actionXpReward;
        }
        
        emit ActionExecuted(tokenId, actionType, target, success, block.timestamp);
    }
    
    /**
     * @notice Observe DEX pair data
     */
    function observeDex(
        uint256 tokenId,
        address dexPair
    ) external whenNotPaused nonReentrant onlyFrogOwner(tokenId) {
        VisitingFrog storage frog = visitingFrogs[tokenId];
        require(frog.actionsExecuted < maxActionsPerVisit, "Max actions reached");
        
        frog.status = FrogVisitStatus.Exploring;
        
        // Try to get reserves (common DEX interface)
        bytes memory callData = abi.encodeWithSignature("getReserves()");
        (bool success, bytes memory result) = dexPair.staticcall(callData);
        
        frogActionLogs[tokenId].push(ActionLog({
            actionType: ActionType.OBSERVE_DEX,
            target: dexPair,
            result: success ? result : bytes(""),
            timestamp: block.timestamp
        }));
        
        frog.actionsExecuted++;
        if (success) {
            frog.xpEarned += actionXpReward;
        }
        
        emit ActionExecuted(tokenId, ActionType.OBSERVE_DEX, dexPair, success, block.timestamp);
    }
    
    /**
     * @notice Explore the current chain (get block info)
     */
    function exploreChain(uint256 tokenId) external whenNotPaused onlyFrogOwner(tokenId) {
        VisitingFrog storage frog = visitingFrogs[tokenId];
        require(frog.actionsExecuted < maxActionsPerVisit, "Max actions reached");
        
        frog.status = FrogVisitStatus.Exploring;
        
        // Record chain exploration data
        bytes memory chainData = abi.encode(
            block.number,
            block.timestamp,
            block.chainid,
            block.prevrandao,
            block.gaslimit
        );
        
        frogActionLogs[tokenId].push(ActionLog({
            actionType: ActionType.EXPLORE_CHAIN,
            target: address(0),
            result: chainData,
            timestamp: block.timestamp
        }));
        
        frog.actionsExecuted++;
        frog.xpEarned += actionXpReward;
        
        emit ActionExecuted(tokenId, ActionType.EXPLORE_CHAIN, address(0), true, block.timestamp);
    }
    
    // ============ Random Exploration System (干粮驱动) ============
    
    /**
     * @notice Perform a random exploration using provisions
     * @param tokenId Frog token ID
     * @param observation AI-generated observation text
     * @dev Called by backend scheduler at regular intervals
     */
    function randomExplore(
        uint256 tokenId,
        string calldata observation
    ) external whenNotPaused nonReentrant {
        // Only owner or contract owner can trigger
        require(
            msg.sender == visitingFrogs[tokenId].owner || msg.sender == owner(),
            "Not authorized"
        );
        
        VisitingFrog storage frog = visitingFrogs[tokenId];
        require(frog.status == FrogVisitStatus.Active || frog.status == FrogVisitStatus.Exploring, "Frog not active");
        
        // Check provisions
        require(frogProvisions[tokenId] >= gasPerExploration, "Insufficient provisions");
        
        // Check exploration interval (uses test mode if enabled)
        require(
            block.timestamp >= lastExplorationTime[tokenId] + getExplorationInterval(),
            "Too soon to explore again"
        );
        
        // Select random address
        address target = _selectRandomAddress(tokenId);
        
        // Check if it's a contract
        uint256 codeSize;
        assembly { codeSize := extcodesize(target) }
        bool isContract = codeSize > 0;
        
        // Leave footprint if footprint contract is set
        if (frogFootprint != address(0)) {
            // Call FrogFootprint to leave trace
            (bool success, ) = frogFootprint.call(
                abi.encodeWithSignature(
                    "leaveFootprint(uint256,address,string)",
                    tokenId,
                    target,
                    observation
                )
            );
            // Continue even if footprint fails
        }
        
        // Store observation
        frogObservations[tokenId].push(observation);
        
        // Update provisions
        frogProvisions[tokenId] -= gasPerExploration;
        lastExplorationTime[tokenId] = block.timestamp;
        
        // Update frog stats
        frog.status = FrogVisitStatus.Exploring;
        frog.actionsExecuted++;
        frog.xpEarned += actionXpReward;
        
        // Log action
        frogActionLogs[tokenId].push(ActionLog({
            actionType: ActionType.EXPLORE_CHAIN,
            target: target,
            result: abi.encode(isContract, codeSize, observation),
            timestamp: block.timestamp
        }));
        
        emit RandomExploration(tokenId, target, isContract, codeSize, observation, block.timestamp);
        emit ProvisionsUpdated(tokenId, frogProvisions[tokenId], gasPerExploration);
    }
    
    /**
     * @notice Select a random address for exploration
     * @dev Uses block data and token ID as randomness source
     */
    function _selectRandomAddress(uint256 tokenId) internal view returns (address) {
        bytes32 seed = keccak256(abi.encodePacked(
            blockhash(block.number - 1),
            block.timestamp,
            tokenId,
            visitingFrogs[tokenId].actionsExecuted
        ));
        
        // 70% chance: pick from active pool (high hit rate)
        // 30% chance: pure random (adventure)
        uint256 roll = uint256(seed) % 100;
        
        if (roll < 70 && activeAddressPool.length > 0) {
            // Pick from active pool
            uint256 index = uint256(seed) % activeAddressPool.length;
            return activeAddressPool[index];
        } else {
            // Pure random address
            return address(uint160(uint256(seed)));
        }
    }
    
    /**
     * @notice Check if frog needs to return (provisions exhausted)
     */
    function shouldReturn(uint256 tokenId) external view returns (bool, string memory reason) {
        VisitingFrog storage frog = visitingFrogs[tokenId];
        
        if (frog.status == FrogVisitStatus.None) {
            return (false, "Frog not visiting");
        }
        
        uint256 remaining = frogProvisions[tokenId];
        uint256 requiredForReturn = emergencyReturnThreshold + returnGasBuffer;
        
        // Critical: Must return immediately if only enough for return journey
        if (remaining < requiredForReturn) {
            return (true, "Critical: Only enough gas for return journey");
        }
        
        // Should return if can only do one more exploration before hitting threshold
        if (remaining < gasPerExploration + requiredForReturn) {
            return (true, "Low provisions: Should return after one more exploration");
        }
        
        // Check max duration
        if (block.timestamp >= frog.arrivalTime + frog.maxStayDuration) {
            return (true, "Max duration reached");
        }
        
        return (false, "");
    }
    
    /**
     * @notice Get provisions status for a frog
     */
    function getProvisionsStatus(uint256 tokenId) external view returns (
        uint256 remaining,
        uint256 usedTotal,
        uint256 explorationCost,
        uint256 returnCost,
        uint256 explorationsRemaining
    ) {
        remaining = frogProvisions[tokenId];
        uint256 requiredForReturn = emergencyReturnThreshold + returnGasBuffer;
        explorationCost = gasPerExploration;
        returnCost = requiredForReturn;
        
        // Calculate how many explorations can still be done
        if (remaining > requiredForReturn) {
            explorationsRemaining = (remaining - requiredForReturn) / gasPerExploration;
        }
        
        // Calculate used total (need arrival provisions to calculate)
        VisitingFrog storage frog = visitingFrogs[tokenId];
        usedTotal = frog.actionsExecuted * gasPerExploration;
    }
    
    /**
     * @notice Get frog's exploration observations
     */
    function getFrogObservations(uint256 tokenId) external view returns (string[] memory) {
        return frogObservations[tokenId];
    }
    
    /**
     * @notice Get active address pool size
     */
    function getActivePoolSize() external view returns (uint256) {
        return activeAddressPool.length;
    }
    
    // ============ Return to ZetaChain ============
    
    /**
     * @notice Complete visit and return frog to ZetaChain
     */
    function completeVisitAndReturn(uint256 tokenId) external payable whenNotPaused nonReentrant onlyFrogOwner(tokenId) {
        VisitingFrog storage frog = visitingFrogs[tokenId];
        
        // Mark as departing
        frog.status = FrogVisitStatus.Departing;
        
        // Calculate final XP
        uint256 finalXp = frog.xpEarned;
        
        // Check if full duration completed for bonus
        if (block.timestamp >= frog.arrivalTime + frog.maxStayDuration) {
            finalXp += baseXpReward; // Bonus for full duration
        }
        
        // Prepare action summary
        bytes memory actionData = abi.encode(
            frog.actionsExecuted,
            frogActionLogs[tokenId].length
        );
        
        // Send return message
        bytes32 returnMessageId = keccak256(abi.encodePacked(
            tokenId,
            frog.messageId,
            block.timestamp
        ));
        
        bytes memory returnMessage = abi.encode(
            returnMessageId,
            tokenId,
            true, // success
            actionData,
            finalXp
        );
        
        ZetaSendInput memory sendInput = ZetaSendInput({
            destinationChainId: zetaChainId,
            destinationAddress: zetaChainOmniTravel,
            destinationGasLimit: returnGasLimit,
            message: returnMessage,
            zetaValueAndGas: msg.value,
            zetaParams: ""
        });
        
        zetaConnector.send(sendInput);
        
        // Mark as departed
        frog.status = FrogVisitStatus.Departed;
        
        emit FrogDeparted(tokenId, returnMessageId, finalXp, frog.actionsExecuted, block.timestamp);
    }
    
    /**
     * @notice Auto-return frog when provisions exhausted (called by backend)
     * @dev Uses remaining contract balance (provisions) to pay for return gas
     *      This is the KEY function that enables one-signature travel
     */
    function autoReturnFrog(uint256 tokenId) external whenNotPaused nonReentrant {
        // Only backend (owner) can trigger auto-return
        require(msg.sender == owner(), "Only backend can auto-return");
        
        VisitingFrog storage frog = visitingFrogs[tokenId];
        require(frog.status == FrogVisitStatus.Active || frog.status == FrogVisitStatus.Exploring, "Frog not active");
        
        // Check if should return
        uint256 remaining = frogProvisions[tokenId];
        bool durationExceeded = block.timestamp >= frog.arrivalTime + frog.maxStayDuration;
        require(
            remaining < gasPerExploration + emergencyReturnThreshold + returnGasBuffer || durationExceeded,
            "Not ready to return"
        );
        
        // Mark as departing
        frog.status = FrogVisitStatus.Departing;
        
        // Calculate return values
        uint256 finalXp = frog.xpEarned + (durationExceeded ? baseXpReward : 0);
        uint256 returnGas = emergencyReturnThreshold;
        frogProvisions[tokenId] = 0;
        
        // Build and send return message
        _sendReturnMessage(tokenId, frog, finalXp, returnGas);
        
        // Mark as departed
        frog.status = FrogVisitStatus.Departed;
        
        emit FrogDeparted(tokenId, bytes32(0), finalXp, frog.actionsExecuted, block.timestamp);
    }
    
    /**
     * @notice Internal helper to send return message
     */
    function _sendReturnMessage(
        uint256 tokenId,
        VisitingFrog storage frog,
        uint256 finalXp,
        uint256 returnGas
    ) internal {
        bytes32 returnMessageId = keccak256(abi.encodePacked(
            tokenId,
            frog.messageId,
            block.timestamp
        ));
        
        bytes memory returnMessage = abi.encode(
            returnMessageId,
            tokenId,
            true,
            abi.encode(frog.actionsExecuted, frogObservations[tokenId].length),
            finalXp
        );
        
        ZetaSendInput memory sendInput = ZetaSendInput({
            destinationChainId: zetaChainId,
            destinationAddress: zetaChainOmniTravel,
            destinationGasLimit: returnGasLimit,
            message: returnMessage,
            zetaValueAndGas: returnGas,
            zetaParams: ""
        });
        
        zetaConnector.send(sendInput);
    }
    
    /**
     * @notice Complete group visit and return both frogs
     */
    function completeGroupVisitAndReturn(bytes32 groupMessageId) external payable whenNotPaused nonReentrant {
        VisitingGroup storage group = visitingGroups[groupMessageId];
        require(group.status == FrogVisitStatus.Active, "Group not active");
        require(
            msg.sender == group.leaderOwner || msg.sender == group.companionOwner,
            "Not group member"
        );
        
        VisitingFrog storage leader = visitingFrogs[group.leaderTokenId];
        VisitingFrog storage companion = visitingFrogs[group.companionTokenId];
        
        // Calculate combined XP
        uint256 leaderXp = leader.xpEarned;
        uint256 companionXp = companion.xpEarned;
        
        // Group bonus
        leaderXp += 20;
        companionXp += 20;
        
        // Prepare return message
        bytes32 returnMessageId = keccak256(abi.encodePacked(
            group.leaderTokenId,
            group.companionTokenId,
            groupMessageId,
            block.timestamp
        ));
        
        bytes memory returnMessage = abi.encode(
            returnMessageId,
            group.leaderTokenId,
            true,
            abi.encode(
                group.companionTokenId,
                leaderXp,
                companionXp,
                leader.actionsExecuted + companion.actionsExecuted
            ),
            leaderXp + companionXp
        );
        
        ZetaSendInput memory sendInput = ZetaSendInput({
            destinationChainId: zetaChainId,
            destinationAddress: zetaChainOmniTravel,
            destinationGasLimit: returnGasLimit,
            message: returnMessage,
            zetaValueAndGas: msg.value,
            zetaParams: ""
        });
        
        zetaConnector.send(sendInput);
        
        // Mark both as departed
        leader.status = FrogVisitStatus.Departed;
        companion.status = FrogVisitStatus.Departed;
        group.status = FrogVisitStatus.Departed;
        
        emit FrogDeparted(group.leaderTokenId, returnMessageId, leaderXp, leader.actionsExecuted, block.timestamp);
        emit FrogDeparted(group.companionTokenId, returnMessageId, companionXp, companion.actionsExecuted, block.timestamp);
    }
    
    // ============ View Functions ============
    
    function getVisitingFrog(uint256 tokenId) external view returns (
        address owner,
        string memory name,
        uint64 arrivalTime,
        FrogVisitStatus status,
        uint256 actionsExecuted,
        uint256 xpEarned
    ) {
        VisitingFrog storage frog = visitingFrogs[tokenId];
        return (
            frog.owner,
            frog.name,
            frog.arrivalTime,
            frog.status,
            frog.actionsExecuted,
            frog.xpEarned
        );
    }
    
    function getFrogActions(uint256 tokenId) external view returns (ActionLog[] memory) {
        return frogActionLogs[tokenId];
    }
    
    function isFrogVisiting(uint256 tokenId) external view returns (bool) {
        FrogVisitStatus status = visitingFrogs[tokenId].status;
        return status == FrogVisitStatus.Active || status == FrogVisitStatus.Exploring;
    }
}
