/**
 * 诊断脚本：检查 OmniTravel 合约状态
 */
const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("\n🔍 Diagnosing OmniTravel Contract");
    console.log("===================================");
    
    const OMNI_ADDRESS = "0x20A08bc1deFC1be2273636Af3ba3ef8cA6EaD2C8";
    const NFT_ADDRESS = "0x660A6196A5bf3FbD8aE5EC3eED354A671b8ce04d";
    
    const omniTravel = await hre.ethers.getContractAt([
        "function supportedChains(uint256 chainId) external view returns (bool)",
        "function chainConnectors(uint256 chainId) external view returns (bytes memory)",
        "function getSupportedChains() external view returns (uint256[] memory)",
        "function calculateGroupProvisions(uint256 durationHours) external view returns (uint256)",
        "function canStartCrossChainTravel(uint256 tokenId) external view returns (bool)",
        "function testMode() external view returns (bool)",
        "function owner() external view returns (address)"
    ], OMNI_ADDRESS);
    
    const nft = await hre.ethers.getContractAt([
        "function ownerOf(uint256 tokenId) external view returns (address)",
        "function getFrogStatus(uint256 tokenId) external view returns (uint8)",
        "function omniTravelContract() external view returns (address)"
    ], NFT_ADDRESS);
    
    console.log("\n📋 Contract Info:");
    console.log(`   OmniTravel: ${OMNI_ADDRESS}`);
    console.log(`   NFT: ${NFT_ADDRESS}`);
    console.log(`   Owner: ${await omniTravel.owner()}`);
    console.log(`   Test Mode: ${await omniTravel.testMode()}`);
    
    // Check NFT's omniTravelContract setting
    const omniInNft = await nft.omniTravelContract();
    console.log(`\n📋 NFT Config:`);
    console.log(`   omniTravelContract: ${omniInNft}`);
    console.log(`   Match: ${omniInNft.toLowerCase() === OMNI_ADDRESS.toLowerCase() ? '✅' : '❌'}`);
    
    // Check supported chains
    console.log("\n📋 Supported Chains:");
    const chains = [97, 11155111, 7001];
    for (const chainId of chains) {
        const supported = await omniTravel.supportedChains(chainId);
        let connector = '';
        try {
            connector = await omniTravel.chainConnectors(chainId);
            connector = connector.length > 2 ? `${connector.slice(0, 20)}...` : 'NOT SET';
        } catch (e) {
            connector = 'Error';
        }
        console.log(`   Chain ${chainId}: ${supported ? '✅ Supported' : '❌ Not Supported'}, Connector: ${connector}`);
    }
    
    // Try getSupportedChains
    try {
        const supportedList = await omniTravel.getSupportedChains();
        console.log(`   getSupportedChains: [${supportedList.join(', ')}]`);
    } catch (e) {
        console.log(`   getSupportedChains: Error - ${e.message}`);
    }
    
    // Check frog status
    console.log("\n📋 Frog Status:");
    const tokenIds = [0, 1];
    for (const tokenId of tokenIds) {
        try {
            const owner = await nft.ownerOf(tokenId);
            const status = await nft.getFrogStatus(tokenId);
            const canTravel = await omniTravel.canStartCrossChainTravel(tokenId);
            const statusNames = ['Idle', 'Traveling', 'Resting'];
            console.log(`   Token ${tokenId}: Owner=${owner.slice(0,10)}..., Status=${statusNames[Number(status)]}, CanTravel=${canTravel}`);
        } catch (e) {
            console.log(`   Token ${tokenId}: Error - ${e.message}`);
        }
    }
    
    // Check group provisions
    console.log("\n📋 Provisions:");
    const provisions = await omniTravel.calculateGroupProvisions(1);
    console.log(`   1 hour group travel: ${hre.ethers.formatEther(provisions)} ZETA`);
    
    console.log("\n🎉 Diagnosis Complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error:", error);
        process.exit(1);
    });
