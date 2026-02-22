/**
 * Deep Debug markTravelCompleted
 * 
 * Check all possible reasons for markTravelCompleted to fail
 */
const hre = require("hardhat");
const path = require("path");
const fs = require("fs");

async function main() {
    const addressesPath = path.join(__dirname, "../deployed-addresses.json");
    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
    
    const ZETAFROG_NFT = addresses.zetaAthens.zetaFrogNFT;
    const OMNI_TRAVEL = addresses.zetaAthens.omniTravel;
    const TOKEN_ID = 0;
    
    const [deployer] = await hre.ethers.getSigners();
    console.log(`\n🔍 Deep Debug markTravelCompleted`);
    console.log(`   Token ID: ${TOKEN_ID}`);
    console.log(`   Deployer: ${deployer.address}\n`);
    
    const nft = await hre.ethers.getContractAt("ZetaFrogNFTUpgradeable", ZETAFROG_NFT);
    const omni = await hre.ethers.getContractAt("OmniTravelUpgradeable", OMNI_TRAVEL);
    
    // 1. Check basic requirements
    console.log(`=== Checking markTravelCompleted Requirements ===\n`);
    
    const travelManager = await omni.travelManager();
    console.log(`1. Is deployer travelManager/owner?`);
    console.log(`   travelManager: ${travelManager}`);
    console.log(`   owner: ${await omni.owner()}`);
    console.log(`   deployer: ${deployer.address}`);
    console.log(`   → ${travelManager.toLowerCase() === deployer.address.toLowerCase() ? '✅ PASS' : '❌ FAIL'}`);
    
    // 2. Travel status
    const travel = await omni.crossChainTravels(TOKEN_ID);
    console.log(`\n2. Is travel.status != None?`);
    console.log(`   status: ${travel.status} (0=None, 1=Locked, 2=Traveling, 5=Completed)`);
    console.log(`   → ${travel.status != 0n ? '✅ PASS' : '❌ FAIL: status is None'}`);
    
    // 3. Check what setFrogStatus would do
    console.log(`\n3. Can OmniTravel call setFrogStatus?`);
    const omniTravelContract = await nft.omniTravelContract();
    console.log(`   NFT.omniTravelContract: ${omniTravelContract}`);
    console.log(`   OmniTravel address: ${OMNI_TRAVEL}`);
    console.log(`   → ${omniTravelContract.toLowerCase() === OMNI_TRAVEL.toLowerCase() ? '✅ PASS' : '❌ FAIL'}`);
    
    // 4. Check souvenir NFT
    console.log(`\n4. SouvenirNFT config?`);
    const souvenirNFT = await omni.souvenirNFT();
    console.log(`   souvenirNFT: ${souvenirNFT}`);
    console.log(`   → ${souvenirNFT === '0x0000000000000000000000000000000000000000' ? '⚠️ Not set (but should be OK with empty souvenirUri)' : `Set to ${souvenirNFT}`}`);
    
    // 5. Try with gas estimation to get revert reason
    console.log(`\n5. Attempting gas estimation (to get revert reason)...`);
    try {
        const gas = await omni.markTravelCompleted.estimateGas(TOKEN_ID, 0, "");
        console.log(`   ✅ Gas estimate: ${gas} - should succeed!`);
        
        // If gas estimation passes, try actual call
        console.log(`\n6. Executing actual transaction...`);
        const tx = await omni.markTravelCompleted(TOKEN_ID, 0, "");
        console.log(`   Tx hash: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`   ✅ SUCCESS! Gas used: ${receipt.gasUsed}`);
    } catch (error) {
        console.log(`   ❌ FAILED`);
        console.log(`   Error: ${error.message}`);
        if (error.reason) console.log(`   Reason: ${error.reason}`);
        if (error.data) console.log(`   Data: ${error.data}`);
        
        // Try to decode custom error
        console.log(`\n   Full error stack:`);
        console.log(error);
    }
}

main().catch(console.error);
