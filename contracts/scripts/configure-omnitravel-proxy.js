/**
 * Configure Chain Connectors on OmniTravel Proxy
 * 
 * This script configures chain connectors and ZRC20 addresses on the newly deployed
 * OmniTravel UUPS proxy.
 */
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const ADDRESSES_FILE = path.join(__dirname, "../deployed-addresses.json");

// ZetaChain Athens-3 Config
const SYSTEM_ROUTER = "0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe";
const WZETA = "0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf";
const ZRC20_BSC = "0xd97B1de3619ed2c6BEb3860147E30cA8A7dC9891";
const ZRC20_ETH = "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0";

function loadAddresses() {
    return JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf8"));
}

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    const addresses = loadAddresses();
    
    // Get the NEW OmniTravel proxy address
    const OMNI_TRAVEL_ADDRESS = addresses.zetaAthens?.omniTravel;
    if (!OMNI_TRAVEL_ADDRESS) {
        throw new Error("OmniTravel address not found in deployed-addresses.json");
    }
    
    console.log(`\n🔧 Configuring OmniTravel (UUPS Proxy)`);
    console.log(`   Proxy Address: ${OMNI_TRAVEL_ADDRESS}`);
    console.log(`   Account: ${deployer.address}\n`);
    
    // Attach to the proxy using the Upgradeable ABI
    const omniTravel = await hre.ethers.getContractAt("OmniTravelUpgradeable", OMNI_TRAVEL_ADDRESS);
    
    // Verify version
    const version = await omniTravel.version();
    console.log(`   Contract Version: ${version}`);
    
    // Check current system config
    const currentRouter = await omniTravel.systemRouter();
    const currentWzeta = await omniTravel.wzeta();
    console.log(`\n📊 Current System Config:`);
    console.log(`   Router: ${currentRouter}`);
    console.log(`   WZETA: ${currentWzeta}`);
    
    // Configure System Router if not set
    if (currentRouter === "0x0000000000000000000000000000000000000000") {
        console.log(`\n⚙️  Setting System Config...`);
        const tx = await omniTravel.setSystemConfig(SYSTEM_ROUTER, WZETA);
        await tx.wait();
        console.log(`   ✅ System Config Set`);
    } else {
        console.log(`   ✅ System Config already set`);
    }
    
    // Configure BSC Testnet
    console.log(`\n⚙️  Configuring BSC Testnet (chainId: 97)...`);
    const bscConnector = addresses.bscTestnet?.frogConnector;
    if (bscConnector) {
        const connectorBytes = hre.ethers.zeroPadValue(bscConnector, 32);
        const tx1 = await omniTravel.setChainConfig(97, connectorBytes, ZRC20_BSC);
        await tx1.wait();
        console.log(`   ✅ BSC Connector: ${bscConnector}`);
        console.log(`   ✅ BSC ZRC20: ${ZRC20_BSC}`);
    } else {
        console.log(`   ❌ BSC Connector not found in addresses`);
    }
    
    // Configure ETH Sepolia
    console.log(`\n⚙️  Configuring ETH Sepolia (chainId: 11155111)...`);
    const sepoliaConnector = addresses.ethSepolia?.frogConnector;
    if (sepoliaConnector) {
        const connectorBytes = hre.ethers.zeroPadValue(sepoliaConnector, 32);
        const tx2 = await omniTravel.setChainConfig(11155111, connectorBytes, ZRC20_ETH);
        await tx2.wait();
        console.log(`   ✅ Sepolia Connector: ${sepoliaConnector}`);
        console.log(`   ✅ Sepolia ZRC20: ${ZRC20_ETH}`);
    } else {
        console.log(`   ❌ Sepolia Connector not found in addresses`);
    }
    
    // Verify configuration
    console.log(`\n📊 Verification:`);
    console.log(`   supportedChains[97]: ${await omniTravel.supportedChains(97)}`);
    console.log(`   supportedChains[11155111]: ${await omniTravel.supportedChains(11155111)}`);
    
    console.log(`\n🎉 Configuration Complete!`);
}

main().catch(console.error);
