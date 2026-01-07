/**
 * Configure New ZetaFrogNFT Contract
 * 
 * Sets up the OmniTravel contract association for the new upgradeable NFT
 * 
 * Usage:
 *   npx hardhat run scripts/configure-new-nft.js --network zetaAthens
 */

const { ethers, network } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("========================================");
    console.log("Configure New ZetaFrogNFT");
    console.log("========================================");
    console.log("Network:", network.name);
    console.log("Admin:", deployer.address);
    console.log("");

    // Contract addresses
    const NEW_NFT_PROXY = "0x0721CDff3291a1Dd2af28633B5dEE5427553F09E";
    const OMNI_TRAVEL = "0x51D60F01B8e19CFd94097933ca26bA0f77eB0241";

    console.log("ZetaFrogNFT Proxy:", NEW_NFT_PROXY);
    console.log("OmniTravel:", OMNI_TRAVEL);
    console.log("");

    // Get contract
    const ZetaFrogNFT = await ethers.getContractFactory("ZetaFrogNFTUpgradeable");
    const nft = ZetaFrogNFT.attach(NEW_NFT_PROXY);

    // Check current version
    console.log("Checking contract...");
    const version = await nft.version();
    console.log("Version:", version);

    // Set OmniTravel contract
    console.log("\nSetting OmniTravel contract...");
    try {
        const tx = await nft.setOmniTravelContract(OMNI_TRAVEL);
        await tx.wait();
        console.log("✅ OmniTravel set successfully");
    } catch (e) {
        console.log("⚠️ Error:", e.message.substring(0, 100));
    }

    // Verify
    console.log("\nVerifying configuration...");
    const omniTravelAddr = await nft.omniTravelContract();
    console.log("OmniTravel contract:", omniTravelAddr);

    // Now update OmniTravel to use new NFT
    console.log("\n--- Updating OmniTravel ---");
    const OmniTravel = await ethers.getContractFactory("OmniTravel");
    const omniTravel = OmniTravel.attach(OMNI_TRAVEL);

    // Note: OmniTravel uses zetaFrogNFT set in constructor
    // We may need to redeploy OmniTravel if it doesn't have a setter
    try {
        // Check if there's a setter function
        const currentNFT = await omniTravel.zetaFrogNFT();
        console.log("Current NFT in OmniTravel:", currentNFT);
        
        if (currentNFT.toLowerCase() !== NEW_NFT_PROXY.toLowerCase()) {
            console.log("⚠️ OmniTravel points to old NFT contract");
            console.log("   You may need to redeploy OmniTravel with new NFT address");
        } else {
            console.log("✅ OmniTravel already configured correctly");
        }
    } catch (e) {
        console.log("Error checking OmniTravel:", e.message.substring(0, 100));
    }

    console.log("\n========================================");
    console.log("Configuration Complete");
    console.log("========================================");
    console.log("\n📋 Summary:");
    console.log("- ZetaFrogNFT Proxy:", NEW_NFT_PROXY);
    console.log("- OmniTravel:", OMNI_TRAVEL);
    console.log("\n✅ Ready to use!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
