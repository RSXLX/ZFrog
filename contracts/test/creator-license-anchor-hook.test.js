const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('CreatorLicenseAnchorHook', function () {
  let hook;
  let owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    const CreatorLicenseAnchorHook = await ethers.getContractFactory('CreatorLicenseAnchorHook');
    hook = await CreatorLicenseAnchorHook.deploy();
    await hook.waitForDeployment();
  });

  it('anchors creator license and emits anchored event', async function () {
    const assetHash = ethers.keccak256(ethers.toUtf8Bytes('cas_001'));
    const checksumHash = ethers.keccak256(ethers.toUtf8Bytes('aabbccddeeff0011'));
    const issuedAt = 1700000000;
    const bindingId = 'cab_001';

    const [anchorId, replayed] = await hook.anchorLicense.staticCall(
      assetHash,
      checksumHash,
      owner.address,
      issuedAt,
      bindingId
    );

    expect(replayed).to.equal(false);

    await expect(
      hook.anchorLicense(assetHash, checksumHash, owner.address, issuedAt, bindingId)
    )
      .to.emit(hook, 'CreatorLicenseAnchored')
      .withArgs(anchorId, assetHash, owner.address, checksumHash, issuedAt, bindingId);

    expect(await hook.isAnchored(anchorId)).to.equal(true);
    expect(await hook.replayCount(anchorId)).to.equal(0n);
  });

  it('treats same anchor payload as replay and increments replay counter', async function () {
    const assetHash = ethers.keccak256(ethers.toUtf8Bytes('cas_002'));
    const checksumHash = ethers.keccak256(ethers.toUtf8Bytes('1122334455667788'));
    const issuedAt = 1700001000;
    const bindingId = 'cab_002';

    await hook.anchorLicense(assetHash, checksumHash, owner.address, issuedAt, bindingId);

    const [anchorId, replayed] = await hook.anchorLicense.staticCall(
      assetHash,
      checksumHash,
      owner.address,
      issuedAt,
      bindingId
    );

    expect(replayed).to.equal(true);

    await expect(
      hook.anchorLicense(assetHash, checksumHash, owner.address, issuedAt, bindingId)
    )
      .to.emit(hook, 'CreatorLicenseAnchorReplayed')
      .withArgs(anchorId, bindingId, 1n);

    expect(await hook.replayCount(anchorId)).to.equal(1n);
  });

  it('rejects zero owner wallet and empty binding id', async function () {
    const assetHash = ethers.keccak256(ethers.toUtf8Bytes('cas_003'));
    const checksumHash = ethers.keccak256(ethers.toUtf8Bytes('ffeeddccbbaa9988'));

    await expect(
      hook.anchorLicense(assetHash, checksumHash, ethers.ZeroAddress, 1700002000, 'cab_003')
    ).to.be.revertedWith('ownerWallet required');

    await expect(
      hook.anchorLicense(assetHash, checksumHash, owner.address, 1700002000, '')
    ).to.be.revertedWith('bindingId required');
  });
});
