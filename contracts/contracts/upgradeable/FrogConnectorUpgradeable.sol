// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../interfaces/ZetaInterfaces.sol";

/**
 * @title IFrogFootprint
 * @notice Interface for FrogFootprint contract that leaves messages on explored addresses
 */
interface IFrogFootprint {
    function leaveFootprint(uint256 frogId, address location, string calldata message) external;
    event FootprintLeft(uint256 indexed frogId, address indexed location, string message, uint256 timestamp);
}

/**
 * @title FrogConnectorUpgradeable
 * @notice Target chain connector for ZetaFrog cross-chain travel
 * @dev Upgradeable version using UUPS proxy pattern
 */
contract FrogConnectorUpgradeable is 
    Initializable,
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable, 
    PausableUpgradeable,
    UUPSUpgradeable,
    ZetaReceiver 
{
    
    // ============ Enums ============
    enum FrogVisitStatus {
        None,
        Active,
        Exploring,
        Departing,
        Departed
    }
    
    enum ActionType {
        OBSERVE_DEX,
        CHECK_NFT,
        READ_DAO,
        EXPLORE_CHAIN,
        CUSTOM_READ
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
    
    bytes public zetaChainOmniTravel;
    uint256 public zetaChainId;
    address public frogFootprint;
    
    mapping(uint256 => VisitingFrog) public visitingFrogs;
    mapping(bytes32 => uint256) public messageToToken;
    mapping(uint256 => ActionLog[]) public frogActionLogs;
    mapping(bytes32 => VisitingGroup) public visitingGroups;
    
    mapping(uint256 => uint256) public frogProvisions;
    mapping(uint256 => uint256) public lastExplorationTime;
    mapping(uint256 => string[]) public frogObservations;
    
    address[] public activeAddressPool;
    mapping(address => bool) public isInActivePool;
    uint256 public activePoolLastUpdated;
    
    uint256 public explorationInterval;
    uint256 public gasPerExploration;
    bool public testMode;
    
    uint256 public baseXpReward;
    uint256 public actionXpReward;
    uint256 public maxActionsPerVisit;
    uint256 public returnGasLimit;
    uint256 public emergencyReturnThreshold;
    uint256 public returnGasBuffer;
    
    uint256 public constant TEST_EXPLORATION_INTERVAL = 20 seconds;
    uint256 public constant TEST_MIN_DURATION = 1 minutes;
    
    // Reserved storage gap for future upgrades
    uint256[50] private __gap;
    
    // ============ Events ============
    event FrogArrived(uint256 indexed tokenId, address indexed owner, string name, bytes32 messageId, uint256 timestamp);
    event FrogDeparted(uint256 indexed tokenId, bytes32 returnMessageId, uint256 xpEarned, uint256 actionsExecuted, uint256 timestamp);
    event ActionExecuted(uint256 indexed tokenId, ActionType actionType, address target, bool success, uint256 timestamp);
    event GroupArrived(uint256 indexed leaderTokenId, uint256 indexed companionTokenId, bytes32 messageId, uint256 timestamp);
    event RandomExploration(uint256 indexed tokenId, address indexed exploredAddress, bool isContract, uint256 codeSize, string observation, uint256 timestamp);
    event ProvisionsUpdated(uint256 indexed tokenId, uint256 remaining, uint256 used);
    event ActivePoolUpdated(uint256 addressCount, uint256 timestamp);
    event ExplorationResultSent(uint256 indexed tokenId, address exploredAddress, bool isContract, string observation);
    
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
    
    // ============ Initializer ============
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize the contract (replaces constructor)
     */
    function initialize(
        address _zetaConnector,
        address _zetaToken,
        bytes memory _zetaChainOmniTravel
    ) public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        
        zetaConnector = ZetaConnector(_zetaConnector);
        zetaToken = IERC20(_zetaToken);
        zetaChainOmniTravel = _zetaChainOmniTravel;
        
        // Default configuration
        zetaChainId = 7001;
        explorationInterval = 5 minutes;
        gasPerExploration = 50000;
        baseXpReward = 50;
        actionXpReward = 10;
        maxActionsPerVisit = 10;
        returnGasLimit = 500000;
        emergencyReturnThreshold = 0.005 ether;
        returnGasBuffer = 0.002 ether;
    }
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    function version() external pure returns (string memory) {
        return "2.0.0";
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
    
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
    
    function setFrogFootprint(address _footprint) external onlyOwner {
        frogFootprint = _footprint;
    }
    
    function setExplorationConfig(uint256 _interval, uint256 _gasPerExploration) external onlyOwner {
        explorationInterval = _interval;
        gasPerExploration = _gasPerExploration;
    }
    
    function setTestMode(bool _testMode) external onlyOwner {
        testMode = _testMode;
    }
    
    function setReturnThresholds(uint256 _emergencyThreshold, uint256 _gasBuffer) external onlyOwner {
        emergencyReturnThreshold = _emergencyThreshold;
        returnGasBuffer = _gasBuffer;
    }
    
    function getExplorationInterval() public view returns (uint256) {
        return testMode ? TEST_EXPLORATION_INTERVAL : explorationInterval;
    }
    
    function updateActiveAddressPool(address[] calldata addresses) external onlyOwner {
        for (uint i = 0; i < activeAddressPool.length; i++) {
            isInActivePool[activeAddressPool[i]] = false;
        }
        delete activeAddressPool;
        
        for (uint i = 0; i < addresses.length; i++) {
            activeAddressPool.push(addresses[i]);
            isInActivePool[addresses[i]] = true;
        }
        
        activePoolLastUpdated = block.timestamp;
        emit ActivePoolUpdated(addresses.length, block.timestamp);
    }
    
    // ============ Cross-Chain Message Handling ============
    
    function onZetaMessage(ZetaMessage calldata zetaMessage) external override onlyConnector whenNotPaused {
        require(zetaMessage.sourceChainId == zetaChainId, "Invalid source chain");
        
        if (zetaMessage.message.length >= 36) {
            bytes4 msgType = bytes4(zetaMessage.message[:4]);
            if (msgType == bytes4(keccak256("exploration"))) {
                _handleExplorationTrigger(zetaMessage.message);
                return;
            }
        }
        
        (bytes32 messageId, bytes memory travelData, ) = abi.decode(zetaMessage.message, (bytes32, bytes, uint256));
        
        (bool isGroup, ) = _checkIfGroupTravel(travelData);
        
        if (isGroup) {
            _handleGroupArrival(messageId, travelData);
        } else {
            _handleSingleArrival(messageId, travelData);
        }
    }
    
    function _handleExplorationTrigger(bytes calldata message) internal {
        (, uint256 tokenId, string memory observation, ) = abi.decode(message, (bytes4, uint256, string, uint256));
        
        VisitingFrog storage frog = visitingFrogs[tokenId];
        require(frog.status == FrogVisitStatus.Active, "Frog not active");
        
        (address exploredAddr, bool isContract) = _executeRandomExplore(tokenId);
        
        // P1: Leave footprint on explored address
        if (frogFootprint != address(0)) {
            try IFrogFootprint(frogFootprint).leaveFootprint(tokenId, exploredAddr, observation) {
                // Footprint left successfully
            } catch {
                // Footprint failed, but continue with exploration
            }
        }
        
        frogObservations[tokenId].push(observation);
        frog.actionsExecuted++;
        frog.xpEarned += actionXpReward;
        lastExplorationTime[tokenId] = block.timestamp;
        
        emit RandomExploration(tokenId, exploredAddr, isContract, 0, observation, block.timestamp);
        emit ExplorationResultSent(tokenId, exploredAddr, isContract, observation);
    }
    
    function _executeRandomExplore(uint256 tokenId) internal returns (address target, bool isContract) {
        if (activeAddressPool.length > 0) {
            uint256 randomIndex = uint256(keccak256(abi.encodePacked(
                block.timestamp, block.prevrandao, tokenId, visitingFrogs[tokenId].actionsExecuted
            ))) % activeAddressPool.length;
            target = activeAddressPool[randomIndex];
        } else {
            target = address(uint160(uint256(keccak256(abi.encodePacked(block.timestamp, tokenId)))));
        }
        
        uint256 codeSize;
        assembly { codeSize := extcodesize(target) }
        isContract = codeSize > 0;
    }
    
    function _checkIfGroupTravel(bytes memory travelData) internal pure returns (bool isGroup, uint256 dataLength) {
        dataLength = travelData.length;
        isGroup = dataLength > 200;
    }
    
    function _handleSingleArrival(bytes32 messageId, bytes memory travelData) internal {
        (uint256 tokenId, address owner, string memory name, uint256 level, uint256 duration, uint256 provisions) = 
            abi.decode(travelData, (uint256, address, string, uint256, uint256, uint256));
        
        visitingFrogs[tokenId] = VisitingFrog({
            tokenId: tokenId, owner: owner, name: name, level: level,
            arrivalTime: uint64(block.timestamp), maxStayDuration: uint64(duration),
            status: FrogVisitStatus.Active, messageId: messageId, actionsExecuted: 0, xpEarned: baseXpReward
        });
        
        frogProvisions[tokenId] = provisions > 0 ? provisions : msg.value;
        lastExplorationTime[tokenId] = block.timestamp;
        messageToToken[messageId] = tokenId;
        
        emit FrogArrived(tokenId, owner, name, messageId, block.timestamp);
        emit ProvisionsUpdated(tokenId, frogProvisions[tokenId], 0);
    }
    
    function _handleGroupArrival(bytes32 messageId, bytes memory travelData) internal {
        (uint256 leaderTokenId, uint256 companionTokenId, address leaderOwner, address companionOwner,
         string memory leaderName, string memory companionName, uint256 leaderLevel, uint256 companionLevel, uint256 duration, ) = 
            abi.decode(travelData, (uint256, uint256, address, address, string, string, uint256, uint256, uint256, bool));
        
        visitingGroups[messageId] = VisitingGroup({
            leaderTokenId: leaderTokenId, companionTokenId: companionTokenId,
            leaderOwner: leaderOwner, companionOwner: companionOwner,
            leaderName: leaderName, companionName: companionName,
            arrivalTime: uint64(block.timestamp), status: FrogVisitStatus.Active, messageId: messageId
        });
        
        visitingFrogs[leaderTokenId] = VisitingFrog({
            tokenId: leaderTokenId, owner: leaderOwner, name: leaderName, level: leaderLevel,
            arrivalTime: uint64(block.timestamp), maxStayDuration: uint64(duration),
            status: FrogVisitStatus.Active, messageId: messageId, actionsExecuted: 0, xpEarned: baseXpReward
        });
        
        visitingFrogs[companionTokenId] = VisitingFrog({
            tokenId: companionTokenId, owner: companionOwner, name: companionName, level: companionLevel,
            arrivalTime: uint64(block.timestamp), maxStayDuration: uint64(duration),
            status: FrogVisitStatus.Active, messageId: messageId, actionsExecuted: 0, xpEarned: baseXpReward
        });
        
        messageToToken[messageId] = leaderTokenId;
        emit GroupArrived(leaderTokenId, companionTokenId, messageId, block.timestamp);
    }
    
    function onZetaRevert(ZetaRevert calldata zetaRevert) external override onlyConnector {
        (bytes32 messageId, , ) = abi.decode(zetaRevert.message, (bytes32, bytes, uint256));
        uint256 tokenId = messageToToken[messageId];
        if (tokenId != 0 && visitingFrogs[tokenId].status != FrogVisitStatus.None) {
            visitingFrogs[tokenId].status = FrogVisitStatus.Departed;
        }
    }
    
    // ============ Frog Actions ============
    
    function executeAction(uint256 tokenId, ActionType actionType, address target, bytes calldata data) 
        external whenNotPaused nonReentrant onlyFrogOwner(tokenId) 
    {
        VisitingFrog storage frog = visitingFrogs[tokenId];
        require(frog.actionsExecuted < maxActionsPerVisit, "Max actions reached");
        
        frog.status = FrogVisitStatus.Exploring;
        (bool success, bytes memory result) = target.staticcall(data);
        
        frogActionLogs[tokenId].push(ActionLog({
            actionType: actionType, target: target, result: success ? result : bytes(""), timestamp: block.timestamp
        }));
        
        frog.actionsExecuted++;
        if (success) { frog.xpEarned += actionXpReward; }
        emit ActionExecuted(tokenId, actionType, target, success, block.timestamp);
    }
    
    function randomExplore(uint256 tokenId, string calldata observation) external whenNotPaused nonReentrant {
        require(msg.sender == visitingFrogs[tokenId].owner || msg.sender == owner(), "Not authorized");
        
        VisitingFrog storage frog = visitingFrogs[tokenId];
        require(frog.status == FrogVisitStatus.Active || frog.status == FrogVisitStatus.Exploring, "Frog not active");
        require(frogProvisions[tokenId] >= gasPerExploration, "Insufficient provisions");
        require(block.timestamp >= lastExplorationTime[tokenId] + getExplorationInterval(), "Too soon");
        
        address target = _selectRandomAddress(tokenId);
        uint256 codeSize;
        assembly { codeSize := extcodesize(target) }
        bool isContract = codeSize > 0;
        
        frogObservations[tokenId].push(observation);
        frogProvisions[tokenId] -= gasPerExploration;
        lastExplorationTime[tokenId] = block.timestamp;
        
        frog.status = FrogVisitStatus.Exploring;
        frog.actionsExecuted++;
        frog.xpEarned += actionXpReward;
        
        frogActionLogs[tokenId].push(ActionLog({
            actionType: ActionType.EXPLORE_CHAIN, target: target, 
            result: abi.encode(isContract, codeSize, observation), timestamp: block.timestamp
        }));
        
        emit RandomExploration(tokenId, target, isContract, codeSize, observation, block.timestamp);
        emit ProvisionsUpdated(tokenId, frogProvisions[tokenId], gasPerExploration);
    }
    
    function _selectRandomAddress(uint256 tokenId) internal view returns (address) {
        bytes32 seed = keccak256(abi.encodePacked(
            blockhash(block.number - 1), block.timestamp, tokenId, visitingFrogs[tokenId].actionsExecuted
        ));
        
        uint256 roll = uint256(seed) % 100;
        if (roll < 70 && activeAddressPool.length > 0) {
            return activeAddressPool[uint256(seed) % activeAddressPool.length];
        }
        return address(uint160(uint256(seed)));
    }
    
    // ============ Return Functions ============
    
    function completeVisitAndReturn(uint256 tokenId) external payable whenNotPaused nonReentrant onlyFrogOwner(tokenId) {
        VisitingFrog storage frog = visitingFrogs[tokenId];
        frog.status = FrogVisitStatus.Departing;
        
        uint256 finalXp = frog.xpEarned;
        if (block.timestamp >= frog.arrivalTime + frog.maxStayDuration) {
            finalXp += baseXpReward;
        }
        
        bytes32 returnMessageId = keccak256(abi.encodePacked(tokenId, frog.messageId, block.timestamp));
        bytes memory returnMessage = abi.encode(
            returnMessageId, tokenId, true, 
            abi.encode(frog.actionsExecuted, frogActionLogs[tokenId].length), finalXp
        );
        
        ZetaSendInput memory sendInput = ZetaSendInput({
            destinationChainId: zetaChainId, destinationAddress: zetaChainOmniTravel,
            destinationGasLimit: returnGasLimit, message: returnMessage, zetaValueAndGas: msg.value, zetaParams: ""
        });
        
        zetaConnector.send(sendInput);
        frog.status = FrogVisitStatus.Departed;
        
        emit FrogDeparted(tokenId, returnMessageId, finalXp, frog.actionsExecuted, block.timestamp);
    }
    
    function autoReturnFrog(uint256 tokenId) external whenNotPaused nonReentrant {
        require(msg.sender == owner(), "Only backend");
        
        VisitingFrog storage frog = visitingFrogs[tokenId];
        require(frog.status == FrogVisitStatus.Active || frog.status == FrogVisitStatus.Exploring, "Not active");
        
        uint256 remaining = frogProvisions[tokenId];
        bool durationExceeded = block.timestamp >= frog.arrivalTime + frog.maxStayDuration;
        require(remaining < gasPerExploration + emergencyReturnThreshold + returnGasBuffer || durationExceeded, "Not ready");
        
        frog.status = FrogVisitStatus.Departing;
        uint256 finalXp = frog.xpEarned + (durationExceeded ? baseXpReward : 0);
        uint256 returnGas = emergencyReturnThreshold;
        frogProvisions[tokenId] = 0;
        
        _sendReturnMessage(tokenId, frog, finalXp, returnGas);
        frog.status = FrogVisitStatus.Departed;
        
        emit FrogDeparted(tokenId, bytes32(0), finalXp, frog.actionsExecuted, block.timestamp);
    }
    
    function _sendReturnMessage(uint256 tokenId, VisitingFrog storage frog, uint256 finalXp, uint256 returnGas) internal {
        bytes32 returnMessageId = keccak256(abi.encodePacked(tokenId, frog.messageId, block.timestamp));
        bytes memory returnMessage = abi.encode(
            returnMessageId, tokenId, true, abi.encode(frog.actionsExecuted, frogObservations[tokenId].length), finalXp
        );
        
        ZetaSendInput memory sendInput = ZetaSendInput({
            destinationChainId: zetaChainId, destinationAddress: zetaChainOmniTravel,
            destinationGasLimit: returnGasLimit, message: returnMessage, zetaValueAndGas: returnGas, zetaParams: ""
        });
        
        zetaConnector.send(sendInput);
    }
    
    // ============ View Functions ============
    
    function shouldReturn(uint256 tokenId) external view returns (bool, string memory) {
        VisitingFrog storage frog = visitingFrogs[tokenId];
        if (frog.status == FrogVisitStatus.None) return (false, "Not visiting");
        
        uint256 remaining = frogProvisions[tokenId];
        uint256 requiredForReturn = emergencyReturnThreshold + returnGasBuffer;
        
        if (remaining < requiredForReturn) return (true, "Critical: Only enough for return");
        if (remaining < gasPerExploration + requiredForReturn) return (true, "Low provisions");
        if (block.timestamp >= frog.arrivalTime + frog.maxStayDuration) return (true, "Max duration");
        
        return (false, "");
    }
    
    function getProvisionsStatus(uint256 tokenId) external view returns (
        uint256 remaining, uint256 usedTotal, uint256 explorationCost, uint256 returnCost, uint256 explorationsRemaining
    ) {
        remaining = frogProvisions[tokenId];
        explorationCost = gasPerExploration;
        returnCost = emergencyReturnThreshold + returnGasBuffer;
        usedTotal = visitingFrogs[tokenId].actionsExecuted * gasPerExploration;
        if (remaining > returnCost) { explorationsRemaining = (remaining - returnCost) / gasPerExploration; }
    }
    
    function getVisitingFrog(uint256 tokenId) external view returns (
        address owner, string memory name, uint64 arrivalTime, FrogVisitStatus status, uint256 actionsExecuted, uint256 xpEarned
    ) {
        VisitingFrog storage frog = visitingFrogs[tokenId];
        return (frog.owner, frog.name, frog.arrivalTime, frog.status, frog.actionsExecuted, frog.xpEarned);
    }
    
    function getFrogActions(uint256 tokenId) external view returns (ActionLog[] memory) { return frogActionLogs[tokenId]; }
    function getFrogObservations(uint256 tokenId) external view returns (string[] memory) { return frogObservations[tokenId]; }
    function getActivePoolSize() external view returns (uint256) { return activeAddressPool.length; }
    function isFrogVisiting(uint256 tokenId) external view returns (bool) {
        FrogVisitStatus status = visitingFrogs[tokenId].status;
        return status == FrogVisitStatus.Active || status == FrogVisitStatus.Exploring;
    }
}
