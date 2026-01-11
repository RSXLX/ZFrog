/**
 * Configure ALL Travel Contracts
 * 同时配置普通旅行和跨链旅行，避免授权冲突
 * 
 * Usage: npx hardhat run scripts/configure-all-travel.js --network zetaAthens
 */
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const ADDRESSES_FILE = path.join(__dirname, "../deployed-addresses.json");

function loadAddresses() {
    if (fs.existsSync(ADDRESSES_FILE)) {
        return JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf8"));
    }
    throw new Error("No deployed-addresses.json found!");
}

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    const addresses = loadAddresses();
    
    const NFT_ADDRESS = addresses.zetaAthens?.finalContracts?.zetaFrogNFT || addresses.zetaAthens?.zetaFrogNFT;
    const TRAVEL_ADDRESS = addresses.zetaAthens?.finalContracts?.travel || addresses.zetaAthens?.travel_v2;
    const OMNI_ADDRESS = addresses.zetaAthens?.finalContracts?.omniTravel || addresses.zetaAthens?.omniTravel;
    
    if (!NFT_ADDRESS || !TRAVEL_ADDRESS || !OMNI_ADDRESS) {
        throw new Error("Missing required addresses in deployed-addresses.json");
    }
    
    console.log("\n⚙️ Configuring Travel Contracts");
    console.log("================================");
    console.log(`Deployer:   ${deployer.address}`);
    console.log(`NFT:        ${NFT_ADDRESS}`);
    console.log(`Travel:     ${TRAVEL_ADDRESS}`);
    console.log(`OmniTravel: ${OMNI_ADDRESS}`);
    
    const nft = await hre.ethers.getContractAt("ZetaFrogNFTUpgradeable", NFT_ADDRESS);
    
    // 验证所有权
    const owner = await nft.owner();
    console.log(`\n📋 Contract Owner: ${owner}`);
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
        throw new Error("Deployer is NOT the contract owner!");
    }
    
    // 检查当前配置
    const currentTravel = await nft.travelContract();
    const currentOmni = await nft.omniTravelContract();
    
    console.log("\n📋 Current State:");
    console.log(`   travelContract:     ${currentTravel}`);
    console.log(`   omniTravelContract: ${currentOmni}`);
    
    let changes = 0;
    
    // 设置普通旅行合约
    if (currentTravel.toLowerCase() !== TRAVEL_ADDRESS.toLowerCase()) {
        console.log("\n🔧 Setting travelContract...");
        const tx1 = await nft.setTravelContract(TRAVEL_ADDRESS);
        await tx1.wait();
        console.log("   ✅ Done");
        changes++;
    } else {
        console.log("\n✅ travelContract already correct");
    }
    
    // 设置跨链旅行合约
    if (currentOmni.toLowerCase() !== OMNI_ADDRESS.toLowerCase()) {
        console.log("\n🔧 Setting omniTravelContract...");
        const tx2 = await nft.setOmniTravelContract(OMNI_ADDRESS);
        await tx2.wait();
        console.log("   ✅ Done");
        changes++;
    } else {
        console.log("\n✅ omniTravelContract already correct");
    }
    
    // 验证最终状态
    console.log("\n📋 Final State:");
    console.log(`   travelContract:     ${await nft.travelContract()}`);
    console.log(`   omniTravelContract: ${await nft.omniTravelContract()}`);
    
    if (changes === 0) {
        console.log("\n✨ No changes needed - all contracts already configured correctly!");
    } else {
        console.log(`\n🎉 Configuration complete! (${changes} change(s) made)`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Configuration failed:", error);
        process.exit(1);
    });
