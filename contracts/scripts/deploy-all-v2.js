/**
 * 🚀 Deploy All v2 (Full System)
 * 
 * Deploys the complete ZetaFrog ecosystem with correct cross-chain support.
 * 
 * Components:
 * 1. ZetaFrogNFT (v2, supports dual authorization)
 * 2. SouvenirNFT
 * 3. Travel (Local travel)
 * 4. OmniTravel (Cross-chain travel)
 * 
 * Configuration:
 * - Sets up authorizations (NFT -> Travel & OmniTravel)
 * - Configures initial constraints
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// ============ Configuration ============

// ZetaChain Athens-3 Addresses
const GATEWAY_ZEVM = "0xfEDD7A6e3Ef1cC470fbfbF955a22D793dDC0F44E";
const ZRC20_BSC = "0xd97B1de3619ed2c6BEb3860147E30cA8A7dC9891"; // BNB
const ZRC20_ETH = "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0"; // ETH

// Known Connector Addresses (from deployed-addresses.json if available, or hardcoded)
const BSC_CONNECTOR = "0x9Ce2eE60a1AAc48a79b9A3eb11bf903556268674"; // Previous deployment
const SEPOLIA_CONNECTOR = "0x63809b8CD0bD3336491B2BA2b1e7E1a1A630e86a"; // Previous deployment

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log(`\n🚀 Deploying Full System v2`);
    console.log(`   Account: ${deployer.address}`);
    console.log(`   Balance: ${hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ZETA\n`);

    // Backend Address (for TravelManager)
    const BACKEND_ADDRESS = process.env.BACKEND_SERVICE_ADDRESS || deployer.address;
    console.log(`   Backend/Relayer: ${BACKEND_ADDRESS}`);

    // 1. Deploy ZetaFrogNFT
    console.log("\n📦 1. Deploying ZetaFrogNFT...");
    // Reuse already deployed NFT to save gas/time
    const nftAddress = "0xE3dDAE91EEaF453FC28Bc0C3D9Ef99e23eC98C85";
    const ZetaFrogNFT = await hre.ethers.getContractFactory("ZetaFrogNFT");
    const zetaFrogNFT = ZetaFrogNFT.attach(nftAddress);
    console.log(`   ✅ ZetaFrogNFT: ${nftAddress} (Reused)`);

    // 2. Deploy SouvenirNFT
    console.log("\n📦 2. Deploying SouvenirNFT...");
    // Reuse deployed Souvenir
    const souvenirAddress = "0xaBFE965C4b36Ad69615767C5305C731327962135";
    const SouvenirNFT = await hre.ethers.getContractFactory("SouvenirNFT");
    const souvenirNFT = SouvenirNFT.attach(souvenirAddress);
    console.log(`   ✅ SouvenirNFT: ${souvenirAddress} (Reused)`);

    // 3. Deploy Travel (Local)
    console.log("\n📦 3. Deploying Travel (Local)...");
    const travelAddress = "0x4C3327B33bdAcF8C525D83E9Ea8955b342c075DC"; // Deployed in previous step
    const Travel = await hre.ethers.getContractFactory("Travel");
    const travelContract = Travel.attach(travelAddress);
    console.log(`   ✅ Travel: ${travelAddress} (Reused)`);

    // 4. Deploy OmniTravel (Cross-Chain)
    console.log("\n📦 4. Deploying OmniTravel (Cross-Chain)...");
    const omniAddress = "0x292AA79a2a9754014BC3f23E81f31B9b896A60B5"; // Deployed in previous step
    const OmniTravel = await hre.ethers.getContractFactory("OmniTravel");
    const omniTravel = OmniTravel.attach(omniAddress);
    console.log(`   ✅ OmniTravel: ${omniAddress} (Reused)`);

    // ============ Configuration ============
    console.log("\n⚙️  Configuring Authorization...");

    // 5. Configure ZetaFrogNFT
    console.log("   Configuring ZetaFrogNFT...");
    
    // Link Souvenir
    let tx = await zetaFrogNFT.setSouvenirNFT(souvenirAddress);
    await tx.wait();
    
    // Link Travel types
    tx = await zetaFrogNFT.setTravelContract(travelAddress);
    await tx.wait();
    
    // Link OmniTravel (If function exists - v2 expects it)
    try {
        tx = await zetaFrogNFT.setOmniTravelContract(omniAddress);
        await tx.wait();
        console.log("   - setOmniTravelContract: OK");
    } catch (e) {
        console.log("   ⚠️ setOmniTravelContract failed (Is ZetaFrogNFT updated?)", e.message);
    }

    // 6. Configure SouvenirNFT
    console.log("   Configuring SouvenirNFT...");
    tx = await souvenirNFT.setZetaFrogNFT(nftAddress);
    await tx.wait();
    tx = await souvenirNFT.setMinter(BACKEND_ADDRESS); // Allow backend to mint souvenirs
    await tx.wait();

    // 7. Configure Travel
    console.log("   Configuring Travel...");
    tx = await travelContract.setTravelManager(BACKEND_ADDRESS); // Allow backend to complete travels
    await tx.wait();
    
    // Enable chains (default supported)
    tx = await travelContract.setSupportedChain(7001, true); // ZetaChain
    await tx.wait();

    // 8. Configure OmniTravel
    console.log("   Configuring OmniTravel...");
    
    // Enable test mode
    tx = await omniTravel.setTestMode(true);
    await tx.wait();
    
    // Configure connectors
    if (BSC_CONNECTOR) {
        console.log("   - Configuring BSC Testnet (97)");
        // zeroPadValue returns a string like "0x00...123"
        const connectorBytes = hre.ethers.zeroPadValue(BSC_CONNECTOR, 32);
        tx = await omniTravel.setChainConfig(BigInt(97), connectorBytes, ZRC20_BSC);
        await tx.wait();
    }
    
    if (SEPOLIA_CONNECTOR) {
        console.log("   - Configuring Sepolia (11155111)");
        const connectorBytes = hre.ethers.zeroPadValue(SEPOLIA_CONNECTOR, 32);
        tx = await omniTravel.setChainConfig(BigInt(11155111), connectorBytes, ZRC20_ETH);
        await tx.wait();
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ SYSTEM DEPLOYMENT COMPLETE");
    console.log("=".repeat(60));
    console.log("\n📄 Update your .env / config files with these addresses:");
    console.log(`ZETAFROG_NFT_ADDRESS=${nftAddress}`);
    console.log(`SOUVENIR_NFT_ADDRESS=${souvenirAddress}`);
    console.log(`TRAVEL_CONTRACT_ADDRESS=${travelAddress}`);
    console.log(`OMNI_TRAVEL_ADDRESS=${omniAddress}`);
    console.log("=".repeat(60));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
