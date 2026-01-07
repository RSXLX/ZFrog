const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("🚀 Deploying Local Travel Contract with account:", deployer.address);

    const ZETAFROG_ADDRESS = process.env.VITE_CONTRACT_ADDRESS_ZETAFROG || process.env.ZETAFROG_NFT_ADDRESS;
    if (!ZETAFROG_ADDRESS) throw new Error("Missing ZETAFROG_NFT_ADDRESS");

    console.log("📍 Linking to ZetaFrogNFT:", ZETAFROG_ADDRESS);

    // 1. Deploy Travel
    console.log("\n📦 Deploying Travel.sol...");
    const Travel = await hre.ethers.getContractFactory("Travel");
    const travel = await Travel.deploy(ZETAFROG_ADDRESS);
    await travel.waitForDeployment();
    const travelAddress = await travel.getAddress();
    console.log("✅ Travel Deployed to:", travelAddress);

    // 2. Configure Permissions
    console.log("\n⚙️  Configuring Permissions...");
    const ZetaFrogNFT = await hre.ethers.getContractFactory("ZetaFrogNFT");
    const zetaFrogNFT = ZetaFrogNFT.attach(ZETAFROG_ADDRESS);
    
    // Check if we are owner of NFT
    const nftOwner = await zetaFrogNFT.owner();
    if (nftOwner.toLowerCase() === deployer.address.toLowerCase()) {
        console.log("   Setting Travel Contract in ZetaFrogNFT...");
        const tx = await zetaFrogNFT.setTravelContract(travelAddress);
        await tx.wait();
        console.log("✅  Permission Set!");
    } else {
        console.warn("⚠️  WARNING: You are not the owner of ZetaFrogNFT. You must manually call setTravelContract()");
        console.log(`   Owner is: ${nftOwner}`);
    }

    // 3. Set Travel Manager (Backend)
    const BACKEND = process.env.BACKEND_SERVICE_ADDRESS || deployer.address;
    if (BACKEND !== deployer.address) {
        console.log(`\n⚙️  Setting Travel Manager significantly to ${BACKEND}...`);
        const tx2 = await travel.setTravelManager(BACKEND);
        await tx2.wait();
        console.log("✅  Travel Manager Set!");
    } else {
        console.log("ℹ️  Travel Manager set to deployer (default).");
    }

    console.log("\n========================================");
    console.log("🎉 DEPLOYMENT SUCCESSFUL");
    console.log("========================================");
    console.log("🆕 NEW TRAVEL ADDRESS:", travelAddress);
    console.log("========================================");
    console.log("\n⚠️  IMPORTANT: Please update your .env files immediately!");
    console.log(`VITE_CONTRACT_ADDRESS_TRAVEL=${travelAddress}`);
    console.log(`TRAVEL_CONTRACT_ADDRESS=${travelAddress}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
