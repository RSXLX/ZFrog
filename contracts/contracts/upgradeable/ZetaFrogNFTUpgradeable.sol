// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title ZetaFrogNFTUpgradeable
 * @notice Upgradeable version of ZetaFrogNFT using UUPS pattern
 * @dev This contract can be upgraded without losing state data
 */
contract ZetaFrogNFTUpgradeable is 
    Initializable,
    ERC721Upgradeable,
    ERC721URIStorageUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable 
{
    // ============ Constants ============
    uint256 public constant MAX_SUPPLY = 1000;

    // ============ Enums ============
    enum FrogStatus {
        Idle,
        Traveling,
        CrossChainLocked
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
    // Note: Order matters! Never change the order of existing variables
    uint256 private _tokenIdCounter;
    mapping(uint256 => Frog) public frogs;
    mapping(address => bool) public hasMinted;
    mapping(address => uint256) public ownerToTokenId;
    
    address public travelContract;
    address public omniTravelContract;
    
    // Migration flag
    bool public migrationCompleted;
    
    // Reserved storage space for future upgrades
    // Reduce this array size when adding new variables
    uint256[48] private __gap;

    // ============ Events ============
    event FrogMinted(
        address indexed owner,
        uint256 indexed tokenId,
        string name,
        uint256 timestamp
    );
    event LevelUp(uint256 indexed tokenId, uint256 newLevel, uint256 timestamp);
    event FrogStatusUpdated(uint256 indexed tokenId, FrogStatus status);
    event FrogMigrated(uint256 indexed tokenId, address indexed owner, string name);

    // ============ Modifiers ============
    modifier onlyTravelContract() {
        require(
            msg.sender == travelContract || msg.sender == omniTravelContract, 
            "Caller is not authorized"
        );
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the contract (replaces constructor)
     * @dev Can only be called once
     */
    function initialize() public initializer {
        __ERC721_init("ZetaFrog", "ZFROG");
        __ERC721URIStorage_init();
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
    }

    /**
     * @notice Authorize upgrade (required by UUPS)
     * @dev Only owner can upgrade the contract
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

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
     */
    function emergencyResetFrogStatus(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Frog does not exist");
        frogs[tokenId].status = FrogStatus.Idle;
        emit FrogStatusUpdated(tokenId, FrogStatus.Idle);
    }

    /**
     * @notice Batch reset multiple frogs to Idle (owner only)
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
     * @notice Force set frog status (owner only)
     */
    function adminSetFrogStatus(uint256 tokenId, FrogStatus status) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Frog does not exist");
        frogs[tokenId].status = status;
        emit FrogStatusUpdated(tokenId, status);
    }

    /**
     * @notice Reset hasMinted flag for an address (owner only, for testing)
     * @dev WARNING: This allows re-minting. Use only for testing purposes.
     */
    function adminResetHasMinted(address user) external onlyOwner {
        require(user != address(0), "Invalid address");
        hasMinted[user] = false;
        ownerToTokenId[user] = 0;
    }

    /**
     * @notice Batch reset hasMinted flags (owner only, for testing)
     */
    function adminBatchResetHasMinted(address[] calldata users) external onlyOwner {
        for (uint i = 0; i < users.length; i++) {
            if (users[i] != address(0)) {
                hasMinted[users[i]] = false;
                ownerToTokenId[users[i]] = 0;
            }
        }
    }

    // ============ Migration Functions ============
    
    /**
     * @notice Migrate frog data from old contract (owner only)
     * @dev Can only be called before migration is completed
     */
    function migrateFrog(
        uint256 tokenId,
        address owner,
        string calldata name,
        uint64 birthday,
        uint32 totalTravels,
        uint256 xp,
        uint256 level
    ) external onlyOwner {
        require(!migrationCompleted, "Migration already completed");
        require(owner != address(0), "Invalid owner");
        require(_ownerOf(tokenId) == address(0), "Token already exists");
        
        _safeMint(owner, tokenId);
        hasMinted[owner] = true;
        ownerToTokenId[owner] = tokenId;
        
        frogs[tokenId] = Frog({
            name: name,
            birthday: birthday,
            totalTravels: totalTravels,
            status: FrogStatus.Idle,
            xp: xp,
            level: level
        });
        
        // Update counter if needed
        if (tokenId >= _tokenIdCounter) {
            _tokenIdCounter = tokenId + 1;
        }
        
        emit FrogMigrated(tokenId, owner, name);
    }

    /**
     * @notice Batch migrate multiple frogs
     */
    function batchMigrateFrogs(
        uint256[] calldata tokenIds,
        address[] calldata owners,
        string[] calldata names,
        uint64[] calldata birthdays,
        uint32[] calldata totalTravelsList,
        uint256[] calldata xps,
        uint256[] calldata levels
    ) external onlyOwner {
        require(!migrationCompleted, "Migration already completed");
        require(tokenIds.length == owners.length, "Length mismatch");
        
        for (uint i = 0; i < tokenIds.length; i++) {
            if (_ownerOf(tokenIds[i]) == address(0)) {
                _safeMint(owners[i], tokenIds[i]);
                hasMinted[owners[i]] = true;
                ownerToTokenId[owners[i]] = tokenIds[i];
                
                frogs[tokenIds[i]] = Frog({
                    name: names[i],
                    birthday: birthdays[i],
                    totalTravels: totalTravelsList[i],
                    status: FrogStatus.Idle,
                    xp: xps[i],
                    level: levels[i]
                });
                
                if (tokenIds[i] >= _tokenIdCounter) {
                    _tokenIdCounter = tokenIds[i] + 1;
                }
                
                emit FrogMigrated(tokenIds[i], owners[i], names[i]);
            }
        }
    }

    /**
     * @notice Complete migration (disables migration functions)
     */
    function completeMigration() external onlyOwner {
        migrationCompleted = true;
    }

    // ============ Core Functions ============

    /**
     * @notice Mint a new frog NFT
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

        emit FrogMinted(msg.sender, tokenId, name, block.timestamp);
        return tokenId;
    }

    /**
     * @notice Set frog status (called by Travel contracts)
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
     * @notice Add experience to a frog
     */
    function addExperience(uint256 tokenId, uint256 xpAmount)
        external
        whenNotPaused
        onlyTravelContract
    {
        require(_ownerOf(tokenId) != address(0), "Frog does not exist");
        Frog storage frog = frogs[tokenId];
        frog.xp += xpAmount;

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

    function getTokenIdByOwner(address owner) external view returns (uint256) {
        require(hasMinted[owner], "No frog owned by this address");
        return ownerToTokenId[owner];
    }

    function hasFrog(address owner) external view returns (bool) {
        return hasMinted[owner];
    }

    /**
     * @notice Get contract version
     */
    function version() external pure returns (string memory) {
        return "2.1.0";
    }

    // ============ Required Overrides ============
    
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable) 
        returns (string memory) 
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }
}
