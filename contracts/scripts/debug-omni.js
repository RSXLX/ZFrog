const hre = require("hardhat");

const NFT = "0xE3dDAE91EEaF453FC28Bc0C3D9Ef99e23eC98C85";
const GATEWAY = "0xfEDD7A6e3Ef1cC470fbfbF955a22D793dDC0F44E";

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Acc:", deployer.address);
    
    try {
        console.log("Deploying OmniTravel...");
        const OmniTravel = await hre.ethers.getContractFactory("OmniTravel");
        const omni = await OmniTravel.deploy(NFT, GATEWAY, { gasLimit: 5000000 }); 
        await omni.waitForDeployment();
        console.log("Done:", await omni.getAddress());
    } catch (e) {
        console.error("FAIL:", e);
    }
}

main().catch(console.error);
