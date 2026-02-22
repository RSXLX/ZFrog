/**
 * 强制升级 ZetaFrogNFT 合约脚本
 * 
 * 使用方法:
 *   npx hardhat run scripts/force-upgrade-zetafrog.js --network zetaAthens
 */

const { ethers, upgrades } = require("hardhat");

const ZETAFROG_PROXY_ADDRESS = "0x0721CDff3291a1Dd2af28633B5dEE5427553F09E";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("=== ZetaFrogNFT 强制升级脚本 ===");
  console.log("操作账户:", deployer.address);
  console.log("代理地址:", ZETAFROG_PROXY_ADDRESS);
  console.log("");

  // 获取合约工厂
  const ZetaFrogNFT = await ethers.getContractFactory("ZetaFrogNFTUpgradeable");
  
  console.log("正在部署新实现合约...");
  
  // 先手动部署新实现
  const newImpl = await ZetaFrogNFT.deploy();
  await newImpl.waitForDeployment();
  const newImplAddress = await newImpl.getAddress();
  console.log("新实现合约地址:", newImplAddress);
  
  // 使用代理的 upgradeToAndCall 方法直接升级
  const proxyAbi = [
    "function upgradeToAndCall(address newImplementation, bytes memory data) external",
    "function upgradeTo(address newImplementation) external"
  ];
  
  const proxy = new ethers.Contract(ZETAFROG_PROXY_ADDRESS, proxyAbi, deployer);
  
  console.log("正在升级代理...");
  const tx = await proxy.upgradeToAndCall(newImplAddress, "0x");
  console.log("交易已发送:", tx.hash);
  await tx.wait();
  
  console.log("✅ 升级成功!");
  
  // 验证新版本
  const upgraded = new ethers.Contract(ZETAFROG_PROXY_ADDRESS, ["function version() view returns (string)"], deployer);
  const version = await upgraded.version();
  console.log("新版本:", version);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("升级失败:", error);
    process.exit(1);
  });
