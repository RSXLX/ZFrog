/**
 * Deploy OmniTravel v2 (Gateway-based)
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const ADDRESSES_FILE = path.join(__dirname, "../deployed-addresses.json");

// ZetaChain Athens-3 Testnet addresses
const ZETA_FROG_NFT = "0x21C6C9C82C7B2317E2fa25E2cdAa29E45C84fA1f";
const GATEWAY_ZEVM = "0xfEDD7A6e3Ef1cC470fbfbF955a22D793dDC0F44E"; // ZetaChain Gateway

// ZRC20 tokens for gas payment on different chains
// These represent the gas tokens of each chain on ZetaChain
const ZRC20_BSC = "0xd97B1de3619ed2c6BEb3860147E30cA8A7dC9891"; // ZRC20 BNB
const ZRC20_ETH = "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0"; // ZRC20 ETH

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
    const [deployer] = await hre.ethers.getSigners();
    const addresses = loadAddresses();
    
    console.log(`\n🚀 Deploying OmniTravel v2 (Gateway-based)`);
    console.log(`   Account: ${deployer.address}`);
    console.log(`   Balance: ${hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ZETA\n`);

    // Deploy OmniTravel
    console.log("📦 Deploying OmniTravel v2...");
    
    const OmniTravel = await hre.ethers.getContractFactory("OmniTravel");
    const omniTravel = await OmniTravel.deploy(
        ZETA_FROG_NFT,
        GATEWAY_ZEVM
    );
    await omniTravel.waitForDeployment();
    const omniTravelAddress = await omniTravel.getAddress();
    console.log(`   ✅ OmniTravel v2 deployed: ${omniTravelAddress}`);
    
    // Enable test mode
    console.log("   🧪 Enabling test mode...");
    await omniTravel.setTestMode(true);
    console.log("   ✅ Test mode enabled");

    // Configure chain connectors
    console.log("\n📍 Configuring chains...");
    
    // BSC Testnet (97)
    if (addresses.bscTestnet?.frogConnector) {
        const bscConnector = hre.ethers.zeroPadValue(addresses.bscTestnet.frogConnector, 32);
        console.log(`   Configuring BSC Testnet (97)...`);
        const tx1 = await omniTravel.setChainConfig(97, bscConnector, ZRC20_BSC);
        await tx1.wait();
        console.log("   ✅ BSC Testnet configured");
    } else {
        // Just set connector without ZRC20 for now
        console.log("   ⚠️ BSC connector not found, skipping ZRC20 config");
    }
    
    // ETH Sepolia (11155111)
    if (addresses.ethSepolia?.frogConnector) {
        const sepoliaConnector = hre.ethers.zeroPadValue(addresses.ethSepolia.frogConnector, 32);
        console.log(`   Configuring ETH Sepolia (11155111)...`);
        const tx2 = await omniTravel.setChainConfig(11155111, sepoliaConnector, ZRC20_ETH);
        await tx2.wait();
        console.log("   ✅ ETH Sepolia configured");
    } else {
        console.log("   ⚠️ Sepolia connector not found, skipping ZRC20 config");
    }

    // Update addresses file
    addresses.zetaAthens = {
        ...addresses.zetaAthens,
        omniTravel: omniTravelAddress
    };
    saveAddresses(addresses);
    console.log("\n📋 Updated deployed-addresses.json");

    // Authorize OmniTravel in ZetaFrogNFT
    console.log("\n🔐 Authorizing OmniTravel in ZetaFrogNFT...");
    const ZetaFrogNFT = await hre.ethers.getContractFactory("ZetaFrogNFT");
    const zetaFrog = ZetaFrogNFT.attach(ZETA_FROG_NFT);
    
    const tx3 = await zetaFrog.setTravelContract(omniTravelAddress);
    await tx3.wait();
    console.log("   ✅ ZetaFrogNFT authorized");

    console.log("\n" + "=".repeat(60));
    console.log("✅ DEPLOYMENT COMPLETE");
    console.log("=".repeat(60));
    console.log(`\nOmniTravel v2 Address: ${omniTravelAddress}`);
    console.log("\n⚠️  Update frontend/backend configs:");
    console.log(`   OMNI_TRAVEL_ADDRESS=${omniTravelAddress}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
