/**
 * 手动升级 OmniTravel 并清除卡住的旅行
 * 使用直接 UUPS upgradeToAndCall
 */
const { ethers } = require("hardhat");
const path = require("path");
const fs = require("fs");

async function main() {
    const addressesPath = path.join(__dirname, "../deployed-addresses.json");
    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
    
    const PROXY_ADDRESS = addresses.zetaAthens.omniTravel;
    const TOKEN_ID = 0;
    
    const [deployer] = await ethers.getSigners();
    console.log("\n⬆️ Manual UUPS Upgrade for OmniTravel");
    console.log("========================================");
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Proxy: ${PROXY_ADDRESS}`);
    
    // Get current implementation
    const implSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
    const currentImpl = await ethers.provider.getStorage(PROXY_ADDRESS, implSlot);
    const currentImplAddr = ethers.getAddress('0x' + currentImpl.slice(26));
    console.log(`\n📦 Current Implementation: ${currentImplAddr}`);
    
    // Deploy new implementation
    console.log(`\n🔧 Deploying new OmniTravelUpgradeable implementation...`);
    const OmniTravel = await ethers.getContractFactory("OmniTravelUpgradeable");
    const newImpl = await OmniTravel.deploy();
    await newImpl.waitForDeployment();
    const newImplAddr = await newImpl.getAddress();
    console.log(`   New Implementation: ${newImplAddr}`);
    
    // Upgrade via UUPS upgradeToAndCall
    console.log(`\n⬆️ Calling upgradeToAndCall on proxy...`);
    const proxy = await ethers.getContractAt("OmniTravelUpgradeable", PROXY_ADDRESS);
    
    // Call upgradeToAndCall with empty data (no reinitialization needed)
    const tx = await proxy.upgradeToAndCall(newImplAddr, "0x");
    console.log(`   Tx: ${tx.hash}`);
    await tx.wait();
    
    // Verify
    const newImplCheck = await ethers.provider.getStorage(PROXY_ADDRESS, implSlot);
    const newImplCheckAddr = ethers.getAddress('0x' + newImplCheck.slice(26));
    console.log(`   ✅ Implementation now: ${newImplCheckAddr}`);
    
    // Check version
    const version = await proxy.version();
    console.log(`   Version: ${version}`);
    
    // Now clear stuck travel
    console.log(`\n🔧 Clearing stuck travel for token ${TOKEN_ID}...`);
    const travel = await proxy.crossChainTravels(TOKEN_ID);
    console.log(`   Current status: ${travel.status}`);
    
    if (travel.status != 0n && travel.status != 5n) {
        const clearTx = await proxy.adminClearStuckTravel(TOKEN_ID);
        console.log(`   Clear tx: ${clearTx.hash}`);
        await clearTx.wait();
        console.log(`   ✅ Cleared!`);
        
        const canStart = await proxy.canStartCrossChainTravel(TOKEN_ID);
        console.log(`   canStartCrossChainTravel: ${canStart}`);
        
        if (canStart) {
            console.log(`\n🎉 SUCCESS! Frog ${TOKEN_ID} is now ready to travel!`);
        }
    } else {
        console.log(`   Already cleared or no travel found.`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error:", error);
        process.exit(1);
    });
