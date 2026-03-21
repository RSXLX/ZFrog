// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/interfaces/IERC721.sol";

interface IERC6551AccountContext {
    function chainId() external view returns (uint256);
    function tokenContract() external view returns (address);
    function tokenId() external view returns (uint256);
}

contract FrogTBAAccount {
    uint256 private _state;

    receive() external payable {}

    function executeCall(
        address to,
        uint256 value,
        bytes calldata data
    ) external payable returns (bytes memory result) {
        require(msg.sender == owner(), "not token owner");

        _state += 1;
        (bool success, bytes memory returnedData) = to.call{value: value}(data);
        if (!success) {
            if (returnedData.length == 0) {
                revert("execution failed");
            }
            assembly {
                revert(add(returnedData, 32), mload(returnedData))
            }
        }
        return returnedData;
    }

    function token() public view returns (uint256 chainId_, address tokenContract_, uint256 tokenId_) {
        IERC6551AccountContext context = IERC6551AccountContext(address(this));
        chainId_ = context.chainId();
        tokenContract_ = context.tokenContract();
        tokenId_ = context.tokenId();
    }

    function owner() public view returns (address) {
        (uint256 chainId_, address tokenContract_, uint256 tokenId_) = token();
        if (chainId_ != block.chainid) {
            return address(0);
        }

        try IERC721(tokenContract_).ownerOf(tokenId_) returns (address tokenOwner) {
            return tokenOwner;
        } catch {
            return address(0);
        }
    }

    function state() external view returns (uint256) {
        return _state;
    }
}
