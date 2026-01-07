/**
 * Redeploy OmniTravel with fixed WZETA wrapping logic
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const ADDRESSES_FILE = path.join(__dirname, "../deployed-addresses.json");

// Known addresses
const ZETA_CONNECTOR = "0x239e96c8f17C85c30100AC26F635Ea15f23E9c67";
const ZETA_TOKEN = "0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf"; // WZETA
const ZETA_FROG_NFT = "0x21C6C9C82C7B2317E2fa25E2cdAa29E45C84fA1f";

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
    
    console.log(`\n🚀 Redeploying OmniTravel with account: ${deployer.address}`);
    console.log(`   Balance: ${hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ZETA\n`);

    // Deploy new OmniTravel
    console.log("📦 Deploying NEW OmniTravel with WZETA wrapping fix...");
    
    const OmniTravel = await hre.ethers.getContractFactory("OmniTravel");
    const omniTravel = await OmniTravel.deploy(
        ZETA_FROG_NFT,
        ZETA_CONNECTOR,
        ZETA_TOKEN
    );
    await omniTravel.waitForDeployment();
    const newOmniTravelAddress = await omniTravel.getAddress();
    console.log(`   ✅ NEW OmniTravel deployed: ${newOmniTravelAddress}`);
    
    // Enable test mode
    console.log("   🧪 Enabling test mode...");
    await omniTravel.setTestMode(true);
    console.log("   ✅ Test mode enabled");

    // Configure chain connectors
    console.log("\n📍 Configuring chain connectors...");
    
    if (addresses.bscTestnet?.frogConnector) {
        const bscConnectorBytes = hre.ethers.zeroPadValue(addresses.bscTestnet.frogConnector, 32);
        console.log(`   Setting BSC Testnet (97) connector: ${addresses.bscTestnet.frogConnector}`);
        const tx1 = await omniTravel.setChainConnector(97, bscConnectorBytes);
        await tx1.wait();
        console.log("   ✅ BSC Testnet connector set");
    }
    
    if (addresses.ethSepolia?.frogConnector) {
        const sepoliaConnectorBytes = hre.ethers.zeroPadValue(addresses.ethSepolia.frogConnector, 32);
        console.log(`   Setting ETH Sepolia (11155111) connector: ${addresses.ethSepolia.frogConnector}`);
        const tx2 = await omniTravel.setChainConnector(11155111, sepoliaConnectorBytes);
        await tx2.wait();
        console.log("   ✅ ETH Sepolia connector set");
    }

    // Update addresses file
    addresses.zetaAthens = {
        ...addresses.zetaAthens,
        omniTravel: newOmniTravelAddress
    };
    saveAddresses(addresses);
    console.log("\n📋 Updated deployed-addresses.json");

    // Now update ZetaFrogNFT to authorize the new OmniTravel
    console.log("\n🔐 Authorizing new OmniTravel in ZetaFrogNFT...");
    const ZetaFrogNFT = await hre.ethers.getContractFactory("ZetaFrogNFT");
    const zetaFrog = ZetaFrogNFT.attach(ZETA_FROG_NFT);
    
    const tx3 = await zetaFrog.setTravelContract(newOmniTravelAddress);
    await tx3.wait();
    console.log("   ✅ ZetaFrogNFT.travelContract updated to new OmniTravel");

    console.log("\n" + "=".repeat(60));
    console.log("✅ DEPLOYMENT COMPLETE");
    console.log("=".repeat(60));
    console.log(`\nNEW OmniTravel Address: ${newOmniTravelAddress}`);
    console.log("\n⚠️  IMPORTANT: Update your frontend and backend .env files with the new address!");
    console.log(`   OMNI_TRAVEL_ADDRESS=${newOmniTravelAddress}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
