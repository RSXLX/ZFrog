/**
 * Check if ZetaFrogNFT has emergencyResetFrogStatus
 * 
 * Usage:
 *   npx hardhat run scripts/check-nft-functions.js --network zetaAthens
 */

const { ethers, network } = require("hardhat");

async function main() {
    console.log("========================================");
    console.log("Check ZetaFrogNFT Functions");
    console.log("========================================");
    console.log("Network:", network.name);

    const ZETAFROG_NFT = "0x76e7baA23fce77DA7Edbea58D8B888128D47A1Ff";
    
    const ZetaFrogNFT = await ethers.getContractFactory("ZetaFrogNFT");
    const zetaFrogNFT = ZetaFrogNFT.attach(ZETAFROG_NFT);
    
    // Try to call emergencyResetFrogStatus
    console.log("\nChecking for emergencyResetFrogStatus...");
    try {
        // This will fail if the function doesn't exist
        const hasFunction = zetaFrogNFT.interface.getFunction("emergencyResetFrogStatus");
        console.log("✅ Function exists in new ABI");
        
        // Try to call it (will revert if not on chain)
        console.log("\nTrying to call on contract...");
        const tx = await zetaFrogNFT.emergencyResetFrogStatus.staticCall(0);
        console.log("✅ Function exists on deployed contract");
    } catch (e) {
        if (e.message.includes("no matching function")) {
            console.log("❌ Function not found in ABI");
        } else if (e.message.includes("execution reverted")) {
            console.log("❌ Function not found on deployed contract (need to redeploy)");
            console.log("   Error:", e.message.substring(0, 200));
        } else {
            console.log("❓ Unknown error:", e.message.substring(0, 200));
        }
    }
    
    // Check frog 0 status
    console.log("\nChecking Frog 0 status...");
    try {
        const frog = await zetaFrogNFT.getFrog(0);
        const statusNames = ["Idle", "Traveling", "CrossChainLocked"];
        console.log(`Frog 0: ${frog.name}`);
        console.log(`Status: ${statusNames[frog.status]} (${frog.status})`);
        console.log(`Level: ${frog.level}, XP: ${frog.xp}`);
    } catch (e) {
        console.log("Error:", e.message);
    }
    
    // Check OmniTravel contract setting
    console.log("\nChecking OmniTravel contract setting...");
    try {
        const omniTravelAddr = await zetaFrogNFT.omniTravelContract();
        console.log("Current OmniTravel:", omniTravelAddr);
    } catch (e) {
        console.log("Error:", e.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
