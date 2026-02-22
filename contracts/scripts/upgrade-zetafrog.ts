/**
 * 升级 ZetaFrogNFT 合约脚本
 * 
 * 使用方法:
 *   npx hardhat run scripts/upgrade-zetafrog.ts --network zetachain
 */

import { ethers, upgrades } from "hardhat";

const ZETAFROG_PROXY_ADDRESS = process.env.ZETAFROG_NFT_ADDRESS || "0x0721CDff3291a1Dd2af28633B5dEE5427553F09E";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("=== ZetaFrogNFT 升级脚本 ===");
  console.log("操作账户:", deployer.address);
  console.log("代理地址:", ZETAFROG_PROXY_ADDRESS);
  console.log("");

  // 获取新实现合约工厂
  const ZetaFrogNFTV2 = await ethers.getContractFactory("ZetaFrogNFTUpgradeable");
  
  console.log("正在验证升级兼容性...");
  
  // 执行升级
  console.log("开始升级...");
  const upgraded = await upgrades.upgradeProxy(ZETAFROG_PROXY_ADDRESS, ZetaFrogNFTV2);
  await upgraded.waitForDeployment();
  
  const newAddress = await upgraded.getAddress();
  console.log("✅ 升级成功!");
  console.log("代理地址:", newAddress);
  
  // 验证新版本
  const version = await upgraded.version();
  console.log("新版本:", version);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("升级失败:", error);
    process.exit(1);
  });
