const hre = require("hardhat");

async function main() {
    const ZETAFROG_ADDRESS = process.env.VITE_CONTRACT_ADDRESS_ZETAFROG || process.env.ZETAFROG_NFT_ADDRESS;
    const TRAVEL_ADDRESS = process.env.VITE_CONTRACT_ADDRESS_TRAVEL || process.env.TRAVEL_CONTRACT_ADDRESS;
    
    console.log("Checking Frog 18...");
    const ZetaFrogNFT = await hre.ethers.getContractFactory("ZetaFrogNFT");
    const zetaFrogNFT = ZetaFrogNFT.attach(ZETAFROG_ADDRESS);

    const Travel = await hre.ethers.getContractFactory("Travel");
    const travel = Travel.attach(TRAVEL_ADDRESS);

    const status = await zetaFrogNFT.getFrogStatus(18);
    console.log("🐸 Status:", status.toString() === "1" ? "Traveling" : "Idle (Completed!)");

    const journals = await travel.getTravelJournals(18);
    console.log("📒 Journals:", journals);
    
    const xp = await zetaFrogNFT.getFrogExperience(18);
    console.log("⭐ XP:", xp.toString());
}

main().catch(console.error);
