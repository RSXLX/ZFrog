const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const ADDRESSES_FILE = path.join(__dirname, "../deployed-addresses.json");
const ZETA_FROG_NFT_ADDRESS = "0x0721CDff3291a1Dd2af28633B5dEE5427553F09E";

function loadAddresses() {
    if (fs.existsSync(ADDRESSES_FILE)) {
        return JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf8"));
    }
    return {};
}

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log(`Using account: ${deployer.address}`);

    const addresses = loadAddresses();
    const omniTravelAddress = addresses.zetaAthens?.omniTravel;

    if (!omniTravelAddress) {
        console.error("❌ OmniTravel address not found in deployed-addresses.json");
        return;
    }

    console.log(`Setting up permissions for OmniTravel: ${omniTravelAddress}`);
    console.log(`Target ZetaFrogNFT: ${ZETA_FROG_NFT_ADDRESS}`);

    // Create contract instance manually since we might not have the artifact linked by name easily if it was compiled differently or just use generic factory if available
    // But we should have "ZetaFrogNFT" artifact in this project.
    const ZetaFrogNFT = await hre.ethers.getContractFactory("ZetaFrogNFT");
    const zetaFrog = ZetaFrogNFT.attach(ZETA_FROG_NFT_ADDRESS);

    // Check current manager
    // Check owner
    try {
        const owner = await zetaFrog.owner();
        console.log(`Contract Owner: ${owner}`);
        console.log(`Deployer:     ${deployer.address}`);
        
        if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
            console.error("❌ Deployer is NOT the owner!");
            return;
        }
    } catch (e) {
        console.log("⚠️ Could not read owner:", e.message);
    }

    // Check for omniTravelContract
    try {
        const currentOmniTravelContract = await zetaFrog.omniTravelContract();
        console.log(`Current OmniTravel Contract: ${currentOmniTravelContract}`);
        
        if (currentOmniTravelContract.toLowerCase() === omniTravelAddress.toLowerCase()) {
             console.log("✅ OmniTravel is ALREADY authorized.");
             return;
        }
        
        console.log("⚠️ OmniTravel authorization needs update...");
        
        const tx = await zetaFrog.setOmniTravelContract(omniTravelAddress);
        console.log(`Transaction sent: ${tx.hash}`);
        await tx.wait();
        console.log("✅ OmniTravel authorization complete!");
        return;

    } catch (e) {
        console.log("⚠️ Could not read/set omniTravelContract:", e.message);
    }
    
    console.error("❌ Failed to set permissions. Contract interface mismatch.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
