/**
 * Configure Chain Support on New OmniTravel
 */
const hre = require("hardhat");
const path = require("path");
const fs = require("fs");

async function main() {
    const addressesPath = path.join(__dirname, "../deployed-addresses.json");
    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
    
    const OMNI_TRAVEL = addresses.zetaAthens.omniTravel;
    const BSC_CONNECTOR = addresses.bscTestnet.frogConnector;
    const SEPOLIA_CONNECTOR = addresses.ethSepolia.frogConnector;
    
    // ZRC-20 addresses on ZetaChain Athens for gas fees
    // These are the ZRC-20 representations of native tokens on other chains
    const BSC_ZRC20 = "0xd97B1de3619ed2c6BEb3860147E30cA8A7dC9891"; // ZRC20 BNB on ZetaChain
    const SEPOLIA_ZRC20 = "0x0cbe0dF132a6c6B4a2974Fa1b7Fb953CF0Cc798a"; // ZRC20 ETH on ZetaChain
    
    const [deployer] = await hre.ethers.getSigners();
    console.log(`\n🔧 Configuring OmniTravel Chain Support`);
    console.log(`   OmniTravel: ${OMNI_TRAVEL}`);
    console.log(`   Deployer: ${deployer.address}\n`);
    
    const omni = await hre.ethers.getContractAt("OmniTravelUpgradeable", OMNI_TRAVEL);
    
    // Configure BSC Testnet (chainId: 97)
    console.log(`📌 Configuring BSC Testnet (97)...`);
    console.log(`   Connector: ${BSC_CONNECTOR}`);
    console.log(`   ZRC20: ${BSC_ZRC20}`);
    
    const bscConnectorBytes = hre.ethers.getBytes(BSC_CONNECTOR);
    const tx1 = await omni.setChainConfig(97, bscConnectorBytes, BSC_ZRC20);
    console.log(`   Tx: ${tx1.hash}`);
    await tx1.wait();
    console.log(`   ✅ BSC Testnet configured`);
    
    // Configure ETH Sepolia (chainId: 11155111)
    console.log(`\n📌 Configuring ETH Sepolia (11155111)...`);
    console.log(`   Connector: ${SEPOLIA_CONNECTOR}`);
    console.log(`   ZRC20: ${SEPOLIA_ZRC20}`);
    
    const sepoliaConnectorBytes = hre.ethers.getBytes(SEPOLIA_CONNECTOR);
    const tx2 = await omni.setChainConfig(11155111, sepoliaConnectorBytes, SEPOLIA_ZRC20);
    console.log(`   Tx: ${tx2.hash}`);
    await tx2.wait();
    console.log(`   ✅ ETH Sepolia configured`);
    
    // Verify
    console.log(`\n🔍 Verifying configuration...`);
    const bscSupported = await omni.supportedChains(97);
    const sepoliaSupported = await omni.supportedChains(11155111);
    console.log(`   BSC Testnet (97): ${bscSupported ? '✅' : '❌'}`);
    console.log(`   ETH Sepolia (11155111): ${sepoliaSupported ? '✅' : '❌'}`);
    
    // Check if frog 0 can now travel
    const canStart = await omni.canStartCrossChainTravel(0);
    console.log(`\n📊 canStartCrossChainTravel(0): ${canStart}`);
    
    console.log(`\n🎉 Chain configuration complete!`);
}

main().catch(console.error);
