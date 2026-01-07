/**
 * Configure Cross-Chain Connectors
 * 
 * Sets up the cross-chain connector addresses in OmniTravel
 * and configures ZetaFrogNFT to recognize OmniTravel
 * 
 * Usage:
 * npx hardhat run scripts/configure-cross-chain.js --network zetaAthens
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Deployed contract addresses
const CONTRACTS = {
    omniTravel: "0x52B090700Ca9fb2EBBbc964fDde60A0513Df7cd7",
    zetaFrogNFT: "0x76e7baA23fce77DA7Edbea58D8B888128D47A1Ff",
    frogConnectors: {
        97: "0x1cBD20108cb166D45B32c6D3eCAD551c8d03eAD1",       // BSC Testnet
        11155111: "0xBfE0D6341E52345d5384D3DD4f106464A377D241"  // ETH Sepolia
    }
};

async function main() {
    const network = hre.network.name;
    console.log(`\n🔧 Configuring cross-chain on ${network}...\n`);
    
    if (network !== "zetaAthens") {
        console.log("❌ This script must run on zetaAthens");
        return;
    }
    
    const [deployer] = await hre.ethers.getSigners();
    console.log(`📍 Deployer: ${deployer.address}\n`);
    
    // 1. Configure OmniTravel with chain connectors
    await configureOmniTravel(deployer);
    
    // 2. Configure ZetaFrogNFT to recognize OmniTravel
    await configureZetaFrogNFT(deployer);
    
    console.log("\n✅ Configuration complete!");
}

async function configureOmniTravel(deployer) {
    console.log("📦 Configuring OmniTravel...\n");
    
    const OmniTravel = await hre.ethers.getContractAt("OmniTravel", CONTRACTS.omniTravel, deployer);
    
    for (const [chainId, connectorAddress] of Object.entries(CONTRACTS.frogConnectors)) {
        console.log(`   Setting connector for chain ${chainId}: ${connectorAddress}`);
        
        // Encode address as bytes
        const connectorBytes = hre.ethers.AbiCoder.defaultAbiCoder().encode(
            ["address"],
            [connectorAddress]
        );
        
        try {
            const tx = await OmniTravel.setChainConnector(chainId, connectorBytes);
            await tx.wait();
            console.log(`   ✓ Chain ${chainId} connector set (tx: ${tx.hash})`);
        } catch (e) {
            console.log(`   ✗ Failed: ${e.message}`);
        }
    }
}

async function configureZetaFrogNFT(deployer) {
    console.log("\n📦 Configuring ZetaFrogNFT...\n");
    
    const ZetaFrogNFT = await hre.ethers.getContractAt("ZetaFrogNFT", CONTRACTS.zetaFrogNFT, deployer);
    
    console.log(`   Setting OmniTravel contract: ${CONTRACTS.omniTravel}`);
    
    try {
        const tx = await ZetaFrogNFT.setOmniTravelContract(CONTRACTS.omniTravel);
        await tx.wait();
        console.log(`   ✓ OmniTravel set (tx: ${tx.hash})`);
    } catch (e) {
        console.log(`   ✗ Failed: ${e.message}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
