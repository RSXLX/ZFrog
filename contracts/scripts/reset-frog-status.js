const hre = require("hardhat");
const path = require("path");
const fs = require("fs");

async function main() {
  // Load addresses
  const addressesPath = path.join(__dirname, "../deployed-addresses.json");
  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
  
  const ZETA_FROG_NFT = addresses.zetaAthens.zetaFrogNFT_proxy || addresses.zetaAthens.zetaFrogNFT;
  
  console.log(`Resetting Frog Status on ZetaFrogNFT: ${ZETA_FROG_NFT}`);

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);

  const ZetaFrogNFT = await hre.ethers.getContractAt("ZetaFrogNFTUpgradeable", ZETA_FROG_NFT);

  // Check current status
  try {
      const status = await ZetaFrogNFT.getFrogStatus(0);
      console.log(`Current Status of Frog 0: ${status} (0=Idle, 1=Traveling, 2=Locked)`);
      
      if (status != 0) {
          console.log("Status is not Idle. Attempting reset...");
          const tx = await ZetaFrogNFT.connect(deployer).emergencyResetFrogStatus(0);
          console.log(`Tx sent: ${tx.hash}`);
          await tx.wait();
          console.log("✅ Frog 0 status reset to Idle via emergencyResetFrogStatus");
      } else {
          console.log("Frog 0 is already Idle. No action needed on NFT contract.");
      }
  } catch (error) {
      console.error("Error checking or resetting status:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
