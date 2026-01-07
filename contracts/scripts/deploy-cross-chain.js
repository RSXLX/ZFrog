/**
 * Cross-Chain Contracts Deployment Script
 * 
 * Deploys:
 * 1. OmniTravel.sol to ZetaChain Athens
 * 2. FrogConnector.sol to BSC Testnet
 * 3. FrogConnector.sol to ETH Sepolia
 * 
 * Usage:
 * npx hardhat run scripts/deploy-cross-chain.js --network zetaAthens
 * npx hardhat run scripts/deploy-cross-chain.js --network bscTestnet
 * npx hardhat run scripts/deploy-cross-chain.js --network ethSepolia
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// ZetaChain Contract Addresses (Athens Testnet)
// Reference: https://www.zetachain.com/docs/reference/network/contracts
const ZETA_ADDRESSES = {
    zetaAthens: {
        connector: "0x239e96c8f17C85c30100AC26F635Ea15f23E9c67", // ZetaChain native
        zetaToken: "0x0000000000000000000000000000000000000000", // Native ZETA
    },
    bscTestnet: {
        connector: "0x0000028a2eB8346cd5c0267856aB7594B7a55308", // BSC Testnet Connector
        zetaToken: "0x0000c304D2934c00Db1d51995b9f6996AffD17c0", // ZETA on BSC Testnet (fixed checksum)
    },
    ethSepolia: {
        // Using lowercase to bypass checksum validation in ethers v6
        connector: "0x000007cf399229b2f5a4d043f20e90c9c98b7c6a", // ZetaChain testnet connector
        zetaToken: "0x0000c2e074ec69a0dfb2997ba6c7d2e1e00b2f3f", // ZETA on Sepolia
    }
};

// Existing contract addresses
const EXISTING_CONTRACTS = {
    zetaFrogNFT: process.env.ZETAFROG_NFT_ADDRESS || "0x76e7baA23fce77DA7Edbea58D8B888128D47A1Ff",
};

async function main() {
    const network = hre.network.name;
    console.log(`\n🚀 Deploying to ${network}...\n`);
    
    const [deployer] = await hre.ethers.getSigners();
    console.log(`📍 Deployer: ${deployer.address}`);
    
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log(`💰 Balance: ${hre.ethers.formatEther(balance)} native tokens\n`);
    
    if (network === "zetaAthens") {
        await deployOmniTravel(deployer);
    } else if (network === "bscTestnet" || network === "ethSepolia") {
        await deployFrogConnector(deployer, network);
    } else {
        console.log("⚠️  Unsupported network. Use: zetaAthens, bscTestnet, or ethSepolia");
    }
}

async function deployOmniTravel(deployer) {
    console.log("📦 Deploying OmniTravel to ZetaChain Athens...\n");
    
    const zetaFrogNFT = EXISTING_CONTRACTS.zetaFrogNFT;
    if (!zetaFrogNFT) {
        console.log("❌ Error: ZETAFROG_NFT_ADDRESS not set in .env");
        console.log("   Please set the ZetaFrogNFT contract address first.");
        return;
    }
    
    const addresses = ZETA_ADDRESSES.zetaAthens;
    
    console.log("📝 Constructor arguments:");
    console.log(`   - ZetaFrogNFT: ${zetaFrogNFT}`);
    console.log(`   - ZetaConnector: ${addresses.connector}`);
    console.log(`   - ZetaToken: ${addresses.zetaToken}\n`);
    
    const OmniTravel = await hre.ethers.getContractFactory("OmniTravel");
    const omniTravel = await OmniTravel.deploy(
        zetaFrogNFT,
        addresses.connector,
        addresses.zetaToken
    );
    
    await omniTravel.waitForDeployment();
    const address = await omniTravel.getAddress();
    
    console.log(`✅ OmniTravel deployed to: ${address}\n`);
    
    // Save deployment info
    saveDeployment("OmniTravel", "zetaAthens", address, {
        zetaFrogNFT,
        zetaConnector: addresses.connector,
        zetaToken: addresses.zetaToken
    });
    
    console.log("\n📋 Next steps:");
    console.log("   1. Update ZetaFrogNFT.setOmniTravelContract() with:", address);
    console.log("   2. Deploy FrogConnector to BSC Testnet");
    console.log("   3. Deploy FrogConnector to ETH Sepolia");
    console.log("   4. Set chain connectors in OmniTravel");
    
    return address;
}

async function deployFrogConnector(deployer, network) {
    console.log(`📦 Deploying FrogConnector to ${network}...\n`);
    
    const addresses = ZETA_ADDRESSES[network];
    if (!addresses) {
        console.log(`❌ Error: No addresses configured for ${network}`);
        return;
    }
    
    // Load OmniTravel address from previous deployment
    const omniTravelAddress = loadDeploymentAddress("OmniTravel", "zetaAthens");
    if (!omniTravelAddress) {
        console.log("❌ Error: OmniTravel not deployed yet. Deploy to ZetaChain first.");
        return;
    }
    
    // Encode OmniTravel address as bytes for cross-chain
    const omniTravelBytes = hre.ethers.AbiCoder.defaultAbiCoder().encode(
        ["address"],
        [omniTravelAddress]
    );
    
    console.log("📝 Constructor arguments:");
    console.log(`   - ZetaConnector: ${addresses.connector}`);
    console.log(`   - ZetaToken: ${addresses.zetaToken}`);
    console.log(`   - OmniTravel (bytes): ${omniTravelBytes}\n`);
    
    const FrogConnector = await hre.ethers.getContractFactory("FrogConnector");
    const connector = await FrogConnector.deploy(
        addresses.connector,
        addresses.zetaToken,
        omniTravelBytes
    );
    
    await connector.waitForDeployment();
    const address = await connector.getAddress();
    
    console.log(`✅ FrogConnector deployed to: ${address}\n`);
    
    // Save deployment info
    saveDeployment("FrogConnector", network, address, {
        zetaConnector: addresses.connector,
        zetaToken: addresses.zetaToken,
        omniTravelAddress
    });
    
    console.log("\n📋 Next steps:");
    console.log(`   1. Set this connector in OmniTravel.setChainConnector(${getChainId(network)}, "${address}")`);
    
    return address;
}

function getChainId(network) {
    const chainIds = {
        zetaAthens: 7001,
        bscTestnet: 97,
        ethSepolia: 11155111
    };
    return chainIds[network];
}

function saveDeployment(contractName, network, address, args) {
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir);
    }
    
    const filePath = path.join(deploymentsDir, `${contractName}-${network}.json`);
    const data = {
        contractName,
        network,
        chainId: getChainId(network),
        address,
        constructorArgs: args,
        deployedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`📁 Deployment saved to: ${filePath}`);
}

function loadDeploymentAddress(contractName, network) {
    const filePath = path.join(__dirname, "..", "deployments", `${contractName}-${network}.json`);
    if (!fs.existsSync(filePath)) {
        return null;
    }
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return data.address;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
