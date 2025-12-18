const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ZetaFrogNFT V1.1", function () {
  let ZetaFrogNFT, zetaFrogNFT;
  let owner, user, manager;

  beforeEach(async function () {
    [owner, user, manager] = await ethers.getSigners();
    
    ZetaFrogNFT = await ethers.getContractFactory("ZetaFrogNFT");
    zetaFrogNFT = await ZetaFrogNFT.deploy();
    await zetaFrogNFT.setTravelManager(manager.address);
  });

  it("Should mint a frog with initial stats", async function () {
    await zetaFrogNFT.connect(user).mintFrog("Froggy");
    const frog = await zetaFrogNFT.getFrog(0);
    
    expect(frog.name).to.equal("Froggy");
    expect(frog.level).to.equal(1);
    expect(frog.xp).to.equal(0);
  });

  it("Should add XP and level up", async function () {
    await zetaFrogNFT.connect(user).mintFrog("Froggy");
    
    // Add 50 XP (No level up)
    await zetaFrogNFT.connect(manager).addExperience(0, 50);
    let frog = await zetaFrogNFT.getFrog(0);
    expect(frog.xp).to.equal(50);
    expect(frog.level).to.equal(1);

    // Add 60 XP (Total 110, Level Up to 2)
    await expect(zetaFrogNFT.connect(manager).addExperience(0, 60))
      .to.emit(zetaFrogNFT, "LevelUp")
      .withArgs(0, 2, await ethers.provider.getBlock("latest").then(b => b.timestamp + 1)); // Timestamp check is tricky, ignore strict check or use logic

    frog = await zetaFrogNFT.getFrog(0);
    expect(frog.xp).to.equal(110);
    expect(frog.level).to.equal(2);
  });
  
  it("Should only allow manager to add XP", async function () {
    await zetaFrogNFT.connect(user).mintFrog("Froggy");
    await expect(
      zetaFrogNFT.connect(user).addExperience(0, 100)
    ).to.be.revertedWith("Not travel manager");
  });
});
