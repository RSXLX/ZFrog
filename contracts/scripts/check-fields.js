const { ethers } = require("hardhat");

async function main() {
    const frogNFT = await ethers.getContractAt("ZetaFrogNFT", "0x21C6C9C82C7B2317E2fa25E2cdAa29E45C84fA1f");
    
    console.log("Reading travelContract...");
    try {
        const travel = await frogNFT.travelContract();
        console.log("Travel:", travel);
    } catch (e) {
        console.log("Failed to read travelContract:", e.message);
    }

    console.log("Reading omniTravelContract...");
    try {
        const omni = await frogNFT.omniTravelContract();
        console.log("OmniTravel:", omni);
    } catch (e) {
        console.log("Failed to read omniTravelContract:", e.message);
    }
}

main().catch(console.error);
