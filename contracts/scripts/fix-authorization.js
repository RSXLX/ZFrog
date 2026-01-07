/**
 * 🔧 Fix Contract Authorization & Unlock Frog
 * 
 * This script fixes the authorization chain:
 * 1. Ensures ZetaFrogNFT.travelContract points to Travel contract
 * 2. Ensures Travel.travelManager points to backend relayer
 * 3. Cancels stuck travel
 * 
 * Usage: npx hardhat run scripts/fix-authorization.js --network zetaAthens
 */

const { ethers } = require("hardhat");

const CONTRACTS = {
    ZetaFrogNFT: "0x21C6C9C82C7B2317E2fa25E2cdAa29E45C84fA1f",
    Travel: "0xa2B8FE6dF99C86eE577fD69E27DC8AdA7e619eB0",
    OmniTravel: "0xE36713321E988d237D940A25BAb7Ad509f4f1387",
};

const TOKEN_ID = 0;

async function main() {
    console.log("\n🔧 Fix Contract Authorization & Unlock Frog\n");
    console.log("=".repeat(60));

    const [signer] = await ethers.getSigners();
    console.log(`📍 Signer: ${signer.address}\n`);

    const frogNFT = await ethers.getContractAt("ZetaFrogNFT", CONTRACTS.ZetaFrogNFT);
    const travel = await ethers.getContractAt("Travel", CONTRACTS.Travel);

    // ============ Check Authorization Chain ============
    console.log("📋 STEP 1: Checking Authorization Chain\n");

    // Check ZetaFrogNFT owner
    const frogOwner = await frogNFT.owner();
    console.log(`   ZetaFrogNFT.owner():          ${frogOwner}`);
    console.log(`   Is signer the owner?          ${frogOwner.toLowerCase() === signer.address.toLowerCase() ? '✅ YES' : '❌ NO'}`);

    // Check ZetaFrogNFT.travelContract
    const registeredTravelContract = await frogNFT.travelContract();
    console.log(`\n   ZetaFrogNFT.travelContract():  ${registeredTravelContract}`);
    console.log(`   Expected Travel address:       ${CONTRACTS.Travel}`);
    console.log(`   Match?                         ${registeredTravelContract.toLowerCase() === CONTRACTS.Travel.toLowerCase() ? '✅ YES' : '❌ NO - NEEDS FIX!'}`);

    // Check ZetaFrogNFT.omniTravelContract
    const registeredOmniTravel = await frogNFT.omniTravelContract();
    console.log(`\n   ZetaFrogNFT.omniTravelContract(): ${registeredOmniTravel}`);
    console.log(`   Expected OmniTravel address:      ${CONTRACTS.OmniTravel}`);
    console.log(`   Match?                            ${registeredOmniTravel.toLowerCase() === CONTRACTS.OmniTravel.toLowerCase() ? '✅ YES' : '❌ NO - NEEDS FIX!'}`);

    // Check Travel.travelManager
    const travelManager = await travel.travelManager();
    console.log(`\n   Travel.travelManager():        ${travelManager}`);
    console.log(`   Signer address:                ${signer.address}`);
    console.log(`   Match?                         ${travelManager.toLowerCase() === signer.address.toLowerCase() ? '✅ YES' : '❌ NO - NEEDS FIX!'}`);

    // ============ Fix Authorization if Needed ============
    console.log("\n📋 STEP 2: Fixing Authorization (if needed)\n");

    let fixesMade = false;

    // Fix ZetaFrogNFT.travelContract
    if (registeredTravelContract.toLowerCase() !== CONTRACTS.Travel.toLowerCase()) {
        if (frogOwner.toLowerCase() === signer.address.toLowerCase()) {
            console.log("   Updating ZetaFrogNFT.travelContract...");
            const tx = await frogNFT.setTravelContract(CONTRACTS.Travel);
            await tx.wait();
            console.log("   ✅ ZetaFrogNFT.travelContract updated!");
            fixesMade = true;
        } else {
            console.log("   ❌ Cannot fix: You are not the ZetaFrogNFT owner.");
        }
    }

    // Fix ZetaFrogNFT.omniTravelContract
    if (registeredOmniTravel.toLowerCase() !== CONTRACTS.OmniTravel.toLowerCase()) {
        if (frogOwner.toLowerCase() === signer.address.toLowerCase()) {
            console.log("   Updating ZetaFrogNFT.omniTravelContract...");
            const tx = await frogNFT.setOmniTravelContract(CONTRACTS.OmniTravel);
            await tx.wait();
            console.log("   ✅ ZetaFrogNFT.omniTravelContract updated!");
            fixesMade = true;
        } else {
            console.log("   ❌ Cannot fix: You are not the ZetaFrogNFT owner.");
        }
    }

    // Fix Travel.travelManager
    if (travelManager.toLowerCase() !== signer.address.toLowerCase()) {
        const travelOwner = await travel.owner();
        if (travelOwner.toLowerCase() === signer.address.toLowerCase()) {
            console.log("   Updating Travel.travelManager...");
            const tx = await travel.setTravelManager(signer.address);
            await tx.wait();
            console.log("   ✅ Travel.travelManager updated!");
            fixesMade = true;
        } else {
            console.log(`   ❌ Cannot fix Travel.travelManager: Owner is ${travelOwner}`);
        }
    }

    if (!fixesMade) {
        console.log("   No fixes needed or unable to fix.");
    }

    // ============ Cancel Stuck Travel ============
    console.log("\n📋 STEP 3: Checking Frog Status\n");

    const frogStatus = await frogNFT.getFrogStatus(TOKEN_ID);
    const statusNames = ['Idle', 'Traveling', 'CrossChainLocked'];
    console.log(`   Frog #${TOKEN_ID} Status: ${statusNames[Number(frogStatus)]} (${frogStatus})`);

    if (frogStatus == 0n) {
        console.log("\n   ✅ Frog is already Idle! No unlock needed.");
    } else if (frogStatus == 1n) {
        console.log("\n📋 STEP 4: Attempting to cancel stuck travel...\n");
        
        try {
            const tx = await travel.cancelTravel(TOKEN_ID);
            console.log(`   Transaction: ${tx.hash}`);
            console.log("   Waiting for confirmation...");
            await tx.wait();
            console.log("   ✅ Travel cancelled successfully!");
            
            const newStatus = await frogNFT.getFrogStatus(TOKEN_ID);
            console.log(`   New Status: ${statusNames[Number(newStatus)]}`);
        } catch (error) {
            console.log(`   ❌ Cancel failed: ${error.reason || error.message}`);
            console.log("\n   This might require manual intervention via the contract owner.");
        }
    } else if (frogStatus == 2n) {
        console.log("\n   Frog is CrossChainLocked. Use OmniTravel.emergencyReturn() instead.");
    }

    console.log("\n" + "=".repeat(60));
    console.log("🔧 Script completed!\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
