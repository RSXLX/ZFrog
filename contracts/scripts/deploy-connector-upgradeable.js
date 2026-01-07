/**
 * Deploy FrogConnectorUpgradeable as UUPS Proxy
 * 
 * This script deploys the new upgradeable FrogConnector on target chains (BSC/Sepolia)
 * and updates OmniTravel on ZetaChain to point to the new addresses.
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-connector-upgradeable.js --network bscTestnet
 *   npx hardhat run scripts/deploy-connector-upgradeable.js --network sepolia
 */
const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

const ADDRESSES_FILE = path.join(__dirname, "../deployed-addresses.json");

// Zeta Connector addresses on target chains (from ZetaChain docs)
const ZETA_CONNECTORS = {
    bscTestnet: "0x0000000000000000000000000000000000000000", // Placeholder - need actual
    sepolia: "0x0000000000000000000000000000000000000000"      // Placeholder - need actual
};

const ZETA_TOKENS = {
    bscTestnet: "0x0000000000000000000000000000000000000000", // Placeholder
    sepolia: "0x0000000000000000000000000000000000000000"      // Placeholder
};

function loadAddresses() {
    if (fs.existsSync(ADDRESSES_FILE)) {
        return JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf8"));
    }
    return {};
}

function saveAddresses(addresses) {
    fs.writeFileSync(ADDRESSES_FILE, JSON.stringify(addresses, null, 2));
}

async function main() {
    const [deployer] = await ethers.getSigners();
    const addresses = loadAddresses();
    const network = hre.network.name;
    
    console.log(`\n🚀 Deploying FrogConnectorUpgradeable as UUPS Proxy`);
    console.log(`   Network: ${network}`);
    console.log(`   Account: ${deployer.address}`);
    console.log(`   Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);
    
    // Get OmniTravel address for configuration
    const omniTravelAddress = addresses.zetaAthens?.omniTravel;
    if (!omniTravelAddress) {
        console.log("⚠️  Warning: OmniTravel address not found. FrogConnector will need manual configuration.");
    }
    
    // Encode OmniTravel address as bytes for initialization
    const omniTravelBytes = omniTravelAddress 
        ? ethers.zeroPadValue(omniTravelAddress, 32)
        : ethers.zeroPadValue("0x0000000000000000000000000000000000000000", 32);
    
    let networkKey;
    let zetaConnector;
    let zetaToken;
    let chainId;
    let footprintAddress;
    
    if (network === "bscTestnet") {
        networkKey = "bscTestnet";
        zetaConnector = ZETA_CONNECTORS.bscTestnet;
        zetaToken = ZETA_TOKENS.bscTestnet;
        chainId = 97;
        footprintAddress = addresses.bscTestnet?.frogFootprint;
    } else if (network === "ethSepolia" || network === "sepolia") {
        networkKey = "ethSepolia";
        zetaConnector = ZETA_CONNECTORS.sepolia;
        zetaToken = ZETA_TOKENS.sepolia;
        chainId = 11155111;
        footprintAddress = addresses.ethSepolia?.frogFootprint;
    } else {
        console.log(`❌ Unsupported network: ${network}. Use bscTestnet or sepolia.`);
        return;
    }
    
    console.log(`📦 Deploying FrogConnectorUpgradeable Proxy on ${networkKey}...`);
    
    const FrogConnector = await ethers.getContractFactory("FrogConnectorUpgradeable");
    
    // Deploy as UUPS proxy
    const connectorProxy = await upgrades.deployProxy(
        FrogConnector,
        [zetaConnector, zetaToken, omniTravelBytes],
        { initializer: "initialize", kind: "uups" }
    );
    await connectorProxy.waitForDeployment();
    
    const connectorAddress = await connectorProxy.getAddress();
    const implAddress = await upgrades.erc1967.getImplementationAddress(connectorAddress);
    
    console.log(`   ✅ FrogConnector Proxy: ${connectorAddress}`);
    console.log(`   📦 Implementation: ${implAddress}`);
    console.log(`   📌 Version: ${await connectorProxy.version()}`);
    
    // Configure the connector
    console.log(`\n⚙️  Configuring FrogConnector...`);
    
    // Enable test mode
    await (await connectorProxy.setTestMode(true)).wait();
    console.log(`   ✅ Test mode enabled`);
    
    // Set FrogFootprint if available
    if (footprintAddress) {
        await (await connectorProxy.setFrogFootprint(footprintAddress)).wait();
        console.log(`   ✅ FrogFootprint set: ${footprintAddress}`);
    } else {
        console.log(`   ⚠️  FrogFootprint not found for ${networkKey}`);
    }
    
    // Save addresses
    if (!addresses[networkKey]) addresses[networkKey] = {};
    addresses[networkKey].frogConnector = connectorAddress;
    addresses[networkKey].frogConnectorImpl = implAddress;
    addresses[networkKey].frogConnectorDeployedAt = new Date().toISOString();
    
    // Keep old connector for reference
    const oldConnector = networkKey === "bscTestnet" 
        ? "0x9Ce2eE60a1AAc48a79b9A3eb11bf903556268674"
        : "0x63809b8CD0bD3336491B2BA2b1e7E1a1A630e86a";
    addresses[networkKey].frogConnectorOld = oldConnector;
    
    saveAddresses(addresses);
    
    console.log("\n" + "=".repeat(60));
    console.log(`📋 DEPLOYMENT SUMMARY - ${networkKey}`);
    console.log("=".repeat(60));
    console.log(`FrogConnector Proxy:  ${connectorAddress}`);
    console.log(`Implementation:       ${implAddress}`);
    console.log(`Old Connector:        ${oldConnector}`);
    console.log("=".repeat(60));
    
    console.log(`\n⚠️  NEXT STEP: Update OmniTravel on ZetaChain to point to this new connector.`);
    console.log(`   Run: npx hardhat run scripts/configure-omnitravel-proxy.js --network zetaAthens`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
