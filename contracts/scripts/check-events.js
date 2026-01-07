/**
 * Check events and ownership
 */

const hre = require("hardhat");

const OMNI_TRAVEL = "0x743476f8201885B396329c8AC03b560e1D240666";
const ZETA_FROG_NFT = "0x21C6C9C82C7B2317E2fa25E2cdAa29E45C84fA1f";

async function main() {
    const [signer] = await hre.ethers.getSigners();
    console.log(`\n🔍 Checking Events & Ownership\n`);

    const OmniTravel = await hre.ethers.getContractFactory("OmniTravel");
    const omniTravel = OmniTravel.attach(OMNI_TRAVEL);
    
    const ZetaFrogNFT = await hre.ethers.getContractFactory("ZetaFrogNFT");
    const zetaFrog = ZetaFrogNFT.attach(ZETA_FROG_NFT);

    // Check Frog #3 specifics
    console.log("🐸 Frog #3 Details:");
    const owner = await zetaFrog.ownerOf(3);
    console.log(`  Owner: ${owner}`);
    console.log(`  Signer: ${signer.address}`);
    
    // Check recent events from OmniTravel
    console.log("\n📜 Recent CrossChainTravelStarted Events:");
    const filter = omniTravel.filters.CrossChainTravelStarted();
    const events = await omniTravel.queryFilter(filter, -100); // Last 100 blocks
    
    if (events.length === 0) {
        console.log("  No events found in the last 100 blocks.");
    } else {
        for (const event of events) {
            console.log(`  Event found at block ${event.blockNumber}:`);
            console.log(`    TokenId: ${event.args.tokenId}`);
            console.log(`    Owner: ${event.args.owner}`);
            console.log(`    TargetChain: ${event.args.targetChainId}`);
            console.log(`    Tx Hash: ${event.transactionHash}`);
        }
    }
}

main().catch(console.error);
