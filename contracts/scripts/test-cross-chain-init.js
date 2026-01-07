/**
 * 🌉 Test Cross-Chain Travel Initiation
 * 
 * This script simulates the frontend flow:
 * 1. Approve OmniTravel
 * 2. Start Cross-Chain Travel
 * 
 * Usage: npx hardhat run scripts/test-cross-chain-init.js --network zetaAthens
 */

const { ethers } = require("hardhat");

const CONTRACTS = {
    ZetaFrogNFT: "0x21C6C9C82C7B2317E2fa25E2cdAa29E45C84fA1f",
    OmniTravel: "0xE36713321E988d237D940A25BAb7Ad509f4f1387",
};

const TOKEN_ID = 0;
const TARGET_CHAIN_ID = 97; // BSC Testnet
const DURATION = 60; // 1 minute (test)

async function main() {
    console.log("\n🌉 Test Cross-Chain Travel Initiation\n");
    console.log("=".repeat(60));

    const [signer] = await ethers.getSigners();
    console.log(`📍 Signer: ${signer.address}`);

    const frogNFT = await ethers.getContractAt("ZetaFrogNFT", CONTRACTS.ZetaFrogNFT);
    const omniTravel = await ethers.getContractAt("OmniTravel", CONTRACTS.OmniTravel);

    // Step 1: Check Eligibility
    console.log("\n📋 Step 1: Checking Eligibility...");
    const canStart = await omniTravel.canStartCrossChainTravel(TOKEN_ID);
    console.log(`   canStart: ${canStart}`);

    if (!canStart) {
        console.log("❌ Frog is not eligible for cross-chain travel. Check status.");
        const status = await frogNFT.getFrogStatus(TOKEN_ID);
        console.log(`   Current Status: ${status} (Should be 0=Idle)`);
        return;
    }

    // Step 2: Approve OmniTravel
    console.log("\n📋 Step 2: Checking Approval...");
    const isApproved = await frogNFT.isApprovedForAll(signer.address, CONTRACTS.OmniTravel);
    console.log(`   isApprovedForAll: ${isApproved}`);

    if (!isApproved) {
        console.log("   Approving OmniTravel...");
        const tx = await frogNFT.setApprovalForAll(CONTRACTS.OmniTravel, true);
        await tx.wait();
        console.log("   ✅ Approved!");
    } else {
        console.log("   ✅ Already approved.");
    }

    // Step 3: Start Travel
    console.log("\n📋 Step 3: Starting Cross-Chain Travel...");
    console.log(`   Token ID:      ${TOKEN_ID}`);
    console.log(`   Target Chain:  ${TARGET_CHAIN_ID}`);
    console.log(`   Duration:      ${DURATION}s`);

    const provisions = ethers.parseEther("0.01"); // 0.01 ZETA
    console.log(`   Value:         ${ethers.formatEther(provisions)} ZETA`);

    try {
        const tx = await omniTravel.startCrossChainTravel(
            TOKEN_ID,
            TARGET_CHAIN_ID,
            DURATION,
            { value: provisions }
        );
        console.log(`   Transaction: ${tx.hash}`);
        console.log("   Waiting for confirmation...");
        
        const receipt = await tx.wait();
        console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}`);
        
        // Find expected event log
        // Note: Event signature might need manual checking if artifacts aren't perfect
        console.log("   Logs:", receipt.logs.length);
        
    } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
        if (error.data) {
             console.log(`   Error Data: ${error.data}`);
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log("🌉 Test completed!\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
