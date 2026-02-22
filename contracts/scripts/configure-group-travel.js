/**
 * Configure OmniTravel Chain Support
 * 使用 setChainConfig 配置支持的链
 */
const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("\n⚙️ Configuring OmniTravel Chain Support");
    console.log("========================================");
    console.log(`Deployer: ${deployer.address}`);
    
    const OMNI_ADDRESS = "0x20A08bc1deFC1be2273636Af3ba3ef8cA6EaD2C8";
    console.log(`OmniTravel: ${OMNI_ADDRESS}`);
    
    // 获取合约实例
    const omniTravel = await hre.ethers.getContractAt([
        "function setChainConfig(uint256 chainId, bytes calldata connector, address zrc20) external",
        "function supportedChains(uint256 chainId) external view returns (bool)",
        "function testMode() external view returns (bool)",
        "function owner() external view returns (address)"
    ], OMNI_ADDRESS);
    
    // 检查所有权
    const owner = await omniTravel.owner();
    console.log(`Owner: ${owner}`);
    
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
        console.log("❌ Deployer is not the owner!");
        return;
    }
    
    // 配置支持的链 - 使用正确的 ZRC20 地址 (Athens testnet)
    const chainConfigs = [
        { 
            id: 97, 
            name: "BSC Testnet",
            connector: "0x1E8D44A6D21C29332a4528439d107Fa9e9aF4752",
            zrc20: "0x48f80608B672DC30DC7e3dbBd0343c5F02C738Eb" // BNB ZRC20 on Athens
        },
        { 
            id: 11155111, 
            name: "Sepolia",
            connector: "0x1c31e32A91dcF6f76D61fDef4Aa7B2eC047Cc7A9",
            zrc20: "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0" // ETH ZRC20 on Athens
        },
        { 
            id: 7001, 
            name: "ZetaChain Athens",
            connector: hre.ethers.ZeroAddress, // 本地链不需要 connector
            zrc20: "0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf" // WZETA
        }
    ];
    
    console.log("\n📋 Configuring Chains...");
    
    for (const chain of chainConfigs) {
        const currentlySupported = await omniTravel.supportedChains(chain.id);
        console.log(`\n   Chain ${chain.id} (${chain.name}): ${currentlySupported ? "✅ Already Supported" : "❌ Not Supported"}`);
        
        if (!currentlySupported) {
            // 跳过 ZetaChain 本地链的 connector 设置
            if (chain.id === 7001) {
                console.log(`   ⏭️ Skipping ZetaChain (local chain)`);
                continue;
            }
            
            console.log(`   Setting up ${chain.name}...`);
            console.log(`   Connector: ${chain.connector}`);
            console.log(`   ZRC20: ${chain.zrc20}`);
            
            // 将 connector 地址转换为 bytes
            const connectorBytes = hre.ethers.zeroPadValue(chain.connector, 32);
            
            const tx = await omniTravel.setChainConfig(chain.id, connectorBytes, chain.zrc20);
            await tx.wait();
            console.log(`   ✅ Done`);
        }
    }
    
    console.log("\n🎉 Configuration Complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Configuration failed:", error);
        process.exit(1);
    });
