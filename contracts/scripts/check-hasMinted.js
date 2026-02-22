/**
 * 检查 hasMinted 状态脚本
 * 
 * 使用方法:
 *   npx hardhat run scripts/check-hasMinted.js --network zetaAthens
 */

const { ethers } = require("hardhat");

const ZETAFROG_PROXY_ADDRESS = "0x0721CDff3291a1Dd2af28633B5dEE5427553F09E";

// 只需最小 ABI 来读取状态
const MINIMAL_ABI = [
  "function hasMinted(address) view returns (bool)",
  "function ownerToTokenId(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function version() view returns (string)",
  "function adminResetHasMinted(address user)"
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("=== ZetaFrog hasMinted 状态检查 ===");
  console.log("操作账户:", deployer.address);
  console.log("合约地址:", ZETAFROG_PROXY_ADDRESS);
  console.log("");

  // 获取合约实例
  const zetaFrog = new ethers.Contract(ZETAFROG_PROXY_ADDRESS, MINIMAL_ABI, deployer);

  // 检查版本
  try {
    const version = await zetaFrog.version();
    console.log("合约版本:", version);
  } catch (e) {
    console.log("无法读取版本:", e.message);
  }

  // 检查总供应量
  const totalSupply = await zetaFrog.totalSupply();
  console.log("当前总供应量:", totalSupply.toString(), "/ 1000");
  console.log("");

  // 检查 deployer 的状态
  console.log("--- 检查当前账户 ---");
  const deployerHasMinted = await zetaFrog.hasMinted(deployer.address);
  const deployerTokenId = await zetaFrog.ownerToTokenId(deployer.address);
  console.log(`地址: ${deployer.address}`);
  console.log(`hasMinted: ${deployerHasMinted}`);
  console.log(`tokenId: ${deployerTokenId.toString()}`);

  // 如果需要重置
  const shouldReset = process.env.DO_RESET === "true";
  
  if (shouldReset && deployerHasMinted) {
    console.log("\n--- 执行重置 ---");
    console.log("正在重置 hasMinted 状态...");
    
    try {
      const tx = await zetaFrog.adminResetHasMinted(deployer.address);
      console.log("交易已发送:", tx.hash);
      await tx.wait();
      console.log("✅ 重置成功!");
      
      // 验证
      const newHasMinted = await zetaFrog.hasMinted(deployer.address);
      console.log(`验证: hasMinted = ${newHasMinted}`);
    } catch (error) {
      console.error("❌ 重置失败:", error.message || error);
      if (error.message && error.message.includes("Ownable")) {
        console.log("提示: 只有合约 Owner 才能执行此操作");
      }
      if (error.message && error.message.includes("execution reverted")) {
        console.log("\n⚠️ 注意: adminResetHasMinted 函数可能还没有在链上。");
        console.log("需要先升级合约才能使用此功能。");
      }
    }
  } else if (shouldReset && !deployerHasMinted) {
    console.log("\n当前地址尚未铸造过青蛙，无需重置");
  } else {
    console.log("\n提示: 设置 DO_RESET=true 环境变量来执行重置操作");
    console.log("例如: set DO_RESET=true && npx hardhat run scripts/check-hasMinted.js --network zetaAthens");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
