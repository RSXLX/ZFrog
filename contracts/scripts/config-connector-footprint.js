// scripts/config-connector-footprint.js
// Configure FrogConnector to use FrogFootprint on target chains

const hre = require("hardhat");

const CONFIGS = {
    bscTestnet: {
        connectorAddress: "0x1cBD20108cb166D45B32c6D3eCAD551c8d03eAD1",
        footprintAddress: "0x9571ce7FdaBfe3A234dABE3eaa01704A62AF643e"
    },
    ethSepolia: {
        connectorAddress: "0xBfE0D6341E52345d5384D3DD4f106464A377D241",
        footprintAddress: "0x319421300114065F601a0103ec1eC3AB2652C5Da"
    }
};

async function main() {
    const network = hre.network.name;
    const config = CONFIGS[network];
    
    if (!config) {
        console.log(`❌ No configuration for network: ${network}`);
        return;
    }

    console.log(`\n🔧 Configuring FrogConnector on ${network}...`);
    console.log(`Connector: ${config.connectorAddress}`);
    console.log(`Footprint: ${config.footprintAddress}`);

    const [deployer] = await hre.ethers.getSigners();
    console.log(`Using account: ${deployer.address}`);

    const FrogConnector = await hre.ethers.getContractFactory("FrogConnector");
    const connector = FrogConnector.attach(config.connectorAddress);

    try {
        const currentFootprint = await connector.frogFootprint();
        console.log(`Current frogFootprint: ${currentFootprint}`);
        
        if (currentFootprint.toLowerCase() === config.footprintAddress.toLowerCase()) {
            console.log("✅ Already configured correctly!");
            return;
        }

        const tx = await connector.setFrogFootprint(config.footprintAddress);
        console.log(`Transaction sent: ${tx.hash}`);
        await tx.wait();
        
        console.log(`✅ FrogConnector.frogFootprint updated to ${config.footprintAddress}`);
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        
        // Check owner
        try {
            const owner = await connector.owner();
            console.log(`Contract owner: ${owner}`);
            console.log(`Your address: ${deployer.address}`);
            if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
                console.log("⚠️ You are not the contract owner");
            }
        } catch (e) {
            console.log("Could not check owner");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
