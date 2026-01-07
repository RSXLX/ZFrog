/**
 * Deploy OmniTravel with New NFT Address
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-omnitravel-for-new-nft.js --network zetaAthens
 */

const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("========================================");
    console.log("Deploy OmniTravel for New ZetaFrogNFT");
    console.log("========================================");
    console.log("Network:", network.name);
    console.log("Deployer:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "ZETA");
    console.log("");

    // New NFT Proxy address
    const NEW_NFT_PROXY = "0x0721CDff3291a1Dd2af28633B5dEE5427553F09E";
    const GATEWAY_ADDRESS = "0x6c533f7fe93fae114d0954697069df33c9b74fd7";

    console.log("Dependencies:");
    console.log("- ZetaFrogNFT (new):", NEW_NFT_PROXY);
    console.log("- Gateway:", GATEWAY_ADDRESS);
    console.log("");

    // Deploy OmniTravel
    console.log("Deploying OmniTravel...");
    const OmniTravel = await ethers.getContractFactory("OmniTravel");
    const omniTravel = await OmniTravel.deploy(NEW_NFT_PROXY, GATEWAY_ADDRESS);
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
    
    // Set travel manager
    tx = await omniTravel.setTravelManager(deployer.address);
    await tx.wait();
    console.log("- Travel manager set");

    // Configure chain connectors
    const BSC_TESTNET_ID = 97;
    const ETH_SEPOLIA_ID = 11155111;
    const BSC_CONNECTOR = "0x9Ce2eE60a1AAc48a79b9A3eb11bf903556268674";
    const ETH_CONNECTOR = "0x63809b8CD0bD3336491B2BA2b1e7E1a1A630e86a";
    
    try {
        tx = await omniTravel.setChainConnector(BSC_TESTNET_ID, BSC_CONNECTOR);
        await tx.wait();
        console.log("- BSC Testnet connector set");
    } catch (e) {
        console.log("- BSC connector:", e.message.substring(0, 50));
    }
    
    try {
        tx = await omniTravel.setChainConnector(ETH_SEPOLIA_ID, ETH_CONNECTOR);
        await tx.wait();
        console.log("- ETH Sepolia connector set");
    } catch (e) {
        console.log("- ETH connector:", e.message.substring(0, 50));
    }

    // Update ZetaFrogNFT to use new OmniTravel
    console.log("\nUpdating ZetaFrogNFT...");
    const ZetaFrogNFT = await ethers.getContractFactory("ZetaFrogNFTUpgradeable");
    const nft = ZetaFrogNFT.attach(NEW_NFT_PROXY);
    
    tx = await nft.setOmniTravelContract(omniTravelAddress);
    await tx.wait();
    console.log("✅ ZetaFrogNFT updated to use new OmniTravel");

    // Verify
    const omniTravelCheck = await nft.omniTravelContract();
    console.log("Verified OmniTravel in NFT:", omniTravelCheck);

    // Save deployment
    const addressesFile = path.join(__dirname, "..", "deployed-addresses.json");
    let addresses = {};
    try {
        addresses = JSON.parse(fs.readFileSync(addressesFile, "utf8"));
    } catch (e) {}
    
    addresses.zetaAthens = {
        ...addresses.zetaAthens,
        omniTravel: omniTravelAddress,
        omniTravel_v3: omniTravelAddress,
        zetaFrogNFT_proxy: NEW_NFT_PROXY
    };
    
    fs.writeFileSync(addressesFile, JSON.stringify(addresses, null, 2));
    console.log("\nUpdated:", addressesFile);

    // Summary
    console.log("\n========================================");
    console.log("Deployment Complete");
    console.log("========================================");
    console.log("ZetaFrogNFT Proxy:", NEW_NFT_PROXY);
    console.log("OmniTravel (new):", omniTravelAddress);
    console.log("");
    console.log("📋 Update config files with:");
    console.log(`OMNI_TRAVEL_ADDRESS=${omniTravelAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
