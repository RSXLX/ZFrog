const hre = require("hardhat");

const ADDRESSES = {
    nft: "0xE3dDAE91EEaF453FC28Bc0C3D9Ef99e23eC98C85",
    omni: "0x292AA79a2a9754014BC3f23E81f31B9b896A60B5"
};

async function main() {
    const omni = await hre.ethers.getContractAt("OmniTravel", ADDRESSES.omni);
    const nft = await hre.ethers.getContractAt("ZetaFrogNFT", ADDRESSES.nft);

    const tokenId = 0; 
    console.log(`Checking status for Frog ${tokenId}...`);

    const status = await nft.getFrogStatus(tokenId);
    console.log("NFT Status (0=Idle, 1=Traveling):", status);

    const travel = await omni.crossChainTravels(tokenId);
    console.log("Travel Info:");
    console.log("- Status:", travel.status.toString(), "(0=None, 1=Locked, 2=Traveling, 3=OnTarget, 5=Completed)");
    console.log("- Target Chain:", travel.targetChainId.toString());
    console.log("- Start Time:", new Date(Number(travel.startTime) * 1000).toLocaleString());
    console.log("- Max Duration:", Number(travel.maxDuration), "seconds");

    const active = await omni.canStartCrossChainTravel(tokenId);
    console.log("Can Start New Travel:", active);
    
    // Check pause state
    const paused = await omni.paused();
    console.log("Contract Paused:", paused);
}

main().catch(console.error);
