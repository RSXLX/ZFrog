const hre = require("hardhat");

async function main() {
    console.log("🧪 Testing Zero Address Support...\n");

    const [owner] = await hre.ethers.getSigners();
    const provider = hre.ethers.provider;
    console.log("Testing with account:", owner.address);
    console.log("Account balance:", hre.ethers.formatEther(await provider.getBalance(owner.address)), "ZETA");

    // 已部署的合约地址
    const deployedAddress = "0xE8615ffC22ff570aB21DFBE161E7Ef68820626e3";
    
    // 1. 连接到已部署的合约
    console.log("\n📝 Connecting to deployed contract...");
    const ZetaFrogNFT = await hre.ethers.getContractFactory("ZetaFrogNFT");
    const frogNFT = ZetaFrogNFT.attach(deployedAddress);
    
    console.log("✅ Connected to ZetaFrogNFT at:", deployedAddress);

    // 2. 检查合约状态
    try {
        const paused = await frogNFT.paused();
        console.log("Contract paused:", paused);
        
        const travelManager = await frogNFT.travelManager();
        console.log("Travel manager:", travelManager);
        
        const totalSupply = await frogNFT.totalSupply();
        console.log("Total supply:", totalSupply.toString());
    } catch (error) {
        console.error("Error checking contract state:", error.message);
    }

    // 3. 铸造一只新的测试青蛙
    console.log("\n📝 Minting a new test frog...");
    try {
        const mintTx = await frogNFT.mintFrog("Test");
        const mintReceipt = await mintTx.wait();
        
        console.log("✅ Frog minted successfully!");
        console.log("Transaction hash:", mintTx.hash);
        
        // 获取新青蛙的 token ID
        let tokenId;
        if (mintReceipt.logs && mintReceipt.logs.length > 0) {
            // 通过解析日志获取事件
            for (const log of mintReceipt.logs) {
                try {
                    const parsedLog = frogNFT.interface.parseLog(log);
                    if (parsedLog.name === 'FrogMinted') {
                        tokenId = parsedLog.args.tokenId.toNumber();
                        console.log("✅ Found FrogMinted event, token ID:", tokenId);
                        break;
                    }
                } catch (e) {
                    // 忽略无法解析的日志
                }
            }
        }
        
        // 如果仍然没有找到，使用总供应量作为新的token ID
        if (tokenId === undefined || tokenId === null) {
            const totalSupply = await frogNFT.totalSupply();
            tokenId = Number(totalSupply) - 1; // 最新铸造的token
            console.log("✅ Using total supply to determine token ID:", tokenId);
        }
        
        console.log("✅ New frog token ID:", tokenId);
        
        // 4. 测试随机探索（零地址）
        console.log("\n🎲 Testing random travel with zero address...");
        
        const zeroAddress = "0x0000000000000000000000000000000000000000";
        const duration = 3600; // 1 hour
        const targetChainId = 7001; // ZetaChain testnet
        
        try {
            // 先检查青蛙状态
            const frog = await frogNFT.getFrog(tokenId);
            console.log("Frog status:", frog.status);
            
            // 检查是否可以旅行
            const canTravel = await frogNFT.canTravel(tokenId);
            console.log("Can travel:", canTravel);
            
            const travelTx = await frogNFT.startTravel(tokenId, zeroAddress, duration, targetChainId);
            const travelReceipt = await travelTx.wait();
            
            console.log("✅ SUCCESS! Random travel started with zero address!");
            console.log("Transaction hash:", travelTx.hash);
            
            // 检查事件
            if (travelReceipt.logs && travelReceipt.logs.length > 0) {
                for (const log of travelReceipt.logs) {
                    try {
                        const parsedLog = frogNFT.interface.parseLog(log);
                        if (parsedLog.name === 'TravelStarted') {
                            console.log("\n📊 Travel Details:");
                            console.log("Token ID:", parsedLog.args.tokenId.toString());
                            console.log("Target Wallet:", parsedLog.args.targetWallet);
                            console.log("Target Chain ID:", parsedLog.args.targetChainId.toString());
                            console.log("Start Time:", new Date(parsedLog.args.startTime * 1000).toISOString());
                            console.log("End Time:", new Date(parsedLog.args.endTime * 1000).toISOString());
                            break;
                        }
                    } catch (e) {
                        // 忽略无法解析的日志
                    }
                }
            }
            
            // 验证青蛙状态
            const activeTravel = await frogNFT.getActiveTravel(tokenId);
            console.log("\n🐸 Frog Status:");
            console.log("Is traveling:", activeTravel.targetWallet === zeroAddress);
            console.log("Target:", activeTravel.targetWallet);
            console.log("Chain ID:", activeTravel.targetChainId.toString());
            console.log("Completed:", activeTravel.completed);
            
            console.log("\n✅✅✅ SUCCESS! Zero address is properly supported!");
            console.log("✅ Contract has been updated to support random exploration!");
            
        } catch (travelError) {
            console.error("\n❌ Travel test failed!");
            console.error("Error:", travelError.message);
            
            if (travelError.message.includes("Invalid target")) {
                console.error("\n⚠️  The contract still rejects zero address!");
            } else if (travelError.message.includes("Frog is busy")) {
                console.error("\n⚠️  Frog is busy or in cooldown");
            } else if (travelError.message.includes("execution reverted")) {
                console.error("\n⚠️  Transaction was reverted");
                if (travelError.data) {
                    console.error("Revert reason:", travelError.data);
                }
            }
        }
        
    } catch (mintError) {
        console.error("\n❌ Mint failed!");
        console.error("Error:", mintError.message);
        
        if (mintError.message.includes("execution reverted")) {
            console.error("\n⚠️  Transaction was reverted");
            if (mintError.data) {
                console.error("Revert reason:", mintError.data);
            }
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });