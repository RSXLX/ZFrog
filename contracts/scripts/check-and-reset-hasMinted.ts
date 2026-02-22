/**
 * 检查并重置 hasMinted 状态脚本
 * 
 * 使用方法:
 *   npx hardhat run scripts/check-and-reset-hasMinted.ts --network zetachain
 */

import { ethers, upgrades } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

const ZETAFROG_PROXY_ADDRESS = process.env.ZETAFROG_NFT_ADDRESS || "0x0721CDff3291a1Dd2af28633B5dEE5427553F09E";

// 要检查/重置的地址（从命令行参数或环境变量获取）
const TARGET_ADDRESSES = process.env.RESET_ADDRESSES?.split(",") || [];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("=== ZetaFrogNFT hasMinted 状态检查工具 ===");
  console.log("操作账户:", deployer.address);
  console.log("合约地址:", ZETAFROG_PROXY_ADDRESS);
  console.log("");

  // 获取合约实例
  const ZetaFrogNFT = await ethers.getContractFactory("ZetaFrogNFTUpgradeable");
  const zetaFrog = ZetaFrogNFT.attach(ZETAFROG_PROXY_ADDRESS);

  // 检查 deployer 的状态
  console.log("--- 检查当前账户 ---");
  const deployerHasMinted = await zetaFrog.hasMinted(deployer.address);
  const deployerTokenId = await zetaFrog.ownerToTokenId(deployer.address);
  console.log(`地址: ${deployer.address}`);
  console.log(`hasMinted: ${deployerHasMinted}`);
  console.log(`tokenId: ${deployerTokenId.toString()}`);

  // 如果有额外的地址需要检查
  if (TARGET_ADDRESSES.length > 0) {
    console.log("\n--- 检查指定地址 ---");
    for (const addr of TARGET_ADDRESSES) {
      const trimmedAddr = addr.trim();
      if (ethers.isAddress(trimmedAddr)) {
        const hasMinted = await zetaFrog.hasMinted(trimmedAddr);
        const tokenId = await zetaFrog.ownerToTokenId(trimmedAddr);
        console.log(`地址: ${trimmedAddr}`);
        console.log(`  hasMinted: ${hasMinted}`);
        console.log(`  tokenId: ${tokenId.toString()}`);
      }
    }
  }

  // 检查是否需要重置
  const shouldReset = process.env.DO_RESET === "true";
  
  if (shouldReset && deployerHasMinted) {
    console.log("\n--- 执行重置 ---");
    console.log("正在重置 deployer 地址的 hasMinted 状态...");
    
    try {
      const tx = await zetaFrog.adminResetHasMinted(deployer.address);
      console.log("交易已发送:", tx.hash);
      await tx.wait();
      console.log("✅ 重置成功!");
      
      // 验证
      const newHasMinted = await zetaFrog.hasMinted(deployer.address);
      console.log(`验证: hasMinted = ${newHasMinted}`);
    } catch (error: any) {
      console.error("❌ 重置失败:", error.message);
      if (error.message.includes("Ownable")) {
        console.log("提示: 只有合约 Owner 才能执行此操作");
      }
    }
  } else if (shouldReset && !deployerHasMinted) {
    console.log("\n当前地址尚未铸造过青蛙，无需重置");
  } else {
    console.log("\n提示: 设置 DO_RESET=true 环境变量来执行重置操作");
  }

  // 统计信息
  console.log("\n--- 合约统计 ---");
  const totalSupply = await zetaFrog.totalSupply();
  console.log(`当前总供应量: ${totalSupply.toString()} / 1000`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
