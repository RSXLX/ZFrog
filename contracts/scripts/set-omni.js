/**
 * Try to set omniTravelContract
 */

const hre = require("hardhat");

const OMNI_TRAVEL = "0x4366FDd3a1BFe4aa7AC8042a6760cB6fEf0d0837";
const ZETA_FROG_NFT = "0x21C6C9C82C7B2317E2fa25E2cdAa29E45C84fA1f";

async function main() {
    const [signer] = await hre.ethers.getSigners();
    console.log(`\n🔍 Setting omniTravelContract\n`);

    const ZetaFrogNFT = await hre.ethers.getContractFactory("ZetaFrogNFT");
    const zetaFrog = ZetaFrogNFT.attach(ZETA_FROG_NFT);

    // Check current values
    console.log("Current values:");
    try {
        const tc = await zetaFrog.travelContract();
        console.log(`  travelContract: ${tc}`);
    } catch (e) {
        console.log("  travelContract: error - " + e.message.slice(0, 50));
    }

    try {
        const otc = await zetaFrog.omniTravelContract();
        console.log(`  omniTravelContract: ${otc}`);
    } catch (e) {
        console.log("  omniTravelContract: NOT PRESENT (old contract version)");
        console.log("  This means the deployed contract only has travelContract slot");
        console.log("\n  Solution: Use travelContract for OmniTravel (already done)");
        console.log("  The modifier checks BOTH, so if travelContract == OmniTravel, it should work!");
        return;
    }

    // Try to set omniTravelContract
    console.log("\nSetting omniTravelContract...");
    try {
        const tx = await zetaFrog.setOmniTravelContract(OMNI_TRAVEL);
        await tx.wait();
        console.log("✅ omniTravelContract set successfully!");
        
        // Verify
        const otc = await zetaFrog.omniTravelContract();
        console.log(`  New omniTravelContract: ${otc}`);
    } catch (e) {
        console.log(`❌ Failed: ${e.message.slice(0, 100)}`);
    }
}

main().catch(console.error);
