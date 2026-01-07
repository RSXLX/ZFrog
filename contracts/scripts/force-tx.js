/**
 * Force send transaction and check receipt
 */

const hre = require("hardhat");

const OMNI_TRAVEL = "0x4366FDd3a1BFe4aa7AC8042a6760cB6fEf0d0837";

async function main() {
    const [signer] = await hre.ethers.getSigners();
    console.log(`\n🚀 Force sending transaction from: ${signer.address}\n`);

    const OmniTravel = await hre.ethers.getContractFactory("OmniTravel");
    const omniTravel = OmniTravel.attach(OMNI_TRAVEL);

    const tokenId = 3;
    const targetChainId = 97;
    const duration = 60;
    const value = hre.ethers.parseEther("0.002");

    console.log("Sending transaction...");
    console.log(`  tokenId: ${tokenId}`);
    console.log(`  targetChainId: ${targetChainId}`);
    console.log(`  duration: ${duration}s`);
    console.log(`  value: ${hre.ethers.formatEther(value)} ZETA`);

    try {
        const tx = await signer.sendTransaction({
            to: OMNI_TRAVEL,
            data: omniTravel.interface.encodeFunctionData('startCrossChainTravel', [
                tokenId,
                targetChainId,
                duration
            ]),
            value: value,
            gasLimit: 1000000
        });

        console.log(`\nTX Hash: ${tx.hash}`);
        console.log("Waiting for confirmation...");

        const receipt = await tx.wait();
        console.log(`\n✅ Transaction confirmed!`);
        console.log(`  Block: ${receipt.blockNumber}`);
        console.log(`  Gas Used: ${receipt.gasUsed}`);
        console.log(`  Status: ${receipt.status === 1 ? "SUCCESS" : "FAILED"}`);

        if (receipt.logs.length > 0) {
            console.log(`\n  Events:`);
            for (const log of receipt.logs) {
                try {
                    const parsed = omniTravel.interface.parseLog(log);
                    console.log(`    - ${parsed.name}`);
                } catch {
                    console.log(`    - Unknown event from ${log.address}`);
                }
            }
        }

    } catch (e) {
        console.log(`\n❌ Transaction failed!`);
        console.log(`Error: ${e.message}`);
        
        // Try to get more details
        if (e.receipt) {
            console.log(`Receipt status: ${e.receipt.status}`);
        }
        if (e.transactionHash) {
            console.log(`TX Hash: ${e.transactionHash}`);
        }
    }
}

main().catch(console.error);
