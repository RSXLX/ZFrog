/**
 * Deploy New ZetaFrogNFT with Emergency Reset Functions
 * 
 * ⚠️ WARNING: This will create a NEW NFT contract!
 * All existing frogs will NOT be migrated automatically.
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-zetafrognft-v2.js --network zetaAthens
 */

const { ethers, network } = require("hardhat");
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
    console.log("Deploy ZetaFrogNFT v2 (with Emergency Reset)");
    console.log("========================================");
    console.log("Network:", network.name);
    console.log("Deployer:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "ZETA");
    console.log("");

    // Old contract info
    const OLD_ZETAFROG_NFT = "0x76e7baA23fce77DA7Edbea58D8B888128D47A1Ff";
    
    console.log("⚠️  WARNING: Deploying a new ZetaFrogNFT contract!");
    console.log("⚠️  Old contract:", OLD_ZETAFROG_NFT);
    console.log("⚠️  Existing frogs will NOT be automatically migrated.");
    console.log("");

    // Check how many frogs exist on old contract
    try {
        const OldNFT = await ethers.getContractFactory("ZetaFrogNFT");
        const oldNft = OldNFT.attach(OLD_ZETAFROG_NFT);
        const totalSupply = await oldNft.totalSupply();
        console.log(`📊 Old contract has ${totalSupply} frogs`);
    } catch (e) {
        console.log("Could not query old contract:", e.message.substring(0, 100));
    }
    console.log("");

    // Confirm deployment
    const confirmed = await askConfirmation("Do you want to proceed with deployment? (yes/no): ");
    if (!confirmed) {
        console.log("Deployment cancelled.");
        return;
    }

    console.log("\nDeploying ZetaFrogNFT v2...");
    const ZetaFrogNFT = await ethers.getContractFactory("ZetaFrogNFT");
    const zetaFrogNFT = await ZetaFrogNFT.deploy();
    await zetaFrogNFT.waitForDeployment();
    
    const address = await zetaFrogNFT.getAddress();
    console.log("✅ ZetaFrogNFT v2 deployed to:", address);

    // Configure the new contract
    console.log("\nConfiguring ZetaFrogNFT...");
    
    // Set OmniTravel contract
    const OMNI_TRAVEL = "0x51D60F01B8e19CFd94097933ca26bA0f77eB0241";
    try {
        const tx = await zetaFrogNFT.setOmniTravelContract(OMNI_TRAVEL);
        await tx.wait();
        console.log("- OmniTravel contract set to:", OMNI_TRAVEL);
    } catch (e) {
        console.log("- Failed to set OmniTravel:", e.message);
    }

    // Save deployment info
    const deploymentInfo = {
        contractName: "ZetaFrogNFT",
        version: "v2-emergency-reset",
        network: network.name,
        chainId: 7001,
        address: address,
        previousAddress: OLD_ZETAFROG_NFT,
        omniTravel: OMNI_TRAVEL,
        deployedAt: new Date().toISOString(),
        newFeatures: [
            "emergencyResetFrogStatus",
            "batchResetFrogStatus",
            "adminSetFrogStatus"
        ]
    };

    const deploymentFile = path.join(__dirname, "..", "deployments", "ZetaFrogNFT-v2-zetaAthens.json");
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
        zetaFrogNFT: address,
        zetaFrogNFT_v2: address,
        zetaFrogNFT_v1: OLD_ZETAFROG_NFT
    };
    
    fs.writeFileSync(addressesFile, JSON.stringify(addresses, null, 2));
    console.log("Updated:", addressesFile);

    // Summary
    console.log("\n========================================");
    console.log("Deployment Summary");
    console.log("========================================");
    console.log("ZetaFrogNFT v2:", address);
    console.log("");
    console.log("📋 Next Steps:");
    console.log("1. Update backend config ZETAFROG_NFT_ADDRESS to:", address);
    console.log("2. Update frontend config ZETAFROG_ADDRESS to:", address);
    console.log("3. Users will need to mint new frogs on the new contract");
    console.log("4. Update OmniTravel to use new ZetaFrogNFT if needed");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
