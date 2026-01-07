// scripts/deploy-footprint.js
// Deploy FrogFootprint contracts to target chains and configure FrogConnector

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// 已部署的 FrogConnector 地址
const FROG_CONNECTOR_ADDRESSES = {
    bscTestnet: "0x1cBD20108cb166D45B32c6D3eCAD551c8d03eAD1",
    ethSepolia: "0xBfE0D6341E52345d5384D3DD4f106464A377D241"
};

async function main() {
    const network = hre.network.name;
    console.log(`\n🐾 Deploying FrogFootprint to ${network}...`);

    const [deployer] = await hre.ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} ETH`);

    // 部署 FrogFootprint
    const FrogFootprint = await hre.ethers.getContractFactory("FrogFootprint");
    const footprint = await FrogFootprint.deploy();
    await footprint.waitForDeployment();
    
    const footprintAddress = await footprint.getAddress();
    console.log(`✅ FrogFootprint deployed: ${footprintAddress}`);

    // 配置 FrogConnector 地址
    const connectorAddress = FROG_CONNECTOR_ADDRESSES[network];
    if (connectorAddress) {
        console.log(`\n🔗 Configuring FrogConnector: ${connectorAddress}`);
        await footprint.setFrogConnector(connectorAddress);
        console.log(`✅ FrogFootprint.frogConnector set to ${connectorAddress}`);

        // 配置 FrogConnector 的 frogFootprint 地址
        const FrogConnector = await hre.ethers.getContractFactory("FrogConnector");
        const connector = FrogConnector.attach(connectorAddress);
        
        try {
            const tx = await connector.setFrogFootprint(footprintAddress);
            await tx.wait();
            console.log(`✅ FrogConnector.frogFootprint set to ${footprintAddress}`);
        } catch (error) {
            console.log(`⚠️ Could not set frogFootprint on connector: ${error.message}`);
        }
    } else {
        console.log(`⚠️ No FrogConnector address for ${network}, skipping configuration`);
    }

    // 保存部署信息
    const deploymentInfo = {
        contractName: "FrogFootprint",
        network,
        chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
        address: footprintAddress,
        connectorAddress: connectorAddress || null,
        deployedAt: new Date().toISOString()
    };

    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    fs.writeFileSync(
        path.join(deploymentsDir, `FrogFootprint-${network}.json`),
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log(`\n📄 Deployment info saved to deployments/FrogFootprint-${network}.json`);
    console.log("\n🎉 FrogFootprint deployment complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
