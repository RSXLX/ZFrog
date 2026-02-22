/**
 * Diagnose Frog 0 Status on New OmniTravel
 */
const hre = require("hardhat");
const path = require("path");
const fs = require("fs");

async function main() {
    const addressesPath = path.join(__dirname, "../deployed-addresses.json");
    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
    
    // Ensure we are using the NEW address
    const OMNI_TRAVEL = "0xA12a2506E6B6604650c0661227F11aae1BDDf3af";
    const ZETAFROG_NFT = addresses.zetaAthens.zetaFrogNFT;
    const TOKEN_ID = 0;
    
    const [deployer] = await hre.ethers.getSigners();
    console.log(`\n🔍 Diagnosing Frog ${TOKEN_ID} Status`);
    console.log(`   Account: ${deployer.address}`);
    console.log(`   ZetaFrogNFT: ${ZETAFROG_NFT}`);
    console.log(`   OmniTravel: ${OMNI_TRAVEL} (NEW)\n`);
    
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
    
    // 3. Check canStartCrossChainTravel
    const canStart = await omni.canStartCrossChainTravel(TOKEN_ID);
    console.log(`📊 canStartCrossChainTravel: ${canStart}`);
    
    // 4. Check if OmniTravel is authorized on NFT
    const authorizedContract = await nft.omniTravelContract();
    console.log(`📊 NFT.omniTravelContract: ${authorizedContract}`);
    console.log(`   Match: ${authorizedContract.toLowerCase() === OMNI_TRAVEL.toLowerCase()}`);

    if (travel.status != 0n && travel.status != 5n) {
        console.log(`\n⚠️ Frog is STUCK in OmniTravel! Calling adminClearStuckTravel...`);
        try {
            const tx = await omni.adminClearStuckTravel(TOKEN_ID);
            console.log(`   Tx: ${tx.hash}`);
            await tx.wait();
            console.log(`   ✅ Cleared!`);
        } catch (e) {
            console.log(`   ❌ Failed to clear: ${e.message}`);
        }
    }
}

main().catch(console.error);
