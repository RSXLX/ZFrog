/**
 * 检查并重置青蛙链上状态
 */
const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("\n🐸 Checking Frog Status");
    console.log("========================");
    
    const NFT_ADDRESS = "0x660A6196A5bf3FbD8aE5EC3eED354A671b8ce04d";
    
    const nft = await hre.ethers.getContractAt([
        "function getFrogStatus(uint256 tokenId) external view returns (uint8)",
        "function setFrogStatus(uint256 tokenId, uint8 status) external",
        "function ownerOf(uint256 tokenId) external view returns (address)"
    ], NFT_ADDRESS);
    
    const tokenIds = [0, 1];
    
    for (const tokenId of tokenIds) {
        try {
            const owner = await nft.ownerOf(tokenId);
            const status = await nft.getFrogStatus(tokenId);
            
            const statusNames = ['Idle', 'Traveling', 'Resting'];
            console.log(`\n   Token ${tokenId}:`);
            console.log(`   Owner: ${owner}`);
            console.log(`   Status: ${status} (${statusNames[Number(status)] || 'Unknown'})`);
            
            // 如果不是 Idle，重置为 Idle
            if (Number(status) !== 0) {
                console.log(`   🔧 Resetting to Idle...`);
                const tx = await nft.setFrogStatus(tokenId, 0);
                await tx.wait();
                console.log(`   ✅ Reset complete`);
            }
        } catch (err) {
            console.log(`   Token ${tokenId}: Error - ${err.message}`);
        }
    }
    
    console.log("\n🎉 Done!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error:", error);
        process.exit(1);
    });
