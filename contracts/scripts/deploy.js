const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with:", deployer.address);
    console.log("Balance:", (await deployer.provider.getBalance(deployer.address)).toString());

    // 1. Deploy ZetaFrogNFT
    console.log("\n1. Deploying ZetaFrogNFT...");
    const ZetaFrogNFT = await hre.ethers.getContractFactory("ZetaFrogNFT");
    const zetaFrogNFT = await ZetaFrogNFT.deploy();
    await zetaFrogNFT.waitForDeployment();
    const frogAddress = await zetaFrogNFT.getAddress();
    console.log("ZetaFrogNFT deployed to:", frogAddress);

    // 2. Deploy SouvenirNFT
    console.log("\n2. Deploying SouvenirNFT...");
    const SouvenirNFT = await hre.ethers.getContractFactory("SouvenirNFT");
    const souvenirNFT = await SouvenirNFT.deploy();
    await souvenirNFT.waitForDeployment();
    const souvenirAddress = await souvenirNFT.getAddress();
    console.log("SouvenirNFT deployed to:", souvenirAddress);

    // 3. Configure contracts
    console.log("\n3. Configuring contracts...");
    
    await zetaFrogNFT.setSouvenirNFT(souvenirAddress);
    console.log("   - ZetaFrogNFT.setSouvenirNFT done");
    
    await souvenirNFT.setZetaFrogNFT(frogAddress);
    console.log("   - SouvenirNFT.setZetaFrogNFT done");

    // 4. Output deployment info
    console.log("\n========================================");
    console.log("       DEPLOYMENT COMPLETE");
    console.log("========================================");
    console.log("ZetaFrogNFT:", frogAddress);
    console.log("SouvenirNFT:", souvenirAddress);
    console.log("Owner/TravelManager:", deployer.address);
    console.log("========================================\n");
    
    console.log("Please copy these addresses to your .env files:");
    console.log(`ZETAFROG_NFT_ADDRESS=${frogAddress}`);
    console.log(`SOUVENIR_NFT_ADDRESS=${souvenirAddress}`);

    // 5. Verify contracts (if not local)
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("\nWaiting 30 seconds for block confirmations...");
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        console.log("Verifying contracts on explorer...");
        try {
            await hre.run("verify:verify", {
                address: frogAddress,
                constructorArguments: [],
            });
            await hre.run("verify:verify", {
                address: souvenirAddress,
                constructorArguments: [],
            });
            console.log("Verification complete!");
        } catch (e) {
            console.log("Verification failed:", e.message);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
