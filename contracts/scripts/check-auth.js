const { ethers } = require("hardhat");

async function main() {
    const frogNFT = await ethers.getContractAt("ZetaFrogNFT", "0x21C6C9C82C7B2317E2fa25E2cdAa29E45C84fA1f");
    const omni = await frogNFT.omniTravelContract();
    const travel = await frogNFT.travelContract();
    
    console.log("OmniTravel:", omni);
    console.log("Travel:", travel);
    console.log("Correct Omni?", omni === "0xE36713321E988d237D940A25BAb7Ad509f4f1387");
}

main().catch(console.error);
