// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Create2.sol";

contract ERC6551AccountProxy {
    address public immutable implementation;
    uint256 public immutable chainId;
    address public immutable tokenContract;
    uint256 public immutable tokenId;
    uint256 public immutable salt;

    constructor(
        address implementation_,
        uint256 chainId_,
        address tokenContract_,
        uint256 tokenId_,
        uint256 salt_
    ) payable {
        implementation = implementation_;
        chainId = chainId_;
        tokenContract = tokenContract_;
        tokenId = tokenId_;
        salt = salt_;
    }

    receive() external payable {}

    fallback() external payable {
        address impl = implementation;
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }
}

contract ERC6551Registry {
    event AccountCreated(
        address indexed account,
        address indexed implementation,
        uint256 indexed chainId,
        address tokenContract,
        uint256 tokenId,
        uint256 salt
    );

    function createAccount(
        address implementation,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId,
        uint256 salt,
        bytes calldata initData
    ) external returns (address accountAddress) {
        require(implementation != address(0), "implementation is zero");
        require(tokenContract != address(0), "token contract is zero");

        bytes32 deploySalt = _deploySalt(chainId, tokenContract, tokenId, salt);
        bytes memory code = _accountCreationCode(implementation, chainId, tokenContract, tokenId, salt);

        accountAddress = Create2.computeAddress(deploySalt, keccak256(code));
        if (accountAddress.code.length == 0) {
            accountAddress = Create2.deploy(0, deploySalt, code);

            if (initData.length > 0) {
                (bool success, bytes memory reason) = accountAddress.call(initData);
                if (!success) {
                    if (reason.length == 0) {
                        revert("account init failed");
                    }
                    assembly {
                        revert(add(reason, 32), mload(reason))
                    }
                }
            }

            emit AccountCreated(accountAddress, implementation, chainId, tokenContract, tokenId, salt);
        }
    }

    function account(
        address implementation,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId,
        uint256 salt
    ) public view returns (address) {
        bytes32 deploySalt = _deploySalt(chainId, tokenContract, tokenId, salt);
        bytes memory code = _accountCreationCode(implementation, chainId, tokenContract, tokenId, salt);
        return Create2.computeAddress(deploySalt, keccak256(code));
    }

    function _deploySalt(
        uint256 chainId,
        address tokenContract,
        uint256 tokenId,
        uint256 salt
    ) private pure returns (bytes32) {
        return keccak256(abi.encode(chainId, tokenContract, tokenId, salt));
    }

    function _accountCreationCode(
        address implementation,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId,
        uint256 salt
    ) private pure returns (bytes memory) {
        return
            abi.encodePacked(
                type(ERC6551AccountProxy).creationCode,
                abi.encode(implementation, chainId, tokenContract, tokenId, salt)
            );
    }
}
