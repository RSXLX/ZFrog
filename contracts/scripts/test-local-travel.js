const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("🚀 Testing Local Travel with account:", deployer.address);

    // 1. Load Addresses
    const ZETAFROG_ADDRESS = process.env.VITE_CONTRACT_ADDRESS_ZETAFROG || process.env.ZETAFROG_NFT_ADDRESS;
    const TRAVEL_ADDRESS = process.env.VITE_CONTRACT_ADDRESS_TRAVEL || process.env.TRAVEL_CONTRACT_ADDRESS;

    if (!ZETAFROG_ADDRESS || !TRAVEL_ADDRESS) {
        throw new Error("❌ Missing contract addresses in .env");
    }

    console.log("📍 ZetaFrogNFT:", ZETAFROG_ADDRESS);
    console.log("📍 Travel:", TRAVEL_ADDRESS);

    // 2. Attach Contracts
    const ZetaFrogNFT = await hre.ethers.getContractFactory("ZetaFrogNFT");
    const zetaFrogNFT = ZetaFrogNFT.attach(ZETAFROG_ADDRESS);

    const Travel = await hre.ethers.getContractFactory("Travel");
    const travel = Travel.attach(TRAVEL_ADDRESS);

    // 3. Setup Test Parameters
    const frogId = 15;
    const duration = 3600; // 1 hour
    const targetChainId = 7001; // ZetaChain Athens
    // Random travel uses address(0)
    const targetWallet = "0x0000000000000000000000000000000000000000";

    console.log(`\n🐸 Checking status for Frog #${frogId}...`);

    // Check ownership
    try {
        const owner = await zetaFrogNFT.ownerOf(frogId);
        console.log(`   Owner: ${owner}`);
        if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
            console.warn("⚠️  Warning: You are not the owner of this frog. Transaction might revert.");
        }
    } catch (e) {
        console.error("❌ Frog does not exist!");
        return;
    }

    // Check status
    const status = await zetaFrogNFT.getFrogStatus(frogId);
    const statusText = ['Idle', 'Traveling', 'CrossChainLocked'][Number(status)] || 'Unknown';
    console.log(`   Status: ${statusText} (${status})`);

    // --- DIAGNOSTICS START ---
    console.log("\n🔍 Running Deep Diagnostics...");
    
    // 1. Check Paused
    try {
        const isPaused = await travel.paused();
        console.log(`   Travel Paused: ${isPaused}`);
        if (isPaused) console.warn("⚠️  Contract is PAUSED!");
    } catch { console.log("   (paused() not available)"); }

    // 2. Check Supported Chain
    try {
        const isSupported = await travel.supportedChains(targetChainId);
        console.log(`   Chain ${targetChainId} Supported: ${isSupported}`);
        if (!isSupported) console.error("❌ Chain 7001 NOT supported! This is the cause.");
    } catch (e) { console.error("   Failed to check supportedChains:", e.message); }

    // 3. Check Cooldown
    try {
        const lastEnd = await travel.lastTravelEnd(frogId);
        const cooldown = await travel.COOLDOWN_PERIOD();
        const block = await hre.ethers.provider.getBlock("latest");
        const timestamp = block.timestamp;
        
        console.log(`   Last Travel End: ${lastEnd}`);
        console.log(`   Block Timestamp: ${timestamp}`);
        console.log(`   Cooldown Period: ${cooldown}`);
        
        if (BigInt(timestamp) < BigInt(lastEnd) + BigInt(cooldown)) {
            console.error("❌ Still in Cooldown! Wait until", BigInt(lastEnd) + BigInt(cooldown));
        } else {
            console.log("✅ Cooldown check passed.");
        }
    } catch (e) { console.error("   Failed to check cooldown:", e.message); }
    // --- DIAGNOSTICS END ---

    // Handle Busy State
    if (status !== 0n) { // Not Idle
        console.log("⚠️  Frog is busy. Attempting to clear state via cancelTravel (if owner)...");
        try {
            console.log("   Sending cancelTravel tx...");
            const tx = await travel.cancelTravel(frogId);
            console.log("   Tx sent:", tx.hash);
            await tx.wait();
            console.log("✅  Travel Cancelled. Frog is now Idle.");
        } catch (e) {
            console.error("❌ Failed to cancel travel:", e.message);
            console.log("   (Maybe cooldown active? Or unauthorized?)");
            return;
        }
    }

    // 4. Execute startTravel
    console.log(`\n🚀 initiating startTravel for Frog #${frogId}...`);
    console.log(`   Target Chain: ${targetChainId}`);
    console.log(`   Duration: ${duration}s`);
    console.log(`   Target Wallet: ${targetWallet} (Random)`);

    try {
        const tx = await travel.startTravel(
            frogId,
            targetWallet,
            duration,
            targetChainId
        );
        console.log("📝 Transaction sent:", tx.hash);
        
        console.log("⏳ Waiting for confirmation...");
        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed in block", receipt.blockNumber);

        // Verify new status
        const newStatus = await zetaFrogNFT.getFrogStatus(frogId);
        console.log(`\n🎉 Success! New Status: ${['Idle', 'Traveling'][Number(newStatus)]}`);

    } catch (e) {
        console.error("❌ Transaction failed:", e.message);
        if (e.data) {
             // Try to decode error if possible, or just print data
             console.error("   Error Data:", e.data);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
