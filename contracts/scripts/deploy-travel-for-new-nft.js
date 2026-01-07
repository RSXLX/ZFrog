/**
 * Deploy Travel Contract for New ZetaFrogNFT
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-travel-for-new-nft.js --network zetaAthens
 */

const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("========================================");
    console.log("Deploy Travel for New ZetaFrogNFT");
    console.log("========================================");
    console.log("Network:", network.name);
    console.log("Deployer:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "ZETA");
    console.log("");

    // New NFT Proxy address
    const NEW_NFT_PROXY = "0x0721CDff3291a1Dd2af28633B5dEE5427553F09E";

    console.log("ZetaFrogNFT Proxy:", NEW_NFT_PROXY);
    console.log("");

    // Deploy Travel contract
    console.log("Deploying Travel contract...");
    const Travel = await ethers.getContractFactory("Travel");
    const travel = await Travel.deploy(NEW_NFT_PROXY);
    await travel.waitForDeployment();
    
    const travelAddress = await travel.getAddress();
    console.log("✅ Travel deployed to:", travelAddress);
    console.log("");

    // Update ZetaFrogNFT to use new Travel
    console.log("Updating ZetaFrogNFT...");
    const ZetaFrogNFT = await ethers.getContractFactory("ZetaFrogNFTUpgradeable");
    const nft = ZetaFrogNFT.attach(NEW_NFT_PROXY);
    
    const tx = await nft.setTravelContract(travelAddress);
    await tx.wait();
    console.log("✅ ZetaFrogNFT updated to use new Travel");

    // Verify
    const travelCheck = await nft.travelContract();
    console.log("Verified Travel in NFT:", travelCheck);

    // Save deployment
    const addressesFile = path.join(__dirname, "..", "deployed-addresses.json");
    let addresses = {};
    try {
        addresses = JSON.parse(fs.readFileSync(addressesFile, "utf8"));
    } catch (e) {}
    
    addresses.zetaAthens = {
        ...addresses.zetaAthens,
        travel: travelAddress,
        travel_v2: travelAddress
    };
    
    fs.writeFileSync(addressesFile, JSON.stringify(addresses, null, 2));
    console.log("\nUpdated:", addressesFile);

    // Summary
    console.log("\n========================================");
    console.log("Deployment Complete");
    console.log("========================================");
    console.log("Travel:", travelAddress);
    console.log("");
    console.log("📋 Update config with:");
    console.log(`TRAVEL_CONTRACT_ADDRESS=${travelAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
