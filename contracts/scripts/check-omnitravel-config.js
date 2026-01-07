const { ethers } = require("hardhat");

async function main() {
  const OmniTravelAddr = "0x292AA79a2a9754014BC3f23E81f31B9b896A60B5"; // From env
  const BSC_CHAIN_ID = 97;
  const SEPOLIA_CHAIN_ID = 11155111;

  const OmniTravel = await ethers.getContractAt("OmniTravel", OmniTravelAddr);
  
  console.log("Checking OmniTravel connector configuration...");
  
  const bscConnector = await OmniTravel.chainConnectors(BSC_CHAIN_ID);
  console.log(`BSC Connector (97): ${bscConnector}`);
  
  const sepoliaConnector = await OmniTravel.chainConnectors(SEPOLIA_CHAIN_ID);
  console.log(`Sepolia Connector (11155111): ${sepoliaConnector}`);
  
  const EXPECTED_BSC = "0x8E79969718D2ffFf2a16DA65DE8cE097ceA04aec";
  const EXPECTED_SEPOLIA = "0xca54986f91129D1AF3de67b331eBB36b330863C9";

  if (bscConnector.toLowerCase() === EXPECTED_BSC.toLowerCase()) {
      console.log("✅ BSC Connector matches v3.");
  } else {
      console.log("❌ BSC Connector MISMATCH! Expected:", EXPECTED_BSC);
  }

  if (sepoliaConnector.toLowerCase() === EXPECTED_SEPOLIA.toLowerCase()) {
      console.log("✅ Sepolia Connector matches v3.");
  } else {
      console.log("❌ Sepolia Connector MISMATCH! Expected:", EXPECTED_SEPOLIA);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
