const hre = require("hardhat");

async function main() {
    console.log("🚀 Starting Full Normal Travel Test Flow for Frog #18...");

    // 1. Setup
    const [signer] = await hre.ethers.getSigners();
    console.log(`👤 User: ${signer.address}`);

    const TRAVEL_ADDRESS = "0x01989353c0ae1D26196E2da4814f6997aF8D437E";
    const FROG_ADDRESS = "0x21c6c9c82c7b2317e2fa25e2cdaa29e45c84fa1f"; // Correct address from .env

    const Travel = await hre.ethers.getContractAt("Travel", TRAVEL_ADDRESS, signer);
    const ZetaFrog = await hre.ethers.getContractAt("ZetaFrogNFT", FROG_ADDRESS, signer);

    const tokenId = 18;
    const duration = 60; // 60 seconds
    const targetChainId = 7001; // ZetaChain Athens

    // 2. Pre-check Status
    console.log("\n🔍 Checking initial status...");
    let frog = await ZetaFrog.getFrog(tokenId);
    let status = Number(frog.status); // 0=Idle, 1=Traveling
    console.log(`🐸 Initial Status: ${status === 0 ? "Idle" : "Traveling"}`);

    if (status !== 0) {
        console.warn("⚠️ Frog is currently traveling! Skipping Start Step and entering Monitor Mode...");
        // Fetch active ID
         try {
            const res = await fetch(`http://localhost:3001/api/travels/${tokenId}/active`);
            const json = await res.json();
            if (json.success && json.data) {
                travelId = json.data.id; // Assign to outer scope var
                console.log(`   🎉 Found Active Travel ID: ${travelId}`);
            }
        } catch (e) { console.warn("Failed to get active ID"); }

        // Skip to monitoring
    } else {

    // 3. Start Travel (with Retry)
    console.log("\n🏃 Attempting to Start Travel...");
    
    let success = false;
    let attempt = 0;

    while (!success && attempt < 5) {
        attempt++;
        try {
            console.log(`   Attempt #${attempt}...`);
            const tx = await Travel.startTravel(tokenId, hre.ethers.ZeroAddress, duration, targetChainId);
            console.log(`   ✅ Transaction sent! Hash: ${tx.hash}`);
            console.log("   ⏳ Waiting for confirmation...");
            const receipt = await tx.wait();
            
            // Parse event to find travelId
            // Event: TravelStarted(uint256 indexed tokenId, uint256 travelId, address indexed targetWallet, uint256 duration, uint256 startTime, uint256 targetChainId);
            const event = receipt.logs.map(log => {
                try { return Travel.interface.parseLog(log); } 
                catch (e) { return null; }
            }).find(parsed => parsed && parsed.name === 'TravelStarted');

            if (event) {
                travelId = event.args.travelId;
                console.log(`   🎉 Travel Started Successfully! Travel ID: ${travelId}`);
                success = true;
            } else {
                console.warn("   ⚠️ Transaction confirmed but 'TravelStarted' event not found in logs. Fetching from API...");
                success = true; 
                // Fallback: Fetch Active Travel ID
                await new Promise(r => setTimeout(r, 2000)); // Wait for backend to sync
                try {
                    const res = await fetch(`http://localhost:3001/api/travels/${tokenId}/active`);
                    const json = await res.json();
                    if (json.success && json.data) {
                        travelId = json.data.id;
                        console.log(`   🎉 Found Active Travel ID from API: ${travelId}`);
                    } else {
                         console.warn("   ⚠️ Could not fetch active travel from API.");
                    }
                } catch (e) {
                    console.warn(`   ⚠️ API Error: ${e.message}`);
                }
            }

        } catch (e) {
            console.error(`   ❌ Attempt failed: ${e.message.split('(')[0]}`); 
            if (e.message.includes("Rate limited") || e.message.includes("503")) {
                console.log("   🔄 Rate limit detected, waiting 5s...");
                await new Promise(r => setTimeout(r, 5000));
            } else if (e.message.includes("Frog is busy")) {
                console.error("   ❌ Frog is busy on-chain (race condition?)");
                return;
            } else {
                console.log("   🔄 Retrying in 5s...");
                await new Promise(r => setTimeout(r, 5000));
            }
        }
    }

    if (!success) {
        console.error("❌ Failed to start travel after 5 attempts.");
        return;
    }
  }

    // 4. Monitoring Phase (Modified for DB Check)
    console.log(`\n⏳ Travel Duration is ${duration} seconds.`);
    console.log("   We will wait for 80 seconds and monitor Backend DB via API.");

    // Helper to fetch discoveries
    async function checkDiscoveries(tid) {
        if (!tid) return 0;
        try {
            // Using global fetch (Node 18+)
            const res = await fetch(`http://localhost:3001/api/cross-chain/travel/${tid}/discoveries`);
            const json = await res.json();
            if (json.success && json.data && json.data.discoveries) {
                return json.data.discoveries.length;
            }
        } catch (e) {
            // ignore network errors
        }
        return 0;
    }

    let maxDiscoveries = 0;
    // Countdown loop with API Check
    for (let i = 80; i > 0; i -= 10) {
        const count = await checkDiscoveries(travelId);
        maxDiscoveries = Math.max(maxDiscoveries, count);
        process.stdout.write(`   Waiting... ${i}s remaining | 🔍 Discoveries in DB: ${count}\r`);
        await new Promise(r => setTimeout(r, 10000));
    }
    console.log("\n   ⏰ Time up! Checking verification...");
    
    // Final Discovery Check
    const finalCount = await checkDiscoveries(travelId);
    console.log(`\n📊 Final DB Report for Travel #${travelId}:`);
    console.log(`   Total Discoveries Persisted: ${finalCount}`);
    if (finalCount > 0) {
        console.log("   ✅ SUCCESS: Data was scanned and saved to database.");
    } else {
        console.warn("   ⚠️ WARNING: No discoveries found using API. Check backend logs.");
    }

    // 5. Verify Completion
    console.log("\n🔍 Verifying Final Status...");
    frog = await ZetaFrog.getFrog(tokenId);
    status = Number(frog.status);
    
    console.log(`🐸 Final Status: ${status} (${status === 0 ? "Idle (Success)" : "Active (Failed to Return)"})`);

    if (status === 0) {
        console.log("✅ TEST PASSED: Frog has returned to Idle.");
        
        // Check events for Souvenir?
        // We can query past events if we want, but status check implies completion.
        console.log("🎉 Full Travel Cycle Completed!");
    } else {
        console.error("❌ TEST FAILED: Frog is still Traveling.");
        console.log("   Possible causes:");
        console.log("   1. Backend 'travelProcessor' is not running or crashed.");
        console.log("   2. Backend missed the 'completion' window.");
        console.log("   3. On-chain transaction to 'completeTravel' failed (insufficient gas?).");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
