const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("🔍 Checking Ownership with account:", deployer.address);

    const TRAVEL_ADDRESS = process.env.VITE_CONTRACT_ADDRESS_TRAVEL || process.env.TRAVEL_CONTRACT_ADDRESS;
    if (!TRAVEL_ADDRESS) throw new Error("Missing TRAVEL_CONTRACT_ADDRESS");

    console.log("📍 Travel Contract:", TRAVEL_ADDRESS);

    const Travel = await hre.ethers.getContractFactory("Travel");
    const travel = Travel.attach(TRAVEL_ADDRESS);

    try {
        const owner = await travel.owner();
        console.log("👑 Contract Owner:", owner);
        console.log("👤 Your Account:  ", deployer.address);
        
        if (owner.toLowerCase() === deployer.address.toLowerCase()) {
            console.log("✅ You are the owner.");
        } else {
            console.error("❌ YOU ARE NOT THE OWNER! Execution will revert.");
            // Check if backend service is owner?
            const backend = process.env.BACKEND_SERVICE_ADDRESS;
            if (backend && owner.toLowerCase() === backend.toLowerCase()) {
                console.log("💡 The Backend Service Address is the owner.");
                console.log("   Address:", backend);
            }
        }
    } catch (e) {
        console.error("❌ Failed to get owner:", e.message);
    }

    // IDENTITY CHECK
    console.log("\n🔍 Checking Contract Identity...");
    try {
        // OmniTravel has 'gateway' public variable
        const OmniTravel = await hre.ethers.getContractFactory("OmniTravel");
        const omni = OmniTravel.attach(TRAVEL_ADDRESS);
        const gateway = await omni.gateway();
        console.log("🚨 MATCH FOUND: This is the OMNI_TRAVEL Contract!");
        console.log("   Gateway Address:", gateway);
        console.log("❌ CRITICAL ERROR: You are using the Cross-Chain Contract for Local Travel.");
        console.log("   Please update .env with the correct Travel.sol address, or deploy it if missing.");
    } catch (e) {
        console.log("✅ Identity Check: Not OmniTravel (gateway() call failed).");
    }

    try {
        // Travel has 'supportedChains' (Omni has it too, but we check specific behavior?)
        // Travel has 'travelJournals'
        const travelJournals = await travel.travelJournals(0); // might revert if no journal or out of bounds
        // If it reverts with legitimate error, it might be Travel.
        // If "Function selector not recognized", then not Travel.
    } catch (e) {
       // ignore
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
