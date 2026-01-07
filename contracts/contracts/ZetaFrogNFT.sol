// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ZetaFrogNFT
 * @notice Core NFT contract for ZetaFrog
 * @dev Travel logic moved to Travel.sol
 */
contract ZetaFrogNFT is ERC721URIStorage, Ownable, ReentrancyGuard, Pausable {
    // ============ Constants ============
    uint256 public constant MAX_SUPPLY = 1000;

    // ============ Enums ============
    enum FrogStatus {
        Idle,
        Traveling,
        CrossChainLocked  // New: locked for cross-chain travel
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

    // ============ State Variables ============
    uint256 private _tokenIdCounter;
    mapping(uint256 => Frog) public frogs;
    
    // Single frog per wallet restriction
    mapping(address => bool) public hasMinted;
    mapping(address => uint256) public ownerToTokenId;
    
    address public travelContract; // Authorized Travel contract
    address public omniTravelContract; // Authorized OmniTravel contract for cross-chain

    
    // ============ Events ============
    event FrogMinted(
        address indexed owner,
        uint256 indexed tokenId,
        string name,
        uint256 timestamp
    );

    event LevelUp(uint256 indexed tokenId, uint256 newLevel, uint256 timestamp);
    event FrogStatusUpdated(uint256 indexed tokenId, FrogStatus status);

    // ============ Modifiers ============
    modifier onlyTravelContract() {
        require(
            msg.sender == travelContract || msg.sender == omniTravelContract, 
            "Caller is not authorized"
        );
        _;
    }

    // ============ Constructor ============
    constructor() ERC721("ZetaFrog", "ZFROG") Ownable(msg.sender) {}

    // ============ Admin Functions ============
    function setTravelContract(address _travelContract) external onlyOwner {
        require(_travelContract != address(0), "Invalid address");
        travelContract = _travelContract;
    }

    function setOmniTravelContract(address _omniTravelContract) external onlyOwner {
        require(_omniTravelContract != address(0), "Invalid address");
        omniTravelContract = _omniTravelContract;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ Emergency Admin Functions ============
    
    /**
     * @notice Emergency reset frog status to Idle (owner only)
     * @dev Use this when contract upgrades leave frogs in stuck states
     * @param tokenId The frog token ID to reset
     */
    function emergencyResetFrogStatus(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Frog does not exist");
        frogs[tokenId].status = FrogStatus.Idle;
        emit FrogStatusUpdated(tokenId, FrogStatus.Idle);
    }

    /**
     * @notice Batch reset multiple frogs to Idle (owner only)
     * @param tokenIds Array of frog token IDs to reset
     */
    function batchResetFrogStatus(uint256[] calldata tokenIds) external onlyOwner {
        for (uint i = 0; i < tokenIds.length; i++) {
            if (_ownerOf(tokenIds[i]) != address(0)) {
                frogs[tokenIds[i]].status = FrogStatus.Idle;
                emit FrogStatusUpdated(tokenIds[i], FrogStatus.Idle);
            }
        }
    }

    /**
     * @notice Force set frog status (owner only, for migration)
     * @param tokenId The frog token ID
     * @param status The new status to set
     */
    function adminSetFrogStatus(uint256 tokenId, FrogStatus status) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Frog does not exist");
        frogs[tokenId].status = status;
        emit FrogStatusUpdated(tokenId, status);
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
        require(!hasMinted[msg.sender], "Already minted a frog");

        uint256 tokenId = _tokenIdCounter++;
        _safeMint(msg.sender, tokenId);
        
        // Record single frog ownership
        hasMinted[msg.sender] = true;
        ownerToTokenId[msg.sender] = tokenId;

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
     * @notice Set frog status (called by Travel contract)
     */
    function setFrogStatus(uint256 tokenId, FrogStatus status) 
        external 
        whenNotPaused 
        onlyTravelContract 
    {
        require(_ownerOf(tokenId) != address(0), "Frog does not exist");
        frogs[tokenId].status = status;
        
        if (status == FrogStatus.Idle) {
            frogs[tokenId].totalTravels++;
        }
        
        emit FrogStatusUpdated(tokenId, status);
    }

    /**
     * @notice Add experience to a frog (called by Travel contract)
     */
    function addExperience(uint256 tokenId, uint256 xpAmount)
        external
        whenNotPaused
        onlyTravelContract
    {
        require(_ownerOf(tokenId) != address(0), "Frog does not exist");
        Frog storage frog = frogs[tokenId];
        frog.xp += xpAmount;

        // Simple leveling logic: Every 100 XP = 1 Level
        uint256 newLevel = (frog.xp / 100) + 1;
        if (newLevel > frog.level) {
            frog.level = newLevel;
            emit LevelUp(tokenId, newLevel, block.timestamp);
        }
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
    
    function getFrogStatus(uint256 tokenId) external view returns (FrogStatus) {
        return frogs[tokenId].status;
    }

    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @notice Get token ID by owner address
     * @param owner The wallet address to query
     * @return tokenId The frog token ID owned by the address
     */
    function getTokenIdByOwner(address owner) external view returns (uint256) {
        require(hasMinted[owner], "No frog owned by this address");
        return ownerToTokenId[owner];
    }

    /**
     * @notice Check if an address has already minted a frog
     * @param owner The wallet address to check
     * @return Whether the address has a frog
     */
    function hasFrog(address owner) external view returns (bool) {
        return hasMinted[owner];
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