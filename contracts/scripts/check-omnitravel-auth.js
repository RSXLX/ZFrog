/**
 * Check OmniTravel Authorization
 * 
 * Verify that OmniTravel contract is properly authorized on ZetaFrogNFT
 */
const hre = require("hardhat");
const path = require("path");
const fs = require("fs");

async function main() {
    const addressesPath = path.join(__dirname, "../deployed-addresses.json");
    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
    
    const ZETAFROG_NFT = addresses.zetaAthens.zetaFrogNFT;
    const OMNI_TRAVEL = addresses.zetaAthens.omniTravel;
    
    const [deployer] = await hre.ethers.getSigners();
    console.log(`\n🔍 Checking Authorization`);
    console.log(`   ZetaFrogNFT: ${ZETAFROG_NFT}`);
    console.log(`   OmniTravel: ${OMNI_TRAVEL}\n`);
    
    const nft = await hre.ethers.getContractAt("ZetaFrogNFTUpgradeable", ZETAFROG_NFT);
    
    // Check NFT's omniTravelContract setting
    const omniTravelContract = await nft.omniTravelContract();
    console.log(`📊 NFT.omniTravelContract: ${omniTravelContract}`);
    console.log(`📊 Expected OmniTravel:    ${OMNI_TRAVEL}`);
    console.log(`📊 Match: ${omniTravelContract.toLowerCase() === OMNI_TRAVEL.toLowerCase()}`);
    
    if (omniTravelContract.toLowerCase() !== OMNI_TRAVEL.toLowerCase()) {
        console.log(`\n⚠️ OmniTravel address mismatch! Need to update on NFT contract.`);
        
        const owner = await nft.owner();
        console.log(`   NFT owner: ${owner}`);
        console.log(`   Deployer: ${deployer.address}`);
        
        if (owner.toLowerCase() === deployer.address.toLowerCase()) {
            console.log(`\n🔧 Fixing: Setting omniTravelContract to ${OMNI_TRAVEL}...`);
            const tx = await nft.setOmniTravelContract(OMNI_TRAVEL);
            console.log(`   Tx sent: ${tx.hash}`);
            await tx.wait();
            console.log(`   ✅ Done!`);
            
            // Verify
            const newOmniTravel = await nft.omniTravelContract();
            console.log(`   📊 New omniTravelContract: ${newOmniTravel}`);
        } else {
            console.log(`   ❌ Cannot fix: not owner`);
        }
    } else {
        console.log(`\n✅ OmniTravel is correctly set on NFT contract.`);
    }
}

main().catch(console.error);
