// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title TravelRouter
 * @dev 统一旅行入口合约 (P3 合约重构)
 * 功能：
 * 1. 统一旅行入口 (startTravel)
 * 2. 批量完成旅行 (batchCompleteTravels)
 * 3. Gas 优化和重入保护
 * 4. 升级支持 (UUPS)
 */

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IZFrogNFT {
    function ownerOf(uint256 tokenId) external view returns (address);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
    function setApprovalForAll(address operator, bool approved) external;
    function getApproved(uint256 tokenId) external view returns (address);
}

interface ISouvenirNFT {
    function mintSouvenir(address to, uint256 frogId, uint256 rarityRoll) external returns (uint256);
    function totalSupply() external view returns (uint256);
}

// Travel 数据结构
struct TravelInfo {
    uint256 frogId;
    address targetWallet;
    uint256 chainId;
    uint256 startTime;
    uint256 endTime;
    bool isCompleted;
    string journalHash;
    uint256 souvenirId;
}

// 批量完成数据
struct BatchCompletion {
    uint256 frogId;
    string journalHash;
    uint256 souvenirId;
}

contract TravelRouter is 
    UUPSUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable 
{
    // ============ 状态变量 ============
    
    // 合约地址
    IZFrogNFT public frogNFT;
    ISouvenirNFT public souvenirNFT;
    IERC20 public feeToken;
    
    // 费用设置
    uint256 public travelFee;
    uint256 public batchDiscountRate; // 批量折扣率 (10000 = 100%)
    
    // 旅行记录
    mapping(uint256 => TravelInfo) public travels;
    mapping(uint256 => uint256[]) public frogTravels;
    uint256 public travelCount;
    
    // 批量处理限制
    uint256 public maxBatchSize;
    uint256 public maxGasPerBatch;
    
    // ============ 事件 ============
    
    event TravelStarted(
        uint256 indexed travelId,
        uint256 indexed frogId,
        address targetWallet,
        uint256 chainId,
        uint256 endTime
    );
    
    event TravelCompleted(
        uint256 indexed travelId,
        uint256 indexed frogId,
        string journalHash,
        uint256 souvenirId
    );
    
    event BatchTravelsCompleted(
        uint256 indexed batchId,
        uint256[] travelIds,
        uint256 totalGasUsed,
        uint256 gasSaved
    );
    
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event BatchDiscountUpdated(uint256 oldRate, uint256 newRate);
    
    // ============ 修饰符 ============
    
    modifier onlyFrogOwner(uint256 frogId) {
        require(
            frogNFT.ownerOf(frogId) == msg.sender,
            "Not frog owner"
        );
        _;
    }
    
    modifier validBatchSize(uint256 size) {
        require(size > 0 && size <= maxBatchSize, "Invalid batch size");
        _;
    }
    
    // ============ 初始化 ============
    
    function initialize(
        address _frogNFT,
        address _souvenirNFT,
        address _feeToken
    ) public initializer {
        __UUPSUpgradeable_init();
        __Ownable_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        
        frogNFT = IZFrogNFT(_frogNFT);
        souvenirNFT = ISouvenirNFT(_souvenirNFT);
        feeToken = IERC20(_feeToken);
        
        travelFee = 0.01 ether;
        batchDiscountRate = 8000; // 80% = 20% 折扣
        maxBatchSize = 10;
        maxGasPerBatch = 5000000;
    }
    
    // ============ 核心功能 ============
    
    /**
     * @dev 开始单次旅行
     */
    function startTravel(
        uint256 frogId,
        address targetWallet,
        uint256 chainId,
        uint256 durationMinutes
    ) 
        external
        payable
        nonReentrant
        whenNotPaused
        onlyFrogOwner(frogId)
        returns (uint256 travelId)
    {
        require(targetWallet != address(0), "Invalid target");
        require(durationMinutes > 0 && durationMinutes <= 1440, "Invalid duration");
        require(msg.value >= travelFee, "Insufficient fee");
        
        // 计算结束时间
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + (durationMinutes * 1 minutes);
        
        // 创建旅行记录
        travelId = ++travelCount;
        travels[travelId] = TravelInfo({
            frogId: frogId,
            targetWallet: targetWallet,
            chainId: chainId,
            startTime: startTime,
            endTime: endTime,
            isCompleted: false,
            journalHash: "",
            souvenirId: 0
        });
        
        frogTravels[frogId].push(travelId);
        
        // 退款多余费用
        if (msg.value > travelFee) {
            payable(msg.sender).transfer(msg.value - travelFee);
        }
        
        emit TravelStarted(
            travelId,
            frogId,
            targetWallet,
            chainId,
            endTime
        );
        
        return travelId;
    }
    
    /**
     * @dev 批量开始旅行 (Gas 优化)
     */
    function batchStartTravels(
        uint256[] calldata frogIds,
        address[] calldata targetWallets,
        uint256[] calldata chainIds,
        uint256[] calldata durationMinutes
    )
        external
        payable
        nonReentrant
        whenNotPaused
        validBatchSize(frogIds.length)
        returns (uint256[] memory travelIds)
    {
        uint256 batchSize = frogIds.length;
        
        require(
            targetWallets.length == batchSize &&
            chainIds.length == batchSize &&
            durationMinutes.length == batchSize,
            "Array length mismatch"
        );
        
        // 计算批量费用 (有折扣)
        uint256 batchFee = (travelFee * batchSize * batchDiscountRate) / 10000;
        require(msg.value >= batchFee, "Insufficient batch fee");
        
        travelIds = new uint256[](batchSize);
        uint256 startTime = block.timestamp;
        
        for (uint256 i = 0; i < batchSize; i++) {
            // 验证权限
            require(
                frogNFT.ownerOf(frogIds[i]) == msg.sender,
                "Not frog owner"
            );
            
            uint256 endTime = startTime + (durationMinutes[i] * 1 minutes);
            uint256 travelId = ++travelCount;
            
            travels[travelId] = TravelInfo({
                frogId: frogIds[i],
                targetWallet: targetWallets[i],
                chainId: chainIds[i],
                startTime: startTime,
                endTime: endTime,
                isCompleted: false,
                journalHash: "",
                souvenirId: 0
            });
            
            frogTravels[frogIds[i]].push(travelId);
            travelIds[i] = travelId;
            
            emit TravelStarted(
                travelId,
                frogIds[i],
                targetWallets[i],
                chainIds[i],
                endTime
            );
        }
        
        // 退款多余费用
        if (msg.value > batchFee) {
            payable(msg.sender).transfer(msg.value - batchFee);
        }
        
        return travelIds;
    }
    
    /**
     * @dev 完成单次旅行
     */
    function completeTravel(
        uint256 travelId,
        string calldata journalHash,
        uint256 souvenirId
    )
        external
        nonReentrant
        whenNotPaused
    {
        TravelInfo storage travel = travels[travelId];
        
        require(travel.frogId != 0, "Travel not found");
        require(!travel.isCompleted, "Already completed");
        require(travel.endTime <= block.timestamp, "Travel not ended");
        require(
            frogNFT.ownerOf(travel.frogId) == msg.sender ||
            msg.sender == owner(),
            "Not authorized"
        );
        
        travel.isCompleted = true;
        travel.journalHash = journalHash;
        travel.souvenirId = souvenirId;
        
        emit TravelCompleted(travelId, travel.frogId, journalHash, souvenirId);
    }
    
    /**
     * @dev 批量完成旅行 (Gas 优化核心)
     */
    function batchCompleteTravels(
        uint256[] calldata travelIds,
        string[] calldata journalHashes,
        uint256[] calldata souvenirIds
    )
        external
        nonReentrant
        whenNotPaused
        validBatchSize(travelIds.length)
    {
        uint256 batchSize = travelIds.length;
        
        require(
            journalHashes.length == batchSize &&
            souvenirIds.length == batchSize,
            "Array length mismatch"
        );
        
        uint256[] memory completedIds = new uint256[](batchSize);
        uint256 completedCount = 0;
        uint256 gasStart = gasleft();
        
        for (uint256 i = 0; i < batchSize; i++) {
            uint256 travelId = travelIds[i];
            TravelInfo storage travel = travels[travelId];
            
            // 跳过无效或已完成
            if (travel.frogId == 0 || travel.isCompleted) {
                continue;
            }
            
            // 检查授权
            if (frogNFT.ownerOf(travel.frogId) != msg.sender && msg.sender != owner()) {
                continue;
            }
            
            // 完成旅行
            travel.isCompleted = true;
            travel.journalHash = journalHashes[i];
            travel.souvenirId = souvenirIds[i];
            
            completedIds[completedCount] = travelId;
            completedCount++;
            
            emit TravelCompleted(
                travelId,
                travel.frogId,
                journalHashes[i],
                souvenirIds[i]
            );
            
            // Gas 限制检查
            if (gasleft() < 50000) {
                break;
            }
        }
        
        uint256 gasUsed = gasStart - gasleft();
        
        // 计算节省的 Gas
        uint256 estimatedIndividualGas = completedCount * 150000;
        uint256 gasSaved = estimatedIndividualGas > gasUsed ? estimatedIndividualGas - gasUsed : 0;
        
        emit BatchTravelsCompleted(
            block.number,
            completedIds,
            gasUsed,
            gasSaved
        );
    }
    
    // ============ 查询函数 ============
    
    function getTravel(uint256 travelId) external view returns (TravelInfo memory) {
        return travels[travelId];
    }
    
    function getFrogTravels(uint256 frogId) external view returns (uint256[] memory) {
        return frogTravels[frogId];
    }
    
    function getTravelCount() external view returns (uint256) {
        return travelCount;
    }
    
    // ============ 管理功能 ============
    
    function setTravelFee(uint256 newFee) external onlyOwner {
        uint256 oldFee = travelFee;
        travelFee = newFee;
        emit FeeUpdated(oldFee, newFee);
    }
    
    function setBatchDiscountRate(uint256 newRate) external onlyOwner {
        require(newRate <= 10000, "Rate cannot exceed 100%");
        uint256 oldRate = batchDiscountRate;
        batchDiscountRate = newRate;
        emit BatchDiscountUpdated(oldRate, newRate);
    }
    
    function setMaxBatchSize(uint256 newSize) external onlyOwner {
        require(newSize > 0 && newSize <= 50, "Invalid batch size");
        maxBatchSize = newSize;
    }
    
    function setMaxGasPerBatch(uint256 newLimit) external onlyOwner {
        maxGasPerBatch = newLimit;
    }
    
    function updateContracts(
        address _frogNFT,
        address _souvenirNFT
    ) external onlyOwner {
        require(_frogNFT != address(0) && _souvenirNFT != address(0), "Invalid addresses");
        frogNFT = IZFrogNFT(_frogNFT);
        souvenirNFT = ISouvenirNFT(_souvenirNFT);
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner()).transfer(balance);
    }
    
    function withdrawTokenFees(address token) external onlyOwner {
        IERC20 tokenContract = IERC20(token);
        uint256 balance = tokenContract.balanceOf(address(this));
        require(balance > 0, "No token fees to withdraw");
        tokenContract.transfer(owner(), balance);
    }
    
    // ============ 升级授权 ============
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    // ============ 接收 ETH ============
    
    receive() external payable {}
    fallback() external payable {}
}
