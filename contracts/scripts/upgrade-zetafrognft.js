/**
 * Upgrade ZetaFrogNFT Contract
 * 
 * This script upgrades the existing ZetaFrogNFT proxy to a new implementation.
 * 
 * Usage:
 *   npx hardhat run scripts/upgrade-zetafrognft.js --network zetaAthens
 */

const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

async function askConfirmation(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
        });
    });
}

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("========================================");
    console.log("Upgrade ZetaFrogNFT");
    console.log("========================================");
    console.log("Network:", network.name);
    console.log("Upgrader:", deployer.address);
    console.log("");

    // Load existing deployment
    const deploymentFile = path.join(__dirname, "..", "deployments", `ZetaFrogNFT-upgradeable-${network.name}.json`);
    let deployment;
    
    try {
        deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
        console.log("Found existing deployment:");
        console.log("  Proxy:", deployment.proxy);
        console.log("  Current Implementation:", deployment.implementation);
        console.log("  Current Version:", deployment.version);
    } catch (e) {
        console.error("❌ No existing deployment found at:", deploymentFile);
        console.error("   Please deploy first using deploy-upgradeable.js");
        process.exit(1);
    }
    console.log("");

    // Get current version
    const currentContract = await ethers.getContractAt("ZetaFrogNFTUpgradeable", deployment.proxy);
    const currentVersion = await currentContract.version();
    console.log("On-chain version:", currentVersion);

    // Confirmation
    console.log("\n⚠️  WARNING: You are about to upgrade the contract!");
    const confirmed = await askConfirmation("Do you want to proceed? (yes/no): ");
    if (!confirmed) {
        console.log("Upgrade cancelled.");
        return;
    }

    // Get new implementation contract
    // Change this to the new version when upgrading
    console.log("\nPreparing upgrade...");
    const NewImplementation = await ethers.getContractFactory("ZetaFrogNFTUpgradeable");
    
    // Validate upgrade compatibility
    console.log("Validating upgrade compatibility...");
    try {
        await upgrades.validateUpgrade(deployment.proxy, NewImplementation, {
            kind: "uups"
        });
        console.log("✅ Upgrade validation passed");
    } catch (e) {
        console.error("❌ Upgrade validation failed:", e.message);
        console.error("   This usually means storage layout is incompatible.");
        process.exit(1);
    }

    // Perform upgrade
    console.log("\nUpgrading...");
    const upgraded = await upgrades.upgradeProxy(deployment.proxy, NewImplementation, {
        kind: "uups"
    });
    await upgraded.waitForDeployment();

    const newImplAddress = await upgrades.erc1967.getImplementationAddress(deployment.proxy);
    const newVersion = await upgraded.version();
    
    console.log("✅ Upgrade successful!");
    console.log("   Proxy (unchanged):", deployment.proxy);
    console.log("   Old Implementation:", deployment.implementation);
    console.log("   New Implementation:", newImplAddress);
    console.log("   New Version:", newVersion);

    // Update deployment file
    deployment.implementation = newImplAddress;
    deployment.version = newVersion;
    deployment.lastUpgrade = new Date().toISOString();
    deployment.upgradeHistory.push({
        version: newVersion,
        implementation: newImplAddress,
        deployedAt: new Date().toISOString()
    });

    fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));
    console.log("\nDeployment updated:", deploymentFile);

    // Summary
    console.log("\n========================================");
    console.log("Upgrade Complete");
    console.log("========================================");
    console.log("The contract has been upgraded.");
    console.log("Proxy address remains:", deployment.proxy);
    console.log("New implementation:", newImplAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
