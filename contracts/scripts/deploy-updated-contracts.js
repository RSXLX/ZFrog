/**
 * Deploy Updated Contracts
 * 
 * This script deploys the updated OmniTravel and FrogConnector contracts
 * with the new provisions refund and smart return threshold features.
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-updated-contracts.js --network zetachain_athens
 *   npx hardhat run scripts/deploy-updated-contracts.js --network bsc_testnet
 */

const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("========================================");
    console.log("Deploying Updated Contracts");
    console.log("========================================");
    console.log("Network:", network.name);
    console.log("Deployer:", deployer.address);
    console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
    console.log("");

    // Load existing deployment addresses
    const deploymentFile = path.join(__dirname, "..", "deployments", `${network.name}.json`);
    let existingDeployment = {};
    
    try {
        existingDeployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
        console.log("Found existing deployment:", deploymentFile);
    } catch (e) {
        console.log("No existing deployment found, will create new file");
    }

    const deployedContracts = {};

    // For ZetaChain: Deploy updated OmniTravel
    if (network.name === "zetachain_athens" || network.name === "zetachain_mainnet") {
        console.log("\n--- Deploying OmniTravel ---");
        
        // Get existing ZetaFrogNFT address
        const zetaFrogNFTAddress = existingDeployment.ZetaFrogNFT || process.env.ZETAFROG_NFT_ADDRESS;
        const gatewayAddress = existingDeployment.Gateway || process.env.GATEWAY_ADDRESS;
        
        if (!zetaFrogNFTAddress || !gatewayAddress) {
            console.error("Error: ZetaFrogNFT or Gateway address not found");
            console.error("Please set ZETAFROG_NFT_ADDRESS and GATEWAY_ADDRESS in .env");
            process.exit(1);
        }

        const OmniTravel = await ethers.getContractFactory("OmniTravel");
        const omniTravel = await OmniTravel.deploy(zetaFrogNFTAddress, gatewayAddress);
        await omniTravel.waitForDeployment();
        
        const omniTravelAddress = await omniTravel.getAddress();
        console.log("OmniTravel deployed to:", omniTravelAddress);
        
        // Configure OmniTravel
        console.log("Configuring OmniTravel...");
        
        // Set test mode
        await omniTravel.setTestMode(true);
        console.log("- Test mode enabled");
        
        // Set travel manager
        await omniTravel.setTravelManager(deployer.address);
        console.log("- Travel manager set to:", deployer.address);
        
        // Update ZetaFrogNFT to reference new OmniTravel
        const ZetaFrogNFT = await ethers.getContractFactory("ZetaFrogNFT");
        const zetaFrogNFT = ZetaFrogNFT.attach(zetaFrogNFTAddress);
        await zetaFrogNFT.setOmniTravelContract(omniTravelAddress);
        console.log("- ZetaFrogNFT updated to use new OmniTravel");
        
        deployedContracts.OmniTravel = omniTravelAddress;
        deployedContracts.OmniTravelVersion = "v2-provisions-refund";

    } else {
        // For target chains: Deploy updated FrogConnector
        console.log("\n--- Deploying FrogConnector ---");
        
        // Get ZetaConnector and ZetaToken addresses
        const zetaConnectorAddress = existingDeployment.ZetaConnector || process.env.ZETA_CONNECTOR_ADDRESS;
        const zetaTokenAddress = existingDeployment.ZetaToken || process.env.ZETA_TOKEN_ADDRESS;
        const omniTravelBytes = existingDeployment.OmniTravelBytes || process.env.OMNI_TRAVEL_BYTES;
        
        if (!zetaConnectorAddress || !zetaTokenAddress) {
            console.error("Error: ZetaConnector or ZetaToken address not found");
            process.exit(1);
        }

        const FrogConnector = await ethers.getContractFactory("FrogConnector");
        const frogConnector = await FrogConnector.deploy(
            zetaConnectorAddress,
            zetaTokenAddress,
            omniTravelBytes || ethers.toUtf8Bytes("0x0000000000000000000000000000000000000000")
        );
        await frogConnector.waitForDeployment();
        
        const frogConnectorAddress = await frogConnector.getAddress();
        console.log("FrogConnector deployed to:", frogConnectorAddress);
        
        // Configure FrogConnector
        console.log("Configuring FrogConnector...");
        
        // Set test mode
        await frogConnector.setTestMode(true);
        console.log("- Test mode enabled");
        
        // Set smart return thresholds (can be adjusted)
        const emergencyThreshold = ethers.parseEther("0.005");
        const returnBuffer = ethers.parseEther("0.002");
        await frogConnector.setReturnThresholds(emergencyThreshold, returnBuffer);
        console.log("- Return thresholds set (emergency:", ethers.formatEther(emergencyThreshold), "ETH, buffer:", ethers.formatEther(returnBuffer), "ETH)");
        
        // Deploy FrogFootprint if needed
        if (!existingDeployment.FrogFootprint) {
            console.log("\n--- Deploying FrogFootprint ---");
            const FrogFootprint = await ethers.getContractFactory("FrogFootprint");
            const frogFootprint = await FrogFootprint.deploy();
            await frogFootprint.waitForDeployment();
            
            const frogFootprintAddress = await frogFootprint.getAddress();
            console.log("FrogFootprint deployed to:", frogFootprintAddress);
            
            // Configure FrogFootprint
            await frogFootprint.setFrogConnector(frogConnectorAddress);
            console.log("- FrogFootprint connected to FrogConnector");
            
            // Set FrogFootprint in FrogConnector
            await frogConnector.setFrogFootprint(frogFootprintAddress);
            console.log("- FrogConnector connected to FrogFootprint");
            
            deployedContracts.FrogFootprint = frogFootprintAddress;
        }
        
        deployedContracts.FrogConnector = frogConnectorAddress;
        deployedContracts.FrogConnectorVersion = "v2-smart-return";
    }

    // Save deployment
    const updatedDeployment = {
        ...existingDeployment,
        ...deployedContracts,
        updatedAt: new Date().toISOString(),
        network: network.name
    };
    
    fs.mkdirSync(path.dirname(deploymentFile), { recursive: true });
    fs.writeFileSync(deploymentFile, JSON.stringify(updatedDeployment, null, 2));
    console.log("\nDeployment saved to:", deploymentFile);

    // Summary
    console.log("\n========================================");
    console.log("Deployment Summary");
    console.log("========================================");
    for (const [name, address] of Object.entries(deployedContracts)) {
        console.log(`${name}: ${address}`);
    }
    console.log("\n✅ Deployment completed successfully!");
    
    // Next steps
    console.log("\n📋 Next Steps:");
    if (network.name === "zetachain_athens" || network.name === "zetachain_mainnet") {
        console.log("1. Update OmniTravel chain connectors for target chains");
        console.log("2. Update backend .env with new OmniTravel address");
        console.log("3. Test provisions refund by completing a travel");
    } else {
        console.log("1. Update OmniTravel on ZetaChain with new FrogConnector address");
        console.log("2. Test smart return threshold by running exploration with low provisions");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
