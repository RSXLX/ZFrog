/**
 * Check canStartCrossChainTravel
 */

const hre = require("hardhat");

const OMNI_TRAVEL = "0x743476f8201885B396329c8AC03b560e1D240666";
const ZETA_FROG_NFT = "0x21C6C9C82C7B2317E2fa25E2cdAa29E45C84fA1f";

async function main() {
    const [signer] = await hre.ethers.getSigners();
    console.log(`\n🔍 Checking canStartCrossChainTravel\n`);

    const omniTravel = await hre.ethers.getContractFactory("OmniTravel").then(f => f.attach(OMNI_TRAVEL));
    
    console.log("Checking for token ID 3...");
    try {
        const canStart = await omniTravel.canStartCrossChainTravel(3);
        console.log(`  canStartCrossChainTravel(3): ${canStart}`);
        
        if (!canStart) {
            console.log("\nIf false, let's debug why:");
            
            const zetaFrog = await hre.ethers.getContractFactory("ZetaFrogNFT").then(f => f.attach(ZETA_FROG_NFT));
            const status = await zetaFrog.getFrogStatus(3);
            console.log(`  1. Frog Status: ${status} (must be 0/Idle)`);
            
            const travel = await omniTravel.crossChainTravels(3);
            console.log(`  2. Travel Status: ${travel.status} (must be 0/None or 5/Completed)`);
        }
    } catch (e) {
        console.log(`  Error calling function: ${e.message}`);
    }
}

main().catch(console.error);
