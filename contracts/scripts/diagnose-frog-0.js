/**
 * Diagnose Frog 0 Stuck Issue
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
    console.log(`\n🔍 Diagnosing Frog ${TOKEN_ID} Status`);
    console.log(`   Account: ${deployer.address}`);
    console.log(`   ZetaFrogNFT: ${ZETAFROG_NFT}`);
    console.log(`   OmniTravel: ${OMNI_TRAVEL}\n`);
    
    const nft = await hre.ethers.getContractAt("ZetaFrogNFTUpgradeable", ZETAFROG_NFT);
    const omni = await hre.ethers.getContractAt("OmniTravelUpgradeable", OMNI_TRAVEL);
    
    // 1. Check NFT Status
    const frogStatus = await nft.getFrogStatus(TOKEN_ID);
    const statusNames = ['Idle', 'Traveling', 'CrossChainLocked'];
    console.log(`📊 NFT Contract - Frog Status: ${frogStatus} (${statusNames[Number(frogStatus)]})`);
    
    // 2. Check OmniTravel CrossChainTravels
    const travel = await omni.crossChainTravels(TOKEN_ID);
    const ccStatusNames = ['None', 'Locked', 'Traveling', 'OnTarget', 'Returning', 'Completed', 'Failed', 'Timeout'];
    console.log(`📊 OmniTravel Contract - CrossChain Status: ${travel.status} (${ccStatusNames[Number(travel.status)] || 'Unknown'})`);
    console.log(`   Owner: ${travel.owner}`);
    console.log(`   Target Chain: ${travel.targetChainId}`);
    
    // 3. Check canStartCrossChainTravel
    const canStart = await omni.canStartCrossChainTravel(TOKEN_ID);
    console.log(`📊 canStartCrossChainTravel: ${canStart}`);
    
    // 4. Analyze the issue
    console.log(`\n🎯 Diagnosis:`);
    if (frogStatus == 0n && travel.status == 0n && !canStart) {
        console.log(`   ⚠️ NFT is Idle, OmniTravel has no travel record, but canStart returns false.`);
        console.log(`   This could be due to:`);
        console.log(`   1. OmniTravel contract not linked to ZetaFrogNFT correctly`);
        console.log(`   2. testMode is off and chain config is not set`);
        
        const testMode = await omni.testMode();
        console.log(`\n   📊 testMode: ${testMode}`);
        
        const travelManager = await omni.travelManager();
        console.log(`   📊 travelManager: ${travelManager}`);
        
        // Check if NFT contract is correctly set
        const nftAddr = await omni.zetaFrogNFT();
        console.log(`   📊 OmniTravel.zetaFrogNFT: ${nftAddr}`);
        console.log(`   📊 Expected: ${ZETAFROG_NFT}`);
        console.log(`   📊 Match: ${nftAddr.toLowerCase() === ZETAFROG_NFT.toLowerCase()}`);
    } else if (frogStatus == 0n && canStart) {
        console.log(`   ✅ Frog is Idle and can start travel. Everything looks normal!`);
    } else if (frogStatus != 0n) {
        console.log(`   ⚠️ NFT status is not Idle (${statusNames[Number(frogStatus)]}). Need to reset.`);
    }
}

main().catch(console.error);
