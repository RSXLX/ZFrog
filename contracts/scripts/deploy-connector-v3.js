// scripts/deploy-connector-v3.js
// Deploy FrogConnector v3 with FrogFootprint integration

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// ZetaChain OmniTravel address (deployed on ZetaChain Athens)
const OMNI_TRAVEL_ADDRESS = "0x52B090700Ca9fb2EBBbc964fDde60A0513Df7cd7";

// ZetaChain Protocol addresses per network
const NETWORK_CONFIG = {
    bscTestnet: {
        zetaConnector: "0x0000028a2eB8346cd5c0267856aB7594B7a55308",
        zetaToken: "0x0000c304D2934c00Db1d51995b9f6996AffD17c0",
        footprintAddress: "0x9571ce7FdaBfe3A234dABE3eaa01704A62AF643e"
    },
    ethSepolia: {
        zetaConnector: "0x000007cf399229b2f5a4d043f20e90c9c98b7c6a",
        zetaToken: "0x0000c2e074ec69a0dfb2997ba6c7d2e1e00b2f3f",
        footprintAddress: "0x319421300114065F601a0103ec1eC3AB2652C5Da"
    }
};

async function main() {
    const network = hre.network.name;
    const config = NETWORK_CONFIG[network];
    
    if (!config) {
        console.log(`❌ No configuration for network: ${network}`);
        console.log(`Supported networks: ${Object.keys(NETWORK_CONFIG).join(', ')}`);
        return;
    }

    const [deployer] = await hre.ethers.getSigners();
    console.log(`\n🐸 Deploying FrogConnector v3 to ${network}...`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} ETH`);
    
    // Encode OmniTravel address for cross-chain messaging
    const omniTravelBytes = hre.ethers.AbiCoder.defaultAbiCoder().encode(
        ["address"],
        [OMNI_TRAVEL_ADDRESS]
    );
    console.log(`OmniTravel: ${OMNI_TRAVEL_ADDRESS}`);
    
    // Deploy FrogConnector
    const FrogConnector = await hre.ethers.getContractFactory("FrogConnector");
    const connector = await FrogConnector.deploy(
        config.zetaConnector,
        config.zetaToken,
        omniTravelBytes
    );
    await connector.waitForDeployment();
    const connectorAddress = await connector.getAddress();
    console.log(`✅ FrogConnector v3 deployed: ${connectorAddress}`);
    
    // Configure FrogFootprint
    if (config.footprintAddress) {
        console.log(`\n🐾 Configuring FrogFootprint: ${config.footprintAddress}`);
        const tx = await connector.setFrogFootprint(config.footprintAddress);
        await tx.wait();
        console.log(`✅ FrogConnector.frogFootprint set`);
        
        // Also update FrogFootprint to recognize this connector
        const FrogFootprint = await hre.ethers.getContractFactory("FrogFootprint");
        const footprint = FrogFootprint.attach(config.footprintAddress);
        try {
            const tx2 = await footprint.setFrogConnector(connectorAddress);
            await tx2.wait();
            console.log(`✅ FrogFootprint.frogConnector updated`);
        } catch (e) {
            console.log(`⚠️ Could not update FrogFootprint.frogConnector: ${e.message}`);
        }
    }
    
    // Enable test mode for faster exploration
    console.log(`\n⚙️ Enabling test mode...`);
    const txTest = await connector.setTestMode(true);
    await txTest.wait();
    console.log(`✅ Test mode enabled (20s exploration interval)`);

    // Save deployment info
    const deploymentInfo = {
        contractName: "FrogConnector",
        version: "v3",
        network,
        chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
        address: connectorAddress,
        omniTravelAddress: OMNI_TRAVEL_ADDRESS,
        footprintAddress: config.footprintAddress,
        deployedAt: new Date().toISOString()
    };

    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    fs.writeFileSync(
        path.join(deploymentsDir, `FrogConnector-${network}.json`),
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log(`\n📄 Deployment saved to deployments/FrogConnector-${network}.json`);
    console.log("\n🎉 FrogConnector v3 deployment complete!");
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Update OmniTravel.chainConnectors with: ${connectorAddress}`);
    console.log(`   2. Update backend .env with new connector address`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
