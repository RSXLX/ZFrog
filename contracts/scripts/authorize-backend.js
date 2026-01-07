// scripts/authorize-backend.js
// 一次性授权后端钱包为 TravelManager

const hre = require("hardhat");

async function main() {
  const OMNI_TRAVEL_ADDRESS = "0xE36713321E988d237D940A25BAb7Ad509f4f1387";
  const BACKEND_WALLET = "0x53C1844Af058fE3B3195e49fEC8f97E0a4F87772";
  
  console.log("=".repeat(50));
  console.log("🔐 授权后端钱包为 TravelManager");
  console.log("=".repeat(50));
  console.log(`OmniTravel 合约: ${OMNI_TRAVEL_ADDRESS}`);
  console.log(`后端钱包地址: ${BACKEND_WALLET}`);
  console.log("");
  
  // 获取 signer (应该是合约 owner)
  const [signer] = await hre.ethers.getSigners();
  console.log(`使用签名者: ${signer.address}`);
  
  // 连接到 OmniTravel 合约
  const omniTravel = await hre.ethers.getContractAt("OmniTravel", OMNI_TRAVEL_ADDRESS, signer);
  
  // 检查当前 owner
  try {
    const owner = await omniTravel.owner();
    console.log(`合约 Owner: ${owner}`);
    
    if (owner.toLowerCase() !== signer.address.toLowerCase()) {
      console.log("❌ 错误: 当前签名者不是合约 owner，无法授权");
      console.log("   请确保 .env 中的 PRIVATE_KEY 是合约部署者的私钥");
      return;
    }
  } catch (e) {
    console.log("⚠️ 无法读取 owner，继续尝试授权...");
  }
  
  // 检查当前授权状态
  try {
    // Check if travelManager is a public variable (address)
    const currentManager = await omniTravel.travelManager();
    console.log(`当前 TravelManager: ${currentManager}`);
    
    if (currentManager.toLowerCase() === BACKEND_WALLET.toLowerCase()) {
      console.log("✅ 后端钱包已经是 TravelManager，无需重复授权");
      return;
    }
  } catch (e) {
    console.log("⚠️ 无法检查当前授权状态，继续尝试授权...");
    console.log(e.message);
  }
  
  // 执行授权
  console.log("");
  console.log("📝 正在发送授权交易...");
  
  try {
    // setTravelManager takes only address, not boolean
    const tx = await omniTravel.setTravelManager(BACKEND_WALLET);
    console.log(`交易已发送: ${tx.hash}`);
    console.log("等待确认...");
    
    const receipt = await tx.wait();
    console.log(`✅ 授权成功！区块号: ${receipt.blockNumber}`);
    console.log("");
    console.log("🎉 后端钱包现在可以调用 markTravelCompleted 来解锁青蛙了！");
  } catch (error) {
    console.log("❌ 授权失败:", error.message || error);
    console.log("");
    console.log("可能原因:");
    console.log("1. 当前私钥不是合约 owner");
    console.log("2. 合约没有 setTravelManager 函数");
    console.log("3. 网络连接问题");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
