const hre = require("hardhat");

const ADDRESSES = {
    nft: "0xE3dDAE91EEaF453FC28Bc0C3D9Ef99e23eC98C85",
    omni: "0x292AA79a2a9754014BC3f23E81f31B9b896A60B5"
};

async function main() {
    const [signer] = await hre.ethers.getSigners();
    console.log("Acc:", signer.address);

    const omni = await hre.ethers.getContractAt("OmniTravel", ADDRESSES.omni);
    const nft = await hre.ethers.getContractAt("ZetaFrogNFT", ADDRESSES.nft);

    const tokenId = 0; // Assuming frog 0 exists
    const targetChainId = 97; // BSC Testnet
    const duration = 60; // 1 min

    console.log("Checking status...");
    const status = await nft.getFrogStatus(tokenId);
    console.log("Frog Status:", status); // 0 = Idle

    console.log("Checking eligibility...");
    const canStart = await omni.canStartCrossChainTravel(tokenId);
    console.log("Can Start:", canStart);

    if (!canStart) {
        console.log("Cannot start. Checking existing travels...");
        const travel = await omni.getCrossChainTravel(tokenId);
        console.log("Existing Travel:", travel);
        return;
    }

    console.log("Approving...");
    const isApproved = await nft.isApprovedForAll(signer.address, ADDRESSES.omni);
    if (!isApproved) {
        console.log("Setting approval...");
        await (await nft.setApprovalForAll(ADDRESSES.omni, true)).wait();
    }

    console.log("Starting Travel...");
    const fee = hre.ethers.parseEther("0.002"); // 0.002 ZETA (frontend uses this for test)
    
    try {
        const tx = await omni.startCrossChainTravel(tokenId, targetChainId, duration, { value: fee });
        console.log("Tx Sent:", tx.hash);
        await tx.wait();
        console.log("✅ Success!");
    } catch (e) {
        console.error("❌ Failed:", e.message);
        if (e.data) console.error("Data:", e.data);
    }
}

main().catch(console.error);
