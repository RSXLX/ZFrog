/**
 * 更新 NFT 合约的 omniTravelContract 地址
 */
const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("\n⚙️ Updating NFT's OmniTravel Contract");
    console.log("======================================");
    console.log(`Deployer: ${deployer.address}`);
    
    const NFT_ADDRESS = "0x660A6196A5bf3FbD8aE5EC3eED354A671b8ce04d";
    const NEW_OMNI_ADDRESS = "0x20A08bc1deFC1be2273636Af3ba3ef8cA6EaD2C8";
    
    const nft = await hre.ethers.getContractAt([
        "function setOmniTravelContract(address _omniTravel) external",
        "function omniTravelContract() external view returns (address)",
        "function owner() external view returns (address)"
    ], NFT_ADDRESS);
    
    console.log(`\n📋 Current Config:`);
    const currentOmni = await nft.omniTravelContract();
    console.log(`   omniTravelContract: ${currentOmni}`);
    console.log(`   Target: ${NEW_OMNI_ADDRESS}`);
    
    if (currentOmni.toLowerCase() === NEW_OMNI_ADDRESS.toLowerCase()) {
        console.log(`\n✅ Already correct! No changes needed.`);
    } else {
        console.log(`\n🔧 Updating omniTravelContract...`);
        const tx = await nft.setOmniTravelContract(NEW_OMNI_ADDRESS);
        await tx.wait();
        console.log(`   ✅ Done! TX: ${tx.hash}`);
        
        // Verify
        const newValue = await nft.omniTravelContract();
        console.log(`\n📋 New Config:`);
        console.log(`   omniTravelContract: ${newValue}`);
    }
    
    console.log("\n🎉 Complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error:", error);
        process.exit(1);
    });
