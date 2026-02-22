/**
 * 升级 OmniTravel 代理到新实现
 * UUPS 升级模式
 */
const { ethers, upgrades } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("\n⬆️ Upgrading OmniTravel Implementation");
    console.log("========================================");
    console.log(`Deployer: ${deployer.address}`);
    
    const PROXY_ADDRESS = "0x20A08bc1deFC1be2273636Af3ba3ef8cA6EaD2C8";
    
    console.log(`\n📦 Current Proxy: ${PROXY_ADDRESS}`);
    
    // Get current implementation
    const implSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
    const currentImpl = await ethers.provider.getStorage(PROXY_ADDRESS, implSlot);
    console.log(`   Current Implementation: ${ethers.getAddress('0x' + currentImpl.slice(26))}`);
    
    // Deploy new implementation
    console.log(`\n🔧 Deploying new OmniTravel implementation...`);
    const OmniTravel = await ethers.getContractFactory("OmniTravelUpgradeable");
    
    console.log(`   Upgrading proxy...`);
    const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, OmniTravel, {
        kind: 'uups',
        unsafeAllow: ['constructor', 'state-variable-immutable']
    });
    
    await upgraded.waitForDeployment();
    
    // Get new implementation
    const newImpl = await ethers.provider.getStorage(PROXY_ADDRESS, implSlot);
    console.log(`   New Implementation: ${ethers.getAddress('0x' + newImpl.slice(26))}`);
    
    // Verify new function exists
    console.log(`\n🔍 Verifying new functions...`);
    try {
        const provisions = await upgraded.calculateGroupProvisions(1);
        console.log(`   calculateGroupProvisions(1): ${ethers.formatEther(provisions)} ZETA ✅`);
    } catch (e) {
        console.log(`   calculateGroupProvisions: Error - ${e.message}`);
    }
    
    console.log("\n🎉 Upgrade Complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error:", error);
        process.exit(1);
    });
