/**
 * 🔧 Quick Fix - Set Travel Contract and Unlock Frog
 * 
 * Usage: npx hardhat run scripts/quick-fix.js --network zetaAthens
 */

const { ethers } = require("hardhat");

const CONTRACTS = {
    ZetaFrogNFT: "0x21C6C9C82C7B2317E2fa25E2cdAa29E45C84fA1f",
    Travel: "0xa2B8FE6dF99C86eE577fD69E27DC8AdA7e619eB0",
};

async function main() {
    console.log("\n🔧 Quick Fix Script\n");

    const [signer] = await ethers.getSigners();
    console.log(`Signer: ${signer.address}`);

    const frogNFT = await ethers.getContractAt("ZetaFrogNFT", CONTRACTS.ZetaFrogNFT);
    const travel = await ethers.getContractAt("Travel", CONTRACTS.Travel);

    // Step 1: Set Travel Contract on ZetaFrogNFT
    console.log("\n1. Setting travelContract on ZetaFrogNFT...");
    try {
        const tx1 = await frogNFT.setTravelContract(CONTRACTS.Travel);
        console.log(`   Tx: ${tx1.hash}`);
        await tx1.wait();
        console.log("   ✅ Done!");
    } catch (e) {
        console.log(`   Error: ${e.reason || e.message}`);
    }

    // Step 2: Set Travel Manager
    console.log("\n2. Setting travelManager on Travel...");
    try {
        const tx2 = await travel.setTravelManager(signer.address);
        console.log(`   Tx: ${tx2.hash}`);
        await tx2.wait();
        console.log("   ✅ Done!");
    } catch (e) {
        console.log(`   Error: ${e.reason || e.message}`);
    }

    // Step 3: Check frog status
    console.log("\n3. Checking frog status...");
    const status = await frogNFT.getFrogStatus(0);
    console.log(`   Status: ${status} (0=Idle, 1=Traveling)`);

    // Step 4: Cancel travel if needed
    if (status == 1n) {
        console.log("\n4. Canceling stuck travel...");
        try {
            const tx3 = await travel.cancelTravel(0);
            console.log(`   Tx: ${tx3.hash}`);
            await tx3.wait();
            console.log("   ✅ Travel cancelled!");
            
            const newStatus = await frogNFT.getFrogStatus(0);
            console.log(`   New status: ${newStatus}`);
        } catch (e) {
            console.log(`   Error: ${e.reason || e.message}`);
        }
    } else {
        console.log("\n4. Frog is already Idle, no cancel needed.");
    }

    console.log("\n🎉 Done!\n");
}

main().catch(console.error);
