const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("🛠️  Fixing Travel Permissions & State with account:", deployer.address);

    // 1. Get Contract Addresses from Env or arguments
    const ZETAFROG_ADDRESS = process.env.ZETAFROG_NFT_ADDRESS || process.env.VITE_CONTRACT_ADDRESS_ZETAFROG;
    const TRAVEL_ADDRESS = process.env.TRAVEL_CONTRACT_ADDRESS || process.env.VITE_CONTRACT_ADDRESS_TRAVEL;

    if (!ZETAFROG_ADDRESS || !TRAVEL_ADDRESS) {
        throw new Error("❌ Missing addresses! Please set ZETAFROG_NFT_ADDRESS and TRAVEL_CONTRACT_ADDRESS in .env");
    }

    console.log("📍 ZetaFrogNFT:", ZETAFROG_ADDRESS);
    console.log("📍 Travel:", TRAVEL_ADDRESS);

    // 2. Attach Contracts
    const ZetaFrogNFT = await hre.ethers.getContractFactory("ZetaFrogNFT");
    const zetaFrogNFT = ZetaFrogNFT.attach(ZETAFROG_ADDRESS);

    const Travel = await hre.ethers.getContractFactory("Travel");
    const travel = Travel.attach(TRAVEL_ADDRESS);

    // 3. Check Permissions
    console.log("\n🔍 Checking Permissions...");
    const currentTravelContract = await zetaFrogNFT.travelContract();
    console.log("   Current Authorized Travel Contract:", currentTravelContract);

    if (currentTravelContract.toLowerCase() !== TRAVEL_ADDRESS.toLowerCase()) {
        console.log("⚠️  Mismatch detected! Updating authorization...");
        const tx = await zetaFrogNFT.setTravelContract(TRAVEL_ADDRESS);
        await tx.wait();
        console.log("✅  Permission Updated: ZetaFrogNFT -> Travel");
    } else {
        console.log("✅  Permissions are correct.");
    }

    // 4. Optional: Check Frog Status (if a tokenId is provided)
    // Run with: npx hardhat run scripts/fix-travel-permission.js --network zetaAthens 
    // If you want to fix a specific frog: modify this script or default to checking ID 1-10
    
    // Check first 20 frogs for stuck status
    console.log("\n🔍 Checking Frog Statuses (IDs 0-19)...");
    for (let i = 0; i < 20; i++) {
        try {
            // Check existence by ownership
            // But ownerOf reverts if not exists.
            // We use try-catch
            try {
                await zetaFrogNFT.ownerOf(i);
            } catch {
                continue; // ID doesn't exist
            }

            const status = await zetaFrogNFT.getFrogStatus(i);
            if (status === 1n) { // Traveling
                console.log(`🐸 Frog #${i} is TRAVELING.`);
                
                // Inspect Travel Contract state
                const session = await travel.getActiveTravel(i);
                console.log(`   - Travel Session: EndTime=${session.endTime}, Completed=${session.completed}`);
                
                // If Travel Contract says completed but Frog is Traveling, or session is empty/invalid
                // We might need to fix it.
                // But for now, just logging.
                
                // UNCOMMENT BELOW TO FORCE RESET BUSY FROGS
                /*
                console.log("   ⚠️  Resetting stuck frog...");
                // 1. Set admin as travel manager temporarily if needed? No, setTravelContract to admin
                // This is risky. Better just rely on Permission Fix for now.
                */
            }
        } catch (e) {
            // ignore
        }
    }

    console.log("\n✅ Fix Script Finished.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
