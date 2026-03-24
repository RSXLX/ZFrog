// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CreatorLicenseAnchorHook {
    event CreatorLicenseAnchored(
        bytes32 indexed anchorId,
        bytes32 indexed assetHash,
        address indexed ownerWallet,
        bytes32 checksumHash,
        uint64 issuedAt,
        string bindingId
    );

    event CreatorLicenseAnchorReplayed(
        bytes32 indexed anchorId,
        string bindingId,
        uint256 replayCount
    );

    mapping(bytes32 => bool) public anchored;
    mapping(bytes32 => uint256) public replayCount;

    function anchorLicense(
        bytes32 assetHash,
        bytes32 checksumHash,
        address ownerWallet,
        uint64 issuedAt,
        string calldata bindingId
    ) external returns (bytes32 anchorId, bool replayed) {
        require(assetHash != bytes32(0), 'assetHash required');
        require(checksumHash != bytes32(0), 'checksumHash required');
        require(ownerWallet != address(0), 'ownerWallet required');
        require(issuedAt > 0, 'issuedAt required');
        require(bytes(bindingId).length > 0, 'bindingId required');
        require(bytes(bindingId).length <= 128, 'bindingId too long');

        bytes32 bindingHash = keccak256(bytes(bindingId));
        anchorId = keccak256(
            abi.encodePacked(bindingHash, assetHash, checksumHash, ownerWallet, issuedAt)
        );

        if (anchored[anchorId]) {
            uint256 nextReplayCount = replayCount[anchorId] + 1;
            replayCount[anchorId] = nextReplayCount;
            emit CreatorLicenseAnchorReplayed(anchorId, bindingId, nextReplayCount);
            return (anchorId, true);
        }

        anchored[anchorId] = true;
        replayCount[anchorId] = 0;

        emit CreatorLicenseAnchored(
            anchorId,
            assetHash,
            ownerWallet,
            checksumHash,
            issuedAt,
            bindingId
        );

        return (anchorId, false);
    }

    function isAnchored(bytes32 anchorId) external view returns (bool) {
        return anchored[anchorId];
    }
}
