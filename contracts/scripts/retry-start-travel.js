const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Starting infinite retry script for startTravel...");

    const TRAVEL_ADDRESS = "0x01989353c0ae1D26196E2da4814f6997aF8D437E";
    const ZETA_FROG_ADDRESS = "0xb3e71048F1F2758Bd78749fc0E5db6804F09a84B"; // Checking if needed, but Travel contract checks status

    const [signer] = await ethers.getSigners();
    console.log(`👤 Using account: ${signer.address}`);

    const Travel = await ethers.getContractAt("Travel", TRAVEL_ADDRESS, signer);
    
    // Args from user request
    const tokenId = 18;
    const targetWallet = ethers.ZeroAddress; // 0x0
    const duration = 60; // 1 min (Minimum duration?) Contract says MIN_TRAVEL_DURATION = 1 minutes. So 60 is fine.
    const targetChainId = 7001;

    // Check Frog Status First
    console.log(`🐸 Checking status of Frog #${tokenId}...`);
    // Assuming ZetaFrog interface is available or we can use Travel.activeTravels to check.
    // Let's use Travel contract's activeTravels mapping check if it helps?
    // Actually, calling startTravel checks status. We can just try calling it.
    
    let success = false;
    let attempt = 0;

    while (!success) {
        attempt++;
        console.log(`\n🔄 Attempt #${attempt} to start travel...`);

        try {
            // Estimate gas first to fail fast if logic error
            // console.log("Estimating gas...");
            // await Travel.startTravel.estimateGas(tokenId, targetWallet, duration, targetChainId);
            
            console.log("Sending transaction...");
            const tx = await Travel.startTravel(tokenId, targetWallet, duration, targetChainId);
            console.log(`✅ Transaction sent! Hash: ${tx.hash}`);
            console.log("⏳ Waiting for confirmation...");
            
            const receipt = await tx.wait();
            if (receipt.status === 1) {
                console.log("🎉 Travel started successfully!");
                success = true;
            } else {
                console.error("❌ Transaction failed on chain!");
                // If it failed on chain, retrying exactly same might fail again if logic (busy).
                // But user error was "Rate limited", which prevents sending.
                // So on-chain failure -> break or analyze.
                break;
            }
        } catch (error) {
            console.error("❌ Error occurred:");
            if (error.message.includes("Rate limit") || error.message.includes("429") || error.code === "SERVER_ERROR") {
                console.log("⚠️ Rate limited or Server Error. Retrying in 5 seconds...");
                await new Promise(r => setTimeout(r, 5000));
            } else {
                console.log("⚠️ Unknown error:", error.message);
                // Check for specific revert reasons
                if (error.message.includes("Frog is busy")) {
                    console.log("⛔ Revert: Frog is busy. It might already be traveling.");
                    success = true; // Stop loop
                } else if (error.message.includes("Cooldown")) {
                    console.log("❄️ Revert: Still in cooldown. Waiting 10s...");
                    await new Promise(r => setTimeout(r, 10000));
                } else {
                    console.log("🔁 Retrying in 5s anyway...");
                    await new Promise(r => setTimeout(r, 5000));
                }
            }
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
