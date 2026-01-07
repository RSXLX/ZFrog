const hre = require("hardhat");

async function main() {
  const OmniTravelAddress = "0x743476f8201885B396329c8AC03b560e1D240666";
  const tokenId = 6;

  const OmniTravel = await hre.ethers.getContractAt("OmniTravel", OmniTravelAddress);

  console.log(`Executing emergencyReturn for Frog #${tokenId}...`);

  try {
    const tx = await OmniTravel.emergencyReturn(tokenId);
    console.log(`Transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log("Emergency return executed successfully!");
  } catch (error) {
    console.error("Error executing emergencyReturn:", error.message);
  }
  
  // Verify status after return
  const travel = await OmniTravel.crossChainTravels(tokenId);
  console.log(`New On-chain CrossChainStatus: ${travel.status}`);
  
  // Get ZetaFrogNFT address
  const ZetaFrogNFTAddress = await OmniTravel.zetaFrogNFT();
  const ZetaFrogNFT = await hre.ethers.getContractAt("ZetaFrogNFT", ZetaFrogNFTAddress);
  const status = await ZetaFrogNFT.getFrogStatus(tokenId);
  console.log(`New On-chain FrogStatus: ${status}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
