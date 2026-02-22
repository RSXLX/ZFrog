/**
 * Fix Stuck Cross-Chain Travel
 * 
 * When a frog is stuck in OmniTravel's Traveling status but NFT shows Idle,
 * this script will call markTravelCompleted to clear the stuck state.
 */
const hre = require("hardhat");
const path = require("path");
const fs = require("fs");

async function main() {
    const addressesPath = path.join(__dirname, "../deployed-addresses.json");
    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
    
    const OMNI_TRAVEL = addresses.zetaAthens.omniTravel;
    const TOKEN_ID = 0;
    
    const [deployer] = await hre.ethers.getSigners();
    console.log(`\n🔧 Fixing Stuck Frog ${TOKEN_ID}`);
    console.log(`   Account: ${deployer.address}`);
    console.log(`   OmniTravel: ${OMNI_TRAVEL}\n`);
    
    const omni = await hre.ethers.getContractAt("OmniTravelUpgradeable", OMNI_TRAVEL);
    
    // Check current state
    const travel = await omni.crossChainTravels(TOKEN_ID);
    const ccStatusNames = ['None', 'Locked', 'Traveling', 'OnTarget', 'Returning', 'Completed', 'Failed', 'Timeout'];
    console.log(`📊 Current CrossChain Status: ${travel.status} (${ccStatusNames[Number(travel.status)] || 'Unknown'})`);
    
    if (travel.status == 0n || travel.status == 5n) {
        console.log(`✅ No stuck travel found. Status is already None or Completed.`);
        return;
    }
    
    // Check if deployer is travelManager or owner
    const travelManager = await omni.travelManager();
    const owner = await omni.owner();
    console.log(`   travelManager: ${travelManager}`);
    console.log(`   owner: ${owner}`);
    console.log(`   deployer: ${deployer.address}`);
    
    const isAuthorized = 
        deployer.address.toLowerCase() === travelManager.toLowerCase() ||
        deployer.address.toLowerCase() === owner.toLowerCase();
        
    if (!isAuthorized) {
        console.log(`\n❌ Deployer is not travelManager or owner. Cannot fix directly.`);
        console.log(`   Please set travelManager to deployer first, or use owner account.`);
        return;
    }
    
    console.log(`\n🔧 Attempting to call markTravelCompleted...`);
    try {
        const tx = await omni.markTravelCompleted(TOKEN_ID, 0, "");
        console.log(`   Tx sent: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`   ✅ Transaction successful! Gas used: ${receipt.gasUsed}`);
        
        // Verify
        const newTravel = await omni.crossChainTravels(TOKEN_ID);
        console.log(`\n📊 New CrossChain Status: ${newTravel.status} (${ccStatusNames[Number(newTravel.status)] || 'Unknown'})`);
        
        const canStart = await omni.canStartCrossChainTravel(TOKEN_ID);
        console.log(`📊 canStartCrossChainTravel: ${canStart}`);
        
        if (canStart) {
            console.log(`\n🎉 Frog ${TOKEN_ID} is now ready to travel!`);
        }
    } catch (error) {
        console.log(`\n❌ Failed: ${error.reason || error.message}`);
    }
}

main().catch(console.error);
