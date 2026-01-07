/**
 * Deploy Cross-Chain Travel Contracts with Test Mode
 * 
 * Deploys:
 * - OmniTravel.sol on ZetaChain
 * - FrogConnector.sol on BSC Testnet and ETH Sepolia
 * - FrogFootprint.sol on BSC Testnet and ETH Sepolia
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Contract addresses file
const ADDRESSES_FILE = path.join(__dirname, "../deployed-addresses.json");

// Load or create addresses file
function loadAddresses() {
    if (fs.existsSync(ADDRESSES_FILE)) {
        return JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf8"));
    }
    return {};
}

function saveAddresses(addresses) {
    fs.writeFileSync(ADDRESSES_FILE, JSON.stringify(addresses, null, 2));
}

// Known addresses
const ZETA_CONNECTOR = {
    zetaAthens: "0x239e96c8f17C85c30100AC26F635Ea15f23E9c67",
    bscTestnet: "0x0000028a2eb8346cd5c0267856ab7594b7a55308",
    sepolia: "0x6c533f7fe93fae114d0954697069df33c9b74fd7"
};

const ZETA_TOKEN = {
    zetaAthens: "0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf",
    bscTestnet: "0x0000c304d2934c00db1d51995b9f6996affd17c0",
    sepolia: "0x0000c9ec4042283e8139c74f4c64bcd1e0b9b54f"
};

// Existing ZetaFrogNFT address (convert to proper checksum)
const ZETA_FROG_NFT = "0x21C6C9C82C7B2317E2fa25E2cdAa29E45C84fA1f".toLowerCase();

async function main() {
    const network = hre.network.name;
    const [deployer] = await hre.ethers.getSigners();
    const addresses = loadAddresses();
    
    console.log(`\n🚀 Deploying to ${network} with account: ${deployer.address}`);
    console.log(`   Balance: ${hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH/BNB/ZETA\n`);

    if (network === "zetaAthens") {
        // Deploy OmniTravel on ZetaChain
        console.log("📦 Deploying OmniTravel...");
        
        const OmniTravel = await hre.ethers.getContractFactory("OmniTravel");
        const omniTravel = await OmniTravel.deploy(
            ZETA_FROG_NFT,
            ZETA_CONNECTOR.zetaAthens,
            ZETA_TOKEN.zetaAthens
        );
        await omniTravel.waitForDeployment();
        const omniTravelAddress = await omniTravel.getAddress();
        console.log(`   ✅ OmniTravel deployed: ${omniTravelAddress}`);
        
        // Enable test mode
        console.log("   🧪 Enabling test mode...");
        await omniTravel.setTestMode(true);
        console.log("   ✅ Test mode enabled");
        
        addresses.zetaAthens = {
            ...addresses.zetaAthens,
            omniTravel: omniTravelAddress
        };
        
    } else if (network === "bscTestnet" || network === "ethSepolia") {
        // Deploy FrogFootprint
        console.log("📦 Deploying FrogFootprint...");
        const FrogFootprint = await hre.ethers.getContractFactory("FrogFootprint");
        const frogFootprint = await FrogFootprint.deploy();
        await frogFootprint.waitForDeployment();
        const frogFootprintAddress = await frogFootprint.getAddress();
        console.log(`   ✅ FrogFootprint deployed: ${frogFootprintAddress}`);
        
        // Get OmniTravel address from ZetaChain deployment
        const omniTravelAddress = addresses.zetaAthens?.omniTravel || "0x0000000000000000000000000000000000000000";
        
        // Deploy FrogConnector
        console.log("📦 Deploying FrogConnector...");
        const FrogConnector = await hre.ethers.getContractFactory("FrogConnector");
        const connector = network === "bscTestnet" ? ZETA_CONNECTOR.bscTestnet : ZETA_CONNECTOR.sepolia;
        const token = network === "bscTestnet" ? ZETA_TOKEN.bscTestnet : ZETA_TOKEN.sepolia;
        
        const frogConnector = await FrogConnector.deploy(
            connector,
            token,
            hre.ethers.zeroPadValue(omniTravelAddress, 32) // bytes format
        );
        await frogConnector.waitForDeployment();
        const frogConnectorAddress = await frogConnector.getAddress();
        console.log(`   ✅ FrogConnector deployed: ${frogConnectorAddress}`);
        
        // Configure FrogConnector
        console.log("   ⚙️ Configuring FrogConnector...");
        
        // Set FrogFootprint
        await frogConnector.setFrogFootprint(frogFootprintAddress);
        console.log("   ✅ FrogFootprint set");
        
        // Enable test mode (20s exploration interval)
        await frogConnector.setTestMode(true);
        console.log("   ✅ Test mode enabled (20s interval)");
        
        // Set FrogConnector in FrogFootprint
        await frogFootprint.setFrogConnector(frogConnectorAddress);
        console.log("   ✅ FrogFootprint configured");
        
        addresses[network] = {
            frogConnector: frogConnectorAddress,
            frogFootprint: frogFootprintAddress
        };
    }
    
    saveAddresses(addresses);
    
    console.log("\n📋 Current deployed addresses:");
    console.log(JSON.stringify(addresses, null, 2));
    
    console.log("\n✅ Deployment complete!");
    console.log("\n📝 Next steps:");
    console.log("   1. Run this script on all networks (zetaAthens, bscTestnet, sepolia)");
    console.log("   2. Configure chain connectors in OmniTravel");
    console.log("   3. Test with setTestMode(true) for 1-minute travels");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
