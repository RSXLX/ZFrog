const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OmniTravel - Provisions Refund", function () {
  let deployer, user1;
  let zetaFrogNFT, omniTravel;

  const CHAIN_BSC_TESTNET = 97;
  const TEST_PROVISIONS = ethers.parseEther("0.05");
  const TRAVEL_DURATION = 3600;

  beforeEach(async function () {
    [deployer, user1] = await ethers.getSigners();

    const ZetaFrogNFT = await ethers.getContractFactory("ZetaFrogNFT");
    zetaFrogNFT = await ZetaFrogNFT.deploy();
    await zetaFrogNFT.waitForDeployment();

    const OmniTravel = await ethers.getContractFactory("OmniTravel");
    omniTravel = await OmniTravel.deploy(
      await zetaFrogNFT.getAddress(),
      deployer.address
    );
    await omniTravel.waitForDeployment();

    await zetaFrogNFT.setOmniTravelContract(await omniTravel.getAddress());
    await omniTravel.setChainSupport(CHAIN_BSC_TESTNET, true);

    await zetaFrogNFT.connect(user1).mintFrog("TestFrog");
  });

  it("stores provisions net of platform fee when travel starts", async function () {
    const tokenId = await zetaFrogNFT.getTokenIdByOwner(user1.address);
    const fee = (TEST_PROVISIONS * 100n) / 10000n; // default 1%
    const expectedProvisions = TEST_PROVISIONS - fee;

    await expect(
      omniTravel.connect(user1).startCrossChainTravel(
        tokenId,
        CHAIN_BSC_TESTNET,
        TRAVEL_DURATION,
        { value: TEST_PROVISIONS }
      )
    ).to.emit(omniTravel, "CrossChainTravelStarted");

    const travel = await omniTravel.crossChainTravels(tokenId);
    expect(travel.provisions).to.equal(expectedProvisions);
    expect(travel.status).to.equal(1n); // Traveling

    const frog = await zetaFrogNFT.getFrog(tokenId);
    expect(frog.status).to.equal(1n);
  });

  it("refunds remaining provisions and updates frog state on completion", async function () {
    const tokenId = await zetaFrogNFT.getTokenIdByOwner(user1.address);
    const fee = (TEST_PROVISIONS * 100n) / 10000n; // default 1%
    const expectedProvisions = TEST_PROVISIONS - fee;

    await omniTravel.connect(user1).startCrossChainTravel(
      tokenId,
      CHAIN_BSC_TESTNET,
      TRAVEL_DURATION,
      { value: TEST_PROVISIONS }
    );

    const balanceBefore = await ethers.provider.getBalance(user1.address);

    await expect(omniTravel.markTravelCompleted(tokenId, 100))
      .to.emit(omniTravel, "CrossChainTravelCompleted");

    const balanceAfter = await ethers.provider.getBalance(user1.address);
    expect(balanceAfter - balanceBefore).to.equal(expectedProvisions);

    const travel = await omniTravel.crossChainTravels(tokenId);
    expect(travel.status).to.equal(2n); // Completed
    expect(travel.provisions).to.equal(expectedProvisions);

    const frog = await zetaFrogNFT.getFrog(tokenId);
    expect(frog.status).to.equal(0n); // Idle
    expect(frog.xp).to.equal(100n);
    expect(frog.level).to.equal(2n);
  });
});
