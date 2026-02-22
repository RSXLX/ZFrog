/**
 * Upgrade OmniTravel to v3.1.0 and clear stuck frog
 */
const hre = require("hardhat");
const path = require("path");
const fs = require("fs");

async function main() {
    const addressesPath = path.join(__dirname, "../deployed-addresses.json");
    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
    
    const OMNI_TRAVEL_PROXY = addresses.zetaAthens.omniTravel;
    const TOKEN_ID = 0;
    
    const [deployer] = await hre.ethers.getSigners();
    console.log(`\n🔧 Upgrading OmniTravel to v3.1.0`);
    console.log(`   Proxy: ${OMNI_TRAVEL_PROXY}`);
    console.log(`   Deployer: ${deployer.address}\n`);
    
    // Deploy new implementation
    const OmniTravelFactory = await hre.ethers.getContractFactory("OmniTravelUpgradeable");
    
    console.log(`📦 Deploying new implementation...`);
    const upgraded = await hre.upgrades.upgradeProxy(OMNI_TRAVEL_PROXY, OmniTravelFactory);
    await upgraded.waitForDeployment();
    
    const newVersion = await upgraded.version();
    console.log(`✅ Upgraded to version: ${newVersion}`);
    
    // Get implementation address
    const implAddress = await hre.upgrades.erc1967.getImplementationAddress(OMNI_TRAVEL_PROXY);
    console.log(`   New implementation: ${implAddress}`);
    
    // Now clear the stuck travel
    console.log(`\n🔧 Clearing stuck travel for token ${TOKEN_ID}...`);
    
    const travel = await upgraded.crossChainTravels(TOKEN_ID);
    console.log(`   Current CrossChain Status: ${travel.status}`);
    
    if (travel.status != 0n && travel.status != 5n) {
        const tx = await upgraded.adminClearStuckTravel(TOKEN_ID);
        console.log(`   Tx hash: ${tx.hash}`);
        await tx.wait();
        console.log(`   ✅ Cleared!`);
        
        // Verify
        const newTravel = await upgraded.crossChainTravels(TOKEN_ID);
        console.log(`   New CrossChain Status: ${newTravel.status} (should be 5=Completed)`);
        
        const canStart = await upgraded.canStartCrossChainTravel(TOKEN_ID);
        console.log(`   canStartCrossChainTravel: ${canStart}`);
        
        if (canStart) {
            console.log(`\n🎉 SUCCESS! Frog ${TOKEN_ID} is now ready to travel!`);
        }
    } else {
        console.log(`   ✅ No stuck travel found.`);
    }
}

main().catch(console.error);
