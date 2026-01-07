/**
 * Test setFrogStatus permission
 */

const hre = require("hardhat");

const OMNI_TRAVEL = "0x4366FDd3a1BFe4aa7AC8042a6760cB6fEf0d0837";
const ZETA_FROG_NFT = "0x21C6C9C82C7B2317E2fa25E2cdAa29E45C84fA1f";

async function main() {
    const [signer] = await hre.ethers.getSigners();
    console.log(`\n🔍 Testing setFrogStatus permission\n`);

    const ZetaFrogNFT = await hre.ethers.getContractFactory("ZetaFrogNFT");
    const zetaFrog = ZetaFrogNFT.attach(ZETA_FROG_NFT);

    // Check travelContract
    const travelContract = await zetaFrog.travelContract();
    console.log(`travelContract: ${travelContract}`);
    console.log(`OmniTravel: ${OMNI_TRAVEL}`);
    console.log(`Match: ${travelContract.toLowerCase() === OMNI_TRAVEL.toLowerCase() ? "✅" : "❌"}`);

    // Try to call setFrogStatus directly (should fail - only travel contract can)
    console.log("\nTrying to call setFrogStatus from signer (should fail)...");
    try {
        await zetaFrog.setFrogStatus(3, 2); // 2 = CrossChainLocked
        console.log("Unexpectedly succeeded!");
    } catch (e) {
        console.log(`Expected failure: ${e.message.slice(0, 100)}`);
    }

    // Check if there's an omniTravelContract setter
    console.log("\nChecking for omniTravelContract...");
    try {
        const omniTravel = await zetaFrog.omniTravelContract();
        console.log(`omniTravelContract: ${omniTravel}`);
    } catch (e) {
        console.log("omniTravelContract() not found - using travelContract only");
    }

    // Check contract's setFrogStatus modifier
    console.log("\nChecking ZetaFrogNFT modifiers...");
    console.log("If setFrogStatus has 'onlyTravelManager' modifier, it should check:");
    console.log("  - msg.sender == travelContract");
    console.log("  - OR msg.sender == omniTravelContract (if exists)");
}

main().catch(console.error);
