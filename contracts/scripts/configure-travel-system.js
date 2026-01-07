/**
 * Configure Cross-Chain Travel System
 * 
 * Configures:
 * - Chain connectors in OmniTravel
 * - Test mode settings
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Load deployed addresses
const ADDRESSES_FILE = path.join(__dirname, "../deployed-addresses.json");
const addresses = JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf8"));

console.log("📋 Loaded addresses:", JSON.stringify(addresses, null, 2));

async function main() {
    const network = hre.network.name;
    const [deployer] = await hre.ethers.getSigners();
    
    console.log(`\n⚙️ Configuring on ${network} with account: ${deployer.address}\n`);

    if (network === "zetaAthens") {
        // Configure OmniTravel with chain connectors
        const omniTravelAddress = addresses.zetaAthens?.omniTravel;
        if (!omniTravelAddress) {
            throw new Error("OmniTravel address not found");
        }
        
        const OmniTravel = await hre.ethers.getContractFactory("OmniTravel");
        const omniTravel = OmniTravel.attach(omniTravelAddress);
        
        console.log("📍 Configuring chain connectors...");
        
        // BSC Testnet connector
        if (addresses.bscTestnet?.frogConnector) {
            const bscConnectorBytes = hre.ethers.zeroPadValue(addresses.bscTestnet.frogConnector, 32);
            console.log(`   Setting BSC Testnet (97) connector: ${addresses.bscTestnet.frogConnector}`);
            const tx1 = await omniTravel.setChainConnector(97, bscConnectorBytes);
            await tx1.wait();
            console.log("   ✅ BSC Testnet connector set");
        }
        
        // ETH Sepolia connector
        if (addresses.ethSepolia?.frogConnector) {
            const sepoliaConnectorBytes = hre.ethers.zeroPadValue(addresses.ethSepolia.frogConnector, 32);
            console.log(`   Setting ETH Sepolia (11155111) connector: ${addresses.ethSepolia.frogConnector}`);
            const tx2 = await omniTravel.setChainConnector(11155111, sepoliaConnectorBytes);
            await tx2.wait();
            console.log("   ✅ ETH Sepolia connector set");
        }
        
        // Verify test mode is enabled
        const testMode = await omniTravel.testMode();
        console.log(`\n🧪 Test mode: ${testMode ? "ENABLED" : "DISABLED"}`);
        
    } else if (network === "bscTestnet" || network === "ethSepolia") {
        // Configure FrogConnector on target chain
        const connectorAddress = addresses[network]?.frogConnector;
        if (!connectorAddress) {
            throw new Error(`FrogConnector address not found for ${network}`);
        }
        
        const FrogConnector = await hre.ethers.getContractFactory("FrogConnector");
        const frogConnector = FrogConnector.attach(connectorAddress);
        
        // Ensure test mode is enabled
        console.log("🧪 Checking test mode...");
        const testMode = await frogConnector.testMode();
        if (!testMode) {
            console.log("   Enabling test mode...");
            const tx = await frogConnector.setTestMode(true);
            await tx.wait();
            console.log("   ✅ Test mode enabled");
        } else {
            console.log("   ✅ Test mode already enabled");
        }
        
        // Get exploration interval
        const interval = await frogConnector.getExplorationInterval();
        console.log(`   Exploration interval: ${interval} seconds`);
    }
    
    console.log("\n✅ Configuration complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Configuration failed:", error);
        process.exit(1);
    });
