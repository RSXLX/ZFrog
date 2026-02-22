/**
 * 检查 OmniTravel 授权状态
 * 用于诊断 "Caller is not authorized" 错误
 * 
 * 运行: npx hardhat run scripts/check-omni-travel-auth.js --network zetaAthens
 */

const hre = require("hardhat");

async function main() {
  console.log("=== 检查 OmniTravel 授权状态 ===\n");

  // 合约地址
  const ZETAFROG_NFT_PROXY = "0x0721CDff3291a1Dd2af28633B5dEE5427553F09E";
  const FRONTEND_OMNI_TRAVEL = "0x0F4B80d84363B3FCdC1F4fBb8d749c894B087E5a";
  const OMNI_TRAVEL_V1 = "0x52B090700Ca9fb2EBBbc964fDde60A0513Df7cd7";
  const OMNI_TRAVEL_V2 = "0x51D60F01B8e19CFd94097933ca26bA0f77eB0241";

  // 获取 ZetaFrogNFT 合约实例（使用 ABI 片段）
  const zetaFrogAbi = [
    "function travelContract() view returns (address)",
    "function omniTravelContract() view returns (address)",
    "function owner() view returns (address)"
  ];

  const zetaFrog = new hre.ethers.Contract(ZETAFROG_NFT_PROXY, zetaFrogAbi, hre.ethers.provider);

  try {
    console.log("1. ZetaFrogNFT 合约信息:");
    console.log(`   地址: ${ZETAFROG_NFT_PROXY}`);
    
    const owner = await zetaFrog.owner();
    console.log(`   Owner: ${owner}`);
    
    const registeredTravel = await zetaFrog.travelContract();
    console.log(`   已注册的 travelContract: ${registeredTravel}`);
    
    const registeredOmniTravel = await zetaFrog.omniTravelContract();
    console.log(`   已注册的 omniTravelContract: ${registeredOmniTravel}`);

    console.log("\n2. 地址比对:");
    console.log(`   前端配置的 OmniTravel: ${FRONTEND_OMNI_TRAVEL}`);
    console.log(`   OmniTravel v1 (部署记录): ${OMNI_TRAVEL_V1}`);
    console.log(`   OmniTravel v2 (部署记录): ${OMNI_TRAVEL_V2}`);

    console.log("\n3. 授权检查:");
    const isFrontendAuthorized = registeredOmniTravel.toLowerCase() === FRONTEND_OMNI_TRAVEL.toLowerCase();
    const isV1Authorized = registeredOmniTravel.toLowerCase() === OMNI_TRAVEL_V1.toLowerCase();
    const isV2Authorized = registeredOmniTravel.toLowerCase() === OMNI_TRAVEL_V2.toLowerCase();
    
    console.log(`   前端配置的地址已授权: ${isFrontendAuthorized ? "✅ 是" : "❌ 否"}`);
    console.log(`   v1 地址已授权: ${isV1Authorized ? "✅ 是" : "❌ 否"}`);
    console.log(`   v2 地址已授权: ${isV2Authorized ? "✅ 是" : "❌ 否"}`);

    console.log("\n4. 诊断结果:");
    if (!isFrontendAuthorized) {
      console.log("   ❌ 问题确认: 前端使用的 OmniTravel 地址未在 ZetaFrogNFT 中授权！");
      console.log("\n   修复方案:");
      if (registeredOmniTravel === "0x0000000000000000000000000000000000000000") {
        console.log("   选项 A: 在 ZetaFrogNFT 上调用 setOmniTravelContract，设置正确的 OmniTravel 地址");
        console.log(`           推荐使用 v2 地址: ${OMNI_TRAVEL_V2}`);
      } else {
        console.log(`   选项 A: 更新前端配置，使用已授权的地址: ${registeredOmniTravel}`);
        console.log(`   选项 B: 更新链上配置，授权前端当前使用的地址: ${FRONTEND_OMNI_TRAVEL}`);
      }
    } else {
      console.log("   ✅ 授权配置正确，问题可能在其他地方");
    }

  } catch (e) {
    console.error("查询失败:", e.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
