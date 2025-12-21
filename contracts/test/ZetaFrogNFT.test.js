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

  describe("Random Travel with Zero Address", function () {
    it("Should accept zero address for random travel", async function () {
      await zetaFrogNFT.connect(user).mintFrog("TestFrog");
      const tokenId = 0;
      const zeroAddress = ethers.constants.AddressZero;
      const duration = 3600; // 1 hour
      const targetChainId = 1; // Ethereum mainnet

      await expect(
        zetaFrogNFT.connect(user).startTravel(tokenId, zeroAddress, duration, targetChainId)
      ).to.not.be.reverted;
    });

    it("Should emit TravelStarted event with zero address", async function () {
      await zetaFrogNFT.connect(user).mintFrog("TestFrog");
      const tokenId = 0;
      const zeroAddress = ethers.constants.AddressZero;
      const duration = 3600;
      const targetChainId = 1;

      await expect(
        zetaFrogNFT.connect(user).startTravel(tokenId, zeroAddress, duration, targetChainId)
      )
        .to.emit(zetaFrogNFT, "TravelStarted")
        .withArgs(tokenId, zeroAddress, targetChainId, anyValue, anyValue);
    });

    it("Should update frog status to Traveling", async function () {
      await zetaFrogNFT.connect(user).mintFrog("TestFrog");
      const tokenId = 0;

      await zetaFrogNFT.connect(user).startTravel(
        tokenId,
        ethers.constants.AddressZero,
        3600,
        1
      );

      const frog = await zetaFrogNFT.getFrog(tokenId);
      expect(frog.status).to.equal(1); // 1 = Traveling
    });

    it("Should store zero address in activeTravel", async function () {
      await zetaFrogNFT.connect(user).mintFrog("TestFrog");
      const tokenId = 0;
      const zeroAddress = ethers.constants.AddressZero;
      const duration = 3600;
      const targetChainId = 1;

      await zetaFrogNFT.connect(user).startTravel(tokenId, zeroAddress, duration, targetChainId);

      const activeTravel = await zetaFrogNFT.getActiveTravel(tokenId);
      expect(activeTravel.targetWallet).to.equal(zeroAddress);
      expect(activeTravel.targetChainId).to.equal(targetChainId);
      expect(activeTravel.completed).to.be.false;
    });
  });

  describe("Normal Travel with Valid Address", function () {
    it("Should accept valid non-zero address", async function () {
      await zetaFrogNFT.connect(user).mintFrog("TestFrog");
      const tokenId = 0;
      const validAddress = manager.address;
      const duration = 3600;
      const targetChainId = 1;

      await expect(
        zetaFrogNFT.connect(user).startTravel(tokenId, validAddress, duration, targetChainId)
      ).to.not.be.reverted;
    });
  });

  describe("Travel Validations", function () {
    it("Should reject travel when frog is already traveling", async function () {
      await zetaFrogNFT.connect(user).mintFrog("TestFrog");
      const tokenId = 0;

      // Start first travel
      await zetaFrogNFT.connect(user).startTravel(
        tokenId,
        ethers.constants.AddressZero,
        3600,
        1
      );

      // Try to start second travel
      await expect(
        zetaFrogNFT.connect(user).startTravel(
          tokenId,
          manager.address,
          3600,
          1
        )
      ).to.be.revertedWith("Frog is busy");
    });

    it("Should reject travel with duration too short", async function () {
      await zetaFrogNFT.connect(user).mintFrog("TestFrog");
      const tokenId = 0;

      await expect(
        zetaFrogNFT.connect(user).startTravel(
          tokenId,
          ethers.constants.AddressZero,
          30, // 30 seconds, less than MIN_TRAVEL_DURATION (1 minute)
          1
        )
      ).to.be.revertedWith("Duration too short");
    });

    it("Should reject travel with duration too long", async function () {
      await zetaFrogNFT.connect(user).mintFrog("TestFrog");
      const tokenId = 0;

      const duration = 25 * 60 * 60; // 25 hours, more than MAX (24 hours)
      
      await expect(
        zetaFrogNFT.connect(user).startTravel(
          tokenId,
          ethers.constants.AddressZero,
          duration,
          1
        )
      ).to.be.revertedWith("Duration too long");
    });
  });
});
