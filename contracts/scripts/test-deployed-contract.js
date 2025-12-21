const hre = require("hardhat");

async function main() {
    console.log("🧪 Testing Deployed Contract...\n");

    const [owner] = await hre.ethers.getSigners();
    console.log("Testing with account:", owner.address);

    // 已部署的合约地址
    const deployedAddress = "0xE8615ffC22ff570aB21DFBE161E7Ef68820626e3";
    
    // 1. 连接到已部署的合约
    console.log("\n📝 Connecting to deployed contract...");
    const ZetaFrogNFT = await hre.ethers.getContractFactory("ZetaFrogNFT");
    const frogNFT = ZetaFrogNFT.attach(deployedAddress);
    
    console.log("✅ Connected to ZetaFrogNFT at:", deployedAddress);

    // 2. 检查青蛙状态或铸造新青蛙
    let tokenId;
    let frogStatus;
    
    try {
        // 先检查青蛙 #0 的状态
        const frog = await frogNFT.getFrog(0);
        frogStatus = frog.status;
        
        // 检查所有权
        const frogOwner = await frogNFT.ownerOf(0);
        console.log(`Frog #0 owner: ${frogOwner}`);
        console.log(`Test account: ${owner.address}`);
        
        if (frogOwner.toLowerCase() !== owner.address.toLowerCase()) {
            console.log("⚠️  Frog #0 is owned by another address, will mint a new frog");
            throw new Error("Not the owner");
        }
        
        tokenId = 0;
        console.log("✅ Found existing frog #0, status:", frogStatus);
    } catch (error) {
        // 如果青蛙不存在或不属于当前账户，铸造一只新的
        console.log("\n📝 Minting a test frog...");
        const mintTx = await frogNFT.mintFrog("TestFrog");
        const mintReceipt = await mintTx.wait();
        
        // 获取新青蛙的 token ID
        const mintEvent = mintReceipt.events?.find(e => e.event === 'FrogMinted');
        tokenId = mintEvent ? mintEvent.args.tokenId.toNumber() : 0;
        frogStatus = 0; // Idle
        console.log("✅ Frog minted! Token ID:", tokenId.toString());
    }

    // 3. 测试随机探索（零地址）
    console.log("\n🎲 Testing random travel with zero address...");
    
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    const duration = 3600; // 1 hour
    const targetChainId = 1; // Ethereum mainnet
    
    try {
        // 如果青蛙正在旅行，先尝试取消
        if (frogStatus === 1) { // 1 = Traveling
            console.log("⚠️  Frog is currently traveling, attempting to cancel...");
            try {
                const cancelTx = await frogNFT.cancelTravel(tokenId);
                await cancelTx.wait();
                console.log("✅ Travel cancelled successfully");
            } catch (cancelError) {
                console.log("⚠️  Could not cancel travel:", cancelError.message);
                console.log("⚠️  Will try to complete travel instead...");
                try {
                    const completeTx = await frogNFT.completeTravel(tokenId, "test_journal_hash", 0);
                    await completeTx.wait();
                    console.log("✅ Travel completed successfully");
                } catch (completeError) {
                    console.error("❌ Could not complete travel either:", completeError.message);
                    console.log("⚠️  Please wait for the travel to complete or use a different token ID");
                    process.exit(1);
                }
            }
        }
        
        const travelTx = await frogNFT.startTravel(tokenId, zeroAddress, duration, targetChainId);
        const travelReceipt = await travelTx.wait();
        
        console.log("✅ Random travel started successfully!");
        console.log("Transaction hash:", travelTx.hash);
        
        // 4. 验证青蛙状态
        const activeTravel = await frogNFT.getActiveTravel(tokenId);
        console.log("\n🐸 Frog Status:");
        console.log("Is traveling:", activeTravel.targetWallet === zeroAddress);
        console.log("Target:", activeTravel.targetWallet);
        console.log("Chain ID:", activeTravel.targetChainId.toString());
        console.log("Completed:", activeTravel.completed);
        
        console.log("\n✅ All tests passed! Zero address is accepted for random travel.");
        
    } catch (error) {
        console.error("\n❌ Test failed!");
        console.error("Error:", error.message);
        
        if (error.message.includes("Invalid target")) {
            console.error("\n⚠️  The contract still rejects zero address!");
        }
        
        process.exit(1);
    }

    console.log("\n✅ Testing complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });