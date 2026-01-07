const hre = require("hardhat");

const CONTRACTS = [
    { address: "0x743476f8201885B396329c8AC03b560e1D240666", name: "v2-New (0x7434)" },
    { address: "0x4366FDd3a1BFe4aa7AC8042a6760cB6fEf0d0837", name: "v2-Old (0x4366)" },
    { address: "0x52B090700Ca9fb2EBBbc964fDde60A0513Df7cd7", name: "v1 (0x52B0)" }
];
const ZETA_FROG_NFT = "0x21C6C9C82C7B2317E2fa25E2cdAa29E45C84fA1f";

async function main() {
    const [signer] = await hre.ethers.getSigners();
    console.log(`\n🔍 Checking Frog #3 Status across contracts\n`);

    const ZetaFrogNFT = await hre.ethers.getContractFactory("ZetaFrogNFT");
    const zetaFrog = ZetaFrogNFT.attach(ZETA_FROG_NFT);

    // Check frog status directly from NFT
    console.log("🐸 Frog Status (ZetaFrogNFT):");
    const frogStatus = await zetaFrog.getFrogStatus(3);
    const frogOwner = await zetaFrog.ownerOf(3);
    console.log(`  Owner: ${frogOwner}`);
    console.log(`  Status: ${frogStatus} (0=Idle, 1=Traveling, 2=Locked)`);

    const OmniTravel = await hre.ethers.getContractFactory("OmniTravel");

    for (const c of CONTRACTS) {
        console.log(`\n🌐 Checking ${c.name}:`);
        try {
            const omniTravel = OmniTravel.attach(c.address);
            const travel = await omniTravel.crossChainTravels(3);
            
            const statusMap = ["None", "Locked", "Traveling", "OnTarget", "Returning", "Completed", "Failed", "Timeout"];
            console.log(`  Status: ${statusMap[travel.status]} (${travel.status})`);
            
            if (travel.status != 0) {
                console.log(`  > Travel Start: ${new Date(Number(travel.startTime)*1000).toLocaleString()}`);
            }
            
            // Check if this contract is authorized
            console.log(`  Authorized: ${await zetaFrog.omniTravelContract() === c.address ? "YES" : "NO"}`);
        } catch (e) {
            console.log(`  Error: ${e.message}`);
        }
    }
}

main().catch(console.error);
