/**
 * Check Travel Contract Configuration
 */

const { ethers } = require("hardhat");

async function main() {
    const NEW_NFT_PROXY = "0x0721CDff3291a1Dd2af28633B5dEE5427553F09E";
    
    const ZetaFrogNFT = await ethers.getContractFactory("ZetaFrogNFTUpgradeable");
    const nft = ZetaFrogNFT.attach(NEW_NFT_PROXY);
    
    console.log("ZetaFrogNFT:", NEW_NFT_PROXY);
    console.log("");
    
    const travelContract = await nft.travelContract();
    const omniTravelContract = await nft.omniTravelContract();
    
    console.log("travelContract:", travelContract);
    console.log("omniTravelContract:", omniTravelContract);
    
    if (travelContract === "0x0000000000000000000000000000000000000000") {
        console.log("\n⚠️ Travel contract NOT set!");
        console.log("   Normal travel will not work.");
    } else {
        console.log("\n✅ Travel contract is set");
    }
}

main().catch(console.error);
