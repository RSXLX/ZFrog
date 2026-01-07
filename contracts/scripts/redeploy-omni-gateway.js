const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const ADDRESSES_FILE = path.join(__dirname, "../deployed-addresses.json");

// ZetaChain Athens-3 Config
const ZETA_FROG_NFT = "0x0721CDff3291a1Dd2af28633B5dEE5427553F09E"; // Current Proxy from deployed-addresses.json
const GATEWAY_ZEVM = "0x6c533f7fe93fae114d0954697069df8eac50590a"; // Standard Athens-3 Gateway
const SYSTEM_ROUTER = "0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe";
const WZETA = "0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf";

// ZRC20 Tokens
const ZRC20_BSC = "0xd97B1de3619ed2c6BEb3860147E30cA8A7dC9891";
const ZRC20_ETH = "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0"; 

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
    
    console.log(`\n🚀 Redeploying OmniTravel (Gateway + ZETA-Only Mode)`);
    console.log(`   Account: ${deployer.address}`);
    
    // 1. Deploy New Contract
    console.log("\n📦 Deploying new OmniTravel contract...");
    const OmniTravel = await hre.ethers.getContractFactory("OmniTravel");
    const omniTravel = await OmniTravel.deploy(ZETA_FROG_NFT, GATEWAY_ZEVM);
    await omniTravel.waitForDeployment();
    
    const newAddress = await omniTravel.getAddress();
    console.log(`   ✅ New OmniTravel Deployed: ${newAddress}`);

    // 2. Configure System Config (ZETA-Only Magic)
    console.log("\n⚙️  Configuring System Router (Internal Swap)...");
    const tx1 = await omniTravel.setSystemConfig(SYSTEM_ROUTER, WZETA);
    await tx1.wait();
    console.log(`   ✅ System Configured (Router: ${SYSTEM_ROUTER})`);

    // 3. Configure Chains
    console.log("\n📍 Configuring Chains...");
    
    // BSC Testnet
    if (addresses.bscTestnet?.frogConnector) {
        console.log("   Legacy Connector (BSC):", addresses.bscTestnet.frogConnector);
        // Ensure bytes padding
        const connectorBytes = hre.ethers.zeroPadValue(addresses.bscTestnet.frogConnector, 32);
        const tx2 = await omniTravel.setChainConfig(97, connectorBytes, ZRC20_BSC);
        await tx2.wait();
        console.log("   ✅ BSC Testnet Configured");
    }

    // Sepolia
    if (addresses.ethSepolia?.frogConnector) {
        console.log("   Legacy Connector (Sepolia):", addresses.ethSepolia.frogConnector);
        const connectorBytes = hre.ethers.zeroPadValue(addresses.ethSepolia.frogConnector, 32);
        const tx3 = await omniTravel.setChainConfig(11155111, connectorBytes, ZRC20_ETH);
        await tx3.wait();
        console.log("   ✅ ETH Sepolia Configured");
    }

    // 4. Authorize New Contract in ZetaFrogNFT
    console.log("\n🔐 Updating Authority in ZetaFrogNFT...");
    const ZetaFrogNFT = await hre.ethers.getContractFactory("contracts/upgradeable/ZetaFrogNFTUpgradeable.sol:ZetaFrogNFTUpgradeable");
    const zetaFrog = ZetaFrogNFT.attach(ZETA_FROG_NFT);
    
    const tx4 = await zetaFrog.setOmniTravelContract(newAddress);
    await tx4.wait();
    console.log("   ✅ Authority Transferred to New OmniTravel Contract");

    // 5. Save & Output
    addresses.zetaAthens = {
        ...addresses.zetaAthens,
        omniTravel: newAddress
    };
    saveAddresses(addresses);
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ REDEPLOYMENT COMPLETE");
    console.log("=".repeat(60));
    console.log(`New OmniTravel Address: ${newAddress}`);
    console.log("\n⚠️  ACTION REQUIRED: Update your .env files with verify!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
