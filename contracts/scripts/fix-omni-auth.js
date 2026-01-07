/**
 * 🔧 Fix OmniTravel Authorization
 * 
 * Sets the OmniTravel contract address on ZetaFrogNFT to authorize it for cross-chain travel.
 * 
 * Usage: npx hardhat run scripts/fix-omni-auth.js --network zetaAthens
 */

const { ethers } = require("hardhat");

const CONTRACTS = {
    ZetaFrogNFT: "0x21C6C9C82C7B2317E2fa25E2cdAa29E45C84fA1f",
    OmniTravel: "0xE36713321E988d237D940A25BAb7Ad509f4f1387",
};

async function main() {
    console.log("\n🔧 Fix OmniTravel Authorization\n");

    const [signer] = await ethers.getSigners();
    console.log(`Signer: ${signer.address}`);

    const frogNFT = await ethers.getContractAt("ZetaFrogNFT", CONTRACTS.ZetaFrogNFT);

    // Check current value
    const current = await frogNFT.omniTravelContract();
    console.log(`Current OmniTravel Contract: ${current}`);
    console.log(`Expected:                    ${CONTRACTS.OmniTravel}`);

    if (current.toLowerCase() !== CONTRACTS.OmniTravel.toLowerCase()) {
        console.log("\nUpdating OmniTravel Contract address...");
        try {
            const tx = await frogNFT.setOmniTravelContract(CONTRACTS.OmniTravel);
            console.log(`Tx: ${tx.hash}`);
            await tx.wait();
            console.log("✅ Success! OmniTravel is now authorized.");
        } catch (e) {
            console.log(`❌ Failed: ${e.message}`);
        }
    } else {
        console.log("\n✅ Assress is already correct!");
    }
}

main().catch(console.error);
