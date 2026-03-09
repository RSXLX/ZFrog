// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ZetaInterfaces.sol";

/**
 * @title OmniTravel
 * @dev 跨链旅行核心合约 - 已修复重入攻击漏洞
 * @notice 使用 ReentrancyGuard 防止重入攻击
 */
contract OmniTravel is ReentrancyGuard, Pausable, Ownable {
    
    // ============ 状态变量 ============
    
    IZetaFrogNFT public immutable zetaFrogNFT;
    IZetaGateway public immutable gateway;
    
    // 跨链旅行数据
    struct CrossChainTravel {
        address owner;
        uint256 tokenId;
        uint256 destinationChainId;
        uint256 provisions;
        uint256 startTime;
        uint256 estimatedDuration;
        CrossChainStatus status;
        bytes32 returnMessageId;
    }
    
    enum CrossChainStatus {
        Idle,
        Traveling,
        Completed,
        Failed
    }
    
    // tokenId => 旅行数据
    mapping(uint256 => CrossChainTravel) public crossChainTravels;
    
    // 支持的链ID列表
    mapping(uint256 => bool) public supportedChains;
    uint256[] public chainList;
    
    // 费用设置
    uint256 public platformFee = 100; // 1% (basis points)
    uint256 public constant MIN_PROVISIONS = 0.001 ether;
    uint256 public constant MAX_DURATION = 30 days;
    
    // ============ 事件 ============
    
    event CrossChainTravelStarted(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 destinationChainId,
        uint256 provisions,
        bytes32 messageId
    );
    
    event CrossChainTravelCompleted(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 provisionsReturned,
        uint256 xpEarned
    );
    
    event CrossChainTravelFailed(
        uint256 indexed tokenId,
        address indexed owner,
        string reason
    );
    
    event ChainSupported(uint256 indexed chainId, bool supported);
    event PlatformFeeUpdated(uint256 newFee);
    
    // ============ 修饰符 ============
    
    modifier onlyFrogOwner(uint256 tokenId) {
        require(zetaFrogNFT.ownerOf(tokenId) == msg.sender, "Not frog owner");
        _;
    }
    
    modifier onlySupportedChain(uint256 chainId) {
        require(supportedChains[chainId], "Chain not supported");
        _;
    }
    
    // ============ 构造函数 ============
    
    constructor(
        address _zetaFrogNFT,
        address _gateway
    ) Ownable(msg.sender) {
        require(_zetaFrogNFT != address(0), "Invalid NFT address");
        require(_gateway != address(0), "Invalid gateway address");
        
        zetaFrogNFT = IZetaFrogNFT(_zetaFrogNFT);
        gateway = IZetaGateway(_gateway);
    }
    
    // ============ 核心功能 ============
    
    /**
     * @dev 开始跨链旅行 - 已添加 nonReentrant 防护
     */
    function startCrossChainTravel(
        uint256 tokenId,
        uint256 destinationChainId,
        uint256 estimatedDuration
    ) external payable nonReentrant whenNotPaused onlyFrogOwner(tokenId) onlySupportedChain(destinationChainId) {
        require(msg.value >= MIN_PROVISIONS, "Insufficient provisions");
        require(estimatedDuration <= MAX_DURATION, "Duration too long");
        require(crossChainTravels[tokenId].status == CrossChainStatus.Idle, "Travel already active");
        
        // 计算平台费用
        uint256 fee = (msg.value * platformFee) / 10000;
        uint256 provisions = msg.value - fee;
        
        // 更新状态 - 使用 Checks-Effects-Interactions 模式
        crossChainTravels[tokenId] = CrossChainTravel({
            owner: msg.sender,
            tokenId: tokenId,
            destinationChainId: destinationChainId,
            provisions: provisions,
            startTime: block.timestamp,
            estimatedDuration: estimatedDuration,
            status: CrossChainStatus.Traveling,
            returnMessageId: bytes32(0)
        });
        
        // 设置青蛙状态为旅行中
        zetaFrogNFT.setFrogStatus(tokenId, IZetaFrogNFT.FrogStatus.Traveling);
        
        // 发送跨链消息
        bytes32 messageId = _sendCrossChainMessage(destinationChainId, tokenId, provisions);
        crossChainTravels[tokenId].returnMessageId = messageId;
        
        emit CrossChainTravelStarted(tokenId, msg.sender, destinationChainId, provisions, messageId);
    }
    
    /**
     * @dev 完成跨链旅行 - 已添加 nonReentrant 防护
     */
    function markTravelCompleted(
        uint256 tokenId,
        uint256 xpEarned
    ) external nonReentrant onlyOwner {
        CrossChainTravel storage travel = crossChainTravels[tokenId];
        require(travel.status == CrossChainStatus.Traveling, "Not traveling");
        
        // 先更新状态 - Checks-Effects-Interactions 模式
        travel.status = CrossChainStatus.Completed;
        
        // 退还剩余资金
        uint256 remaining = travel.provisions;
        if (remaining > 0) {
            (bool success, ) = travel.owner.call{value: remaining}("");
            require(success, "Refund failed");
        }
        
        // 更新 NFT 状态
        zetaFrogNFT.setFrogStatus(tokenId, IZetaFrogNFT.FrogStatus.Idle);
        zetaFrogNFT.addExperience(tokenId, xpEarned);
        
        emit CrossChainTravelCompleted(tokenId, travel.owner, remaining, xpEarned);
    }
    
    /**
     * @dev 退款剩余资金 - 内部函数，调用方需确保重入防护
     */
    function _refundRemainingProvisions(uint256 tokenId) internal {
        CrossChainTravel storage travel = crossChainTravels[tokenId];
        uint256 remaining = travel.provisions;
        
        if (remaining > 0) {
            travel.provisions = 0; // 先清零，防止重入
            (bool success, ) = travel.owner.call{value: remaining}("");
            require(success, "Refund failed");
        }
    }
    
    // ============ 管理功能 ============
    
    function setChainSupport(uint256 chainId, bool supported) external onlyOwner {
        supportedChains[chainId] = supported;
        if (supported) {
            chainList.push(chainId);
        }
        emit ChainSupported(chainId, supported);
    }
    
    function setPlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        platformFee = newFee;
        emit PlatformFeeUpdated(newFee);
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdraw failed");
    }
    
    // ============ 内部函数 ============
    
    function _sendCrossChainMessage(
        uint256 destinationChainId,
        uint256 tokenId,
        uint256 provisions
    ) internal returns (bytes32) {
        // 实现跨链消息发送逻辑
        // 这里需要集成 ZetaChain gateway
        return keccak256(abi.encodePacked(tokenId, block.timestamp));
    }
    
    // ============ 接收函数 ============
    
    receive() external payable {}
}

// ============ 接口定义 ============

interface IZetaGateway {
    function call(
        address receiver,
        address zrc20,
        bytes calldata message,
        CallOptions calldata callOptions,
        RevertOptions calldata revertOptions
    ) external;
}
