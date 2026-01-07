// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ZetaChain Gateway Interfaces (v2 - Athens-3)
 * @notice Updated interfaces for ZetaChain's new Gateway-based cross-chain messaging
 */

// ============ Core Structs ============

struct CallOptions {
    uint256 gasLimit;
    bool isArbitraryCall;
}

struct RevertOptions {
    address revertAddress;
    bool callOnRevert;
    address abortAddress;
    bytes revertMessage;
    uint256 onRevertGasLimit;
}

struct RevertContext {
    address sender;
    address asset;
    uint256 amount;
    bytes revertMessage;
}

struct MessageContext {
    bytes sender;
    uint256 chainID;
}

// ============ Gateway Interface (ZetaChain side - ZEVM) ============

interface IGatewayZEVM {
    /**
     * @notice Call a smart contract on an external chain without asset transfer
     * @param receiver The receiver address on the external chain
     * @param zrc20 The ZRC20 token representing the gas token of the target chain
     * @param message The encoded message to send
     * @param callOptions Options for the call (gas limit, etc)
     * @param revertOptions Options for handling reverts
     */
    function call(
        bytes memory receiver,
        address zrc20,
        bytes calldata message,
        CallOptions calldata callOptions,
        RevertOptions calldata revertOptions
    ) external;

    /**
     * @notice Withdraw ZRC20 tokens and call a smart contract on an external chain
     */
    function withdrawAndCall(
        bytes memory receiver,
        uint256 amount,
        address zrc20,
        bytes calldata message,
        CallOptions calldata callOptions,
        RevertOptions calldata revertOptions
    ) external;

    /**
     * @notice Withdraw ZETA tokens to an external chain
     */
    function withdraw(
        bytes memory receiver,
        uint256 chainId,
        RevertOptions calldata revertOptions
    ) external payable;

    /**
     * @notice Withdraw ZETA tokens and call a smart contract on an external chain
     */
    function withdrawAndCall(
        bytes memory receiver,
        uint256 chainId,
        bytes calldata message,
        CallOptions calldata callOptions,
        RevertOptions calldata revertOptions
    ) external payable;
}

// ============ Universal Contract Interface (for receiving calls) ============

interface IUniversalContract {
    /**
     * @notice Handle cross-chain calls with native ZETA transfers
     */
    function onCall(
        MessageContext calldata context,
        bytes calldata message
    ) external payable;

    /**
     * @notice Handle cross-chain calls with ZRC20 token transfers
     */
    function onCall(
        MessageContext calldata context,
        address zrc20,
        uint256 amount,
        bytes calldata message
    ) external;

    /**
     * @notice Handle revert from cross-chain call
     */
    function onRevert(RevertContext calldata revertContext) external;
}

// ============ ZRC20 Interface (for gas payment) ============

interface IZRC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function withdrawGasFee() external view returns (address, uint256);
    function withdrawGasFeeWithGasLimit(uint256 gasLimit) external view returns (address, uint256);
}

// ============ Legacy WZETA Interface ============

interface IWZETA {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

// ============ Uniswap Router Interface (for System DEX) ============

interface IUniswapV2Router02 {
    function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts);
    function getAmountsIn(uint amountOut, address[] memory path) external view returns (uint[] memory amounts);
}

// ============ ZetaFrogNFT Interface ============

interface IZetaFrogNFT {
    enum FrogStatus { Idle, Traveling }
    
    function ownerOf(uint256 tokenId) external view returns (address);
    function getFrogStatus(uint256 tokenId) external view returns (FrogStatus);
    function setFrogStatus(uint256 tokenId, FrogStatus status) external;
    function addExperience(uint256 tokenId, uint256 xpAmount) external;
    function frogs(uint256 tokenId) external view returns (
        string memory name,
        uint64 birthday,
        uint32 totalTravels,
        FrogStatus status,
        uint256 xp,
        uint256 level
    );
}

// ============ Legacy Interfaces (for FrogConnector on other chains) ============

// Legacy message structure received from cross-chain (for non-ZetaChain deployments)
struct ZetaMessage {
    bytes zetaTxSenderAddress;
    uint256 sourceChainId;
    address destinationAddress;
    uint256 zetaValue;
    bytes message;
}

// Legacy revert context 
struct ZetaRevert {
    address zetaTxSenderAddress;
    uint256 sourceChainId;
    bytes destinationAddress;
    uint256 destinationChainId;
    uint256 remainingZetaValue;
    bytes message;
}

// Legacy interface for receiving cross-chain messages on other chains
interface ZetaReceiver {
    function onZetaMessage(ZetaMessage calldata zetaMessage) external;
    function onZetaRevert(ZetaRevert calldata zetaRevert) external;
}

// Legacy connector interface for other chains
interface ZetaConnector {
    function send(ZetaSendInput calldata input) external;
}

// Legacy send input structure
struct ZetaSendInput {
    uint256 destinationChainId;
    bytes destinationAddress;
    uint256 destinationGasLimit;
    bytes message;
    uint256 zetaValueAndGas;
    bytes zetaParams;
}

// Legacy IERC20 interface (for FrogConnector)
interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}
