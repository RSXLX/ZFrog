/**
 * Check transaction receipt and decode events/errors
 */

const hre = require("hardhat");

const TX_HASH = "0x3a99ad3b96852ad0f372c10e4b7af0ca596e87cdd7008e7870be6bc9d6ef7912";
const OMNI_TRAVEL = "0x4366FDd3a1BFe4aa7AC8042a6760cB6fEf0d0837";

async function main() {
    const [signer] = await hre.ethers.getSigners();
    console.log(`\n🔍 Checking transaction: ${TX_HASH}\n`);

    try {
        // Get transaction
        const tx = await signer.provider.getTransaction(TX_HASH);
        
        if (!tx) {
            console.log("❌ Transaction not found!");
            return;
        }

        console.log("Transaction details:");
        console.log(`  From: ${tx.from}`);
        console.log(`  To: ${tx.to}`);
        console.log(`  Value: ${hre.ethers.formatEther(tx.value)} ZETA`);
        console.log(`  Gas Limit: ${tx.gasLimit}`);
        console.log(`  Block: ${tx.blockNumber || "pending"}`);

        // Get receipt
        const receipt = await signer.provider.getTransactionReceipt(TX_HASH);
        
        if (!receipt) {
            console.log("\n⏳ Transaction is still pending...");
            return;
        }

        console.log("\nReceipt:");
        console.log(`  Status: ${receipt.status === 1 ? "✅ SUCCESS" : "❌ FAILED"}`);
        console.log(`  Gas Used: ${receipt.gasUsed}`);
        console.log(`  Block: ${receipt.blockNumber}`);

        if (receipt.logs.length > 0) {
            console.log(`\n  Events (${receipt.logs.length}):`);
            
            const OmniTravel = await hre.ethers.getContractFactory("OmniTravel");
            const ZetaFrogNFT = await hre.ethers.getContractFactory("ZetaFrogNFT");
            
            for (const log of receipt.logs) {
                try {
                    const parsed = OmniTravel.interface.parseLog(log);
                    console.log(`    - OmniTravel.${parsed.name}`);
                    console.log(`      Args: ${JSON.stringify(parsed.args, (k, v) => typeof v === 'bigint' ? v.toString() : v)}`);
                } catch {
                    try {
                        const parsed = ZetaFrogNFT.interface.parseLog(log);
                        console.log(`    - ZetaFrogNFT.${parsed.name}`);
                    } catch {
                        console.log(`    - Unknown event from ${log.address}`);
                    }
                }
            }
        }

        if (receipt.status === 0) {
            console.log("\n--- Trying to get revert reason ---");
            try {
                await signer.call({
                    to: tx.to,
                    data: tx.data,
                    value: tx.value,
                    from: tx.from,
                    blockTag: receipt.blockNumber - 1
                });
            } catch (e) {
                console.log(`Revert reason: ${e.message}`);
            }
        }

    } catch (e) {
        console.log(`Error: ${e.message}`);
    }
}

main().catch(console.error);
