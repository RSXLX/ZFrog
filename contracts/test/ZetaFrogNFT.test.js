const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ZetaFrogNFT", function () {
  let zetaFrogNFT;
  let owner, user, travelManager, omniManager;

  beforeEach(async function () {
    [owner, user, travelManager, omniManager] = await ethers.getSigners();

    const ZetaFrogNFT = await ethers.getContractFactory("ZetaFrogNFT");
    zetaFrogNFT = await ZetaFrogNFT.deploy();
    await zetaFrogNFT.waitForDeployment();
    await zetaFrogNFT.setTravelContract(travelManager.address);
    await zetaFrogNFT.setOmniTravelContract(omniManager.address);
  });

  it("mints frog with initial stats", async function () {
    await zetaFrogNFT.connect(user).mintFrog("Froggy");

    const frog = await zetaFrogNFT.getFrog(0);
    expect(frog.name).to.equal("Froggy");
    expect(frog.level).to.equal(1n);
    expect(frog.xp).to.equal(0n);
    expect(frog.status).to.equal(0n); // Idle
    expect(await zetaFrogNFT.totalSupply()).to.equal(1n);
  });

  it("enforces single frog per wallet", async function () {
    await zetaFrogNFT.connect(user).mintFrog("Froggy");

    await expect(
      zetaFrogNFT.connect(user).mintFrog("SecondFrog")
    ).to.be.revertedWith("Already minted a frog");
  });

  it("allows authorized contract to add experience and level up", async function () {
    await zetaFrogNFT.connect(user).mintFrog("Froggy");

    await zetaFrogNFT.connect(travelManager).addExperience(0, 100);
    const frog = await zetaFrogNFT.getFrog(0);

    expect(frog.xp).to.equal(100n);
    expect(frog.level).to.equal(2n);
  });

  it("rejects addExperience from non-authorized account", async function () {
    await zetaFrogNFT.connect(user).mintFrog("Froggy");

    await expect(
      zetaFrogNFT.connect(user).addExperience(0, 10)
    ).to.be.revertedWith("Caller is not authorized");
  });

  it("increments totalTravels when frog returns to idle", async function () {
    await zetaFrogNFT.connect(user).mintFrog("Froggy");

    await zetaFrogNFT.connect(travelManager).setFrogStatus(0, 1); // Traveling
    await zetaFrogNFT.connect(travelManager).setFrogStatus(0, 0); // Idle

    const frog = await zetaFrogNFT.getFrog(0);
    expect(frog.totalTravels).to.equal(1n);
    expect(frog.status).to.equal(0n);
  });
});
