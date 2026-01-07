const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("🛠️  Fixing Chain Support with account:", deployer.address);

    const TRAVEL_ADDRESS = process.env.VITE_CONTRACT_ADDRESS_TRAVEL || process.env.TRAVEL_CONTRACT_ADDRESS;

    if (!TRAVEL_ADDRESS) {
        throw new Error("❌ Missing TRAVEL_CONTRACT_ADDRESS in .env");
    }

    console.log("📍 Travel Contract:", TRAVEL_ADDRESS);

    // Check code size
    const code = await hre.ethers.provider.getCode(TRAVEL_ADDRESS);
    if (code === "0x") {
        throw new Error("❌ No contract at this address!");
    }
    console.log(`   Contract Code Size: ${code.length / 2 - 1} bytes`);

    const Travel = await hre.ethers.getContractFactory("Travel");
    const travel = Travel.attach(TRAVEL_ADDRESS);
    
    // Check status
    const isSupported = await travel.supportedChains(7001);
    console.log(`Initial Status - Chain 7001 Supported: ${isSupported}`);



    // Verify Owner again
    const owner = await travel.owner();
    console.log(`   Contract Owner: ${owner}`);
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
        throw new Error(`❌ Owner Mismatch! Contract: ${owner}, You: ${deployer.address}`);
    }

    if (!isSupported) {
        console.log("⚠️  Chain 7001 not supported. Enabling now (with manual gasLimit)...");
        try {
            // Force Gas Limit because estimation might fail if node is glitchy
            const tx = await travel.setSupportedChain(7001, true, { gasLimit: 500000 });
            console.log("   Tx sent:", tx.hash);
            await tx.wait();
            console.log("✅  Chain 7001 Enabled!");
        } catch (e) {
            console.error("❌ Tx Failed:", e);
            // Try to dump error data
            if (e.data) console.error("   Error Data:", e.data);
            if (e.transaction) console.error("   Tx Data:", e.transaction.data);
        }
    } else {
        console.log("✅  Chain 7001 is already supported.");
    }
    
    // Also re-verify
    const finalStatus = await travel.supportedChains(7001);
    console.log(`Final Status - Chain 7001 Supported: ${finalStatus}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
