const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const ADDRESSES_FILE = path.join(__dirname, "../deployed-addresses.json");
const OMNI_TRAVEL_ADDRESS = "0xE36713321E988d237D940A25BAb7Ad509f4f1387";

const BSC_ZETA_CONNECTOR = "0x0000028a2eB8346cd5c0267856aB7594B7a55308";
const BSC_ZETA_TOKEN = "0x0000c304D2934c00Db1d51995b9f6996AffD17c0";

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log(`Deploying FrogConnector v2 to ${hre.network.name}...`);
    console.log(`Deployer: ${deployer.address}`);
    
    // Encode OmniTravel address
    const omniTravelBytes = hre.ethers.AbiCoder.defaultAbiCoder().encode(
        ["address"],
        [OMNI_TRAVEL_ADDRESS]
    );
    
    console.log(`OmniTravel (encoded): ${omniTravelBytes}`);
    
    const FrogConnector = await hre.ethers.getContractFactory("FrogConnector");
    const connector = await FrogConnector.deploy(
        BSC_ZETA_CONNECTOR,
        BSC_ZETA_TOKEN,
        omniTravelBytes
    );
    await connector.waitForDeployment();
    const address = await connector.getAddress();
    console.log(`✅ FrogConnector v2 deployed: ${address}`);
    
    // Update JSON
    let addresses = {};
    if (fs.existsSync(ADDRESSES_FILE)) {
        addresses = JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf8"));
    }
    
    if (!addresses.bscTestnet) addresses.bscTestnet = {};
    addresses.bscTestnet.frogConnector = address;
    // Keep footprint derived from previous JSON if exists
    
    fs.writeFileSync(ADDRESSES_FILE, JSON.stringify(addresses, null, 2));
    console.log("Updated deployed-addresses.json");
}

main().catch(console.error);
