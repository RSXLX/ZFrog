/**
 * Deploy and Configure ALL Contracts for New NFT
 * 
 * This script ensures all contracts are deployed and properly configured
 * to work with the new upgradeable ZetaFrogNFT.
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-all-for-new-nft.js --network zetaAthens
 */

const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("========================================");
    console.log("Deploy & Configure ALL Contracts");
    console.log("========================================");
    console.log("Network:", network.name);
    console.log("Deployer:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "ZETA");
    console.log("");

    // New NFT Proxy address (already deployed)
    const NEW_NFT_PROXY = "0x0721CDff3291a1Dd2af28633B5dEE5427553F09E";
    
    // Already deployed contracts
    const TRAVEL = "0x4e8884F6a8CEadBCfAaEEa9B888560Ac9570fbB3";
    const OMNI_TRAVEL = "0x7e85A33380f6994e510F884238f37827B25e50d5";

    console.log("=== Existing Contracts ===");
    console.log("ZetaFrogNFT Proxy:", NEW_NFT_PROXY);
    console.log("Travel:", TRAVEL);
    console.log("OmniTravel:", OMNI_TRAVEL);
    console.log("");

    // Deploy SouvenirNFT
    console.log("=== Deploying SouvenirNFT ===");
    const SouvenirNFT = await ethers.getContractFactory("SouvenirNFT");
    const souvenir = await SouvenirNFT.deploy();
    await souvenir.waitForDeployment();
    
    const souvenirAddress = await souvenir.getAddress();
    console.log("✅ SouvenirNFT deployed to:", souvenirAddress);

    // Configure SouvenirNFT
    console.log("\nConfiguring SouvenirNFT...");
    let tx = await souvenir.setZetaFrogNFT(NEW_NFT_PROXY);
    await tx.wait();
    console.log("- Set ZetaFrogNFT");

    // Set backend as minter
    tx = await souvenir.setMinter(deployer.address);
    await tx.wait();
    console.log("- Set minter to deployer");

    // Verify all configurations
    console.log("\n=== Verifying Configurations ===");
    
    const ZetaFrogNFT = await ethers.getContractFactory("ZetaFrogNFTUpgradeable");
    const nft = ZetaFrogNFT.attach(NEW_NFT_PROXY);
    
    const travelAddr = await nft.travelContract();
    const omniTravelAddr = await nft.omniTravelContract();
    
    console.log("ZetaFrogNFT:");
    console.log("  - travelContract:", travelAddr, travelAddr === TRAVEL ? "✅" : "❌");
    console.log("  - omniTravelContract:", omniTravelAddr, omniTravelAddr === OMNI_TRAVEL ? "✅" : "❌");
    
    const souvenirZetaFrog = await souvenir.zetaFrogNFT();
    console.log("SouvenirNFT:");
    console.log("  - zetaFrogNFT:", souvenirZetaFrog, souvenirZetaFrog === NEW_NFT_PROXY ? "✅" : "❌");

    // Save deployment
    const addressesFile = path.join(__dirname, "..", "deployed-addresses.json");
    let addresses = {};
    try {
        addresses = JSON.parse(fs.readFileSync(addressesFile, "utf8"));
    } catch (e) {}
    
    addresses.zetaAthens = {
        ...addresses.zetaAthens,
        souvenirNFT: souvenirAddress,
        souvenirNFT_v2: souvenirAddress,
        // Final deployed contracts
        finalContracts: {
            zetaFrogNFT: NEW_NFT_PROXY,
            travel: TRAVEL,
            omniTravel: OMNI_TRAVEL,
            souvenirNFT: souvenirAddress
        }
    };
    
    fs.writeFileSync(addressesFile, JSON.stringify(addresses, null, 2));
    console.log("\nUpdated:", addressesFile);

    // Summary
    console.log("\n========================================");
    console.log("ALL CONTRACTS CONFIGURED");
    console.log("========================================");
    console.log("");
    console.log("📋 Final Contract Addresses:");
    console.log(`ZETAFROG_NFT_ADDRESS=${NEW_NFT_PROXY}`);
    console.log(`TRAVEL_CONTRACT_ADDRESS=${TRAVEL}`);
    console.log(`OMNI_TRAVEL_ADDRESS=${OMNI_TRAVEL}`);
    console.log(`SOUVENIR_NFT_ADDRESS=${souvenirAddress}`);
    console.log("");
    console.log("✅ All contracts deployed and configured!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
