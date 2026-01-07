/**
 * Deploy Upgradeable Contracts
 * 
 * This script deploys the upgradeable version of ZetaFrogNFT
 * using OpenZeppelin's UUPS proxy pattern.
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-upgradeable.js --network zetaAthens
 */

const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("========================================");
    console.log("Deploy Upgradeable ZetaFrogNFT");
    console.log("========================================");
    console.log("Network:", network.name);
    console.log("Deployer:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "ETH/ZETA");
    console.log("");

    // Deploy ZetaFrogNFT as upgradeable proxy
    console.log("Deploying ZetaFrogNFTUpgradeable proxy...");
    const ZetaFrogNFT = await ethers.getContractFactory("ZetaFrogNFTUpgradeable");
    
    const proxy = await upgrades.deployProxy(ZetaFrogNFT, [], {
        initializer: "initialize",
        kind: "uups"
    });
    await proxy.waitForDeployment();
    
    const proxyAddress = await proxy.getAddress();
    const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    
    console.log("✅ Proxy deployed to:", proxyAddress);
    console.log("   Implementation:", implAddress);
    
    // Verify version
    const version = await proxy.version();
    console.log("   Version:", version);
    console.log("");

    // Configure the contract
    console.log("Configuring ZetaFrogNFT...");
    
    // Set OmniTravel if exists
    const OMNI_TRAVEL = "0x51D60F01B8e19CFd94097933ca26bA0f77eB0241";
    try {
        const tx = await proxy.setOmniTravelContract(OMNI_TRAVEL);
        await tx.wait();
        console.log("- OmniTravel set to:", OMNI_TRAVEL);
    } catch (e) {
        console.log("- Failed to set OmniTravel:", e.message.substring(0, 100));
    }

    // Save deployment info
    const deploymentInfo = {
        contractName: "ZetaFrogNFTUpgradeable",
        version: version,
        network: network.name,
        chainId: (await ethers.provider.getNetwork()).chainId.toString(),
        proxy: proxyAddress,
        implementation: implAddress,
        admin: deployer.address,
        deployedAt: new Date().toISOString(),
        upgradeHistory: [
            {
                version: version,
                implementation: implAddress,
                deployedAt: new Date().toISOString()
            }
        ]
    };

    const deploymentDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentDir)) {
        fs.mkdirSync(deploymentDir, { recursive: true });
    }
    
    const deploymentFile = path.join(deploymentDir, `ZetaFrogNFT-upgradeable-${network.name}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("\nDeployment saved to:", deploymentFile);

    // Update deployed-addresses.json
    const addressesFile = path.join(__dirname, "..", "deployed-addresses.json");
    let addresses = {};
    try {
        addresses = JSON.parse(fs.readFileSync(addressesFile, "utf8"));
    } catch (e) {}
    
    if (!addresses[network.name]) {
        addresses[network.name] = {};
    }
    
    addresses[network.name].zetaFrogNFT_proxy = proxyAddress;
    addresses[network.name].zetaFrogNFT_impl = implAddress;
    
    fs.writeFileSync(addressesFile, JSON.stringify(addresses, null, 2));
    console.log("Updated:", addressesFile);

    // Summary
    console.log("\n========================================");
    console.log("Deployment Summary");
    console.log("========================================");
    console.log("Proxy Address:", proxyAddress, "(use this in config)");
    console.log("Implementation:", implAddress);
    console.log("");
    console.log("📋 Next Steps:");
    console.log("1. Update ZETAFROG_NFT_ADDRESS to:", proxyAddress);
    console.log("2. Migrate existing frogs using migration functions");
    console.log("3. Complete migration with completeMigration()");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
