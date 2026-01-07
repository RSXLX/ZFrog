/**
 * 🐸 ZetaFrog Travel System - Comprehensive Test Script
 * 
 * Tests the entire travel flow to diagnose state synchronization issues.
 * 
 * Usage: npx hardhat run scripts/test-travel-flow.js --network zetaAthens
 */

const { ethers } = require("hardhat");

// Contract addresses (update these if needed)
const CONTRACTS = {
    ZetaFrogNFT: "0x21C6C9C82C7B2317E2fa25E2cdAa29E45C84fA1f",
    Travel: "0xa2B8FE6dF99C86eE577fD69E27DC8AdA7e619eB0",
    OmniTravel: "0xE36713321E988d237D940A25BAb7Ad509f4f1387",
};

async function main() {
    console.log("\n🐸 ZetaFrog Travel System - Comprehensive Diagnosis\n");
    console.log("=".repeat(60));

    const [signer] = await ethers.getSigners();
    console.log(`📍 Signer Address: ${signer.address}`);
    console.log(`📍 Network: ${(await ethers.provider.getNetwork()).name} (chainId: ${(await ethers.provider.getNetwork()).chainId})`);

    // Get contract instances
    const frogNFT = await ethers.getContractAt("ZetaFrogNFT", CONTRACTS.ZetaFrogNFT);
    const travel = await ethers.getContractAt("Travel", CONTRACTS.Travel);
    const omniTravel = await ethers.getContractAt("OmniTravel", CONTRACTS.OmniTravel);

    console.log("\n📋 Contract Addresses:");
    console.log(`   ZetaFrogNFT: ${CONTRACTS.ZetaFrogNFT}`);
    console.log(`   Travel:      ${CONTRACTS.Travel}`);
    console.log(`   OmniTravel:  ${CONTRACTS.OmniTravel}`);

    // ============ Check Contract Configuration ============
    console.log("\n" + "=".repeat(60));
    console.log("🔧 CHECKING CONTRACT CONFIGURATION\n");

    // Check ZetaFrogNFT authorized contracts
    try {
        const authorizedTravelContract = await frogNFT.travelContract();
        const authorizedOmniTravelContract = await frogNFT.omniTravelContract();
        
        console.log(`✅ ZetaFrogNFT.travelContract:     ${authorizedTravelContract}`);
        console.log(`   Expected:                        ${CONTRACTS.Travel}`);
        console.log(`   Match: ${authorizedTravelContract.toLowerCase() === CONTRACTS.Travel.toLowerCase() ? '✅ YES' : '❌ NO - NEED TO UPDATE!'}`);
        
        console.log(`\n✅ ZetaFrogNFT.omniTravelContract: ${authorizedOmniTravelContract}`);
        console.log(`   Expected:                        ${CONTRACTS.OmniTravel}`);
        console.log(`   Match: ${authorizedOmniTravelContract.toLowerCase() === CONTRACTS.OmniTravel.toLowerCase() ? '✅ YES' : '❌ NO - NEED TO UPDATE!'}`);
    } catch (err) {
        console.log(`❌ Failed to read ZetaFrogNFT config: ${err.message}`);
    }

    // Check Travel contract's travelManager
    try {
        const travelManager = await travel.travelManager();
        console.log(`\n✅ Travel.travelManager: ${travelManager}`);
        console.log(`   (Backend private key must match this address to call completeTravel)`);
    } catch (err) {
        console.log(`❌ Failed to read Travel.travelManager: ${err.message}`);
    }

    // Check OmniTravel config
    try {
        const owner = await omniTravel.owner();
        console.log(`\n✅ OmniTravel.owner: ${owner}`);
    } catch (err) {
        console.log(`❌ Failed to read OmniTravel config: ${err.message}`);
    }

    // ============ Check Frog #0 Status ============
    console.log("\n" + "=".repeat(60));
    console.log("🐸 CHECKING FROG #0 STATUS\n");

    const tokenId = 0;

    try {
        // Get frog data
        const frogData = await frogNFT.getFrog(tokenId);
        const frogStatus = await frogNFT.getFrogStatus(tokenId);
        const frogOwner = await frogNFT.ownerOf(tokenId);

        const statusNames = ['Idle', 'Traveling', 'CrossChainLocked'];
        
        console.log(`📊 Frog #${tokenId} On-Chain State:`);
        console.log(`   Owner:     ${frogOwner}`);
        console.log(`   Name:      ${frogData[0]}`);
        console.log(`   Status:    ${statusNames[Number(frogStatus)]} (${frogStatus})`);
        console.log(`   Travels:   ${frogData[2]}`);
        console.log(`   XP:        ${frogData[4]}`);
        console.log(`   Level:     ${frogData[5]}`);
    } catch (err) {
        console.log(`❌ Failed to get frog data: ${err.message}`);
    }

    // ============ Check Travel Contract State ============
    console.log("\n" + "=".repeat(60));
    console.log("🧳 CHECKING TRAVEL CONTRACT STATE (Local Travel)\n");

    try {
        const activeTravel = await travel.getActiveTravel(tokenId);
        const [startTime, endTime, targetWallet, targetChainId, completed, isRandom] = activeTravel;
        
        console.log(`📊 Travel.activeTravels[${tokenId}]:`);
        console.log(`   startTime:     ${startTime} (${startTime > 0 ? new Date(Number(startTime) * 1000).toISOString() : 'N/A'})`);
        console.log(`   endTime:       ${endTime} (${endTime > 0 ? new Date(Number(endTime) * 1000).toISOString() : 'N/A'})`);
        console.log(`   targetWallet:  ${targetWallet}`);
        console.log(`   targetChainId: ${targetChainId}`);
        console.log(`   completed:     ${completed}`);
        console.log(`   isRandom:      ${isRandom}`);

        if (startTime > 0 && !completed) {
            const now = Math.floor(Date.now() / 1000);
            if (now >= Number(endTime)) {
                console.log(`\n⚠️  ISSUE DETECTED: Travel has ended (endTime passed) but not marked completed!`);
                console.log(`   This means backend failed to call Travel.completeTravel()`);
            } else {
                console.log(`\n⏳ Travel is still in progress (ends in ${Number(endTime) - now} seconds)`);
            }
        } else if (completed) {
            console.log(`\n✅ Travel session is marked as completed`);
        } else {
            console.log(`\n📭 No active travel session found in Travel contract`);
        }
    } catch (err) {
        console.log(`❌ Failed to get active travel: ${err.message}`);
    }

    // ============ Check OmniTravel Contract State ============
    console.log("\n" + "=".repeat(60));
    console.log("🌉 CHECKING OMNITRAVEL CONTRACT STATE (Cross-Chain Travel)\n");

    try {
        const canStart = await omniTravel.canStartCrossChainTravel(tokenId);
        console.log(`🔍 canStartCrossChainTravel(${tokenId}): ${canStart}`);

        const crossChainData = await omniTravel.getCrossChainTravel(tokenId);
        const [owner, targetChainId, messageId, startTime, maxDuration, status] = crossChainData;
        
        const statusNames = ['LOCKING', 'LOCKED', 'CROSSING_OUT', 'ON_TARGET_CHAIN', 'CROSSING_BACK', 'COMPLETED', 'FAILED', 'TIMEOUT'];
        
        console.log(`\n📊 OmniTravel.crossChainTravels[${tokenId}]:`);
        console.log(`   owner:       ${owner}`);
        console.log(`   targetChain: ${targetChainId}`);
        console.log(`   messageId:   ${messageId}`);
        console.log(`   startTime:   ${startTime}`);
        console.log(`   maxDuration: ${maxDuration}`);
        console.log(`   status:      ${statusNames[Number(status)] || 'Unknown'} (${status})`);

        if (owner === '0x0000000000000000000000000000000000000000') {
            console.log(`\n📭 No cross-chain travel record found`);
        }
    } catch (err) {
        console.log(`❌ Failed to get cross-chain travel: ${err.message}`);
    }

    // ============ Diagnosis Summary ============
    console.log("\n" + "=".repeat(60));
    console.log("📋 DIAGNOSIS SUMMARY\n");

    const frogStatus = await frogNFT.getFrogStatus(tokenId);
    const statusNum = Number(frogStatus);
    
    if (statusNum === 0) {
        console.log("✅ Frog is IDLE - No issues detected!");
    } else if (statusNum === 1) {
        // Traveling status
        const activeTravel = await travel.getActiveTravel(tokenId);
        const [startTime, , , , completed] = activeTravel;
        
        if (startTime > 0 && !completed) {
            console.log("⚠️  ISSUE: Frog stuck in TRAVELING state (Local Travel)");
            console.log("   ROOT CAUSE: Backend failed to call Travel.completeTravel()");
            console.log("   POSSIBLE REASONS:");
            console.log("     1. Backend travelManager address doesn't match Travel.travelManager");
            console.log("     2. Backend PRIVATE_KEY not configured correctly");
            console.log("     3. travelProcessor worker stopped or crashed");
            console.log("\n   FIX OPTIONS:");
            console.log("     Option A: Call travel.cancelTravel(0) as frog owner");
            console.log("     Option B: Fix backend config and restart, then call completeTravel manually");
        } else {
            console.log("⚠️  ISSUE: Frog marked as TRAVELING but no active travel session");
            console.log("   This is a state inconsistency. Use cancelTravel to fix.");
        }
    } else if (statusNum === 2) {
        console.log("⚠️  ISSUE: Frog stuck in CROSSCHAINLOCKED state");
        console.log("   ROOT CAUSE: Cross-chain travel not completed properly");
        console.log("   FIX: Call omniTravel.markTravelCompleted() or emergencyReturn()");
    }

    // ============ Suggested Fixes ============
    console.log("\n" + "=".repeat(60));
    console.log("🔧 SUGGESTED FIX COMMANDS\n");

    if (statusNum === 1) {
        console.log("// Fix stuck local travel (run in hardhat console):");
        console.log(`const travel = await ethers.getContractAt("Travel", "${CONTRACTS.Travel}")`);
        console.log(`await travel.cancelTravel(${tokenId})`);
    } else if (statusNum === 2) {
        console.log("// Fix stuck cross-chain travel (run in hardhat console):");
        console.log(`const omni = await ethers.getContractAt("OmniTravel", "${CONTRACTS.OmniTravel}")`);
        console.log(`await omni.emergencyReturn(${tokenId})`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("🔍 Test completed!\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
