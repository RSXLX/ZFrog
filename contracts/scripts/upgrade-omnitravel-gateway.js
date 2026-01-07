const { ethers, upgrades } = require("hardhat");

async function main() {
  // Get the address from environment or config
  // Note: Ensure OMNI_TRAVEL_ADDRESS is set in your .env file
  const OmniTravelAddress = process.env.OMNI_TRAVEL_ADDRESS;
  
  if (!OmniTravelAddress) {
    console.error("❌ Error: OMNI_TRAVEL_ADDRESS environment variable is missing.");
    console.log("Please add OMNI_TRAVEL_ADDRESS=<your_contract_address> to your .env file");
    return;
  }

  console.log("🚀 Starting OmniTravel Upgrade...");
  console.log("Target Proxy Address:", OmniTravelAddress);

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // 1. Upgrade the Contract
  console.log("Compiling and upgrading proxy...");
  const OmniTravel = await ethers.getContractFactory("OmniTravel");
  
  // Define constructor args for validation (must match existing implementation's constructor args)
  // ZetaFrogNFT: 0x0721CDff3291a1Dd2af28633B5dEE5427553F09E (from contracts.ts)
  // Gateway v2: 0x6c533f7fe93fae114d0954697069df8eac50590a (Athens-3 standard gateway)
  const ZETAFROG_ADDRESS = "0x0721CDff3291a1Dd2af28633B5dEE5427553F09E";
  const GATEWAY_ADDRESS = "0x6c533f7fe93fae114d0954697069df8eac50590a";
  
  const omniTravel = await upgrades.upgradeProxy(OmniTravelAddress, OmniTravel, {
      constructorArgs: [ZETAFROG_ADDRESS, GATEWAY_ADDRESS],
      unsafeAllow: ['state-variable-immutable']
  });
  
  await omniTravel.waitForDeployment();
  console.log("✅ OmniTravel upgraded successfully!");

  // 2. Configure System Parameters (ZetaChain Athens-3)
  const SYSTEM_ROUTER = "0x2ca7d64A7EFE2D62A04be5eb797f9561eL72b3F"; // Uniswap V2 Router02
  const WZETA = "0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf";        // WZETA Token
  
  console.log("\n⚙️  Configuring System Parameters for ZETA-Only Swap...");
  console.log(`   Router: ${SYSTEM_ROUTER}`);
  console.log(`   WZETA:  ${WZETA}`);

  try {
    const tx = await omniTravel.setSystemConfig(SYSTEM_ROUTER, WZETA);
    console.log("   Transaction sent:", tx.hash);
    await tx.wait();
    console.log("✅ System Config Set!");
  } catch (error) {
    console.error("❌ Error setting system config:", error.message);
  }

  console.log("\n🎉 Upgrade and Configuration Complete!");
  console.log("You can now trigger explorations using ZETA only!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
