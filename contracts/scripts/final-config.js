const hre = require("hardhat");

const ADDRESSES = {
    nft: "0xE3dDAE91EEaF453FC28Bc0C3D9Ef99e23eC98C85",
    souvenir: "0xaBFE965C4b36Ad69615767C5305C731327962135",
    travel: "0x4C3327B33bdAcF8C525D83E9Ea8955b342c075DC",
    omni: "0x292AA79a2a9754014BC3f23E81f31B9b896A60B5",
    gateway: "0xfEDD7A6e3Ef1cC470fbfbF955a22D793dDC0F44E",
    bscConnector: "0x9Ce2eE60a1AAc48a79b9A3eb11bf903556268674",
    sepoliaConnector: "0x63809b8CD0bD3336491B2BA2b1e7E1a1A630e86a",
    backend: "0x53C1844Af058fE3B3195e49fEC8f97E0a4F87772" // Relayer
};

async function main() {
    console.log("⚙️ Starting Final Configuration...");
    const [deployer] = await hre.ethers.getSigners();
    console.log("Signer:", deployer.address);

    const nft = await hre.ethers.getContractAt("ZetaFrogNFT", ADDRESSES.nft);
    const souvenir = await hre.ethers.getContractAt("SouvenirNFT", ADDRESSES.souvenir);
    const travel = await hre.ethers.getContractAt("Travel", ADDRESSES.travel);
    const omni = await hre.ethers.getContractAt("OmniTravel", ADDRESSES.omni);

    // 1. Configure NFT
    console.log("\n1. Configuring ZetaFrogNFT...");
    try {
        console.log("   setting SouvenirNFT...");
        let tx = await nft.setSouvenirNFT(ADDRESSES.souvenir);
        await tx.wait();
        console.log("   ✅ Done");
    } catch (e) { console.log(`   ⚠️ Failed: ${e.reason || e.message}`); }

    try {
        console.log("   setting TravelContract...");
        let tx = await nft.setTravelContract(ADDRESSES.travel);
        await tx.wait();
        console.log("   ✅ Done");
    } catch (e) { console.log(`   ⚠️ Failed: ${e.reason || e.message}`); }

    try {
        console.log("   setting OmniTravelContract...");
        let tx = await nft.setOmniTravelContract(ADDRESSES.omni);
        await tx.wait();
        console.log("   ✅ Done");
    } catch (e) { console.log(`   ⚠️ Failed: ${e.reason || e.message}`); }


    // 2. Configure Souvenir
    console.log("\n2. Configuring SouvenirNFT...");
    try {
        console.log("   setting ZetaFrogNFT...");
        let tx = await souvenir.setZetaFrogNFT(ADDRESSES.nft);
        await tx.wait();
        console.log("   ✅ Done");
    } catch (e) { console.log(`   ⚠️ Failed: ${e.reason || e.message}`); }

    try {
        console.log("   setting Minter...");
        let tx = await souvenir.setMinter(ADDRESSES.backend);
        await tx.wait();
        console.log("   ✅ Done");
    } catch (e) { console.log(`   ⚠️ Failed: ${e.reason || e.message}`); }


    // 3. Configure Travel
    console.log("\n3. Configuring Travel...");
    try {
        console.log("   setting TravelManager...");
        let tx = await travel.setTravelManager(ADDRESSES.backend);
        await tx.wait();
        console.log("   ✅ Done");
    } catch (e) { console.log(`   ⚠️ Failed: ${e.reason || e.message}`); }

    try {
        console.log("   setting SupportedChain (7001)...");
        let tx = await travel.setSupportedChain(7001, true);
        await tx.wait();
        console.log("   ✅ Done");
    } catch (e) { console.log(`   ⚠️ Failed: ${e.reason || e.message}`); }


    // 4. Configure OmniTravel
    console.log("\n4. Configuring OmniTravel...");
    try {
        console.log("   setting TestMode...");
        let tx = await omni.setTestMode(true);
        await tx.wait();
        console.log("   ✅ Done");
    } catch (e) { console.log(`   ⚠️ Failed: ${e.reason || e.message}`); }

    try {
        console.log("   setting BSC Config...");
        const zrc20BNB = "0xd97B1de3619ed2c6BEb3860147E30cA8A7dC9891";
        const connector = hre.ethers.zeroPadValue(ADDRESSES.bscConnector, 32);
        let tx = await omni.setChainConfig(97, connector, zrc20BNB);
        await tx.wait();
        console.log("   ✅ Done");
    } catch (e) { console.log(`   ⚠️ Failed: ${e.reason || e.message}`); }
    
    try {
        console.log("   setting Sepolia Config...");
        const zrc20ETH = "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0";
        const connector = hre.ethers.zeroPadValue(ADDRESSES.sepoliaConnector, 32);
        let tx = await omni.setChainConfig(11155111, connector, zrc20ETH);
        await tx.wait();
        console.log("   ✅ Done");
    } catch (e) { console.log(`   ⚠️ Failed: ${e.reason || e.message}`); }

    console.log("\n🎉 Configuration Complete!");
}

main().catch(console.error);
