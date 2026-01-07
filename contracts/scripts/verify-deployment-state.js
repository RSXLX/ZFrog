const hre = require("hardhat");

const OMNI_TRAVEL_ADDRESS = "0xb59021e219AEa77fbBdc1Bfc8Ed56fF2B4975bd6";
const ZETA_FROG_NFT = "0x0721CDff3291a1Dd2af28633B5dEE5427553F09E";
const SYSTEM_ROUTER = "0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe";
const WZETA = "0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf";
const ZRC20_BSC = "0xd97B1de3619ed2c6BEb3860147E30cA8A7dC9891";

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log(`Using account: ${deployer.address}`);

    const omniTravel = await hre.ethers.getContractAt("OmniTravel", OMNI_TRAVEL_ADDRESS);
    const zetaFrog = await hre.ethers.getContractAt("ZetaFrogNFTUpgradeable", ZETA_FROG_NFT); // Using the implementation ABI name roughly
    const router = await hre.ethers.getContractAt("IUniswapV2Router02", SYSTEM_ROUTER);

    console.log("\n🔍 Verifying OmniTravel Configuration...");
    const routerOnContract = await omniTravel.systemRouter();
    const wzetaOnContract = await omniTravel.wzeta();
    
    console.log(`   System Router: ${routerOnContract} ${routerOnContract === SYSTEM_ROUTER ? "✅" : "❌"}`);
    console.log(`   WZETA: ${wzetaOnContract} ${wzetaOnContract === WZETA ? "✅" : "❌"}`);

    console.log("\n🔍 Verifying ZetaFrogNFT Authorization...");
    // Assuming 'travelContract' or 'omniTravelContract' is public or has a getter?
    // The contract has 'travelContract' and 'omniTravelContract'
    // But they might be private or internal in some versions, let's try to infer from 'onlyTravelContract' modifier behavior if possible without getters
    // Or check public getters if they exist.
    try {
        const omniAddress = await zetaFrog.omniTravelContract();
        console.log(`   OmniTravel Contract on NFT: ${omniAddress} ${omniAddress === OMNI_TRAVEL_ADDRESS ? "✅" : "❌"}`);
    } catch (e) {
        console.log("   Could not read omniTravelContract directly:", e.message);
    }

    console.log("\n💧 Checking Liquidity (ZETA -> ZRC20_BSC)...");
    try {
        const amountOut = hre.ethers.parseEther("1"); // 1 ZRC20 (for gas fee estimation usually around 0.01 but let's see)
        // Actually we need to simulate getAmountsIn for a typical gas fee
        // Typical gas fee logic: withdrawGasFeeWithGasLimit(500000)
        
        const zrc20 = await hre.ethers.getContractAt("IZRC20", ZRC20_BSC);
        const [, gasFee] = await zrc20.withdrawGasFeeWithGasLimit(500000);
        console.log(`   Estimated Gas Fee (ZRC20): ${gasFee.toString()}`);

        const path = [WZETA, ZRC20_BSC];
        const amountsIn = await router.getAmountsIn(gasFee, path);
        console.log(`   ZETA needed for swap: ${hre.ethers.formatEther(amountsIn[0])} ZETA`);
        console.log("   ✅ Liquidity Pool Exists and Quote Received");
    } catch (e) {
        console.log("   ❌ Liquidity Check Failed:", e.message);
        if (e.message.includes("INSUFFICIENT_LIQUIDITY")) {
            console.log("   ⚠️  FATAL: No liquidity for WZETA -> ZRC20 pair on testnet.");
        }
    }
}

main().catch(console.error);
