/**
 * Test setFrogStatus with different status values
 */

const hre = require("hardhat");

const ZETA_FROG_NFT = "0x21C6C9C82C7B2317E2fa25E2cdAa29E45C84fA1f";
const OMNI_TRAVEL = "0x4366FDd3a1BFe4aa7AC8042a6760cB6fEf0d0837";

async function main() {
    const [signer] = await hre.ethers.getSigners();
    console.log(`\n🔍 Testing setFrogStatus with different values\n`);

    // Create a minimal interface
    const abi = [
        "function setFrogStatus(uint256 tokenId, uint8 status) external",
        "function getFrogStatus(uint256 tokenId) view returns (uint8)"
    ];
    
    const zetaFrog = new hre.ethers.Contract(ZETA_FROG_NFT, abi, signer);
    const omniTravel = await hre.ethers.getContractFactory("OmniTravel").then(f => f.attach(OMNI_TRAVEL));

    // Check current status
    const currentStatus = await zetaFrog.getFrogStatus(3);
    console.log(`Current frog #3 status: ${currentStatus}`);

    // Try to simulate OmniTravel calling setFrogStatus(3, 2)
    // Status 2 = CrossChainLocked
    console.log("\n--- Testing if status 2 (CrossChainLocked) is valid ---");
    
    // Get the encoded calldata
    const setStatusCalldata = zetaFrog.interface.encodeFunctionData("setFrogStatus", [3, 2]);
    console.log(`setFrogStatus(3, 2) calldata: ${setStatusCalldata.slice(0, 20)}...`);

    // Try to call it from OmniTravel (simulated by impersonating)
    // But we can't impersonate on real network, so let's just check the selector
    
    // Actually, let's create a test contract that calls OmniTravel.startCrossChainTravel
    // and catches the exact error
    
    console.log("\n--- Trying to start travel and catch exact revert ---");
    
    try {
        // Encode startCrossChainTravel call
        const startTravelCalldata = omniTravel.interface.encodeFunctionData("startCrossChainTravel", [
            3, // tokenId
            97, // targetChainId
            60  // duration
        ]);
        
        // Use eth_call to get the exact error
        const result = await signer.call({
            to: OMNI_TRAVEL,
            data: startTravelCalldata,
            value: hre.ethers.parseEther("0.002"),
            gasLimit: 1000000
        });
        console.log(`Call result: ${result}`);
    } catch (e) {
        console.log(`Call reverted!`);
        console.log(`Error message: ${e.message}`);
        
        // Try to decode the error
        if (e.data) {
            console.log(`Error data: ${e.data}`);
            
            // Standard revert starts with 0x08c379a0
            if (e.data.startsWith("0x08c379a0")) {
                const reason = hre.ethers.AbiCoder.defaultAbiCoder().decode(
                    ["string"],
                    "0x" + e.data.slice(10)
                );
                console.log(`Revert reason: ${reason[0]}`);
            }
        }
    }
}

main().catch(console.error);
