// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SouvenirNFT
 * @notice MVP Souvenir NFTs earned from frog travels
 */
contract SouvenirNFT is ERC1155, Ownable {
    // ============ Enums ============
    enum Rarity { Common, Uncommon, Rare }
    
    // ============ Structs ============
    struct Souvenir {
        string name;
        Rarity rarity;
        uint256 frogId;
        uint64 mintTime;
        string metadataURI;
    }
    
    // ============ State Variables ============
    uint256 private _tokenIdCounter;
    
    mapping(uint256 => Souvenir) public souvenirs;
    mapping(uint256 => uint256[]) public frogSouvenirs;
    
    address public zetaFrogNFT;
    address public minter;
    
    // MVP: 预定义的 3 种纪念品
    // V1.1: 扩展纪念品列表
    string[9] public souvenirNames = [
        "Ethereum Postcard",
        "Gas Fee Receipt", 
        "Blockchain Snowglobe",
        "Polygon Matic", 
        "Layer2 Bridge Ticket",
        "Purple Crystal",
        "BSC Shield",
        "Binance Coin Replica",
        "DEX Trader Badge"
    ];
    
    // ============ Events ============
    event SouvenirMinted(
        uint256 indexed souvenirId,
        uint256 indexed frogId,
        address indexed owner,
        Rarity rarity,
        string name
    );

    // ============ Constructor ============
    constructor() ERC1155("") Ownable(msg.sender) {
        minter = msg.sender;
    }

    // ============ Admin Functions ============
    function setMinter(address _minter) external onlyOwner {
        minter = _minter;
    }
    
    function setZetaFrogNFT(address _zetaFrog) external onlyOwner {
        zetaFrogNFT = _zetaFrog;
    }

    // ============ Core Functions ============
    
    /**
     * @notice Mint a souvenir for a frog
     * @param to Owner address
     * @param frogId Associated frog NFT ID
     * @param rarityRoll Random number for rarity (0-99)
     */
    function mintSouvenir(
        address to,
        uint256 frogId,
        uint256 rarityRoll
    ) external returns (uint256) {
        require(msg.sender == minter, "Not minter");
        
        uint256 souvenirId = _tokenIdCounter++;
        
        // Determine rarity: 70% Common, 25% Uncommon, 5% Rare
        Rarity rarity;
        if (rarityRoll < 70) {
            rarity = Rarity.Common;
        } else if (rarityRoll < 95) {
            rarity = Rarity.Uncommon;
        } else {
            rarity = Rarity.Rare;
        }
        
        // Select souvenir name based on rarity and random variant
        // 0-2 (Common/Uncommon/Rare) + 0/3/6 (Ethereum/Polygon/BSC)
        uint256 variant = uint256(keccak256(abi.encodePacked(block.timestamp, frogId))) % 3;
        uint256 index = uint256(rarity) + (variant * 3);
        string memory name = souvenirNames[index];
        
        souvenirs[souvenirId] = Souvenir({
            name: name,
            rarity: rarity,
            frogId: frogId,
            mintTime: uint64(block.timestamp),
            metadataURI: ""
        });
        
        frogSouvenirs[frogId].push(souvenirId);
        
        _mint(to, souvenirId, 1, "");
        
        emit SouvenirMinted(souvenirId, frogId, to, rarity, name);
        
        return souvenirId;
    }
    
    /**
     * @notice Update souvenir metadata URI
     */
    function setMetadataURI(uint256 souvenirId, string calldata uri_) external {
        require(msg.sender == minter, "Not minter");
        souvenirs[souvenirId].metadataURI = uri_;
    }

    // ============ View Functions ============
    
    function getSouvenir(uint256 souvenirId) external view returns (
        string memory name,
        Rarity rarity,
        uint256 frogId,
        uint64 mintTime,
        string memory metadataURI
    ) {
        Souvenir memory s = souvenirs[souvenirId];
        return (s.name, s.rarity, s.frogId, s.mintTime, s.metadataURI);
    }
    
    function getFrogSouvenirs(uint256 frogId) external view returns (uint256[] memory) {
        return frogSouvenirs[frogId];
    }
    
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }
    
    function uri(uint256 tokenId) public view override returns (string memory) {
        return souvenirs[tokenId].metadataURI;
    }
}
