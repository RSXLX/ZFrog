/**
 * Deploy OmniTravel v2 with Provisions Refund
 * 
 * This script deploys the updated OmniTravel contract to ZetaChain Athens
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-omnitravel-v2.js --network zetaAthens
 */

const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("========================================");
    console.log("Deploying OmniTravel v2 (Provisions Refund)");
    console.log("========================================");
    console.log("Network:", network.name);
    console.log("Deployer:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "ZETA");
    console.log("");

    // Existing contract addresses from previous deployment
    const ZETAFROG_NFT = "0x76e7baA23fce77DA7Edbea58D8B888128D47A1Ff";
    
    // ZetaChain Athens Gateway address
    // Source: https://www.zetachain.com/docs/reference/network/contracts/
    const GATEWAY_ADDRESS = "0x6c533f7fe93fae114d0954697069df33c9b74fd7";

    console.log("Dependencies:");
    console.log("- ZetaFrogNFT:", ZETAFROG_NFT);
    console.log("- Gateway:", GATEWAY_ADDRESS);
    console.log("");

    // Deploy OmniTravel
    console.log("Deploying OmniTravel...");
    const OmniTravel = await ethers.getContractFactory("OmniTravel");
    const omniTravel = await OmniTravel.deploy(ZETAFROG_NFT, GATEWAY_ADDRESS);
    await omniTravel.waitForDeployment();
    
    const omniTravelAddress = await omniTravel.getAddress();
    console.log("✅ OmniTravel deployed to:", omniTravelAddress);
    console.log("");

    // Configure OmniTravel
    console.log("Configuring OmniTravel...");
    
    // Enable test mode
    let tx = await omniTravel.setTestMode(true);
    await tx.wait();
    console.log("- Test mode enabled");
    
    // Set travel manager to deployer
    tx = await omniTravel.setTravelManager(deployer.address);
    await tx.wait();
    console.log("- Travel manager set to:", deployer.address);

    // Configure supported chains with connectors
    const BSC_TESTNET_ID = 97;
    const ETH_SEPOLIA_ID = 11155111;
    
    // Existing FrogConnector addresses
    const BSC_CONNECTOR = "0x9Ce2eE60a1AAc48a79b9A3eb11bf903556268674";
    const ETH_CONNECTOR = "0x63809b8CD0bD3336491B2BA2b1e7E1a1A630e86a";
    
    try {
        tx = await omniTravel.setChainConnector(BSC_TESTNET_ID, BSC_CONNECTOR);
        await tx.wait();
        console.log("- BSC Testnet connector configured");
    } catch (e) {
        console.log("- BSC Testnet connector config skipped:", e.message);
    }
    
    try {
        tx = await omniTravel.setChainConnector(ETH_SEPOLIA_ID, ETH_CONNECTOR);
        await tx.wait();
        console.log("- ETH Sepolia connector configured");
    } catch (e) {
        console.log("- ETH Sepolia connector config skipped:", e.message);
    }

    // Update ZetaFrogNFT to use new OmniTravel
    console.log("\nUpdating ZetaFrogNFT...");
    const ZetaFrogNFT = await ethers.getContractFactory("ZetaFrogNFT");
    const zetaFrogNFT = ZetaFrogNFT.attach(ZETAFROG_NFT);
    
    try {
        tx = await zetaFrogNFT.setOmniTravelContract(omniTravelAddress);
        await tx.wait();
        console.log("✅ ZetaFrogNFT updated to use new OmniTravel");
    } catch (e) {
        console.log("⚠️ Failed to update ZetaFrogNFT:", e.message);
        console.log("   You may need to do this manually if you're not the owner");
    }

    // Save deployment info
    const deploymentInfo = {
        contractName: "OmniTravel",
        version: "v2-provisions-refund",
        network: network.name,
        chainId: 7001,
        address: omniTravelAddress,
        gateway: GATEWAY_ADDRESS,
        zetaFrogNFT: ZETAFROG_NFT,
        deployedAt: new Date().toISOString(),
        features: [
            "ProvisionsRefunded event",
            "_refundRemainingProvisions function",
            "getRemainingProvisions view function"
        ]
    };

    const deploymentFile = path.join(__dirname, "..", "deployments", "OmniTravel-v2-zetaAthens.json");
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("\nDeployment saved to:", deploymentFile);

    // Update deployed-addresses.json
    const addressesFile = path.join(__dirname, "..", "deployed-addresses.json");
    let addresses = {};
    try {
        addresses = JSON.parse(fs.readFileSync(addressesFile, "utf8"));
    } catch (e) {}
    
    addresses.zetaAthens = {
        ...addresses.zetaAthens,
        omniTravel: omniTravelAddress,
        omniTravelV2: omniTravelAddress,
        zetaFrogNFT: ZETAFROG_NFT,
        gateway: GATEWAY_ADDRESS
    };
    
    fs.writeFileSync(addressesFile, JSON.stringify(addresses, null, 2));
    console.log("Updated:", addressesFile);

    // Summary
    console.log("\n========================================");
    console.log("Deployment Summary");
    console.log("========================================");
    console.log("OmniTravel v2:", omniTravelAddress);
    console.log("");
    console.log("📋 Next Steps:");
    console.log("1. Update backend .env:");
    console.log(`   OMNITRAVEL_ADDRESS=${omniTravelAddress}`);
    console.log("2. Update FrogConnectors on target chains to point to new OmniTravel");
    console.log("3. Test provisions refund by completing a cross-chain travel");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
