const hre = require("hardhat");

async function main() {
  const OMNI_TRAVEL = "0x758CF5427F5BEBBb2F0Ea5b92F20Beacd6CaDEB3";
  const ZETA_FROG_NFT = "0x0721CDff3291a1Dd2af28633B5dEE5427553F09E";
  const TOKEN_ID = 0;

  console.log(`🔍 Verifying Status for Token ${TOKEN_ID}...`);
  console.log(`   OmniTravel: ${OMNI_TRAVEL}`);
  console.log(`   ZetaFrogNFT: ${ZETA_FROG_NFT}`);

  const [signer] = await hre.ethers.getSigners();
  console.log(`   Caller: ${signer.address}`);

  // 1. Check ZetaFrogNFT Status
  const ZetaFrogNFT = await hre.ethers.getContractAt("ZetaFrogNFTUpgradeable", ZETA_FROG_NFT);
  const status = await ZetaFrogNFT.getFrogStatus(TOKEN_ID);
  console.log(`\n🐸 NFT Status: ${status} (0=Idle, 1=Traveling, 2=Locked)`);
  
  const owner = await ZetaFrogNFT.ownerOf(TOKEN_ID);
  console.log(`   Owner: ${owner}`);

  // 2. Check OmniTravel canStart
  const OmniTravel = await hre.ethers.getContractAt("OmniTravel", OMNI_TRAVEL);
  
  try {
      const canStart = await OmniTravel.canStartCrossChainTravel(TOKEN_ID);
      console.log(`\n✈️  canStartCrossChainTravel: ${canStart}`);
  } catch (e) {
      console.log(`\n❌ canStartCrossChainTravel Reverted: ${e.message}`);
  }

  // 3. Check OmniTravel internal status
  try {
      const travel = await OmniTravel.crossChainTravels(TOKEN_ID);
      console.log(`\n📋 Internal Travel Record:`);
      console.log(`   Status: ${travel.status} (0=None, 5=Completed)`);
      console.log(`   TargetChain: ${travel.targetChainId}`);
  } catch (e) {
      console.log(`\n❌ Could not read crossChainTravels: ${e.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
