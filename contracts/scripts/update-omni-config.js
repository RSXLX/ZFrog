const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const ADDRESSES_FILE = path.join(__dirname, "../deployed-addresses.json");
const ZRC20_BSC = "0xd97B1de3619ed2c6BEb3860147E30cA8A7dC9891";

async function main() {
    const addresses = JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf8"));
    const omniTravelAddress = addresses.zetaAthens.omniTravel;
    const bscConnector = addresses.bscTestnet.frogConnector; // New V2 address
    
    console.log(`Updating OmniTravel config on ZetaChain...`);
    console.log(`OmniTravel: ${omniTravelAddress}`);
    console.log(`Target BSC Connector: ${bscConnector}`);
    
    const OmniTravel = await hre.ethers.getContractFactory("OmniTravel");
    const omniTravel = OmniTravel.attach(omniTravelAddress);
    
    const bscConnectorBytes = hre.ethers.zeroPadValue(bscConnector, 32);
    console.log(`Connector Bytes32: ${bscConnectorBytes}`);
    
    const tx = await omniTravel.setChainConfig(97, bscConnectorBytes, ZRC20_BSC);
    console.log(`Transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log("✅ Chain config updated!");
}

main().catch(console.error);
