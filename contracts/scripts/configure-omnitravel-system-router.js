const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Starting System Router Configuration...");

    // 1. Get Network & Signer
    const network = hre.network.name;
    const [deployer] = await hre.ethers.getSigners();
    console.log(`Command sent from: ${deployer.address} on network: ${network}`);

    if (network !== "zetaAthens") {
        console.error("❌ This script is intended for zetaAthens network only.");
        return;
    }

    // 2. Load Deployed Addresses
    const addressesPath = path.join(__dirname, "../deployed-addresses.json");
    if (!fs.existsSync(addressesPath)) {
        throw new Error("❌ deployed-addresses.json not found!");
    }
    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
    const omniTravelAddress = addresses.zetaAthens?.omniTravel;

    if (!omniTravelAddress) {
        throw new Error("❌ OmniTravel address not found in deployed-addresses.json");
    }
    console.log(`📍 OmniTravel Contract: ${omniTravelAddress}`);

    // 3. Define System Addresses (ZetaChain Athens 3)
    // Retrieved from @zetachain/protocol-contracts via print-zeta-addresses.js
    const SYSTEM_ROUTER = "0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe";
    const WZETA = "0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf";

    console.log(`🔧 Configuring System Router: ${SYSTEM_ROUTER}`);
    console.log(`🔧 Configuring WZETA: ${WZETA}`);

    // 4. Get Contract Instance
    // Try OmniTravelUpgradeable first, fallback to OmniTravel if needed
    let omniTravel;
    try {
        omniTravel = await hre.ethers.getContractAt("OmniTravelUpgradeable", omniTravelAddress);
    } catch (e) {
        console.log("⚠️ OmniTravelUpgradeable artifact not found, trying OmniTravel...");
        omniTravel = await hre.ethers.getContractAt("OmniTravel", omniTravelAddress);
    }

    // 5. Check Current Config (Optional, assuming getter exists or just overwrite)
    try {
        const currentRouter = await omniTravel.systemRouter();
        const currentWzeta = await omniTravel.wzeta();
        
        if (currentRouter === SYSTEM_ROUTER && currentWzeta === WZETA) {
            console.log("✅ Configuration already correct. Skipping transaction.");
            return;
        }
    } catch (error) {
        console.log("ℹ️ Could not read current config (public getters might be missing or different). Proceeding to configure.");
    }

    // 6. Send Transaction
    console.log("📝 Sending setSystemConfig transaction...");
    const tx = await omniTravel.setSystemConfig(SYSTEM_ROUTER, WZETA);
    console.log(`⏳ Transaction sent: ${tx.hash}`);
    
    await tx.wait();
    console.log("✅ Transaction confirmed!");
    console.log("🎉 System Router Configured Successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
