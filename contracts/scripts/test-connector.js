/**
 * Test ZetaConnector.send functionality
 */

const hre = require("hardhat");

const OMNI_TRAVEL_NEW = "0x5e40cbCdfA74Cf3640a0F81d68E48649a55B8402";
const ZETA_CONNECTOR = "0x239e96c8f17C85c30100AC26F635Ea15f23E9c67";
const WZETA_ADDRESS = "0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf";

async function main() {
    const [signer] = await hre.ethers.getSigners();
    console.log(`Testing with account: ${signer.address}\n`);

    // Get OmniTravel contract
    const OmniTravel = await hre.ethers.getContractFactory("OmniTravel");
    const omniTravel = OmniTravel.attach(OMNI_TRAVEL_NEW);

    // Check WZETA balance of OmniTravel
    const wzetaAbi = ["function balanceOf(address) view returns (uint256)"];
    const wzeta = new hre.ethers.Contract(WZETA_ADDRESS, wzetaAbi, signer);
    
    const omniBalance = await wzeta.balanceOf(OMNI_TRAVEL_NEW);
    console.log(`OmniTravel WZETA Balance: ${hre.ethers.formatEther(omniBalance)}`);

    // Try the actual startCrossChainTravel with detailed error
    console.log("\n--- Testing startCrossChainTravel ---");
    try {
        const tokenId = 3;
        const targetChainId = 97;
        const duration = 60;
        const provisions = hre.ethers.parseEther("0.002");

        // Try to get more detailed error
        const tx = await omniTravel.startCrossChainTravel(
            tokenId,
            targetChainId,
            duration,
            { value: provisions, gasLimit: 1000000 }
        );
        console.log(`TX Hash: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log("✅ Success! Block:", receipt.blockNumber);
        
    } catch (e) {
        console.log("❌ Transaction failed!");
        console.log("Error message:", e.message);
        
        if (e.data) {
            console.log("Error data:", e.data);
        }
        if (e.reason) {
            console.log("Reason:", e.reason);
        }
        if (e.transaction) {
            console.log("Transaction data:", e.transaction.data?.slice(0, 100));
        }
        
        // Try to trace the error by calling each step separately
        console.log("\n--- Tracing the issue ---");
        
        // 1. Check if frog can travel
        const canStart = await omniTravel.canStartCrossChainTravel(3);
        console.log(`canStartCrossChainTravel(3): ${canStart}`);
        
        // 2. Check connector
        const connector = await omniTravel.zetaConnector();
        console.log(`zetaConnector: ${connector}`);
        
        // 3. Check zetaToken
        const zetaToken = await omniTravel.zetaToken();
        console.log(`zetaToken: ${zetaToken}`);
        
        // 4. Try to simulate just the deposit part
        console.log("\n--- Testing deposit from contract context ---");
        // The issue might be that the connector interface is different
    }

    // Let's check what interface the real connector expects
    console.log("\n--- Checking ZetaConnector interface ---");
    const connectorCode = await signer.provider.getCode(ZETA_CONNECTOR);
    console.log(`Connector has code: ${connectorCode.length} bytes`);
    
    // Try to decode the function selector of 'send'
    // The issue might be the struct encoding
}

main().catch(console.error);
