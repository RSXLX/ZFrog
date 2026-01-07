const hre = require("hardhat");

async function main() {
  const OmniTravelAddress = "0x743476f8201885B396329c8AC03b560e1D240666";
  const tokenId = 6;

  const OmniTravel = await hre.ethers.getContractAt("OmniTravel", OmniTravelAddress);
  
  // Get ZetaFrogNFT address from OmniTravel
  const ZetaFrogNFTAddress = await OmniTravel.zetaFrogNFT();
  console.log(`ZetaFrogNFT Address (from OmniTravel): ${ZetaFrogNFTAddress}`);
  
  const ZetaFrogNFT = await hre.ethers.getContractAt("ZetaFrogNFT", ZetaFrogNFTAddress);

  console.log(`Checking status for Frog #${tokenId}...`);

  // 1. Check Frog Status on NFT Contract
  const status = await ZetaFrogNFT.getFrogStatus(tokenId);
  console.log(`On-chain FrogStatus: ${status} (0=Idle, 1=Traveling)`);

  // 2. Check Travel Status on OmniTravel Contract
  const travel = await OmniTravel.crossChainTravels(tokenId);
  console.log(`On-chain CrossChainStatus: ${travel.status} (0=None, 1=Locked, 2=Traveling, 3=OnTarget, 4=Returning, 5=Completed, 6=Failed, 7=Timeout)`);

  // 3. Check canStartCrossChainTravel directly
  try {
    const canStart = await OmniTravel.canStartCrossChainTravel(tokenId);
    console.log(`canStartCrossChainTravel result: ${canStart}`);
  } catch (error) {
    console.error("Error calling canStartCrossChainTravel:", error.message);
  }

  // 4. Check owner
  const owner = await ZetaFrogNFT.ownerOf(tokenId);
  console.log(`Owner: ${owner}`);
  
  // 5. Check approval
  const isApproved = await ZetaFrogNFT.isApprovedForAll(owner, OmniTravelAddress);
  console.log(`Is OmniTravel authorized (isApprovedForAll): ${isApproved}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
