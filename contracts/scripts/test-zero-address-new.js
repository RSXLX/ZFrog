const hre = require("hardhat");

async function main() {
    console.log("🧪 Testing Zero Address with New Frog...\n");

    const [owner] = await hre.ethers.getSigners();
    console.log("Testing with account:", owner.address);

    // 已部署的合约地址
    const deployedAddress = "0xE8615ffC22ff570aB21DFBE161E7Ef68820626e3";
    
    // 1. 连接到已部署的合约
    console.log("\n📝 Connecting to deployed contract...");
    const ZetaFrogNFT = await hre.ethers.getContractFactory("ZetaFrogNFT");
    const frogNFT = ZetaFrogNFT.attach(deployedAddress);
    
    console.log("✅ Connected to ZetaFrogNFT at:", deployedAddress);

    // 2. 铸造一只新的测试青蛙
    console.log("\n📝 Minting a new test frog...");
    const mintTx = await frogNFT.mintFrog("ZeroTest");
    const mintReceipt = await mintTx.wait();
    
    // 获取新青蛙的 token ID
    let tokenId;
    if (mintReceipt.events && mintReceipt.events.length > 0) {
        const mintEvent = mintReceipt.events.find(e => e.event === 'FrogMinted');
        if (mintEvent && mintEvent.args) {
            tokenId = mintEvent.args.tokenId.toNumber();
        }
    }
    
    if (!tokenId && tokenId !== 0) {
        tokenId = mintReceipt.logs.length; // Fallback
    }
    
    console.log("✅ New frog minted! Token ID:", tokenId);

    // 3. 测试随机探索（零地址）
    console.log("\n🎲 Testing random travel with zero address...");
    
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    const duration = 3600; // 1 hour
    const targetChainId = 1; // Ethereum mainnet
    
    try {
        const travelTx = await frogNFT.startTravel(tokenId, zeroAddress, duration, targetChainId);
        const travelReceipt = await travelTx.wait();
        
        console.log("✅ Random travel started successfully!");
        console.log("Transaction hash:", travelTx.hash);
        
        // 检查事件
        if (travelReceipt.events && travelReceipt.events.length > 0) {
            const travelEvent = travelReceipt.events.find(e => e.event === 'TravelStarted');
            if (travelEvent && travelEvent.args) {
                console.log("\n📊 Travel Details:");
                console.log("Token ID:", travelEvent.args.tokenId.toString());
                console.log("Target Wallet:", travelEvent.args.targetWallet);
                console.log("Target Chain ID:", travelEvent.args.targetChainId.toString());
                console.log("Start Time:", new Date(travelEvent.args.startTime * 1000).toISOString());
                console.log("End Time:", new Date(travelEvent.args.endTime * 1000).toISOString());
            }
        }
        
        // 4. 验证青蛙状态
        const activeTravel = await frogNFT.getActiveTravel(tokenId);
        console.log("\n🐸 Frog Status:");
        console.log("Is traveling:", activeTravel.targetWallet === zeroAddress);
        console.log("Target:", activeTravel.targetWallet);
        console.log("Chain ID:", activeTravel.targetChainId.toString());
        console.log("Completed:", activeTravel.completed);
        
        console.log("\n✅ SUCCESS! Zero address is accepted for random travel.");
        console.log("✅ Contract has been properly updated to support random exploration!");
        
    } catch (error) {
        console.error("\n❌ Test failed!");
        console.error("Error:", error.message);
        
        if (error.message.includes("Invalid target")) {
            console.error("\n⚠️  The contract still rejects zero address!");
            console.error("⚠️  Please ensure you deployed the updated contract with zero address support.");
        } else if (error.message.includes("Frog is busy")) {
            console.error("\n⚠️  Frog is busy - this might be expected if there's a cooldown period.");
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