// scripts/update-omnitravel-connectors.js
// Update OmniTravel chainConnectors with new FrogConnector v3 addresses

const hre = require("hardhat");

// OmniTravel on ZetaChain Athens
const OMNI_TRAVEL_ADDRESS = "0x292AA79a2a9754014BC3f23E81f31B9b896A60B5";

// New FrogConnector v3 addresses
const NEW_CONNECTORS = {
    97: "0x8E79969718D2ffFf2a16DA65DE8cE097ceA04aec",      // BSC Testnet
    11155111: "0xca54986f91129D1AF3de67b331eBB36b330863C9" // ETH Sepolia
};

async function main() {
    console.log("\n🔧 Updating OmniTravel chainConnectors...");
    console.log(`OmniTravel: ${OMNI_TRAVEL_ADDRESS}`);

    const [deployer] = await hre.ethers.getSigners();
    console.log(`Using account: ${deployer.address}`);

    // Get OmniTravel contract
    const OmniTravel = await hre.ethers.getContractFactory("OmniTravel");
    const omniTravel = OmniTravel.attach(OMNI_TRAVEL_ADDRESS);

    for (const [chainId, connectorAddress] of Object.entries(NEW_CONNECTORS)) {
        console.log(`\nUpdating chainId ${chainId} -> ${connectorAddress}`);
        
        try {
            // Check current value
            const currentConnector = await omniTravel.chainConnectors(chainId);
            console.log(`  Current: ${currentConnector}`);
            
            if (currentConnector.toLowerCase() === connectorAddress.toLowerCase()) {
                console.log(`  ✅ Already set correctly`);
                continue;
            }

            // Update connector
            const tx = await omniTravel.setChainConnector(chainId, connectorAddress);
            console.log(`  Tx: ${tx.hash}`);
            await tx.wait();
            console.log(`  ✅ Updated successfully`);
        } catch (error) {
            console.log(`  ❌ Error: ${error.message}`);
        }
    }

    console.log("\n🎉 OmniTravel connectors updated!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
