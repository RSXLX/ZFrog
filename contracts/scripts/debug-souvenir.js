const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Acc:", deployer.address);
    console.log("Bal:", (await deployer.provider.getBalance(deployer.address)).toString());

    try {
        const SouvenirNFT = await hre.ethers.getContractFactory("SouvenirNFT");
        console.log("Deploying Souvenir...");
        // Test different invocation styles
        // const s = await SouvenirNFT.deploy(); 
        const s = await SouvenirNFT.deploy({ gasLimit: 5000000 }); 
        await s.waitForDeployment();
        console.log("Done:", await s.getAddress());
    } catch (e) {
        console.error("FAIL:", e);
        if (e.value) console.log("Value:", e.value);
    }
}

main().catch(console.error);
