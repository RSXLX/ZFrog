const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with:", deployer.address);
    // console.log("Balance:", (await deployer.provider.getBalance(deployer.address)).toString());

    // Back-end service address (Travel Manager)
    const BACKEND_SERVICE_ADDRESS = process.env.BACKEND_SERVICE_ADDRESS || deployer.address;
    console.log("Backend service address:", BACKEND_SERVICE_ADDRESS);

    // 1. Deploy ZetaFrogNFT (Core Contract)
    console.log("\n1. Deploying ZetaFrogNFT...");
    const ZetaFrogNFT = await hre.ethers.getContractFactory("ZetaFrogNFT");
    const zetaFrogNFT = await ZetaFrogNFT.deploy();
    await zetaFrogNFT.waitForDeployment();
    const frogAddress = await zetaFrogNFT.getAddress();
    console.log("ZetaFrogNFT deployed to:", frogAddress);

    // 2. Deploy Travel (Business Logic Contract)
    console.log("\n2. Deploying Travel...");
    const Travel = await hre.ethers.getContractFactory("Travel");
    const travel = await Travel.deploy(frogAddress);
    await travel.waitForDeployment();
    const travelAddress = await travel.getAddress();
    console.log("Travel deployed to:", travelAddress);

    // 3. Deploy SouvenirNFT (Optional but good to have)
    console.log("\n3. Deploying SouvenirNFT...");
    const SouvenirNFT = await hre.ethers.getContractFactory("SouvenirNFT");
    const souvenirNFT = await SouvenirNFT.deploy();
    await souvenirNFT.waitForDeployment();
    const souvenirAddress = await souvenirNFT.getAddress();
    console.log("SouvenirNFT deployed to:", souvenirAddress);

    // 4. Configure Contracts
    console.log("\n4. Configuring contracts...");

    // 4.1 Set Travel Contract in ZetaFrogNFT
    console.log(" - Setting Travel contract in ZetaFrogNFT...");
    const tx1 = await zetaFrogNFT.setTravelContract(travelAddress);
    await tx1.wait();
    console.log("   Done.");

    // 4.2 Set Souvenir Contract in ZetaFrogNFT (Removed in refactor)
    // console.log(" - Setting Souvenir contract in ZetaFrogNFT...");
    // const tx2 = await zetaFrogNFT.setSouvenirNFT(souvenirAddress);
    // await tx2.wait();
    // console.log("   Done.");
    
    // 4.3 Set ZetaFrogNFT in SouvenirNFT
    console.log(" - Setting ZetaFrogNFT in SouvenirNFT...");
    const tx3 = await souvenirNFT.setZetaFrogNFT(frogAddress);
    await tx3.wait();
    console.log("   Done.");

    // 5. Set Permissions for Backend Service
    if (BACKEND_SERVICE_ADDRESS !== deployer.address) {
        console.log("\n5. Setting backend service permissions...");

        // Note: ZetaFrogNFT no longer needs setTravelManager directly as Travel contract handles logic,
        // BUT Travel contract DOES need a travel manager (the backend).
        console.log(" - Setting Travel Manager in Travel contract...");
        const tx4 = await travel.setTravelManager(BACKEND_SERVICE_ADDRESS);
        await tx4.wait();
        console.log("   Done.");

        // SouvenirNFT might still need a minter if it's separate
        console.log(" - Setting Minter in SouvenirNFT...");
        const tx5 = await souvenirNFT.setMinter(BACKEND_SERVICE_ADDRESS);
        await tx5.wait();
        console.log("   Done.");
    } else {
        console.log("\n⚠️  WARNING: BACKEND_SERVICE_ADDRESS not set, using deployer as manager");
    }

    // 6. Summary and .env Output
    console.log("\n========================================");
    console.log("  DEPLOYMENT COMPLETE");
    console.log("========================================");
    console.log("ZetaFrogNFT:", frogAddress);
    console.log("Travel:", travelAddress);
    console.log("SouvenirNFT:", souvenirAddress);
    console.log("TravelManager:", BACKEND_SERVICE_ADDRESS);
    console.log("========================================\n");

    console.log("Please update your .env files with:");
    console.log(`VITE_CONTRACT_ADDRESS_ZETAFROG=${frogAddress}`);
    console.log(`VITE_CONTRACT_ADDRESS_TRAVEL=${travelAddress}`);
    console.log(`VITE_CONTRACT_ADDRESS_SOUVENIR=${souvenirAddress}`);
    console.log(`ZETAFROG_NFT_ADDRESS=${frogAddress}`); // Backend env usually
    console.log(`TRAVEL_CONTRACT_ADDRESS=${travelAddress}`); // Backend env
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
