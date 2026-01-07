/**
 * Deploy Upgradeable Contracts (UUPS Proxy Pattern)
 * 
 * This script deploys all upgradeable contracts as UUPS proxies.
 * After deployment, the proxy addresses are PERMANENT and should be stored in config.
 * Future contract upgrades only need to update the implementation, not the proxy address.
 */
const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

const ADDRESSES_FILE = path.join(__dirname, "../deployed-addresses.json");

// ZetaChain Athens-3 Config
const GATEWAY_ZEVM = "0x6c533f7fe93fae114d0954697069df8eac50590a";
const SYSTEM_ROUTER = "0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe";
const WZETA = "0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf";
const ZRC20_BSC = "0xd97B1de3619ed2c6BEb3860147E30cA8A7dC9891";
const ZRC20_ETH = "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0";

// Target Chain Config (BSC Testnet / Sepolia)
// These addresses will vary per chain, using BSC placeholders:
const ZETA_CONNECTOR_BSC = "0x0000000000000000000000000000000000000000"; // Replace with actual
const ZETA_TOKEN_BSC = "0x0000000000000000000000000000000000000000";     // Replace with actual

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
    
    console.log(`\n🚀 Deploying Upgradeable Contracts as UUPS Proxies`);
    console.log(`   Network: ${network}`);
    console.log(`   Account: ${deployer.address}`);
    console.log(`   Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);
    
    // Determine what to deploy based on network
    if (network === "zetaAthens" || network === "zetaTestnet") {
        await deployZetaChainContracts(addresses, deployer);
    } else if (network === "bscTestnet") {
        await deployTargetChainConnector(addresses, deployer, 97, "bscTestnet");
    } else if (network === "sepolia") {
        await deployTargetChainConnector(addresses, deployer, 11155111, "ethSepolia");
    } else if (network === "hardhat" || network === "localhost") {
        // Deploy everything locally for testing
        await deployZetaChainContracts(addresses, deployer);
    } else {
        console.log(`❌ Unknown network: ${network}`);
        return;
    }
    
    saveAddresses(addresses);
    console.log(`\n✅ Deployment complete! Addresses saved to ${ADDRESSES_FILE}`);
}

async function deployZetaChainContracts(addresses, deployer) {
    // First, check if ZetaFrogNFT proxy exists (should already be deployed)
    // Priority: finalContracts > zetaFrogNFT_proxy > zetaFrogNFT
    let zetaFrogProxyAddress = 
        addresses.zetaAthens?.finalContracts?.zetaFrogNFT ||
        addresses.zetaAthens?.zetaFrogNFT_proxy ||
        addresses.zetaAthens?.zetaFrogNFT;
    
    if (!zetaFrogProxyAddress) {
        console.log("📦 Deploying ZetaFrogNFT Proxy...");
        const ZetaFrogNFT = await ethers.getContractFactory("ZetaFrogNFTUpgradeable");
        const zetaFrogProxy = await upgrades.deployProxy(ZetaFrogNFT, [], {
            initializer: "initialize",
            kind: "uups"
        });
        await zetaFrogProxy.waitForDeployment();
        zetaFrogProxyAddress = await zetaFrogProxy.getAddress();
        console.log(`   ✅ ZetaFrogNFT Proxy: ${zetaFrogProxyAddress}`);
    } else {
        console.log(`   ⏭️  ZetaFrogNFT Proxy exists: ${zetaFrogProxyAddress}`);
    }
    
    // Deploy OmniTravel Proxy
    console.log("\n📦 Deploying OmniTravelUpgradeable Proxy...");
    const OmniTravel = await ethers.getContractFactory("OmniTravelUpgradeable");
    const omniTravelProxy = await upgrades.deployProxy(
        OmniTravel, 
        [zetaFrogProxyAddress, GATEWAY_ZEVM], 
        { initializer: "initialize", kind: "uups" }
    );
    await omniTravelProxy.waitForDeployment();
    const omniTravelAddress = await omniTravelProxy.getAddress();
    const omniImplAddress = await upgrades.erc1967.getImplementationAddress(omniTravelAddress);
    console.log(`   ✅ OmniTravel Proxy: ${omniTravelAddress}`);
    console.log(`      Implementation: ${omniImplAddress}`);
    console.log(`      Version: ${await omniTravelProxy.version()}`);
    
    // Configure OmniTravel
    console.log("\n⚙️  Configuring OmniTravel...");
    await (await omniTravelProxy.setSystemConfig(SYSTEM_ROUTER, WZETA)).wait();
    console.log("   ✅ System Router configured");
    
    await (await omniTravelProxy.setTestMode(true)).wait();
    console.log("   ✅ Test mode enabled");
    
    // Deploy Travel Proxy (optional - for local chain travel)
    console.log("\n📦 Deploying TravelUpgradeable Proxy...");
    const Travel = await ethers.getContractFactory("TravelUpgradeable");
    const travelProxy = await upgrades.deployProxy(
        Travel,
        [zetaFrogProxyAddress],
        { initializer: "initialize", kind: "uups" }
    );
    await travelProxy.waitForDeployment();
    const travelAddress = await travelProxy.getAddress();
    console.log(`   ✅ Travel Proxy: ${travelAddress}`);
    console.log(`      Version: ${await travelProxy.version()}`);
    
    // Authorize OmniTravel in ZetaFrogNFT
    console.log("\n🔐 Authorizing OmniTravel in ZetaFrogNFT...");
    const zetaFrog = await ethers.getContractAt("ZetaFrogNFTUpgradeable", zetaFrogProxyAddress);
    await (await zetaFrog.setOmniTravelContract(omniTravelAddress)).wait();
    await (await zetaFrog.setTravelContract(travelAddress)).wait();
    console.log("   ✅ Authorization complete");
    
    // Save addresses
    addresses.zetaAthens = {
        ...addresses.zetaAthens,
        zetaFrogNFT: zetaFrogProxyAddress,
        omniTravel: omniTravelAddress,
        omniTravelImpl: omniImplAddress,
        travel: travelAddress,
        deployedAt: new Date().toISOString()
    };
    
    console.log("\n" + "=".repeat(60));
    console.log("📋 ZETACHAIN DEPLOYMENT SUMMARY");
    console.log("=".repeat(60));
    console.log(`ZetaFrogNFT Proxy:  ${zetaFrogProxyAddress}`);
    console.log(`OmniTravel Proxy:   ${omniTravelAddress}`);
    console.log(`Travel Proxy:       ${travelAddress}`);
    console.log("=".repeat(60));
    console.log("\n⚠️  IMPORTANT: These PROXY addresses are permanent!");
    console.log("   Future upgrades only change the implementation.");
}

async function deployTargetChainConnector(addresses, deployer, chainId, networkKey) {
    console.log(`\n📦 Deploying FrogConnectorUpgradeable Proxy on ${networkKey}...`);
    
    const zetaChainOmniTravel = addresses.zetaAthens?.omniTravel;
    if (!zetaChainOmniTravel) {
        console.log("❌ OmniTravel address not found. Deploy ZetaChain contracts first!");
        return;
    }
    
    const omniTravelBytes = ethers.zeroPadValue(zetaChainOmniTravel, 32);
    
    const FrogConnector = await ethers.getContractFactory("FrogConnectorUpgradeable");
    const connectorProxy = await upgrades.deployProxy(
        FrogConnector,
        [ZETA_CONNECTOR_BSC, ZETA_TOKEN_BSC, omniTravelBytes],
        { initializer: "initialize", kind: "uups" }
    );
    await connectorProxy.waitForDeployment();
    
    const connectorAddress = await connectorProxy.getAddress();
    console.log(`   ✅ FrogConnector Proxy: ${connectorAddress}`);
    console.log(`      Version: ${await connectorProxy.version()}`);
    
    // Enable test mode
    await (await connectorProxy.setTestMode(true)).wait();
    console.log("   ✅ Test mode enabled");
    
    addresses[networkKey] = {
        ...addresses[networkKey],
        frogConnector: connectorAddress,
        deployedAt: new Date().toISOString()
    };
    
    console.log("\n" + "=".repeat(60));
    console.log(`📋 ${networkKey.toUpperCase()} DEPLOYMENT SUMMARY`);
    console.log("=".repeat(60));
    console.log(`FrogConnector Proxy: ${connectorAddress}`);
    console.log("=".repeat(60));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
