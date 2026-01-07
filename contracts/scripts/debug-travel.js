/**
 * Debug startCrossChainTravel step by step
 */

const hre = require("hardhat");

const OMNI_TRAVEL = "0x743476f8201885B396329c8AC03b560e1D240666";
const ZETA_FROG_NFT = "0x21C6C9C82C7B2317E2fa25E2cdAa29E45C84fA1f";

async function main() {
    const [signer] = await hre.ethers.getSigners();
    console.log(`\n🔍 Step-by-step debugging with: ${signer.address}\n`);

    const OmniTravel = await hre.ethers.getContractFactory("OmniTravel");
    const omniTravel = OmniTravel.attach(OMNI_TRAVEL);

    const ZetaFrogNFT = await hre.ethers.getContractFactory("ZetaFrogNFT");
    const zetaFrog = ZetaFrogNFT.attach(ZETA_FROG_NFT);
    
    // Check and set authorization
    console.log("Checking authorization...");
    try {
        // Try to approve if not approved (assuming signer is owner)
        // Note: Contract doesn't use isApprovedForAll standardly, but let's check ownership
        const owner = await zetaFrog.owner();
        console.log(`NFT Contract Owner: ${owner}`);
        
        if (owner.toLowerCase() === signer.address.toLowerCase()) {
             console.log("Signer IS owner of NFT contract. Setting authorized contract...");
             // Check if 'setOmniTravel' or similar exists, or if we just need to be approved
             // Looking at ZetaFrogNFT interface, assume setTravelContract or similar
             // Let's try to set approval for all
             
             const isApproved = await zetaFrog.isApprovedForAll(signer.address, OMNI_TRAVEL);
             console.log(`Is Approved For All: ${isApproved}`);
             
             if (!isApproved) {
                 console.log("Approving OmniTravel...");
                 const tx = await zetaFrog.setApprovalForAll(OMNI_TRAVEL, true);
                 await tx.wait();
                 console.log("✅ Approved OmniTravel!");
             }
        }
    } catch (e) {
        console.log(`Authorization check failed: ${e.message}`);
    }

    const tokenId = 6;
    const targetChainId = 97;
    const duration = 60;
    const value = hre.ethers.parseEther("0.002");

    console.log("=== Pre-flight checks ===\n");

    // 1. Check ownership
    console.log("1. Checking ownership...");
    const owner = await zetaFrog.ownerOf(tokenId);
    console.log(`   Owner: ${owner}`);
    console.log(`   Signer: ${signer.address}`);
    console.log(`   Match: ${owner.toLowerCase() === signer.address.toLowerCase() ? "✅" : "❌"}`);

    // 2. Check chain support
    console.log("\n2. Checking chain support...");
    const supported = await omniTravel.supportedChains(targetChainId);
    console.log(`   Chain ${targetChainId} supported: ${supported ? "✅" : "❌"}`);

    // 3. Check connector
    console.log("\n3. Checking connector...");
    const connector = await omniTravel.chainConnectors(targetChainId);
    console.log(`   Connector: ${connector}`);
    console.log(`   Length > 0: ${connector.length > 2 ? "✅" : "❌"}`);

    // 4. Check duration
    console.log("\n4. Checking duration...");
    const maxDuration = await omniTravel.MAX_TRAVEL_DURATION();
    console.log(`   Duration: ${duration}s`);
    console.log(`   Max duration: ${maxDuration}s`);
    console.log(`   Valid: ${duration > 0 && duration <= maxDuration ? "✅" : "❌"}`);

    // 5. Check travel status
    console.log("\n5. Checking travel status...");
    const travel = await omniTravel.crossChainTravels(tokenId);
    console.log(`   Current status: ${travel.status}`);
    console.log(`   Valid (None=0 or Completed=5): ${travel.status == 0 || travel.status == 5 ? "✅" : "❌"}`);

    // 6. Check provisions
    console.log("\n6. Checking provisions...");
    const durationHours = Math.ceil(duration / 3600);
    const required = await omniTravel.calculateProvisions(durationHours);
    console.log(`   Required: ${hre.ethers.formatEther(required)} ZETA`);
    console.log(`   Sending: ${hre.ethers.formatEther(value)} ZETA`);
    console.log(`   Sufficient: ${value >= required ? "✅" : "❌"}`);

    // 7. Check frog status
    console.log("\n7. Checking frog status...");
    const frogStatus = await zetaFrog.getFrogStatus(tokenId);
    console.log(`   Frog status: ${frogStatus} (0=Idle, 1=Traveling, 2=Locked)`);
    console.log(`   Is Idle: ${frogStatus == 0 ? "✅" : "❌"}`);

    // 8. Check test mode
    console.log("\n8. Checking test mode...");
    const testMode = await omniTravel.testMode();
    console.log(`   Test mode: ${testMode ? "ENABLED ✅" : "DISABLED"}`);

    // 9. Try to call with explicit gas limit
    console.log("\n=== Attempting transaction ===\n");
    
    try {
        // First try static call to get error
        console.log("Trying static call...");
        await omniTravel.startCrossChainTravel.staticCall(
            tokenId,
            targetChainId,
            duration,
            { value, gasLimit: 1000000 }
        );
        console.log("Static call succeeded!");
    } catch (e) {
        console.log(`Static call failed: ${e.message}`);
        
        // Check if it's a specific revert
        if (e.data) {
            console.log(`Error data: ${e.data}`);
        }
    }

    // 10. Try actual transaction
    console.log("\nTrying actual transaction...");
    try {
        const tx = await omniTravel.startCrossChainTravel(
            tokenId,
            targetChainId,
            duration,
            { value, gasLimit: 1000000 }
        );
        console.log(`TX submitted: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`✅ SUCCESS! Block: ${receipt.blockNumber}`);
        
        // Check new status
        const newTravel = await omniTravel.crossChainTravels(tokenId);
        console.log(`New travel status: ${newTravel.status}`);
        
    } catch (e) {
        console.log(`❌ Transaction failed: ${e.message}`);
    }
}

main().catch(console.error);
