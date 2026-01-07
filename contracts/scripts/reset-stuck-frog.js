/**
 * Check and Reset Stuck Frog
 * 
 * This script checks if a frog is stuck in "Traveling" status and resets it.
 */
const hre = require("hardhat");

const ZETAFROG_NFT = "0x0721CDff3291a1Dd2af28633B5dEE5427553F09E";
const OMNI_TRAVEL = "0x0F4B80d84363B3FCdC1F4fBb8d749c894B087E5a";
const TOKEN_ID = 0;

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log(`\n🔍 Checking Frog Status`);
    console.log(`   Account: ${deployer.address}\n`);
    
    const nft = await hre.ethers.getContractAt("ZetaFrogNFTUpgradeable", ZETAFROG_NFT);
    const omni = await hre.ethers.getContractAt("OmniTravelUpgradeable", OMNI_TRAVEL);
    
    // Check NFT Status
    const frogStatus = await nft.getFrogStatus(TOKEN_ID);
    console.log(`📊 Frog ${TOKEN_ID} NFT Status: ${frogStatus} (0=Idle, 1=Traveling)`);
    
    // Check OmniTravel Status
    const travel = await omni.crossChainTravels(TOKEN_ID);
    console.log(`📊 OmniTravel CrossChainStatus: ${travel.status} (0=None, 1=Locked, 2=Traveling, 3=OnTarget, 5=Completed)`);
    console.log(`   Owner: ${travel.owner}`);
    console.log(`   Target Chain: ${travel.targetChainId}`);
    console.log(`   Start Time: ${new Date(Number(travel.startTime) * 1000).toISOString()}`);
    
    // If frog is stuck in Traveling, reset it
    if (frogStatus === 1n || (travel.status !== 0n && travel.status !== 5n)) {
        console.log(`\n⚠️  Frog is stuck. Attempting emergency reset...`);
        
        // Method 1: Use emergencyResetFrogStatus on NFT contract
        try {
            const tx = await nft.emergencyResetFrogStatus(TOKEN_ID);
            await tx.wait();
            console.log(`   ✅ NFT status reset successful`);
        } catch (e) {
            console.log(`   ❌ NFT reset failed: ${e.message}`);
        }
        
        // Method 2: Use markTravelCompleted on OmniTravel (if you're travelManager)
        try {
            const tx2 = await omni.markTravelCompleted(TOKEN_ID, 0);
            await tx2.wait();
            console.log(`   ✅ OmniTravel status reset successful`);
        } catch (e) {
            console.log(`   ⚠️  OmniTravel reset skipped (might not be travelManager): ${e.reason || e.message}`);
        }
        
        // Verify
        const newStatus = await nft.getFrogStatus(TOKEN_ID);
        console.log(`\n📊 New Frog Status: ${newStatus} (should be 0=Idle)`);
    } else {
        console.log(`\n✅ Frog is not stuck (Idle or Completed)`);
    }
}

main().catch(console.error);
