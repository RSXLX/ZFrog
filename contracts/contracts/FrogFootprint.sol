// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FrogFootprint
 * @notice Records frog exploration footprints on target chains
 * @dev Deployed on each target chain (BSC, ETH, Polygon, etc.)
 */
contract FrogFootprint is Ownable, ReentrancyGuard {
    
    // ========== Structs ==========
    
    struct Footprint {
        uint256 frogId;           // NFT token ID from ZetaChain
        address exploredAddress;  // Address that was explored
        uint256 timestamp;        // When the footprint was left
        string observation;       // What the frog observed (generated text)
        bytes32 blockHash;        // Block hash for randomness proof
    }
    
    struct ExplorationSession {
        uint256 frogId;
        uint256 startTime;
        uint256 endTime;
        uint256 provisionsRemaining; // Gas budget remaining
        uint256 explorationCount;    // How many places explored
        bool isActive;
    }
    
    // ========== State Variables ==========
    
    // FrogConnector address - only this can leave footprints
    address public frogConnector;
    
    // Footprints by explored address
    mapping(address => Footprint[]) public footprintsByLocation;
    
    // Footprints by frog ID
    mapping(uint256 => Footprint[]) public footprintsByFrog;
    
    // Active exploration sessions
    mapping(uint256 => ExplorationSession) public sessions;
    
    // All explored addresses (for random selection of "previously visited")
    address[] public exploredAddresses;
    mapping(address => bool) public hasBeenExplored;
    
    // Statistics
    uint256 public totalFootprints;
    uint256 public totalExplorers;
    
    // ========== Events ==========
    
    event FootprintLeft(
        uint256 indexed frogId,
        address indexed location,
        string observation,
        uint256 timestamp
    );
    
    event ExplorationStarted(
        uint256 indexed frogId,
        uint256 provisions,
        uint256 plannedDuration
    );
    
    event ExplorationEnded(
        uint256 indexed frogId,
        uint256 totalExplorations,
        uint256 provisionsUsed
    );
    
    // ========== Constructor ==========
    
    constructor() Ownable(msg.sender) {}
    
    // ========== Admin Functions ==========
    
    function setFrogConnector(address _connector) external onlyOwner {
        frogConnector = _connector;
    }
    
    // ========== Core Functions ==========
    
    /**
     * @notice Start an exploration session for a frog
     * @param frogId The frog's NFT token ID
     * @param provisions Gas budget for this exploration
     * @param duration Planned exploration duration in seconds
     */
    function startExploration(
        uint256 frogId,
        uint256 provisions,
        uint256 duration
    ) external {
        require(msg.sender == frogConnector, "Only FrogConnector");
        require(!sessions[frogId].isActive, "Already exploring");
        
        sessions[frogId] = ExplorationSession({
            frogId: frogId,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            provisionsRemaining: provisions,
            explorationCount: 0,
            isActive: true
        });
        
        totalExplorers++;
        
        emit ExplorationStarted(frogId, provisions, duration);
    }
    
    /**
     * @notice Leave a footprint at an explored location
     * @param frogId The frog's NFT token ID
     * @param location Address that was explored
     * @param observation Text describing what was found
     */
    function leaveFootprint(
        uint256 frogId,
        address location,
        string calldata observation
    ) external {
        require(msg.sender == frogConnector, "Only FrogConnector");
        require(sessions[frogId].isActive, "No active session");
        
        ExplorationSession storage session = sessions[frogId];
        
        // Create footprint
        Footprint memory fp = Footprint({
            frogId: frogId,
            exploredAddress: location,
            timestamp: block.timestamp,
            observation: observation,
            blockHash: blockhash(block.number - 1)
        });
        
        // Store footprint
        footprintsByLocation[location].push(fp);
        footprintsByFrog[frogId].push(fp);
        
        // Track explored addresses
        if (!hasBeenExplored[location]) {
            hasBeenExplored[location] = true;
            exploredAddresses.push(location);
        }
        
        // Update session
        session.explorationCount++;
        totalFootprints++;
        
        emit FootprintLeft(frogId, location, observation, block.timestamp);
    }
    
    /**
     * @notice End an exploration session
     * @param frogId The frog's NFT token ID
     */
    function endExploration(uint256 frogId) external {
        require(msg.sender == frogConnector, "Only FrogConnector");
        require(sessions[frogId].isActive, "No active session");
        
        ExplorationSession storage session = sessions[frogId];
        session.isActive = false;
        
        emit ExplorationEnded(
            frogId,
            session.explorationCount,
            session.provisionsRemaining
        );
    }
    
    // ========== View Functions ==========
    
    /**
     * @notice Get all footprints at a location
     */
    function getFootprintsAtLocation(address location) 
        external view returns (Footprint[] memory) 
    {
        return footprintsByLocation[location];
    }
    
    /**
     * @notice Get all footprints by a frog
     */
    function getFrogFootprints(uint256 frogId) 
        external view returns (Footprint[] memory) 
    {
        return footprintsByFrog[frogId];
    }
    
    /**
     * @notice Get exploration session status
     */
    function getSession(uint256 frogId) 
        external view returns (ExplorationSession memory) 
    {
        return sessions[frogId];
    }
    
    /**
     * @notice Get count of visitors at a location
     */
    function getVisitorCount(address location) external view returns (uint256) {
        return footprintsByLocation[location].length;
    }
    
    /**
     * @notice Get total explored addresses count
     */
    function getExploredAddressCount() external view returns (uint256) {
        return exploredAddresses.length;
    }
    
    /**
     * @notice Get a random previously explored address (for re-visiting)
     */
    function getRandomExploredAddress(uint256 seed) 
        external view returns (address) 
    {
        if (exploredAddresses.length == 0) return address(0);
        return exploredAddresses[seed % exploredAddresses.length];
    }
    
    /**
     * @notice Check if a frog has visited a location
     */
    function hasFrogVisited(uint256 frogId, address location) 
        external view returns (bool) 
    {
        Footprint[] memory fps = footprintsByFrog[frogId];
        for (uint i = 0; i < fps.length; i++) {
            if (fps[i].exploredAddress == location) return true;
        }
        return false;
    }
}
