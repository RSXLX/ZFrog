const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("🚀 Starting Full Cycle Test with account:", deployer.address);

    const ZETAFROG_ADDRESS = process.env.VITE_CONTRACT_ADDRESS_ZETAFROG || process.env.ZETAFROG_NFT_ADDRESS;
    const TRAVEL_ADDRESS = process.env.VITE_CONTRACT_ADDRESS_TRAVEL || process.env.TRAVEL_CONTRACT_ADDRESS;

    if (!ZETAFROG_ADDRESS || !TRAVEL_ADDRESS) {
        throw new Error("Missing contract addresses in .env");
    }

    console.log("📍 ZetaFrogNFT:", ZETAFROG_ADDRESS);
    console.log("📍 Travel:      ", TRAVEL_ADDRESS);

    const ZetaFrogNFT = await hre.ethers.getContractFactory("ZetaFrogNFT");
    const zetaFrogNFT = ZetaFrogNFT.attach(ZETAFROG_ADDRESS);

    const Travel = await hre.ethers.getContractFactory("Travel");
    const travel = Travel.attach(TRAVEL_ADDRESS);

    // 1. Mint a new Frog
    console.log("\n🐸 1. Minting new Frog...");
    const txMint = await zetaFrogNFT.mintFrog("AutoTestFrog");
    const receiptMint = await txMint.wait();
    
    // Find Token ID from events
    const mintEvent = receiptMint.logs.find(log => {
        try { return zetaFrogNFT.interface.parseLog(log)?.name === 'FrogMinted'; } catch (e) { return false; }
    });
    const tokenId = zetaFrogNFT.interface.parseLog(mintEvent).args.tokenId;
    console.log(`✅ Minted Frog ID: ${tokenId}`);

    // 2. Start Travel (Random, 60s)
    console.log("\n🎒 2. Starting Random Travel (60s)...");
    const duration = 60; // 1 minute (Minimum)
    const txStart = await travel.startTravel(
        tokenId, 
        "0x0000000000000000000000000000000000000000", // Random
        duration, 
        7001 // ZetaChain
    );
    await txStart.wait();
    console.log("✅ Travel Started!");

    // 3. Verify Status
    let status = await zetaFrogNFT.getFrogStatus(tokenId);
    console.log(`   Current Status: ${status === 1n ? "Traveling" : "Idle"}`);
    if (status !== 1n) throw new Error("Frog failed to start traveling");

    // 4. Wait for Completion
    console.log("\n⏳ 3. Waiting for Backend to process (approx 90s)...");
    
    // Poll every 10 seconds
    const maxRetries = 15; // 150 seconds max
    for (let i = 0; i < maxRetries; i++) {
        await new Promise(r => setTimeout(r, 10000));
        process.stdout.write(`   Checking... (${(i+1)*10}s) `);
        
        status = await zetaFrogNFT.getFrogStatus(tokenId);
        const session = await travel.getActiveTravel(tokenId);
        
        if (status === 0n) { // Idle
            console.log("\n🎉 FROG IS IDLE! Travel Completed!");
            
            // Check journal presence?
            const journals = await travel.getTravelJournals(tokenId);
            console.log(`   Journals count: ${journals.length}`);
            if (journals.length > 0) {
                console.log(`   Latest Journal Hash: ${journals[journals.length-1]}`);
                console.log("\n✅ TEST PASSED SUCCESSFULLLY");
            } else {
                 console.log("\n⚠️  Travel ended but no journal found on-chain (maybe failed?)");
            }
            return;
        } else {
            // Still traveling
            const now = Math.floor(Date.now() / 1000);
            const endTime = Number(session.endTime);
            if (now > endTime) {
                console.log(`[Expired, Waiting for Backend...]`);
            } else {
                console.log(`[Traveling, ${endTime - now}s remaining]`);
            }
        }
    }

    console.error("\n❌ TIMEOUT: Backend failed to complete travel in time.");
    process.exit(1);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
