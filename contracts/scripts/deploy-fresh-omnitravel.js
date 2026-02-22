/**
 * Deploy fresh OmniTravel v3.1.0 with admin functions
 * Then fix stuck frog and update addresses
 */
const { ethers, upgrades } = require("hardhat");
const path = require("path");
const fs = require("fs");

async function main() {
    const addressesPath = path.join(__dirname, "../deployed-addresses.json");
    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
    
    const ZETA_FROG_NFT = addresses.zetaAthens.zetaFrogNFT;
    const OLD_OMNI_TRAVEL = addresses.zetaAthens.omniTravel;
    const GATEWAY = "0x6c533f7fe93fae114d0954697069df33c9b74fd7";
    
    const [deployer] = await ethers.getSigners();
    console.log("\n🚀 Deploying Fresh OmniTravel v3.1.0");
    console.log("=====================================");
    console.log(`Deployer: ${deployer.address}`);
    console.log(`ZetaFrogNFT: ${ZETA_FROG_NFT}`);
    console.log(`Gateway: ${GATEWAY}`);
    console.log(`Old OmniTravel: ${OLD_OMNI_TRAVEL}\n`);
    
    // Deploy new proxy
    console.log("📦 Deploying new OmniTravel proxy...");
    const OmniTravel = await ethers.getContractFactory("OmniTravelUpgradeable");
    
    const omniTravel = await upgrades.deployProxy(OmniTravel, [ZETA_FROG_NFT, GATEWAY], {
        kind: 'uups',
        initializer: 'initialize'
    });
    
    await omniTravel.waitForDeployment();
    const newOmniTravelAddr = await omniTravel.getAddress();
    console.log(`   ✅ New OmniTravel: ${newOmniTravelAddr}`);
    
    // Set test mode
    console.log("\n🔧 Configuring...");
    await (await omniTravel.setTestMode(true)).wait();
    console.log("   testMode: true");
    
    // Set travelManager to deployer
    await (await omniTravel.setTravelManager(deployer.address)).wait();
    console.log(`   travelManager: ${deployer.address}`);
    
    // Check version
    const version = await omniTravel.version();
    console.log(`   version: ${version}`);
    
    // Update ZetaFrogNFT to use new OmniTravel
    console.log("\n🔗 Updating ZetaFrogNFT...");
    const nft = await ethers.getContractAt("ZetaFrogNFTUpgradeable", ZETA_FROG_NFT);
    await (await nft.setOmniTravelContract(newOmniTravelAddr)).wait();
    console.log(`   ✅ ZetaFrogNFT.omniTravelContract = ${newOmniTravelAddr}`);
    
    // Update addresses file
    addresses.zetaAthens.omniTravel = newOmniTravelAddr;
    addresses.zetaAthens.omniTravelOld = OLD_OMNI_TRAVEL;
    fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
    console.log("   ✅ Updated deployed-addresses.json");
    
    // Verify frog 0 can now travel
    console.log("\n🔍 Verifying frog 0...");
    const canStart = await omniTravel.canStartCrossChainTravel(0);
    console.log(`   canStartCrossChainTravel(0): ${canStart}`);
    
    // Also update backend .env reminder
    console.log("\n📝 IMPORTANT: Update backend .env file!");
    console.log(`   OMNI_TRAVEL_ADDRESS=${newOmniTravelAddr}`);
    
    console.log("\n🎉 Deployment Complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error:", error);
        process.exit(1);
    });
