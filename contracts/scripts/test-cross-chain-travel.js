
const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("🚀 Starting Cross-Chain Travel Test with account:", deployer.address);

    const ZETAFROG_ADDRESS = process.env.VITE_CONTRACT_ADDRESS_ZETAFROG || process.env.ZETAFROG_NFT_ADDRESS;
    // Use OMNI_TRAVEL_ADDRESS if available, or fallback to the one found in service
    const OMNI_TRAVEL_ADDRESS = process.env.OMNI_TRAVEL_ADDRESS || "0x52B090700Ca9fb2EBBbc964fDde60A0513Df7cd7";

    if (!ZETAFROG_ADDRESS || !OMNI_TRAVEL_ADDRESS) {
        throw new Error("Missing contract addresses.");
    }

    console.log("📍 ZetaFrogNFT:", ZETAFROG_ADDRESS);
    console.log("📍 OmniTravel: ", OMNI_TRAVEL_ADDRESS);

    const ZetaFrogNFT = await hre.ethers.getContractFactory("ZetaFrogNFT");
    const zetaFrogNFT = ZetaFrogNFT.attach(ZETAFROG_ADDRESS);

    const OmniTravel = await hre.ethers.getContractFactory("OmniTravel");
    const omniTravel = OmniTravel.attach(OMNI_TRAVEL_ADDRESS);

    const FROG_ID = 18;
    const TARGET_CHAIN = 97; // BSC Testnet
    const DURATION = 60; // 60 seconds

    // 1. Check Ownership & Status
    console.log(`\n🐸 Checking Frog ${FROG_ID}...`);
    try {
        const owner = await zetaFrogNFT.ownerOf(FROG_ID);
        console.log(`   Owner: ${owner}`);
        if (owner !== deployer.address) {
            console.warn("⚠️ Warning: Deployer is not the owner of Frog 18.");
        }
    } catch (e) {
        console.error("❌ Frog 18 does not exist or error checking owner:", e.message);
        // Mint if not exists? No, user said use frog 18.
        return;
    }

    const status = await zetaFrogNFT.getFrogStatus(FROG_ID);
    console.log(`   Status: ${status} (0=Idle, 1=Traveling)`);

    if (status !== 0n) {
        console.log("⚠️ Frog is already traveling. Attempting to complete/cancel first if local?");
        // Just try to start and let it fail if so, or maybe it's cross chain so we can't easily cancel locally without message.
        // Assuming we want to start.
    }

    // 2. Approve OmniTravel?
    // Usually OmniTravel needs approval to lock the frog? Or maybe Travel contract does. 
    // If OmniTravel calls transferFrom, we need approve.
    // Let's check allowance or just approve.
    console.log("\n🔓 Approving OmniTravel...");
    const txApprove = await zetaFrogNFT.approve(OMNI_TRAVEL_ADDRESS, FROG_ID);
    await txApprove.wait();
    console.log("✅ Approved.");

    // 3. Start Cross-Chain Travel
    console.log(`\n🚀 Starting Cross-Chain Travel to Chain ${TARGET_CHAIN}...`);
    const fee = hre.ethers.parseEther("0.01"); // Send some fee
    
    try {
        const txStart = await omniTravel.startCrossChainTravel(
            FROG_ID,
            TARGET_CHAIN,
            DURATION,
            { value: fee }
        );
        console.log(`   Tx Hash: ${txStart.hash}`);
        const receipt = await txStart.wait();
        console.log("✅ Transaction Confirmed!");
        
        // Find CrossChainTravelStarted event
        const event = receipt.logs.find(log => {
            try { return omniTravel.interface.parseLog(log)?.name === 'CrossChainTravelStarted'; } catch(e){ return false; }
        });
        
        if (event) {
            const args = omniTravel.interface.parseLog(event).args;
            console.log(`\n🎉 Event: CrossChainTravelStarted`);
            console.log(`   TokenId: ${args.tokenId}`);
            console.log(`   TargetChain: ${args.targetChainId}`);
            console.log(`   MessageId: ${args.messageId}`);
            console.log(`   StartTime: ${args.startTime}`);
        } else {
            console.log("⚠️ Event not found in logs.");
        }

    } catch (e) {
        console.error("❌ Failed to start travel:", e);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
