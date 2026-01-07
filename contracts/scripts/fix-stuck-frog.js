/**
 * 🔧 Fix Stuck Frog - Emergency Unlock Script
 * 
 * This script:
 * 1. Checks current frog status
 * 2. Cancels any stuck travel (if owner)
 * 3. Verifies and fixes travelManager configuration
 * 
 * Usage: npx hardhat run scripts/fix-stuck-frog.js --network zetaAthens
 */

const { ethers } = require("hardhat");

const CONTRACTS = {
    ZetaFrogNFT: "0x21C6C9C82C7B2317E2fa25E2cdAa29E45C84fA1f",
    Travel: "0xa2B8FE6dF99C86eE577fD69E27DC8AdA7e619eB0",
};

const TOKEN_ID = 0; // The stuck frog

async function main() {
    console.log("\n🔧 Fix Stuck Frog - Emergency Unlock Script\n");
    console.log("=".repeat(50));

    const [signer] = await ethers.getSigners();
    console.log(`📍 Signer: ${signer.address}`);

    const frogNFT = await ethers.getContractAt("ZetaFrogNFT", CONTRACTS.ZetaFrogNFT);
    const travel = await ethers.getContractAt("Travel", CONTRACTS.Travel);

    // Step 1: Check current status
    console.log("\n📋 Step 1: Checking current frog status...");
    const statusBefore = await frogNFT.getFrogStatus(TOKEN_ID);
    const statusNames = ['Idle', 'Traveling', 'CrossChainLocked'];
    console.log(`   Current Status: ${statusNames[Number(statusBefore)]} (${statusBefore})`);

    if (statusBefore == 0n) {
        console.log("\n✅ Frog is already Idle! No fix needed.");
        return;
    }

    // Step 2: Check ownership
    console.log("\n📋 Step 2: Checking ownership...");
    const owner = await frogNFT.ownerOf(TOKEN_ID);
    console.log(`   Frog Owner: ${owner}`);
    console.log(`   Signer:     ${signer.address}`);
    
    if (owner.toLowerCase() !== signer.address.toLowerCase()) {
        console.log("\n❌ ERROR: You are not the frog owner!");
        console.log("   Only the frog owner can cancel travel.");
        return;
    }

    // Step 3: Cancel the stuck travel
    console.log("\n📋 Step 3: Canceling stuck travel...");
    try {
        const tx = await travel.cancelTravel(TOKEN_ID);
        console.log(`   Transaction sent: ${tx.hash}`);
        console.log("   Waiting for confirmation...");
        
        const receipt = await tx.wait();
        console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}`);
    } catch (error) {
        console.log(`   ❌ Cancel failed: ${error.message}`);
        
        // If cancel fails, check if it's because travel is already completed
        if (error.message.includes("Not traveling")) {
            console.log("   The frog is not in Traveling status on Travel contract.");
            console.log("   This might be a state mismatch between ZetaFrogNFT and Travel contracts.");
        }
        return;
    }

    // Step 4: Verify fix
    console.log("\n📋 Step 4: Verifying fix...");
    const statusAfter = await frogNFT.getFrogStatus(TOKEN_ID);
    console.log(`   New Status: ${statusNames[Number(statusAfter)]} (${statusAfter})`);

    if (statusAfter == 0n) {
        console.log("\n🎉 SUCCESS! Frog is now Idle and can travel again!");
    } else {
        console.log("\n⚠️  Status did not change. Additional manual intervention may be needed.");
    }

    // Step 5: Check and fix travelManager
    console.log("\n📋 Step 5: Checking travelManager configuration...");
    const travelManager = await travel.travelManager();
    console.log(`   Current travelManager: ${travelManager}`);
    console.log(`   Your address:          ${signer.address}`);
    
    if (travelManager.toLowerCase() !== signer.address.toLowerCase()) {
        console.log("\n⚠️  travelManager does not match your address!");
        console.log("   Backend needs RELAYER_PRIVATE_KEY to match travelManager.");
        
        // Check if signer is owner
        const travelOwner = await travel.owner();
        if (travelOwner.toLowerCase() === signer.address.toLowerCase()) {
            console.log("\n   You are the contract owner. Updating travelManager...");
            const tx = await travel.setTravelManager(signer.address);
            await tx.wait();
            console.log("   ✅ travelManager updated to your address!");
        } else {
            console.log(`\n   Contract owner is: ${travelOwner}`);
            console.log("   Ask the owner to run: travel.setTravelManager(YOUR_ADDRESS)");
        }
    } else {
        console.log("   ✅ travelManager matches your address!");
    }

    console.log("\n" + "=".repeat(50));
    console.log("🔧 Fix script completed!\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
