/**
 * Upgrade OmniTravelUpgradeable Contract
 * 
 * This script upgrades the OmniTravel implementation while keeping the SAME proxy address.
 * Users and config files do NOT need to update any addresses after this upgrade.
 * 
 * Usage:
 *   npx hardhat run scripts/upgrade-omnitravel.js --network zetaAthens
 * 动态更新合约
 */
const { ethers, upgrades } = require("hardhat");
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
    const [deployer] = await ethers.getSigners();
    const addresses = loadAddresses();
    
    // Get the current proxy address (must already be deployed)
    const PROXY_ADDRESS = addresses.zetaAthens?.omniTravel;
    if (!PROXY_ADDRESS) {
        throw new Error("OmniTravel proxy address not found in deployed-addresses.json");
    }
    
    console.log(`\n🔄 Upgrading OmniTravelUpgradeable`);
    console.log(`   Proxy Address (unchanged): ${PROXY_ADDRESS}`);
    console.log(`   Deployer: ${deployer.address}\n`);
    
    // Get current version before upgrade
    const currentContract = await ethers.getContractAt("OmniTravelUpgradeable", PROXY_ADDRESS);
    const currentVersion = await currentContract.version();
    console.log(`   Current Version: ${currentVersion}`);
    
    // Get current implementation address
    const currentImpl = await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS);
    console.log(`   Current Implementation: ${currentImpl}\n`);
    
    // Deploy new implementation and upgrade proxy
    console.log("📦 Deploying new implementation...");
    const OmniTravelV2 = await ethers.getContractFactory("OmniTravelUpgradeable");
    
    // Upgrade the proxy to the new implementation
    const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, OmniTravelV2);
    await upgraded.waitForDeployment();
    
    // Get new implementation address
    const newImpl = await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS);
    const newVersion = await upgraded.version();
    
    console.log(`\n✅ Upgrade Successful!`);
    console.log(`   Proxy (unchanged): ${PROXY_ADDRESS}`);
    console.log(`   Old Implementation: ${currentImpl}`);
    console.log(`   New Implementation: ${newImpl}`);
    console.log(`   New Version: ${newVersion}`);
    
    // Update addresses file with new implementation (proxy stays the same)
    addresses.zetaAthens.omniTravelImpl = newImpl;
    addresses.zetaAthens.lastUpgrade = new Date().toISOString();
    fs.writeFileSync(ADDRESSES_FILE, JSON.stringify(addresses, null, 2));
    
    console.log(`\n📝 Updated deployed-addresses.json with new implementation address`);
    console.log(`\n⚠️  No config changes needed! Proxy address remains: ${PROXY_ADDRESS}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
