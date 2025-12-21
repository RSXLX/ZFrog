const hre = require("hardhat");

async function main() {
    console.log("🧪 Testing Zero Address Functionality...\n");

    const [owner] = await hre.ethers.getSigners();
    console.log("Testing with account:", owner.address);

    // 1. 部署合约
    console.log("\n📝 Deploying ZetaFrogNFT...");
    const ZetaFrogNFT = await hre.ethers.getContractFactory("ZetaFrogNFT");
    const frogNFT = await ZetaFrogNFT.deploy();
    await frogNFT.waitForDeployment();
    
    const contractAddress = await frogNFT.getAddress();
    console.log("✅ ZetaFrogNFT deployed to:", contractAddress);

    // 2. 铸造一只测试青蛙
    console.log("\n📝 Minting a test frog...");
    const mintTx = await frogNFT.mintFrog("TestFrog");
    const mintReceipt = await mintTx.wait();
    
    const tokenId = 0;
    
    console.log("✅ Frog minted! Token ID:", tokenId.toString());

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
            } else {
                console.log("\n📊 Transaction completed but event details not available");
            }
        } else {
            console.log("\n📊 Transaction completed but no events found");
        }
        
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
            console.error("Please ensure you deployed the updated contract.");
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