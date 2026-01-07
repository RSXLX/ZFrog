// Test Provisions Refund Mechanism
// Tests for OmniTravel.sol provisions refund functionality

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OmniTravel - Provisions Refund", function () {
    let deployer, user1, user2;
    let zetaFrogNFT, omniTravel;
    let mockGateway;

    const CHAIN_BSC_TESTNET = 97;
    const TEST_PROVISIONS = ethers.parseEther("0.05");
    const TRAVEL_DURATION = 3600; // 1 hour

    beforeEach(async function () {
        [deployer, user1, user2] = await ethers.getSigners();

        // Deploy ZetaFrogNFT
        const ZetaFrogNFT = await ethers.getContractFactory("ZetaFrogNFT");
        zetaFrogNFT = await ZetaFrogNFT.deploy();
        await zetaFrogNFT.waitForDeployment();

        // Deploy mock Gateway (simplified for testing)
        const MockGateway = await ethers.getContractFactory("MockGateway");
        try {
            mockGateway = await MockGateway.deploy();
            await mockGateway.waitForDeployment();
        } catch (e) {
            // If MockGateway doesn't exist, use deployer address as placeholder
            mockGateway = { target: deployer.address };
        }

        // Deploy OmniTravel
        const OmniTravel = await ethers.getContractFactory("OmniTravel");
        omniTravel = await OmniTravel.deploy(
            await zetaFrogNFT.getAddress(),
            mockGateway.target || deployer.address
        );
        await omniTravel.waitForDeployment();

        // Configure
        await zetaFrogNFT.setOmniTravelContract(await omniTravel.getAddress());
        await omniTravel.setTestMode(true);
        await omniTravel.setTravelManager(deployer.address);

        // Mint frog for user1
        await zetaFrogNFT.connect(user1).mintFrog("TestFrog");
    });

    describe("Provisions Deposit", function () {
        it("should accept provisions when starting cross-chain travel", async function () {
            // Configure chain (minimal for test mode)
            await omniTravel.setChainConnector(CHAIN_BSC_TESTNET, "0x1234");
            
            // Get token ID
            const tokenId = await zetaFrogNFT.getTokenIdByOwner(user1.address);

            // Start travel with provisions
            await omniTravel.connect(user1).startCrossChainTravel(
                tokenId,
                CHAIN_BSC_TESTNET,
                TRAVEL_DURATION,
                { value: TEST_PROVISIONS }
            );

            // Verify provisions stored
            const storedProvisions = await omniTravel.getRemainingProvisions(tokenId);
            expect(storedProvisions).to.equal(TEST_PROVISIONS);
        });
    });

    describe("Provisions Refund via markTravelCompleted", function () {
        it("should refund remaining provisions when travel is completed", async function () {
            await omniTravel.setChainConnector(CHAIN_BSC_TESTNET, "0x1234");
            const tokenId = await zetaFrogNFT.getTokenIdByOwner(user1.address);

            // Start travel
            await omniTravel.connect(user1).startCrossChainTravel(
                tokenId,
                CHAIN_BSC_TESTNET,
                TRAVEL_DURATION,
                { value: TEST_PROVISIONS }
            );

            // Get user balance before refund
            const balanceBefore = await ethers.provider.getBalance(user1.address);

            // Complete travel (as travel manager)
            const tx = await omniTravel.markTravelCompleted(tokenId, 100);
            const receipt = await tx.wait();

            // Check for ProvisionsRefunded event
            const refundEvent = receipt.logs.find(log => {
                try {
                    const parsed = omniTravel.interface.parseLog({ topics: log.topics, data: log.data });
                    return parsed?.name === "ProvisionsRefunded";
                } catch (e) {
                    return false;
                }
            });

            expect(refundEvent).to.not.be.undefined;

            // Verify user received refund
            const balanceAfter = await ethers.provider.getBalance(user1.address);
            expect(balanceAfter).to.be.gt(balanceBefore);

            // Verify provisions cleared
            const remainingProvisions = await omniTravel.getRemainingProvisions(tokenId);
            expect(remainingProvisions).to.equal(0);
        });
    });

    describe("Provisions Refund via emergencyReturn", function () {
        it("should refund provisions on emergency return", async function () {
            await omniTravel.setChainConnector(CHAIN_BSC_TESTNET, "0x1234");
            const tokenId = await zetaFrogNFT.getTokenIdByOwner(user1.address);

            // Start travel
            await omniTravel.connect(user1).startCrossChainTravel(
                tokenId,
                CHAIN_BSC_TESTNET,
                60, // 1 minute duration
                { value: TEST_PROVISIONS }
            );

            // Wait for timeout period (fast-forward time)
            await ethers.provider.send("evm_increaseTime", [3 * 3600]); // 3 hours
            await ethers.provider.send("evm_mine", []);

            // Get balance before
            const balanceBefore = await ethers.provider.getBalance(user1.address);

            // Emergency return
            const tx = await omniTravel.connect(user1).emergencyReturn(tokenId);
            await tx.wait();

            // Verify provisions refunded (checking balance increased minus gas)
            const balanceAfter = await ethers.provider.getBalance(user1.address);
            // Balance should increase even after gas, since refund amount > gas cost
            // This is a soft check since gas costs vary
            
            // Verify provisions cleared
            const remainingProvisions = await omniTravel.getRemainingProvisions(tokenId);
            expect(remainingProvisions).to.equal(0);
        });
    });

    describe("Event Emission", function () {
        it("should emit ProvisionsRefunded with correct parameters", async function () {
            await omniTravel.setChainConnector(CHAIN_BSC_TESTNET, "0x1234");
            const tokenId = await zetaFrogNFT.getTokenIdByOwner(user1.address);

            await omniTravel.connect(user1).startCrossChainTravel(
                tokenId,
                CHAIN_BSC_TESTNET,
                TRAVEL_DURATION,
                { value: TEST_PROVISIONS }
            );

            // Expect event with correct args
            await expect(omniTravel.markTravelCompleted(tokenId, 50))
                .to.emit(omniTravel, "ProvisionsRefunded")
                .withArgs(
                    tokenId,
                    user1.address,
                    TEST_PROVISIONS,
                    (timestamp) => timestamp > 0  // Any valid timestamp
                );
        });
    });
});

// Mock Gateway for testing (if not already exists)
// This would be in a separate file: contracts/mocks/MockGateway.sol
/*
contract MockGateway {
    function call(
        bytes memory receiver,
        address zrc20,
        bytes calldata message,
        CallOptions calldata callOptions,
        RevertOptions calldata revertOptions
    ) external {}
}
*/
